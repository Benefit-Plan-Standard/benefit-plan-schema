/**
 * Tests for scripts/to-insuranceplan.js
 *
 *   node --test scripts/to-insuranceplan.test.js
 *
 * Fails if the converter's output drifts from the golden files in examples/fhir/,
 * if output is not deterministic, if a plan-level source reference reaches a
 * benefit, if a benefit is lost, or if fhir/definitions/ is out of date.
 * Regenerate goldens on purpose with: node scripts/to-insuranceplan.js --write-golden
 */

'use strict';

const crypto = require('crypto');
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { toInsurancePlanBundle, serialize, exampleFiles, EXAMPLES_DIR, GOLDEN_DIR } = require('./to-insuranceplan.js');
const { buildAll, OUT_DIR } = require('./build-fhir-definitions.js');

const SOURCE_REF = 'https://benefitplanstandard.org/fhir/StructureDefinition/bps-source-reference';
const UNMAPPED = 'https://benefitplanstandard.org/fhir/StructureDefinition/bps-unmapped-benefit';
const BENEFIT = 'https://benefitplanstandard.org/fhir/StructureDefinition/bps-benefit';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const normalize = (s) => s.replace(/\r\n/g, '\n');
const subValue = (ext, url) => (ext.extension.find((e) => e.url === url) || {}).valueString;

const examples = exampleFiles();

test('the corpus has all 10 examples', () => {
  assert.strictEqual(examples.length, 10);
});

for (const file of examples) {
  const bps = readJson(path.join(EXAMPLES_DIR, file));
  const bundle = toInsurancePlanBundle(bps);
  const plan = bundle.entry[0].resource;

  test(`${file}: output matches golden file`, () => {
    const golden = path.join(GOLDEN_DIR, plan.id + '.json');
    assert.ok(fs.existsSync(golden), `missing golden file examples/fhir/${plan.id}.json`);
    assert.strictEqual(serialize(bundle), normalize(fs.readFileSync(golden, 'utf8')),
      `examples/fhir/${plan.id}.json differs from converter output`);
  });

  test(`${file}: output is deterministic`, () => {
    assert.strictEqual(serialize(toInsurancePlanBundle(bps)), serialize(bundle));
  });

  test(`${file}: every benefit is placed or listed as unmapped, once`, () => {
    const placed = plan.coverage.flatMap((c) => c.benefit)
      .map((b) => subValue(b.extension.find((e) => e.url === BENEFIT), 'benefitId'));
    const unmapped = plan.extension.filter((e) => e.url === UNMAPPED).map((e) => subValue(e, 'benefitId'));
    assert.deepStrictEqual([...placed, ...unmapped].sort(), bps.benefits.map((b) => b.benefit_id).sort());
  });

  test(`${file}: benefit-level source references only where BPS has them`, () => {
    const benefitRefs = plan.coverage.flatMap((c) => c.benefit)
      .flatMap((b) => (b.extension || []).filter((e) => e.url === SOURCE_REF));
    const bpsHasBenefitRefs = bps.benefits.some((b) => (b.source_references || []).length > 0);
    if (!bpsHasBenefitRefs) assert.strictEqual(benefitRefs.length, 0);
    const planRefs = plan.extension.filter((e) => e.url === SOURCE_REF);
    assert.strictEqual(planRefs.length, (bps.source_references || []).length);
  });

  test(`${file}: every specificCost benefit has at least 2 cost entries`, () => {
    for (const sc of plan.plan[0].specificCost) {
      for (const b of sc.benefit) assert.ok(b.cost.length >= 2);
    }
  });
}

test('the 8 SBC examples carry no benefit-level source references', () => {
  const sbc = examples.map((f) => readJson(path.join(EXAMPLES_DIR, f))).filter((p) => p.market !== 'medicare_advantage');
  assert.strictEqual(sbc.length, 8);
  for (const bps of sbc) {
    const plan = toInsurancePlanBundle(bps).entry[0].resource;
    const refs = plan.coverage.flatMap((c) => c.benefit).flatMap((b) => (b.extension || []).filter((e) => e.url === SOURCE_REF));
    assert.strictEqual(refs.length, 0, `${bps.plan_id} has benefit-level source references`);
  }
});

