/**
 * Tests for scripts/to-insuranceplan.js
 *
 *   node --test scripts/to-insuranceplan.test.js
 *
 * Fails if the converter's output drifts from the golden files in examples/fhir/,
 * if output is not deterministic, if a plan-level source reference reaches a
 * benefit, if a benefit is lost, if fhir/definitions/ is out of date, if the
 * derived excluded-services extension lists the wrong benefits, or if a pharmacy
 * module field of the v1.2.0 draft 6 changes a Bundle.
 * Regenerate goldens on purpose with: node scripts/to-insuranceplan.js --write-golden
 */

'use strict';

const crypto = require('crypto');
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
// and 4 of them again the same day after the deductible flags on silent cells were set. The 2
// Medicare Advantage files read from Summaries of Benefits (Humana H1036-025, SCAN Classic) were
// re-pinned on 2026-10-21 when their accumulators moved to the tier id IN (schema 1.2.0 draft text).
// A change to any of them must be deliberate.
const GOLDEN_SHA256 = {
  'aetna-ppo-1500-80-50.json': '5b71acace40107ffd7783f7f2dfebb2abc6dc46a48a4b21bb5a384dde58ca69b',
  'aetna-ppo-5000-80-50.json': '03e16565b6de68a075cfecbe1341b3e8fb5ed3601bf0e64c45986366efddbab1',
  'ambetter-ca-silver-94-hmo.json': 'c121fbb145f060a0230e91837ed4f526a1c3bc16bc7fd7aea8fd3d39a57fcfae',
  'cigna-oap-bowdoin.json': 'e82c810f43f5e3f66425a3d28f87de55d8f18fabd19a66bbf53a5338b5609d04',
  'flblue-blueoptions-505.json': '579b1dd83c482d759cae849a629f0ccf10ff3de44ffc106ad62b2a08a61cb4af',
  'gatorcare-prime-epo.json': '3ea3d74c082269a1cfded8461d0fa35362c3b7019c86b2c002a50b7a078e9487',
  'humana-gold-plus-h1036-025-hmo.json': 'b6d1e3e225495a45ba8c5ab4d19d3dd8de9401cde7ba8eea852dddacb5e16dfd',
  'kaiser-ca-gold-80-hmo.json': 'a4af8116c546c33f39e65c08a4c3dc06a78dfed61346f8a4294b94bd45227b36',
  'scan-classic-hmo-los-angeles.json': '1eb465cabd0e156c66fff87ba86c99f0cb1081ea2ff047d29bd71555d963a078',
  'uhc-choice-plus-hsa-gold-1700.json': '4c385df53392d72d1b39dc74dbc07021f41945648a0aba1675153588c38ee19c',
};

