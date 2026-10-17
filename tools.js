/* ============================================================
   Quality check + Deal profit screens (uses engine.js).
   The screens only collect inputs and show what the engine returns:
   no numbers are calculated, rounded or invented here.
   ============================================================ */
const PM = window.PETROMAD;
const PROD_IDS = ['diesel','jet','fuel','petrol','crude','condensate','lpg','bitumen','baseoil','other'];
const STATUS_C = {PASS:'#22A04B',FAIL:'#D8483E',REVIEW:'#E89B0C',NOT_REPORTED:'#6E6A61',NOT_COMPARABLE:'#6E6A61',NOT_APPLICABLE:'#9A958A'};
const VERDICT_C = {ON_SPEC:'#22A04B',OFF_SPEC:'#D8483E',REQUIRES_TECHNICAL_REVIEW:'#E89B0C',PARTIALLY_ASSESSED:'#6E6A61',NOT_ASSESSED:'#6E6A61'};
const SEV_C = {CRITICAL:'#D8483E',HIGH:'#D8483E',WARNING:'#E89B0C',MEDIUM:'#E89B0C',LOW:'#6E6A61'};
const human = s => String(s||'').replace(/_/g,' ').toLowerCase().replace(/^./,c=>c.toUpperCase());
const badge = (t,c) => `<span class="bdg" style="background:${c}">${esc(human(t))}</span>`;
const getP = (o,p) => p.split('.').reduce((a,k)=>a==null?a:a[k],o);
const setP = (o,p,v) => { const ks=p.split('.'); let a=o; ks.slice(0,-1).forEach(k=>{ if(a[k]==null||typeof a[k]!=='object') a[k]={}; a=a[k]; }); a[ks[ks.length-1]]=v; };
const lsGet = (k,d) => { try{ return JSON.parse(localStorage.getItem(k)||'null')||d }catch(e){ return d } };
const lsSet = (k,v) => { try{ localStorage.setItem(k,JSON.stringify(v)) }catch(e){} };

/* bind every [data-b] input/select to a state object */
function bindInputs(root, state, onChange){
  root.querySelectorAll('[data-b]').forEach(el=>{
    const p=el.dataset.b, v=getP(state,p);
    if(el.type==='checkbox') el.checked=!!v; else if(v!=null) el.value=v;
    el.addEventListener(el.tagName==='SELECT'||el.type==='checkbox'?'change':'input',()=>{
      setP(state,p, el.type==='checkbox'?el.checked:el.value); onChange&&onChange(p);
    });
  });
  root.querySelectorAll('[data-chip]').forEach(b=>b.onclick=()=>{
    const [p,val]=b.dataset.chip.split('='); setP(state,p,val);
    b.parentNode.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===b)); onChange&&onChange(p);
  });
}
const chipRow = (path,cur,opts) => `<div class="chips">${opts.map(o=>{const [v,l]=Array.isArray(o)?o:[o,o];return `<button class="chip ${cur===v?'on':''}" data-chip="${path}=${esc(v)}">${esc(l)}</button>`}).join('')}</div>`;
const inp = (path,label,ph='',type='text',mode='') => `<label class="fl"><span>${label}</span><input class="f" data-b="${path}" type="${type}" ${mode?`inputmode="${mode}"`:''} placeholder="${esc(ph)}"></label>`;

/* PDF of a results block: html2canvas → A4 pages with jsPDF */
async function blockPdf(el, name){
  toast('Making the PDF…');
  const clone=el.cloneNode(true); clone.classList.add('rpt-print'); clone.querySelectorAll('details').forEach(x=>x.open=true);
  const wrap=document.createElement('div'); wrap.style.cssText='position:fixed;left:-10000px;top:0;width:794px;background:#fff;color:#1B1B1B;padding:40px'; wrap.appendChild(clone); document.body.appendChild(wrap);
  try{
    const c=await html2canvas(wrap,{scale:2,backgroundColor:'#fff'});
    const {jsPDF}=window.jspdf, pdf=new jsPDF({unit:'pt',format:'a4'});
    const W=pdf.internal.pageSize.getWidth(), H=pdf.internal.pageSize.getHeight(), pxPerPt=c.width/W, pageH=Math.floor(H*pxPerPt);
    for(let y=0,i=0;y<c.height;y+=pageH,i++){
      const pc=document.createElement('canvas'); pc.width=c.width; pc.height=Math.min(pageH,c.height-y);
      pc.getContext('2d').drawImage(c,0,y,c.width,pc.height,0,0,c.width,pc.height);
      if(i) pdf.addPage(); pdf.addImage(pc.toDataURL('image/jpeg',0.92),'JPEG',0,0,W,pc.height/pxPerPt);
    }
    saveBlob(pdf.output('blob'),name+'.pdf');
  }catch(e){ toast('Could not make the PDF on this phone. Try the JSON export.'); }
  wrap.remove();
}
const saveJson = (obj,name) => saveBlob(new Blob([JSON.stringify(obj,null,2)],{type:'application/json'}),name+'.json');

/* ============================================================
   QUALITY CHECK
   ============================================================ */
