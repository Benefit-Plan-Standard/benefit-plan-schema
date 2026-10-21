/**
 * Tests for schema/v1.2.0/benefit-plan.schema.json (draft)
 *
 *   node --test scripts/schema.test.js
 *
 * Fails if a document in examples/ stops validating against its own schema
 * version or against v1.2.0, or if the v1.2.0 draft's contacts object and
 * network_tiers[].provider_directory_url (added 2026-10-20) change shape.
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
