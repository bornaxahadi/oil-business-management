/* Spec test cases for engine.js. Run: node tests/engine.test.js */
const E = require('../engine.js');
let pass = 0, fail = 0;
const eq = (name, got, want, tol = 0.01) => {
  const ok = typeof want === 'number' ? Math.abs(got - want) <= tol : got === want;
  ok ? pass++ : fail++;
  console.log((ok ? '  ok   ' : '  FAIL ') + name + (ok ? '' : `  got ${got}, want ${want}`));
};

/* ---------- Deal Profitability Engine §7 worked example ---------- */
const deal = () => ({
  qty_buy: 30000, qty_sell: 30000, qty_unit: 'MT', qty_basis_buy: 'BL', qty_basis_sell: 'BL',
  price_buy: 690, price_sell: 722, currency: 'USD', incoterm_buy: 'FOB', incoterm_sell: 'CFR',
  proceeds_day: 30, finance_rate: 0.09, day_basis: 360, purchase_paid_day: 0, purchase_financed: true,
  demurrage_rate: 28000,
  lines: [
    { id: 'fr', category: 'FREIGHT', description: 'Freight', basis: 'PER_MT', rate: 18.5, payer: 'SELLER', borne_by_user: true, financed: true, paid_day: 0, tag: 'DOCUMENT' },
    { id: 'lc', category: 'FINANCE', description: 'LC issuance', basis: 'PCT_PURCHASE', rate: 0.2, payer: 'BUYER', borne_by_user: true, financed: false, paid_day: 0, tag: 'DOCUMENT' },
    { id: 'cf', category: 'FINANCE', description: 'Confirmation fee', basis: 'PCT_REVENUE', rate: 0.3, payer: 'SELLER', borne_by_user: true, financed: false, paid_day: 30, netted_from_proceeds: true, tag: 'DOCUMENT' },
    { id: 'bk', category: 'FINANCE', description: 'Bank charges', basis: 'LUMP_SUM', rate: 6000, payer: 'BUYER', borne_by_user: true, paid_day: 0, tag: 'DOCUMENT' },
    { id: 'in', category: 'INSPECTION', description: 'Inspection', basis: 'LUMP_SUM', rate: 9000, payer: 'BUYER', borne_by_user: true, paid_day: 0, tag: 'DOCUMENT' },
    { id: 'ag', category: 'OTHER', description: 'Agency', basis: 'LUMP_SUM', rate: 4000, payer: 'BUYER', borne_by_user: true, paid_day: 0, tag: 'DOCUMENT' }
  ]
});
console.log('Deal Profitability Engine');
const b = E.runDeal(deal());
eq('1 base net', b.net, 120207.50); eq('1 per MT', b.perMT, 4.01); eq('1 break-even', b.breakEven, 717.98);
eq('1 working capital', b.workingCapital, 21315400); eq('1 financing', b.financing, 159412.50);
eq('1 total costs', b.totalCosts, 839792.50); eq('1 margin %', b.margin * 100, 0.55, 0.005);
eq('1 ROC annualised %', b.rocAnnual * 100, 6.77, 0.005);
const sc = Object.fromEntries(E.runScenarios(deal()).map(s => [s.scenario.id, s.result]));
eq('2 optimistic', sc.optimistic.net, 240162.50);
eq('3 conservative financing', sc.conservative.financing, 213000); eq('3 conservative net', sc.conservative.net, -6380);
eq('4 stress financing', sc.stress.financing, 293493.75); eq('4 stress net', sc.stress.net, -391198.75);
eq('4 stress claim reserve', sc.stress.lines.find(l => l.id === 'sc_claim').amount, 53775);
const o = E.runDeal(deal(), { qty_sell: 29910 });
eq('5 outturn revenue', o.revenue, 21595020); eq('5 outturn conf fee', o.lines.find(l => l.id === 'cf').amount, 64785.06);
eq('5 outturn net', o.net, 55422.44); eq('5 outturn per MT', o.perMT, 1.85);
/* spec says re-run at 717.98 must be within 1.00 of zero; at 2 decimals that is off by ~31 (0.001 × 29,910),
   so the check runs at the unrounded break-even price */
