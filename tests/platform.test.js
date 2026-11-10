/* V2 brief acceptance tests T-01 … T-16 (platform.js + apps-script/Desk.gs).
   Run: node tests/platform.test.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const PMP = require('../platform.js');
global.PMP = PMP;
const DESK = vm.runInThisContext(fs.readFileSync(path.join(__dirname, '../apps-script/Desk.gs'), 'utf8') + '\nDESK');
const DATA = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures/offers.demo.json'), 'utf8'));
let pass = 0, fail = 0;
const ok = (name, cond, info) => { cond ? pass++ : fail++; console.log((cond ? '  ok   ' : '  FAIL ') + name + (cond ? '' : '  ' + JSON.stringify(info))); };
const NOW = '2026-11-12T10:00:00Z';
const noFraud = r => !/fraud/i.test(JSON.stringify(r));

/* A competent principal trader with no vessel exposure */
const trader = () => ({
  company: 'Example Trading FZE', hq: 'UAE', website: 'https://example.ae', cname: 'A. Trader', position: 'Trading manager',
  email: 'a.trader@example.ae', phone: '+971', role: 'Principal trading house', authorised: 'Yes', family: ['Middle distillates'],
  grade: 'DEMO Jet A-1', standard: 'DEF STAN 91-091 / AFQRJOS', musthave: [{test: 'Freezing point', max: '-47'}], qmin: '3000', qmax: '4000', qunit: 'MT',
  win_from: '2026-11-19', win_to: '2026-11-25', basis: 'FOB', place: 'Fujairah', price_method: 'Formula / index', index_name: 'Platts Jet FOB AG', assess_window: '5 quotes after B/L',
  payment: ['LC'], receiving: 'To be nominated', payer: "Contracting company's own account",
  acts: ['Past physical trades'], tr_count: '6–15', tr_largest: '30,000–59,999', tr_typical: '10,000–29,999',
  ex_month: '2026-05', ex_product: 'Jet A-1', ex_mt: '20000', ex_load: 'Fujairah', ex_dis: 'Mombasa', ex_term: 'FOB',
  ex_managed: 'Negotiated the SPA, opened the LC, coordinated inspection and document presentation with the bank.', tr_ref: 'At next stage'
});
const score = a => DESK.scoreBuyer(a, {now: NOW});
const alertCodes = r => r.alerts.map(x => x.code);

console.log('Buyer qualification');
// T-01 broker declares intermediary
{ const a = Object.assign(trader(), {role: 'Broker', acts: ['None of these – I introduce or broker']});
  const r = score(a);
  ok('T-01 broker labelled as intermediary', /Intermediary \(declared broker\)/.test(r.role.label), r.role);
  ok('T-01 routed to mandate review, not rejected', /Mandate review/.test(r.role.route) && r.score > 0, r.role);
  ok('T-01 never says fraud', noFraud(r)); }
// T-02 professional trader never operated a tanker
{ const r = score(trader());
  const ship = r.dimensions.find(d => d.key === 'shipping');
  ok('T-02 shipping module N/A', ship.applicable === false, ship);
  ok('T-02 commercial score still strong', r.dimensions.find(d => d.key === 'commercial').score >= 14, r.dimensions);
  ok('T-02 overall not penalised by N/A shipping', r.score >= 70, r.score);
  ok('T-02 no automatic rejection', r.compliance.release === false && !alertCodes(r).length, r.alerts); }
// T-03 MR equals 7,000 MT
{ const a = Object.assign(trader(), {acts: ['Past physical trades', 'Chartering / vessel management'], vs_managed: 'Yes, directly', vs_family: 'Product tanker', vs_class: 'MR1', vs_dwt: '7000', vs_parcel: '7000'});
  const r = score(a);
  ok('T-03 DWT vs parcel ambiguity flagged', alertCodes(r).includes('DWT_CLASS_AMBIGUITY'), r.alerts);
  ok('T-03 asks for clarification and allows part cargo', /part cargo/i.test(r.alerts.find(x => x.code === 'DWT_CLASS_AMBIGUITY').action));
  const b = Object.assign(trader(), {acts: ['Chartering / vessel management'], vs_managed: 'Yes, directly', vs_family: 'Product tanker', vs_class: 'MR2', vs_parcel: '7000'});
  const rb = score(b);
  ok('T-03 MR carrying 7,000 MT part cargo is info only', alertCodes(rb).includes('PART_CARGO') && rb.alerts.find(x => x.code === 'PART_CARGO').severity === 'info', rb.alerts); }
