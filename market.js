/* ============================================================
   PETROMAD V2 public front: Our Offers, Buy From Us, How it works,
   enquiry tracking and the internal offer builder.
   Uses platform.js (PMP). Never shows applicant scores.
   ============================================================ */

/* ---------- icons (inline SVG, stroke = currentColor) ---------- */
const IC = (p, vb) => `<svg viewBox="${vb || '0 0 24 24'}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
const ICONS = {
  drop: IC('<path d="M12 2.8c3.4 4.3 6.2 7.9 6.2 11.4a6.2 6.2 0 01-12.4 0c0-3.5 2.8-7.1 6.2-11.4z"/><path d="M9 15.5a3 3 0 003 2.6"/>'),
  ship: IC('<path d="M3 17l1.6 3h14.8L21 17"/><path d="M5 17V11l7-3 7 3v6"/><path d="M12 8V3M9 5h6"/><path d="M2 21c1.5 0 1.5-1 3-1s1.5 1 3 1 1.5-1 3-1 1.5 1 3 1 1.5-1 3-1 1.5 1 3 1"/>'),
  tank: IC('<ellipse cx="12" cy="5" rx="7" ry="2.5"/><path d="M5 5v13c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5V5"/><path d="M5 11.5c0 1.4 3.1 2.5 7 2.5s7-1.1 7-2.5"/>'),
  buy: IC('<path d="M3 4h2l2.2 10.2a2 2 0 002 1.6h7.6a2 2 0 002-1.5L21 8H6.2"/><circle cx="10" cy="20" r="1.3"/><circle cx="17" cy="20" r="1.3"/>'),
  sell: IC('<path d="M12 3v12"/><path d="M7 8l5-5 5 5"/><path d="M4 15v4a2 2 0 002 2h12a2 2 0 002-2v-4"/>'),
  doc: IC('<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>'),
  spec: IC('<path d="M9 3h6M10 3v6l-5 9a2 2 0 001.8 3h10.4A2 2 0 0019 18l-5-9V3"/><path d="M7.5 14h9"/>'),
  chat: IC('<path d="M21 12a8 8 0 01-11.6 7.1L4 20l1-4.6A8 8 0 1121 12z"/>'),
  info: IC('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
  search: IC('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  clock: IC('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  pin: IC('<path d="M12 21s-7-6.2-7-11.5a7 7 0 0114 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  lock: IC('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  check: IC('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  arrow: IC('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  flask: IC('<path d="M9 3h6M10 3v6l-5 9a2 2 0 001.8 3h10.4A2 2 0 0019 18l-5-9V3"/>'),
  chart: IC('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>'),
  plus: IC('<path d="M12 5v14M5 12h14"/>'),
  moon: IC('<path d="M20 14.5A8.5 8.5 0 019.5 4 8.5 8.5 0 1020 14.5z"/>'),
  sun: IC('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  shield: IC('<path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z"/><path d="M8.5 12l2.5 2.5 4.5-4.5"/>'),
  user: IC('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>'),
  list: IC('<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>'),
  edit: IC('<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z"/>'),
  // product families
  crude: IC('<path d="M7 3h10l-1 4H8z"/><rect x="5" y="7" width="14" height="14" rx="2"/><path d="M9 12h6M9 16h6"/>'),
  fuel: IC('<path d="M4 21V5a2 2 0 012-2h6a2 2 0 012 2v16M3 21h12M6 9h6"/><path d="M14 8l3 3v6a1.5 1.5 0 003 0V9l-3-3"/>'),
  diesel: IC('<rect x="2" y="7" width="13" height="10" rx="1"/><path d="M15 10h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="18" cy="18" r="2"/>'),
  petrol: IC('<path d="M5 17h14l-1.5-5.5A2 2 0 0015.6 10H8.4a2 2 0 00-1.9 1.5z"/><circle cx="8" cy="18" r="1.6"/><circle cx="16" cy="18" r="1.6"/>'),
  baseoil: IC('<path d="M9 3h6v3l2 2v12a1 1 0 01-1 1H8a1 1 0 01-1-1V8l2-2z"/><path d="M7 12h10"/>'),
  condensate: IC('<path d="M12 3c2.5 3.2 4.5 5.8 4.5 8.2a4.5 4.5 0 01-9 0C7.5 8.8 9.5 6.2 12 3z"/><path d="M6 17c2 2 10 2 12 0"/>'),
  jet: IC('<path d="M10.5 21l1.5-6-6.5 2v-2l6.5-4V5a1.5 1.5 0 013 0v6l6.5 4v2l-6.5-2 1.5 6-3-1z"/>'),
  lpg: IC('<path d="M12 3c1 3 4 4.5 4 8.5a4 4 0 01-8 0c0-2 1-3 1.5-4 .5 1.5 1.5 2 2.5 2C12 7 11 5 12 3z"/><path d="M6 21h12"/>'),
  bitumen: IC('<path d="M4 21L10 3h4l6 18M12 7v2M12 12v2M12 17v2"/>'),
  other: IC('<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>')
};
const ico = n => `<span class="ico">${ICONS[n] || ICONS.drop}</span>`;

/* ---------- state ---------- */
let OFFERS = null, OFFERS_ERR = '', CUR_OFFER = null;
const BDRAFT_KEY = 'pmBuyDraft';
let B = (() => { try { return JSON.parse(localStorage.getItem(BDRAFT_KEY) || 'null') || null; } catch (e) { return null; } })() || newBuy();
let BSTEP = 0, BFILES = {specfile: [], ev_files: []}, BREF = '', BSTATUS = null;
function newBuy(offer) { return {ans: {qunit: 'MT', acts: []}, offer: offer || null, started: Date.now(), saved: 0}; }
const saveB = () => { B.saved = Date.now(); try { localStorage.setItem(BDRAFT_KEY, JSON.stringify(B)); } catch (e) {} };
const hasD = v => v != null && v !== '' && v !== false && !(Array.isArray(v) && !v.length);
const arrOf = v => Array.isArray(v) ? v : (hasD(v) ? [v] : []);

/* ---------- analytics (anonymous counts only) ---------- */
function track(name, offerId) {
  try {
    if (!CONFIG.scriptUrl || !navigator.sendBeacon) return;
    navigator.sendBeacon(CONFIG.scriptUrl, JSON.stringify({type: 'event', name, offerId: offerId || ''}));
  } catch (e) {}
}

/* ---------- published offers ---------- */
async function loadOffers(force) {
  if (OFFERS && !force) return OFFERS;
  try {
    const r = await fetch((CONFIG.offersUrl || 'offers.json') + '?t=' + Date.now(), {cache: 'no-store'});
    OFFERS = await r.json(); OFFERS_ERR = '';
  } catch (e) { OFFERS = {offers: []}; OFFERS_ERR = 'Could not load the offer list. Check your connection.'; }
  return OFFERS;
}
const week = () => PMP.isoWeek(new Date());

/* ============================================================
   HOME
   ============================================================ */
function renderHome(app) {
  $('#bar').hidden = true;
  const w = week();
  const list = OFFERS ? PMP.activeOffers(OFFERS) : null;
  app.innerHTML = `<div class="screen">
   ${brandBar()}
   <section class="hero2">
     <div class="eyebrow"><span class="live"></span>PETROMAD AVAILABLE CARGOES — WEEK ${w.week}</div>
     <h1>Physical petroleum,<br><em>traded properly.</em></h1>
     <p>Weekly approved cargo offers, buyer requests and supplier intake. Every request is reviewed by a PETROMAD trader.</p>
   </section>
   <div class="ctas">
     <button class="cta buy" id="goBuy">${ico('buy')}<span><b>I Want to Buy</b><small>Tell us your requirement</small></span>${ICONS.arrow}</button>
     <button class="cta sell" id="goSell">${ico('sell')}<span><b>I Have Product to Sell</b><small>Submit a cargo or stock</small></span>${ICONS.arrow}</button>
   </div>
   <div class="sechd"><h3>Our Offers</h3><span class="tag mono">W${String(w.week).padStart(2, '0')} · ${w.year}</span>
     ${list && list.length ? `<button class="lnk" id="wkPdf">${ICONS.doc} Weekly PDF</button>` : ''}</div>
   <div id="offerList">${list == null ? skeleton() : list.length ? list.map(offerCard).join('') : emptyOffers()}</div>
   ${OFFERS_ERR ? `<div class="err">${esc(OFFERS_ERR)}</div>` : ''}
   <div class="links">
     <a class="lrow" href="#how">${ico('info')}<span><b>How PETROMAD works</b><small>Process, privacy, FAQs</small></span>${ICONS.arrow}</a>
     <a class="lrow" href="#track">${ico('search')}<span><b>Track my request</b><small>Received · under review · clarification</small></span>${ICONS.arrow}</a>
   </div>
   <details class="desk"><summary>${ico('lock')}<span>PETROMAD desk tools</span></summary>
     <div class="tools">
       <button class="tool" id="goQuality">${ico('flask')}<b>Quality check</b><small>Spec vs lab certificate</small></button>
       <button class="tool" id="goDeal">${ico('chart')}<b>Deal profit</b><small>Net, break-even, scenarios</small></button>
       <button class="tool" id="goPublish">${ico('edit')}<b>Publish offer</b><small>Build, approve, export</small></button>
     </div></details>
   <p class="foot">Nothing on this site is a binding offer or acceptance. ${esc(PMP.NON_BINDING)}</p>
  </div>`;
  bindBrand();
  $('#goBuy').onclick = () => startBuy(null);
  $('#goSell').onclick = () => go('sell');
  $('#goQuality').onclick = () => { view = 'quality'; render(); };
  $('#goDeal').onclick = () => { view = 'deal'; render(); };
  $('#goPublish').onclick = () => go('publish');
  const wp = $('#wkPdf'); if (wp) wp.onclick = () => weeklyPdf();
  bindOfferCards(app);
  if (!OFFERS) loadOffers().then(() => { if (view === 'home') render(); });
}
function brandBar(back) {
  const dark = document.documentElement.dataset.theme !== 'day';
  return `<div class="top">${back ? `<button class="circ" id="bk" aria-label="Back">${ICONS.arrow.replace('<svg', '<svg style="transform:rotate(180deg)"')}</button>` : ''}
    <a class="brand" href="#" aria-label="PETROMAD home"><span class="mark">${ICONS.drop}</span><span><b>PETROMAD</b><small>Trading desk</small></span></a>
    <button class="circ ml" id="themeBtn" aria-label="Switch day / night">${dark ? ICONS.sun : ICONS.moon}</button></div>`;
}
function bindBrand(onBack) {
  const t = $('#themeBtn'); if (t) t.onclick = () => { setTheme(THEME === 'day' ? 'night' : 'day'); render(); };
  const b = $('#bk'); if (b) b.onclick = onBack || (() => go('home'));
}
const skeleton = () => `<div class="ocard sk"></div><div class="ocard sk"></div>`;
const emptyOffers = () => `<div class="empty">${ico('tank')}<b>No cargoes published this week yet</b>
  <p>New offers are published every week and stay active for seven days. Tell us what you need and we will match it against supply.</p>
  <button class="btn2" id="emptyBuy">Send a buying request</button></div>`;

function offerCard(x) {
  const o = x.offer, v = PMP.publicView(x.version), p = v.product || {}, l = v.location || {}, d = v.delivery || {};
  const t = PMP.dualTime(x.expires), left = Math.max(0, x.expires - Date.now()), days = Math.floor(left / PMP.DAY), hrs = Math.floor(left % PMP.DAY / 3600000);
  return `<article class="ocard" data-oid="${esc(o.id)}">
    <div class="ohd"><span class="mono oid">${esc(o.id)} · v${v.version}</span><span class="badge ok">${esc(v.classification || 'Indicative')}</span></div>
    <h4>${esc(p.grade || 'Product')}</h4>
    <div class="ometa">
      <div><small>Quantity</small><b class="mono">${esc(PMP.qtyText(v.quantity)) || '—'}</b></div>
      <div><small>Delivery</small><b>${esc(PMP.termText(d)) || '—'}</b></div>
      <div><small>Origin / location</small><b>${esc([p.origin, l.port || l.country].filter(Boolean).join(' · ')) || '—'}</b></div>
      <div><small>Availability</small><b>${esc(PMP.windowText(d)) || '—'}</b></div>
    </div>
    <div class="oexp">${ICONS.clock}<span>Expires <b>${esc(t.dubai)}</b>${t.same ? '' : `<br><small>Your time: ${esc(t.local)}</small>`}</span><span class="left mono">${days}d ${hrs}h</span></div>
    <div class="oact">
      <button class="btn2" data-act="buy">Request to buy</button>
      <button class="ib" data-act="view" aria-label="View offer and specification">${ICONS.spec}<span>Spec</span></button>
      <button class="ib" data-act="pdf" aria-label="View PDF">${ICONS.doc}<span>PDF</span></button>
      <button class="ib" data-act="ask" aria-label="Ask a question">${ICONS.chat}<span>Ask</span></button>
    </div></article>`;
}
function bindOfferCards(root) {
  const eb = root.querySelector('#emptyBuy'); if (eb) eb.onclick = () => startBuy(null);
  root.querySelectorAll('.ocard[data-oid]').forEach(c => {
    const id = c.dataset.oid;
    c.querySelectorAll('[data-act]').forEach(b => b.onclick = e => {
      e.stopPropagation();
      const o = PMP.findOffer(OFFERS, id), v = PMP.current(o);
      if (b.dataset.act === 'buy') startBuy({id, version: v.version});
      if (b.dataset.act === 'view') go('offer/' + id);
      if (b.dataset.act === 'pdf') offerPdf(o, v);
      if (b.dataset.act === 'ask') askQuestion(o, v);
    });
    c.onclick = () => go('offer/' + id);
  });
}
function askQuestion(o, v) {
  track('ask', o.id);
  const msg = `Question about PETROMAD offer ${o.id} v${v.version} (${(v.product || {}).grade || ''}): `;
  if (CONFIG.whatsappNumber && !/^9715000000/.test(CONFIG.whatsappNumber)) window.open(`https://wa.me/${CONFIG.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
  else location.href = `mailto:${CONFIG.receiverEmail}?subject=${encodeURIComponent('Question: ' + o.id + ' v' + v.version)}&body=${encodeURIComponent(msg)}`;
}