const be = deal(); be.price_sell = b.breakEvenExact; eq('6 break-even net ≈ 0', Math.abs(E.runDeal(be).net) <= 1, true);
const dc = deal(); dc.incoterm_buy = 'CFR'; dc.price_buy = 690; dc.lines[0].rate = 18.5;
const dcr = E.runDeal(dc);
eq('7 double count excluded', dcr.excluded.length, 1); eq('7 warning raised', dcr.findings.some(f => f.severity === 'WARNING'), true);
eq('7 net without freight line', dcr.net, E.r2(120207.50 + 555000 + 555000 * 0.09 * 30 / 360));
const md = deal(); md.qty_unit = 'BBL';
const mdr = E.runDeal(md); eq('8 missing density not_assessed', mdr.status, 'not_assessed');
eq('8 names density', mdr.not_assessed.some(x => x.item === 'Density'), true);
const br = deal(); br.pricing_period_buy = 'Monthly average'; br.pricing_period_sell = '5 days around B/L';
eq('9 basis risk HIGH', E.runDeal(br).findings.some(f => f.severity === 'HIGH'), true);
const v = E.mtToVolumes(30000, 0.845); eq('10 m3', v.m3, 35502.96); eq('10 barrels', v.bbl, 223307, 1);
eq('11 determinism', JSON.stringify(E.runDeal(deal())), JSON.stringify(E.runDeal(deal())));
const s = E.sensitivities(deal());
eq('sens sale +1', s.sale_plus_1, 29910); eq('sens freight +1', s.freight_plus_1, -30225);
eq('sens delay +1', s.delay_plus_1, -5313.75); eq('sens demurrage +1', s.demurrage_plus_1, -28000);

/* ---------- Quality Intelligence §13 + v2 §18 ---------- */
console.log('Quality Intelligence');
const S = (value, extra = {}) => Object.assign({ name: 'Sulfur', unit: 'mg/kg', kind: 'mass_frac', safety: true, method: 'EN ISO 20846', value, value_unit: 'mg/kg' }, extra);
const L = (extra = {}) => Object.assign({ max: 10, unit: 'mg/kg' }, extra);
eq('1 pass 7.2', E.assessParam(S(7.2), L()).status, 'PASS');
const f = E.assessParam(S(11.5), L()); eq('2 fail 11.5', f.status, 'FAIL'); eq('2 deviation', f.deviation, 1.5); eq('2 critical', f.severity, 'CRITICAL');
eq('3 strict margin 10.4', E.assessParam(S(10.4), L(), 'STRICT').status, 'FAIL');
eq('4 precision band', E.assessParam(S(10.4, { reproducibility: 1.5 }), L(), 'PRECISION_BAND').status, 'REVIEW');
eq('5 contract tolerance', E.assessParam(S(10.4), L({ tolerance: 0.5 }), 'CONTRACT_TOLERANCE').status, 'PASS');
const u = E.assessParam(S(0.0008, { value_unit: '% m/m' }), L());
eq('6 unit conv value', u.actual.value, 8); eq('6 original unit kept', u.actual.original_unit, '% m/m'); eq('6 pass', u.status, 'PASS');
eq('7 API from 845', E.apiFromDensity(845), 35.8, 0.05);
const qc = (api) => E.assessQuality({ rule: 'STRICT', sets: { A: { label: 'Seller' } }, cert: { lab: 'X', tank: 'T1' },
  params: [{ id: 'density', name: 'Density', kind: 'density', value: 845, value_unit: 'kg/m3', limits: {} }, { id: 'api', name: 'API', value: api, limits: {} }] }).consistency_checks[0].result;
