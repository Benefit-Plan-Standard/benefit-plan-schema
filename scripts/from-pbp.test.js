/**
 * Tests for scripts/from-pbp.js and scripts/pbp-sob-check.js
 *
 *   node --test scripts/from-pbp.test.js
 *
 * Fails if the importer's output drifts from the golden files examples/*.pbp.json,
 * if output is not deterministic, if the reader or a mapping rule changes
 * behavior, if the crosswalk names a column the files do not have, or if the
 * H2406-013-000 Summary of Benefits check finds a difference. The golden plans
 * are built from the rows committed in test/fixtures/pbp/2027/, so the test runs
 * without the full PBP files; when data/pbp/2027/ is present the golden plans are
 * also built from the full files. Regenerate on purpose with:
 *   node scripts/from-pbp.js --write-golden      (examples/*.pbp.json)
 *   node scripts/from-pbp.js --write-fixtures    (test/fixtures/pbp/)
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  streamTsv, buildDocument, serialize, loadPlan, validateDocument, pbpDir, goldenSlugs,
  GOLDEN, CROSSWALK, READ_FILES, EXAMPLES_DIR, FIXTURE_DIR, DATA_DIR,
} = require('./from-pbp.js');
const { runChecks, matches, resolvePointer, ABSENT } = require('./pbp-sob-check.js');

const REPO = path.join(__dirname, '..');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const normalize = (s) => s.replace(/\r\n/g, '\n');
const goldenFiles = () => fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('.pbp.json')).sort();
const SOB_CHECKS = path.join(REPO, 'docs', 'specs', 'pbp-sob-checks');

// The golden plans built from the fixtures once, shared by the tests below.
let builtCache = null;
async function built() {
  if (builtCache) return builtCache;
  const out = [];
  for (const g of GOLDEN) {
    const { rows, source } = await loadPlan({ dataDir: FIXTURE_DIR, year: g.year, plan: g.plan });
    out.push({ g, rows, source, result: buildDocument(rows, source) });
  }
  const slugs = goldenSlugs(out.map((x) => x.result.doc));
  out.forEach((x, i) => { x.file = `${slugs[i]}.pbp.json`; });
  builtCache = out;
  return out;
}
const docFor = async (plan) => (await built()).find((x) => x.g.plan === plan).result.doc;
const benefit = (doc, id) => doc.benefits.find((b) => b.benefit_id === id);

// ---- reader ---------------------------------------------------------------------------------
function tmpFile(name, bytes) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pbp-test-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, bytes);
  return file;
}

async function readAll(file) {
  const rows = [];
  await streamTsv(file, (f, idx) => { const r = {}; for (const [h, i] of idx) r[h] = f[i]; rows.push(r); });
  return rows;
}

test('reader: CRLF records, lowercased header, Windows-1252 bytes', async () => {
  const bytes = Buffer.concat([Buffer.from('A_Col\tb\r\nx\t'), Buffer.from([0x92, 0x96]), Buffer.from('\r\ny\tz')]);
  const rows = await readAll(tmpFile('t.txt', bytes));
  assert.deepStrictEqual(rows, [{ a_col: 'x', b: '’–' }, { a_col: 'y', b: 'z' }]);
});

test('reader: a wrong field count, a bare line break or disagreeing repeated columns is an error', async () => {
  await assert.rejects(readAll(tmpFile('t.txt', 'a\tb\r\n1\r\n')), /has 1 fields, the header has 2/);
  await assert.rejects(readAll(tmpFile('t.txt', 'a\tb\r\n1\t2\n3\t4\r\n')), /line break that is not CRLF/);
  await assert.rejects(readAll(tmpFile('t.txt', 'a\tb\ta\r\n1\t2\t9\r\n')), /the 2 "a" columns disagree/);
  assert.deepStrictEqual(await readAll(tmpFile('t.txt', 'a\tb\ta\r\n1\t2\t1\r\n')), [{ a: '1', b: '2' }]);
});

// ---- crosswalk ------------------------------------------------------------------------------
test('crosswalk: ids unique, keys, categories and benefit types in the vocabularies, counts right', () => {
  const vocab = (f) => readJson(path.join(REPO, 'vocabularies', f));
  const canon = new Set(vocab('canonical-benefits.json').benefits.map((b) => b.canonical_key));
  const cats = new Set(vocab('categories.json').categories.map((c) => c.code));
  const types = new Set(vocab('benefit-types.json').benefit_types.map((t) => t.code));
  const ids = CROSSWALK.benefits.map((b) => b.benefit_id);
  assert.strictEqual(new Set(ids).size, ids.length);
  for (const b of CROSSWALK.benefits) {
    if (b.canonical_key) assert.ok(canon.has(b.canonical_key), `${b.canonical_key} is not a canonical key`);
    assert.ok(cats.has(b.category), `${b.category} is not a category`);
    assert.ok(types.has(b.benefit_type), `${b.benefit_type} is not a benefit type`);
    assert.strictEqual(typeof b.medicare_covered, 'boolean');
    if (!b.medicare_covered) assert.ok(b.offered && b.amo, `${b.benefit_id} is supplemental but has no offered or amo column`);
  }
  const keyed = CROSSWALK.benefits.filter((b) => b.canonical_key).length;
  assert.deepStrictEqual(CROSSWALK.counts, { benefits: ids.length, with_canonical_key: keyed, without_canonical_key: ids.length - keyed });
});

test('crosswalk: every column it names is in the header of its file', () => {
  const { find } = pbpDir(FIXTURE_DIR, 2027);
  const headers = {};
  const header = (file) => {
    if (!headers[file]) headers[file] = new Set(fs.readFileSync(find(file), 'latin1').split('\r\n')[0].toLowerCase().split('\t'));
    return headers[file];
  };
  const columns = (o, out = []) => {
    for (const [k, v] of Object.entries(o)) {
      if (['benefit_id', 'service_name', 'pbp_code', 'pbp_label', 'file', 'canonical_key', 'category', 'benefit_type', 'note', 'prefix',
        'handler', 'shared', 'shared_limit_id', 'when', 'value', 'kind', 'type', 'when_not_chosen', 'basis', 'basis_codes'].includes(k)) continue;
      if (typeof v === 'string') out.push(v);
      else if (v && typeof v === 'object') columns(v, out);
    }
    return out;
  };
  for (const b of CROSSWALK.benefits) {
    for (const col of columns(b)) assert.ok(header(b.file).has(col), `${b.benefit_id}: ${col} is not a column of ${b.file}`);
  }
});

// ---- golden files -----------------------------------------------------------------------------
test('the committed examples are the golden set, named by goldenSlugs', async () => {
  assert.deepStrictEqual(goldenFiles(), (await built()).map((x) => x.file).sort());
});

for (const g of GOLDEN) {
  test(`CY${g.year} ${g.plan}: fixture rows give the golden file byte for byte, valid, deterministic, no warning`, async () => {
    const x = (await built()).find((y) => y.g.plan === g.plan);
    assert.deepStrictEqual(x.result.errors, []);
    assert.deepStrictEqual(x.result.warnings, []);
    assert.deepStrictEqual(validateDocument(x.result.doc), []);
    const golden = path.join(EXAMPLES_DIR, x.file);
    assert.ok(fs.existsSync(golden), `missing golden file examples/${x.file}`);
    assert.strictEqual(serialize(x.result.doc), normalize(fs.readFileSync(golden, 'utf8')), `examples/${x.file} differs from importer output`);
    assert.strictEqual(serialize(buildDocument(x.rows, x.source).doc), serialize(x.result.doc), 'a second build differs');
  });
}

function hasData(year) {
  try { pbpDir(DATA_DIR, year).find('pbp_Section_A.txt'); return true; } catch (e) { return false; }
}

for (const g of GOLDEN) {
  const skip = hasData(g.year) ? false : `the full PBP files for contract year ${g.year} are not in data/pbp/${g.year}/`;
  test(`CY${g.year} ${g.plan}: the full files give the same document as the fixture rows`, { skip }, async () => {
    const { rows, source } = await loadPlan({ year: g.year, plan: g.plan });
    const x = (await built()).find((y) => y.g.plan === g.plan);
    assert.strictEqual(serialize(buildDocument(rows, source).doc), serialize(x.result.doc));
  });
}

test('fixtures: every file the importer reads, with the golden plans only', async () => {
  const dir = path.join(FIXTURE_DIR, '2027');
  const manifest = readJson(path.join(dir, 'download.json'));
  assert.deepStrictEqual([...manifest.plans].sort(), GOLDEN.map((g) => g.plan).sort());
  const { find } = pbpDir(FIXTURE_DIR, 2027);
  for (const name of READ_FILES) {
    const keys = new Set();
    await streamTsv(find(name), (f) => keys.add(`${f[0]}-${f[1]}-${String(Number(f[2])).padStart(3, '0')}`));
    for (const k of keys) assert.ok(manifest.plans.includes(k), `${name} holds ${k}, which is not a golden plan`);
  }
});

// ---- mapping rules on the golden plans ----------------------------------------------------------
test('decision N1: every network_tier is IN, OUT, POS or null', async () => {
  for (const x of await built()) {
    for (const [slot, a] of Object.entries(x.result.doc.accumulators)) {
      assert.ok([null, 'IN', 'OUT', 'POS'].includes(a.network_tier), `${x.g.plan} ${slot}: ${a.network_tier}`);
    }
  }
});

test('decision 1: H2406-013 PPO deductible on OUT, quoted scope; no in-network deductible', async () => {
  const doc = await docFor('H2406-013-000');
  assert.deepStrictEqual(doc.accumulators.oon_individual_deductible, { amount: 1000, currency: 'USD', network_tier: 'OUT', applies_to: 'medical' });
  assert.strictEqual(doc.accumulators.individual_deductible, undefined);
  assert.ok(doc.source_references.some((s) => s.excerpt.includes('decision 1') && s.excerpt.includes('pbp_c_oon_mc_bendesc_cats "1a;')));
  assert.strictEqual(benefit(doc, 'PRIMARY_CARE').network_cost_shares[1].cost_shares[0].applies_to_deductible, true);
  assert.strictEqual(benefit(doc, 'PRIMARY_CARE').network_cost_shares[0].cost_shares[0].applies_to_deductible, false);
});

test('decision 4: H1609-028 HMO-POS deductible on POS; Section C quoted', async () => {
  const doc = await docFor('H1609-028-000');
  assert.strictEqual(doc.plan_type, 'HMO_POS');
  assert.deepStrictEqual(doc.accumulators.oon_individual_deductible, { amount: 500, currency: 'USD', network_tier: 'POS', applies_to: 'medical' });
  assert.ok(doc.source_references.some((s) => s.excerpt.startsWith('Point-of-service deductible as Section C states it, verbatim: pbp_c_pos_ded_yn "1", pbp_c_pos_ded_amt "500.00".')));
  assert.ok(!doc.source_references.some((s) => s.excerpt.includes('disagree')), 'Section C and D agree on this plan');
});

test('ranges and day intervals: H2406-013 specialist range, inpatient intervals', async () => {
  const doc = await docFor('H2406-013-000');
  const spec = benefit(doc, 'SPECIALIST').network_cost_shares[0].cost_shares[0];
  assert.deepStrictEqual([spec.amount, spec.amount_min, spec.amount_max], [undefined, 0, 65]);
  const inpatient = benefit(doc, 'INPATIENT_HOSPITAL').network_cost_shares[0].cost_shares;
  assert.deepStrictEqual(inpatient.map((s) => [s.amount, s.basis, s.unit_range]),
    [[550, 'per_day', { from: 1, to: 5 }], [0, 'per_day', { from: 6, to: 90 }], [0, 'per_day', { from: 91, to: 999 }]]);
});

test('decision 5: emergency on the in-network tier only, with the note', async () => {
  const em = benefit(await docFor('H2406-013-000'), 'EMERGENCY');
  assert.deepStrictEqual(em.network_cost_shares.map((t) => t.tier_id), ['IN']);
  assert.match(em.network_cost_shares[0].notes, /prices 4a once, with no network, and no pbp_Section_C_OON\.txt group lists 4a/);
  const hmo = benefit(await docFor('H1036-068-000'), 'EMERGENCY');
  assert.ok(!(hmo.network_cost_shares[0].notes || '').includes('decision 5'), 'an HMO has no other tier, so no note');
});

test('hospital cost tiers: H5533-019 inpatient rows per tier, no IN row', async () => {
  const doc = await docFor('H5533-019-000');
  assert.deepStrictEqual(doc.network_tiers.filter((t) => t.tier_class === 'cost_designation').map((t) => t.tier_id), ['IN_1A_TIER_1', 'IN_1A_TIER_2']);
  assert.deepStrictEqual(benefit(doc, 'INPATIENT_HOSPITAL').network_cost_shares.map((t) => t.tier_id), ['IN_1A_TIER_1', 'IN_1A_TIER_2', 'OUT']);
});

test('shared 18a maximum and decision S1: H5425-140', async () => {
  const doc = await docFor('H5425-140-000');
  const aids = benefit(doc, 'HEARING_AIDS').limits.find((l) => l.type === 'dollars');
  const exams = benefit(doc, 'HEARING_EXAM_ROUTINE').limits.find((l) => l.type === 'dollars');
  assert.deepStrictEqual([aids.value, aids.shared_limit_id], [400, 'PBP_18A_MAXPLAN']);
  assert.deepStrictEqual([exams.value, exams.shared_limit_id], [400, 'PBP_18A_MAXPLAN']);
  const pcp = benefit(doc, 'PRIMARY_CARE').network_cost_shares[0].cost_shares;
  assert.strictEqual(pcp.length, 1);
  assert.deepStrictEqual([pcp[0].type, pcp[0].amount], ['copay', 0]);
  assert.match(pcp[0].notes, /pbp_b7a_copay_yn "2", pbp_b7a_coins_yn "2".*decision S1/);
});

test('decision 2: a deductible answered "No" writes no slot', async () => {
  const doc = await docFor('H1036-068-000');
  assert.strictEqual(doc.accumulators.individual_deductible, undefined);
  assert.ok(doc.source_references.some((s) => s.excerpt.startsWith('In-network deductible: the plan says it has none (pbp_d_inn_deduct_yn "2",')));
});

// ---- errors on altered rows -----------------------------------------------------------------------
async function altered(plan, file, changes) {
  const { rows, source } = await loadPlan({ dataDir: FIXTURE_DIR, year: 2027, plan });
  rows.b[file] = { ...rows.b[file], ...changes };
  return buildDocument(rows, source);
}

test('an unreadable value is an error that quotes it, and no document is written', async () => {
  const bad = await altered('H2406-013-000', 'pbp_b7_health_prof.txt', { pbp_b7d_copay_amt_mc_max: '65 dollars' });
  assert.strictEqual(bad.doc, null);
  assert.ok(bad.errors.some((e) => e.includes('pbp_b7d_copay_amt_mc_max "65 dollars" is not an amount')));
  const code = await altered('H2406-013-000', 'pbp_b7_health_prof.txt', { pbp_b7d_copay_yn: '7' });
  assert.ok(code.errors.some((e) => e.includes('pbp_b7d_copay_yn "7" is not 1, 2 or 3')));
  const order = await altered('H2406-013-000', 'pbp_b7_health_prof.txt', { pbp_b7d_copay_amt_mc_min: '70.00' });
  assert.ok(order.errors.some((e) => e.startsWith('minimum above maximum')));
});

test('a Medicare-covered category with no answer is not written, with a warning and a source reference', async () => {
  const r = await altered('H2406-013-000', 'pbp_b1a_inpat_hosp.txt', { pbp_b1a_copay_yn: '', pbp_b1a_coins_yn: '' });
  assert.deepStrictEqual(r.errors, []);
  assert.deepStrictEqual(r.warnings.map((w) => w.kind), ['medicare-covered-cost-share-blank']);
  assert.strictEqual(benefit(r.doc, 'INPATIENT_HOSPITAL'), undefined);
  assert.ok(r.doc.source_references.some((s) => s.excerpt.includes('not written') && s.excerpt.includes('1a: Inpatient Hospital-Acute')));
});

// ---- Summary of Benefits check -----------------------------------------------------------------------
test('sob-check: pointer and matching rules', () => {
  const doc = { a: [{ x: 1, y: 2 }], 'b/c': { '~d': 3 } };
  assert.strictEqual(resolvePointer(doc, '/a/0/x'), 1);
  assert.strictEqual(resolvePointer(doc, '/b~1c/~0d'), 3);
  assert.strictEqual(resolvePointer(doc, '/a/1'), ABSENT);
  assert.ok(matches(doc.a, [{ x: 1 }]), 'objects match on the keys named');
  assert.ok(!matches(doc.a, [{ x: 1 }, { x: 1 }]), 'arrays match only at the same length');
  assert.ok(matches(resolvePointer(doc, '/z'), { $absent: true }));
  assert.ok(matches(doc.a[0], { z: { $absent: true } }));
  assert.ok(!matches(doc.a[0], { x: { $absent: true } }));
});

test('sob-check: H2406-013-000 golden file against its Summary of Benefits, 0 differences', async () => {
  const doc = readJson(path.join(EXAMPLES_DIR, (await built()).find((x) => x.g.plan === 'H2406-013-000').file));
  const expectations = readJson(path.join(SOB_CHECKS, 'H2406-013-000.json'));
  const { counts, results } = runChecks(doc, expectations);
  assert.deepStrictEqual(counts, { MATCH: 53, READING: 8, DIFFERENCE: 0 });
  for (const r of results) if (r.status === 'READING') assert.ok(r.check.note, `${r.check.item}: a READING row needs a note`);
  doc.benefits[1].network_cost_shares[1].cost_shares[0].amount = 90;
  const changed = runChecks(doc, expectations);
  assert.strictEqual(changed.counts.DIFFERENCE, 1, 'a changed value is reported');
});