/* ============================================================
   OFFER DETAIL (also the target of expired links, T-06)
   ============================================================ */
function renderOffer(app) {
  $('#bar').hidden = true;
  if (!OFFERS) { app.innerHTML = `<div class="screen">${brandBar(true)}${skeleton()}</div>`; bindBrand(); loadOffers().then(() => render()); return; }
  const o = PMP.findOffer(OFFERS, CUR_OFFER);
  if (!o) { app.innerHTML = `<div class="screen">${brandBar(true)}<div class="empty">${ico('search')}<b>Offer not found</b><p>${esc(CUR_OFFER || '')} is not in the published list.</p><a class="btn2" href="#">See current offers</a></div></div>`; bindBrand(); return; }
  const s = PMP.offerState(o), ver = s.version, v = PMP.publicView(ver), active = s.state === 'ACTIVE';
  const t = PMP.dualTime(PMP.expiryOf(ver)), iss = PMP.dualTime(ver.issuedUtc);
  track('offer_view', o.id);
  app.innerHTML = `<div class="screen">
   ${brandBar(true)}
   <div class="ohero ${active ? '' : 'off'}">
     <div class="ohd"><span class="mono oid">${esc(o.id)} · v${v.version}</span><span class="badge ${active ? 'ok' : 'bad'}">${esc(PMP.STATE_TEXT[s.state] || s.state)}</span></div>
     <h1>${esc((v.product || {}).grade || 'Offer')}</h1>
     <p>${esc([PMP.qtyText(v.quantity), PMP.termText(v.delivery)].filter(Boolean).join(' · '))}</p>
     <dl class="times"><div><dt>Issued</dt><dd>${esc(iss.dubai)}</dd></div><div><dt>${active ? 'Expires' : 'Expired'}</dt><dd>${esc(t.dubai)}${t.same ? '' : `<small>Your time: ${esc(t.local)}</small>`}</dd></div></dl>
   </div>
   ${active ? '' : `<div class="gate hold"><b>${s.state === 'EXPIRED' ? 'This offer has expired.' : 'This offer is ' + esc((PMP.STATE_TEXT[s.state] || '').toLowerCase()) + '.'}</b> It can no longer receive requests. You can still send a general buying request.</div>`}
   ${PMP.recapSections(v, OFFERS).map(sec => `<section class="sum"><h3>${esc(sec.title)}</h3>
     ${sec.title === 'Procedure' ? `<ol class="steps">${sec.rows.map(r => `<li>${esc(r[1])}</li>`).join('')}</ol>`
       : `<dl class="kv">${sec.rows.map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>`}</section>`).join('')}
   ${specTable(v)}
   ${(v.attachments || []).length ? `<section class="sum"><h3>Attachments</h3>${v.attachments.map(a => `<a class="lrow sm" href="${esc(a.url)}" target="_blank" rel="noopener">${ico('doc')}<span><b>${esc(a.label)}</b></span>${ICONS.arrow}</a>`).join('')}</section>` : ''}
   ${v.hidden && v.hidden.length ? `<div class="tip">${ICONS.lock} ${esc(PMP.GATED_NOTE)}</div>` : ''}
   ${o.versions.length > 1 ? `<section class="sum"><h3>Revision history</h3><dl class="kv">${o.versions.slice().sort((a, b) => b.version - a.version).map(x => `<dt>v${x.version}</dt><dd>Issued ${esc(PMP.fmtTime(x.issuedUtc, PMP.DESK_TZ))}${x.version === ver.version ? ' (current)' : ' (superseded)'}</dd>`).join('')}</dl></section>` : ''}
   <p class="foot">${esc(PMP.NON_BINDING)}</p>
  </div>`;
  bindBrand();
  bar([{t: ICONS.doc, ghost: true, label: 'Download PDF', fn: () => offerPdf(o, ver)}, {t: active ? 'Request to buy' : 'Send a general request', fn: () => startBuy(active ? {id: o.id, version: ver.version} : null)}]);
}
function specTable(v) {
  const sp = v.spec || [];
  if (!sp.length) return '';
  return `<section class="sum"><h3>Specification annex</h3><div class="tscroll"><table class="spec"><thead><tr><th>Parameter</th><th>Unit</th><th>Method</th><th>Min</th><th>Max</th><th>Result</th></tr></thead>
    <tbody>${sp.map(x => `<tr><td>${esc(x.param)}</td><td>${esc(x.unit)}</td><td>${esc(x.method)}</td><td class="mono">${esc(x.min ?? '')}</td><td class="mono">${esc(x.max ?? '')}</td><td class="mono">${esc(x.result ?? '')}</td></tr>`).join('')}</tbody></table></div>
    <small class="hint">${esc([...new Set(sp.map(x => [x.sourceDate && 'Source ' + PMP.fmtDate(x.sourceDate), x.samplePoint && 'sample: ' + x.samplePoint, x.lab].filter(Boolean).join(', ')))].filter(Boolean).join(' | '))}</small></section>`;
}

/* ============================================================
   PDF (generated from the same approved structured data)
   ============================================================ */