function newQuality(product){
  product=product||'diesel';
  return {product, offered_grade:'', requested_grade:'', rule:'STRICT',
    sets:{A:{label:'Seller offered spec',standard:'',edition:''},B:{label:'Buyer contract spec',standard:'',edition:''},C:{label:'Destination rules',standard:'',edition:''}},
    params:(PM.PRODUCT_TESTS[product]||[]).map(id=>Object.assign({},PM.PARAMS[id],{value:'',value_unit:PM.PARAMS[id].unit,method:'',reproducibility:'',limits:{A:{},B:{},C:{}}})),
    cert:{}, deal:{}, adj:{}, blend:{}, filter:'ALL'};
}
let QS = lsGet('oilQuality', null) || newQuality();
let QR = null;
const saveQ = () => lsSet('oilQuality', QS);

function qualityFromOffer(){
  const p = PROD_IDS.includes(S.cat) ? S.cat : (PM.recognizeProduct(productTitle())||'other');
  QS = newQuality(p); QS.offered_grade = productTitle();
  QS.cert.vessel = S.ans.vessel&&S.ans.vessel!==DK ? S.ans.vessel : '';
  QS.cert.tank = S.ans.tankno&&S.ans.tankno!==DK ? S.ans.tankno : '';
  saveQ(); QR=null; view='quality'; render();
}

