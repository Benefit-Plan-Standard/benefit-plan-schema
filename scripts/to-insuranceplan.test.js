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

const { toInsurancePlanBundle, serialize, exampleFiles, pbpExampleFiles, EXAMPLES_DIR, GOLDEN_DIR } = require('./to-insuranceplan.js');
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
  const expected = [...examples, ...pbpExampleFiles()]
    .map((f) => toInsurancePlanBundle(readJson(path.join(EXAMPLES_DIR, f))).entry[0].resource.id + '.json').sort();
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

// SHA-256 of each golden file (LF line endings). The 8 SBC files were re-pinned on
// 2026-10-05 after limits, deductible flags and conditions were read from the source PDFs,
// and 4 of them again the same day after the deductible flags on silent cells were set.
// A change to any of them must be deliberate.
const GOLDEN_SHA256 = {
  'aetna-ppo-1500-80-50.json': '5b71acace40107ffd7783f7f2dfebb2abc6dc46a48a4b21bb5a384dde58ca69b',
  'aetna-ppo-5000-80-50.json': '03e16565b6de68a075cfecbe1341b3e8fb5ed3601bf0e64c45986366efddbab1',
  'ambetter-ca-silver-94-hmo.json': 'c121fbb145f060a0230e91837ed4f526a1c3bc16bc7fd7aea8fd3d39a57fcfae',
  'cigna-oap-bowdoin.json': 'e82c810f43f5e3f66425a3d28f87de55d8f18fabd19a66bbf53a5338b5609d04',
  'flblue-blueoptions-505.json': '579b1dd83c482d759cae849a629f0ccf10ff3de44ffc106ad62b2a08a61cb4af',
  'gatorcare-prime-epo.json': '3ea3d74c082269a1cfded8461d0fa35362c3b7019c86b2c002a50b7a078e9487',
  'humana-gold-plus-h1036-025-hmo.json': 'f5ede6c8c787cdd8a2789bc188935289a4439ad9bb59183ac02eb62c755f84e4',
  'kaiser-ca-gold-80-hmo.json': 'a4af8116c546c33f39e65c08a4c3dc06a78dfed61346f8a4294b94bd45227b36',
  'scan-classic-hmo-los-angeles.json': 'fb58b0d4b50ee7d1654dfc686c201695bb11c835be6f2a09b70f0a521add9005',
  'uhc-choice-plus-hsa-gold-1700.json': '4c385df53392d72d1b39dc74dbc07021f41945648a0aba1675153588c38ee19c',
};

// SHA-256 of the 5 Bundles converted from the PBP importer's golden files
// (examples/*.pbp.json), pinned 2026-10-06 when the converter learned the POS tier.
const PBP_BUNDLE_SHA256 = {
  'aarp-medicare-advantage-from-uhc-fl-0021-ppo-h2406-013-000.json': 'cba2d9ea6ff995d581837ffcaf4fea1c9210d71178dc1d0b1ba65670babb58eb',
  'aetna-medicare-select-extra-hmo-pos-h1609-028-000.json': '44cc8069595a78147fb4fd3acfc9d2f00c95fa1efb9666c4c57f63824390d6dd',
  'humana-gold-plus-h1036-068-hmo-h1036-068-000.json': '441fe9846714206898be8ac6dd0ce2b26b008fed1db4ad600c3f03f51a8324c6',
  'scan-costco-medicare-advantage-hmo-h5425-140-000.json': 'ce122d5b576c6126bdb797b0994a39e9821219d576006dc7ca130bdc6d002cf2',
  'upmc-for-life-ppo-rx-choice-ppo-h5533-019-000.json': '34235b958c96e909ae24462d3c7f5952ebe0f9fdcb138d60c0d2a1567d8974a9',
};

