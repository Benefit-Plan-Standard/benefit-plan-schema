/**
 * Tests for scripts/validate.js
 *
 *   node --test scripts/validate.test.js
 *
 * Fails if the pharmacy warnings of the v1.2.0 draft 6 (a pharmacy module field on a
 * benefit whose benefit_type is not "pharmacy", and a formulary_tier_id,
 * pharmacy_network_id or coverage_stage_id that the document's pharmacy object does
 * not define) stop printing, change their text, or make the validator fail.
 * Fixtures: test/fixtures/validate/. Needs a local copy of Ajv (npm install ajv ajv-formats).
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const REPO = path.join(__dirname, '..');
const V120 = path.join('schema', 'v1.2.0', 'benefit-plan.schema.json');
const FIXTURES = path.join('test', 'fixtures', 'validate');

function run(...args) {
  const r = spawnSync(process.execPath, [path.join('scripts', 'validate.js'), ...args], { cwd: REPO, encoding: 'utf8' });
  return { status: r.status, lines: r.stdout.split(/\r?\n/) };
}
const warnings = (lines) => lines.filter((l) => l.includes('pharmacy-warning: ')).map((l) => l.split('pharmacy-warning: ')[1]);

test('a pharmacy module field on a medical benefit is a warning, and the document passes', () => {
  const { status, lines } = run('--schema', V120, path.join(FIXTURES, 'pharmacy-field-on-medical-benefit.json'));
  assert.strictEqual(status, 0);
  assert.ok(lines[0].startsWith('PASS'), lines[0]);
  assert.deepStrictEqual(warnings(lines), [
    'benefits[0].day_supply is set on a benefit whose benefit_type is "medical" (the default); it applies to benefit_type "pharmacy"',
  ]);
});

test('a formulary tier, pharmacy network or coverage stage id the pharmacy object does not define is a warning, and the document passes', () => {
  const { status, lines } = run('--schema', V120, path.join(FIXTURES, 'pharmacy-unknown-ids.json'));
  assert.strictEqual(status, 0);
  assert.ok(lines[0].startsWith('PASS'), lines[0]);
  assert.deepStrictEqual(warnings(lines), [
    'benefits[1].formulary_tier_id "T9" is not a tier_id in pharmacy.formulary_tiers',
    'benefits[1].pharmacy_network_id "MAIL" is not a network_id in pharmacy.pharmacy_networks',
    'benefits[1].coverage_stage_id "CATASTROPHIC" is not a stage_id in pharmacy.coverage_stages',
  ]);
});

test('pharmacy warnings never fail the run, with --strict-vocab or --no-vocab', () => {
  const both = fs.readdirSync(path.join(REPO, FIXTURES)).filter((f) => f.endsWith('.json')).map((f) => path.join(FIXTURES, f));
  assert.strictEqual(both.length, 2);
  for (const flag of ['--strict-vocab', '--no-vocab']) {
    const { status, lines } = run(flag, '--schema', V120, ...both);
    assert.strictEqual(status, 0, flag);
    assert.strictEqual(warnings(lines).length, 4, flag);
  }
});

test('no document in examples/ and no pharmacy module v0.2.1 example gets a pharmacy warning', () => {
  const list = (dir) => fs.readdirSync(path.join(REPO, dir)).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f));
  const files = [...list('examples'), ...list(path.join('modules', 'pharmacy', 'v0.2.1', 'examples'))];
  assert.ok(files.length >= 22);
  const { status, lines } = run('--no-vocab', '--schema', V120, ...files);
  assert.strictEqual(status, 0);
  assert.deepStrictEqual(warnings(lines), []);
});