function renderQuality(app){
  $('#bar').hidden=true;
  const sets=['A','B','C'];
  app.innerHTML=`<div class="screen">
   ${topbar(`<button class="circ" id="bk" aria-label="Back">${back}</button><div style="margin:0 auto;text-align:center"><h4>Quality check</h4><small>Spec vs certificate</small></div><button class="circ" id="qNew" aria-label="Start over" title="Start over"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/></svg></button>`)}
   <h1 class="hero" style="font-size:38px">QUALITY<br>CHECK</h1>
   <p class="lede">Enter the limits from the contract or spec sheet and the results from the lab certificate. Nothing is assumed: a limit you leave empty is not checked.</p>

   <div class="q"><div class="qh"><label>Product</label></div>
     ${chipRow('product',QS.product,PROD_IDS.map(id=>[id,(CATS.find(c=>c.id===id)||{name:'Other'}).name]))}
     <div class="row mt8">${inp('offered_grade','Offered grade','e.g. EN590 10 ppm')}${inp('requested_grade','Requested grade','what the buyer asked for')}</div></div>

   <div class="q"><div class="qh"><label>Requirement sets</label><span class="hint">checked separately</span></div>
     ${sets.map(k=>`<div class="setrow"><b>${k}</b><div style="flex:1"><input class="f" data-b="sets.${k}.label"><div class="row mt8"><input class="f" data-b="sets.${k}.standard" placeholder="Standard (e.g. EN 590)"><input class="f" data-b="sets.${k}.edition" placeholder="Edition / year"></div></div></div>`).join('')}
     <small class="hint">A standard named without an edition cannot be checked (verdict: not assessed).</small></div>

   <div class="q"><div class="qh"><label>How results are judged</label></div>
     ${chipRow('rule',QS.rule,[['STRICT','Strict (as written)'],['PRECISION_BAND','Precision band'],['CONTRACT_TOLERANCE','Contract tolerance'],['STANDARD_PRACTICE','Standard practice']])}
     <small class="hint mt8" style="display:block">If the contract is silent, use Strict. Precision band needs the method's reproducibility; contract tolerance uses the tolerance typed per limit.</small></div>

   <div class="q"><div class="qh"><label>Parameters</label><span class="hint">${QS.params.length} tests for this product</span></div>
     <div id="plist">${QS.params.map((p,i)=>paramCard(p,i)).join('')}</div>
     <button class="lbtn mt8" id="addP">+ Add parameter</button></div>

   <details class="q"><summary class="qh"><label>Certificate &amp; cargo</label><span class="hint">ties the certificate to this cargo</span></summary>
     <div class="grid2">${inp('cert.lab','Laboratory')}${inp('cert.accreditation','Accreditation claimed')}${inp('cert.inspector','Inspector')}${inp('cert.cert_no','Certificate no.')}
     ${inp('cert.sample_type','Sample type','shore tank, composite…')}${inp('cert.sample_point','Sampling point')}${inp('cert.sample_date','Sample date','', 'date')}${inp('cert.report_date','Report date','','date')}
     ${inp('cert.tank','Tank ID on certificate')}${inp('cert.batch','Batch ID on certificate')}${inp('cert.vessel','Vessel on certificate')}${inp('cert.quantity','Quantity on certificate')}</div>
     <div class="qh mt8"><label style="font-size:14px">This deal</label></div>
     <div class="grid2">${inp('deal.tank','Deal tank ID')}${inp('deal.batch','Deal batch ID')}${inp('deal.vessel','Nominated vessel')}${inp('deal.named_inspector','Inspector named in contract')}
     ${inp('deal.load_date','Loading / B/L date','','date')}${inp('deal.max_cert_age_days','Max certificate age (days)','','text','numeric')}</div></details>

   <details class="q"><summary class="qh"><label>Price deduction</label><span class="hint">only from the contract formula</span></summary>
     <div class="grid2">${inp('adj.limit','Limit','e.g. 10.0','text','decimal')}${inp('adj.actual','Actual result','','text','decimal')}${inp('adj.per_unit_deduction','USD/MT per 1 unit over','','text','decimal')}${inp('adj.rejection_above','Rejection above','','text','decimal')}${inp('adj.qty_mt','Quantity (MT)','','text','decimal')}</div></details>

   <details class="q"><summary class="qh"><label>Blending estimate</label><span class="hint">advisory only</span></summary>
     <div class="grid2">${inp('blend.off_value','Off-spec lot value','e.g. 18','text','decimal')}${inp('blend.good_value','On-spec lot value','e.g. 6','text','decimal')}${inp('blend.target','Target value','e.g. 9','text','decimal')}${inp('blend.total_mt','Total blend (MT)','','text','decimal')}</div>
     <small class="hint">Linear mass balance, for properties like sulfur by mass. Flash, viscosity, cold flow, cetane and distillation need a lab blend test.</small></details>

   <button class="sbtn" style="background:#6A4CF5;color:#fff" id="qRun"><div>Run quality check<small>Compares every entered limit</small></div><span class="go">${arrow}</span></button>
   <div id="qOut"></div>
  </div>`;
  bindInputs(app,QS,(p)=>{ saveQ(); if(p==='product'){ const keep=QS; QS=Object.assign(newQuality(QS.product),{offered_grade:keep.offered_grade,requested_grade:keep.requested_grade,sets:keep.sets,rule:keep.rule,cert:keep.cert,deal:keep.deal,adj:keep.adj,blend:keep.blend}); saveQ(); renderQuality(app); } });
  $('#bk').onclick=()=>{view='home';render()};
  $('#qNew').onclick=()=>{ if(confirm('Clear this quality check?')){ QS=newQuality(QS.product); QR=null; saveQ(); renderQuality(app); } };
  $('#addP').onclick=()=>{ const name=prompt('Parameter name'); if(!name) return; const unit=prompt('Unit (e.g. mg/kg, °C, kg/m3)')||'';
    QS.params.push({id:'custom_'+Date.now(),name,unit,kind:'none',meaning:'Added by user.',safety:false,value:'',value_unit:unit,method:'',reproducibility:'',limits:{A:{},B:{},C:{}}}); saveQ(); renderQuality(app); };
  app.querySelectorAll('[data-rm]').forEach(b=>b.onclick=()=>{ QS.params.splice(+b.dataset.rm,1); saveQ(); renderQuality(app); });
  $('#qRun').onclick=()=>{ QR=PM.assessQuality(QS); drawQualityResult(); $('#qOut').scrollIntoView({behavior:'smooth'}); };
  if(QR) drawQualityResult();
}
function paramCard(p,i){
  const lim=k=>`<div class="lim"><b>${k}</b><input class="f" data-b="params.${i}.limits.${k}.min" inputmode="decimal" placeholder="min"><input class="f" data-b="params.${i}.limits.${k}.max" inputmode="decimal" placeholder="max">${QS.rule==='CONTRACT_TOLERANCE'?`<input class="f" data-b="params.${i}.limits.${k}.tolerance" inputmode="decimal" placeholder="tol.">`:''}</div>`;
  return `<details class="pcd"><summary><b>${esc(p.name)}</b>${p.safety?'<span class="sfy">safety</span>':''}<span class="pval">${p.value!==''&&p.value!=null?esc(p.value)+' '+esc(p.value_unit||''):'—'}</span></summary>
    <small class="hint">${esc(p.meaning||'')}</small>
    <div class="grid2 mt8">${inp(`params.${i}.value`,'Result','', 'text','decimal')}${inp(`params.${i}.value_unit`,'Unit on certificate',p.unit)}${inp(`params.${i}.method`,'Test method','e.g. EN ISO 20846')}${inp(`params.${i}.reproducibility`,'Reproducibility (R)','','text','decimal')}</div>
    <div class="qh mt8" style="margin-bottom:6px"><label style="font-size:13px">Limits in ${esc(p.unit||'same unit')}</label><span class="hint">A seller · B buyer · C destination</span></div>
    ${['A','B','C'].map(lim).join('')}
    <button class="forget" data-rm="${i}">Remove this parameter</button></details>`;
}
function drawQualityResult(){
  const R=QR, f=QS.filter||'ALL', out=$('#qOut');
  const allRows=R.requirement_sets.flatMap(s=>s.rows.filter(r=>r.status!=='NOT_APPLICABLE').map(r=>Object.assign({set:s.label},r)));
  const shown=allRows.filter(r=>f==='ALL'||r.status===f);
  out.innerHTML=`<div class="rpt" id="qRpt">
    <div class="rpth"><small>PETROMAD PETROLEUM QUALITY INTELLIGENCE REPORT</small><b>${esc(QS.offered_grade||human(QS.product))}</b><span>${new Date().toLocaleString('en-GB')} · rule: ${esc(human(R.rule))}</span></div>
    <div class="gate ${R.gate==='HOLD'?'hold':''}"><b>${R.gate==='HOLD'?'HOLD':'No hard gate'}</b><span>${R.gate==='HOLD'?'A hard gate applies: certificate not tied to cargo, identity conflict, unknown edition, missing lab, or a safety parameter that failed or is missing.':'No hard gate triggered by the entered evidence.'}</span></div>
    ${R.requirement_sets.length?R.requirement_sets.map(s=>`<div class="vrow"><span>${esc(s.label)}${s.standard?` <small>${esc(s.standard)} ${esc(s.edition)}</small>`:''}</span>${badge(s.verdict,VERDICT_C[s.verdict])}</div>`).join(''):'<p class="hint">No limits entered yet, so nothing was compared.</p>'}
    ${R.rule_note?`<p class="hint mt8">${esc(R.rule_note)}</p>`:''}
    ${allRows.length?`<div class="chips mt8 nopr" id="qF">${['ALL','PASS','FAIL','REVIEW','NOT_REPORTED','NOT_COMPARABLE'].map(s=>`<button class="chip ${f===s?'on':''}" data-f="${s}">${human(s)} ${s==='ALL'?allRows.length:allRows.filter(r=>r.status===s).length}</button>`).join('')}</div>
    <div class="ptab">${shown.map((r,i)=>{ const p=QS.params.find(x=>x.name===r.parameter)||{};
      return `<details class="prow"><summary><span><b>${esc(r.parameter)}</b><small>${esc(r.set)}</small></span><span class="pr-v">${r.actual?esc(PM.fmtNum(r.actual.value,r.actual.value%1?undefined:0))+' '+esc(r.actual.unit||''):'—'}<small>${r.limit.type==='MIN'?'min '+r.limit.min:r.limit.type==='MAX'?'max '+r.limit.max:r.limit.min+'–'+r.limit.max}</small></span>${badge(r.status,STATUS_C[r.status])}</summary>
        <dl class="kv mt8"><dt>What it means</dt><dd>${esc(p.meaning||'—')}</dd><dt>Test method</dt><dd class="${r.actual&&r.actual.method?'':'u'}">${esc((r.actual&&r.actual.method)||'not reported')}</dd>
        <dt>Limit</dt><dd>${esc(r.limit.type)} ${r.limit.min!=null?esc(r.limit.min):''}${r.limit.type==='RANGE'?'–':''}${r.limit.max!=null?esc(r.limit.max):''} ${esc(r.limit.unit)}</dd>
        ${r.actual&&r.actual.original_unit&&r.actual.original_unit!==r.actual.unit?`<dt>As reported</dt><dd>${esc(r.actual.original_value)} ${esc(r.actual.original_unit)}</dd>`:''}
        ${r.deviation?`<dt>Deviation</dt><dd>${r.deviation>0?'+':''}${esc(PM.fmtNum(r.deviation))} ${esc(r.limit.unit)}</dd>`:''}
        <dt>Severity</dt><dd>${esc(human(r.severity))}</dd><dt>Evidence</dt><dd>${esc(r.tag)}</dd>${r.note?`<dt>Note</dt><dd>${esc(r.note)}</dd>`:''}</dl></details>`}).join('')}</div>`:''}
    ${R.consistency_checks.length?`<h3 class="rh">Consistency checks</h3>${R.consistency_checks.map(c=>`<div class="vrow"><span>${esc(c.rule)}<small>${esc(c.detail)}</small></span>${badge(c.result,c.result==='MATCH'?'#22A04B':'#D8483E')}</div>`).join('')}`:''}
    ${R.findings.length?`<h3 class="rh">Findings &amp; actions</h3>${R.findings.map(x=>`<div class="fnd"><i style="background:${SEV_C[x.severity]||'#6E6A61'}">${esc(x.severity)}</i><span>${esc(x.text)}</span></div>`).join('')}`:''}
    ${qualityExtras()}
    ${R.not_assessed.length?`<h3 class="rh">Not assessed</h3>${R.not_assessed.map(x=>`<div class="fnd"><i style="background:#6E6A61">MISSING</i><span><b>${esc(x.item)}</b> · ${esc(x.reason)}</span></div>`).join('')}`:''}
    <p class="hint mt8">Deterministic comparison of the entered limits and results (${esc(R.engine_version)}). Limits come only from what you entered. Causes are hypotheses until tested. Safety and compliance questions need human technical approval.</p>
  </div>
  <div class="minis mt8"><button class="mini" id="qPdf"><b>⬇︎ PDF report</b><small>Quality Intelligence Report</small></button><button class="mini" id="qJson"><b>⬇︎ JSON</b><small>Full data for records</small></button>
  <button class="mini" id="qToDeal"><b>→ Deal profit</b><small>Carry the price deduction</small></button><button class="mini" id="qCopy"><b>⧉ Copy summary</b><small>Paste anywhere</small></button></div>`;
  out.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{ QS.filter=b.dataset.f; saveQ(); drawQualityResult(); });
  $('#qPdf').onclick=()=>blockPdf($('#qRpt'),'PETROMAD-Quality-Report');
  $('#qJson').onclick=()=>saveJson({input:QS,assessment:QR,adjustment:PM.qualityAdjustment(QS.adj),blend:PM.blendMassBalance(QS.blend)},'PETROMAD-Quality-Report');
  $('#qCopy').onclick=async()=>{ const t=['PETROMAD quality check: '+(QS.offered_grade||QS.product),'Gate: '+QR.gate].concat(QR.requirement_sets.map(s=>s.label+': '+human(s.verdict)),QR.findings.map(x=>'['+x.severity+'] '+x.text)).join('\n');
    try{ await navigator.clipboard.writeText(t); toast('Copied'); }catch(e){ toast('Could not copy'); } };
  $('#qToDeal').onclick=()=>{ const a=PM.qualityAdjustment(QS.adj); if(a.status==='ok'){ DS.quality_deduction_per_mt=a.per_mt; saveD(); toast('Deduction '+a.per_mt+' USD/MT carried to the deal'); } else toast(a.reason||'No deduction to carry',3500); view='deal'; render(); };
}
function qualityExtras(){
  const a=PM.qualityAdjustment(QS.adj), b=PM.blendMassBalance(QS.blend); let h='';
  if(QS.adj&&Object.values(QS.adj).some(v=>v!=='')){
    h+=`<h3 class="rh">Commercial impact</h3><div class="fnd"><i style="background:${a.status==='ok'?'#E89B0C':a.status==='rejection'?'#D8483E':'#6E6A61'}">${a.status==='ok'?'DEDUCTION':a.status==='rejection'?'REJECTION':'UNQUANTIFIED'}</i><span>${a.status==='ok'?`${esc(PM.fmtNum(a.over,2))} over the limit → ${esc(PM.fmtNum(a.per_mt))} USD/MT${a.total!=null?' · '+esc(PM.fmtUSD(a.total))+' USD on the cargo':''} (contract formula).`:esc(a.reason)}</span></div>`;
  }
  if(b) h+=`<h3 class="rh">Blending estimate</h3><div class="fnd"><i style="background:#6E6A61">ESTIMATE</i><span>${b.possible?`Off-spec share ${esc(PM.fmtNum(b.off_fraction*100,1))}% by mass${b.off_mt!=null?` (${esc(PM.fmtNum(b.off_mt,0))} MT off-spec + ${esc(PM.fmtNum(b.good_mt,0))} MT on-spec)`:''}. `:''}${esc(b.note)}</span></div>`;
  return h;
}

