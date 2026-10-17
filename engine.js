/* ============================================================
   PETROMAD engines — deterministic code only.
   1. Deal Profitability Engine (spec v0.1, 17 Oct 2026)
   2. Petroleum Quality Intelligence (Module 2 v2.0)
   No limits, prices or discounts are invented here: every number
   comes from the user or a document. Missing inputs return
   not_assessed instead of a silent default.
   Tests: node tests/engine.test.js
   ============================================================ */
(function(root){
'use strict';

const TAGS=['DOCUMENT','USER','CALCULATED','ESTIMATE','UNVERIFIED'];
const DAY_BASIS=360;
/* money: round half-up to cents once per line, so repeat runs are identical */
const r2 = x => { const s=x<0?-1:1; return s*Math.round(Math.abs(x)*100+1e-7)/100; };
const n = v => (v===''||v==null||isNaN(+v)) ? null : +v;

/* ---------------- units ---------------- */
const BBL_PER_M3 = 6.289810770432105;   // 1 m3 = 6.28981 US barrels (exact by definition of the barrel)
const VOL_M3 = {M3:1, CBM:1, BBL:1/BBL_PER_M3, LITRE:0.001, L:0.001, GALLON:0.003785411784};
/* mass <-> volume only with a supplied density (kg/L). Never a universal factor. */
function toMT(qty, unit, densityKgL){
  unit=String(unit||'MT').toUpperCase();
  if(unit==='MT') return qty;
  if(unit==='KG') return qty/1000;
  if(VOL_M3[unit]==null) return null;
  if(!(densityKgL>0)) return null;
  return qty*VOL_M3[unit]*densityKgL;
}
function mtToVolumes(mt, densityKgL){
  if(!(densityKgL>0)) return null;
  const m3=mt/densityKgL;
  return {m3, bbl:m3*BBL_PER_M3, note:'Density used as supplied. Air-versus-vacuum weight conversion is out of scope and not applied.'};
}

/* ---------------- Incoterm default allocation (spec §4) ----------------
   who pays each cost item under the PURCHASE / SALE term. Contract wins:
   every default can be overridden with a reason. */
const INCOTERM_PAYER = {
  EXPORT_LOADPORT: {FOB:'SELLER',CFR:'SELLER',CIF:'SELLER',DAP:'SELLER'},
  FREIGHT:         {FOB:'BUYER', CFR:'SELLER',CIF:'SELLER',DAP:'SELLER'},
  INSURANCE:       {FOB:'BUYER', CFR:'BUYER', CIF:'SELLER',DAP:'SELLER'},
  DISCHARGE_PORT:  {FOB:'BUYER', CFR:'CHARTER',CIF:'CHARTER',DAP:'SELLER'},
  IMPORT_DUTIES:   {FOB:'BUYER', CFR:'BUYER', CIF:'BUYER', DAP:'BUYER'},
  DEMURRAGE:       {FOB:'CONTRACT',CFR:'CONTRACT',CIF:'CONTRACT',DAP:'CONTRACT'}
};
/* is a cost line already inside the PURCHASE price? */
function includedInPurchase(category, buyTerm){
  buyTerm=String(buyTerm||'').toUpperCase();
  if(category==='FREIGHT') return ['CFR','CIF','DAP'].includes(buyTerm);
  if(category==='INSURANCE') return ['CIF','DAP'].includes(buyTerm);
  return false;
}

/* ============================================================
   1. DEAL PROFITABILITY ENGINE
   deal = {
     qty_buy, qty_sell, qty_unit ('MT'|'BBL'|...), density_kg_l,
     qty_basis_buy, qty_basis_sell ('BL'|'OUTTURN'|'SHORE_TANK'),
     price_buy, price_sell (USD per MT), currency, fx_rate_to_usd, fx_rate_date,
     incoterm_buy, incoterm_sell,
     pricing_period_buy, pricing_period_sell,
     proceeds_day (days after B/L), lc_last_day (optional),
     finance_rate (annual, e.g. 0.09), day_basis (360),
     purchase_paid_day, purchase_financed (bool),
     demurrage_rate (USD/day), qty_tolerance_pct,
     quality_deduction_per_mt (from the quality module, contract formula only),
     lines: CostLine[]
   }
   CostLine as in spec §3 plus netted_from_proceeds (paid out of sale proceeds).
   ============================================================ */
function validateDeal(d){
  const block=[];
  if(!d.qty_basis_buy || !d.qty_basis_sell) block.push({item:'Quantity basis', reason:'Quantity basis (B/L, outturn or shore tank) is not stated on both sides.'});
  if(n(d.price_buy)==null) block.push({item:'Purchase price', reason:'Purchase price is not resolved.'});
  if(n(d.price_sell)==null) block.push({item:'Sale price', reason:'Sale price is not resolved.'});
  if(!d.currency) block.push({item:'Currency', reason:'Currency is missing.'});
  else if(String(d.currency).toUpperCase()!=='USD' && !(n(d.fx_rate_to_usd)>0 && d.fx_rate_date)) block.push({item:'FX rate', reason:'A non-USD deal needs a stated rate to USD and its date.'});
  if(!d.incoterm_buy || !d.incoterm_sell) block.push({item:'Incoterm', reason:'Incoterm is missing, so cost allocation cannot be derived.'});
  if(n(d.qty_buy)==null || n(d.qty_sell)==null) block.push({item:'Quantity', reason:'Purchase or sale quantity is missing.'});
  else if(String(d.qty_unit||'MT').toUpperCase()!=='MT' && toMT(1,d.qty_unit,n(d.density_kg_l))==null)
    block.push({item:'Density', reason:'Quantity is in '+d.qty_unit+' and prices are per MT, but density is missing. No volume-to-weight conversion without it.'});
  (d.lines||[]).forEach(l=>{ if(!l.payer) block.push({item:'Cost line "'+(l.description||l.id)+'"', reason:'No payer stated.'}); });
  if(n(d.proceeds_day)==null) block.push({item:'Payment day', reason:'Day sale proceeds arrive is missing.'});
  if((d.lines||[]).some(l=>l.financed) || d.purchase_financed){ if(n(d.finance_rate)==null) block.push({item:'Finance rate', reason:'Financed lines need an annual finance rate.'}); }
  return block;
}

function lineAmount(l, ctx){
  const rate=n(l.rate)||0, fx=(l.currency&&String(l.currency).toUpperCase()!=='USD')?(n(l.fx_rate_to_usd)||0):1;
  let a=0;
  switch(l.basis){
    case 'PER_MT': a=rate*ctx.qBuy; break;
    case 'LUMP_SUM': a=rate; break;
    case 'PCT_PURCHASE': a=rate/100*ctx.purchase; break;
    case 'PCT_REVENUE': a=rate/100*ctx.revenue; break;
    case 'PER_DAY': a=rate*(n(l.units)||0); break;
  }
  return r2(a*fx);
}

/* scenario: {sale_delta, freight_delta, delay_days, demurrage_days, claim_pct, buy_delta, qty_sell, quality_deduction_per_mt} */
function runDeal(deal, scenario){
  const d=JSON.parse(JSON.stringify(deal)); const sc=scenario||{};
  const findings=[], excluded=[];
  const block=validateDeal(d);
  if(block.length) return {status:'not_assessed', not_assessed:block, findings};
  const fx=String(d.currency).toUpperCase()==='USD'?1:n(d.fx_rate_to_usd);
  const dens=n(d.density_kg_l);
  const qBuy=toMT(n(d.qty_buy),d.qty_unit,dens), qSellBase=toMT(n(d.qty_sell),d.qty_unit,dens);
  const qSell = sc.qty_sell!=null ? sc.qty_sell : qSellBase;
  const pBuy=(n(d.price_buy)+(sc.buy_delta||0))*fx;
  const qd = sc.quality_deduction_per_mt!=null ? sc.quality_deduction_per_mt : (n(d.quality_deduction_per_mt)||0);
  const pSell=(n(d.price_sell)+(sc.sale_delta||0)-qd)*fx;
  const basis=n(d.day_basis)||DAY_BASIS;
  const proceeds=n(d.proceeds_day)+(sc.delay_days||0);
  const purchase=r2(qBuy*pBuy), revenue=r2(qSell*pSell);
  const ctx={qBuy,qSell,purchase,revenue};

  if(d.pricing_period_buy && d.pricing_period_sell && String(d.pricing_period_buy).trim().toLowerCase()!==String(d.pricing_period_sell).trim().toLowerCase())
    findings.push({severity:'HIGH', area:'PRICING', text:'Buy and sell pricing periods differ ('+d.pricing_period_buy+' vs '+d.pricing_period_sell+'). The spread is not locked: basis risk.'});
  if(String(d.qty_unit||'MT').toUpperCase()!=='MT') findings.push({severity:'LOW', area:'QUANTITY', text:'Quantity converted from '+d.qty_unit+' with density '+dens+' kg/L as supplied. Air-versus-vacuum conversion is not applied (out of scope v1).'});

  const lines=[];
  (d.lines||[]).forEach(l0=>{
    const l=Object.assign({},l0);
    if(sc.freight_delta && l.category==='FREIGHT' && l.basis==='PER_MT') l.rate=n(l.rate)+sc.freight_delta;
    const inc = l.included_in_price!=null && l.override_reason ? !!l.included_in_price : includedInPurchase(l.category,d.incoterm_buy);
    if(l.borne_by_user===false) return;
    if(inc){
      if(!l.override_reason){
        excluded.push(l);
        findings.push({severity:'WARNING', area:'COST', text:'"'+(l.description||l.category)+'" excluded: the purchase term '+d.incoterm_buy+' already includes '+l.category.toLowerCase()+'. Add an override reason to count it.'});
        return;
      }
    }
    lines.push(Object.assign(l,{amount:lineAmount(l,ctx)}));
  });
  if(sc.demurrage_days && n(d.demurrage_rate)!=null)
    lines.push({id:'sc_dem',category:'DEMURRAGE',description:'Demurrage ('+sc.demurrage_days+' day'+(sc.demurrage_days>1?'s':'')+')',basis:'PER_DAY',rate:n(d.demurrage_rate),units:sc.demurrage_days,amount:r2(n(d.demurrage_rate)*sc.demurrage_days),tag:'ESTIMATE',financed:false,paid_day:proceeds,netted_from_proceeds:false});
  if(sc.claim_pct)
    lines.push({id:'sc_claim',category:'CLAIMS',description:'Claim reserve ('+sc.claim_pct+'% of revenue)',basis:'PCT_REVENUE',rate:sc.claim_pct,amount:r2(sc.claim_pct/100*revenue),tag:'ESTIMATE',financed:false,paid_day:proceeds,netted_from_proceeds:false});

  /* financing: purchase + financed lines, from paid_day to proceeds day */
  const rate=n(d.finance_rate)||0; let financing=0; const finItems=[];
  const pDay=n(d.purchase_paid_day)||0;
  if(d.purchase_financed){ const f=purchase*rate*(proceeds-pDay)/basis; financing+=f; finItems.push({what:'Purchase',amount:purchase,days:proceeds-pDay}); }
  lines.forEach(l=>{ if(l.financed){ const days=proceeds-(n(l.paid_day)||0); financing+=l.amount*rate*days/basis; finItems.push({what:l.description,amount:l.amount,days}); } });
  financing=r2(financing);

  const ledger=r2(lines.reduce((s,l)=>s+l.amount,0));
  const gross=r2(revenue-purchase);
  const totalCosts=r2(ledger+financing);
  const net=r2(gross-totalCosts);
  const pctRev=lines.filter(l=>l.basis==='PCT_REVENUE').reduce((s,l)=>s+n(l.rate)/100,0);
  const fixedCosts=r2(totalCosts-lines.filter(l=>l.basis==='PCT_REVENUE').reduce((s,l)=>s+l.amount,0));
  const breakEvenExact=(purchase+fixedCosts)/(qSell*(1-pctRev))/fx, breakEven=r2(breakEvenExact);
  const wcItems=[]; let wc=0;
  if(pDay<proceeds){ wc+=purchase; wcItems.push(['Purchase',purchase]); }
  lines.forEach(l=>{ if(!l.netted_from_proceeds && (n(l.paid_day)||0)<proceeds){ wc+=l.amount; wcItems.push([l.description,l.amount]); } });
  wc=r2(wc);
  const firstPay=Math.min(pDay,...lines.filter(l=>!l.netted_from_proceeds).map(l=>n(l.paid_day)||0));
  const cycle=proceeds-firstPay;
  const roc=wc?net/wc:null;

  /* warnings (§8) */
  const weak=lines.filter(l=>l.tag==='ESTIMATE'||l.tag==='UNVERIFIED').reduce((s,l)=>s+l.amount,0);
  if(totalCosts>0 && weak/totalCosts>0.2 && !sc._quiet) findings.push({severity:'WARNING',area:'EVIDENCE',text:'Estimated or unverified lines are '+(weak/totalCosts*100).toFixed(1)+'% of total costs (over 20%).'});
  if(n(d.lc_last_day)!=null && proceeds>n(d.lc_last_day)) findings.push({severity:'WARNING',area:'PAYMENT',text:'Sale proceeds day ('+proceeds+') is later than the LC expiry / presentation period allows (day '+d.lc_last_day+').'});
  if(n(d.qty_tolerance_pct)!=null && n(d.qty_tolerance_pct)/100*revenue>Math.abs(net)) findings.push({severity:'WARNING',area:'QUANTITY',text:'Quantity tolerance of ±'+d.qty_tolerance_pct+'% could move revenue by '+fmtUSD(n(d.qty_tolerance_pct)/100*revenue)+', more than the net profit.'});
  const estimateDriven=lines.some(l=>l.tag==='ESTIMATE'||l.tag==='UNVERIFIED');

  return {status:'ok', qBuy, qSell, price_buy:pBuy, price_sell:pSell, purchase, revenue, gross, lines, excluded, financing, finItems,
    ledger, totalCosts, net, perMT:r2(net/qBuy), margin:revenue?net/revenue:null, breakEven, breakEvenExact, workingCapital:wc, wcItems,
    roc, rocAnnual:roc!=null&&cycle>0?roc*360/cycle:null, fundingDays:proceeds-pDay, cycleDays:cycle,
    estimateDriven, findings};
}

const DEFAULT_SCENARIOS=[
  {id:'optimistic',  name:'Optimistic',   sale_delta:3,  freight_delta:-1,  delay_days:0,  demurrage_days:0, claim_pct:0},
  {id:'base',        name:'Base',         sale_delta:0,  freight_delta:0,   delay_days:0,  demurrage_days:0, claim_pct:0},
  {id:'conservative',name:'Conservative', sale_delta:0,  freight_delta:1.5, delay_days:10, demurrage_days:1, claim_pct:0},
  {id:'stress',      name:'Stress',       sale_delta:-5, freight_delta:3,   delay_days:25, demurrage_days:3, claim_pct:0.25}
];
function runScenarios(deal, scenarios){
  return (scenarios||DEFAULT_SCENARIOS).map(s=>({scenario:s, result:runDeal(deal,Object.assign({_quiet:true},s))}));
}
function sensitivities(deal){
  const base=runDeal(deal,{_quiet:true}); if(base.status!=='ok') return null;
  const d=(sc)=>r2(runDeal(deal,Object.assign({_quiet:true},sc)).net-base.net);
  return {sale_plus_1:d({sale_delta:1}), freight_plus_1:d({freight_delta:1}), delay_plus_1:d({delay_days:1}),
          demurrage_plus_1: n(deal.demurrage_rate)!=null ? d({demurrage_days:1}) : null};
}

/* ============================================================
   2. PETROLEUM QUALITY INTELLIGENCE
   ============================================================ */
/* parameter library per product: names, default units and what each
   means. NO numeric limits — those come from the contract / user. */
const P = (id,name,unit,kind,meaning,safety)=>({id,name,unit,kind,meaning,safety:!!safety});
const PARAMS = {
  sulfur:   P('sulfur','Sulfur','mg/kg','mass_frac','Emissions compliance, product grade and refining value. Often a regulatory limit at destination.',true),
  flash:    P('flash','Flash point','°C','temp','Volatility and handling safety. A low flash point can point to light-end contamination (hypothesis only).',true),
  density:  P('density','Density at 15°C','kg/m3','density','Mass-volume conversion and product identification. Needed for any BBL↔MT conversion.'),
  api:      P('api','API gravity','°API','none','Inverse expression of density; must agree with the density result.'),
  visc:     P('visc','Kinematic viscosity','mm2/s','visc','Pumpability and atomization. Must be stated at the spec reference temperature.'),
  cetane_n: P('cetane_n','Cetane number','','none','Diesel ignition quality (engine test). Not interchangeable with cetane index.'),
  cetane_i: P('cetane_i','Cetane index','','none','Calculated ignition quality. Not interchangeable with cetane number.'),
  cfpp:     P('cfpp','CFPP','°C','temp','Cold-flow: lowest temperature the fuel still passes a filter.'),
  cloud:    P('cloud','Cloud point','°C','temp','Cold-flow: wax starts to form.'),
  pour:     P('pour','Pour point','°C','temp','Cold-flow and heating requirement during shipping.'),
  water:    P('water','Water','mg/kg','mass_frac','Cleanliness, corrosion and microbial growth risk.'),
  contam:   P('contam','Total contamination','mg/kg','mass_frac','Particulates; filter blocking and wear.'),
  ash:      P('ash','Ash','% m/m','mass_frac','Inorganic residue; engine deposits and wear.'),
  sediment: P('sediment','Total sediment','% m/m','mass_frac','Stability and cleanliness; sludge risk.'),
  carbon:   P('carbon','Carbon residue','% m/m','mass_frac','Deposit-forming tendency.'),
  lubricity:P('lubricity','Lubricity (WSD)','µm','none','Fuel-system wear protection.'),
  fame:     P('fame','FAME content','% v/v','vol_frac','Biodiesel content; storage stability and jet contamination risk.'),
  oxstab:   P('oxstab','Oxidation stability','g/m3','none','Storage life; gum and sludge formation.'),
  acid:     P('acid','Acid number','mg KOH/g','none','Corrosivity.'),
  copper:   P('copper','Copper strip corrosion','class','none','Corrosivity to copper parts (rating, e.g. class 1).'),
  dist10:   P('dist10','Distillation 10% recovered','°C','temp','Boiling distribution (front end).'),
  dist50:   P('dist50','Distillation 50% recovered','°C','temp','Boiling distribution (mid point).'),
  dist90:   P('dist90','Distillation 90% recovered','°C','temp','Boiling distribution (back end).'),
  dist95:   P('dist95','Distillation 95% recovered','°C','temp','Boiling distribution (back end).'),
  fbp:      P('fbp','Final boiling point','°C','temp','End of distillation.'),
  pah:      P('pah','Polycyclic aromatics','% m/m','mass_frac','Emissions; often regulatory.',true),
  freezing: P('freezing','Freezing point','°C','temp','Jet fuel cold performance. Safety-critical.',true),
  aromatics:P('aromatics','Aromatics','% v/v','vol_frac','Combustion quality, smoke and seal swell.'),
  jfot:     P('jfot','Thermal stability (JFOT)','','none','Jet fuel deposit formation at high temperature. Safety-critical.',true),
  conduct:  P('conduct','Electrical conductivity','pS/m','none','Static discharge safety during handling.',true),
  smoke:    P('smoke','Smoke point','mm','none','Jet fuel combustion cleanliness.'),
  mercapt:  P('mercapt','Mercaptan sulfur','% m/m','mass_frac','Odour and corrosivity.'),
  h2s:      P('h2s','Hydrogen sulfide (H2S)','mg/kg','mass_frac','Toxic gas exposure. Safety-critical.',true),
  vanadium: P('vanadium','Vanadium','mg/kg','mass_frac','Metals; engine corrosion and deposits.'),
  sodium:   P('sodium','Sodium','mg/kg','mass_frac','Metals; hot corrosion with vanadium.'),
  alsi:     P('alsi','Aluminium + silicon','mg/kg','mass_frac','Catalyst fines; abrasive engine wear.',true),
  tsp:      P('tsp','Total sediment potential','% m/m','mass_frac','Marine fuel stability.'),
  ron:      P('ron','Research octane (RON)','','none','Knock resistance.'),
  mon:      P('mon','Motor octane (MON)','','none','Knock resistance under load.'),
  rvp:      P('rvp','Vapor pressure','kPa','none','Evaporative emissions and vapor lock; often seasonal/regulatory.',true),
  benzene:  P('benzene','Benzene','% v/v','vol_frac','Toxicity; regulatory.',true),
  oxygen:   P('oxygen','Oxygen / oxygenates','% m/m','mass_frac','Blend component limits.'),
  lead:     P('lead','Lead','mg/L','none','Regulatory.',true),
  bsw:      P('bsw','BS&W','% v/v','vol_frac','Basic sediment and water; payable quantity and corrosion.'),
  salt:     P('salt','Salt content','PTB','none','Refinery corrosion and desalter load.'),
  tan:      P('tan','TAN','mg KOH/g','none','Naphthenic acid corrosion in refining.'),
  nickel:   P('nickel','Nickel','mg/kg','mass_frac','Metals; catalyst poisoning.'),
  c2:       P('c2','C2 and lighter','% mol','none','LPG composition.'),
  c3:       P('c3','Propane (C3)','% mol','none','LPG composition.'),
  c4:       P('c4','Butanes (C4)','% mol','none','LPG composition.'),
  c5:       P('c5','C5 and heavier','% mol','none','LPG composition; residue.'),
  residue:  P('residue','Evaporation residue','mL','none','LPG heavy residue.'),
  penetration:P('penetration','Penetration at 25°C','0.1 mm','none','Bitumen hardness grade.'),
  softening:P('softening','Softening point','°C','temp','Bitumen grade.'),
  vi:       P('vi','Viscosity index','','none','Base oil viscosity change with temperature.'),
  noack:    P('noack','Noack volatility','% m/m','mass_frac','Base oil evaporation loss.'),
  saturates:P('saturates','Saturates','% m/m','mass_frac','Base oil API group classification.'),
  colour:   P('colour','Colour (ASTM)','','none','Appearance / refining severity.'),
  appearance:P('appearance','Appearance','','none','Clear and bright check.')
};
/* mandatory tests per product (spec v2 §8). Each product uses only its relevant tests. */
const PRODUCT_TESTS = {
  diesel:   ['sulfur','flash','density','visc','cetane_n','cetane_i','dist95','cfpp','cloud','lubricity','fame','water','contam','oxstab','pah','carbon','ash','copper'],
  jet:      ['flash','freezing','density','dist10','fbp','aromatics','sulfur','mercapt','jfot','conduct','smoke','acid','copper'],
  fuel:     ['sulfur','visc','density','flash','tsp','sediment','water','vanadium','sodium','alsi','acid','carbon','pour','h2s'],
  petrol:   ['ron','mon','rvp','dist10','dist50','dist90','fbp','sulfur','aromatics','benzene','oxygen','lead','density'],
  crude:    ['api','density','sulfur','bsw','water','salt','tan','h2s','pour','visc','vanadium','nickel'],
  condensate:['api','density','sulfur','rvp','h2s','mercapt','bsw','salt','dist90'],
  lpg:      ['c2','c3','c4','c5','rvp','sulfur','h2s','copper','residue','water'],
  bitumen:  ['penetration','softening','flash','density','visc'],
  baseoil:  ['visc','vi','flash','pour','noack','saturates','sulfur','colour','acid'],
  other:    ['sulfur','flash','density','water']
};
/* product recognition from free text (spec v2 §2) */
function recognizeProduct(text){
  const t=String(text||'').toLowerCase();
  const R=[[/\b(en ?590|ulsd|gas ?oil|gasoil|diesel|mgo|d2)\b/,'diesel'],[/\b(jet|kero|ts-1|avtur)\b/,'jet'],
    [/\b(hsfo|vlsfo|lsfo|ulsfo|fuel oil|m100|mazut|d6|ifo|bunker)\b/,'fuel'],[/\b(gasoline|petrol|ron|naphtha|mogas|ai-9)/,'petrol'],
    [/\b(lpg|propane|butane|lng)\b/,'lpg'],[/\b(bitumen|asphalt|vg-?\d+|60\/70|80\/100)\b/,'bitumen'],[/\b(base ?oil|sn ?\d+|bright stock|group i)/,'baseoil'],
    [/\b(condensate)\b/,'condensate'],[/\b(crude|brent|wti|murban|urals|espo|api)\b/,'crude']];
  for(const [re,p] of R) if(re.test(t)) return p;
  return null;
}

/* unit normalisation — original unit is kept beside the converted value */
function normUnit(u){ return String(u||'').trim().toLowerCase().replace(/\s+/g,'').replace('³','3').replace('²','2').replace('°','').replace('mass',''); }
function convert(value, from, to, kind){
  if(value==null) return null;
  const f=normUnit(from), t=normUnit(to);
  if(f===t || !f) return value;
  if(kind==='mass_frac'){
    const k={'mg/kg':1,'ppm':1,'ppmw':1,'ppm(m)':1,'%m/m':10000,'%':10000,'%wt':10000,'wt%':10000,'%(m/m)':10000};
    if(k[f]!=null && k[t]!=null) return value*k[f]/k[t];
    return null;   // e.g. % v/v -> mg/kg is not a valid conversion
  }
  if(kind==='vol_frac'){ const k={'%v/v':1,'%vol':1,'vol%':1,'%':1}; return (k[f]!=null&&k[t]!=null)?value:null; }
  if(kind==='temp'){
    const C={'c':1,'degc':1}, F={'f':1,'degf':1};
    if(C[f]&&F[t]) return value*9/5+32; if(F[f]&&C[t]) return (value-32)*5/9; return null;
  }
  if(kind==='density'){
    const k={'kg/m3':1,'g/cm3':1000,'g/ml':1000,'kg/l':1000,'kg/dm3':1000};
    if(k[f]!=null&&k[t]!=null) return value*k[f]/k[t]; return null;
  }
  if(kind==='visc'){ const k={'mm2/s':1,'cst':1}; return (k[f]!=null&&k[t]!=null)?value:null; }
  return null;
}
/* density <-> API (density at 15°C in kg/m3; water at 15°C = 999.016 kg/m3) */
const WATER_15 = 999.016;
const apiFromDensity = rho => 141.5/(rho/WATER_15)-131.5;
const densityFromApi = api => 141.5/(api+131.5)*WATER_15;

/* compare one result against one limit set.
   p: {name, unit, kind, safety, method, value, value_unit, reproducibility, confidence}
   lim: {min, max, unit, reference_conditions, tolerance}
   rule: STRICT | PRECISION_BAND | CONTRACT_TOLERANCE | STANDARD_PRACTICE */
function assessParam(p, lim, rule){
  rule=rule||'STRICT';
  const out={parameter:p.name, rule, limit:null, actual:null, status:null, deviation:null, severity:'LOW', tag:'DOCUMENT', note:''};
  const min=n(lim&&lim.min), max=n(lim&&lim.max);
  if(min==null && max==null){ out.status='NOT_APPLICABLE'; return out; }
  const limUnit=(lim.unit||p.unit||'');
  out.limit={type:min!=null&&max!=null?'RANGE':min!=null?'MIN':'MAX', min, max, unit:limUnit};
  const raw=n(p.value);
  if(raw==null){
    out.status='NOT_REPORTED'; out.severity=p.safety?'HIGH':'MEDIUM';
    out.note='The specification requires this parameter and the certificate does not report it.'; return out;
  }
  let v=raw;
  if(p.value_unit && normUnit(p.value_unit)!==normUnit(limUnit)){
    v=convert(raw,p.value_unit,limUnit,p.kind);
    if(v==null){ out.status='NOT_COMPARABLE'; out.severity=p.safety?'HIGH':'MEDIUM'; out.actual={value:raw,unit:p.value_unit};
      out.note='Reported unit '+p.value_unit+' cannot be converted to '+limUnit+'. No comparison made.'; return out; }
    v=Math.round(v*1e6)/1e6;
  }
  out.actual={value:v, unit:limUnit, original_value:raw, original_unit:p.value_unit||limUnit, method:p.method||''};
  if(lim.reference_conditions && p.conditions && normUnit(lim.reference_conditions)!==normUnit(p.conditions)){
    out.status='NOT_COMPARABLE'; out.severity=p.safety?'HIGH':'MEDIUM';
    out.note='Result stated at '+p.conditions+' but the limit is at '+lim.reference_conditions+'.'; return out;
  }
  /* deviation on the failing side */
  let dev=0;
  if(max!=null && v>max) dev=v-max;
  if(min!=null && v<min) dev=v-min;
  out.deviation=dev?Math.round(dev*1e6)/1e6:0;
  const fails = dev!==0;
  if(!fails) out.status='PASS';
  else if(rule==='STRICT') out.status='FAIL';
  else if(rule==='PRECISION_BAND'){
    const R=n(p.reproducibility);
    if(R==null){ out.status='FAIL'; out.note='No reproducibility stored for this method, so the precision band cannot apply.'; }
    else out.status=Math.abs(dev)<=R?'REVIEW':'FAIL';
    if(out.status==='REVIEW') out.note='Outside the limit but within the method reproducibility ('+R+'). A qualified person must decide.';
  } else if(rule==='CONTRACT_TOLERANCE'){
    const T=n(lim.tolerance);
    if(T==null){ out.status='FAIL'; out.note='No contract tolerance entered.'; }
    else out.status=Math.abs(dev)<=T?'PASS':'FAIL';
    if(out.status==='PASS') out.note='Within the contract tolerance of '+T+'.';
  } else { out.status='REVIEW'; out.note='Standard practice rule set (e.g. ISO 4259) is not loaded. Requires technical review.'; }
  /* weak evidence */
  if(out.status==='PASS' || out.status==='FAIL'){
    if(!p.method){ if(out.status==='PASS'){ out.status='REVIEW'; } out.tag='UNVERIFIED'; out.note=(out.note?out.note+' ':'')+'No test method reported: not comparable evidence.'; }
    if(n(p.confidence)!=null && n(p.confidence)<0.8){ out.status='REVIEW'; out.tag='UNVERIFIED'; out.note=(out.note?out.note+' ':'')+'Low-confidence reading: confirm manually.'; }
  }
  if(out.status==='FAIL') out.severity=p.safety?'CRITICAL':'HIGH';
  else if(out.status==='REVIEW'||out.status==='NOT_REPORTED') out.severity=p.safety?'HIGH':'MEDIUM';
  else if(out.status==='NOT_COMPARABLE') out.severity=p.safety?'HIGH':'MEDIUM';
  return out;
}

/* set verdict (spec v2 §1): never ON_SPEC with missing mandatory tests */
function setVerdict(rows){
  const app=rows.filter(r=>r.status!=='NOT_APPLICABLE');
  if(!app.length) return 'NOT_ASSESSED';
  if(app.some(r=>r.status==='FAIL')) return 'OFF_SPEC';
  if(app.some(r=>r.status==='REVIEW')) return 'REQUIRES_TECHNICAL_REVIEW';
  if(app.some(r=>r.status==='NOT_REPORTED'||r.status==='NOT_COMPARABLE')) return 'PARTIALLY_ASSESSED';
  return 'ON_SPEC';
}

/* full assessment.
   q = {product, offered_grade, requested_grade, rule, sets:{A:{label,standard,edition},B:{...},C:{...}},
        params:[{id,name,unit,kind,safety,method,value,value_unit,reproducibility,conditions,confidence,
                 limits:{A:{min,max,unit,tolerance,reference_conditions},B:{...},C:{...}}}],
        cert:{lab,accreditation,inspector,sample_type,sample_point,sample_date,report_date,tank,batch,vessel,quantity,cert_no},
        deal:{tank,vessel,batch,load_date,max_cert_age_days,named_inspector}}  */
function assessQuality(q){
  const findings=[], checks=[], notAssessed=[];
  const sets=['A','B','C'].filter(k=>q.sets&&q.sets[k]&&(q.params||[]).some(p=>p.limits&&p.limits[k]&&(n(p.limits[k].min)!=null||n(p.limits[k].max)!=null)));
  const results={};
  sets.forEach(k=>{
    const s=q.sets[k];
    const rows=(q.params||[]).map(p=>assessParam(p,(p.limits||{})[k],q.rule));
    let verdict=setVerdict(rows);
    if(s.standard && !s.edition){
      findings.push({severity:'HIGH',area:'SPEC',text:(s.label||k)+': standard "'+s.standard+'" named without an edition. Limits cannot be tied to a version; verdict capped at HOLD.'});
      verdict='NOT_ASSESSED'; notAssessed.push({item:(s.label||k)+' edition',reason:'Standard edition unknown.'});
    }
    results[k]={set:k,label:s.label||k,standard:s.standard||'',edition:s.edition||'',verdict,rows};
  });
  if(!sets.length) notAssessed.push({item:'Limits',reason:'No limits entered for any requirement set. Nothing can be compared; no limits are assumed.'});
  if(results.C===undefined) notAssessed.push({item:'Destination compliance',reason:'No verified destination rules entered. Not inferred from seller or buyer spec.'});

  /* grade */
  if(q.offered_grade && q.requested_grade && q.offered_grade.trim().toLowerCase()!==q.requested_grade.trim().toLowerCase())
    findings.push({severity:'MEDIUM',area:'SPEC',text:'Non-standard grade: offered "'+q.offered_grade+'" differs from requested "'+q.requested_grade+'". Not automatically defective; compare against the buyer spec.'});

  /* internal arithmetic: density vs API */
  const P=id=>(q.params||[]).find(p=>p.id===id);
  const den=P('density'), api=P('api');
  if(den&&api&&n(den.value)!=null&&n(api.value)!=null){
    const rho=convert(n(den.value),den.value_unit||'kg/m3','kg/m3','density');
    if(rho!=null){
      const exp=apiFromDensity(rho), diff=Math.abs(exp-n(api.value)), tol=0.3;
      checks.push({rule:'Density vs API gravity',result:diff<=tol?'MATCH':'CONFLICT',detail:'Density '+rho+' kg/m3 gives API '+exp.toFixed(1)+'; reported '+api.value+(diff<=tol?' (within '+tol+')':' (differs by '+diff.toFixed(1)+')')});
    }
  }
  /* distillation order */
  const dseq=['dist10','dist50','dist90','dist95','fbp'].map(P).filter(p=>p&&n(p.value)!=null);
  if(dseq.length>1){
    let ok=true; for(let i=1;i<dseq.length;i++) if(n(dseq[i].value)<n(dseq[i-1].value)) ok=false;
    checks.push({rule:'Distillation points ascending',result:ok?'MATCH':'CONFLICT',detail:dseq.map(p=>p.name.replace('Distillation ','')+' '+p.value).join(' → ')});
  }
  /* identity + dates + issuer */
  const c=q.cert||{}, d=q.deal||{};
  const same=(a,b)=>String(a).trim().toLowerCase()===String(b).trim().toLowerCase();
  [['tank','Tank ID'],['vessel','Vessel'],['batch','Batch ID']].forEach(([k,lab])=>{
    if(c[k]&&d[k]) checks.push({rule:lab+' matches deal',result:same(c[k],d[k])?'MATCH':'CONFLICT',detail:'Certificate: '+c[k]+' · Deal: '+d[k]});
  });
  if(d.named_inspector&&c.inspector) checks.push({rule:'Inspector matches contract',result:same(c.inspector,d.named_inspector)?'MATCH':'CONFLICT',detail:'Certificate: '+c.inspector+' · Contract: '+d.named_inspector});
  const tied=!!(c.tank||c.batch||c.vessel||c.quantity);
  if(!tied) findings.push({severity:'HIGH',area:'SPEC',text:'Certificate has no tank, batch, vessel or quantity reference: it is evidence about some product, not this cargo. Verdict capped at HOLD.'});
  if(!c.lab && !c.inspector) findings.push({severity:'HIGH',area:'SPEC',text:'No identifiable issuing laboratory or inspector. Verdict capped at HOLD.'});
  if(c.lab && !c.accreditation_verified) findings.push({severity:'LOW',area:'SPEC',text:'Laboratory accreditation recorded as claimed only (UNVERIFIED) until evidence is supplied.'});
  const dt=s=>s?new Date(s+'T00:00:00Z').getTime():null;
  if(c.sample_date&&c.report_date) checks.push({rule:'Sample date before report date',result:dt(c.sample_date)<=dt(c.report_date)?'MATCH':'CONFLICT',detail:c.sample_date+' → '+c.report_date});
  if(c.sample_date&&d.load_date&&n(d.max_cert_age_days)!=null){
    const age=Math.round((dt(d.load_date)-dt(c.sample_date))/864e5);
    if(age>n(d.max_cert_age_days)) findings.push({severity:'MEDIUM',area:'SPEC',text:'Certificate is '+age+' days old at loading; contract allows '+d.max_cert_age_days+'.'});
    else checks.push({rule:'Certificate age at loading',result:'MATCH',detail:age+' days (max '+d.max_cert_age_days+')'});
  }
  /* pattern flag: many results exactly on a limit */
  const onLimit=Object.values(results).flatMap(r=>r.rows).filter(r=>r.actual&&r.limit&&(r.actual.value===r.limit.max||r.actual.value===r.limit.min)).length;
  if(onLimit>=3) findings.push({severity:'MEDIUM',area:'SPEC',text:onLimit+' results sit exactly on a limit. Worth a closer look at the certificate (this is a review flag, not an allegation).'});

  /* failures -> findings with hypotheses */
  Object.values(results).forEach(r=>r.rows.forEach(row=>{
    if(row.status==='FAIL') findings.push({severity:row.severity,area:'SPEC',text:r.label+': '+row.parameter+' '+row.actual.value+' '+row.actual.unit+' vs '+(row.limit.type==='MIN'?'min '+row.limit.min:row.limit.type==='MAX'?'max '+row.limit.max:row.limit.min+'–'+row.limit.max)+' → deviation '+(row.deviation>0?'+':'')+fmtNum(row.deviation)+' '+row.actual.unit+'.'+hypothesis(row)});
  }));

  const conflicts=checks.filter(c=>c.result==='CONFLICT');
  const identityConflict=conflicts.some(c=>/matches deal|Inspector/.test(c.rule));
  const safetyGap=Object.values(results).some(r=>r.rows.some(row=>(row.status==='FAIL'||row.status==='NOT_REPORTED'||row.status==='NOT_COMPARABLE')&&(q.params.find(p=>p.name===row.parameter)||{}).safety));
  const hold = identityConflict || !tied || (!c.lab&&!c.inspector) || safetyGap || Object.values(results).some(r=>r.verdict==='NOT_ASSESSED'&&r.edition==='');
  return {product:q.product, rule:q.rule||'STRICT', rule_note:(q.rule||'STRICT')==='STRICT'?'Contract silent or set to strict: results compared to limits as written, no tolerance.':'',
    requirement_sets:Object.values(results), consistency_checks:checks, findings, not_assessed:notAssessed,
    gate:hold?'HOLD':'CLEAR', engine_version:'quality-2.0.0', library_versions:['petromad-param-library-2026.10']};
}
function hypothesis(row){
  const p=row.parameter.toLowerCase();
  if(/flash/.test(p)&&row.deviation<0) return ' Possible light-end contamination (hypothesis, not fact). Qualified safety review needed before handling or remediation.';
  if(/sulfur/.test(p)&&row.deviation>0) return ' Possible causes: contamination, blending error, sampling or test variability (hypotheses only). Retest with the named method; confirm destination rules.';
  return ' Plausible causes (unconfirmed): contamination, blending error, sampling problem or test variability.';
}

/* quality adjustment from a CONTRACT formula (never invented)
   {limit, per_unit_deduction (USD/MT per 1 unit over), rejection_above, actual, qty_mt} */
function qualityAdjustment(a){
  const lim=n(a.limit), ded=n(a.per_unit_deduction), act=n(a.actual), q=n(a.qty_mt), rej=n(a.rejection_above);
  if(lim==null||ded==null||act==null) return {status:'not_quantifiable', reason:'No contract adjustment formula entered. Agree the deduction and rejection clauses first.'};
  if(rej!=null && act>rej) return {status:'rejection', over:r2(act-lim), reason:'Result '+act+' is above the rejection threshold '+rej+'. Use the rejection scenario with real redirection costs.'};
  const over=Math.max(0,act-lim), perMT=r2(over*ded);
  return {status:'ok', over:Math.round(over*1e6)/1e6, per_mt:perMT, total:q!=null?r2(perMT*q):null};
}
/* linear mass-balance blend (advisory, ESTIMATE) */
function blendMassBalance(a){
  const off=n(a.off_value), good=n(a.good_value), tgt=n(a.target), total=n(a.total_mt);
  if(off==null||good==null||tgt==null||off===good) return null;
  const f=(tgt-good)/(off-good);
  if(f<0||f>1) return {possible:false, note:'Target cannot be reached with these two lots.'};
  return {possible:true, off_fraction:f, off_mt:total!=null?r2(f*total):null, good_mt:total!=null?r2((1-f)*total):null, tag:'ESTIMATE',
    note:'Linear mass balance only (valid for properties like sulfur by mass). Flash point, viscosity, cold flow, cetane and distillation do not blend linearly: REVIEW, lab blend test needed. Blending still needs laboratory confirmation, terminal/class approval and contract consent. No result is guaranteed.'};
}

function fmtNum(x,dp){ if(x==null||isNaN(x)) return '—'; dp=dp==null?2:dp; return Number(x).toLocaleString('en-US',{minimumFractionDigits:dp,maximumFractionDigits:dp}); }
function fmtUSD(x){ return x==null?'—':(x<0?'−':'')+fmtNum(Math.abs(x)); }

const API={TAGS,r2,toMT,mtToVolumes,BBL_PER_M3,INCOTERM_PAYER,includedInPurchase,validateDeal,runDeal,runScenarios,sensitivities,DEFAULT_SCENARIOS,
  PARAMS,PRODUCT_TESTS,recognizeProduct,convert,apiFromDensity,densityFromApi,assessParam,setVerdict,assessQuality,qualityAdjustment,blendMassBalance,fmtNum,fmtUSD};
if(typeof module!=='undefined'&&module.exports) module.exports=API; else root.PETROMAD=API;
})(typeof window!=='undefined'?window:globalThis);