function pdfDoc() {
  const {jsPDF} = window.jspdf, pdf = new jsPDF({unit: 'pt', format: 'a4'});
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight(), M = 46;
  const ctx = {pdf, W, H, M, y: 0};
  ctx.head = (title, right) => {
    pdf.setFillColor(8, 13, 26); pdf.rect(0, 0, W, 78, 'F');
    pdf.setFillColor(232, 155, 30); pdf.rect(0, 78, W, 3, 'F');
    pdf.setTextColor(255, 255, 255); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(20); pdf.text('PETROMAD', M, 42);
    pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor(170, 182, 204); pdf.text('WEEKLY PHYSICAL PETROLEUM OFFERS', M, 58);
    pdf.setTextColor(255, 255, 255); pdf.setFontSize(10); pdf.text(right || '', W - M, 42, {align: 'right'});
    pdf.setTextColor(20, 24, 33); pdf.setFont('helvetica', 'bold'); pdf.setFontSize(15); pdf.text(title, M, 112);
    ctx.y = 130;
  };
  ctx.need = h => { if (ctx.y + h > H - 60) { ctx.foot(); pdf.addPage(); ctx.y = 50; } };
  ctx.foot = () => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(7.5); pdf.setTextColor(120, 128, 140);
    pdf.text('PETROMAD · ' + (ctx.footText || '') + ' · Page ' + pdf.internal.getNumberOfPages(), M, H - 26); };
  ctx.section = t => { ctx.need(40); pdf.setFillColor(238, 241, 246); pdf.rect(M, ctx.y, W - 2 * M, 20, 'F');
    pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9.5); pdf.setTextColor(150, 92, 0); pdf.text(t.toUpperCase(), M + 8, ctx.y + 13.5); ctx.y += 28; };
  ctx.row = (k, v) => {
    pdf.setFontSize(9.5); const lines = pdf.splitTextToSize(String(v), W - 2 * M - 170);
    ctx.need(lines.length * 12 + 6);
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(100, 108, 122); pdf.text(String(k), M + 8, ctx.y);
    pdf.setFont('helvetica', 'bold'); pdf.setTextColor(20, 24, 33); pdf.text(lines, M + 170, ctx.y);
    ctx.y += lines.length * 12 + 6;
  };
  ctx.para = (t, size, color) => { pdf.setFont('helvetica', 'normal'); pdf.setFontSize(size || 9); pdf.setTextColor.apply(pdf, color || [70, 78, 92]);
    const lines = pdf.splitTextToSize(String(t), W - 2 * M); ctx.need(lines.length * (size || 9) * 1.3 + 6); pdf.text(lines, M, ctx.y); ctx.y += lines.length * (size || 9) * 1.3 + 6; };
  return ctx;
}
const ascii = s => String(s == null ? '' : s).replace(/[→]/g, '->').replace(/[≤]/g, '<=').replace(/[≥]/g, '>=').replace(/[^\x00-\xFF–—‘’“”•›…]/g, '');
function offerPdfDoc(o, ver, opts) {
  opts = opts || {};
  const v = PMP.publicView(ver, {authorisedPrice: !!opts.internal}), c = pdfDoc(), {pdf} = c;
  const exp = PMP.expiryOf(ver), st = opts.preview ? 'PREVIEW - NOT PUBLISHED' : PMP.STATE_TEXT[PMP.offerState(o).state];
  c.footText = o.id + ' v' + v.version + ' · generated ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  c.head('COMMERCIAL OFFER RECAP', ascii(o.id + '  ·  v' + v.version));
  c.row('Offer reference', o.id); c.row('Version', 'v' + v.version + (v.replaces ? ' (replaces v' + v.replaces + ')' : ''));
  c.row('Published', ascii(PMP.fmtTime(ver.issuedUtc, PMP.DESK_TZ) + '  /  ' + new Date(ver.issuedUtc).toISOString().slice(0, 16).replace('T', ' ') + ' UTC'));
  c.row('Expires', ascii(PMP.fmtTime(exp, PMP.DESK_TZ) + '  /  ' + exp.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'));
  c.row('Status', ascii(st)); c.y += 6;
  PMP.recapSections(v, OFFERS).forEach(sec => {
    c.section(sec.title);
    if (sec.title === 'Procedure') sec.rows.forEach(r => c.row(r[0] + '.', ascii(r[1])));
    else sec.rows.forEach(r => c.row(ascii(r[0]), ascii(r[1])));
  });
  c.section('Request to purchase');
  c.para(ascii('Use the PETROMAD buyer form: ' + location.origin + location.pathname + '#buy/' + o.id + '/' + v.version + '  (offer ID and version are pre-filled).'));
  c.section('Important conditions');
  c.para(ascii(PMP.NON_BINDING));
  if (v.hidden && v.hidden.length) c.para(ascii(PMP.GATED_NOTE));
  if ((v.spec || []).length) {
    c.foot(); pdf.addPage(); c.y = 50; c.section('Annex 1 - Specification');
    const cols = [['Parameter', 150], ['Unit', 60], ['Method', 95], ['Min', 50], ['Max', 50], ['Result', 50]];
    let x = c.M + 8; pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8.5); pdf.setTextColor(100, 108, 122);
    cols.forEach(([h, w]) => { pdf.text(h, x, c.y); x += w; }); c.y += 14;
    pdf.setFont('helvetica', 'normal'); pdf.setTextColor(20, 24, 33);
    v.spec.forEach(s => { c.need(14); x = c.M + 8; [s.param, s.unit, s.method, s.min, s.max, s.result].forEach((val, i) => { pdf.text(ascii(val == null ? '' : val).slice(0, 34), x, c.y); x += cols[i][1]; }); c.y += 13; });
    c.y += 6; c.para(ascii('Sources: ' + [...new Set(v.spec.map(s => [s.sourceDate, s.samplePoint, s.tank, s.lab].filter(Boolean).join(' / ')))].join('; ')), 8);
  }
  c.foot();
  return pdf;
}
function offerPdf(o, ver, opts) {
  track('offer_pdf', o.id);
  try { const pdf = offerPdfDoc(o, ver, opts); saveBlob(pdf.output('blob'), o.id + '-v' + ver.version + '.pdf'); }
  catch (e) { console.warn(e); toast('Could not make the PDF on this device.'); }
}
function weeklyPdf() {
  const list = PMP.activeOffers(OFFERS), w = week(), c = pdfDoc();
  c.footText = 'Week ' + w.week + ' ' + w.year + ' index · generated ' + new Date().toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  c.head('AVAILABLE CARGOES - WEEK ' + w.week, w.year + '');
  list.forEach(x => {
    const v = PMP.publicView(x.version);
    c.section(x.offer.id + ' · v' + v.version);
    c.row('Product / grade', ascii((v.product || {}).grade)); c.row('Quantity', ascii(PMP.qtyText(v.quantity)));
    c.row('Delivery', ascii(PMP.termText(v.delivery))); c.row('Availability', ascii(PMP.windowText(v.delivery)));
    c.row('Expires', ascii(PMP.fmtTime(x.expires, PMP.DESK_TZ)));
  });
  c.section('Important conditions'); c.para(ascii(PMP.NON_BINDING)); c.foot();
  saveBlob(c.pdf.output('blob'), 'PETROMAD-W' + w.week + '-' + w.year + '.pdf');
}

/* ============================================================
   FORM RENDERER (buyer form + offer builder)
   ============================================================ */
const DKV = "Don't know";
function fieldHTML(f, A) {
  const v = A[f.id];
  const lab = `<div class="qh"><label for="f_${f.id}">${esc(f.label)}${f.req ? ' <i class="req">*</i>' : ''}</label>${f.hint ? `<span class="hint">${esc(f.hint)}</span>` : ''}</div>`;
  const ph = esc(f.ph || '');
  if (f.type === 'heading') {
    return `<div class="mod"><div class="modh">${ico(f.icon || 'list')}<div><b>${esc(f.label)}</b>${f.hint ? `<small>${esc(f.hint)}</small>` : ''}</div></div>
      ${f.na ? `<label class="na"><input type="checkbox" data-c="${f.na}" ${A[f.na] ? 'checked' : ''}> Not applicable / not personally involved</label>` : ''}</div>`;
  }
  if (f.type === 'note') return `<div class="tip ${f.warn ? 'warn' : ''}">${f.warn ? ICONS.shield : ICONS.info}<span>${f.html || esc(f.label)}</span></div>`;
  if (f.type === 'locked') return `<div class="q locked">${lab}<div class="lockv">${ICONS.lock}<b>${esc(f.value(A))}</b></div></div>`;
  let body = '';
  const opts = typeof f.options === 'function' ? f.options(A) : f.options;
  if (f.type === 'chips' || f.type === 'multi') {
    const sel = f.type === 'multi' ? arrOf(v) : v;
    const on = o => f.type === 'multi' ? sel.includes(o) : sel === o;
    body = `<div class="chips" role="group" aria-label="${esc(f.label)}">${opts.map(o => `<button type="button" class="chip ${on(o) ? 'on' : ''}" aria-pressed="${on(o)}" data-f="${f.id}" data-o="${esc(o)}">${esc(o)}</button>`).join('')}</div>
      ${f.other && on('Other') ? `<input class="f mt8" data-t="${f.id}_other" placeholder="Type it" value="${esc(A[f.id + '_other'])}">` : ''}`;
  } else if (f.type === 'textarea') body = `<textarea class="f" id="f_${f.id}" data-t="${f.id}" placeholder="${ph}">${esc(v)}</textarea>`;
  else if (f.type === 'check') body = `<label class="ck2"><input type="checkbox" id="f_${f.id}" data-c="${f.id}" ${v ? 'checked' : ''}><span>${f.text}</span></label>`;
  else if (f.type === 'files') {
    const L = BFILES[f.id] || [];
    body = `<label class="files">${ICONS.sell}<b>${esc(f.btn || 'Add files')}</b><small>${esc(f.accept === '.pdf' ? 'PDF only' : 'PDF or images')} · max 8 MB each</small><input type="file" hidden multiple data-file="${f.id}" accept="${f.accept || '.pdf,image/*'}"></label>
      <div class="flist">${L.map((x, i) => `<div><span>${esc(x.name)}</span><small>${(x.size / 1048576).toFixed(1)} MB</small><button type="button" data-rmf="${f.id}:${i}" aria-label="Remove ${esc(x.name)}">✕</button></div>`).join('')}</div>`;
  } else if (f.type === 'params') {
    const rows = Array.isArray(v) && v.length ? v : [{}];
    body = `<div class="params">${rows.map((r, i) => `<div class="prm">${['test', 'method', 'min', 'max', 'unit'].map(k => `<input class="f" aria-label="${k}" placeholder="${{test: 'Test e.g. Sulphur', method: 'Method e.g. ISO 20846', min: 'Min', max: 'Max', unit: 'Unit'}[k]}" data-prm="${f.id}:${i}:${k}" value="${esc(r[k])}">`).join('')}</div>`).join('')}
      <button type="button" class="lnk" data-addprm="${f.id}">${ICONS.plus} Add parameter</button></div>`;
  } else {
    const type = {num: 'text', email: 'email', tel: 'tel', date: 'date', month: 'month', datetime: 'datetime-local'}[f.type] || 'text';
    const im = {num: 'decimal', tel: 'tel', email: 'email'}[f.type] || 'text';
    body = `<input class="f ${f.type === 'num' ? 'mono' : ''}" id="f_${f.id}" type="${type}" inputmode="${im}" data-t="${f.id}" value="${esc(v)}" placeholder="${ph}" autocomplete="${f.ac || 'off'}">`;
  }
  return `<div class="q" data-q="${f.id}">${lab}${body}<div class="ferr" id="e_${f.id}"></div></div>`;
}
function drawForm(box, fields, A, redraw, onSave) {
  const vis = fields.filter(f => !f.show || f.show(A));
  box.innerHTML = vis.map(f => fieldHTML(f, A)).join('');
  box.querySelectorAll('[data-f]').forEach(b => b.onclick = () => {
    const f = fields.find(x => x.id === b.dataset.f), o = b.dataset.o;
    if (f.type === 'multi') { const a = arrOf(A[f.id]); A[f.id] = a.includes(o) ? a.filter(x => x !== o) : a.concat(o); }
    else A[f.id] = A[f.id] === o ? '' : o;
    onSave(); redraw();
  });
  box.querySelectorAll('[data-t]').forEach(i => i.oninput = () => { A[i.dataset.t] = i.value; onSave(); });
  box.querySelectorAll('input[data-t][type=date],input[data-t][type=month]').forEach(i => i.onchange = () => { A[i.dataset.t] = i.value; onSave(); redraw(); });
  box.querySelectorAll('[data-c]').forEach(i => i.onchange = () => { A[i.dataset.c] = i.checked; onSave(); redraw(); });
  box.querySelectorAll('[data-prm]').forEach(i => i.oninput = () => {
    const [id, n, k] = i.dataset.prm.split(':'); A[id] = Array.isArray(A[id]) ? A[id] : [{}]; A[id][n] = A[id][n] || {}; A[id][n][k] = i.value; onSave(); });
  box.querySelectorAll('[data-addprm]').forEach(b => b.onclick = () => { const id = b.dataset.addprm; A[id] = (Array.isArray(A[id]) && A[id].length ? A[id] : [{}]).concat({}); onSave(); redraw(); });
  box.querySelectorAll('[data-file]').forEach(fi => fi.onchange = () => {
    const id = fi.dataset.file; BFILES[id] = BFILES[id] || [];
    for (const f of fi.files) {
      if (f.size > 8 * 1048576) { toast(f.name + ' is over 8 MB'); continue; }
      if (fi.accept === '.pdf' && !/pdf$/i.test(f.type || f.name)) { toast(f.name + ' is not a PDF'); continue; }
      if (!/pdf$|^image\//i.test(f.type || '') && !/\.(pdf|jpe?g|png)$/i.test(f.name)) { toast(f.name + ': only PDF or images'); continue; }
      if (BFILES[id].length >= 5) { toast('Maximum 5 files'); break; }
      BFILES[id].push(f);
    }
    A[id + '_n'] = BFILES[id].length; onSave(); redraw();
  });
  box.querySelectorAll('[data-rmf]').forEach(b => b.onclick = () => { const [id, i] = b.dataset.rmf.split(':'); BFILES[id].splice(+i, 1); A[id + '_n'] = BFILES[id].length; onSave(); redraw(); });
  return vis;
}
function validate(vis, A) {
  const bad = [];
  document.querySelectorAll('.ferr').forEach(e => e.textContent = '');
  vis.forEach(f => {
    let msg = '';
    const v = A[f.id];
    if (f.req && (f.type === 'check' ? !v : !hasD(typeof v === 'string' ? v.trim() : v))) msg = f.type === 'check' ? 'Please tick to continue.' : 'Required.';
    else if (f.type === 'email' && hasD(v) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) msg = 'Enter a valid email address.';
    else if (f.type === 'num' && hasD(v) && !/^\s*\d[\d,]*(\.\d+)?\s*$/.test(v)) msg = 'Numbers only.';
    else if (f.check) msg = f.check(v, A) || '';
    if (msg) { bad.push(f); const e = document.getElementById('e_' + f.id); if (e) e.textContent = msg; }
  });
  if (bad.length) { const q = document.querySelector(`[data-q="${bad[0].id}"]`); if (q) q.scrollIntoView({behavior: 'smooth', block: 'center'}); }
  return !bad.length;
}
/** IMO number: 7 digits, last digit = sum(d_i × (7−i)) mod 10. */
function imoValid(s) {
  const m = String(s || '').replace(/\D/g, ''); if (m.length !== 7) return false;
  const sum = [...m.slice(0, 6)].reduce((t, d, i) => t + Number(d) * (7 - i), 0);
  return sum % 10 === Number(m[6]);
}

/* ============================================================
   BUYER ROUTE — three-layer funnel (brief §2–§7, Field Dictionary)
   ============================================================ */
const FAMILIES = ['Crude & feedstocks', 'Middle distillates', 'Light ends', 'Marine & heavy fuels', 'Bitumen', 'Base oils', 'Chemicals & other', 'Gas (LPG / LNG)'];
const ACTS = ['Past physical trades', 'Chartering / vessel management', 'Ship-to-ship (STS)', 'FOB / CFR / CIF / EXW operations', 'Blending', 'Refinery procurement / operations', 'None of these – I introduce or broker'];
const BUCKETS = ['<1,000', '1,000–4,999', '5,000–9,999', '10,000–29,999', '30,000–59,999', '60,000–99,999', '100,000+'];
const TERMS = ['FOB', 'CFR', 'CIF', 'FCA', 'EXW', 'DAP', 'Ex-tank (defined in contract)', 'STS (defined in contract)'];
const VCLASS = {'Coastal / GP / Handy': ['Coastal', 'General purpose (GP)', 'Handysize'], 'Product tanker': ['MR1', 'MR2', 'LR1', 'LR2'],
  'Crude tanker': ['Aframax', 'Suezmax', 'VLCC', 'ULCC'], 'Chemical / specialised': ['IMO type 2', 'IMO type 3', 'Stainless steel', 'Coated', 'Heated bitumen carrier'],
  'LPG / LNG gas carrier': ['VLGC', 'LGC', 'MGC', 'Small LPG carrier', 'LNG carrier']};
const isGasV = A => A.vs_family === 'LPG / LNG gas carrier';
const acts = A => arrOf(A.acts);
const act = (A, a, na) => acts(A).includes(a) && !A[na];
const famHas = (A, f) => arrOf(A.family).includes(f) || new RegExp(f === 'Bitumen' ? 'bitumen' : 'fuel oil|hsfo|vlsfo|ifo|mazut', 'i').test((A.grade || '') + ' ' + (A.sts_product || ''));
const WHO = ['Mother vessel', 'Daughter vessel', 'STS service provider', 'Not sure'];

const BUY_STAGES = [
 {key: 'contact', title: 'Contact & intent', time: '60–90 seconds', text: 'Who you are and what you are looking for. No passports, bank statements or ownership documents at this stage.', fields: [
  {id: 'offer_lock', type: 'locked', label: 'Responding to offer', show: () => !!B.offer, value: () => B.offer.id + ' · v' + B.offer.version},
  {id: 'company', label: 'Company trading name', req: true, ac: 'organization', dict: 'identity_company_trading_name'},
  {id: 'hq', label: 'Headquarters country', req: true, ac: 'country-name', dict: 'identity_business_country_hq'},
  {id: 'website', label: 'Company website', hint: 'if any', ph: 'https://', ac: 'url', dict: 'identity_company_website_if_any'},
  {id: 'cname', label: 'Your name', req: true, ac: 'name', dict: 'identity_contact_name'},
  {id: 'position', label: 'Your position', type: 'chips', req: true, options: ['Owner / director', 'Trading manager', 'Trader', 'Procurement', 'Operations', 'Broker / agent', 'Other'], dict: 'identity_contact_position'},
  {id: 'email', label: 'Business email', type: 'email', req: true, ac: 'email', hint: 'we send a verification code', dict: 'identity_corporate_email'},
  {id: 'phone', label: 'WhatsApp / telephone', type: 'tel', req: true, ac: 'tel', dict: 'identity_whatsapp_telephone'},
  {id: 'role', label: 'Your role in this deal', type: 'chips', req: true, other: true, options: ['End buyer', 'Principal trading house', 'Reseller', 'Authorised mandate', 'Broker', 'Other'], hint: 'brokers are welcome, please say so', dict: 'identity_role_in_proposed_deal'},
  {id: 'authorised', label: 'Are you authorised to discuss and decide on this trade?', type: 'chips', req: true, options: ['Yes', 'Joint', 'No', 'Unknown'], dict: 'identity_authorised_decision_maker'},
  {id: 'family', label: 'Product family', type: 'multi', req: true, options: FAMILIES, dict: 'buyer_intent_product_category'},
  {id: 'interest', label: 'Product / grade of interest', ph: 'e.g. Jet A-1, EN 590 10 ppm, VLSFO 0.5%'},
  {id: 'qty0', label: 'Intended quantity', ph: 'e.g. 5,000 MT per month'},
  {id: 'dest0', label: 'Destination', ph: 'Country / port'},
  {id: 'hp', type: 'text', label: 'Leave this empty', show: () => false},
  {id: 'consent', type: 'check', req: true, label: 'Consent', dict: 'identity_contact_permission_and_privacy_consent',
   text: 'PETROMAD may contact me about this request and store my answers for qualification. I have read the <a href="#how" target="_blank">privacy notice</a>. My data is not sold.'}
 ]},
 {key: 'requirement', title: 'Buying requirement', time: '3–5 minutes', text: 'The real demand. Separate must-have specification parameters from preferences.', fields: [
  {id: 'grade', label: 'Exact grade / trade name', req: true, dict: 'buyer_intent_exact_grade_trade_name'},
  {id: 'standard', label: 'Specification standard', type: 'chips', other: true, options: ['EN 590', 'ASTM D975', 'DEF STAN 91-091 / AFQRJOS', 'ASTM D1655', 'ISO 8217', 'EN 12591', 'ASTM D946', 'GOST', 'Buyer specification appendix', 'Other'], dict: 'buyer_intent_specification_standard'},
  {id: 'specfile', type: 'files', accept: '.pdf', label: 'Specification document', hint: 'optional', btn: 'Attach spec PDF', dict: 'buyer_intent_specification_document'},
  {id: 'musthave', type: 'params', label: 'Must-meet parameters', hint: 'test, method, limit, unit', dict: 'buyer_intent_must_meet_specification_parameters'},
  {id: 'prefs', type: 'textarea', label: 'Preferences (nice to have)', ph: 'Things you prefer but would discuss'},
  {id: 'qmin', type: 'num', label: 'Quantity minimum', req: true, dict: 'buyer_intent_requested_quantity_minimum'},
  {id: 'qmax', type: 'num', label: 'Quantity maximum', dict: 'buyer_intent_requested_quantity_maximum', check: (v, A) => hasD(v) && hasD(A.qmin) && parseFloat(String(v).replace(/,/g, '')) < parseFloat(String(A.qmin).replace(/,/g, '')) ? 'Maximum is below the minimum.' : ''},
  {id: 'qunit', type: 'chips', label: 'Quantity unit', req: true, options: ['MT', 'BBL', 'm³'], hint: 'we never convert units without density and temperature', dict: 'buyer_intent_quantity_unit'},
  {id: 'lifting', type: 'chips', label: 'One-off or programme', options: ['One-off lifting', 'Recurring programme'], dict: 'buyer_intent_one_off_or_recurring_programme'},
  {id: 'liftings', type: 'num', label: 'Liftings per month', show: A => A.lifting === 'Recurring programme', dict: 'buyer_intent_monthly_liftings_number_of_parcels'},
  {id: 'win_from', type: 'date', label: 'Target window from', dict: 'buyer_intent_target_laycan_delivery_window'},
  {id: 'win_to', type: 'date', label: 'Target window to', check: (v, A) => hasD(v) && hasD(A.win_from) && v < A.win_from ? 'Ends before it starts.' : ''},
  {id: 'origin_pref', label: 'Preferred origin', ph: 'optional'},
  {id: 'origin_restrict', label: 'Excluded origins', ph: 'optional', dict: 'buyer_intent_preferred_origin_excluded_origins'},
  {id: 'basis', type: 'chips', label: 'Delivery basis', req: true, options: TERMS, dict: 'buyer_intent_delivery_risk_term'},
  {id: 'place', label: 'Named port / place', req: true, ph: 'e.g. FOB Fujairah, CIF Genoa', dict: 'buyer_intent_named_delivery_point'},
  {id: 'extank_def', type: 'textarea', label: 'Define the delivery point', hint: 'terminal, transfer point, title and risk', show: A => /defined in contract/.test(A.basis || '')},
  {id: 'note_exw', type: 'note', label: 'EXW: for international exports FCA is often more workable, because the seller clears export and loads at the named point.', show: A => A.basis === 'EXW'},
  {id: 'loadport', label: 'Loading location', ph: 'if known'},
  {id: 'discharge', label: 'Destination country and discharge port', dict: 'buyer_intent_destination_country_and_port'},
  {id: 'recv_mode', type: 'chips', label: 'How you receive the product', options: ['Vessel', 'Terminal', 'Truck', 'Barge', 'Pipeline', 'STS'], dict: 'buyer_intent_receiving_mode'},
  {id: 'receiving', type: 'chips', label: 'Receiving vessel / facility', options: ['Available', 'To be nominated', 'Buyer not responsible']},
  {id: 'recv_status', type: 'chips', label: 'Receiving tank or terminal', options: ['Own', 'Leased', 'Nominated', 'Not arranged yet'], dict: 'buyer_intent_receiving_tank_or_terminal_status'},
  {id: 'recv_cap', label: 'Capacity and limits', hint: 'optional', ph: 'e.g. 10,000 m³ tank, max draft 11 m'},
  {id: 'price_method', type: 'chips', label: 'Pricing method', options: ['Fixed price', 'Formula / index', 'Negotiable'], dict: 'buyer_intent_price_preference'},
  {id: 'index_name', label: 'Index and assessment basis', ph: 'e.g. Platts Jet CIF NWE cargoes, B/L month average', show: A => A.price_method === 'Formula / index', dict: 'buyer_intent_pricing_index_assessment_basis'},
  {id: 'assess_window', label: 'Quotation period', ph: 'e.g. 5 quotes after B/L', show: A => A.price_method === 'Formula / index'},
  {id: 'differential', label: 'Differential and unit', ph: 'e.g. +$12/MT', show: A => A.price_method === 'Formula / index', dict: 'buyer_intent_pricing_differential_and_unit'},
  {id: 'payment', type: 'multi', label: 'Payment instruments you can use', options: ['LC', 'SBLC', 'CAD', 'TT', 'Other'], hint: 'we do not ask for balances or credit limits', dict: 'buyer_intent_payment_method_acceptable'},
  {id: 'payer', type: 'chips', label: 'Who would pay?', options: ["Contracting company's own account", 'Related or third-party account', 'Not decided yet']},
  {id: 'ttc', type: 'chips', label: 'Expected time to contract', options: ['Within 1 week', '2–4 weeks', '1–3 months', 'Exploring'], dict: 'buyer_intent_expected_time_to_contract'},
  {id: 'deviations', type: 'textarea', label: 'Deviations from the published offer', hint: 'quantity, timing, spec, term…', show: () => !!B.offer},
  {id: 'special', type: 'textarea', label: 'Special conditions', hint: 'optional', dict: 'buyer_intent_special_deal_conditions'}
 ]},
 {key: 'experience', title: 'Operating experience', time: 'only what applies', optional: true, text: 'Pick what you have actually done. Only those sections open. "Not applicable" is a normal answer and never counts against you.', fields: [
  {id: 'acts', type: 'multi', label: 'What have you personally been involved in?', options: ACTS},
  // Track record
  {id: 'h_tr', type: 'heading', icon: 'chart', label: 'Track record', hint: 'last 24 months', na: 'na_tr', show: A => acts(A).includes(ACTS[0])},
  ...[
   {id: 'tr_count', type: 'chips', label: 'Completed physical petroleum transactions you took part in', options: ['0', '1–2', '3–5', '6–15', '16+', 'Prefer not to state'], dict: 'trade_experience_physical_petroleum_trades_completed'},
   {id: 'tr_caps', type: 'multi', label: 'In what capacity?', options: ['Principal buyer', 'Principal seller', 'Cargo owner', 'Voyage / time charterer', 'Terminal operator', 'Refinery operator', 'Mandate', 'Introducing broker', 'Agent'], dict: 'trade_experience_actual_role_on_previous_deals'},
   {id: 'tr_primary', type: 'chips', label: 'Your PRIMARY role', options: ['Principal buyer', 'Principal seller', 'Cargo owner', 'Charterer', 'Terminal / refinery operator', 'Mandate', 'Broker / agent']},
   {id: 'tr_families', type: 'multi', label: 'Product families traded', options: FAMILIES, dict: 'trade_experience_product_families_traded'},
   {id: 'tr_largest', type: 'chips', label: 'Largest individual parcel actually traded (MT)', options: BUCKETS, dict: 'trade_experience_largest_individual_parcel_bucket'},
   {id: 'tr_typical', type: 'chips', label: 'Typical parcel size (MT)', options: BUCKETS, dict: 'trade_experience_typical_transaction_size_bucket'},
   {id: 'tr_annual', type: 'chips', label: 'Annual physical throughput (MT)', options: ['0', '<10k', '10k–100k', '100k–500k', '>500k'], dict: 'trade_experience_annual_throughput_bracket'},
   {id: 'tr_recent', type: 'month', label: 'Most recent physical lifting', dict: 'trade_experience_most_recent_physical_lifting_date'},
   {id: 'tr_regions', label: 'Trade routes / regions', ph: 'e.g. Med → West Africa', dict: 'trade_experience_geographic_routes_trading_regions'},
   {id: 'note_ex', type: 'note', label: 'Give ONE completed transaction example. Approximate figures are fine; no counterparty names needed.'},
   {id: 'ex_month', type: 'month', label: 'Month / year', dict: 'trade_experience_year_month_of_example_trade'},
   {id: 'ex_product', label: 'Product / grade', dict: 'trade_experience_product_grade_in_example_trade'},
   {id: 'ex_mt', type: 'num', label: 'Approximate quantity (MT)', dict: 'trade_experience_parcel_quantity_on_example_trade'},
   {id: 'ex_load', label: 'Loading region / port', dict: 'trade_experience_loading_port_worked_example'},
   {id: 'ex_dis', label: 'Discharge region / port', dict: 'trade_experience_discharge_port_worked_example'},
   {id: 'ex_term', type: 'chips', label: 'Agreed Incoterm', options: ['FOB', 'CFR', 'CIF', 'FCA', 'EXW', 'DAP', 'Ex-tank', 'Other'], dict: 'trade_experience_incoterm_on_example_trade'},
   {id: 'ex_managed', type: 'textarea', label: 'What you personally managed', dict: 'trade_experience_example_trade_role_and_responsibilities'},
   {id: 'tr_evid', type: 'multi', label: 'Redacted completion evidence you could share later', options: ['B/L', 'COQ', 'NOR / SOF', 'Invoice', 'Inspection certificate', 'Other', 'None'], dict: 'trade_experience_redacted_completion_evidence_available'},
   {id: 'tr_ref', type: 'chips', label: 'Can PETROMAD speak to a permitted industry reference later?', options: ['Yes', 'No', 'At next stage'], hint: 'we never contact anyone without your consent', dict: 'trade_experience_trade_references_with_permission'}
  ].map(f => Object.assign(f, {show: A => act(A, ACTS[0], 'na_tr')})),
  // Vessel
  {id: 'h_vs', type: 'heading', icon: 'ship', label: 'Vessel & chartering', na: 'na_vs', show: A => acts(A).includes(ACTS[1])},
  ...[
   {id: 'vs_managed', type: 'chips', label: 'Did you personally manage vessel logistics?', options: ['Yes, directly', 'Coordinated', 'Brokered', 'No'], dict: 'vessel_chartering_personally_managed_vessel_logistics'},
   {id: 'vs_family', type: 'chips', label: 'A) Vessel category you used / nominated / chartered', options: Object.keys(VCLASS), dict: 'vessel_chartering_vessel_families_handled'},
   {id: 'vs_class', type: 'chips', label: 'Segment', options: A => VCLASS[A.vs_family] || [], show2: A => !!A.vs_family, dict: 'vessel_chartering_largest_vessel_segment'},
   {id: 'vs_dwt', type: 'num', label: 'Vessel deadweight (DWT)', hint: 'carrying capacity, not cargo', show2: A => A.vs_family && !isGasV(A), dict: 'vessel_chartering_largest_vessel_deadweight_dwt'},
   {id: 'vs_cbm', type: 'num', label: 'Gas carrier capacity (m³)', show2: A => isGasV(A)},
   {id: 'vs_parcel', type: 'num', label: 'B) Actual cargo parcel lifted', dict: 'vessel_chartering_largest_cargo_parcel_actually_lifted_mt'},
   {id: 'vs_parcel_unit', type: 'chips', label: 'Parcel unit', options: A => isGasV(A) ? ['m³', 'MT'] : ['MT', 'm³']},
   {id: 'vs_role', type: 'chips', label: 'Your role on the vessel', options: ['Owner', 'Disponent owner', 'Time charterer', 'Voyage charterer', 'Cargo interest', 'Broker'], dict: 'vessel_chartering_vessel_ownership_chartering_role'},
   {id: 'vs_imo', label: 'Vessel name and IMO', hint: 'optional', check: v => { const m = String(v || '').match(/\b\d{7}\b/); return m && !imoValid(m[0]) ? 'That IMO number fails the check digit.' : ''; }, dict: 'vessel_chartering_vessel_name_and_imo_number_optional'},
   {id: 'vs_q88', type: 'chips', label: 'Q88 / HVPQ used for nomination?', options: ['Yes', 'No', 'Not sure'], dict: 'vessel_chartering_q88_hvpq_used_for_nomination'},
   {id: 'vs_nomination', type: 'textarea', label: 'Describe the last vessel nomination', hint: 'who nominated, who vetted, previous cargo / tank checks, draft / LOA', dict: 'vessel_chartering_sire_2_0_terminal_vetting_process'},
   {id: 'vs_laytime', type: 'textarea', label: 'A laycan, NOR and Statement of Facts example', hint: 'who handled laytime / demurrage', dict: 'vessel_chartering_nor_tendering_understanding'},
   {id: 'vs_rate', type: 'num', label: 'Actual loading / discharge rate (m³/h)', hint: 'for one real operation', dict: 'vessel_chartering_pumping_rate_in_m3_h_for_actual_operation'},
   {id: 'vs_bar', type: 'num', label: 'Manifold pressure (bar)', dict: 'vessel_chartering_max_manifold_pressure_used_bar'},
   {id: 'vs_context', label: 'Vessel / product / context of those figures'},
   {id: 'vs_qq', type: 'textarea', label: 'How were B/L, shore / ship figures, ROB / OBQ and temperature corrections reconciled?', dict: 'vessel_chartering_cargo_volume_density_temperature_basis'}
  ].map(f => Object.assign(f, {show: A => act(A, ACTS[1], 'na_vs') && A.vs_managed !== 'No' && (!f.show2 || f.show2(A))})),
  // STS
  {id: 'h_sts', type: 'heading', icon: 'ship', label: 'Ship-to-ship (STS)', hint: 'planning, safety, equipment, documents', na: 'na_sts', show: A => acts(A).includes(ACTS[2])},
  ...[
   {id: 'sts_involve', type: 'chips', label: 'Your involvement', options: ['Observed', 'Brokered / arranged', 'Personally executed'], dict: 'sts_sts_experience'},
   {id: 'sts_count', type: 'num', label: 'Number of STS transfers', dict: 'sts_number_of_sts_transfers_completed'},
   {id: 'sts_loc', label: 'Location / anchorage', dict: 'sts_sts_location_anchorage_port'},
   {id: 'sts_product', label: 'Cargo product and grade', dict: 'sts_cargo_product_and_grade_on_sts'},
   {id: 'sts_ship', type: 'chips', label: 'Your ship', options: ['Mother / constant heading', 'Daughter / manoeuvring', 'Both', 'Neither'], dict: 'sts_mother_or_daughter_vessel_role'},
   {id: 'sts_mode', type: 'chips', label: 'Operation mode', options: ['Alongside berth', 'At anchor', 'Underway']},
   {id: 'sts_poac', type: 'textarea', label: 'Who nominated the STS provider / POAC, got permissions and agreed the Joint Plan of Operations?', dict: 'sts_joint_plan_of_operations_knowledge'},
   {id: 'sts_compat', type: 'textarea', label: 'Compatibility data checked between the vessels', hint: 'LOA, DWT, freeboard, manifolds', dict: 'sts_compatibility_data_between_vessels'},
   {id: 'sts_fender_by', type: 'chips', label: 'Who supplied primary / secondary fenders?', options: WHO},
   {id: 'sts_fenders', type: 'textarea', label: 'Fender type, size, certification and who verified them', dict: 'sts_primary_secondary_fender_provider_and_specs'},
   {id: 'sts_hose_by', type: 'chips', label: 'Who supplied the cargo hose string?', options: WHO},
   {id: 'sts_hose', type: 'textarea', label: 'Hose length / diameter, material, rated pressure and temperature, certificates', dict: 'sts_hose_supplier_and_specifications'},
   {id: 'sts_manifold', label: 'Manifold size and flange standard', dict: 'sts_manifold_size_and_flange_standard'},
   {id: 'sts_temp', type: 'num', label: 'Actual operating temperature (°C)', hint: 'from the real operation', dict: 'sts_cargo_loading_discharge_temperature_c'},
   {id: 'sts_visc', label: 'Viscosity at reference temperature', ph: 'e.g. 380 cSt at 50 °C', dict: 'sts_cargo_viscosity_at_reference_temperature'},
   {id: 'sts_rate', type: 'num', label: 'Actual transfer rate (m³/h)', dict: 'sts_actual_transfer_rate_m3_h'},
   {id: 'sts_bar', type: 'num', label: 'Line / manifold pressure (bar)', dict: 'sts_actual_line_pressure_bar'},
   {id: 'sts_weather', type: 'textarea', label: 'Approved weather / swell / wind / visibility envelope', dict: 'sts_agreed_weather_swell_limits'},
   {id: 'sts_emerg', type: 'textarea', label: 'Communications, emergency stop, spill response, stop-work authority', dict: 'sts_emergency_stop_communications_spill_response'},
   {id: 'sts_qq', type: 'textarea', label: 'Q&Q measurement, sampling, line contents, ROB, completion certificates', dict: 'sts_cargo_measurement_and_rob_procedure'},
   {id: 'note_bit', type: 'note', label: 'Bitumen: give the grade and supplier handling data. There is no universal bitumen transfer temperature.', show2: A => famHas(A, 'Bitumen')},
   {id: 'bit_grade', label: 'Bitumen penetration / viscosity grade', show2: A => famHas(A, 'Bitumen'), dict: 'sts_bitumen_grade_heating_method'},
   {id: 'bit_curve', type: 'chips', label: 'Viscosity–temperature curve available?', options: ['Yes', 'No'], show2: A => famHas(A, 'Bitumen')},
   {id: 'bit_heating', type: 'textarea', label: 'Heating and recirculation capacity; supplier-recommended handling window', show2: A => famHas(A, 'Bitumen')},
   {id: 'fo_grade', label: 'Fuel oil grade / ISO 8217 designation', show2: A => famHas(A, 'Marine & heavy fuels'), dict: 'sts_fuel_oil_grade_heating_method'},
   {id: 'fo_visc', label: 'Viscosity at 50 °C (or stated reference)', show2: A => famHas(A, 'Marine & heavy fuels')},
   {id: 'fo_pour', label: 'Pour point', show2: A => famHas(A, 'Marine & heavy fuels')},
   {id: 'fo_compat', type: 'textarea', label: 'Sludge / compatibility concerns, heater and pump arrangement', show2: A => famHas(A, 'Marine & heavy fuels')},
   {id: 'sts_scenario', type: 'textarea', label: 'Scenario: a mother vessel is transferring 5,000 MT of heated bitumen offshore and the receiving vessel is not providing hose or fenders. Before arrival, what must be agreed, who supplies equipment, how do you verify compatibility, and how do you set safe temperature, flow, pressure and cargo measurement?'}
  ].map(f => Object.assign(f, {show: A => act(A, ACTS[2], 'na_sts') && (!f.show2 || f.show2(A))})),
  // Delivery terms
  {id: 'h_dt', type: 'heading', icon: 'doc', label: 'FOB / CFR / CIF / EXW operations', hint: 'only terms you executed', na: 'na_dt', show: A => acts(A).includes(ACTS[3])},
  ...[
   {id: 'dt_terms', type: 'multi', label: 'Terms you personally executed', options: ['FOB', 'CFR', 'CIF', 'FCA', 'EXW', 'Ex-tank']},
   {id: 'dt_fob', type: 'textarea', label: 'FOB scenario: 3,000 MT parcel, vessel nominated for 11–13 November. Walk through compatibility / vetting, NOR, loading rate, berth readiness, sampling / quality acceptance, B/L and demurrage.', show2: A => arrOf(A.dt_terms).includes('FOB'), dict: 'commercial_operations_fob_nomination_responsibility'},
   {id: 'dt_cif_ins', type: 'chips', label: 'Under CIF, who contracts the cargo insurance?', options: ['Seller', 'Buyer', 'Depends on the contract'], show2: A => arrOf(A.dt_terms).some(t => t === 'CIF' || t === 'CFR'), dict: 'commercial_operations_cif_insurance_and_documentation_obligations'},
   {id: 'dt_title', type: 'textarea', label: 'How did custody, title and risk transfer in your contract?', dict: 'commercial_operations_custody_title_vs_risk_transfer_understanding'},
   {id: 'dt_exw', type: 'textarea', label: 'EXW / ex-tank: pickup point, who loaded, who cleared export, who provided trucks', show2: A => arrOf(A.dt_terms).some(t => t === 'EXW' || t === 'Ex-tank'), dict: 'commercial_operations_exw_or_ex_tank_loading_and_export_clearance'},
   {id: 'dt_docs', type: 'textarea', label: 'Documents presented under LC / CAD and the timetable', dict: 'commercial_operations_documents_against_lc_cad_experience'}
  ].map(f => Object.assign(f, {show: A => act(A, ACTS[3], 'na_dt') && (!f.show2 || f.show2(A))})),
  // Blending
  {id: 'h_bl', type: 'heading', icon: 'flask', label: 'Blending', na: 'na_bl', show: A => acts(A).includes(ACTS[4])},
  ...[
   {id: 'bl_role', type: 'chips', label: 'Your role', options: ['Blend operator', 'Commercial overseer', 'Broker'], dict: 'blending_blending_experience'},
   {id: 'bl_inputs', type: 'textarea', label: 'Input components (with specs), target grade and location', dict: 'blending_components_and_individual_certificate_specs'},
   {id: 'bl_basis', type: 'chips', label: 'Blend ratio basis', options: ['By mass', 'By temperature-corrected volume', 'Not sure'], dict: 'blending_proportion_basis_mass_or_volume'},
   {id: 'bl_density', label: 'Density / temperature correction method', dict: 'blending_density_and_temperature_correction_method'},
   {id: 'bl_qc', type: 'textarea', label: 'Quality controls', hint: 'sulphur mass balance, flash / viscosity (not linear), water, stability, pre / post lab tests', dict: 'blending_compatibility_stability_testing'},
   {id: 'bl_offspec', type: 'textarea', label: 'Off-spec liability, reblend or rejection procedure', dict: 'blending_offspec_reblend_or_rejection_procedure'},
   {id: 'bl_proof', type: 'multi', label: 'Proof you could share later', options: ['Redacted blend plan', 'COA', 'Lab report', 'Tank / line log', 'Permitted reference', 'None yet'], hint: 'no proprietary recipes'}
  ].map(f => Object.assign(f, {show: A => act(A, ACTS[4], 'na_bl')})),
  // Refining
  {id: 'h_rf', type: 'heading', icon: 'tank', label: 'Refinery procurement / operations', na: 'na_rf', show: A => acts(A).includes(ACTS[5])},
  ...[
   {id: 'rf_func', type: 'multi', label: 'Your function', options: ['Own / operate a refinery', 'Buy feedstocks', 'Market products', 'Schedule tankage', 'Introduce parties only'], dict: 'refining_refining_refinery_operations_experience'},
   {id: 'rf_units', type: 'multi', label: 'Units relevant to your role', options: ['CDU', 'VDU', 'FCC', 'Hydrocracker', 'Hydrotreater', 'Reformer', 'Visbreaker / coker'], show2: A => arrOf(A.rf_func).some(f => !['Market products', 'Introduce parties only'].includes(f)), dict: 'refining_units_worked_with'},
   {id: 'rf_assay', type: 'chips', label: 'Worked with crude assays / cut yields?', options: ['Yes', 'No'], show2: A => arrOf(A.rf_func).some(f => !['Market products', 'Introduce parties only'].includes(f)), dict: 'refining_feedstock_crude_assay_exposure'},
   {id: 'rf_sale', type: 'textarea', label: 'One actual refinery transaction: who released product from tank to terminal?', dict: 'refining_role_in_actual_refinery_transaction'}
  ].map(f => Object.assign(f, {show: A => act(A, ACTS[5], 'na_rf') && (!f.show2 || f.show2(A))})),
  // Evidence
  {id: 'h_ev', type: 'heading', icon: 'shield', label: 'Supporting evidence', hint: 'optional'},
  {id: 'note_red', type: 'note', warn: true, html: '<b>Redact before uploading.</b> Remove bank details, tank coordinates, counterparty names and signatures. Files go to a private PETROMAD folder, are seen only by the review team and never appear in any public PDF or link.'},
  {id: 'ev_files', type: 'files', label: 'Redacted evidence', btn: 'Upload redacted files', hint: 'B/L, COQ, SOF, JPO…'},
  {id: 'ev_later', type: 'chips', label: 'Or share evidence later?', options: ['Later, through a secure upload', 'No'], show: A => !(A.ev_files_n > 0)}
 ]}
];

function startBuy(offer) {
  if (offer && B.offer && B.offer.id === offer.id && Object.keys(B.ans).length > 3) { /* resume same offer */ }
  else if (offer || !Object.keys(B.ans).length || confirm('Start a new buying request? Your saved draft will be replaced.')) {
    const keep = {};
    ['company', 'hq', 'website', 'cname', 'position', 'email', 'phone', 'role'].forEach(k => { if (B.ans[k]) keep[k] = B.ans[k]; });
    B = newBuy(offer); Object.assign(B.ans, keep);
    if (offer && OFFERS) prefillFromOffer(offer);
  }
  BSTEP = 0; saveB(); track('request_start', offer && offer.id);
  go(offer ? 'buy/' + offer.id + '/' + offer.version : 'buy');
}
function prefillFromOffer(offer) {
  const o = PMP.findOffer(OFFERS, offer.id), v = o && PMP.versionOf(o, offer.version); if (!v) return;
  const A = B.ans, p = v.product || {}, q = v.quantity || {}, d = v.delivery || {};
  if (p.family) A.family = [p.family];
  A.interest = A.grade = p.grade || ''; if (p.standard) A.standard = p.standard;
  A.qmin = q.min != null ? String(q.min) : ''; A.qmax = q.max != null ? String(q.max) : ''; A.qunit = q.unit === 'BBL' ? 'BBL' : q.unit === 'MT' || !q.unit ? 'MT' : 'm³';
  A.qty0 = PMP.qtyText(q); if (d.term && TERMS.includes(d.term)) A.basis = d.term; A.place = d.place || '';
  if (d.laycanFrom) A.win_from = d.laycanFrom; if (d.laycanTo) A.win_to = d.laycanTo;
}
function renderBuy(app) {
  const st = BUY_STAGES[BSTEP];
  const revised = B.offer && OFFERS ? PMP.canRequest(OFFERS, B.offer.id, B.offer.version) : null;
  app.innerHTML = `<div class="screen">
   ${brandBar(true)}
   <div class="prog" aria-label="Step ${BSTEP + 1} of 4">${['Contact', 'Requirement', 'Experience', 'Review'].map((s, i) => `<span class="${i <= BSTEP ? 'on' : ''}"><i></i>${s}</span>`).join('')}</div>
   <div class="stagecard"><span class="pill mono">BUY · STEP ${BSTEP + 1}/4 · ${esc(st.time)}</span><h2>${esc(st.title)}</h2><p>${esc(st.text)}</p>
     ${B.saved ? `<small class="saved">${ICONS.check} Draft saved on this device</small>` : ''}</div>
   ${revised && revised.code === 'REVISED' ? revisedBox(revised) : ''}
   ${revised && !revised.ok && revised.code !== 'REVISED' ? `<div class="gate hold"><b>${esc(revised.message)}</b> Your request will be sent as a general buying request.</div>` : ''}
   <div id="qs"></div>
  </div>`;
  bindBrand(() => { if (BSTEP) { BSTEP--; render(); } else go('home'); });
  const redraw = () => { const y = scrollY; vis = drawForm($('#qs'), st.fields, B.ans, redraw, saveB); scrollTo(0, y); };
  let vis = drawForm($('#qs'), st.fields, B.ans, redraw, saveB);
  const ack = $('#ackRev'); if (ack) ack.onchange = () => { if (ack.checked) { B.offer.version = revised.current; prefillFromOffer(B.offer); saveB(); toast('Updated to v' + revised.current); render(); } };
  const btns = [{t: ICONS.arrow.replace('<svg', '<svg style="transform:rotate(180deg)"'), ghost: true, fn: () => { if (BSTEP) { BSTEP--; render(); } else go('home'); }}];
  if (st.optional) btns.push({t: 'Skip', ghost: true, wide: true, fn: () => { BSTEP = 3; view = 'buyreview'; render(); }});
  btns.push({t: BSTEP === 2 ? 'Review' : 'Continue', fn: () => {
    if (B.ans.hp) return; // bot trap
    if (!validate(vis, B.ans)) return;
    if (BSTEP === 0) track('stage0', B.offer && B.offer.id);
    if (BSTEP < 2) { BSTEP++; render(); } else { BSTEP = 3; view = 'buyreview'; render(); }
  }});
  bar(btns);
}
function revisedBox(r) {
  return `<div class="gate warn"><b>${esc(r.message)}</b>
    ${r.changes.length ? `<table class="diff"><tr><th>Field</th><th>You saw</th><th>Now</th></tr>${r.changes.map(c => `<tr><td>${esc(c.field)}</td><td>${esc(c.from)}</td><td><b>${esc(c.to)}</b></td></tr>`).join('')}</table>` : ''}
    <label class="ck2"><input type="checkbox" id="ackRev"><span>I have read the changes and want to continue with v${r.current}.</span></label></div>`;
}
function buySummary() {
  const out = [];
  BUY_STAGES.forEach((st, i) => {
    const rows = [];
    st.fields.filter(f => (!f.show || f.show(B.ans)) && !['heading', 'note', 'locked', 'check'].includes(f.type) && f.id !== 'hp').forEach(f => {
      let v = B.ans[f.id];
      if (f.type === 'params') v = arrOf(v).filter(r => r && r.test).map(r => [r.test, r.method, [r.min, r.max].filter(Boolean).join('–'), r.unit].filter(Boolean).join(' ')).join('; ');
      else if (f.type === 'files') v = (BFILES[f.id] || []).map(x => x.name).join(', ');
      else if (Array.isArray(v)) v = v.join(', ');
      if (v === 'Other' && B.ans[f.id + '_other']) v = B.ans[f.id + '_other'];
      if (hasD(v)) rows.push([f.label, String(v)]);
    });
    out.push({i, title: st.title, rows});
  });
  return out;
}
function renderBuyReview(app) {
  BREF = BREF || 'ENQ-' + new Date().toISOString().slice(2, 10).replace(/-/g, '') + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  const S = buySummary();
  app.innerHTML = `<div class="screen">
   ${brandBar(true)}
   <div class="prog">${['Contact', 'Requirement', 'Experience', 'Review'].map(s => `<span class="on"><i></i>${s}</span>`).join('')}</div>
   <div class="stagecard"><span class="pill mono">${esc(BREF)}</span><h2>Review your request</h2>
     <p>${B.offer ? 'For offer ' + esc(B.offer.id) + ' · v' + B.offer.version + '. ' : ''}Check the details, then send. A PETROMAD trader reviews every request.</p></div>
   ${S.map(s => `<section class="sum"><h3>${esc(s.title)}<button data-edit="${s.i}">Edit</button></h3>
     ${s.rows.length ? `<dl class="kv">${s.rows.map(r => `<dt>${esc(r[0])}</dt><dd>${esc(r[1])}</dd>`).join('')}</dl>` : '<p class="hint">Nothing added.</p>'}</section>`).join('')}
   <div class="gate"><b>This is a request, not a purchase.</b> ${esc(PMP.NON_BINDING)}</div>
   <div class="err" id="err"></div>
  </div>`;
  bindBrand(() => { BSTEP = 2; go(B.offer ? 'buy/' + B.offer.id + '/' + B.offer.version : 'buy'); });
  app.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => { BSTEP = +b.dataset.edit; view = 'buy'; render(); });
  bar([{t: ICONS.arrow.replace('<svg', '<svg style="transform:rotate(180deg)"'), ghost: true, fn: () => { BSTEP = 2; view = 'buy'; render(); }}, {t: 'Send request', fn: sendBuy}]);
}
async function sendBuy() {
  const btn = document.querySelector('#barin .btn:not(.ghost)'); if (btn) btn.disabled = true;
  const err = m => { $('#err').textContent = m; if (btn) btn.disabled = false; };
  try { const last = +localStorage.getItem('pmLastSend') || 0; if (Date.now() - last < 60000) return err('Please wait a minute before sending another request.'); } catch (e) {}
  if (B.offer) {
    await loadOffers(true);
    const c = PMP.canRequest(OFFERS, B.offer.id, B.offer.version);
    if (!c.ok && c.code === 'REVISED') { BSTEP = 0; view = 'buy'; render(); return toast('The offer was revised. Please review the changes.', 4000); }
    if (!c.ok) { if (!confirm(c.message + '\n\nSend it as a general buying request instead?')) return err(c.message); B.offer = null; saveB(); }
  }
  const dict = {};
  BUY_STAGES.forEach(st => st.fields.forEach(f => { if (f.dict && hasD(B.ans[f.id])) dict[f.dict] = B.ans[f.id]; }));
  const files = [];
  for (const k of ['specfile', 'ev_files']) for (const f of (BFILES[k] || [])) files.push({kind: k, name: f.name, mime: f.type || 'application/octet-stream', data: await toB64(f)});
  const payload = {type: 'buyer', ref: BREF, offerId: B.offer ? B.offer.id : '', offerVersion: B.offer ? B.offer.version : '',
    answers: Object.assign({}, B.ans, {hp: undefined}), dictionary: dict, summary: buySummary(), secondsToComplete: Math.round((Date.now() - B.started) / 1000),
    hp: B.ans.hp || '', files, client: {tz: Intl.DateTimeFormat().resolvedOptions().timeZone, lang: navigator.language}};
  if (CONFIG.scriptUrl) {
    try {
      const r = await fetch(CONFIG.scriptUrl, {method: 'POST', body: JSON.stringify(payload)});
      const j = await r.json();
      if (!j.ok) {
        if (j.code === 'REVISED') { BSTEP = 0; view = 'buy'; render(); return toast('The offer was revised. Please review the changes.', 4000); }
        return err(j.message || j.error || 'Could not send. Please try again.');
      }
      BSTATUS = {otp: !!j.otpSent, ref: j.ref || BREF};
    } catch (e) { console.warn(e); return err('Could not send. Check your connection and try again.'); }
  } else {
    // Backup route: email the summary (no score, no files) through FormSubmit
    const f = document.createElement('form'); f.method = 'POST'; f.target = 'fsframe'; f.style.display = 'none';
    f.action = 'https://formsubmit.co/' + encodeURIComponent(CONFIG.receiverEmail);
    const add = (n, v) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = n; i.value = v; f.appendChild(i); };
    add('_subject', 'Buyer request ' + BREF + (B.offer ? ' for ' + B.offer.id + ' v' + B.offer.version : '')); add('_captcha', 'false'); add('_template', 'table');
    if (B.ans.email) add('_replyto', B.ans.email);
    payload.summary.forEach(s => s.rows.forEach(r => add(s.title + ' — ' + r[0], r[1])));
    document.body.appendChild(f); f.submit(); setTimeout(() => f.remove(), 4000);
    BSTATUS = {otp: false, ref: BREF};
  }
  try { localStorage.setItem('pmLastSend', String(Date.now())); localStorage.removeItem(BDRAFT_KEY); } catch (e) {}
  track('request_sent', B.offer && B.offer.id);
  const keep = {}; ['company', 'hq', 'website', 'cname', 'position', 'email', 'phone', 'role'].forEach(k => keep[k] = B.ans[k]);
  B = newBuy(); Object.assign(B.ans, keep); BFILES = {specfile: [], ev_files: []};
  view = 'buydone'; render();
}
function renderBuyDone(app) {
  $('#bar').hidden = true;
  const s = BSTATUS || {ref: BREF};
  app.innerHTML = `<div class="screen done">
   ${brandBar()}
   <div class="big">${ICONS.check}</div><h1 class="hero">Request received</h1>
   <p class="lede">Reference <b class="mono">${esc(s.ref)}</b>. A PETROMAD trader will review it. Nothing has been bought or reserved.</p>
   ${s.otp ? `<section class="sum"><h3>Verify your email</h3><p class="hint">We sent a 6-digit code to your business email.</p>
     <div class="row mt8"><input class="f mono" id="otp" inputmode="numeric" maxlength="6" placeholder="123456" autocomplete="one-time-code"><button class="btn2" id="otpGo">Verify</button></div><div class="ferr" id="otpErr"></div></section>` : ''}
   <a class="lrow" href="#track">${ico('search')}<span><b>Track this request</b><small>Status: received · under review · clarification requested</small></span>${ICONS.arrow}</a>
   <a class="lrow" href="#">${ico('tank')}<span><b>Back to Our Offers</b></span>${ICONS.arrow}</a>
  </div>`;
  bindBrand();
  const g = $('#otpGo'); if (g) g.onclick = async () => {
    const code = $('#otp').value.trim(); if (!/^\d{6}$/.test(code)) return $('#otpErr').textContent = 'Enter the 6 digits.';
    try { const r = await fetch(CONFIG.scriptUrl, {method: 'POST', body: JSON.stringify({type: 'verify', ref: s.ref, code})}); const j = await r.json();
      if (j.ok) { s.otp = false; toast('Email verified'); render(); } else $('#otpErr').textContent = j.message || 'That code did not match.'; }
    catch (e) { $('#otpErr').textContent = 'Could not check the code. Try again.'; }
  };
}

