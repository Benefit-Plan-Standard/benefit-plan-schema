/**
 * Tests for scripts/validate.js
 *
 *   node --test scripts/validate.test.js
 *
 * Fails if the pharmacy warnings of the v1.2.0 draft 6 (a pharmacy module field on a
 * benefit whose benefit_type is not "pharmacy", and a formulary_tier_id,
 * pharmacy_network_id or coverage_stage_id that the document's pharmacy object does
 * not define) stop printing, change their text, or make the validator fail, or if a
 * document with the fields of draft 7 stops passing with no warning. Draft 9: fails if
 * --schema schema/v1.2.0/formulary.schema.json stops loading the core schema beside it,
 * so that a formulary list validates or fails by the core item shape.
 * Fixtures: test/fixtures/validate/ (plans) and test/fixtures/validate-formulary/ (lists).
 * Needs a local copy of Ajv (npm install ajv ajv-formats).
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

test('a document with the fields of draft 7 passes, with no vocabulary or pharmacy warning', () => {
  const { status, lines } = run('--strict-vocab', '--schema', V120, path.join(FIXTURES, 'draft-7-fields.json'));
  assert.strictEqual(status, 0);
  assert.ok(lines[0].startsWith('PASS'), lines[0]);
  assert.deepStrictEqual(warnings(lines), []);
});

test('pharmacy warnings never fail the run, with --strict-vocab or --no-vocab', () => {
  const all = fs.readdirSync(path.join(REPO, FIXTURES)).filter((f) => f.endsWith('.json')).map((f) => path.join(FIXTURES, f));
  assert.strictEqual(all.length, 3);
  for (const flag of ['--strict-vocab', '--no-vocab']) {
    const { status, lines } = run(flag, '--schema', V120, ...all);
    assert.strictEqual(status, 0, flag);
    assert.strictEqual(warnings(lines).length, 4, flag);
  }
});

test('no document in examples/ and no pharmacy module example of v0.2.1, v0.2.2 or v0.2.3 gets a pharmacy warning', () => {
  const list = (dir) => fs.readdirSync(path.join(REPO, dir)).filter((f) => f.endsWith('.json')).map((f) => path.join(dir, f));
  const files = [...list('examples'), ...['v0.2.1', 'v0.2.2', 'v0.2.3'].flatMap((v) => list(path.join('modules', 'pharmacy', v, 'examples')))];
  assert.ok(files.length >= 28);
  const { status, lines } = run('--no-vocab', '--schema', V120, ...files);
  assert.strictEqual(status, 0);
  assert.deepStrictEqual(warnings(lines), []);
});

test('v1.2.0 draft 9: a formulary list validates against formulary.schema.json, with the core schema loaded beside it', () => {
  const LIST = path.join('schema', 'v1.2.0', 'formulary.schema.json');
  const LISTS = path.join('test', 'fixtures', 'validate-formulary');
  const ok = run('--no-vocab', '--schema', LIST, path.join(LISTS, 'formulary-list.json'));
  assert.strictEqual(ok.status, 0, ok.lines.join('\n'));
  assert.ok(ok.lines[0].startsWith('PASS'), ok.lines[0]);
  const bad = run('--no-vocab', '--schema', LIST, path.join(LISTS, 'formulary-list-item-without-tier.json'));
  assert.strictEqual(bad.status, 1);
  assert.ok(bad.lines.some((l) => l.includes("formulary_tier_id")), bad.lines.join('\n'));
  // A plan is not a list, and a list is not a plan.
  assert.strictEqual(run('--no-vocab', '--schema', LIST, path.join('examples', 'unitedhealthcare-aarp-medicare-rx-preferred-from-uhc.pbp.json')).status, 1);
  assert.strictEqual(run('--no-vocab', '--schema', V120, path.join(LISTS, 'formulary-list.json')).status, 1);
});
