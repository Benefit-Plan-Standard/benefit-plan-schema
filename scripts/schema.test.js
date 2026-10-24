/**
 * Tests for schema/v1.2.0/benefit-plan.schema.json (draft)
 *
 *   node --test scripts/schema.test.js
 *
 * Fails if a document in examples/ stops validating against its own schema
 * version or against v1.2.0, or if the v1.2.0 draft's contacts object and
 * network_tiers[].provider_directory_url (added 2026-10-20) change shape.
 * Draft 6 (2026-10-24): fails if a pharmacy module v0.2.1 shape copied into core
 * differs from the module's, if the 2 module examples stop validating against
 * core or the module, or if cost_shares[].moop_ref stops matching deductible_ref.
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

test('every document in examples/ validates against its own schema version and against v1.2.0', () => {
  const files = fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.json')).sort();
  assert.ok(files.length >= 20, `only ${files.length} documents in examples/`);
  const own = {};
  for (const f of files) {
    const doc = readJson(path.join(EXAMPLES_DIR, f));
    own[doc.schema_version] = own[doc.schema_version] || compile(doc.schema_version);
    assert.ok(own[doc.schema_version](doc), `${f} fails its own v${doc.schema_version}`);
    assert.deepStrictEqual(errorsOf(doc), [], `${f} fails v1.2.0`);
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

// ---- v1.2.0 draft 6: the pharmacy module v0.2.1 in core ---------------------------
const CORE = readJson(path.join(REPO, 'schema', 'v1.2.0', 'benefit-plan.schema.json'));
const MODULE_DIR = path.join(REPO, 'modules', 'pharmacy', 'v0.2.1');
const MODULE = readJson(path.join(MODULE_DIR, 'pharmacy.schema.json'));
const COPIED = ['formulary_tier', 'pharmacy_network', 'coverage_stage', 'quantity_limit_detail',
  'formulary_item', 'coverage_exception', 'formulary_alternative'];

// A schema with every description annotation removed, at every depth: what a validator checks.
// A property named description (formulary_tier has one) is an object, not a string, and stays.
function shape(s) {
  if (Array.isArray(s)) return s.map(shape);
  if (!s || typeof s !== 'object') return s;
  return Object.fromEntries(Object.entries(s)
    .filter(([k, v]) => !(k === 'description' && typeof v === 'string'))
    .map(([k, v]) => [k, shape(v)]));
}

test('v1.2.0 draft 6: the 8 pharmacy module v0.2.1 shapes in core $defs are deep-equal to the module\'s', () => {
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

test('v1.2.0 draft 6: the 2 pharmacy module v0.2.1 examples validate against core and against the module', () => {
  const Ajv2020 = require('ajv/dist/2020');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  require('ajv-formats')(ajv);
  const moduleValidate = ajv.compile(MODULE);
  const dir = path.join(MODULE_DIR, 'examples');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  assert.deepStrictEqual(files, ['formulary_indication_example.json', 'humana_part_d_example.json']);
  for (const f of files) {
    const doc = readJson(path.join(dir, f));
    assert.deepStrictEqual(errorsOf(doc), [], `${f} fails core v1.2.0`);
    assert.ok(moduleValidate(doc), `${f} fails the module: ${JSON.stringify(moduleValidate.errors)}`);
  }
  // The Part D example counts every cost share toward the Part D threshold; the commercial one leaves moop_ref out.
  const steps = (doc) => doc.benefits.flatMap((b) => b.network_cost_shares).flatMap((r) => r.cost_shares || []);
  const partD = readJson(path.join(dir, 'humana_part_d_example.json'));
  assert.ok(partD.pharmacy.out_of_pocket_max && !partD.accumulators, 'the PDP cap is the pharmacy maximum');
  assert.deepStrictEqual(steps(partD).map((cs) => cs.moop_ref), Array(6).fill('pharmacy'));
  assert.ok(steps(readJson(path.join(dir, 'formulary_indication_example.json'))).every((cs) => cs.moop_ref === undefined));
});