/* ============================================================
   TRACK MY REQUEST
   ============================================================ */
function renderTrack(app) {
  $('#bar').hidden = true;
  app.innerHTML = `<div class="screen">${brandBar(true)}
   <div class="stagecard"><span class="pill mono">TRACK</span><h2>Track my request</h2><p>Enter your reference and the email you used.</p></div>
   <div class="q"><div class="qh"><label for="tr">Reference</label></div><input class="f mono" id="tr" placeholder="ENQ-261110-AB12 or OFR-…"></div>
   <div class="q"><div class="qh"><label for="te">Email</label></div><input class="f" id="te" type="email" autocomplete="email" value="${esc(B.ans.email || '')}"></div>
   <button class="btn2 wide" id="tgo">Check status</button><div id="tout"></div></div>`;
  bindBrand();
  $('#tgo').onclick = async () => {
    const out = $('#tout');
    if (!CONFIG.scriptUrl) { out.innerHTML = `<div class="tip">Online tracking is not switched on yet. Message us on WhatsApp with your reference.</div>`; return; }
    out.innerHTML = '<div class="ocard sk"></div>';
    try { const r = await fetch(CONFIG.scriptUrl + '?status=' + encodeURIComponent($('#tr').value.trim()) + '&email=' + encodeURIComponent($('#te').value.trim())); const j = await r.json();
      out.innerHTML = j.ok ? `<section class="sum"><h3>${esc(j.ref)}</h3><dl class="kv"><dt>Status</dt><dd>${esc(j.status)}</dd><dt>Received</dt><dd>${esc(j.received)}</dd>${j.message ? `<dt>Note</dt><dd>${esc(j.message)}</dd>` : ''}</dl></section>`
        : `<div class="gate hold">${esc(j.message || 'No request found for that reference and email.')}</div>`; }
    catch (e) { out.innerHTML = '<div class="gate hold">Could not check right now. Try again later.</div>'; }
  };
}