/* ============================================================
   DEAL PROFIT
   ============================================================ */
const CATEGORIES=['PRODUCT','FREIGHT','PORT','INSURANCE','FINANCE','INSPECTION','DEMURRAGE','CLAIMS','TAX','QUALITY_ADJUSTMENT','OTHER'];
const BASES=[['PER_MT','per MT'],['LUMP_SUM','lump sum'],['PCT_PURCHASE','% of purchase'],['PCT_REVENUE','% of revenue'],['PER_DAY','per day']];
function newDeal(){ return {qty_unit:'MT',qty_basis_buy:'',qty_basis_sell:'',currency:'USD',incoterm_buy:'',incoterm_sell:'',purchase_paid_day:'0',purchase_financed:true,day_basis:'360',lines:[],
  scenarios:JSON.parse(JSON.stringify(PM.DEFAULT_SCENARIOS))}; }
let DS = lsGet('oilDeal', null) || newDeal();
let DR = null;
const saveD = () => lsSet('oilDeal', DS);
/* the worked example from the spec, labelled as an example */
function exampleDeal(){
  const L=(id,category,description,basis,rate,extra)=>Object.assign({id,category,description,basis,rate:String(rate),payer:'BUYER',borne_by_user:true,financed:false,paid_day:'0',netted_from_proceeds:false,tag:'USER'},extra||{});
  return Object.assign(newDeal(),{qty_buy:'30000',qty_sell:'30000',qty_basis_buy:'BL',qty_basis_sell:'BL',price_buy:'690',price_sell:'722',incoterm_buy:'FOB',incoterm_sell:'CFR',
    proceeds_day:'30',finance_rate:'9',demurrage_rate:'28000',_example:true,
    lines:[L('fr','FREIGHT','Freight (voyage charter, all-in)','PER_MT',18.5,{payer:'SELLER',financed:true}),L('lc','FINANCE','LC issuance (purchase)','PCT_PURCHASE',0.2),
      L('cf','FINANCE','Confirmation fee (sale LC)','PCT_REVENUE',0.3,{payer:'SELLER',paid_day:'30',netted_from_proceeds:true}),L('bk','FINANCE','Bank charges','LUMP_SUM',6000),
      L('in','INSPECTION','Inspection, load port','LUMP_SUM',9000),L('ag','OTHER','Agency and other','LUMP_SUM',4000)]});
}
function dealFromOffer(){
  DS=newDeal(); const A=S.ans, num=v=>String(v||'').replace(/[^\d.]/g,'');
  if(A.qty&&A.qty.n){ DS.qty_buy=num(A.qty.n); DS.qty_sell=DS.qty_buy; DS.qty_unit=(A.qty.u||'MT').toUpperCase().replace('LITRES','LITRE').replace('GALLONS','GALLON'); }
  const t=Array.isArray(A.terms)&&A.terms[0]; if(t){ DS.incoterm_buy=t; const pr=A.prices&&A.prices[t]; if(pr) DS.price_buy=num(pr); }
  DS.currency=A.currency||'USD'; saveD(); DR=null; view='deal'; render();
}
/* engine input from screen state (percent fields typed as %; finance rate typed as %) */
function dealInput(){
  const d=JSON.parse(JSON.stringify(DS));
  d.finance_rate = DS.finance_rate!==''&&DS.finance_rate!=null ? +DS.finance_rate/100 : null;
  d.density_kg_l = DS.density_kg_l;
  d.lines=(DS.lines||[]).map(l=>Object.assign({},l,{rate:+l.rate||0,paid_day:+l.paid_day||0,units:l.units?+l.units:undefined}));
  return d;
}
function renderDeal(app){
  $('#bar').hidden=true;
  const terms=['FOB','CFR','CIF','DAP'];
  app.innerHTML=`<div class="screen">
   ${topbar(`<button class="circ" id="bk" aria-label="Back">${back}</button><div style="margin:0 auto;text-align:center"><h4>Deal profit</h4><small>Profitability engine</small></div><button class="circ" id="dNew" aria-label="Start over" title="Start over"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4"/></svg></button>`)}
   <h1 class="hero" style="font-size:38px">DEAL<br>PROFIT</h1>
   <p class="lede">Buy and sell the same cargo. Missing inputs are named, never filled in for you.</p>
   ${DS._example?`<div class="tip" style="margin:0 0 12px">Showing the worked example from the spec (EN 590, 30,000 MT). Replace the numbers with your deal.</div>`:`<button class="lbtn" id="dEx" style="margin-bottom:12px">Load worked example</button>`}

   <div class="q"><div class="qh"><label>Quantity</label></div>
     <div class="grid2">${inp('qty_buy','Bought','','text','decimal')}${inp('qty_sell','Billed on sale','','text','decimal')}</div>
     <div class="mt8">${chipRow('qty_unit',DS.qty_unit,['MT','BBL','M3','LITRE'])}</div>
     ${DS.qty_unit!=='MT'?`<div class="mt8">${inp('density_kg_l','Density (kg/L) and its temperature','e.g. 0.8450 at 15°C','text','decimal')}</div>`:''}
     <div class="grid2 mt8"><label class="fl"><span>Basis on purchase</span><select class="f" data-b="qty_basis_buy"><option value="">—</option><option value="BL">B/L</option><option value="OUTTURN">Outturn</option><option value="SHORE_TANK">Shore tank</option></select></label>
     <label class="fl"><span>Basis on sale</span><select class="f" data-b="qty_basis_sell"><option value="">—</option><option value="BL">B/L</option><option value="OUTTURN">Outturn</option><option value="SHORE_TANK">Shore tank</option></select></label></div>
     ${inp('qty_tolerance_pct','Quantity tolerance ± %','e.g. 5','text','decimal')}</div>

   <div class="q"><div class="qh"><label>Prices (per MT)</label></div>
     <div class="grid2">${inp('price_buy','Purchase price','','text','decimal')}${inp('price_sell','Sale price','','text','decimal')}</div>
     <div class="grid2 mt8"><label class="fl"><span>Purchase term</span><select class="f" data-b="incoterm_buy"><option value="">—</option>${terms.map(t=>`<option>${t}</option>`).join('')}</select></label>
     <label class="fl"><span>Sale term</span><select class="f" data-b="incoterm_sell"><option value="">—</option>${terms.map(t=>`<option>${t}</option>`).join('')}</select></label>
     ${inp('pricing_period_buy','Buy pricing period','e.g. fixed / month avg')}${inp('pricing_period_sell','Sell pricing period','e.g. 5 days around B/L')}</div>
     <div class="mt8">${chipRow('currency',DS.currency,['USD','EUR','AED'])}</div>
     ${DS.currency!=='USD'?`<div class="grid2 mt8">${inp('fx_rate_to_usd','Rate to USD','','text','decimal')}${inp('fx_rate_date','Rate date','','date')}</div>`:''}
     ${inp('quality_deduction_per_mt','Quality deduction (USD/MT)','from the quality check','text','decimal')}</div>

   <div class="q"><div class="qh"><label>Payment &amp; financing</label><span class="hint">days after B/L</span></div>
     <div class="grid2">${inp('proceeds_day','Sale proceeds arrive (day)','e.g. 30','text','numeric')}${inp('purchase_paid_day','Purchase paid (day)','0 = at sight','text','numeric')}
     ${inp('finance_rate','Finance rate % / year','e.g. 9','text','decimal')}${inp('day_basis','Day-count basis','360','text','numeric')}
     ${inp('lc_last_day','LC expiry / last day','optional','text','numeric')}${inp('demurrage_rate','Demurrage USD / day','for scenarios','text','decimal')}</div>
     <label class="ck"><input type="checkbox" data-b="purchase_financed"> Purchase is financed until proceeds arrive</label></div>

   <div class="q"><div class="qh"><label>Cost ledger</label><span class="hint">${DS.lines.length} lines</span></div>
     <div id="ledger">${DS.lines.map(lineCard).join('')}</div>
     <button class="lbtn mt8" id="addL">+ Add cost line</button>
     <details class="mt8"><summary class="hint" style="cursor:pointer">Default cost allocation by Incoterm</summary>${incotermTable()}</details></div>

   <details class="q"><summary class="qh"><label>Scenarios</label><span class="hint">edit the shifts</span></summary>
     <div class="sctab"><div class="sch"><span></span><span>Sale ±/MT</span><span>Freight ±/MT</span><span>Delay days</span><span>Dem. days</span><span>Claim %</span></div>
     ${DS.scenarios.map((s,i)=>`<div class="sch"><b>${esc(s.name)}</b>${['sale_delta','freight_delta','delay_days','demurrage_days','claim_pct'].map(k=>`<input class="f" data-b="scenarios.${i}.${k}" inputmode="decimal">`).join('')}</div>`).join('')}</div></details>

   <button class="sbtn" style="background:#6A4CF5;color:#fff" id="dRun"><div>Calculate profit<small>Net, per MT, break-even, scenarios</small></div><span class="go">${arrow}</span></button>
   <div id="dOut"></div>
  </div>`;
  bindInputs(app,DS,(p)=>{ delete DS._example; saveD(); if(['qty_unit','currency'].includes(p)) renderDeal(app); });
  $('#bk').onclick=()=>{view='home';render()};
  $('#dNew').onclick=()=>{ if(confirm('Clear this deal?')){ DS=newDeal(); DR=null; saveD(); renderDeal(app); } };
  const ex=$('#dEx'); if(ex) ex.onclick=()=>{ DS=exampleDeal(); DR=null; saveD(); renderDeal(app); };
  $('#addL').onclick=()=>{ DS.lines.push({id:'l'+Date.now(),category:'OTHER',description:'',basis:'LUMP_SUM',rate:'',payer:'BUYER',borne_by_user:true,financed:false,paid_day:'0',netted_from_proceeds:false,tag:'USER'}); saveD(); renderDeal(app); };
  app.querySelectorAll('[data-rml]').forEach(b=>b.onclick=()=>{ DS.lines.splice(+b.dataset.rml,1); saveD(); renderDeal(app); });
  $('#dRun').onclick=()=>{ runDealUI(); $('#dOut').scrollIntoView({behavior:'smooth'}); };
  if(DR) drawDealResult();
}
function lineCard(l,i){
  const sel=(path,opts)=>`<select class="f" data-b="${path}">${opts.map(o=>{const [v,t]=Array.isArray(o)?o:[o,human(o)];return `<option value="${v}">${esc(t)}</option>`}).join('')}</select>`;
  return `<details class="pcd"><summary><b>${esc(l.description||human(l.category))}</b><span class="pval">${l.rate!==''?esc(l.rate)+' '+esc((BASES.find(b=>b[0]===l.basis)||[])[1]||''):'—'}</span></summary>
   <div class="grid2 mt8">${inp(`lines.${i}.description`,'Description')}<label class="fl"><span>Category</span>${sel(`lines.${i}.category`,CATEGORIES)}</label>
   <label class="fl"><span>Basis</span>${sel(`lines.${i}.basis`,BASES)}</label>${inp(`lines.${i}.rate`,'Rate (USD, or % for % bases)','','text','decimal')}
   ${l.basis==='PER_DAY'?inp(`lines.${i}.units`,'Days','','text','numeric'):''}
   <label class="fl"><span>Payer</span>${sel(`lines.${i}.payer`,['BUYER','SELLER','THIRD_PARTY'])}</label>${inp(`lines.${i}.paid_day`,'Paid on day','0 = B/L date','text','numeric')}
   <label class="fl"><span>Evidence</span>${sel(`lines.${i}.tag`,PM.TAGS)}</label>${inp(`lines.${i}.override_reason`,'Override reason','only if contract differs')}</div>
   <label class="ck"><input type="checkbox" data-b="lines.${i}.borne_by_user"> I bear this cost</label>
   <label class="ck"><input type="checkbox" data-b="lines.${i}.financed"> Financed until proceeds arrive</label>
   <label class="ck"><input type="checkbox" data-b="lines.${i}.netted_from_proceeds"> Deducted from sale proceeds</label>
   <button class="forget" data-rml="${i}">Remove this line</button></details>`;
}
function incotermTable(){
  const rows=[['Export clearance, load-port charges','EXPORT_LOADPORT'],['Main freight','FREIGHT'],['Marine insurance','INSURANCE'],['Discharge-port charges','DISCHARGE_PORT'],['Import clearance, duties, taxes','IMPORT_DUTIES'],['Demurrage and despatch','DEMURRAGE']];
  const lab={SELLER:'Seller',BUYER:'Buyer',CHARTER:'Charter terms',CONTRACT:'Contract'};
  return `<table class="itab"><tr><th></th><th>FOB</th><th>CFR</th><th>CIF</th><th>DAP</th></tr>${rows.map(([n,k])=>`<tr><td>${n}</td>${['FOB','CFR','CIF','DAP'].map(t=>`<td>${lab[PM.INCOTERM_PAYER[k][t]]}</td>`).join('')}</tr>`).join('')}</table>
   <small class="hint">Defaults only; the contract always wins. Risk transfer point (ship's rail or loading flange) and laytime are never assumed. Have a lawyer confirm Incoterm wording.</small>`;
}
function runDealUI(){
  const d=dealInput();
  const scen=DS.scenarios.map(s=>({id:s.id,name:s.name,sale_delta:+s.sale_delta||0,freight_delta:+s.freight_delta||0,delay_days:+s.delay_days||0,demurrage_days:+s.demurrage_days||0,claim_pct:+s.claim_pct||0}));
  DR={base:PM.runDeal(d), scenarios:PM.runScenarios(d,scen), sens:PM.sensitivities(d), volumes: d.density_kg_l?PM.mtToVolumes(PM.toMT(+d.qty_buy,d.qty_unit,+d.density_kg_l),+d.density_kg_l):null};
  drawDealResult();
}
function drawDealResult(){
  const out=$('#dOut'), B=DR.base, U=PM.fmtUSD, N=PM.fmtNum;
  if(B.status!=='ok'){
    out.innerHTML=`<div class="rpt"><div class="gate hold"><b>Not assessed</b><span>The engine needs these inputs before it can calculate. Nothing was assumed.</span></div>
      ${B.not_assessed.map(x=>`<div class="fnd"><i style="background:#D8483E">MISSING</i><span><b>${esc(x.item)}</b> · ${esc(x.reason)}</span></div>`).join('')}</div>`; return;
  }
  const pos=B.net>=0;
  out.innerHTML=`<div class="rpt" id="dRpt">
   <div class="rpth"><small>PETROMAD DEAL PROFITABILITY</small><b>${esc(N(B.qBuy,0))} MT · ${esc(DS.incoterm_buy)} ${esc(N(+DS.price_buy))} → ${esc(DS.incoterm_sell)} ${esc(N(+DS.price_sell))}</b><span>${new Date().toLocaleString('en-GB')} · USD</span></div>
   <div class="netc" style="background:${pos?'#CDD97A':'#D8483E'};color:${pos?'#1B1B1B':'#fff'}"><small>Net profit (base case)</small><b>${esc(U(B.net))}</b><span>${esc(U(B.perMT))} per MT on ${esc(N(B.qBuy,0))} MT bought · margin ${esc(N(B.margin*100))}% of revenue</span>
     ${B.estimateDriven?'<em>Depends on estimated or unverified inputs</em>':''}</div>
   <div class="kpis"><div><small>Break-even sale price</small><b>${esc(N(B.breakEven))}</b></div><div><small>Working capital</small><b>${esc(U(B.workingCapital))}</b></div>
     <div><small>Return on capital</small><b>${B.roc!=null?esc(N(B.roc*100))+'%':'—'}</b><span>${B.rocAnnual!=null?esc(N(B.rocAnnual*100))+'% a year, simple':''}</span></div><div><small>Cash cycle</small><b>${esc(B.cycleDays)} days</b></div></div>
   <h3 class="rh">Calculation</h3>
   <table class="ltab"><tr><td>Purchase cost</td><td>${esc(N(B.qBuy,0))} × ${esc(N(B.price_buy))}</td><td>${esc(U(B.purchase))}</td></tr>
    <tr><td>Sales revenue</td><td>${esc(N(B.qSell,0))} × ${esc(N(B.price_sell))}</td><td>${esc(U(B.revenue))}</td></tr>
    <tr class="sub"><td>Gross margin</td><td></td><td>${esc(U(B.gross))}</td></tr>
    ${B.lines.map(l=>`<tr><td>${esc(l.description||human(l.category))}${l.tag==='ESTIMATE'||l.tag==='UNVERIFIED'?` <i class="tg">${l.tag}</i>`:''}</td><td>${esc(human((BASES.find(b=>b[0]===l.basis)||[])[1]||''))} ${esc(l.rate)}</td><td>${esc(U(l.amount))}</td></tr>`).join('')}
    <tr><td>Financing</td><td>${esc(N(+DS.finance_rate||0))}% · ${esc(B.fundingDays)} days / ${esc(DS.day_basis||360)}</td><td>${esc(U(B.financing))}</td></tr>
    <tr class="sub"><td>Total costs</td><td></td><td>${esc(U(B.totalCosts))}</td></tr><tr class="tot"><td>Net profit</td><td></td><td>${esc(U(B.net))}</td></tr></table>
   ${B.excluded.length?`<p class="hint">Excluded as double counted: ${B.excluded.map(l=>esc(l.description||l.category)).join(', ')}.</p>`:''}
   <h3 class="rh">Scenarios</h3>
   <table class="ltab"><tr><th>Scenario</th><th>Net profit</th><th>Per MT</th></tr>${DR.scenarios.map(s=>`<tr><td>${esc(s.scenario.name)}</td><td style="color:${s.result.net<0?'#D8483E':'inherit'}">${esc(U(s.result.net))}</td><td>${esc(U(s.result.perMT))}</td></tr>`).join('')}</table>
   <p class="hint">Scenarios are what-if changes to your inputs, not forecasts.</p>
   ${DR.sens?`<h3 class="rh">What moves the result</h3><div class="fnd"><i style="background:#6A4CF5">±1/MT</i><span>Sale price ±1.00/MT moves net by ${esc(U(DR.sens.sale_plus_1))}.</span></div>
     <div class="fnd"><i style="background:#6A4CF5">±1/MT</i><span>Freight ±1.00/MT moves net by ${esc(U(Math.abs(DR.sens.freight_plus_1)))} including financing.</span></div>
     <div class="fnd"><i style="background:#6A4CF5">+1 day</i><span>One more day of payment delay costs ${esc(U(Math.abs(DR.sens.delay_plus_1)))}.</span></div>
     ${DR.sens.demurrage_plus_1!=null?`<div class="fnd"><i style="background:#6A4CF5">+1 day</i><span>One demurrage day costs ${esc(U(Math.abs(DR.sens.demurrage_plus_1)))}.</span></div>`:''}
     <p class="hint">Settle first: freight firmness, payment timing and demurrage terms.</p>`:''}
   ${DR.volumes?`<h3 class="rh">Volume</h3><p class="hint">${esc(N(DR.volumes.m3))} m³ · about ${esc(N(DR.volumes.bbl,0))} barrels. ${esc(DR.volumes.note)}</p>`:''}
   ${B.findings.length?`<h3 class="rh">Findings</h3>${B.findings.map(x=>`<div class="fnd"><i style="background:${SEV_C[x.severity]||'#6E6A61'}">${esc(x.severity)}</i><span>${esc(x.text)}</span></div>`).join('')}`:''}
   <p class="hint mt8">All figures computed by tested code from your inputs. Money rounded to cents per line.</p>
  </div>
  <div class="minis mt8"><button class="mini" id="dPdf"><b>⬇︎ PDF</b><small>Profit report</small></button><button class="mini" id="dJson"><b>⬇︎ JSON</b><small>Full data</small></button></div>`;
  $('#dPdf').onclick=()=>blockPdf($('#dRpt'),'PETROMAD-Deal-Profit');
  $('#dJson').onclick=()=>saveJson({input:dealInput(),result:DR},'PETROMAD-Deal-Profit');
}