test('no stray golden files', () => {
  const expected = examples.map((f) => toInsurancePlanBundle(readJson(path.join(EXAMPLES_DIR, f))).entry[0].resource.id + '.json').sort();
  const actual = fs.readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.json')).sort();
  assert.deepStrictEqual(actual, expected);
});

test('fhir/definitions matches the generator', () => {
  for (const [name, text] of Object.entries(buildAll())) {
    const p = path.join(OUT_DIR, name);
    assert.ok(fs.existsSync(p), `missing fhir/definitions/${name}`);
    assert.strictEqual(normalize(fs.readFileSync(p, 'utf8')), text, `fhir/definitions/${name} is out of date`);
  }
});

test('crosswalk codes and displays match the CARIN code system', () => {
  const crosswalk = readJson(path.join(__dirname, '..', 'fhir', 'carin-sbc-crosswalk.json'));
  const used = new Set(Object.values(crosswalk.map).flatMap((m) => [m.category, m.type]));
  for (const o of crosswalk.overrides) { used.add(o.category); used.add(o.type); }
  for (const code of used) assert.ok(crosswalk.displays[code], `no display for ${code}`);
});

// SHA-256 of each golden file (LF line endings) as committed before second
// in-network tiers were supported. A change to any of them must be deliberate.
const GOLDEN_SHA256 = {
  'aetna-ppo-1500-80-50.json': 'd4b33e607ef09d5f100714818028dce5700fd18fa76db0cef0df365a19dd3e73',
  'aetna-ppo-5000-80-50.json': '590744f92e4af6eed4d8df60dad1cf061927e3663ce4078f7595594fbf5f9805',
  'ambetter-ca-silver-94-hmo.json': '412de76539f620c2156e7cea7044f6247faf44c81b70fdb8501e9d39d0591c66',
  'cigna-oap-bowdoin.json': 'b6c0ad14a613564b64eb54d598dc45e1259ccc71e5d08fc8e670d818d23d5c6f',
  'flblue-blueoptions-505.json': '5ca5f94e584276d4a7275f9460d9f14b7cfb19e2565719f571b30ea6ab75465d',
  'gatorcare-prime-epo.json': 'f06cffd37128f91b2f0c47e1a0efadc7471af1a9733c9a0919312a9e14cd9006',
  'humana-gold-plus-h1036-025-hmo.json': 'f5ede6c8c787cdd8a2789bc188935289a4439ad9bb59183ac02eb62c755f84e4',
  'kaiser-ca-gold-80-hmo.json': '1077c983d3e5f4cc6051558b056fe67b4d609d6b75a3b9686d7a0f50b2acc73f',
  'scan-classic-hmo-los-angeles.json': 'fb58b0d4b50ee7d1654dfc686c201695bb11c835be6f2a09b70f0a521add9005',
  'uhc-choice-plus-hsa-gold-1700.json': '9d74e4c7c3b509b41cb87f7c2a43c73a6533848d0c85da14df0e3200f8d5dfbd',
};