test('the 10 golden files are byte-identical to the pinned versions, and the converter reproduces them', () => {
  const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  assert.deepStrictEqual([...Object.keys(GOLDEN_SHA256), ...Object.keys(PBP_BUNDLE_SHA256)].sort(),
    fs.readdirSync(GOLDEN_DIR).filter((f) => f.endsWith('.json')).sort());
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

// ---- PBP golden files and the point-of-service tier (spec 6.3) ------------------
test('the 5 PBP golden files convert to their pinned Bundles in examples/fhir/, twice the same', () => {
  const sha = (s) => crypto.createHash('sha256').update(s, 'utf8').digest('hex');
  const files = pbpExampleFiles();
  assert.strictEqual(files.length, 5);
  for (const file of files) {
    const bps = readJson(path.join(EXAMPLES_DIR, file));
    const text = serialize(toInsurancePlanBundle(bps));
    const name = toInsurancePlanBundle(bps).entry[0].resource.id + '.json';
    assert.strictEqual(text, normalize(fs.readFileSync(path.join(GOLDEN_DIR, name), 'utf8')), `examples/fhir/${name} differs from converter output`);
    assert.strictEqual(sha(text), PBP_BUNDLE_SHA256[name], `${file} no longer converts to its pinned Bundle`);
    assert.strictEqual(serialize(toInsurancePlanBundle(bps)), text);
  }
});

test('the POS tier (Aetna H1609-028 golden) maps to out-of-network with the "Point-of-service option" qualifier', () => {
  const bps = readJson(path.join(EXAMPLES_DIR, 'aetna-medicare-aetna-medicare-select-extra.pbp.json'));
  const plan = toInsurancePlanBundle(bps).entry[0].resource;
  const benefits = plan.plan[0].specificCost.flatMap((s) => s.benefit);
  const specialist = benefits.find((b) => b.type.coding[1].code === 'specialist').cost;
  assert.deepStrictEqual(specialist.map((c) => c.applicability.coding[0].code), ['in-network', 'out-of-network']);
  assert.strictEqual(specialist[0].qualifiers, undefined);
  assert.deepStrictEqual(specialist[1].qualifiers, [{ text: 'Point-of-service option' }]);
  assert.deepStrictEqual(specialist[1].value, { value: 70, unit: 'USD', system: 'urn:iso:std:iso:4217', code: 'USD' });
  assert.ok(specialist[1].extension.some((e) => e.url.endsWith('/deductible-applies') && e.valueBoolean === true));
  const pos = benefits.flatMap((b) => b.cost).filter((c) => c.qualifiers && c.qualifiers[0].text === 'Point-of-service option');
  assert.strictEqual(pos.length, 10);
  assert.ok(pos.every((c) => c.applicability.coding[0].code === 'out-of-network' && !c.qualifiers[0].coding));
  // A benefit priced in network and at the POS option has no placeholder; primary care (IN only) has 1.
  assert.ok(specialist.every((c) => c.type.text !== 'Not stated in the BPS document'));
  const primary = benefits.find((b) => b.type.coding[1].code === 'primary_care').cost;
  assert.deepStrictEqual(primary.map((c) => c.type.text || c.type.coding[0].code), ['copay', 'Not stated in the BPS document']);
  // The deductible written to the POS tier reaches generalCost with its tier as text.
  assert.deepStrictEqual(plan.plan[0].generalCost.map((g) => g.type.text), ['Individual out-of-pocket maximum, IN', 'Individual deductible, POS']);
});

test('only tier_id POS is the point-of-service tier: a network tier named "Point-of-Service" under another id still fails', () => {
  const pos = withSecondTier({ tier_id: 'POS', name: 'Point-of-Service', tier_class: 'network' });
  assert.strictEqual(pos[1].applicability.coding[0].code, 'out-of-network');
  assert.deepStrictEqual(pos[1].qualifiers, [{ text: 'Point-of-service option' }]);
  assert.throws(() => withSecondTier({ tier_id: 'POS2', name: 'Point-of-Service' }), /not IN, OUT or a second in-network tier/);
});

test('rejects unsupported schema versions and unknown tiers', () => {
  assert.throws(() => toInsurancePlanBundle({ schema_version: '1.0.0' }), /not supported/);
  const bps = readJson(path.join(EXAMPLES_DIR, examples[0]));
  bps.benefits[0].network_cost_shares[0].tier_id = 'NOPE';
  assert.throws(() => toInsurancePlanBundle(bps), /unknown tier_id/);
});
