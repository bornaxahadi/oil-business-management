/* ============================================================
   PETROMAD platform core (V2 brief)
   Shared by the website, the Apps Script backend and the tests.
   Public-safe: weekly offers, expiry, revisions, gated fields,
   recap sections, time zones. No applicant scoring lives here.
   ============================================================ */
var PMP = (function () {
  'use strict';
  const DAY = 86400000;
  const DEFAULT_VALIDITY_DAYS = 7;
  const DESK_TZ = 'Asia/Dubai';
  const OFFER_STATES = ['ACTIVE', 'RESERVED', 'WITHDRAWN', 'SOLD', 'REPLACED'];
  const NON_BINDING =
    'A Request to Buy records your interest only. It is not an acceptance, does not create a binding sale and does not ' +
    'reserve the cargo. Any trade is subject to PETROMAD credit, KYC/KYB, sanctions and compliance review and to a ' +
    'Sale and Purchase Agreement (SPA) signed by both parties.';
  const GATED_NOTE = 'Some details (for example price, exact tank location or supply documents) are shared only with verified buyers.';

  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const clone = v => JSON.parse(JSON.stringify(v));
  const has = v => v != null && String(v).trim() !== '' && v !== "Don't know";

  /* ---------- dates & time zones ---------- */
  function isoWeek(d) {
    d = new Date(d);
    const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return {year: t.getUTCFullYear(), week: Math.ceil(((t - y0) / DAY + 1) / 7)};
  }
  /** "17 Nov 2026, 18:00 GST". tz undefined = the viewer's own zone. */
  function fmtTime(date, tz) {
    if (!date) return '';
    date = new Date(date);
    if (isNaN(date)) return '';
    try {
      const o = {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false, timeZoneName: 'short'};
      if (tz) o.timeZone = tz;
      let s = new Intl.DateTimeFormat('en-GB', o).format(date);
      if (tz === DESK_TZ) s = s.replace(/GMT\+4|UTC\+4/, 'GST');
      return s;
    } catch (e) { return date.toISOString().replace('T', ' ').slice(0, 16) + ' UTC'; }
  }
  /** Both clocks for one instant (T-16). */
  function dualTime(date) {
    const dubai = fmtTime(date, DESK_TZ), local = fmtTime(date);
    return {utc: new Date(date).toISOString(), dubai, local, same: dubai.slice(0, 18) === local.slice(0, 18)};
  }
  function fmtDate(s) {
    if (!has(s)) return '';
    const d = new Date(/^\d{4}-\d\d-\d\d$/.test(s) ? s + 'T00:00:00Z' : s);
    return isNaN(d) ? String(s) : d.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC'});
  }

  /* ---------- offers, versions, expiry ---------- */
  const current = offer => (offer.versions || []).reduce((a, b) => (!a || b.version > a.version) ? b : a, null);
  const versionOf = (offer, n) => (offer.versions || []).find(v => v.version === Number(n)) || null;
  const findOffer = (data, id) => ((data && data.offers) || []).find(o => o.id === id) || null;
  function expiryOf(ver) {
    if (ver.expiresUtc) return new Date(ver.expiresUtc);
    const days = Number(ver.validityDays) > 0 ? Number(ver.validityDays) : DEFAULT_VALIDITY_DAYS;
    return new Date(new Date(ver.issuedUtc).getTime() + days * DAY);
  }
  /** Publication needs a named approver and all four internal checks (brief §8). */
  function approvalGaps(ver) {
    const a = (ver && ver.approval) || {}, c = a.checks || {}, gaps = [];
    if (!has(a.draftedBy)) gaps.push('Drafted by');
    if (!has(a.checkedBy)) gaps.push('Checked by (internal trader)');
    if (!has(a.approvedBy)) gaps.push('Approved by (authorised manager)');
    if (!has(a.approvedUtc)) gaps.push('Approval time');
    if (!c.supply) gaps.push('Real supply status checked');
    if (!c.entitlement) gaps.push('Entitlement to resell checked');
    if (!c.delivery) gaps.push('Delivery responsibilities checked');
    if (!c.confidential) gaps.push('Confidential information removed');
    if (!ver || !has(ver.issuedUtc)) gaps.push('Issue time');
    return gaps;
  }
  const isApproved = ver => approvalGaps(ver).length === 0;

  function offerState(offer, now) {
    now = now ? new Date(now) : new Date();
    const v = current(offer);
    if (!v) return {state: 'INVALID', reason: 'No version'};
    if (!isApproved(v)) return {state: 'NOT_APPROVED', version: v, reason: 'Missing: ' + approvalGaps(v).join(', ')};
    const exp = expiryOf(v);
    const st = offer.status || 'ACTIVE';
    if (st !== 'ACTIVE') return {state: st, version: v, expires: exp};
    if (now < new Date(v.issuedUtc)) return {state: 'SCHEDULED', version: v, expires: exp};
    if (now.getTime() >= exp.getTime()) return {state: 'EXPIRED', version: v, expires: exp};
    return {state: 'ACTIVE', version: v, expires: exp};
  }
  const STATE_TEXT = {ACTIVE: 'Active', EXPIRED: 'Expired', RESERVED: 'Reserved', WITHDRAWN: 'Withdrawn', SOLD: 'Sold',
    REPLACED: 'Replaced', SCHEDULED: 'Not yet published', NOT_APPROVED: 'Not approved', INVALID: 'Unavailable'};

  function activeOffers(data, now) {
    return ((data && data.offers) || []).map(o => ({offer: o, s: offerState(o, now)}))
      .filter(x => x.s.state === 'ACTIVE')
      .map(x => ({offer: x.offer, version: x.s.version, expires: x.s.expires}))
      .sort((a, b) => a.expires - b.expires);
  }

  /** Can a buyer still send a request against this offer + version? Used in the page AND on the server. */
  function canRequest(data, offerId, versionSeen, now) {
    const o = findOffer(data, offerId);
    if (!o) return {ok: false, code: 'NOT_FOUND', message: 'This offer is not in the published list.'};
    const s = offerState(o, now);
    if (s.state !== 'ACTIVE') {
      return {ok: false, code: s.state, message: s.state === 'EXPIRED'
        ? 'This offer expired on ' + fmtTime(s.expires, DESK_TZ) + ' and can no longer receive requests.'
        : 'This offer is ' + (STATE_TEXT[s.state] || s.state).toLowerCase() + ' and is not accepting requests.'};
    }
    if (versionSeen != null && Number(versionSeen) !== s.version.version) {
      const seen = versionOf(o, versionSeen);
      return {ok: false, code: 'REVISED', current: s.version.version, changes: seen ? diffVersions(seen, s.version) : [],
        message: 'The offer was revised to v' + s.version.version + ' after you opened it. Please review the changes and confirm.'};
    }
    return {ok: true, code: 'OK', version: s.version.version};
  }

  /* ---------- public vs gated ---------- */
  function getPath(o, p) { return p.split('.').reduce((a, k) => a == null ? a : a[k], o); }
  function delPath(o, p) {
    const ks = p.split('.'), last = ks.pop();
    const parent = ks.reduce((a, k) => a == null ? a : a[k], o);
    if (parent && last in parent) { delete parent[last]; return true; }
    return false;
  }
  /** Removes every gated field. Price is gated unless pricing.public === true (T-08).
   *  authorisedPrice: true only after PETROMAD has verified the buyer (internal use). */
  function publicView(ver, opts) {
    opts = opts || {};
    const v = clone(ver), hidden = [];
    (v.gated || []).forEach(p => { if (delPath(v, p)) hidden.push(p); });
    if (v.pricing && v.pricing.public !== true && !opts.authorisedPrice) {
      ['fixed', 'differential', 'indicative'].forEach(k => { if (k in v.pricing) { delete v.pricing[k]; hidden.push('pricing.' + k); } });
      v.pricing.hiddenNote = 'Price shared with verified buyers on request';
    }
    if (Array.isArray(v.attachments)) {
      const before = v.attachments.length;
      v.attachments = v.attachments.filter(a => a.public === true);
      if (v.attachments.length < before) hidden.push('attachments');
    }
    delete v.approval; delete v.internalNotes; delete v.gated;
    v.hidden = hidden;
    return v;
  }

  /* ---------- recap (offer page + PDF), brief §8 and Appendix A ---------- */
  const qtyText = q => {
    if (!q) return '';
    const u = q.unit || 'MT', n = x => Number(x).toLocaleString('en-US');
    let s = has(q.min) && has(q.max) && Number(q.min) !== Number(q.max) ? n(q.min) + '–' + n(q.max) + ' ' + u
      : has(q.max) ? n(q.max) + ' ' + u : has(q.min) ? n(q.min) + ' ' + u : '';
    if (s && has(q.tolerancePct)) s += ' ± ' + q.tolerancePct + '%' + (has(q.optionHolder) ? ' at ' + q.optionHolder + "'s option" : '');
    return s;
  };
  const termText = d => d ? [d.term, d.place].filter(has).join(' ') : '';
  const windowText = d => d ? (has(d.laycanFrom) && has(d.laycanTo) ? fmtDate(d.laycanFrom) + ' – ' + fmtDate(d.laycanTo)
    : has(d.readyDate) ? 'Ready ' + fmtDate(d.readyDate) : fmtDate(d.laycanFrom)) : '';
  function priceText(p) {
    if (!p) return '';
    if (p.hiddenNote) return [p.basis, p.hiddenNote].filter(has).join(' · ');
    if (p.basis === 'Fixed') return has(p.fixed) ? (p.currency || 'USD') + ' ' + p.fixed + ' / ' + (p.unit || 'MT') : '';
    return [p.benchmark, p.window, has(p.differential) ? 'differential ' + p.differential + ' ' + (p.currency || 'USD') + '/' + (p.unit || 'MT') : ''].filter(has).join(' · ');
  }
  function recapSections(ver, data) {
    const v = ver, p = v.product || {}, q = v.quantity || {}, l = v.location || {}, d = v.delivery || {}, pr = v.pricing || {},
      pay = v.payment || {}, ins = v.inspection || {}, m = v.marine || {}, lg = v.legal || {};
    const entity = (data && data.entity) || 'PETROMAD';
    const S = [
      ['Seller position', [['Contracting entity', entity], ['Seller is', v.sellerPosition]]],
      ['Product & quality', [['Product / grade', p.grade], ['Product family', p.family], ['Origin', p.origin], ['Specification standard', p.standard],
        ['Annex reference', p.annex], ['COA / report date', fmtDate(p.coaDate)], ['Sample point', p.samplePoint]]],
      ['Quantity & location', [['Quantity', qtyText(q)], ['Product status', l.status], ['Country / port', [l.country, l.port].filter(has).join(', ')], ['Release point', l.releasePoint]]],
      ['Delivery & timing', [['Delivery term', termText(d)], ['Laycan / ready date', windowText(d)], ['Split parcels', d.splitParcels]]],
      ['Pricing', [['Basis', pr.basis], ['Price', priceText(pr)], ['Currency / unit', [pr.currency, pr.unit].filter(has).join(' / ')], ['Excluded taxes / costs', pr.exclusions]]],
      ['Payment', [['Permitted instruments', (pay.instruments || []).join(', ')], ['Advance', pay.advance], ['Milestones', pay.milestones], ['Documents & deadlines', pay.documents],
        ['Condition', 'Subject to PETROMAD credit and compliance acceptance']]],
      ['Inspection', [['Inspector appointed by', ins.appointedBy], ['Q&Q sampling / measurement points', ins.points], ['Cost allocation', ins.costs], ['Rejection / dispute tests', ins.dispute]]],
      ['Marine operation', [['Nomination & vessel approval', m.nomination], ['NOR', m.nor], ['Pumping / loading rates', m.rates], ['Demurrage', m.demurrage]]],
      ['Procedure', (v.procedure || []).map((s, i) => [String(i + 1), s])],
      ['Legal & disclosure', [['Offer classification', v.classification || 'Indicative'], ['Validity', lg.validity], ['Confidentiality', lg.confidentiality],
        ['Sanctions / compliance', lg.compliance || 'Subject to sanctions and compliance screening of all parties, vessels, banks and cargo origin'],
        ['Binding effect', 'Not binding. A signed SPA is required.']]]
    ];
    return S.map(([title, rows]) => ({title, rows: rows.filter(r => has(r[1]))})).filter(s => s.rows.length);
  }

  /** Field-level changes between two revisions, public fields only (T-07). */
  function diffVersions(a, b) {
    const pa = publicView(a), pb = publicView(b), out = [];
    const sa = recapSections(pa), sb = recapSections(pb);
    const flat = S => { const m = {}; S.forEach(s => s.rows.forEach(r => { m[s.title + ' › ' + r[0]] = r[1]; })); return m; };
    const A = flat(sa), B = flat(sb);
    Object.keys(Object.assign({}, A, B)).forEach(k => { if ((A[k] || '') !== (B[k] || '')) out.push({field: k, from: A[k] || '—', to: B[k] || '—'}); });
    const specKey = s => (s || []).map(x => [x.param, x.unit, x.min, x.max, x.result, x.sourceDate].join('|')).join(';');
    if (specKey(pa.spec) !== specKey(pb.spec)) out.push({field: 'Specification annex', from: 'v' + a.version, to: 'changed in v' + b.version});
    return out;
  }

  /* ---------- spec samples (T-15): explicit source, never silent overwrite ---------- */
  function addSpecSample(list, sample) {
    list = (list || []).slice();
    const need = ['param', 'sourceDate', 'samplePoint', 'method'];
    const miss = need.filter(k => !has(sample[k]));
    if (miss.length) return {ok: false, list, error: 'Missing ' + miss.join(', ')};
    const same = list.filter(x => x.param === sample.param);
    const dup = same.find(x => x.sourceDate === sample.sourceDate && x.samplePoint === sample.samplePoint && (x.tank || '') === (sample.tank || '') && x.method === sample.method);
    if (dup) return {ok: false, list, error: 'A result for ' + sample.param + ' from the same source already exists. Add it as a new source (different date, sample point, tank or method) instead of overwriting.'};
    const precedence = has(sample.precedence) ? Number(sample.precedence) : same.length + 1;
    list.push(Object.assign({}, sample, {precedence}));
    return {ok: true, list};
  }
  /** The result that governs: lowest precedence number, then latest source date. */
  function governingSample(list, param) {
    return (list || []).filter(x => x.param === param).sort((a, b) => (a.precedence || 99) - (b.precedence || 99) || String(b.sourceDate).localeCompare(String(a.sourceDate)))[0] || null;
  }

  /* ---------- quantities: no MT conversion without density + reference temperature ---------- */
  const L_PER = {BBL: 158.987, CBM: 1000, 'M3': 1000, 'm³': 1000, Litre: 1, Litres: 1, L: 1};
  function toMT(n, unit, density, refTempC) {
    n = Number(n);
    if (!isFinite(n)) return {mt: null, basis: 'No quantity'};
    if (unit === 'MT' || unit === 'mt') return {mt: n, basis: 'Stated in MT'};
    if (!L_PER[unit]) return {mt: null, basis: 'Unit ' + unit + ' cannot be converted'};
    if (!(Number(density) > 0) || !has(refTempC)) return {mt: null, basis: 'Not converted: product density and reference temperature are needed to turn ' + unit + ' into MT'};
    const litres = n * L_PER[unit], mt = litres * Number(density) / 1e6; // density kg/m³ → kg/L = d/1000; kg → MT /1000
    return {mt, basis: n + ' ' + unit + ' × density ' + density + ' kg/m³ at ' + refTempC + ' °C = ' + mt.toFixed(1) + ' MT'};
  }

  /* ---------- companies (T-13) ---------- */
  const FREE_MAIL = /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|aol|proton|protonmail|gmx|mail|yandex|qq|163|zoho)\./i;
  function companyKey(email, company) {
    email = String(email || '').trim().toLowerCase();
    const m = email.match(/@([^@\s]+)$/);
    if (m && !FREE_MAIL.test(email)) return 'domain:' + m[1];
    const c = String(company || '').toLowerCase().replace(/\b(llc|l\.l\.c|ltd|limited|fze|fzco|dmcc|inc|corp|co|gmbh|sa|bv|plc|llp)\b\.?/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
    if (c) return 'name:' + c;
    return email ? 'email:' + email : '';
  }
  const isCorporateEmail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || '') && !FREE_MAIL.test(e);

  /* ---------- admin publishing helpers ---------- */
  function nextOfferId(data, when) {
    const w = isoWeek(when || new Date()), pre = 'PM-' + w.year + '-W' + String(w.week).padStart(2, '0') + '-';
    const n = ((data && data.offers) || []).filter(o => o.id.indexOf(pre) === 0).length + 1;
    return pre + String(n).padStart(3, '0');
  }
  /** Adds a new offer, or a new revision of an existing one. Earlier revisions are kept unchanged. */
  function publishVersion(data, id, ver) {
    data = clone(data || {offers: []});
    data.offers = data.offers || [];
    let o = findOffer(data, id);
    if (!o) { o = {id, status: 'ACTIVE', versions: []}; data.offers.push(o); }
    const cur = current(o);
    const v = clone(ver);
    v.version = cur ? cur.version + 1 : 1;
    if (cur) v.replaces = cur.version;
    o.versions.push(v);
    o.status = 'ACTIVE';
    data.updatedUtc = new Date().toISOString();
    return {data, offer: o, version: v};
  }

  return {DAY, DEFAULT_VALIDITY_DAYS, DESK_TZ, OFFER_STATES, STATE_TEXT, NON_BINDING, GATED_NOTE, has,
    isoWeek, fmtTime, dualTime, fmtDate, current, versionOf, findOffer, expiryOf, approvalGaps, isApproved, offerState,
    activeOffers, canRequest, publicView, recapSections, diffVersions, qtyText, termText, windowText, priceText,
    addSpecSample, governingSample, toMT, companyKey, isCorporateEmail, nextOfferId, publishVersion, getPath};
})();
if (typeof module !== 'undefined' && module.exports) module.exports = PMP;