test('the 10 golden files are byte-identical to the pinned versions, and the converter reproduces them', () => {
  const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  assert.deepStrictEqual(Object.keys(GOLDEN_SHA256).sort(), fs.readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.json')).sort());
  for (const [name, want] of Object.entries(GOLDEN_SHA256)) {
    assert.strictEqual(sha(normalize(fs.readFileSync(path.join(GOLDEN_DIR, name), 'utf8'))), want, `examples/fhir/${name} changed`);
  }
  for (const file of examples) {
    const bundle = toInsurancePlanBundle(readJson(path.join(EXAMPLES_DIR, file)));
    assert.strictEqual(sha(serialize(bundle)), GOLDEN_SHA256[bundle.entry[0].resource.id + '.json'], `${file} no longer converts to its pinned golden file`);
  }
});

// ---- second in-network tier (spec 6.2) --------------------------------------------
function withSecondTier(tier) {
  const bps = readJson(path.join(EXAMPLES_DIR, 'aetna_example.json'));
  bps.network_tiers.splice(1, 0, tier);
  const b = bps.benefits.find((x) => x.canonical_key === 'primary_care');
  b.network_cost_shares.splice(1, 0, {
    tier_id: tier.tier_id, covered: true,
    cost_shares: [{ type: 'copay', sequence: 1, amount: 60, applies_to_deductible: false }],
  });
  const plan = toInsurancePlanBundle(bps).entry[0].resource;
  const sc = plan.plan[0].specificCost.find((s) => s.category.coding[0].code === 'primary-care-visit');
  return sc.benefit[0].cost;
}

test('IN2 maps to in-network with a text-only qualifier carrying the tier name', () => {
  const cost = withSecondTier({ tier_id: 'IN2', name: 'In-Network Tier 2' });
  assert.deepStrictEqual(cost.map((c) => c.applicability.coding[0].code), ['in-network', 'in-network', 'out-of-network']);
  assert.strictEqual(cost[0].qualifiers, undefined);
  assert.deepStrictEqual(cost[1].qualifiers, [{ text: 'In-Network Tier 2' }]);
  assert.strictEqual(cost[1].value.value, 60);
  assert.ok(cost.every((c) => c.type.text !== 'Not stated in the BPS document'), 'IN, IN2 and OUT never get a placeholder');
});

test('a second in-network tier named "Value Choice" gets the value-choice code', () => {
  const cost = withSecondTier({ tier_id: 'IN2', name: 'Value Choice Providers' });
  assert.deepStrictEqual(cost[1].qualifiers, [{
    coding: [{ system: 'http://hl7.org/fhir/us/insurance-card/CodeSystem/cost-tier', code: 'value-choice', display: 'Value Choice Provider' }],
    text: 'Value Choice Providers',
  }]);
});

test('a second in-network tier is recognized by name, and other unknown network tiers still fail', () => {
  const cost = withSecondTier({ tier_id: 'PREF2', name: 'In Network Tier 2' });
  assert.strictEqual(cost[1].applicability.coding[0].code, 'in-network');
  assert.throws(() => withSecondTier({ tier_id: 'PREF', name: 'Preferred' }), /not IN, OUT or a second in-network tier/);
  assert.throws(() => withSecondTier({ tier_id: 'OON2', name: 'Out-of-Network Tier 2' }), /not IN, OUT or a second in-network tier/);
});

test('a benefit priced in IN and IN2 only has 2 in-network entries and no placeholder', () => {
  const bps = readJson(path.join(EXAMPLES_DIR, 'aetna_example.json'));
  bps.network_tiers.splice(1, 0, { tier_id: 'IN2', name: 'In-Network Tier 2' });
  const b = bps.benefits.find((x) => x.canonical_key === 'primary_care');
  b.network_cost_shares = [b.network_cost_shares[0], { tier_id: 'IN2', covered: true, cost_shares: [{ type: 'copay', sequence: 1, amount: 60 }] }];
  const sc = toInsurancePlanBundle(bps).entry[0].resource.plan[0].specificCost.find((s) => s.category.coding[0].code === 'primary-care-visit');
  assert.deepStrictEqual(sc.benefit[0].cost.map((c) => c.applicability.coding[0].code), ['in-network', 'in-network']);
});

test('the Florida Blue 1505 public-file document converts: tier 2 entries are in-network with the tier 2 qualifier, and there is no placeholder', () => {
  const bps = readJson(path.join(EXAMPLES_DIR, 'florida-blue-blueoptions-gold-1505.puf.json'));
  const plan = toInsurancePlanBundle(bps).entry[0].resource;
  const costs = plan.plan[0].specificCost.flatMap((s) => s.benefit).flatMap((b) => b.cost);
  const tier2 = costs.filter((c) => c.qualifiers && c.qualifiers[0].text === 'In-Network Tier 2');
  assert.ok(tier2.length > 0);
  assert.ok(tier2.every((c) => c.applicability.coding[0].code === 'in-network'));
  assert.strictEqual(costs.filter((c) => c.type.text === 'Not stated in the BPS document').length, 0);
});

test('rejects unsupported schema versions and unknown tiers', () => {
  assert.throws(() => toInsurancePlanBundle({ schema_version: '1.0.0' }), /not supported/);
  const bps = readJson(path.join(EXAMPLES_DIR, examples[0]));
  bps.benefits[0].network_cost_shares[0].tier_id = 'NOPE';
  assert.throws(() => toInsurancePlanBundle(bps), /unknown tier_id/);
});