/* ============================================================
   HOW PETROMAD WORKS (process, privacy, FAQ)
   ============================================================ */
function renderHow(app) {
  $('#bar').hidden = true;
  const steps = [['Enquiry', 'You send a request for a published cargo or tell us what you need. Short questions first.'],
    ['Qualification', 'A PETROMAD trader reviews your role and requirement. Deeper questions only if they apply.'],
    ['Specification', 'We confirm the exact grade, specification standard and quality data with documents.'],
    ['KYC / KYB & compliance', 'Before any contract: company registration, beneficial ownership, signatory authority and sanctions screening.'],
    ['SPA', 'Terms are agreed and a Sale and Purchase Agreement is signed by both parties. Nothing is binding before this.'],
    ['Payment instrument', 'LC, SBLC, CAD or TT as agreed in the SPA.'],
    ['Nomination & inspection', 'Vessel or truck nomination and approval, independent Q&Q inspection, loading.'],
    ['Documents & settlement', 'B/L, COQ, COO and other documents are presented and the deal is settled.']];
  const faq = [['Does clicking “Request to buy” buy the cargo?', 'No. It records your interest in the exact offer version you saw. A sale exists only after approval, compliance checks and a signed SPA.'],
    ['I am a broker. Can I still apply?', 'Yes. Please say so. Disclosed intermediaries are reviewed under a mandate process and are not treated as a problem.'],
    ['Why do you ask about vessels or STS?', 'Only if you say you handled them, or the deal needs them. Choose “Not applicable” when it does not fit you.'],
    ['Do you need my passport or bank statements?', 'Not at first contact. Step-up KYC/KYB happens only when a deal progresses, as required by law and risk.'],
    ['Why do offers expire?', 'Each weekly offer is active for seven days unless reserved, sold or withdrawn. Expired offers cannot receive requests.'],
    ['Can I see the price?', 'Some prices are shared only with verified buyers. The offer page says when that is the case.']];
  app.innerHTML = `<div class="screen">${brandBar(true)}
   <div class="stagecard"><span class="pill mono">HOW IT WORKS</span><h2>How PETROMAD works</h2><p>From enquiry to settlement. No step happens automatically on this website.</p></div>
   <ol class="flow">${steps.map((s, i) => `<li><span class="mono">${String(i + 1).padStart(2, '0')}</span><div><b>${esc(s[0])}</b><p>${esc(s[1])}</p></div></li>`).join('')}</ol>
   <section class="sum"><h3>Privacy notice</h3><div class="prose">
     <p>We collect only what we need to answer and qualify your request: company and contact details, your requirement and the experience you choose to share.</p>
     <p>Answers and files are stored privately in PETROMAD’s Google Workspace and seen only by the PETROMAD team handling your request. Uploaded evidence is never attached to public offers, PDFs or WhatsApp links.</p>
     <p>We do not sell or share your data with third parties. We contact references only with your permission. You can ask us to correct or delete your data at ${esc(CONFIG.receiverEmail)}.</p>
     <p class="hint">Retention periods and the legal basis for processing will be confirmed before production use (pending legal review). PETROMAD is not a certification body or regulated KYC provider.</p></div></section>
   <section class="sum"><h3>Questions</h3>${faq.map(q => `<details class="faq"><summary>${esc(q[0])}</summary><p>${esc(q[1])}</p></details>`).join('')}</section>
   <section class="sum"><h3>Contact</h3><dl class="kv"><dt>Email</dt><dd><a href="mailto:${esc(CONFIG.receiverEmail)}">${esc(CONFIG.receiverEmail)}</a></dd>
     ${CONFIG.whatsappNumber && !/^9715000000/.test(CONFIG.whatsappNumber) ? `<dt>WhatsApp</dt><dd><a href="https://wa.me/${CONFIG.whatsappNumber.replace(/\D/g, '')}">+${esc(CONFIG.whatsappNumber)}</a></dd>` : ''}</dl></section>
   <p class="foot">${esc(PMP.NON_BINDING)}</p></div>`;
  bindBrand();
}

