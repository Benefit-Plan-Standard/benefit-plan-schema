/**
 * Tests for schema/v1.2.0/benefit-plan.schema.json
 *
 *   node --test scripts/schema.test.js
 *
 * Fails if a document in examples/ stops validating against its own schema
 * version or against v1.2.0, or if the v1.2.0 draft's contacts object and
 * network_tiers[].provider_directory_url (added 2026-10-20) change shape.
 * Draft 6 (2026-10-24): fails if a pharmacy module v0.2.1 shape copied into core
 * differs from the module's, if the 2 module examples stop validating against
 * core or the module, or if cost_shares[].moop_ref stops matching deductible_ref.
 * Draft 7 (2026-11-01): core copies the module v0.2.2, so the checks above read that
 * version; fails if v0.2.2 differs from v0.2.1 by anything but
 * pharmacy.deductible.family_amount, if cost_shares[].min_amount and min_basis stop
 * mirroring max_amount and max_basis, or if network_cost_shares[].covered_under,
 * not_covered_reason or source_references[].document change shape or become required.
 * Draft 8 (2026-11-04): fails if limits[].unlimited stops pairing with a null value
 * (true takes null and null takes true), if type or value stops being required, or if
 * v1.1.0's limits change.
 * Draft 9 (2026-11-11): core copies the module v0.2.3, so the draft 6 checks read that
 * version and the draft 7 checks read v0.2.2; fails if v0.2.3 differs from v0.2.2 by
 * anything but the draft 9 changes (formulary_reference.formulary_version and
 * formulary_items_url; formulary_item coverage_basis, negotiation_selected_drug,
 * capped_benefit and source_references; drug_name and quantity_limit_detail.units no
 * longer required; a copy of core's source_reference), if a new property becomes
 * required, or if schema/v1.2.0/formulary.schema.json stops validating a list of
 * core formulary items.
 * v1.3.0 draft 1 (2026-11-27): fails if schema/v1.3.0 differs from v1.2.0 by anything but the 4
 * combined_* accumulator slots, their example and the descriptions; if a combined slot takes a
 * network_tier other than absent or null, or a per-network slot stops taking a tier id; if
 * deductible_ref and moop_ref stop naming 'combined' or change type; if a document of v1.2.0
 * (the examples, the pharmacy module examples, the formulary list) stops validating against
 * v1.3.0; or if schema/v1.3.0/formulary.schema.json differs from v1.2.0's by more than its $id.
 * Needs a local copy of Ajv (npm install ajv ajv-formats).
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const REPO = path.join(__dirname, '..');
const EXAMPLES_DIR = path.join(REPO, 'examples');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

function compile(version) {
  const Ajv2020 = require('ajv/dist/2020');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  require('ajv-formats')(ajv);
  return ajv.compile(readJson(path.join(REPO, 'schema', `v${version}`, 'benefit-plan.schema.json')));
}

const v120 = compile('1.2.0');
const errorsOf = (doc) => (v120(doc) ? [] : v120.errors.map((e) => `${e.instancePath || '(root)'} ${e.message}`));

const minimal = (extra = {}, tier = {}) => ({
  plan_id: 'TEST_PLAN',
  plan_name: 'Test plan',
  carrier: 'Test carrier',
  network_tiers: [{ tier_id: 'IN', name: 'In-Network', ...tier }],
  benefits: [],
  ...extra,
  schema_version: '1.2.0',
});

const v130 = compile('1.3.0');
const errorsOf130 = (doc) => (v130(doc) ? [] : v130.errors.map((e) => `${e.instancePath || '(root)'} ${e.message}`));

test('every document in examples/ validates against its own schema version and against v1.3.0, and one of v1.2.0 or before also against v1.2.0', () => {
  const files = fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.json')).sort();
  assert.ok(files.length >= 22, `only ${files.length} documents in examples/`);
  const own = {};
  for (const f of files) {
    const doc = readJson(path.join(EXAMPLES_DIR, f));
    own[doc.schema_version] = own[doc.schema_version] || compile(doc.schema_version);
    assert.ok(own[doc.schema_version](doc), `${f} fails its own v${doc.schema_version}`);
    assert.deepStrictEqual(errorsOf130(doc), [], `${f} fails v1.3.0`);
    if (doc.schema_version !== '1.3.0') assert.deepStrictEqual(errorsOf(doc), [], `${f} fails v1.2.0`);
  }
});

test('v1.2.0 draft: contacts holds a member services phone and a website, both optional', () => {
  assert.deepStrictEqual(errorsOf(minimal()), []);
  assert.deepStrictEqual(errorsOf(minimal({ contacts: {} })), []);
  assert.deepStrictEqual(errorsOf(minimal({ contacts: { member_services_phone: '(800)457-4708' } })), []);
  assert.deepStrictEqual(errorsOf(minimal({ contacts: { member_services_phone: '(800)457-4708', website: 'https://www.humana.com/medicare' } })), []);
  assert.ok(errorsOf(minimal({ contacts: { website: 'www.humana.com/medicare' } })).some((e) => e.includes('format "uri"')),
    'a website with no scheme is not a URI');
  assert.ok(errorsOf(minimal({ contacts: { fax: '1' } })).some((e) => e.includes('additional properties')), 'contacts has no other key');
  assert.ok(errorsOf(minimal({ contacts: { member_services_phone: 8004574708 } })).length > 0, 'the phone is a string');
});

test('v1.2.0 draft: network_tiers[].provider_directory_url is an optional URI', () => {
  assert.deepStrictEqual(errorsOf(minimal({}, { provider_directory_url: 'https://www.uhc.com/xfldocfindg2026' })), []);
  assert.ok(errorsOf(minimal({}, { provider_directory_url: 'AARPMedicarePlans.com' })).some((e) => e.includes('format "uri"')),
    'an address with no scheme is not a URI');
  assert.ok(errorsOf(minimal({}, { provider_directory_url: null })).length > 0, 'the field is a string, not null');
});

// ---- v1.2.0 draft 6: the pharmacy module in core (v0.2.1 then, v0.2.2 since draft 7, v0.2.3 since draft 9)
const CORE = readJson(path.join(REPO, 'schema', 'v1.2.0', 'benefit-plan.schema.json'));
const MODULE_DIR = path.join(REPO, 'modules', 'pharmacy', 'v0.2.3');
const MODULE = readJson(path.join(MODULE_DIR, 'pharmacy.schema.json'));
const MODULE_V022_DIR = path.join(REPO, 'modules', 'pharmacy', 'v0.2.2');
const MODULE_V022 = readJson(path.join(MODULE_V022_DIR, 'pharmacy.schema.json'));
const MODULE_V021_DIR = path.join(REPO, 'modules', 'pharmacy', 'v0.2.1');
const MODULE_V021 = readJson(path.join(MODULE_V021_DIR, 'pharmacy.schema.json'));
const COPIED = ['formulary_tier', 'pharmacy_network', 'coverage_stage', 'quantity_limit_detail',
  'formulary_item', 'coverage_exception', 'formulary_alternative'];

function compileModule(schema) {
  const Ajv2020 = require('ajv/dist/2020');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  require('ajv-formats')(ajv);
  return ajv.compile(schema);
}

// A schema with every description annotation removed, at every depth: what a validator checks.
// A property named description (formulary_tier has one) is an object, not a string, and stays.
function shape(s) {
  if (Array.isArray(s)) return s.map(shape);
  if (!s || typeof s !== 'object') return s;
  return Object.fromEntries(Object.entries(s)
    .filter(([k, v]) => !(k === 'description' && typeof v === 'string'))
    .map(([k, v]) => [k, shape(v)]));
}

test('v1.2.0 draft 6: the 8 pharmacy module shapes in core $defs are deep-equal to the module\'s (v0.2.3 since draft 9)', () => {
  for (const name of COPIED) assert.deepStrictEqual(CORE.$defs[name], MODULE.$defs[name], `$defs/${name}`);
  assert.deepStrictEqual(CORE.$defs.formulary_reference, MODULE.properties.pharmacy.properties.formulary_reference, '$defs/formulary_reference');
});

test('v1.2.0 draft 6: core pharmacy validates as the module\'s pharmacy, and the benefit extension fields have the module\'s types', () => {
  const core = CORE.properties.pharmacy;
  const mod = MODULE.properties.pharmacy;
  assert.deepStrictEqual(Object.keys(core.properties).sort(), Object.keys(mod.properties).sort());
  assert.strictEqual(core.additionalProperties, mod.additionalProperties);
  for (const [k, s] of Object.entries(mod.properties)) {
    const c = k === 'formulary_reference' ? CORE.$defs.formulary_reference : core.properties[k];
    assert.deepStrictEqual(shape(c), shape(s), `pharmacy.${k}`);
  }
  assert.strictEqual(core.properties.formulary_reference.$ref, '#/$defs/formulary_reference');
  for (const k of ['formulary_tiers', 'pharmacy_networks', 'formulary_items', 'mail_order_supply_multiplier']) {
    assert.ok(core.properties[k].description.startsWith(mod.properties[k].description), `pharmacy.${k} keeps the module's description`);
  }
  const benefit = CORE.properties.benefits.items.properties;
  const ext = MODULE.$defs.pharmacy_benefit_extension.properties;
  assert.strictEqual(Object.keys(ext).length, 7);
  for (const [k, s] of Object.entries(ext)) {
    assert.deepStrictEqual(shape(benefit[k]), shape(s), `benefits[].${k}`);
    if (s.description) assert.ok(benefit[k].description.startsWith(s.description), `benefits[].${k} keeps the module's description`);
    assert.ok(benefit[k].description.includes("Applies to benefit_type 'pharmacy'"), `benefits[].${k} says it applies to pharmacy benefits`);
  }
  assert.ok(!CORE.properties.benefits.items.required.some((k) => k in ext), 'no extension field is required');
});

test('v1.2.0 draft 6: cost_shares[].moop_ref says which out-of-pocket maximum applies_to_moop refers to, as deductible_ref does for the deductible', () => {
  const plan = (cs) => minimal({
    benefits: [{
      benefit_id: 'RX', benefit_type: 'pharmacy', category: 'PHARMACY', service_name: 'Tier 1',
      network_cost_shares: [{ tier_id: 'IN', covered: true, cost_shares: [{ type: 'copay', sequence: 1, amount: 0, ...cs }] }],
    }],
    pharmacy: { out_of_pocket_max: { amount: 2100 } },
  });
  assert.deepStrictEqual(errorsOf(plan({ applies_to_moop: true, moop_ref: 'pharmacy' })), [], 'a Part D row: the pharmacy maximum');
  assert.deepStrictEqual(errorsOf(plan({ applies_to_moop: true })), [], 'a medical row: nothing, the medical maximum');
  assert.deepStrictEqual(errorsOf(plan({ applies_to_moop: true, moop_ref: null })), [], 'null is the medical maximum');
  // Recommended values, not an enum: an unknown value is accepted, as deductible_ref accepts one, and a non-string is not.
  assert.deepStrictEqual(errorsOf(plan({ deductible_ref: 'dental' })), []);
  assert.deepStrictEqual(errorsOf(plan({ moop_ref: 'dental' })), []);
  assert.ok(errorsOf(plan({ deductible_ref: 1 })).some((e) => e.includes('deductible_ref')));
  assert.ok(errorsOf(plan({ moop_ref: 1 })).some((e) => e.includes('moop_ref')));
  const cs = CORE.properties.benefits.items.properties.network_cost_shares.items.properties.cost_shares.items.properties;
  assert.deepStrictEqual(shape(cs.moop_ref), shape(cs.deductible_ref));
  assert.deepStrictEqual(cs.applies_to_moop, { type: 'boolean', default: true }, 'applies_to_moop is untouched');
  assert.ok(cs.moop_ref.description.includes("Absent or null means the plan's medical maximum"));
});

test('v1.2.0 draft 6: the 2 pharmacy module examples of v0.2.1, v0.2.2 and v0.2.3 validate against core and against the 3 module versions', () => {
  const modules = [compileModule(MODULE), compileModule(MODULE_V022), compileModule(MODULE_V021)];
  for (const dir of [path.join(MODULE_DIR, 'examples'), path.join(MODULE_V022_DIR, 'examples'), path.join(MODULE_V021_DIR, 'examples')]) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
    assert.deepStrictEqual(files, ['formulary_indication_example.json', 'humana_part_d_example.json']);
    for (const f of files) {
      const doc = readJson(path.join(dir, f));
      assert.deepStrictEqual(errorsOf(doc), [], `${f} fails core v1.2.0`);
      for (const m of modules) assert.ok(m(doc), `${f} fails a module version: ${JSON.stringify(m.errors)}`);
    }
    // The Part D example counts every cost share toward the Part D threshold; the commercial one leaves moop_ref out.
    const steps = (doc) => doc.benefits.flatMap((b) => b.network_cost_shares).flatMap((r) => r.cost_shares || []);
    const partD = readJson(path.join(dir, 'humana_part_d_example.json'));
    assert.ok(partD.pharmacy.out_of_pocket_max && !partD.accumulators, 'the PDP cap is the pharmacy maximum');
    assert.deepStrictEqual(steps(partD).map((cs) => cs.moop_ref), Array(6).fill('pharmacy'));
    assert.ok(steps(readJson(path.join(dir, 'formulary_indication_example.json'))).every((cs) => cs.moop_ref === undefined));
  }
});

// ---- v1.2.0 draft 7: the fields from the GatorCare Prime EPO 2026 pharmacy SBC -------
const ROW = CORE.properties.benefits.items.properties.network_cost_shares.items;
const STEP = ROW.properties.cost_shares.items;

test('v1.2.0 draft 7: the pharmacy module v0.2.2 validates as v0.2.1 plus pharmacy.deductible.family_amount, and v0.2.1 stays as it was', () => {
  const bare = (s) => { const { $id, title, ...rest } = shape(s); return rest; };
  const next = bare(MODULE_V022);
  const { family_amount, ...others } = next.properties.pharmacy.properties.deductible.properties;
  assert.deepStrictEqual(family_amount, { type: ['number', 'null'], default: null });
  next.properties.pharmacy.properties.deductible.properties = others;
  assert.deepStrictEqual(next, bare(MODULE_V021));
  assert.strictEqual(MODULE_V022.$id, 'https://benefitplanstandard.org/modules/pharmacy/v0.2.2/pharmacy.schema.json');
  assert.strictEqual(MODULE_V021.$id, 'https://benefitplanstandard.org/modules/pharmacy/v0.2.1/pharmacy.schema.json');
  // Since draft 9 core copies v0.2.3 (the draft 9 tests below); the description keeps the history.
  assert.ok(CORE.properties.pharmacy.description.includes('v0.2.2 since draft 7'));
});

test('v1.2.0 draft 7: pharmacy.deductible.family_amount is an optional number or null, in core and in the module', () => {
  const doc = (d) => minimal({ pharmacy: { deductible: { amount: 125, ...d } } });
  const mod = compileModule(MODULE);
  for (const d of [{}, { family_amount: 500 }, { family_amount: null }]) {
    assert.deepStrictEqual(errorsOf(doc(d)), [], JSON.stringify(d));
    assert.ok(mod(doc(d)), JSON.stringify(d));
  }
  assert.ok(errorsOf(doc({ family_amount: '500' })).some((e) => e.includes('family_amount')));
  assert.ok(!mod(doc({ family_amount: '500' })));
  assert.ok(!compileModule(MODULE_V021)(doc({ family_amount: 500 })), 'v0.2.1 has no such field, which is why this is v0.2.2');
  const { description } = CORE.properties.pharmacy.properties.deductible.properties.family_amount;
  assert.ok(description.includes('$125 Individual/$500 Family Pharmacy Calendar Year Deductible'));
  assert.ok(description.includes('Absent or null means'));
});

test('v1.2.0 draft 7: cost_shares[].min_amount and min_basis mirror max_amount and max_basis', () => {
  const plan = (cs) => minimal({
    benefits: [{
      benefit_id: 'RX', benefit_type: 'pharmacy', category: 'PHARMACY', service_name: 'Tier 1',
      network_cost_shares: [{ tier_id: 'IN', covered: true, cost_shares: [{ type: 'coinsurance', sequence: 1, rate: 0.25, ...cs }] }],
    }],
  });
  assert.deepStrictEqual(errorsOf(plan({ min_amount: 10, min_basis: 'per_34_day_supply', max_amount: 20, max_basis: 'per_34_day_supply' })), [], '25% with a $10 floor and a $20 cap');
  assert.deepStrictEqual(errorsOf(plan({ min_amount: 10 })), [], 'a floor with no cap');
  assert.deepStrictEqual(errorsOf(plan({ min_amount: null, min_basis: null })), [], 'null is no floor');
  assert.deepStrictEqual(errorsOf(plan({})), [], 'absent is no floor');
  assert.ok(errorsOf(plan({ min_amount: '10' })).some((e) => e.includes('min_amount')));
  assert.ok(errorsOf(plan({ min_basis: 1 })).some((e) => e.includes('min_basis')));
  assert.deepStrictEqual(shape(STEP.properties.min_amount), shape(STEP.properties.max_amount));
  assert.deepStrictEqual(shape(STEP.properties.min_basis), shape(STEP.properties.max_basis));
  assert.ok(STEP.properties.min_amount.description.includes('25% Coinsurance with $10 Min. to $20 Max.'));
  assert.ok(STEP.properties.min_amount.description.includes('Absent or null means'));
});

test('v1.2.0 draft 7: network_cost_shares[].covered_under and not_covered_reason take the recommended values and are not enums', () => {
  const plan = (row) => minimal({
    benefits: [{ benefit_id: 'B', category: 'PHARMACY', service_name: 'A row', network_cost_shares: [{ tier_id: 'IN', covered: false, ...row }] }],
  });
  const { covered_under, not_covered_reason } = ROW.properties;
  const benefitType = CORE.properties.benefits.items.properties.benefit_type.description;
  for (const v of ['medical', 'pharmacy', 'dental', 'vision', 'behavioral_health']) {
    assert.deepStrictEqual(errorsOf(plan({ covered_under: v })), [], v);
    assert.ok(covered_under.description.includes(`'${v}'`), v);
    assert.ok(benefitType.includes(`'${v}'`), `${v} is a benefit_type value`);
  }
  for (const v of ['excluded', 'not_filed', 'covered_under_other_benefit', 'not_stated']) {
    assert.deepStrictEqual(errorsOf(plan({ not_covered_reason: v })), [], v);
    assert.ok(not_covered_reason.description.includes(`'${v}'`), v);
  }
  assert.deepStrictEqual(errorsOf(plan({ not_covered_reason: 'excluded', covered_under: null })), [], 'excluded, and the document names no other benefit');
  assert.deepStrictEqual(errorsOf(plan({})), [], 'absent, the reading before draft 7');
  // Recommended values, not an enum: an unknown value is accepted, and a non-string is not.
  assert.deepStrictEqual(errorsOf(plan({ covered_under: 'hearing', not_covered_reason: 'other' })), []);
  assert.ok(errorsOf(plan({ covered_under: 1 })).some((e) => e.includes('covered_under')));
  assert.ok(errorsOf(plan({ not_covered_reason: false })).some((e) => e.includes('not_covered_reason')));
  // The field says where the document points, not that the other benefit pays (Oct 31).
  assert.ok(covered_under.description.includes('not a statement that the other benefit pays'));
});

test('v1.2.0 draft 7: source_references[].document names the document a citation is in, at plan level and on a benefit', () => {
  const ref = (d) => ({ ...d, page_number: 4, excerpt: 'A quote.' });
  const plan = (d) => minimal({
    source_references: [ref(d)],
    benefits: [{ benefit_id: 'B', category: 'PHARMACY', service_name: 'A row', network_cost_shares: [{ tier_id: 'IN', covered: true }], source_references: [ref(d)] }],
  });
  for (const d of [{}, { document: 'gatorcare_pharmacy_sbc_2026.pdf' }, { document: null }]) {
    assert.deepStrictEqual(errorsOf(plan(d)), [], JSON.stringify(d));
  }
  const wrong = errorsOf(plan({ document: 4 }));
  assert.ok(wrong.some((e) => e.startsWith('/source_references/0/document')), 'plan level');
  assert.ok(wrong.some((e) => e.startsWith('/benefits/0/source_references/0/document')), 'benefit level');
  assert.ok(errorsOf(plan({ file: 'x' })).some((e) => e.includes('additional properties')), 'a citation has no other new key');
  assert.ok(CORE.$defs.source_reference.properties.document.description.includes("Absent or null means the plan's 1 source document"));
});

test('v1.2.0 draft 7: examples/gatorcare_example.json carries the new fields, and every citation names 1 of its 2 source PDFs', () => {
  const doc = readJson(path.join(EXAMPLES_DIR, 'gatorcare_example.json'));
  const benefit = (id) => doc.benefits.find((b) => b.benefit_id === id);
  assert.strictEqual(doc.schema_version, '1.2.0');
  assert.strictEqual(doc.market, undefined, 'neither SBC states the market');
  for (const id of ['AMBULANCE', 'PRENATAL_OFFICE_VISITS', 'DURABLE_MEDICAL_EQUIPMENT']) assert.strictEqual(benefit(id).benefit_type, 'medical', id);
  assert.deepStrictEqual(doc.pharmacy.deductible, { amount: 125, family_amount: 500, currency: 'USD', period: 'per_calendar_year', applies_to_tiers: ['T2', 'T3', 'T4', 'T5'] });
  assert.strictEqual(doc.pharmacy.out_of_pocket_max, undefined, 'the pharmacy SBC combines the maximum with the medical one');
  assert.deepStrictEqual(doc.pharmacy.formulary_tiers.map((t) => t.tier_id), ['T0', 'T1', 'T2', 'T3', 'T4', 'T5']);

  const t1 = benefit('RX_T1_RETAIL_34').network_cost_shares[0].cost_shares[0];
  assert.deepStrictEqual([t1.rate, t1.min_amount, t1.min_basis, t1.max_amount, t1.max_basis], [0.25, 10, 'per_34_day_supply', 20, 'per_34_day_supply']);
  assert.strictEqual(t1.applies_to_deductible, false);
  const t2 = benefit('RX_T2_EXTENDED_90').network_cost_shares[0].cost_shares[0];
  assert.deepStrictEqual([t2.min_amount, t2.max_amount, t2.max_basis, t2.deductible_ref, t2.moop_ref], [62.5, 125, 'per_90_day_supply', 'pharmacy', 'medical']);
  assert.ok(!doc.benefits.some((b) => b.formulary_tier_id && !['T0', 'T1', 'T2', 'T4'].includes(b.formulary_tier_id) && b.day_supply === 90), 'the SBC prints no 90-day row for T3 or T5');

  const row = (id) => benefit(id).network_cost_shares[0];
  assert.deepStrictEqual([row('RX_INSULIN_PUMPS').covered, row('RX_INSULIN_PUMPS').not_covered_reason, row('RX_INSULIN_PUMPS').covered_under], [false, 'covered_under_other_benefit', 'medical']);
  assert.deepStrictEqual([row('RX_PHYSICIAN_ADMINISTERED').covered, row('RX_PHYSICIAN_ADMINISTERED').not_covered_reason, row('RX_PHYSICIAN_ADMINISTERED').covered_under], [false, 'excluded', null]);
  assert.strictEqual(row('RX_VACCINES_PHARMACIST').covered, true);
  assert.strictEqual(row('RX_VACCINES_OTHER_METHODS').covered_under, 'medical');
  for (const id of ['GENERIC_DRUGS', 'PREFERRED_BRAND_DRUGS', 'NONPREFERRED_BRAND_DRUGS', 'SPECIALTY_DRUGS']) {
    assert.strictEqual(benefit(id).benefit_type, 'medical', id);
    assert.ok(benefit(id).network_cost_shares.every((r) => !r.covered && r.covered_under === 'pharmacy'), id);
  }

  const refs = [...doc.source_references, ...doc.benefits.flatMap((b) => b.source_references || [])];
  assert.strictEqual(refs.length, 48);
  const pdfs = [...new Set(refs.map((r) => r.document))].sort();
  assert.deepStrictEqual(pdfs, ['gatorcare_pharmacy_sbc_2026.pdf', 'gatorcare_prime_2026_sbc.pdf']);
  for (const pdf of pdfs) assert.ok(fs.existsSync(path.join(EXAMPLES_DIR, 'sources', pdf)), pdf);
  assert.ok(refs.every((r) => Number.isInteger(r.page_number) && r.excerpt));
  // The specialty prior authorization names no tier: once, at plan level, and not on T3 or T5.
  const pa = refs.filter((r) => r.excerpt.includes('will now require prior authorization'));
  assert.strictEqual(pa.length, 1);
  assert.ok(doc.source_references.includes(pa[0]));
  assert.strictEqual(pa[0].page_number, 9);
});

test('v1.2.0 draft 7: every new property is optional', () => {
  assert.deepStrictEqual(CORE.properties.pharmacy.properties.deductible.required, ['amount']);
  assert.deepStrictEqual(MODULE.properties.pharmacy.properties.deductible.required, ['amount']);
  assert.deepStrictEqual(STEP.required, ['type', 'sequence']);
  assert.deepStrictEqual(ROW.required, ['tier_id', 'covered']);
  assert.strictEqual(CORE.$defs.source_reference.required, undefined);
});

// ---- v1.2.0 draft 8: a limit that the source states as "no limit" -----------------------
const LIMIT = CORE.properties.benefits.items.properties.limits.items;
const V110_LIMIT = readJson(path.join(REPO, 'schema', 'v1.1.0', 'benefit-plan.schema.json')).properties.benefits.items.properties.limits.items;

test('v1.2.0 draft 8: limits[].unlimited true takes value null, and value null takes unlimited true', () => {
  const plan = (l) => minimal({
    benefits: [{ benefit_id: 'MEALS', category: 'MEALS', service_name: 'Meal benefit', network_cost_shares: [{ tier_id: 'IN', covered: true }], limits: [l] }],
  });
  const at = '/benefits/0/limits/0';
  assert.deepStrictEqual(errorsOf(plan({ type: 'dollars', value: null, unlimited: true, raw_text: 'Maximum plan benefit coverage: pbp_b13c_maxplan_yn "2" (no maximum).' })), [], 'no maximum');
  assert.deepStrictEqual(errorsOf(plan({ type: 'trips', value: null, unlimited: true })), [], 'unlimited trips, no raw_text');
  for (const u of [{}, { unlimited: false }, { unlimited: null }]) {
    assert.deepStrictEqual(errorsOf(plan({ type: 'dollars', value: 200, period: 'per_year', ...u })), [], `a limit with a value, ${JSON.stringify(u)}`);
    assert.ok(errorsOf(plan({ type: 'dollars', value: null, ...u })).includes(`${at}/value must be number`), `value null needs unlimited true, ${JSON.stringify(u)}`);
  }
  assert.ok(errorsOf(plan({ type: 'dollars', value: 200, unlimited: true })).includes(`${at}/value must be null`), 'unlimited true takes no number');
  assert.ok(errorsOf(plan({ type: 'dollars', unlimited: true })).includes(`${at} must have required property 'value'`), 'value stays required');
  assert.ok(errorsOf(plan({ value: null, unlimited: true })).includes(`${at} must have required property 'type'`), 'type stays required');
  assert.ok(errorsOf(plan({ type: 'dollars', value: null, unlimited: 'yes' })).includes(`${at}/unlimited must be boolean,null`));
  assert.deepStrictEqual(LIMIT.required, ['type', 'value']);
  assert.deepStrictEqual(shape(LIMIT.properties.unlimited), { type: ['boolean', 'null'] });
  assert.ok(LIMIT.properties.unlimited.description.includes('pbp_b13c_maxplan_yn'));
  assert.ok(LIMIT.properties.unlimited.description.includes('Absent, null or false means the entry is a limit with a numeric value'));
});

test('v1.2.0 draft 8: v1.1.0 is untouched, and every other limits property is as in draft 7', () => {
  assert.deepStrictEqual(shape(V110_LIMIT.properties.value), { type: 'number' });
  assert.ok(!('unlimited' in V110_LIMIT.properties));
  assert.strictEqual(V110_LIMIT.if, undefined);
  const { value, unlimited, ...rest } = shape(LIMIT).properties;
  assert.deepStrictEqual(Object.keys(rest), ['type', 'period', 'scope', 'shared_limit_id', 'carryover', 'raw_text']);
  assert.deepStrictEqual(value, { type: ['number', 'null'] });
  assert.ok(CORE.description.includes('Draft 8, on 2026-11-04, adds 1 optional property, limits[].unlimited'));
});

// ---- v1.2.0 draft 9: the CMS monthly Part D formulary files (pharmacy module v0.2.3) ----
const ITEM = CORE.$defs.formulary_item;
const QL = CORE.$defs.quantity_limit_detail;
const FREF = CORE.$defs.formulary_reference;
const DRAFT9_ITEM = ['coverage_basis', 'negotiation_selected_drug', 'capped_benefit', 'source_references'];
const DRAFT9_FREF = ['formulary_version', 'formulary_items_url'];

// An item as the formulary importer writes it from a Basic Drugs row: no drug name, a
// quantity limit with no unit, and the row quoted.
const partDItem = (extra = {}) => ({
  rxcui: '1551300', ndc: '00002143380', formulary_tier_id: 'T3', covered: true,
  prior_authorization: true, step_therapy: false, quantity_limit: { value: 2, period: 'per_28_days' },
  coverage_basis: 'medicare_covered', negotiation_selected_drug: false,
  source_references: [{ document: '2027_20261008.zip', excerpt: 'basic drugs formulary file  20261031.txt: 00027000|8|2027|1551300|00002143380|3|Y|2|28|Y|N|N' }],
  ...extra,
});
const withItems = (items, ref = {}) => minimal({
  pharmacy: {
    formulary_tiers: [{ tier_id: 'T1', name: 'Tier 1' }, { tier_id: 'T3', name: 'Tier 3' }],
    formulary_items: items,
    formulary_reference: { formulary_id: '00027000', ...ref },
  },
});

test('v1.2.0 draft 9: the pharmacy module v0.2.3 validates as v0.2.2 plus the draft 9 changes, and v0.2.2 stays as it was', () => {
  const bare = (s) => { const { $id, title, ...rest } = shape(s); return rest; };
  const next = bare(MODULE);
  const item = next.$defs.formulary_item;
  for (const k of DRAFT9_ITEM) delete item.properties[k];
  assert.deepStrictEqual(item.required, ['rxcui', 'formulary_tier_id', 'covered']);
  item.required = ['rxcui', 'drug_name', 'formulary_tier_id', 'covered'];
  assert.deepStrictEqual(next.$defs.quantity_limit_detail.required, ['value']);
  next.$defs.quantity_limit_detail.required = ['value', 'units'];
  const fref = next.properties.pharmacy.properties.formulary_reference;
  for (const k of DRAFT9_FREF) delete fref.properties[k];
  delete next.$defs.source_reference;
  assert.deepStrictEqual(next, bare(MODULE_V022));
  assert.strictEqual(MODULE.$id, 'https://benefitplanstandard.org/modules/pharmacy/v0.2.3/pharmacy.schema.json');
  assert.ok(CORE.properties.pharmacy.description.includes('modules/pharmacy/v0.2.3/pharmacy.schema.json'));
  assert.deepStrictEqual(CORE.$defs.source_reference, MODULE.$defs.source_reference, 'the module copies core\'s source_reference');
  assert.ok(CORE.description.includes('Draft 9, on 2026-11-11, makes room for the CMS monthly Part D formulary files'));
});

test('v1.2.0 draft 9: a Part D formulary item with no drug name and a quantity limit with no unit is valid, in core and in the module', () => {
  const mod = compileModule(MODULE);
  for (const doc of [withItems([partDItem()]), withItems([partDItem({ quantity_limit: { value: 0.5, period: null } })])]) {
    assert.deepStrictEqual(errorsOf(doc), []);
    assert.ok(mod(doc), JSON.stringify(mod.errors));
  }
  assert.ok(!compileModule(MODULE_V022)(withItems([partDItem({ coverage_basis: undefined, negotiation_selected_drug: undefined, source_references: undefined })])),
    'v0.2.2 requires drug_name and units, which is why this is v0.2.3');
  // A v0.2.2 item, with a name and a unit, is still valid.
  assert.deepStrictEqual(errorsOf(withItems([{ rxcui: '314076', drug_name: 'lisinopril 10 mg oral tablet', formulary_tier_id: 'T1', covered: true, quantity_limit: { value: 30, units: 'tablets', period: 'per_30_days' } }])), []);
  assert.ok(errorsOf(withItems([partDItem({ rxcui: undefined })])).some((e) => e.includes("must have required property 'rxcui'")));
  assert.ok(errorsOf(withItems([partDItem({ quantity_limit: { period: 'per_30_days' } })])).some((e) => e.includes("must have required property 'value'")));
  assert.ok(ITEM.properties.drug_name.description.includes('Absent means the source names no drug'));
  assert.ok(QL.properties.units.description.includes('Absent means the source states no unit'));
});

test('v1.2.0 draft 9: coverage_basis, negotiation_selected_drug, capped_benefit and source_references are optional and typed', () => {
  // An excluded drug covered as a supplemental benefit, beside the same rxcui as a Part D drug (43 plan rows in the 2027 files).
  const excluded = partDItem({ formulary_tier_id: 'T1', prior_authorization: false, quantity_limit: undefined, coverage_basis: 'supplemental_mandatory', capped_benefit: true, negotiation_selected_drug: undefined, ndc: undefined });
  assert.deepStrictEqual(errorsOf(withItems([partDItem(), excluded])), []);
  for (const k of DRAFT9_ITEM) assert.deepStrictEqual(errorsOf(withItems([partDItem({ [k]: undefined })])), [], `${k} absent`);
  for (const k of ['coverage_basis', 'negotiation_selected_drug', 'capped_benefit']) assert.deepStrictEqual(errorsOf(withItems([partDItem({ [k]: null })])), [], `${k} null`);
  // Recommended values, not an enum, as on benefits[].coverage_basis.
  assert.deepStrictEqual(errorsOf(withItems([partDItem({ coverage_basis: 'supplemental_optional' })])), []);
  assert.deepStrictEqual(shape(ITEM.properties.coverage_basis), shape(CORE.properties.benefits.items.properties.coverage_basis));
  for (const v of ['medicare_covered', 'supplemental_mandatory']) assert.ok(CORE.properties.benefits.items.properties.coverage_basis.description.includes(`'${v}'`), v);
  const wrong = (extra) => errorsOf(withItems([partDItem(extra)]));
  assert.ok(wrong({ coverage_basis: 1 }).some((e) => e.includes('coverage_basis')));
  assert.ok(wrong({ negotiation_selected_drug: 'Y' }).some((e) => e.includes('negotiation_selected_drug')));
  assert.ok(wrong({ capped_benefit: 'N' }).some((e) => e.includes('capped_benefit')));
  assert.ok(wrong({ source_references: [{ row: 1 }] }).some((e) => e.includes('additional properties')), 'a citation has the core shape');
  assert.ok(wrong({ selected_drug: true }).some((e) => e.includes('additional properties')), 'formulary_item stays closed');
  assert.deepStrictEqual(ITEM.properties.source_references.items, { $ref: '#/$defs/source_reference' });
  assert.deepStrictEqual(ITEM.required, ['rxcui', 'formulary_tier_id', 'covered']);
  assert.deepStrictEqual(QL.required, ['value']);
});

test('v1.2.0 draft 9: formulary_reference.formulary_version is a string, and formulary_items_url a URI or a relative reference', () => {
  for (const ref of [{}, { formulary_version: '8' }, { formulary_version: null }, { formulary_items_url: '../formularies/00027000.json' },
    { formulary_items_url: 'https://example.org/formularies/00027000.json' }, { formulary_items_url: null }]) {
    assert.deepStrictEqual(errorsOf(withItems([], ref)), [], JSON.stringify(ref));
  }
  assert.ok(errorsOf(withItems([], { formulary_version: 8 })).some((e) => e.includes('formulary_version')));
  assert.ok(errorsOf(withItems([], { formulary_items_url: 7 })).some((e) => e.includes('formulary_items_url')));
  // formulary_url keeps format uri: a relative reference is not one.
  assert.ok(errorsOf(withItems([], { formulary_url: '../formularies/00027000.json' })).some((e) => e.includes('format "uri"')));
  assert.strictEqual(FREF.properties.formulary_items_url.format, 'uri-reference');
  assert.ok(FREF.properties.formulary_items_url.description.includes('replaces a list item with the same rxcui and coverage_basis'));
  assert.strictEqual(FREF.required, undefined);
});

test('v1.2.0 draft 9: schema/v1.2.0/formulary.schema.json validates a list of core formulary items, loaded beside core', () => {
  const Ajv2020 = require('ajv/dist/2020');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  require('ajv-formats')(ajv);
  ajv.addSchema(CORE);
  const LIST = readJson(path.join(REPO, 'schema', 'v1.2.0', 'formulary.schema.json'));
  const check = ajv.compile(LIST);
  const errs = (doc) => (check(doc) ? [] : check.errors.map((e) => `${e.instancePath || '(root)'} ${e.message}`));
  const list = (extra = {}) => ({
    formulary_reference: { formulary_id: '00027000', formulary_version: '8', completeness: 'full_formulary', data_sources: [{ source_type: 'cms_part_d_formulary', import_timestamp: '2026-11-11', file_date: '2026-10-08' }] },
    plan_year: 2027,
    formulary_items: [partDItem()],
    source_references: [{ excerpt: 'basic drugs formulary file  20261031.txt, header: FORMULARY_ID|FORMULARY_VERSION|CONTRACT_YEAR|RXCUI|NDC|TIER_LEVEL_VALUE|QUANTITY_LIMIT_YN|QUANTITY_LIMIT_AMOUNT|QUANTITY_LIMIT_DAYS|PRIOR_AUTHORIZATION_YN|STEP_THERAPY_YN|SELECTED_DRUG_YN' }],
    schema_version: '1.2.0',
    ...extra,
  });
  assert.deepStrictEqual(errs(list()), []);
  assert.deepStrictEqual(errs(list({ plan_year: undefined, source_references: undefined, formulary_items: [] })), [], 'only the 3 required');
  for (const k of ['formulary_reference', 'formulary_items', 'schema_version']) assert.ok(errs(list({ [k]: undefined })).includes(`(root) must have required property '${k}'`), k);
  assert.ok(errs(list({ plan_id: 'X' })).includes('(root) must NOT have additional properties'), 'a list is not a plan');
  assert.ok(errs(list({ formulary_items: [partDItem({ formulary_tier_id: undefined })] })).some((e) => e.startsWith('/formulary_items/0')), 'items have the core shape');
  assert.ok(errs(list({ plan_year: 1850 })).some((e) => e.startsWith('/plan_year')));
  assert.strictEqual(LIST.$id, 'https://benefitplanstandard.org/schema/v1.2.0/formulary.schema.json');
  assert.deepStrictEqual(LIST.properties.formulary_items.items, { $ref: 'benefit-plan.schema.json#/$defs/formulary_item' });
  assert.deepStrictEqual(shape(LIST.properties.plan_year), shape(CORE.properties.plan_year));
  // A plan document is not a list.
  assert.ok(!check(minimal()));
});

test('v1.2.0 draft 9: premium.drug_amount, the Part D part of a Medicare Advantage premium, is an optional number or null', () => {
  const P = CORE.properties.premium;
  const doc = (p) => minimal({ premium: { amount: 13, currency: 'USD', ...p } });
  for (const p of [{}, { drug_amount: 13 }, { drug_amount: 0 }, { drug_amount: null }, { drug_amount: 105, notes: 'Plan Premium Amount (A/B) only.' }]) {
    assert.deepStrictEqual(errorsOf(doc(p)), [], JSON.stringify(p));
  }
  assert.ok(errorsOf(doc({ drug_amount: '13' })).some((e) => e.includes('drug_amount')));
  assert.ok(errorsOf(minimal({ premium: { drug_amount: 13 } })).some((e) => e.includes("must have required property 'amount'")), 'amount stays required');
  assert.deepStrictEqual(P.required, ['amount']);
  assert.deepStrictEqual(shape(P.properties.drug_amount), { type: ['number', 'null'] });
  assert.ok(P.properties.drug_amount.description.includes("'Monthly plan premium $26'"));
  assert.ok(P.properties.drug_amount.description.includes('Absent or null means the document gives no Part D part'));
  assert.ok(P.description.includes('the monthly plan premium is then amount plus drug_amount'));
  assert.ok(CORE.description.includes('it adds 7 optional properties'));
});

// ---- v1.3.0 draft 1: amounts that cover both networks together -------------------------
const V130 = readJson(path.join(REPO, 'schema', 'v1.3.0', 'benefit-plan.schema.json'));
const V130_LIST = readJson(path.join(REPO, 'schema', 'v1.3.0', 'formulary.schema.json'));
const COMBINED = {
  combined_individual_deductible: 'deductible_accumulator',
  combined_family_deductible: 'deductible_accumulator',
  combined_individual_oop_max: 'oop_max_accumulator',
  combined_family_oop_max: 'oop_max_accumulator',
};
const ACC130 = V130.properties.accumulators;
const STEP130 = V130.properties.benefits.items.properties.network_cost_shares.items.properties.cost_shares.items;
const minimal130 = (extra = {}) => ({ ...minimal(extra), schema_version: '1.3.0' });
// H7849-002 (HealthSpring True Choice, PPO) as the 2027 PBP files state it: $525 in and out of
// network, $4,450 in network, $6,700 in and out of network combined.
const H7849 = {
  individual_oop_max: { amount: 4450, currency: 'USD', network_tier: 'IN', applies_to: 'medical' },
  combined_individual_deductible: { amount: 525, currency: 'USD', applies_to: 'medical' },
  combined_individual_oop_max: { amount: 6700, currency: 'USD', applies_to: 'medical' },
};

test('v1.3.0 draft 1: the schema is v1.2.0 plus the 4 combined accumulator slots, their example and descriptions', () => {
  const bare = (s) => {
    const copy = JSON.parse(JSON.stringify(s));
    for (const k of Object.keys(COMBINED)) delete copy.properties.accumulators.properties[k];
    delete copy.properties.accumulators.examples;
    const { $id, ...rest } = shape(copy);
    return rest;
  };
  assert.deepStrictEqual(bare(V130), bare(CORE));
  assert.strictEqual(V130.$id, 'https://benefitplanstandard.org/schema/v1.3.0/benefit-plan.schema.json');
  // Every shape copied from the pharmacy module, and every other definition, is v1.2.0's, descriptions included.
  for (const name of Object.keys(CORE.$defs)) {
    if (name === 'deductible_accumulator' || name === 'oop_max_accumulator') continue;
    assert.deepStrictEqual(V130.$defs[name], CORE.$defs[name], `$defs/${name}`);
  }
  assert.deepStrictEqual(Object.keys(V130.properties), Object.keys(CORE.properties), 'no new top-level property');
  assert.deepStrictEqual(Object.keys(ACC130.properties),
    [...Object.keys(CORE.properties.accumulators.properties), ...Object.keys(COMBINED)], 'the 4 slots follow the 8 of v1.2.0');
  for (const [k, def] of Object.entries(COMBINED)) assert.strictEqual(ACC130.properties[k].$ref, `#/$defs/${def}`, `${k} is a ${def}`);
  assert.strictEqual(ACC130.additionalProperties, false);
  assert.strictEqual(ACC130.required, undefined, 'every slot stays optional');
  assert.ok(V130.description.startsWith('Canonical JSON schema for representing normalized health benefit plans across carriers. DRAFT: v1.3.0'));
  assert.ok(V130.description.includes('Draft 1, on 2026-11-27, lets an amount cover the in-network and out-of-network tiers together.'));
  assert.ok(V130.description.endsWith(CORE.description.slice(CORE.description.indexOf('v1.2.0, released on 2026-11-13'))), 'the v1.2.0 description follows');
});

test('v1.3.0 draft 1: a combined slot takes network_tier absent or null, and nothing else; the per-network slots are unchanged', () => {
  for (const k of Object.keys(COMBINED)) {
    const at = `/accumulators/${k}`;
    const doc = (slot) => minimal130({ accumulators: { [k]: { amount: 6700, currency: 'USD', applies_to: 'medical', ...slot } } });
    assert.deepStrictEqual(errorsOf130(doc({})), [], `${k}, network_tier absent`);
    assert.deepStrictEqual(errorsOf130(doc({ network_tier: null })), [], `${k}, network_tier null`);
    for (const t of ['IN', 'OUT', 'POS', 'combined']) assert.ok(errorsOf130(doc({ network_tier: t })).includes(`${at}/network_tier must be null`), `${k}, ${t}`);
    assert.ok(errorsOf130(doc({ amount: undefined })).includes(`${at} must have required property 'amount'`), `${k} needs an amount`);
    assert.ok(errorsOf130(doc({ scope: 'both' })).includes(`${at} must NOT have additional properties`), `${k} has the shape's properties only`);
    if (k.includes('family')) assert.deepStrictEqual(errorsOf130(doc({ embedded: true })), [], `${k} takes embedded`);
    assert.ok(errorsOf(doc({})).some((e) => e.includes('additional properties')), `${k} is not in v1.2.0`);
    assert.deepStrictEqual(shape(ACC130.properties[k].properties), { network_tier: { type: 'null' } });
    assert.ok(ACC130.properties[k].properties.network_tier.description.includes('the only place where null has this meaning'));
  }
  for (const k of Object.keys(CORE.properties.accumulators.properties)) {
    assert.deepStrictEqual(ACC130.properties[k], CORE.properties.accumulators.properties[k], k);
    for (const t of ['IN', 'OUT', 'POS', null]) assert.deepStrictEqual(errorsOf130(minimal130({ accumulators: { [k]: { amount: 1, network_tier: t } } })), [], `${k}, ${t}`);
  }
  for (const def of ['deductible_accumulator', 'oop_max_accumulator']) {
    assert.deepStrictEqual(shape(V130.$defs[def]), shape(CORE.$defs[def]), def);
    assert.ok(V130.$defs[def].properties.network_tier.description.startsWith(CORE.$defs[def].properties.network_tier.description), `${def}: the v1.2.0 words stay`);
  }
  assert.ok(V130.$defs.deductible_accumulator.properties.network_tier.description.includes('The legacy slots default to the in-network tier, IN'));
});

test('v1.3.0 draft 1: the H7849-002 example validates, a combined slot sits beside the in-network one, and the descriptions say how they count', () => {
  assert.deepStrictEqual(ACC130.examples, [H7849]);
  assert.deepStrictEqual(errorsOf130(minimal130({ accumulators: H7849 })), []);
  assert.ok(errorsOf(minimal({ accumulators: H7849 })).length > 0, 'v1.2.0 has no slot for the combined amounts');
  const desc = (k) => ACC130.properties[k].description;
  assert.ok(ACC130.description.includes('a combined maximum counts what the in-network maximum counts, unless the plan says otherwise'));
  assert.ok(desc('combined_individual_oop_max').includes('A combined maximum counts what the in-network maximum counts, unless the plan says otherwise'));
  assert.ok(desc('combined_individual_oop_max').includes('individual_oop_max $4,450 in network, combined_individual_oop_max $6,700'));
  assert.ok(desc('combined_individual_deductible').includes('written here only, never also as individual_deductible'));
  assert.ok(ACC130.description.includes('A document that has a combined slot may have no legacy slot for that amount'));
  assert.ok(desc('combined_family_oop_max').includes('counts what the in-network family maximum counts'));
});

test("v1.3.0 draft 1: deductible_ref and moop_ref take 'combined' as a recommended value; medical and pharmacy keep their meaning", () => {
  const plan = (cs, tier = 'OUT') => minimal130({
    network_tiers: [{ tier_id: 'IN', name: 'In-Network' }, { tier_id: 'OUT', name: 'Out-of-Network' }],
    accumulators: H7849,
    benefits: [{
      benefit_id: 'PBP_7D', category: 'PHYSICIAN_SERVICES', service_name: 'Specialist',
      network_cost_shares: [{ tier_id: tier, covered: true, cost_shares: [{ type: 'coinsurance', sequence: 1, rate: 0.4, ...cs }] }],
    }],
  });
  assert.deepStrictEqual(errorsOf130(plan({ applies_to_deductible: true, deductible_ref: 'combined', applies_to_moop: true, moop_ref: 'combined' })), [],
    'an out-of-network step on a plan with no out-of-network maximum');
  assert.deepStrictEqual(errorsOf130(plan({ applies_to_deductible: true, deductible_ref: 'combined', applies_to_moop: true }, 'IN')), [],
    'an in-network step keeps the in-network maximum');
  // Already strings in v1.2.0: a 1.2.0 validator accepts 'combined' too.
  assert.deepStrictEqual(errorsOf({ ...plan({ deductible_ref: 'combined', moop_ref: 'combined' }), accumulators: {}, schema_version: '1.2.0' }), []);
  for (const k of ['deductible_ref', 'moop_ref']) {
    assert.deepStrictEqual(STEP130.properties[k], { ...STEP.properties[k], description: STEP130.properties[k].description }, `${k}: only the description changes`);
    assert.ok(STEP130.properties[k].description.includes("since v1.3.0 'combined' (the combined_*"), k);
    assert.ok(STEP130.properties[k].description.includes("'medical' and 'pharmacy' keep their meaning in v1.3.0"), k);
    assert.ok(errorsOf130(plan({ [k]: 1 })).some((e) => e.includes(k)), `${k} stays a string`);
  }
  assert.ok(STEP130.properties.moop_ref.description.includes("an in-network step keeps 'medical' (or absent)"));
  assert.deepStrictEqual(STEP130.properties.applies_to_moop, STEP.properties.applies_to_moop);
  assert.deepStrictEqual(STEP130.properties.applies_to_deductible, STEP.properties.applies_to_deductible);
});

test('v1.3.0 draft 1: every v1.2.0 document stays valid (the pharmacy module examples, a formulary list), and formulary.schema.json is the v1.2.0 one with its own $id', () => {
  for (const dir of [path.join(MODULE_DIR, 'examples'), path.join(MODULE_V022_DIR, 'examples'), path.join(MODULE_V021_DIR, 'examples')]) {
    for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      assert.deepStrictEqual(errorsOf130(readJson(path.join(dir, f))), [], `${dir} ${f}`);
    }
  }
  const { $id, ...list130 } = V130_LIST;
  const { $id: id120, ...list120 } = readJson(path.join(REPO, 'schema', 'v1.2.0', 'formulary.schema.json'));
  assert.deepStrictEqual(list130, list120);
  assert.strictEqual($id, 'https://benefitplanstandard.org/schema/v1.3.0/formulary.schema.json');
  assert.strictEqual(id120, 'https://benefitplanstandard.org/schema/v1.2.0/formulary.schema.json');
  const Ajv2020 = require('ajv/dist/2020');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  require('ajv-formats')(ajv);
  ajv.addSchema(V130);
  const check = ajv.compile(V130_LIST);
  const list = {
    formulary_reference: { formulary_id: '00027000', formulary_version: '8', completeness: 'full_formulary' },
    plan_year: 2027, formulary_items: [partDItem()], schema_version: '1.3.0',
  };
  assert.ok(check(list), JSON.stringify(check.errors));
  assert.ok(!check({ ...list, formulary_items: [partDItem({ formulary_tier_id: undefined })] }), 'items have the v1.3.0 core shape');
});