// SHA-256 of the 5 Bundles converted from the PBP importer's golden files
// (examples/*.pbp.json), pinned 2026-10-06 when the converter learned the POS tier and
// re-pinned 2026-10-09 when 18b1, 18a1, 17a1 and 7f_2 gained canonical keys, and
// 2026-10-20 when the importer began reading 14a, the premium and the Section A
// contacts, and 7i gained a canonical key (medical MVP gaps G1 to G5), and 2026-10-24
// when the importer began reading the Part D files: each Bundle lists its Part D
// benefits as unmapped and gains the 2 pharmacy generalCost entries.
const PBP_BUNDLE_SHA256 = {
  'aarp-medicare-advantage-from-uhc-fl-0021-ppo-h2406-013-000.json': 'e7a545a724deb336266cd0420e9f0d69b76ee471417a9ad0f526114a3b738c3f',
  'aetna-medicare-select-extra-hmo-pos-h1609-028-000.json': 'd2a347778338aadd3f7b502eb1ae4bc29c96101e334474d5fdfe4518998a2f9d',
  'humana-gold-plus-h1036-068-hmo-h1036-068-000.json': 'a8c617a24120239fa58b905f6cb75f01717230424e22c524ca79617479586d5a',
  'scan-costco-medicare-advantage-hmo-h5425-140-000.json': '803f3e7337a756167b1348b5820fe130061b036cf9968449359df06c19355aed',
  'upmc-for-life-ppo-rx-choice-ppo-h5533-019-000.json': '9b8438a4f220e0645a133aee8fb7a672c673cdc79cfb69bf74957229a6b86313',
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

// ---- excluded-services, derived from coverage flags (spec 10.1) ------------------
const EXCLUDED = 'http://hl7.org/fhir/us/insurance-card/StructureDefinition/excluded-services';
const LABELS = Object.fromEntries(readJson(path.join(__dirname, '..', 'vocabularies', 'canonical-benefits.json')).benefits
  .map((b) => [b.canonical_key, b.label]));
const excludedTexts = (bps, options) => toInsurancePlanBundle(bps, options).entry[0].resource.extension
  .filter((e) => e.url === EXCLUDED)
  .flatMap((e) => e.extension.map((s) => s.extension.find((x) => x.url === 'serviceType').valueCodeableConcept.text));

test('excluded-services: a benefit not covered on any tier gets an entry; one not covered out of network only gets none', () => {
  const bps = readJson(path.join(EXAMPLES_DIR, 'unitedhealthcare-uhc-gold-standard.puf.json'));
  const before = excludedTexts(bps, { excludedServices: true });
  const specialist = bps.benefits.find((b) => b.canonical_key === 'specialist');
  const primary = bps.benefits.find((b) => b.canonical_key === 'primary_care');
  assert.ok(specialist.network_cost_shares.every((r) => r.covered) && primary.network_cost_shares.every((r) => r.covered));
  specialist.network_cost_shares.forEach((r) => { r.covered = false; r.cost_shares = []; });
  primary.network_cost_shares.find((r) => r.tier_id === 'OUT').covered = false;
  const after = excludedTexts(bps, { excludedServices: true });
  assert.strictEqual(after.length, before.length + 1);
  assert.ok(after.includes(LABELS.specialist), 'covered false on every tier: listed');
  assert.ok(!after.includes(LABELS.primary_care), 'covered false out of network only: not listed');
  const ext = toInsurancePlanBundle(bps, { excludedServices: true }).entry[0].resource.extension.find((e) => e.url === EXCLUDED);
  const entry = ext.extension.find((s) => s.extension[0].valueCodeableConcept.text === LABELS.specialist);
  assert.deepStrictEqual(entry, {
    extension: [
      { url: 'serviceType', valueCodeableConcept: { text: LABELS.specialist } },
      { url: 'description', valueString: "Derived from the plan's coverage flags in the CMS Benefits and Cost Sharing PUF, not from a printed Excluded Services section." },
    ],
    url: 'service',
  });
});

test('excluded-services: only with the option; on each Marketplace golden it lists every benefit not covered on any tier, in input order', () => {
  for (const file of fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.puf.json'))) {
    const bps = readJson(path.join(EXAMPLES_DIR, file));
    assert.deepStrictEqual(excludedTexts(bps), [], `${file}: no extension without the option`);
    const want = bps.benefits.filter((b) => b.network_cost_shares.length && b.network_cost_shares.every((r) => !r.covered))
      .map((b) => LABELS[b.canonical_key]);
    assert.deepStrictEqual(excludedTexts(bps, { excludedServices: true }), want, file);
    for (const key of ['dental_routine_adult', 'dental_basic_adult', 'dental_major_adult']) assert.ok(want.includes(LABELS[key]), `${file}: ${key}`);
  }
});

test('excluded-services: refused for a document not from the Benefits and Cost Sharing PUF, and for a key with no label', () => {
  for (const file of [...examples, ...pbpExampleFiles()]) {
    assert.throws(() => toInsurancePlanBundle(readJson(path.join(EXAMPLES_DIR, file)), { excludedServices: true }),
      /does not come from it/, file);
  }
  const bps = readJson(path.join(EXAMPLES_DIR, 'unitedhealthcare-uhc-gold-standard.puf.json'));
  bps.benefits.find((b) => b.canonical_key === 'acupuncture').canonical_key = 'not_in_the_vocabulary';
  assert.throws(() => toInsurancePlanBundle(bps, { excludedServices: true }), /has no label/);
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
  assert.strictEqual(pos.length, 12, '11 POS cost entries, and since 2026-10-20 the 14a preventive services one');
  assert.ok(pos.every((c) => c.applicability.coding[0].code === 'out-of-network' && !c.qualifiers[0].coding));
  // A benefit priced in network and at the POS option has no placeholder; primary care (IN only) has 1.
  assert.ok(specialist.every((c) => c.type.text !== 'Not stated in the BPS document'));
  const primary = benefits.find((b) => b.type.coding[1].code === 'primary_care').cost;
  assert.deepStrictEqual(primary.map((c) => c.type.text || c.type.coding[0].code), ['copay', 'Not stated in the BPS document']);
  // The deductible written to the POS tier reaches generalCost with its tier as text; the premium (since 2026-10-20) and the
  // Part D deductible and out-of-pocket threshold (since 2026-10-24) follow.
  assert.deepStrictEqual(plan.plan[0].generalCost.map((g) => g.type.text), ['Individual out-of-pocket maximum, IN', 'Individual deductible, POS', 'Premium',
    'Pharmacy deductible', 'Pharmacy out-of-pocket maximum']);
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

// ---- pharmacy module v0.2.1 documents (schema 1.2.0 draft 6) ---------------------
// The SBC InsurancePlan profile has no formulary, so the converter ignores the pharmacy
// module fields that core admits since draft 6, and cost_shares[].moop_ref with them.
// A benefit with a coverage stage (a Medicare Part D benefit) and a PDP document are
// the exceptions (docs/specs/pbp-part-d-mapping.md section 14, Question Q7).
const MODULE_EXAMPLES = path.join(__dirname, '..', 'modules', 'pharmacy', 'v0.2.1', 'examples');
const MODULE_PHARMACY_FIELDS = ['formulary_tiers', 'pharmacy_networks', 'formulary_items', 'formulary_reference', 'mail_order_supply_multiplier'];
const MODULE_BENEFIT_FIELDS = ['formulary_tier_id', 'pharmacy_network_id', 'day_supply', 'drug_examples', 'step_therapy_required', 'quantity_limit'];
const PDP_REFUSAL = /plan_type "PDP": a stand-alone Medicare Part D plan has no medical benefits, and the CARIN SBC InsurancePlan profile describes a medical plan/;

test('the commercial pharmacy module v0.2.1 example converts, and the module fields and moop_ref change nothing in the Bundle; the Part D one is a PDP and is refused', () => {
  const files = fs.readdirSync(MODULE_EXAMPLES).filter((f) => f.endsWith('.json')).sort();
  assert.deepStrictEqual(files, ['formulary_indication_example.json', 'humana_part_d_example.json']);
  assert.throws(() => toInsurancePlanBundle(readJson(path.join(MODULE_EXAMPLES, 'humana_part_d_example.json'))), PDP_REFUSAL);
  for (const file of ['formulary_indication_example.json']) {
    const bps = readJson(path.join(MODULE_EXAMPLES, file));
    const plan = toInsurancePlanBundle(bps).entry[0].resource;
    assert.strictEqual(plan.extension.filter((e) => e.url === UNMAPPED).length, 0, `${file}: every drug tier row is placed`);
    assert.strictEqual(plan.coverage.flatMap((c) => c.benefit).length, bps.benefits.length, file);
    const without = JSON.parse(JSON.stringify(bps));
    for (const k of MODULE_PHARMACY_FIELDS) delete without.pharmacy[k];
    for (const b of without.benefits) {
      for (const k of MODULE_BENEFIT_FIELDS) delete b[k];
      for (const row of b.network_cost_shares) for (const cs of row.cost_shares || []) delete cs.moop_ref;
    }
    assert.notDeepStrictEqual(without, bps, `${file} carries module fields`);
    assert.strictEqual(serialize(toInsurancePlanBundle(bps)), serialize(toInsurancePlanBundle(without)), file);
  }
});

// ---- Medicare Part D benefits and PDP documents (docs/specs/pbp-part-d-mapping.md section 14) ----
test('converter: Part D benefits are listed as unmapped, the pharmacy generalCost entries are kept, and a PDP document is not converted', () => {
  const bps = readJson(path.join(EXAMPLES_DIR, 'humana-humana-gold-plus-h1036-068.pbp.json'));
  const plan = toInsurancePlanBundle(bps).entry[0].resource;
  const rx = bps.benefits.filter((b) => b.coverage_stage_id).map((b) => b.benefit_id);
  assert.strictEqual(rx.length, 42);
  const unmapped = plan.extension.filter((e) => e.url === UNMAPPED).map((e) => subValue(e, 'benefitId'));
  const placed = plan.coverage.flatMap((c) => c.benefit).map((b) => subValue(b.extension.find((e) => e.url === BENEFIT), 'benefitId'));
  assert.deepStrictEqual(unmapped.filter((id) => rx.includes(id)), rx, 'every Part D benefit is unmapped, in document order');
  assert.ok(!placed.some((id) => rx.includes(id)), 'no Part D benefit is placed');
  assert.ok(bps.benefits.some((b) => b.coverage_stage_id && b.canonical_key === 'generic_drugs'), 'a key the CARIN crosswalk places is still unmapped');
  assert.deepStrictEqual(plan.plan[0].generalCost.map((g) => g.type.text).slice(-2), ['Pharmacy deductible', 'Pharmacy out-of-pocket maximum']);
  assert.deepStrictEqual(plan.plan[0].generalCost.slice(-2).map((g) => g.cost), [{ value: 700, currency: 'USD' }, { value: 2400, currency: 'USD' }]);
  assert.match(plan.text.div, /and 42 Part D benefits \(benefits with a coverage stage, which the SBC profile has no place for\) are listed, by identity only, in the bps-unmapped-benefit extension/);

  const pdp = readJson(path.join(EXAMPLES_DIR, 'unitedhealthcare-aarp-medicare-rx-preferred-from-uhc.pbp.json'));
  assert.strictEqual(pdp.plan_type, 'PDP');
  assert.throws(() => toInsurancePlanBundle(pdp), PDP_REFUSAL);
  assert.ok(!pbpExampleFiles().includes('unitedhealthcare-aarp-medicare-rx-preferred-from-uhc.pbp.json'), 'pbpExampleFiles() skips a PDP');
  const cli = spawnSync(process.execPath, [path.join(__dirname, 'to-insuranceplan.js'), path.join(EXAMPLES_DIR, 'wellcare-wellcare-value-script.pbp.json')], { encoding: 'utf8' });
  assert.strictEqual(cli.status, 1);
  assert.match(cli.stderr, /^error: plan_type "PDP": a stand-alone Medicare Part D plan has no medical benefits/);
});