eq('7 API 35.9 match', qc(35.9), 'MATCH'); eq('7 API 33.0 conflict', qc(33.0), 'CONFLICT');
const nm = E.assessParam(S(7.2, { method: '' }), L()); eq('8 missing method REVIEW', nm.status, 'REVIEW'); eq('8 tag UNVERIFIED', nm.tag, 'UNVERIFIED');
const nr = E.assessParam(S(null), L()); eq('9 NOT_REPORTED', nr.status, 'NOT_REPORTED'); eq('9 HIGH (safety)', nr.severity, 'HIGH');
eq('9 no ON_SPEC with missing test', E.setVerdict([nr, E.assessParam(S(7.2), L())]), 'PARTIALLY_ASSESSED');
const ed = E.assessQuality({ sets: { B: { label: 'Buyer', standard: 'EN 590' } }, cert: { lab: 'X', tank: 'T1' }, params: [Object.assign(S(7.2), { limits: { B: L() } })] });
eq('10 edition unknown NOT_ASSESSED', ed.requirement_sets[0].verdict, 'NOT_ASSESSED'); eq('10 HOLD', ed.gate, 'HOLD');
const st = E.assessQuality({ sets: { A: { label: 'A' } }, cert: { lab: 'X', tank: 'T1', sample_date: '2026-10-01' }, deal: { load_date: '2026-10-13', max_cert_age_days: 5 }, params: [] });
eq('11 stale certificate MEDIUM', st.findings.some(x => /12 days old/.test(x.text) && x.severity === 'MEDIUM'), true);
const id = E.assessQuality({ sets: {}, cert: { lab: 'X', tank: 'T1' }, deal: { tank: 'T9' }, params: [] });
eq('12 identity CONFLICT', id.consistency_checks[0].result, 'CONFLICT'); eq('12 hard gate', id.gate, 'HOLD');
const ds = E.assessQuality({ sets: {}, cert: { lab: 'X', tank: 'T1' }, params: [{ id: 'dist50', name: 'Distillation 50%', value: 300, limits: {} }, { id: 'dist90', name: 'Distillation 90%', value: 280, limits: {} }] });
eq('13 distillation CONFLICT', ds.consistency_checks[0].result, 'CONFLICT');
const bl = E.blendMassBalance({ off_value: 18, good_value: 6, target: 9, total_mt: 10000 });
eq('14 blend fraction', bl.off_fraction, 0.25); eq('14 off MT', bl.off_mt, 2500); eq('14 good MT', bl.good_mt, 7500); eq('14 ESTIMATE', bl.tag, 'ESTIMATE');
const qa = E.qualityAdjustment({ limit: 10, per_unit_deduction: 0.4, rejection_above: 15, actual: 11.5, qty_mt: 30000 });
eq('15 deduction per MT', qa.per_mt, 0.6); eq('15 total', qa.total, 18000);
eq('15 net after deduction', E.runDeal(Object.assign(deal(), { quality_deduction_per_mt: 0.6 })).net, 102261.50);
eq('15 no formula → not quantifiable', E.qualityAdjustment({ actual: 11.5 }).status, 'not_quantifiable');
const ab = E.assessQuality({ sets: { A: { label: 'Seller' }, B: { label: 'Buyer' } }, cert: { lab: 'X', tank: 'T1' },
  params: [Object.assign(S(12), { limits: { A: L({ max: 15 }), B: L() } })] });
eq('v2 seller PASS / buyer FAIL', ab.requirement_sets.map(r => r.verdict).join(','), 'ON_SPEC,OFF_SPEC');
eq('v2 flash 48 vs min 55 FAIL', E.assessParam({ name: 'Flash point', kind: 'temp', safety: true, method: 'ISO 2719', value: 48, value_unit: '°C' }, { min: 55, unit: '°C' }).deviation, -7);
eq('v2 low-confidence → REVIEW', E.assessParam(S(7.2, { confidence: 0.5 }), L()).status, 'REVIEW');
eq('product recognition', E.recognizeProduct('EN590 10ppm ULSD'), 'diesel');
const q1 = { sets: { A: { label: 'A' } }, cert: { lab: 'X', tank: 'T1' }, params: [Object.assign(S(11), { limits: { A: L() } })] };
eq('19 determinism', JSON.stringify(E.assessQuality(q1)), JSON.stringify(E.assessQuality(q1)));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