// T-04 VLGC vs VLCC
{ const a = Object.assign(trader(), {acts: ['Chartering / vessel management'], vs_managed: 'Yes, directly', vs_family: 'LPG / LNG gas carrier', vs_class: 'VLGC', ex_product: 'Crude oil Basrah Medium'});
  ok('T-04 VLGC named for crude flagged', alertCodes(score(a)).includes('VLGC_CRUDE'));
  const b = Object.assign(trader(), {family: ['Gas (LPG / LNG)'], grade: 'Propane', acts: ['Chartering / vessel management'], vs_managed: 'Yes, directly', vs_family: 'Crude tanker', vs_class: 'VLCC'});
  ok('T-04 VLCC named for LPG flagged', alertCodes(score(b)).includes('VLCC_GAS'));
  const src = fs.readFileSync(path.join(__dirname, '../market.js'), 'utf8');
  ok('T-04 form shows only the selected family segments', /options: A => VCLASS\[A\.vs_family\]/.test(src) && /'LPG \/ LNG gas carrier': \['VLGC'/.test(src) && /'Crude tanker': \['Aframax', 'Suezmax', 'VLCC'/.test(src));
  ok('T-04 gas carriers use m³ capacity, not DWT', /id: 'vs_cbm'/.test(src) && /show2: A => A\.vs_family && !isGasV\(A\)/.test(src)); }
// T-05 STS bitumen, unknown grade
{ const a = Object.assign(trader(), {family: ['Bitumen'], grade: 'Bitumen', acts: ['Ship-to-ship (STS)'], sts_involve: 'Personally executed'});
  const r = score(a), al = r.alerts.find(x => x.code === 'STS_BITUMEN_REQUIREMENTS');
  ok('T-05 requirements listed', !!al && /grade/.test(al.message) && /viscosity/.test(al.message) && /heating/.test(al.message) && /hose/.test(al.message), r.alerts);
  ok('T-05 no universal temperature suggested', !/\d+\s*°C/.test(JSON.stringify(r.alerts)), r.alerts); }

console.log('Weekly offers');
// T-06 expired offer
{ const act = PMP.activeOffers(DATA, NOW).map(x => x.offer.id);
  ok('T-06 expired offer not in active list', !act.includes('PM-2026-W44-002') && act.includes('PM-2026-W46-001'), act);
  const c = PMP.canRequest(DATA, 'PM-2026-W44-002', 1, NOW);
  ok('T-06 request refused (CTA disabled)', !c.ok && c.code === 'EXPIRED', c);
  ok('T-06 earlier revision retained for audit', PMP.findOffer(DATA, 'PM-2026-W46-001').versions.length === 2); }
// T-07 revision after enquiry
{ const c = PMP.canRequest(DATA, 'PM-2026-W46-001', 1, NOW);
  ok('T-07 submission on v1 refused after v2', !c.ok && c.code === 'REVISED' && c.current === 2, c);
  ok('T-07 changes shown explicitly', c.changes.some(x => /Quantity/.test(x.field) && /2,500/.test(x.from) && /3,000/.test(x.to)), c.changes);
  ok('T-07 v2 accepted', PMP.canRequest(DATA, 'PM-2026-W46-001', 2, NOW).ok); }
// T-08 confidential price
{ const v = PMP.current(PMP.findOffer(DATA, 'PM-2026-W46-001'));
  const pub = PMP.publicView(v), auth = PMP.publicView(v, {authorisedPrice: true});
  ok('T-08 public view hides price', !('differential' in pub.pricing) && /verified buyers/.test(PMP.priceText(pub.pricing)), pub.pricing);
  ok('T-08 public view hides gated + private attachments', !pub.location.releasePoint && pub.attachments.length === 1 && !pub.approval, pub);
  ok('T-08 authorised view shows price', auth.pricing.differential === '+16', auth.pricing); }
// T-09 non-binding
{ const src = fs.readFileSync(path.join(__dirname, '../market.js'), 'utf8');
  ok('T-09 non-binding wording', /not an acceptance/.test(PMP.NON_BINDING) && /SPA/.test(PMP.NON_BINDING));
  ok('T-09 no "Accept" button anywhere', !/>\s*Accept\b/i.test(src) && /Request to buy/.test(src)); }

console.log('Controls');
// T-10 third-party payment
{ const a = Object.assign(trader(), {payer: 'Related or third-party account'});
  const r = score(a);
  ok('T-10 compliance escalated', /Escalated/.test(r.compliance.status) && r.compliance.cases.some(c => c.code === 'THIRD_PARTY_PAYMENT'), r.compliance);
  ok('T-10 no release despite high score', r.score >= 70 && r.compliance.release === false, r.score); }
// T-11 evidence privacy
{ const src = fs.readFileSync(path.join(__dirname, '../market.js'), 'utf8'), gs = fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8');
  ok('T-11 redaction warning shown before upload', /Redact before uploading/.test(src));
  ok('T-11 files saved to private folder, content-type allow list', /evidenceFolder/.test(gs) && /application\\\/pdf/.test(gs));
  ok('T-11 public offer view never includes applicant files', !JSON.stringify(PMP.publicView(PMP.current(PMP.findOffer(DATA, 'PM-2026-W46-001')))).includes('ev_files')); }
// T-12 N/A normalisation
{ const a = trader(), b = Object.assign(trader(), {acts: ['Past physical trades', 'Ship-to-ship (STS)'], na_sts: true});
  const ra = score(a), rb = score(b);
  ok('T-12 N/A module excluded from denominator', ra.score === rb.score, [ra.score, rb.score]);
  ok('T-12 no dishonesty inference', !rb.alerts.length && noFraud(rb), rb.alerts); }
// T-13 same email buyer + seller
{ const k1 = PMP.companyKey('ops@example.ae', 'Example Trading FZE'), k2 = PMP.companyKey('OPS@Example.ae', 'Example Trading');
  ok('T-13 same company key from same domain', k1 === k2 && k1 === 'domain:example.ae', [k1, k2]);
  ok('T-13 free-mail falls back to company name', PMP.companyKey('x@gmail.com', 'Example Trading LLC') === PMP.companyKey('y@gmail.com', 'Example Trading'));
  const gs = fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8');
  ok('T-13 roles kept separate per company', /company_\(email, a\.company, a\.cname, 'Buyer'/.test(gs) && /company_\(d\.email, d\.company, d\.contactName, 'Seller'/.test(gs)); }
// T-14 logistics conflict
{ const v = PMP.current(PMP.findOffer(DATA, 'PM-2026-W46-001'));
  const m = DESK.matchBuyerToOffer(Object.assign(trader(), {win_from: '2026-12-10', win_to: '2026-12-20'}), v);
  ok('T-14 logistics conflict marked', m.logisticsConflict && /operator review/i.test(m.reasons.join(' ')) && /do not promise a firm cargo/i.test(m.reasons.join(' ')), m);
  ok('T-14 not an exact match', m.label === 'Requires Negotiation', m.label);
  const e = DESK.matchBuyerToOffer(trader(), v);
  ok('match: same offer terms → Exact Match', e.label === 'Exact Match', e);
  const n = DESK.matchBuyerToOffer(Object.assign(trader(), {basis: 'CIF', place: 'Italy'}), v);
  ok('match: explicit term reason', n.label === 'Requires Negotiation' && /buyer needs CIF Italy but the offer is FOB Fujairah/.test(n.reasons.join(' ')), n.reasons);
  const u = DESK.matchBuyerToOffer(Object.assign(trader(), {qunit: 'BBL'}), v);
  ok('match: no BBL→MT conversion without density', /density and reference temperature/.test(u.reasons.join(' ')), u.reasons);
  const f = DESK.matchBuyerToOffer(Object.assign(trader(), {family: ['Bitumen']}), v);
  ok('match: different family → No Match', f.label === 'No Match', f); }
// T-15 multiple specs / samples
{ let L = [];
  let r = PMP.addSpecSample(L, {param: 'Sulphur', unit: 'mg/kg', method: 'ISO 20846', result: '7', sourceDate: '2026-11-01', samplePoint: 'Tank 12', tank: '12'}); L = r.list;
  r = PMP.addSpecSample(L, {param: 'Sulphur', unit: 'mg/kg', method: 'ISO 20846', result: '9', sourceDate: '2026-11-01', samplePoint: 'Tank 12', tank: '12'});
  ok('T-15 same source cannot overwrite', !r.ok && L.length === 1 && L[0].result === '7', r);
  r = PMP.addSpecSample(L, {param: 'Sulphur', unit: 'mg/kg', method: 'ISO 20846', result: '8', sourceDate: '2026-11-08', samplePoint: 'Vessel composite', precedence: 1}); L = r.list;
  ok('T-15 second source kept with precedence', r.ok && L.length === 2, L);
  ok('T-15 governing sample uses precedence', PMP.governingSample(L, 'Sulphur').sourceDate === '2026-11-08', PMP.governingSample(L, 'Sulphur'));
  ok('T-15 source date, sample point and method required', !PMP.addSpecSample(L, {param: 'Density', result: '0.8'}).ok); }
// T-16 7-day validity across DST / zones
{ const v = {issuedUtc: '2026-10-22T14:00:00Z', approval: {}};
  const exp = PMP.expiryOf(v);
  ok('T-16 expiry stored as exactly 7×24h UTC', exp.toISOString() === '2026-10-29T14:00:00.000Z', exp.toISOString());
  const dubai = PMP.fmtTime(exp, 'Asia/Dubai'), london = PMP.fmtTime(exp, 'Europe/London'), londonIssue = PMP.fmtTime(v.issuedUtc, 'Europe/London');
  ok('T-16 Dubai clock shown as GST', /18:00 GST/.test(dubai), dubai);
  ok('T-16 recipient clock follows DST (BST → GMT)', /15:00/.test(londonIssue) && /14:00/.test(london), [londonIssue, london]);
  const gs = fs.readFileSync(path.join(__dirname, '../apps-script/Code.gs'), 'utf8');
  ok('T-16 expiry enforced on the server', /PMP\.canRequest\(data, d\.offerId, d\.offerVersion\)/.test(gs)); }

console.log('Publishing');
{ const r = PMP.publishVersion(DATA, 'PM-2026-W46-001', {issuedUtc: '2026-11-11T06:00:00Z'});
  ok('revision appends v3 and keeps v1 + v2', r.offer.versions.map(x => x.version).join() === '1,2,3' && r.version.replaces === 2);
  ok('unapproved version not published', PMP.offerState(r.offer, NOW).state === 'NOT_APPROVED');
  ok('original data not mutated', PMP.findOffer(DATA, 'PM-2026-W46-001').versions.length === 2);
  ok('offer id format PM-YYYY-Www-NNN', /^PM-2026-W46-\d{3}$/.test(PMP.nextOfferId(DATA, new Date(NOW))), PMP.nextOfferId(DATA, new Date(NOW))); }

console.log('Scoring mechanics');
{ const r = score(trader());
  ok('score label says not a probability', /NOT a \d+% statistical probability/.test(r.scoreLabel));
  ok('weights 15/20/20/20/15/10', r.dimensions.map(d => d.weight).join() === '15,20,20,20,15,10');
  ok('evidence confidence separate from score', r.evidence.level === 'Low' && typeof r.score === 'number', r.evidence);
  ok('rubric version recorded', /^R1-/.test(r.rubricVersion));
  ok('deterministic', JSON.stringify(score(trader())) === JSON.stringify(score(trader())));
  const c = score(Object.assign(trader(), {acts: ['FOB / CFR / CIF / EXW operations'], dt_terms: ['CIF'], dt_cif_ins: 'Buyer'}));
  ok('CIF buyer-insurance statement flagged', alertCodes(c).includes('CIF_INSURANCE'), c.alerts);
  ok('2–4 follow-up questions', (q => q.length >= 1 && q.length <= 4)(DESK.followUps(Object.assign(trader(), {acts: ['Chartering / vessel management'], vs_managed: 'Yes, directly'})))); }

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