/* ============================================================
   SELL TO US (existing seller intake, kept as it was)
   ============================================================ */
function renderSell(app) {
  $('#bar').hidden = true;
  const draft = S.cat && Object.keys(S.ans).length;
  const P = PROFILE.ans, has = !!(P.cname || P.company), ini = esc(((P.company || P.cname || '?').trim()[0] || '?').toUpperCase());
  app.innerHTML = `<div class="screen">
   ${brandBar(true)}
   <div class="stagecard"><span class="pill mono">SELL TO PETROMAD</span><h2>Offer your product</h2><p>Pick the product. About two minutes, mostly tick boxes, and “Don’t know” is fine.</p></div>
   <button class="pcard ${has ? '' : 'empty'}" id="myProfile" aria-label="My profile">
     <span class="pav">${PROFILE.logo ? `<img src="${PROFILE.logo}" alt="">` : (has ? ini : ICONS.user)}</span>
     <span class="pinfo"><small>${has ? 'MY PROFILE' : 'NEW HERE?'}</small><b>${has ? esc(P.company || P.cname) : 'Create your profile'}</b>
     <span>${has ? esc([P.company ? P.cname : '', P.role, P.phone].filter(Boolean).join(' · ') || 'Tap to add your details') : 'Save your details once. Every offer fills itself in.'}</span></span>
     <span class="pedit">${has ? 'Edit' : 'Start'}</span></button>
   ${draft ? `<button class="lrow" id="resume">${ico('edit')}<span><b>Continue draft</b><small>${esc(cat().name)} offer in progress</small></span>${ICONS.arrow}</button>` : ''}
   ${HIST().length ? `<button class="lrow" id="myOffers">${ico('list')}<span><b>My offers</b><small>${HIST().length} saved · open again or reuse</small></span>${ICONS.arrow}</button>` : ''}
   <div class="stack">${CATS.map(c => `<button class="cat" data-c="${c.id}" style="--acc:${c.bg}">
     ${ico(c.id)}<span><b>${c.name}</b><span class="sub">${c.sub}</span></span><span class="go">${ICONS.arrow}</span></button>`).join('')}</div>
  </div>`;
  bindBrand();
  app.querySelectorAll('.cat').forEach(b => b.onclick = () => { if (S.cat !== b.dataset.c) { S = {cat: b.dataset.c, ans: {currency: 'USD', per: 'MT', ...PROFILE.ans}, files: []}; } view = 'form'; step = 0; save(); render(); });
  const r = $('#resume'); if (r) r.onclick = () => { view = 'form'; step = 0; render(); };
  const mo = $('#myOffers'); if (mo) mo.onclick = () => { view = 'history'; render(); };
  $('#myProfile').onclick = () => { view = 'profile'; render(); };
}

