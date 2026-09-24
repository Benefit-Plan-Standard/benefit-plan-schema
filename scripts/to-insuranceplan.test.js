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

test('rejects unsupported schema versions and unknown tiers', () => {
  assert.throws(() => toInsurancePlanBundle({ schema_version: '1.0.0' }), /not supported/);
  const bps = readJson(path.join(EXAMPLES_DIR, examples[0]));
  bps.benefits[0].network_cost_shares[0].tier_id = 'NOPE';
  assert.throws(() => toInsurancePlanBundle(bps), /unknown tier_id/);
});
