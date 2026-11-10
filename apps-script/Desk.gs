/* ============================================================
   PETROMAD internal desk engine (V2 brief §9–§11)
   Runs inside Google Apps Script next to Code.gs, and in the tests.
   NOT loaded by the public website: applicants never see scores.

   - Trade execution readiness: transparent 0–100, provisional,
     NOT a probability. N/A modules leave the denominator (T-12).
   - Review alerts explain contradictions; they never say "fraud".
   - Compliance is a separate control; the score never releases a deal.
   - Two-way match: Exact / Commercially Plausible / Requires
     Negotiation / No Match, with plain reasons.
   ============================================================ */
var DESK = (function () {
  'use strict';
  const RUBRIC_VERSION = 'R1-2026-11-10';
  const QUESTION_BANK_VERSION = 'QB1-2026-11-10';
  const DK = "Don't know";
  const P = () => (typeof PMP !== 'undefined' ? PMP : (typeof require !== 'undefined' ? require('../platform.js') : null));
  const has = v => v != null && v !== DK && v !== false && !(Array.isArray(v) && !v.filter(x => x !== DK).length) && String(v).trim() !== '';
  const arr = v => Array.isArray(v) ? v.filter(x => x !== DK) : (has(v) ? [v] : []);
  const txt = v => has(v) ? String(v).trim() : '';
  const described = (v, min) => txt(v).length >= (min || 40);
  const kw = (v, words) => words.filter(w => new RegExp(w, 'i').test(txt(v))).length;
  const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(n) ? n : null; };

  const ACT = {
    TRADES: 'Past physical trades', VESSEL: 'Chartering / vessel management', STS: 'Ship-to-ship (STS)',
    TERMS: 'FOB / CFR / CIF / EXW operations', BLEND: 'Blending', REFINE: 'Refinery procurement / operations',
    NONE: 'None of these – I introduce or broker'
  };
  const ROLE = {
    'End buyer': {pts: 6, label: 'End buyer', route: 'Commercial qualification'},
    'Principal trading house': {pts: 6, label: 'Principal trader', route: 'Commercial qualification'},
    'Reseller': {pts: 5, label: 'Reseller', route: 'Commercial qualification'},
    'Authorised mandate': {pts: 5, label: 'Authorised mandate', route: 'Mandate review: confirm written mandate and principal'},
    'Broker': {pts: 4, label: 'Intermediary (declared broker)', route: 'Mandate review: may progress once the principal and mandate are confirmed'},
    'Other': {pts: 2, label: 'Other (see answer)', route: 'Clarify role'}
  };
  const BUCKET = {'<1,000': 1, '1,000–4,999': 2, '5,000–9,999': 3, '10,000–29,999': 4, '30,000–59,999': 5, '60,000–99,999': 6, '100,000+': 7};
  const BUCKET_MAX_MT = {'<1,000': 1000, '1,000–4,999': 4999, '5,000–9,999': 9999, '10,000–29,999': 29999, '30,000–59,999': 59999, '60,000–99,999': 99999, '100,000+': Infinity};
  /* Reference ranges (Baltic Exchange style guides; they overlap and are not pass/fail rules). */
  const VESSEL_DWT = {MR1: [35000, 45000], MR2: [45000, 55000], LR1: [55000, 80000], LR2: [80000, 120000],
    Aframax: [80000, 120000], Suezmax: [120000, 200000], VLCC: [200000, 320000]};
  const GAS_CLASSES = ['VLGC', 'LGC', 'MGC', 'Small LPG carrier', 'LNG carrier'];
  const CRUDE_CLASSES = ['Aframax', 'Suezmax', 'VLCC'];
  const GAS_FAMILY = 'Gas (LPG / LNG)';

  const fam = (a, f) => arr(a.family).includes(f);
  function isGasProduct(a) { return fam(a, GAS_FAMILY) || /\b(lpg|lng|propane|butane)\b/i.test(txt(a.grade) + ' ' + txt(a.interest)); }
  function isBitumen(a) { return fam(a, 'Bitumen') || /bitumen|asphalt/i.test(txt(a.grade) + ' ' + txt(a.sts_product)); }
  function isFuelOil(a) { return fam(a, 'Marine & heavy fuels') || /fuel oil|hsfo|vlsfo|ifo|mfo|mazut|lsfo/i.test(txt(a.grade) + ' ' + txt(a.sts_product)); }

  /* ---------- which modules apply ---------- */
  function modules(a) {
    const acts = arr(a.acts);
    const on = (act, na) => acts.includes(act) && !a[na];
    return {
      trades: !a.na_tr,                        // track record applies to everyone unless marked N/A
      vessel: on(ACT.VESSEL, 'na_vs') && a.vs_managed !== 'No',
      sts: on(ACT.STS, 'na_sts'),
      terms: on(ACT.TERMS, 'na_dt'),
      blend: on(ACT.BLEND, 'na_bl'),
      refine: on(ACT.REFINE, 'na_rf')
    };
  }

  /* ---------- rubric items ---------- */
  function items(a) {
    const M = modules(a), I = [];
    const add = (dim, id, max, pts, applicable, claim) => I.push({dim, id, max, pts: Math.max(0, Math.min(max, pts)), applicable: applicable !== false, claim: claim || ''});

    // Authority and genuine position (15)
    const r = ROLE[a.role] || null;
    add('authority', 'role', 6, r ? r.pts : 0, true, 'Declared role: ' + (a.role || 'not given'));
    add('authority', 'authorised', 5, {Yes: 5, Joint: 4, Unknown: 2, 'Not sure': 2}[a.authorised] || 0, true, 'Authorised to discuss a trade: ' + (a.authorised || 'not given'));
    add('authority', 'identity', 4, (has(a.website) || P().isCorporateEmail(a.email) ? 2 : 0) + (has(a.hq) ? 1 : 0) + (has(a.position) ? 1 : 0), true, 'Company identity details');

    // Physical trade track record (20)
    const cnt = {'0': 0, '1–2': 3, '3–5': 5, '6–15': 6, '16+': 7}[a.tr_count];
    add('track', 'count', 7, cnt || 0, M.trades, 'Completed physical transactions (24 months): ' + (a.tr_count || 'not given'));
    const ex = ['ex_month', 'ex_product', 'ex_mt', 'ex_load', 'ex_dis', 'ex_term'].filter(k => has(a[k])).length;
    add('track', 'example', 6, ex, M.trades, 'Transaction example fields given: ' + ex + ' of 6');
    add('track', 'managed', 3, described(a.ex_managed) ? 3 : has(a.ex_managed) ? 1 : 0, M.trades, 'What they personally managed');
    add('track', 'consistent', 2, trackConsistency(a).length ? 0 : (has(a.tr_largest) || ex ? 2 : 0), M.trades, 'Volumes self-consistent');
    add('track', 'reference', 2, a.tr_ref === 'Yes' || a.tr_ref === 'At next stage' ? 2 : 0, M.trades, 'Reference may be contacted later: ' + (a.tr_ref || 'not given'));

    // Shipping and operational competence (20)
    add('shipping', 'vs_class', 2, has(a.vs_family) && has(a.vs_class) ? 2 : has(a.vs_family) ? 1 : 0, M.vessel, 'Vessel category used');
    add('shipping', 'vs_role', 2, has(a.vs_role) ? 2 : 0, M.vessel, 'Vessel role: ' + (a.vs_role || 'not given'));
    add('shipping', 'vs_nom', 4, (described(a.vs_nomination) ? 3 : 0) + (kw(a.vs_nomination, ['q88', 'hvpq', 'vett', 'sire', 'draft', 'loa', 'previous cargo', 'coating']) ? 1 : 0), M.vessel, 'Last vessel nomination described');
    add('shipping', 'vs_lay', 3, (described(a.vs_laytime) ? 2 : 0) + (kw(a.vs_laytime, ['nor', 'sof', 'statement of facts', 'laytime', 'demurrage', 'laycan']) ? 1 : 0), M.vessel, 'Laycan / NOR / SOF example');
    add('shipping', 'vs_rate', 2, (num(a.vs_rate) ? 1 : 0) + (num(a.vs_bar) ? 1 : 0), M.vessel, 'Actual pumping rate and manifold pressure');
    add('shipping', 'vs_qq', 3, (described(a.vs_qq) ? 2 : 0) + (kw(a.vs_qq, ['rob', 'obq', 'vef', 'shore', 'ship figure', 'temperature', 'density', 'b/l', 'bill of lading']) >= 2 ? 1 : 0), M.vessel, 'Q&Q reconciliation');
    add('shipping', 'sts_inv', 3, {'Personally executed': 3, 'Brokered / arranged': 2, 'Observed': 1}[a.sts_involve] || 0, M.sts, 'STS involvement: ' + (a.sts_involve || 'not given'));
    add('shipping', 'sts_plan', 2, described(a.sts_poac, 30) ? 2 : has(a.sts_poac) ? 1 : 0, M.sts, 'Service provider / POAC / JPO');
    add('shipping', 'sts_fend', 2, (has(a.sts_fender_by) ? 1 : 0) + (described(a.sts_fenders, 20) ? 1 : 0), M.sts, 'Fender supply and verification');
    add('shipping', 'sts_hose', 2, (has(a.sts_hose_by) ? 1 : 0) + (described(a.sts_hose, 20) ? 1 : 0), M.sts, 'Hose string supply and rating');
    add('shipping', 'sts_cond', 3, ['sts_temp', 'sts_rate', 'sts_bar'].filter(k => num(a[k]) != null).length, M.sts, 'Real operating conditions (°C, m³/h, bar)');
    add('shipping', 'sts_env', 2, (described(a.sts_weather, 20) ? 1 : 0) + (described(a.sts_qq, 20) ? 1 : 0), M.sts, 'Weather envelope and Q&Q');
    add('shipping', 'sts_scn', 3, scenarioPoints(a.sts_scenario), M.sts, 'STS scenario reasoning');

    // Product / commercial competence (20)
    add('commercial', 'grade', 2, has(a.grade) ? 2 : 0, true, 'Exact grade');
    add('commercial', 'standard', 2, has(a.standard) ? 2 : 0, true, 'Specification standard');
    add('commercial', 'musthave', 2, described(a.musthave, 15) ? 2 : has(a.musthave) ? 1 : 0, true, 'Must-have parameters');
    add('commercial', 'qty', 2, (has(a.qmin) ? 1 : 0) + (has(a.qmax) ? 1 : 0), true, 'Quantity min / max');
    add('commercial', 'window', 2, has(a.win_from) && has(a.win_to) && a.win_from <= a.win_to ? 2 : has(a.win_from) || has(a.win_to) ? 1 : 0, true, 'Shipping window');
    add('commercial', 'basis', 2, (has(a.basis) ? 1 : 0) + (has(a.place) ? 1 : 0), true, 'Delivery basis and named place');
    add('commercial', 'pricing', 2, a.price_method === 'Fixed price' ? 2 : a.price_method === 'Formula / index' ? (has(a.index_name) ? 1 : 0) + (has(a.assess_window) || has(a.differential) ? 1 : 0) : a.price_method === 'Negotiable' ? 1 : 0, true, 'Pricing method');
    add('commercial', 'payment', 1, arr(a.payment).length ? 1 : 0, true, 'Payment instruments accepted');
    add('commercial', 'receiving', 1, has(a.receiving) ? 1 : 0, true, 'Receiving facility / vessel readiness');
    add('commercial', 'cif_ins', 2, a.dt_cif_ins === 'Seller' || a.dt_cif_ins === 'Depends on the contract' ? 2 : 0, M.terms, 'CIF insurance obligation: ' + (a.dt_cif_ins || 'not given'));
    add('commercial', 'fob_scn', 3, (described(a.dt_fob) ? 2 : 0) + (kw(a.dt_fob, ['nor', 'vett', 'compatib', 'loading rate', 'berth', 'sampl', 'b/l', 'demurrage', 'laycan']) >= 3 ? 1 : 0), M.terms, 'FOB operational scenario');
    add('commercial', 'bl_role', 1, has(a.bl_role) ? 1 : 0, M.blend, 'Blending role: ' + (a.bl_role || 'not given'));
    add('commercial', 'bl_basis', 2, a.bl_basis === 'By mass' || a.bl_basis === 'By temperature-corrected volume' ? 2 : 0, M.blend, 'Blend ratio basis');
    add('commercial', 'bl_qc', 2, (described(a.bl_qc) ? 1 : 0) + (kw(a.bl_qc, ['sulph', 'flash', 'viscos', 'water', 'sediment', 'stabil', 'compatib', 'lab']) >= 2 ? 1 : 0), M.blend, 'Blend quality controls');
    add('commercial', 'rf_func', 1, arr(a.rf_func).length ? 1 : 0, M.refine, 'Refinery function');
    add('commercial', 'rf_detail', 2, arr(a.rf_func).every(f => f === 'Market products' || f === 'Introduce parties only')
      ? (described(a.rf_sale) ? 2 : 0) : (arr(a.rf_units).length ? 1 : 0) + (described(a.rf_sale) ? 1 : 0), M.refine, 'Refinery transaction / unit knowledge');

    // References / supporting evidence (15)
    add('evidence', 'ref', 5, a.tr_ref === 'Yes' || a.tr_ref === 'At next stage' ? 5 : a.tr_ref === 'No' ? 1 : 0, true, 'Permitted reference');
    add('evidence', 'docs', 10, a.ev_files_n > 0 ? 10 : a.ev_later === 'Later, through a secure upload' ? 6 : 0, true,
      a.ev_files_n > 0 ? a.ev_files_n + ' redacted file(s) uploaded, not yet reviewed' : 'Evidence: ' + (a.ev_later || 'not offered'));
    return I;
  }
  function scenarioPoints(t) {
    if (!described(t, 80)) return described(t) ? 1 : 0;
    const topics = kw(t, ['hose', 'fender', 'viscos|temperat', 'flow|rate|m3|m³', 'pressure|bar', 'measur|q&q|sampl|ullage', 'weather|swell|wind', 'jpo|poac|joint plan|service provider', 'compatib|certif']);
    return topics >= 6 ? 3 : topics >= 4 ? 2 : 1;
  }

  /* ---------- review alerts (explainable, never "fraud") ---------- */
  function trackConsistency(a) {
    const out = [];
    if (BUCKET[a.tr_largest] && BUCKET[a.tr_typical] && BUCKET[a.tr_typical] > BUCKET[a.tr_largest])
      out.push(alert('PARCEL_ORDER', 'review', 'Typical parcel (' + a.tr_typical + ' MT) is larger than the largest parcel (' + a.tr_largest + ' MT).', 'Ask which figure is correct.'));
    const exmt = num(a.ex_mt);
    if (exmt && BUCKET_MAX_MT[a.tr_largest] && exmt > BUCKET_MAX_MT[a.tr_largest] * 1.05)
      out.push(alert('EXAMPLE_OVER_LARGEST', 'review', 'Example transaction of ' + exmt.toLocaleString('en-US') + ' MT is above the stated largest parcel (' + a.tr_largest + ' MT).', 'Ask them to confirm the example size.'));
    return out;
  }
  function alert(code, severity, message, action, answer) { return {code, severity, message, action: action || '', answer: answer || ''}; }

  function alerts(a, now) {
    now = now ? new Date(now) : new Date();
    const M = modules(a), out = trackConsistency(a).slice();
    // Vessel family / class / DWT logic (T-03, T-04)
    if (M.vessel) {
      const cls = a.vs_class, dwt = num(a.vs_dwt), parcel = num(a.vs_parcel), gasVessel = a.vs_family === 'LPG / LNG gas carrier' || GAS_CLASSES.includes(cls);
      if (cls === 'VLGC' && !isGasProduct(a) && /crude/i.test(txt(a.ex_product) + ' ' + txt(a.grade) + ' ' + txt(a.vs_context)))
        out.push(alert('VLGC_CRUDE', 'review', 'VLGC (a gas carrier, sized in m³) was named for a crude oil lifting.', 'Ask whether they meant VLCC (crude tanker, ~200–320k DWT) or a gas cargo.', cls));
      if (cls === 'VLCC' && isGasProduct(a))
        out.push(alert('VLCC_GAS', 'review', 'VLCC is a crude tanker; the product is LPG/LNG, which moves on gas carriers such as a VLGC.', 'Ask which vessel was actually used.', cls));
      if (VESSEL_DWT[cls] && dwt && dwt < VESSEL_DWT[cls][0] * 0.6)
        out.push(alert('DWT_CLASS_AMBIGUITY', 'review', cls + ' vessels are usually about ' + VESSEL_DWT[cls].map(x => x / 1000 + 'k').join('–') + ' DWT, but ' + dwt.toLocaleString('en-US') + ' was given as DWT.',
          'Ask whether ' + dwt.toLocaleString('en-US') + ' is the cargo parcel rather than the vessel DWT. A part cargo on a larger tanker is possible.', String(dwt)));
      if (VESSEL_DWT[cls] && parcel && !dwt && parcel < VESSEL_DWT[cls][0] * 0.5)
        out.push(alert('PART_CARGO', 'info', parcel.toLocaleString('en-US') + ' MT on an ' + cls + ' is a part cargo. Physically possible, often commercially inefficient; not a problem by itself.', 'Optional: ask why that vessel size was used.'));
      if (dwt && parcel && (a.vs_parcel_unit || 'MT') === 'MT' && parcel > dwt)
        out.push(alert('PARCEL_OVER_DWT', 'review', 'Cargo parcel (' + parcel.toLocaleString('en-US') + ' MT) is larger than the vessel DWT (' + dwt.toLocaleString('en-US') + ').', 'Ask them to confirm both numbers.'));
      if (gasVessel && (a.vs_parcel_unit || 'MT') === 'MT' && parcel)
        out.push(alert('GAS_UNITS', 'info', 'Gas carrier cargo is usually discussed in m³; parcel was given in MT.', 'Ask for cargo volume in m³ and the density basis used.'));
      if (!gasVessel && CRUDE_CLASSES.includes(cls) && arr(a.family).length && !fam(a, 'Crude & feedstocks') && !fam(a, 'Marine & heavy fuels') && !isGasProduct(a))
        out.push(alert('CRUDE_TANKER_PRODUCT', 'info', cls + ' is normally a crude tanker; the product family is ' + arr(a.family).join(', ') + '.', 'Ask about tank coating and cargo history.'));
    }
    // Delivery-term statements (brief §11)
    if (M.terms && a.dt_cif_ins === 'Buyer')
      out.push(alert('CIF_INSURANCE', 'review', 'Answered that the buyer arranges sea insurance under CIF. Under Incoterms 2020 CIF the seller contracts the insurance.', 'Ask them to explain the contract they had in mind.', a.dt_cif_ins));
    if (a.basis === 'EXW')
      out.push(alert('EXW_EXPORT', 'info', 'EXW chosen. For international exports FCA is often more workable (seller clears export, loads at a named point).', 'Confirm the exact pickup point and who loads and clears export.'));
    if (a.basis === 'Ex-tank (defined in contract)' && !described(a.extank_def, 15))
      out.push(alert('EXTANK_UNDEFINED', 'review', '"Ex-tank" is not an Incoterm and was not defined.', 'Ask for the terminal, transfer point, title/risk point and who pays throughput.'));
    // Timing
    if (has(a.win_from) && has(a.win_to) && a.win_to < a.win_from)
      out.push(alert('WINDOW_ORDER', 'review', 'Shipping window ends before it starts.', 'Ask for the correct dates.'));
    if (has(a.win_to) && new Date(a.win_to + 'T23:59:59Z') < now)
      out.push(alert('WINDOW_PAST', 'review', 'The whole shipping window is in the past.', 'Ask for a current window.'));
    if (num(a.qmin) && num(a.qmax) && num(a.qmin) > num(a.qmax))
      out.push(alert('QTY_ORDER', 'review', 'Minimum quantity is above maximum.', 'Ask for the correct range.'));
    // STS product branch (T-05): never suggest a universal temperature
    if (M.sts && isBitumen(a)) {
      const miss = [['bit_grade', 'penetration / viscosity grade'], ['bit_curve', 'viscosity–temperature curve'], ['bit_heating', 'heating and recirculation capacity'],
        ['sts_temp', 'actual tank / manifold temperature'], ['sts_hose', 'certified hose rating (pressure and temperature)']].filter(([k]) => !has(a[k]) || a[k] === 'No');
      if (miss.length) out.push(alert('STS_BITUMEN_REQUIREMENTS', 'review', 'Heated bitumen STS: missing ' + miss.map(x => x[1]).join(', ') + '. There is no universal safe bitumen temperature.',
        'Require grade, viscosity data, supplier handling limits, heating plan and certified hose/fender compatibility before any operation.'));
    }
    if (M.sts && isFuelOil(a)) {
      const miss = [['fo_grade', 'ISO 8217 grade'], ['fo_visc', 'viscosity at a stated reference temperature'], ['fo_pour', 'pour point'], ['sts_temp', 'transfer temperature']].filter(([k]) => !has(a[k]));
      if (miss.length) out.push(alert('STS_FUEL_REQUIREMENTS', 'info', 'Fuel oil STS: missing ' + miss.map(x => x[1]).join(', ') + '. Operating temperature depends on grade and equipment.', 'Ask for the missing data.'));
    }
    if (M.sts && a.sts_involve === 'Personally executed' && !has(a.sts_hose_by) && !has(a.sts_fender_by) && !described(a.sts_poac, 20))
      out.push(alert('STS_THIN', 'review', 'STS operations claimed as personally executed, but no description of hose/fender responsibility or the Joint Plan of Operations.', 'Ask for one STS example with who supplied hose, fenders and the JPO.'));
    if (a.tr_count === '16+' && !has(a.ex_product) && !has(a.ex_mt))
      out.push(alert('NO_EXAMPLE', 'info', 'Declared 16+ transactions but gave no example.', 'Ask for one completed transaction example (can be redacted).'));
    if (a.tr_count === '0' && has(a.ex_mt))
      out.push(alert('ZERO_WITH_EXAMPLE', 'review', 'Declared 0 completed transactions but gave a transaction example.', 'Ask whether the example was completed and their role in it.'));
    return out;
  }

  /* ---------- compliance (separate control, T-10) ---------- */
  function compliance(a) {
    const cases = [];
    if (a.payer === 'Related or third-party account')
      cases.push({code: 'THIRD_PARTY_PAYMENT', level: 'ESCALATE', message: 'Payment would come from a related or third-party account. Escalate to compliance; no release on experience score.'});
    if (/\b(iran|syria|north korea|dprk|crimea|venezuela|russia|belarus|cuba)\b/i.test(txt(a.origin_restrict) + ' ' + txt(a.hq) + ' ' + txt(a.dest0) + ' ' + txt(a.discharge) + ' ' + txt(a.place)))
      cases.push({code: 'JURISDICTION_SCREEN', level: 'REVIEW', message: 'A country in the answers needs sanctions screening (party, origin or destination). Screening only: not a finding.'});
    return {status: cases.some(c => c.level === 'ESCALATE') ? 'Escalated: compliance review required' : 'Pending screening (sanctions, beneficial ownership)',
      release: false, cases, note: 'Experience score never overrides a legal or compliance block. Human reviewer decides.'};
  }

  /* ---------- evidence confidence (kept apart from the score) ---------- */
  function evidenceConfidence(a, reviewer) {
    if (reviewer && reviewer.verified) return {level: 'High', reason: 'Verified by ' + reviewer.by + ': ' + (reviewer.note || '')};
    if (a.ev_files_n > 0) return {level: 'Medium (pending review)', reason: a.ev_files_n + ' redacted file(s) uploaded; not yet checked against the claims.'};
    if (a.ev_later === 'Later, through a secure upload' || a.tr_ref === 'Yes' || a.tr_ref === 'At next stage') return {level: 'Low', reason: 'Self-declared; evidence or reference offered for a later stage.'};
    return {level: 'None', reason: 'Self-declared only.'};
  }

  const DIMS = [['authority', 'Authority and genuine position', 15], ['track', 'Physical trade track record', 20], ['shipping', 'Shipping and operational competence', 20],
    ['commercial', 'Product / commercial competence', 20], ['evidence', 'References / supporting evidence', 15], ['consistency', 'Responsiveness and consistency', 10]];

  /** Full internal assessment of one buyer enquiry. */
  function scoreBuyer(a, opts) {
    opts = opts || {};
    const I = items(a), AL = alerts(a, opts.now), review = AL.filter(x => x.severity === 'review').length;
    const dims = DIMS.map(([key, name, weight]) => {
      if (key === 'consistency') {
        const pts = Math.max(0, 10 - 3 * review);
        return {key, name, weight, applicable: true, points: pts, max: 10, score: pts, basis: review ? review + ' review alert(s)' : 'No contradictions found'};
      }
      const app = I.filter(i => i.dim === key && i.applicable);
      if (!app.length) return {key, name, weight, applicable: false, points: 0, max: 0, score: null, basis: 'Not applicable (excluded from the total)'};
      const pts = app.reduce((s, i) => s + i.pts, 0), max = app.reduce((s, i) => s + i.max, 0);
      return {key, name, weight, applicable: true, points: pts, max, score: Math.round(pts / max * weight * 10) / 10, basis: 'Self-reported'};
    });
    const live = dims.filter(d => d.applicable), wsum = live.reduce((s, d) => s + d.weight, 0);
    const total = Math.round(live.reduce((s, d) => s + d.score, 0) / wsum * 100);
    const role = ROLE[a.role] || {label: a.role || 'Not given', route: 'Clarify role'};
    const comp = compliance(a);
    const ev = evidenceConfidence(a, opts.reviewer);
    const next = [];
    if (role.route) next.push(role.route);
    AL.filter(x => x.severity === 'review').forEach(x => next.push(x.action));
    comp.cases.forEach(c => next.push(c.message));
    if (ev.level === 'None' || ev.level === 'Low') next.push('Request redacted evidence or a permitted reference when the deal progresses.');
    return {
      rubricVersion: RUBRIC_VERSION, questionBankVersion: QUESTION_BANK_VERSION,
      score: total, scoreLabel: total + ' / 100 (provisional, NOT a ' + total + '% statistical probability)',
      dimensions: dims, items: I, alerts: AL,
      role: {declared: a.role || '', label: role.label + (a.role ? ' (self-declared; verification pending)' : ''), route: role.route},
      evidence: ev, compliance: comp, nextActions: next.filter(Boolean),
      excludedModules: Object.entries(modules(a)).filter(([, v]) => !v).map(([k]) => k)
    };
  }

  /* ---------- adaptive follow-up questions (2–4) ---------- */
  function followUps(a) {
    const M = modules(a), Q = [];
    alerts(a).filter(x => x.severity === 'review').forEach(x => Q.push(x.action));
    if (M.vessel && !described(a.vs_nomination)) Q.push('Describe your last vessel nomination: who nominated, who vetted and which Q88/HVPQ points you checked.');
    if (M.sts && !described(a.sts_scenario)) Q.push('For one STS you handled, who supplied hose and fenders, and how were rate, pressure and temperature agreed?');
    if (M.terms && !described(a.dt_fob)) Q.push('Walk us through a FOB loading you handled: NOR, berth readiness, sampling and B/L.');
    if (M.trades && !has(a.ex_product)) Q.push('Give one completed transaction: month/year, product, approximate MT, load and discharge region, Incoterm.');
    if (!has(a.standard)) Q.push('Which specification standard must the ' + (txt(a.grade) || 'product') + ' meet?');
    return Q.filter((q, i) => Q.indexOf(q) === i).slice(0, 4);
  }

  /* ---------- two-way match: buyer request vs published offer ---------- */
  const norm = s => txt(s).toLowerCase().replace(/[^a-z0-9.%]+/g, '');
  function overlap(a1, a2, b1, b2) { return !(a2 < b1 || b2 < a1); }
  function matchBuyerToOffer(a, ver) {
    const R = [], p = ver.product || {}, q = ver.quantity || {}, d = ver.delivery || {}, pay = ver.payment || {};
    const hard = [], neg = [], unk = [];
    const say = (kind, msg) => { (kind === 'no' ? hard : kind === 'neg' ? neg : kind === 'unk' ? unk : R).push(msg); };
    // product family + grade + spec
    if (arr(a.family).length && has(p.family) && !arr(a.family).includes(p.family)) say('no', 'Product family differs: buyer wants ' + arr(a.family).join(', ') + ', offer is ' + p.family + '.');
    else if (has(a.grade) && has(p.grade)) {
      if (norm(a.grade) === norm(p.grade)) say('ok', 'Same grade: ' + p.grade + '.');
      else say('neg', 'Grade differs: buyer ' + a.grade + ' vs offer ' + p.grade + '.');
    } else say('unk', 'Grade not stated on one side.');
    if (has(a.standard) && has(p.standard) && norm(a.standard) !== norm(p.standard)) say('neg', 'Specification standard differs: buyer ' + a.standard + ' vs offer ' + p.standard + '.');
    // quantity (no unit conversion without density + reference temperature)
    const bu = a.qunit || 'MT', ou = q.unit || 'MT';
    const bmin = num(a.qmin), bmax = num(a.qmax), omin = num(q.min), omax = num(q.max);
    if ((bmin || bmax) && (omin || omax)) {
      if (bu !== ou) {
        const dens = p.density, ref = p.densityRefC;
        const cv = x => P().toMT(x, bu === 'MT' ? ou : bu, dens, ref);
        const test = cv(1);
        if (test.mt == null) say('neg', 'Quantity units differ (' + bu + ' vs ' + ou + '). ' + test.basis + '.');
        else say('unk', 'Quantity units differ; converted on basis: ' + test.basis + '.');
      } else {
        const tol = 1 + (num(q.tolerancePct) || 0) / 100;
        const lo = (omin || omax) / tol, hi = (omax || omin) * tol;
        const blo = bmin || bmax, bhi = bmax || bmin;
        if (blo > hi) say('no', 'Buyer minimum ' + blo.toLocaleString('en-US') + ' ' + bu + ' is above what the offer can supply (' + P().qtyText(q) + ').');
        else if (bhi < lo) say('neg', 'Buyer maximum ' + bhi.toLocaleString('en-US') + ' ' + bu + ' is below the offer minimum (' + P().qtyText(q) + '). Part cargo would need agreement.');
        else say('ok', 'Quantity ranges overlap.');
      }
    } else say('unk', 'Quantity missing on one side.');
    // timing (T-14)
    const of = d.laycanFrom || d.readyDate, ot = d.laycanTo || d.readyDate;
    if (has(a.win_from) && has(a.win_to) && has(of) && has(ot)) {
      if (overlap(a.win_from, a.win_to, of, ot)) say('ok', 'Shipping window overlaps the offer laycan.');
      else say('neg', 'LOGISTICS CONFLICT: buyer window ' + a.win_from + ' to ' + a.win_to + ' does not meet offer laycan ' + of + ' to ' + ot + '. Operator review required; do not promise a firm cargo.');
    } else say('unk', 'Timing not stated on one side.');
    // incoterm + named place
    if (has(a.basis) && has(d.term)) {
      if (a.basis !== d.term) say('neg', 'Delivery term differs: buyer needs ' + [a.basis, a.place].filter(has).join(' ') + ' but the offer is ' + [d.term, d.place].filter(has).join(' ') + '.');
      else if (has(a.place) && has(d.place) && norm(a.place) !== norm(d.place) && !norm(d.place).includes(norm(a.place)) && !norm(a.place).includes(norm(d.place)))
        say('neg', 'Same term (' + d.term + ') but different named place: ' + a.place + ' vs ' + d.place + '.');
      else say('ok', 'Same delivery term' + (has(d.place) ? ' (' + d.term + ' ' + d.place + ')' : '') + '.');
    } else say('unk', 'Delivery term missing on one side.');
    // origin restriction
    if (has(a.origin_restrict) && has(p.origin) && norm(a.origin_restrict).includes(norm(p.origin)))
      say('neg', 'Buyer origin restriction mentions ' + p.origin + ' (offer origin). Review.');
    // payment
    const bp = arr(a.payment), op = pay.instruments || [];
    if (bp.length && op.length) {
      if (bp.some(x => op.includes(x))) say('ok', 'At least one payment instrument in common.');
      else say('neg', 'No payment instrument in common: buyer ' + bp.join('/') + ', offer ' + op.join('/') + '.');
    }
    if (has(a.deviations)) say('neg', 'Buyer listed deviations from the offer: ' + txt(a.deviations));
    const label = hard.length ? 'No Match' : neg.length ? 'Requires Negotiation' : unk.length ? 'Commercially Plausible' : 'Exact Match';
    return {label, reasons: hard.concat(neg, unk, R), blockers: hard, negotiate: neg, unknown: unk,
      logisticsConflict: neg.some(x => /^LOGISTICS CONFLICT/.test(x))};
  }

  return {RUBRIC_VERSION, QUESTION_BANK_VERSION, ACT, ROLE, VESSEL_DWT, GAS_FAMILY, modules, items, alerts, compliance, evidenceConfidence, scoreBuyer, followUps, matchBuyerToOffer};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = DESK;