/* ============================================================
   PUBLISH OFFER (internal builder → offers.json to commit)
   Approval = named people + checks; publishing = committing the file.
   ============================================================ */
let PUB = (() => { try { return JSON.parse(localStorage.getItem('pmPublish') || 'null'); } catch (e) { return null; } })() || {};
const savePub = () => { try { localStorage.setItem('pmPublish', JSON.stringify(PUB)); } catch (e) {} };
const PUB_FIELDS = [
  {id: 'h1', type: 'heading', icon: 'tank', label: 'Offer', hint: 'Revise an existing offer to create the next version; earlier versions are kept.'},
  {id: 'reviseId', type: 'chips', label: 'Start from', options: () => ['New offer'].concat(((OFFERS && OFFERS.offers) || []).map(o => o.id))},
  {id: 'sellerPosition', type: 'chips', label: 'Seller position', req: true, options: ['Principal owner', 'Authorised supplier', 'Reseller', 'Mandate']},
  {id: 'classification', type: 'chips', label: 'Offer type', req: true, options: ['Indicative', 'Firm subject to authorised approval']},
  {id: 'product.family', type: 'chips', label: 'Product family', req: true, options: FAMILIES},
  {id: 'product.grade', label: 'Exact product / grade', req: true},
  {id: 'product.origin', label: 'Country of origin', req: true},
  {id: 'product.standard', label: 'Specification standard / contractual spec ID'},
  {id: 'product.annex', label: 'Annex reference', ph: 'Annex 1 – Spec v1'},
  {id: 'product.coaDate', type: 'date', label: 'COA / report date'},
  {id: 'product.samplePoint', label: 'Sample point', ph: 'e.g. shore tank 12 composite'},
  {id: 'quantity.min', type: 'num', label: 'Quantity min', req: true}, {id: 'quantity.max', type: 'num', label: 'Quantity max', req: true},
  {id: 'quantity.unit', type: 'chips', label: 'Unit', req: true, options: ['MT', 'BBL', 'm³']},
  {id: 'quantity.tolerancePct', type: 'num', label: 'Tolerance ± %'}, {id: 'quantity.optionHolder', type: 'chips', label: 'Tolerance option', options: ['Seller', 'Buyer']},
  {id: 'location.status', type: 'chips', label: 'Physical status', req: true, options: ['In tank', 'At refinery', 'On truck', 'In transit', 'On vessel', 'Subject to production']},
  {id: 'location.country', label: 'Country'}, {id: 'location.port', label: 'Port / place', req: true}, {id: 'location.releasePoint', label: 'Release point'},
  {id: 'h2', type: 'heading', icon: 'ship', label: 'Delivery & execution'},
  {id: 'delivery.term', type: 'chips', label: 'Delivery term', req: true, options: ['FOB', 'CFR', 'CIF', 'FCA', 'EXW', 'DAP', 'Ex-tank (defined)']},
  {id: 'delivery.place', label: 'Named port / place', req: true},
  {id: 'delivery.laycanFrom', type: 'date', label: 'Laycan from'}, {id: 'delivery.laycanTo', type: 'date', label: 'Laycan to'},
  {id: 'delivery.splitParcels', label: 'Split parcels / partial liftings'},
  {id: 'marine.nomination', type: 'textarea', label: 'Nomination & vessel approval'}, {id: 'marine.nor', label: 'NOR conditions'},
  {id: 'marine.rates', label: 'Pumping / loading rates (only where substantiated)'}, {id: 'marine.demurrage', label: 'Demurrage / laytime'},
  {id: 'inspection.appointedBy', label: 'Inspector appointed by'}, {id: 'inspection.points', label: 'Q&Q sampling / measurement points'},
  {id: 'inspection.costs', label: 'Inspection cost allocation'}, {id: 'inspection.dispute', label: 'Rejection / dispute tests'},
  {id: 'h3', type: 'heading', icon: 'chart', label: 'Commercial'},
  {id: 'pricing.basis', type: 'chips', label: 'Price basis', options: ['Fixed', 'Formula / index']},
  {id: 'pricing.fixed', type: 'num', label: 'Fixed price', show: A => A['pricing.basis'] === 'Fixed'},
  {id: 'pricing.benchmark', label: 'Benchmark publication', show: A => A['pricing.basis'] === 'Formula / index'},
  {id: 'pricing.window', label: 'Assessment window', show: A => A['pricing.basis'] === 'Formula / index'},
  {id: 'pricing.differential', label: 'Differential ±', show: A => A['pricing.basis'] === 'Formula / index'},
  {id: 'pricing.currency', type: 'chips', label: 'Currency', options: ['USD', 'EUR', 'AED']}, {id: 'pricing.unit', type: 'chips', label: 'Price unit', options: ['MT', 'BBL', 'm³']},
  {id: 'pricing.exclusions', label: 'Tax / cost exclusions'},
  {id: 'priceDisclosure', type: 'chips', label: 'Price disclosure', req: true, options: ['Public', 'Verified buyers only', 'By request']},
  {id: 'payment.instruments', type: 'multi', label: 'Permitted payment', options: ['LC', 'SBLC', 'CAD', 'TT']},
  {id: 'payment.advance', label: 'Advance / performance security'}, {id: 'payment.milestones', label: 'Milestones'}, {id: 'payment.documents', label: 'Documents & deadlines'},
  {id: 'procedureText', type: 'textarea', label: 'Procedure (one step per line)', ph: 'Enquiry and KYB\nSpecification confirmation\nSPA signature\nPayment instrument\nNomination\nInspection and loading\nDocuments and settlement'},
  {id: 'legal.validity', label: 'Validity text'}, {id: 'legal.confidentiality', label: 'Confidentiality'}, {id: 'legal.law', label: 'Applicable law / arbitration'},
  {id: 'specText', type: 'textarea', label: 'Spec annex (one per line: parameter | unit | method | min | max | result | source date | sample point | lab)', ph: 'Sulphur | mg/kg | ISO 20846 | | 10 | 7.2 | 2026-11-08 | Shore tank 12 | SGS Fujairah'},
  {id: 'gatedText', type: 'textarea', label: 'Gated fields (hidden from public, one path per line)', ph: 'location.releasePoint\nproduct.samplePoint'},
  {id: 'h4', type: 'heading', icon: 'shield', label: 'Validity & approval', hint: 'Every box must be done before export.'},
  {id: 'issuedUtc', type: 'datetime', label: 'Publication time (your local clock)', req: true},
  {id: 'validityDays', type: 'num', label: 'Active days', hint: 'default 7'},
  {id: 'approval.draftedBy', label: 'Drafted by', req: true}, {id: 'approval.checkedBy', label: 'Checked by (internal trader)', req: true},
  {id: 'approval.approvedBy', label: 'Approved by (authorised manager)', req: true},
  {id: 'approval.checks.supply', type: 'check', label: 'Supply', req: true, text: 'Real supply status checked'},
  {id: 'approval.checks.entitlement', type: 'check', label: 'Entitlement', req: true, text: 'Entitlement to resell checked'},
  {id: 'approval.checks.delivery', type: 'check', label: 'Delivery', req: true, text: 'Delivery responsibilities checked'},
  {id: 'approval.checks.confidential', type: 'check', label: 'Confidential', req: true, text: 'Confidential information removed or gated'}
];
function pubToVersion(A) {
  const v = {};
  const set = (p, val) => { const ks = p.split('.'); let o = v; ks.slice(0, -1).forEach(k => { o[k] = o[k] || {}; o = o[k]; }); o[ks[ks.length - 1]] = val; };
  PUB_FIELDS.forEach(f => { if (!f.id.includes('.') || !hasD(A[f.id]) || f.type === 'heading') return;
    let val = A[f.id]; if (['quantity.min', 'quantity.max', 'quantity.tolerancePct'].includes(f.id)) val = Number(String(val).replace(/,/g, '')); set(f.id, val); });
  ['sellerPosition', 'classification'].forEach(k => { if (hasD(A[k])) v[k] = A[k]; });
  if (A.issuedUtc) v.issuedUtc = new Date(A.issuedUtc).toISOString();
  if (hasD(A.validityDays)) v.validityDays = Number(A.validityDays);
  v.expiresUtc = new Date(new Date(v.issuedUtc || Date.now()).getTime() + (v.validityDays || 7) * PMP.DAY).toISOString();
  v.approval = Object.assign(v.approval || {}, {approvedUtc: new Date().toISOString()});
  v.pricing = v.pricing || {}; v.pricing.public = A.priceDisclosure === 'Public'; v.pricing.disclosure = A.priceDisclosure || '';
  if (v.pricing.basis === 'Formula / index') v.pricing.basis = 'Formula';
  v.procedure = String(A.procedureText || '').split('\n').map(s => s.trim()).filter(Boolean);
  if (v.legal && v.legal.law) v.legal.compliance = undefined;
  v.spec = [];
  String(A.specText || '').split('\n').filter(s => s.trim()).forEach(line => {
    const [param, unit, method, min, max, result, sourceDate, samplePoint, lab] = line.split('|').map(s => s.trim());
    const r = PMP.addSpecSample(v.spec, {param, unit, method, min, max, result, sourceDate, samplePoint, lab});
    if (r.ok) v.spec = r.list; else v._specErrors = (v._specErrors || []).concat(param + ': ' + r.error);
  });
  v.gated = String(A.gatedText || '').split('\n').map(s => s.trim()).filter(Boolean);
  return v;
}
function versionToPub(ver) {
  const A = {};
  PUB_FIELDS.forEach(f => { if (f.id.includes('.')) { const val = PMP.getPath(ver, f.id); if (val != null) A[f.id] = Array.isArray(val) ? val : String(val); } });
  ['sellerPosition', 'classification'].forEach(k => A[k] = ver[k] || '');
  A.priceDisclosure = (ver.pricing || {}).disclosure || ((ver.pricing || {}).public ? 'Public' : 'Verified buyers only');
  if ((ver.pricing || {}).basis === 'Formula') A['pricing.basis'] = 'Formula / index';
  A.procedureText = (ver.procedure || []).join('\n'); A.gatedText = (ver.gated || []).join('\n');
  A.specText = (ver.spec || []).map(s => [s.param, s.unit, s.method, s.min, s.max, s.result, s.sourceDate, s.samplePoint, s.lab].map(x => x == null ? '' : x).join(' | ')).join('\n');
  ['approval.draftedBy', 'approval.checkedBy', 'approval.approvedBy'].forEach(k => delete A[k]);
  Object.keys(A).filter(k => k.startsWith('approval.checks')).forEach(k => delete A[k]);
  return A;
}
function renderPublish(app) {
  if (!OFFERS) { loadOffers().then(() => render()); }
  if (!PUB.issuedUtc) { const d = new Date(); d.setMinutes(0, 0, 0); PUB.issuedUtc = new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); }
  app.innerHTML = `<div class="screen">${brandBar(true)}
   <div class="stagecard"><span class="pill mono">DESK · PUBLISH</span><h2>Publish a weekly offer</h2>
     <p>Fill the structured offer, preview the card and PDF, then download <b>offers.json</b> and commit it to the website repository. The commit is the publication.</p></div>
   <div id="qs"></div><div id="pv"></div></div>`;
  bindBrand();
  const redraw = () => { const y = scrollY; vis = drawForm($('#qs'), PUB_FIELDS, PUB, redraw, onChange); scrollTo(0, y); };
  const onChange = () => {
    if (PUB.reviseId && PUB.reviseId !== PUB._loaded) {
      PUB._loaded = PUB.reviseId;
      if (PUB.reviseId !== 'New offer') { const o = PMP.findOffer(OFFERS, PUB.reviseId); if (o) Object.assign(PUB, versionToPub(PMP.current(o)), {reviseId: PUB.reviseId, _loaded: PUB.reviseId}); }
      savePub(); return redraw();
    }
    savePub();
  };
  let vis = drawForm($('#qs'), PUB_FIELDS, PUB, redraw, onChange);
  const draftId = () => PUB.reviseId && PUB.reviseId !== 'New offer' ? PUB.reviseId : PMP.nextOfferId(OFFERS, PUB.issuedUtc ? new Date(PUB.issuedUtc) : new Date());
  const build = () => { const v = pubToVersion(PUB); const r = PMP.publishVersion(OFFERS || {offers: []}, draftId(), v); return r; };
  bar([{t: 'Preview', ghost: true, wide: true, fn: () => {
      const r = build(); const gaps = PMP.approvalGaps(r.version);
      $('#pv').innerHTML = `<div class="sechd"><h3>Preview</h3></div>${offerCard({offer: r.offer, version: r.version, expires: PMP.expiryOf(r.version)})}
        ${r.version._specErrors ? `<div class="gate hold">${r.version._specErrors.map(esc).join('<br>')}</div>` : ''}
        ${gaps.length ? `<div class="gate warn"><b>Not ready to publish.</b> Missing: ${esc(gaps.join(', '))}</div>` : `<div class="gate"><b>Ready.</b> ${esc(r.offer.id)} v${r.version.version}, expires ${esc(PMP.fmtTime(PMP.expiryOf(r.version), PMP.DESK_TZ))}.</div>`}
        <button class="btn2 wide" id="pvPdf">Preview public PDF</button>`;
      $('#pvPdf').onclick = () => { const o = r.offer; const pdf = offerPdfDoc(o, r.version, {preview: true}); saveBlob(pdf.output('blob'), o.id + '-v' + r.version.version + '-PREVIEW.pdf'); };
      $('#pv').querySelectorAll('[data-act]').forEach(b => b.onclick = e => { e.stopPropagation(); toast('Preview only'); });
      $('#pv').scrollIntoView({behavior: 'smooth'});
    }},
    {t: 'Export offers.json', fn: () => {
      if (!validate(vis, PUB)) return toast('Fill the required fields first');
      const r = build(); if (r.version._specErrors) return toast('Fix the spec lines first');
      const gaps = PMP.approvalGaps(r.version); if (gaps.length) return toast('Missing: ' + gaps.join(', '), 4000);
      saveBlob(new Blob([JSON.stringify(r.data, null, 2)], {type: 'application/json'}), 'offers.json');
      toast('Commit offers.json to the repository to publish ' + r.offer.id + ' v' + r.version.version, 5000);
    }}]);
}

/* ============================================================
   ROUTER (#offer/ID, #buy/ID/v, #sell, #how, #track, #publish)
   ============================================================ */
function go(h) { if (location.hash.slice(1) === h) route(); else location.hash = h; }
function route() {
  const h = decodeURIComponent(location.hash.slice(1));
  const [p, a, b] = h.split('/');
  if (p === 'offer' && a) { CUR_OFFER = a; view = 'offer'; }
  else if (p === 'buy') {
    if (a && (!B.offer || B.offer.id !== a)) {
      loadOffers().then(() => { const o = PMP.findOffer(OFFERS, a); B = newBuy(o ? {id: a, version: Number(b) || PMP.current(o).version} : null); if (o) prefillFromOffer(B.offer); saveB(); render(); });
    }
    view = view === 'buyreview' ? 'buyreview' : 'buy';
  }
  else if (['sell', 'how', 'track', 'publish', 'home'].includes(p)) view = p;
  else if (!['form', 'review', 'done', 'history', 'profile', 'quality', 'deal', 'buyreview', 'buydone'].includes(view) || p === '') view = 'home';
  render();
}
window.addEventListener('hashchange', route);
