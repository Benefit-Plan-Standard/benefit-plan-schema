/**
 * Tests for scripts/from-marketplace-puf.js
 *
 *   node --test scripts/from-marketplace-puf.test.js
 *
 * Fails if the importer's output drifts from the golden files examples/*.puf.json,
 * if output is not deterministic, if a benefit row is lost, if the CSV parser or
 * the cost-share grammar changes behavior, or if the crosswalk is inconsistent.
 * The golden comparisons need the public files in data/puf/<year>/ (git-ignored);
 * without them those tests are skipped and say so. Everything else always runs.
 * Regenerate goldens on purpose with: node scripts/from-marketplace-puf.js --write-golden
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const {
  CsvParser, parseCostShare, parseLimit, parseDollars, buildDocument, serialize, fileSlug,
  loadPlan, validateDocument, pufFiles, GOLDEN, EXAMPLES_DIR, DATA_DIR, CROSSWALK,
} = require('./from-marketplace-puf.js');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const normalize = (s) => s.replace(/\r\n/g, '\n');
const goldenFiles = () => fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.puf.json')).sort();

function parseAll(text, chunk) {
  const out = [];
  const p = new CsvParser((r) => out.push(r));
  for (let i = 0; i < text.length; i += chunk) p.write(text.slice(i, i + chunk));
  p.end();
  return out;
}

// ---- CSV ----------------------------------------------------------------------------
test('CSV: quoted commas, doubled quotes, line breaks, CRLF, BOM, any chunking', () => {
  const text = '﻿a,b,c\r\n1,"x, y","he said ""hi"""\r\n2,"line1\r\nline2",\r\n\r\n3,,last';
  const want = [['a', 'b', 'c'], ['1', 'x, y', 'he said "hi"'], ['2', 'line1\r\nline2', ''], ['3', '', 'last']];
  for (const chunk of [1, 2, 3, 7, 1000]) assert.deepStrictEqual(parseAll(text, chunk), want, `chunk ${chunk}`);
});

test('CSV: LF and CR record ends, unterminated quote is an error', () => {
  assert.deepStrictEqual(parseAll('a,b\nc,d\re,f\n', 4), [['a', 'b'], ['c', 'd'], ['e', 'f']]);
  assert.throws(() => parseAll('a,"open\n', 100), /inside a quoted field/);
});

// ---- cost-share grammar ----------------------------------------------------------------
test('cost-share grammar: copay column', () => {
  const r = (s) => parseCostShare(s, 'copay');
  assert.deepStrictEqual(r('$40.00').step, { type: 'copay', amount: 40, applies_to_deductible: false });
  assert.deepStrictEqual(r('$1,250.00 Copay').step, { type: 'copay', amount: 1250, applies_to_deductible: false });
  assert.deepStrictEqual(r('$500.00 Copay after deductible').step, { type: 'copay', amount: 500, applies_to_deductible: true });
  assert.strictEqual(r('$2000.00 Copay with deductible').wording, 'with');
  assert.deepStrictEqual(r('$250.00 Copay per Stay with deductible').step, { type: 'copay', amount: 250, basis: 'per_stay', applies_to_deductible: true });
  assert.deepStrictEqual(r('$75.00 Copay per Day before deductible').step, { type: 'copay', amount: 75, basis: 'per_day', applies_to_deductible: true });
  assert.deepStrictEqual(r('No Charge').step, { type: 'copay', amount: 0, applies_to_deductible: false });
  assert.deepStrictEqual(r('No Charge after deductible').step, { type: 'copay', amount: 0, applies_to_deductible: true });
  assert.strictEqual(r('Not Applicable').step, null);
  assert.strictEqual(r('').step, null);
});

test('cost-share grammar: coinsurance column', () => {
  const r = (s) => parseCostShare(s, 'coinsurance');
  assert.deepStrictEqual(r('25.00%').step, { type: 'coinsurance', rate: 0.25, applies_to_deductible: false });
  assert.deepStrictEqual(r('7.00% Coinsurance after deductible').step, { type: 'coinsurance', rate: 0.07, applies_to_deductible: true });
  assert.deepStrictEqual(r('No Charge after deductible').step, { type: 'coinsurance', rate: 0, applies_to_deductible: true });
  assert.strictEqual(r('100.00%').step.rate, 1);
});

test('cost-share grammar: anything else is an error that quotes the string', () => {
  for (const [s, col] of [['20%', 'copay'], ['$20.00', 'coinsurance'], ['$20 copay', 'copay'], ['20% Coinsurance', 'coinsurance'],
    ['20.00% Coinsurance with deductible', 'coinsurance'], ['$20.00 after deductible', 'copay'], ['150.00%', 'coinsurance'], ['See plan', 'copay']]) {
    const out = parseCostShare(s, col);
    assert.ok(out.error, `"${s}" in the ${col} column should be unreadable`);
    assert.ok(out.error.includes(`"${s}"`), 'the message quotes the string');
  }
});

test('limits and plan-attribute dollars', () => {
  assert.deepStrictEqual(parseLimit('35.0', 'Visit(s) per Year').limit, { type: 'visits', value: 35, period: 'per_year' });
  assert.deepStrictEqual(parseLimit('1.0', 'Item(s) per 3 Years').limit, { type: 'items', value: 1, period: 'per_3_years' });
  assert.deepStrictEqual(parseLimit('60', 'Days per Benefit Period').limit, { type: 'days', value: 60, period: 'per_benefit_period' });
  assert.deepStrictEqual(parseLimit('2', 'Lifetime visits').limit, { type: 'visits', value: 2, period: 'per_lifetime' });
  assert.strictEqual(parseLimit('', '').limit, null);
  assert.ok(parseLimit('', 'Visit(s) per 6 Months').error);
  assert.ok(parseLimit('3', 'Sometimes').error);
  assert.strictEqual(parseDollars('$6,000 ').value, 6000);
  assert.strictEqual(parseDollars('$12000 per group').value, 12000);
  assert.strictEqual(parseDollars('per person not applicable').value, null);
  assert.ok(parseDollars('about $5').error);
});

// ---- buildDocument on a small synthetic plan ---------------------------------------------
function syntheticPlan() {
  const plan = {
    BusinessYear: '2026', StateCode: 'TX', IssuerId: '99999', IssuerMarketPlaceMarketingName: 'Example Health (Test)',
    MarketCoverage: 'Individual', DentalOnlyPlan: 'No', StandardComponentId: '99999TX0010001', PlanMarketingName: 'Silver 1 (Demo)',
    PlanType: 'PPO', MetalLevel: 'Silver', PlanId: '99999TX0010001-01', PlanEffectiveDate: '1/1/2026', PlanExpirationDate: '12/31/2026',
    MedicalDrugDeductiblesIntegrated: 'No', MedicalDrugMaximumOutofPocketIntegrated: 'Yes',
    MEHBDedInnTier1Individual: '$1,000 ', MEHBDedInnTier1FamilyPerPerson: '$1000 per person', MEHBDedInnTier1FamilyPerGroup: '$2000 per group',
    TEHBInnTier1IndividualMOOP: '$9,000', TEHBInnTier1FamilyPerGroupMOOP: '$18000 per group', TEHBInnTier1FamilyPerPersonMOOP: 'per person not applicable',
    URLForSummaryofBenefitsCoverage: 'https://example.org/sbc.pdf',
  };
  const header = Object.keys(plan);
  const base = { PlanId: plan.PlanId, CopayInnTier2: '', CoinsInnTier2: '', IsEHB: 'Yes', QuantLimitOnSvc: '', LimitQty: '', LimitUnit: '', Exclusions: '', Explanation: '', IsExclFromInnMOOP: 'No', IsExclFromOonMOOP: 'No' };
  const rows = [
    { ...base, BenefitName: 'Specialist Visit', IsCovered: 'Covered', CopayInnTier1: '$50.00', CoinsInnTier1: 'Not Applicable', CopayOutofNet: 'Not Applicable', CoinsOutofNet: '40.00% Coinsurance after deductible', Explanation: 'Referral required.' },
    { ...base, BenefitName: 'Cochlear Implants', IsCovered: 'Not Covered', CopayInnTier1: '', CoinsInnTier1: '', CopayOutofNet: '', CoinsOutofNet: '' },
    { ...base, BenefitName: 'Skilled Nursing Facility', IsCovered: 'Covered', CopayInnTier1: '$300.00 Copay per Day with deductible', CoinsInnTier1: 'Not Applicable', CopayOutofNet: '', CoinsOutofNet: '', QuantLimitOnSvc: 'Yes', LimitQty: '25.0', LimitUnit: 'Days per Year' },
    { ...base, BenefitName: 'Acupuncture', IsCovered: '', CopayInnTier1: '', CoinsInnTier1: '', CopayOutofNet: '', CoinsOutofNet: '' },
  ];
  return { plan, header, rows };
}
const SOURCE = { planFile: 'plan-attributes-puf.csv', benefitsFile: 'benefits-and-cost-sharing-puf.csv', downloaded: '2026-10-05' };

test('buildDocument: mapping rules on a synthetic plan', () => {
  const { plan, header, rows } = syntheticPlan();
  const { doc, errors } = buildDocument(plan, header, rows, SOURCE);
  assert.deepStrictEqual(errors, []);
  assert.deepStrictEqual(validateDocument(doc), []);
  assert.strictEqual(doc.plan_id, 'EXAMPLE_HEALTH_SILVER_1');
  assert.strictEqual(doc.market, 'individual');
  assert.deepStrictEqual(doc.network_tiers.map((t) => t.tier_id), ['IN', 'OUT']);
  assert.deepStrictEqual(doc.accumulators.individual_deductible, { amount: 1000, currency: 'USD', network_tier: 'in-network', applies_to: 'medical' });
  assert.strictEqual(doc.accumulators.family_deductible.embedded, true);
  assert.strictEqual(doc.accumulators.family_oop_max.applies_to, 'integrated');
  assert.strictEqual(doc.accumulators.family_oop_max.embedded, false);
  const spec = doc.benefits.find((b) => b.canonical_key === 'specialist');
  assert.deepStrictEqual(spec.network_cost_shares[1].cost_shares, [{ type: 'coinsurance', sequence: 1, rate: 0.4, applies_to_deductible: true, applies_to_moop: true }]);
  assert.deepStrictEqual(spec.conditions, [{ type: 'explanation', description: 'Referral required.' }]);
  const snf = doc.benefits.find((b) => b.canonical_key === 'skilled_nursing_facility');
  assert.deepStrictEqual(snf.limits, [{ type: 'days', value: 25, period: 'per_year' }]);
  assert.strictEqual(snf.network_cost_shares.length, 1, 'a covered tier with two blank strings is omitted');
  assert.match(snf.network_cost_shares[0].cost_shares[0].notes, /with deductible/);
  const acu = doc.benefits.find((b) => b.canonical_key === 'acupuncture');
  assert.ok(acu.network_cost_shares.every((r) => r.covered === false), 'blank IsCovered reads as not covered');
  assert.ok(doc.source_references[0].excerpt.includes('99999TX0010001-01'), 'the HIOS plan ID is in source_references');
  assert.ok(doc.source_references.some((s) => s.excerpt.includes('Cochlear Implants (Not Covered)')), 'unmapped benefits are listed');
});

test('buildDocument: tier 2 appears only when the plan has tier 2 values', () => {
  const { plan, header, rows } = syntheticPlan();
  rows[0].CopayInnTier2 = '$80.00';
  const { doc } = buildDocument(plan, header, rows, SOURCE);
  assert.deepStrictEqual(doc.network_tiers.map((t) => t.tier_id), ['IN', 'IN2', 'OUT']);
  rows[0].CopayInnTier2 = 'Not Applicable';
  assert.deepStrictEqual(buildDocument(plan, header, rows, SOURCE).doc.network_tiers.map((t) => t.tier_id), ['IN', 'OUT']);
});

test('buildDocument: an unreadable string is an error, quoted, and no document is written', () => {
  const { plan, header, rows } = syntheticPlan();
  rows[0].CopayInnTier1 = '$50 per visit, waived if admitted';
  const { doc, errors } = buildDocument(plan, header, rows, SOURCE);
  assert.strictEqual(doc, null);
  assert.strictEqual(errors.length, 1);
  assert.match(errors[0], /Specialist Visit/);
  assert.ok(errors[0].includes('"$50 per visit, waived if admitted"'));
});

test('buildDocument: deterministic', () => {
  const a = syntheticPlan();
  const b = syntheticPlan();
  assert.strictEqual(serialize(buildDocument(a.plan, a.header, a.rows, SOURCE).doc), serialize(buildDocument(b.plan, b.header, b.rows, SOURCE).doc));
});

// ---- crosswalk -----------------------------------------------------------------------------
test('crosswalk: names unique, keys and categories in the vocabularies, counts right', () => {
  const canon = new Set(readJson(path.join(__dirname, '..', 'vocabularies', 'canonical-benefits.json')).benefits.map((b) => b.canonical_key));
  const cats = new Set(readJson(path.join(__dirname, '..', 'vocabularies', 'categories.json')).categories.map((c) => c.code));
  const names = CROSSWALK.map.map((r) => r.puf_benefit_name);
  assert.strictEqual(new Set(names).size, names.length);
  for (const r of CROSSWALK.map) {
    if (r.canonical_key) {
      assert.ok(canon.has(r.canonical_key), `${r.canonical_key} is not a canonical key`);
      assert.ok(r.category, `${r.puf_benefit_name} is mapped but has no category`);
    }
    if (r.category) assert.ok(cats.has(r.category), `${r.category} is not a category`);
  }
  const mapped = CROSSWALK.map.filter((r) => r.canonical_key).length;
  assert.deepStrictEqual(CROSSWALK.counts, { names: names.length, mapped, unmapped: names.length - mapped });
});

// ---- golden files --------------------------------------------------------------------------
test('the committed examples are the golden set', () => {
  assert.strictEqual(goldenFiles().length, GOLDEN.length);
});

for (const file of goldenFiles()) {
  test(`${file}: valid against the v1.1.0 schema`, () => {
    assert.deepStrictEqual(validateDocument(readJson(path.join(EXAMPLES_DIR, file))), []);
  });
}

function hasData(year) {
  try { pufFiles(DATA_DIR, year); return true; } catch (e) { return false; }
}

for (const g of GOLDEN) {
  const skip = hasData(g.year) ? false : `public files for plan year ${g.year} are not in data/puf/${g.year}/`;
  test(`PY${g.year} ${g.plan}: output matches golden file, deterministic, no row lost`, { skip }, async () => {
    const { plan, planHeader, rows, source } = await loadPlan({ year: g.year, plan: g.plan });
    const { doc, errors } = buildDocument(plan, planHeader, rows, source);
    assert.deepStrictEqual(errors, []);
    const golden = path.join(EXAMPLES_DIR, fileSlug(doc) + '.puf.json');
    assert.ok(fs.existsSync(golden), `missing golden file examples/${fileSlug(doc)}.puf.json`);
    assert.strictEqual(serialize(doc), normalize(fs.readFileSync(golden, 'utf8')), `examples/${fileSlug(doc)}.puf.json differs from importer output`);
    assert.strictEqual(serialize(buildDocument(plan, planHeader, rows, source).doc), serialize(doc));
    const listed = (doc.source_references.find((s) => s.excerpt.startsWith('Benefits and Cost Sharing PUF rows')) || { excerpt: '' }).excerpt;
    const unmapped = Number((/\((\d+)\):/.exec(listed) || [0, 0])[1]);
    assert.strictEqual(doc.benefits.length + unmapped, rows.length, 'every benefit row is emitted or listed as unmapped');
  });
}
