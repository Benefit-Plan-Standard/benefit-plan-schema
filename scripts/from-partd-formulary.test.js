/**
 * Tests for scripts/from-partd-formulary.js
 *
 *   node --test scripts/from-partd-formulary.test.js
 *
 * Runs on the committed fixtures only: test/fixtures/partd-formulary/2027_20261008/ (rows
 * of the CMS monthly Part D formulary file) and test/fixtures/pbp/2027/ (the PBP rows of
 * the same plans). Fails if the 5 examples in examples/partd-formulary/ stop being what
 * the importer writes from the fixtures, byte for byte; if a list or a plan stops
 * validating; if a drug's tier is not a tier the Medicare Advantage importer writes for
 * the same plan; or if a column rule, an error message or a refusal of
 * docs/specs/partd-formulary-importer.md changes.
 * Needs a local copy of Ajv (npm install ajv ajv-formats).
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const m = require('./from-partd-formulary.js');
const pbp = require('./from-pbp.js');

const REPO = path.join(__dirname, '..');
const FIXTURES = m.FIXTURE_DIR;
const RELEASE = m.GOLDEN_RELEASE;
const BASIC = 'basic drugs formulary file  20261031.txt';
const EXCLUDED = 'excluded drugs formulary file  20261031.txt';
const PLANS = 'plan information  20261031.txt';
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

let relOnce = null;
const rel = async () => (relOnce = relOnce || await m.loadRelease({ dataDir: FIXTURES, release: RELEASE }));

// A PBP-like document for an edge plan, whose PBP rows are not in the fixtures: the
// formulary importer reads only pharmacy and source_references from it. With no tiers it is
// a Defined Standard plan, cited as the PBP importer cites one, unless definedStandard is false.
const pbpLike = (key, tierIds, definedStandard = !tierIds) => ({
  plan_id: key,
  plan_identifiers: [{ system: 'cms_contract_plan_segment', value: key }],
  plan_name: 'Edge plan',
  carrier: 'Edge carrier',
  plan_year: 2027,
  network_tiers: [{ tier_id: 'IN', name: 'In-Network' }],
  pharmacy: { deductible: { amount: 0, currency: 'USD' }, ...(tierIds ? { formulary_tiers: tierIds.map((t) => ({ tier_id: t, name: `Tier ${t.slice(1)}` })) } : {}) },
  benefits: [],
  source_references: definedStandard ? [{ excerpt: `Part D: pbp_mrx.txt mrx_drug_ben_yn "1" (Yes), ${m.DEFINED_STANDARD}.` }] : [],
  schema_version: '1.2.0',
});
const costTiers = (r, key) => [...new Set(r.cost.get(key).map((row) => Number(row.cells[4])))].sort((a, b) => a - b).map((n) => `T${n}`);

// A copy of the fixture release in a temporary folder, with 1 file changed by edit(text).
// Every temporary folder is removed when the tests end.
const temps = [];
const tempDir = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'partd-')); temps.push(d); return d; };
test.after(() => { for (const d of temps) fs.rmSync(d, { recursive: true, force: true }); });
function mutated(file, edit) {
  const dir = tempDir();
  const to = path.join(dir, RELEASE);
  fs.mkdirSync(to);
  for (const f of fs.readdirSync(path.join(FIXTURES, RELEASE))) {
    const text = fs.readFileSync(path.join(FIXTURES, RELEASE, f), 'latin1');
    fs.writeFileSync(path.join(to, f), f === file ? edit(text) : text, 'latin1');
  }
  return dir;
}

// ---- the 5 examples ------------------------------------------------------------------------
test('the 5 examples are what the importer writes from the fixtures, byte for byte', async () => {
  const built = await m.buildGolden({ dataDir: FIXTURES, pbpDataDir: m.PBP_FIXTURE_DIR });
  const files = (dir) => fs.readdirSync(path.join(m.EXAMPLES_DIR, dir)).filter((f) => f.endsWith('.json')).map((f) => `${dir}/${f}`);
  assert.deepStrictEqual(built.map((b) => b.file).sort(), [...files('formularies'), ...files('plans')].sort());
  for (const { file, text } of built) assert.strictEqual(text, fs.readFileSync(path.join(m.EXAMPLES_DIR, file), 'utf8'), file);
});

test('every list and plan in examples/partd-formulary/ validates, and every drug is on a tier the PBP importer writes for the plan', () => {
  const v = m.validatorsOnce();
  const pbpExamples = fs.readdirSync(path.join(REPO, 'examples')).filter((f) => f.endsWith('.pbp.json')).map((f) => readJson(path.join(REPO, 'examples', f)));
  const pbpOf = (key) => pbpExamples.find((d) => d.plan_identifiers.some((p) => p.system === 'cms_contract_plan_segment' && p.value === key));
  const expected = { 'S5921-383-000': ['00027000', 3494, 6], 'S4802-146-000': ['00027165', 3260, 0], 'H2406-013-000': ['00027002', 3560, 6], 'H1036-068-000': ['00027368', 3350, 6], 'H5533-019-000': ['00027137', 3608, 0] };
  assert.deepStrictEqual(m.GOLDEN.map((g) => g.plan).sort(), Object.keys(expected).sort());
  for (const [key, [id, drugs, excluded]] of Object.entries(expected)) {
    const plan = readJson(path.join(m.EXAMPLES_DIR, 'plans', `${key}.json`));
    const list = readJson(path.join(m.EXAMPLES_DIR, 'formularies', `${id}.json`));
    assert.deepStrictEqual(v.plan(plan), [], key);
    assert.deepStrictEqual(v.list(list), [], id);
    const ref = plan.pharmacy.formulary_reference;
    assert.deepStrictEqual([ref.formulary_id, ref.formulary_items_url, ref.completeness], [id, `../formularies/${id}.json`, 'full_formulary']);
    assert.strictEqual(list.formulary_items.length, drugs, `${id} drugs`);
    assert.strictEqual((plan.pharmacy.formulary_items || []).length, excluded, `${key} own items`);
    assert.ok((plan.pharmacy.formulary_items || []).every((it) => it.coverage_basis === 'supplemental_mandatory'), `${key}: its own items are excluded drugs`);
    // The tier proof: the PBP example's tiers, unchanged, and every drug on one of them.
    const pbpDoc = pbpOf(key);
    assert.deepStrictEqual(plan.pharmacy.formulary_tiers, pbpDoc.pharmacy.formulary_tiers, `${key} tiers`);
    const ids = new Set(pbpDoc.pharmacy.formulary_tiers.map((t) => t.tier_id));
    for (const it of [...list.formulary_items, ...(plan.pharmacy.formulary_items || [])]) assert.ok(ids.has(it.formulary_tier_id), `${key} ${it.rxcui} ${it.formulary_tier_id}`);
    // Everything else is the PBP example's: the rest of pharmacy, the benefits, the identity, the first citations.
    const { formulary_items: a, formulary_reference: b, ...rest } = plan.pharmacy;
    assert.deepStrictEqual(rest, pbpDoc.pharmacy, `${key} pharmacy`);
    assert.deepStrictEqual(plan.benefits, pbpDoc.benefits, `${key} benefits`);
    assert.deepStrictEqual(plan.source_references.slice(0, pbpDoc.source_references.length), pbpDoc.source_references, `${key} citations`);
    for (const k of Object.keys(pbpDoc).filter((x) => !['pharmacy', 'source_references'].includes(x))) assert.deepStrictEqual(plan[k], pbpDoc[k], `${key} ${k}`);
    // A stand-alone drug plan gains its premium, from PREMIUM; a Medicare Advantage plan keeps the PBP importer's (finding N1).
    const extra = Object.keys(plan).filter((k) => !(k in pbpDoc));
    if (key.startsWith('S')) {
      assert.deepStrictEqual(extra, ['premium'], key);
      assert.deepStrictEqual(plan.premium, { amount: { 'S5921-383-000': 184.1, 'S4802-146-000': 5.3 }[key], currency: 'USD', period: 'per_month' }, key);
    } else assert.deepStrictEqual(extra, [], key);
  }
});

// ---- column rules (spec sections 5 and 6) -------------------------------------------------------
test('a Basic Drugs row becomes an item: tier T<n>, the flags, a quantity limit with no unit, the row quoted', async () => {
  const r = await rel();
  const list = m.buildList(r, '00027000');
  const item = (rx) => list.formulary_items.find((i) => i.rxcui === rx);
  assert.deepStrictEqual(item('1551300'), {
    rxcui: '1551300', ndc: '00002143380', formulary_tier_id: 'T3', covered: true, prior_authorization: true, step_therapy: false,
    quantity_limit: { value: 2, period: 'per_28_days' }, coverage_basis: 'medicare_covered', negotiation_selected_drug: false,
    source_references: [{ document: '2027_20261008.zip', excerpt: `${BASIC}: 00027000|8|2027|1551300|00002143380|3|Y|2|28|Y|N|N` }],
  });
  assert.deepStrictEqual(item('1593140').quantity_limit, { value: 0.5, period: 'per_1_days' }, 'a decimal amount, "0.50"');
  assert.deepStrictEqual(item('836636').quantity_limit, { value: 1, period: null }, '999 days: period null (decision D6)');
  assert.ok(item('836636').source_references[0].excerpt.endsWith('|Y|1|999|N|N|N'), 'and the row quotes the 999');
  assert.ok(list.formulary_items.every((i) => i.drug_name === undefined && (!i.quantity_limit || i.quantity_limit.units === undefined)), 'no name, no unit (gaps F1, F3)');
  assert.strictEqual(list.formulary_items.filter((i) => i.negotiation_selected_drug).length, 89);
  assert.deepStrictEqual(list.formulary_reference.formulary_version, '8');
  assert.strictEqual(list.plan_year, 2027);
  assert.strictEqual(list.source_references[0].excerpt, `${BASIC}, header: FORMULARY_ID|FORMULARY_VERSION|CONTRACT_YEAR|RXCUI|NDC|TIER_LEVEL_VALUE|QUANTITY_LIMIT_YN|QUANTITY_LIMIT_AMOUNT|QUANTITY_LIMIT_DAYS|PRIOR_AUTHORIZATION_YN|STEP_THERAPY_YN|SELECTED_DRUG_YN`);
  // The items follow the file's order.
  const rows = fs.readFileSync(path.join(FIXTURES, RELEASE, BASIC), 'latin1').split('\r\n').filter((l) => l.startsWith('00027000|'));
  assert.deepStrictEqual(list.formulary_items.map((i) => i.rxcui), rows.map((l) => l.split('|')[3]));
});

test('broken cells are errors that quote the file, the line and the cell', () => {
  const r = { names: { basic: 'b.txt', excluded: 'e.txt' }, zip: 'z.zip' };
  const row = (s, line = 7) => ({ cells: s.split('|'), raw: s, line });
  const errs = (fn, s) => { const e = []; fn(r, row(s), e); return e; };
  assert.deepStrictEqual(errs(m.basicItem, '00027000|8|2027|1551300|00002143380|3|Y| |28|Y|N|N'),
    ['b.txt line 7, QUANTITY_LIMIT_AMOUNT " " is not a number, with QUANTITY_LIMIT_YN on']);
  assert.deepStrictEqual(errs(m.basicItem, '00027000|8|2027|1551300|00002143380|3|N|2|28|Y|N|N'),
    ['b.txt line 7, QUANTITY_LIMIT_YN "N" with an amount "2" or days "28"']);
  assert.deepStrictEqual(errs(m.basicItem, '00027000|8|2027|1551300|00002143380|3|Y|2|0|Y|N|N'),
    ['b.txt line 7, QUANTITY_LIMIT_DAYS "0" is not a whole number of days, with QUANTITY_LIMIT_YN on']);
  assert.deepStrictEqual(errs(m.basicItem, '00027000|8|2027|1551300|0000214338|0|Y|2|28|X|N|N'), [
    'b.txt line 7, NDC "0000214338" is not 11 digits',
    'b.txt line 7, TIER_LEVEL_VALUE "0" is not a tier number from 1 to 99',
    'b.txt line 7, PRIOR_AUTHORIZATION_YN "X" is not "Y" or "N"',
  ]);
  assert.deepStrictEqual(errs(m.basicItem, '00027000|8|2027| |00002143380|3|N| | |N|N|N'), ['b.txt line 7, RXCUI " " is not an RxNorm concept id']);
  // Excluded Drugs codes its quantity limit flag 0 and 1, and Basic Drugs Y and N.
  assert.deepStrictEqual(errs(m.excludedItem, 'H1225|001|403957|2|Y|30|30|N|N|N'), ['e.txt line 7, QUANTITY_LIMIT_YN "Y" is not "0" or "1"']);
  assert.deepStrictEqual(errs(m.excludedItem, 'H1225|001|403957|2|1|30|30|N|N|N'), []);
});

test('an Excluded Drugs row is the plan\'s own item: supplemental_mandatory, capped_benefit, the row quoted', () => {
  const r = { names: { excluded: EXCLUDED }, zip: 'z.zip' };
  const e = [];
  const item = m.excludedItem(r, { cells: 'H1993|001|757707|2|1|30|30|N|N|Y'.split('|'), raw: 'H1993|001|757707|2|1|30|30|N|N|Y', line: 2 }, e);
  assert.deepStrictEqual(e, []);
  assert.deepStrictEqual(item, {
    rxcui: '757707', formulary_tier_id: 'T2', covered: true, prior_authorization: false, step_therapy: false,
    quantity_limit: { value: 30, period: 'per_30_days' }, coverage_basis: 'supplemental_mandatory', capped_benefit: true,
    source_references: [{ document: 'z.zip', excerpt: `${EXCLUDED}: H1993|001|757707|2|1|30|30|N|N|Y` }],
  });
});

// ---- the edge plans ------------------------------------------------------------------------------
test('a drug on both the Basic and the Excluded list is 2 items, told apart by coverage_basis (RXCUI 403957, H1225-001)', async () => {
  const r = await rel();
  const key = 'H1225-001-000';
  const { doc, facts } = m.buildPlanDocument(r, key, pbpLike(key, costTiers(r, key)), { mode: 'whole' });
  const both = doc.pharmacy.formulary_items.filter((i) => i.rxcui === '403957');
  assert.deepStrictEqual(both.map((i) => [i.coverage_basis, i.formulary_tier_id, i.prior_authorization]), [['medicare_covered', 'T3', true], ['supplemental_mandatory', 'T2', false]]);
  assert.strictEqual(facts.excluded, 17);
  assert.deepStrictEqual(m.validatorsOnce().plan(doc), []);
});

test('excluded drugs with a capped benefit (H1993-001): 13 items, every one capped', async () => {
  const r = await rel();
  const key = 'H1993-001-000';
  const { doc, facts } = m.buildPlanDocument(r, key, pbpLike(key, costTiers(r, key)), { mode: 'shared', items: [] });
  assert.deepStrictEqual([facts.excluded, facts.capped], [13, 13]);
  assert.ok(doc.pharmacy.formulary_items.every((i) => i.capped_benefit === true && i.coverage_basis === 'supplemental_mandatory'));
  assert.ok(doc.source_references.some((x) => x.excerpt.startsWith(`${EXCLUDED}, header:`) && x.excerpt.includes('13 rows for CONTRACT_ID "H1993", PLAN_ID "001"')));
});

test('indication based coverage (H2960-024): the plan\'s item has covered false and 1 exception per indication, and replaces the list\'s item', async () => {
  const r = await rel();
  const key = 'H2960-024-000';
  const whole = m.buildPlanDocument(r, key, pbpLike(key, costTiers(r, key)), { mode: 'whole' }).doc;
  const list = m.buildList(r, '00027403');
  const at = (items, rx) => items.findIndex((i) => i.rxcui === rx);
  for (const rx of ['1745108', '1745114', '727714']) {
    const i = at(whole.pharmacy.formulary_items, rx);
    assert.strictEqual(i, at(list.formulary_items, rx), `${rx} keeps the list's place`);
    assert.strictEqual(whole.pharmacy.formulary_items.filter((x) => x.rxcui === rx).length, 1, `${rx} once`);
  }
  const it = whole.pharmacy.formulary_items[at(whole.pharmacy.formulary_items, '1745108')];
  assert.strictEqual(it.covered, false);
  assert.deepStrictEqual(it.coverage_exceptions, ['ARTHRITIS, PSORIATIC', 'SPONDYLARTHRITIS', 'SPONDYLITIS, ANKYLOSING'].map((d) => ({ indication_code: null, indication_description: d, coverage_status: 'covered' })));
  assert.strictEqual(it.source_references.length, 4, 'the Basic row and the 3 indication rows');
  assert.deepStrictEqual(m.validatorsOnce().plan(whole), []);
  const shared = m.buildPlanDocument(r, key, pbpLike(key, costTiers(r, key)), { mode: 'shared', items: list.formulary_items }).doc;
  assert.deepStrictEqual(shared.pharmacy.formulary_items.map((i) => i.rxcui), whole.pharmacy.formulary_items.filter((i) => i.coverage_exceptions).map((i) => i.rxcui));
  assert.strictEqual(shared.pharmacy.formulary_reference.formulary_items_url, '../formularies/00027403.json');
});

test('a Defined Standard plan (H5580-001) gets its tiers from Beneficiary Cost, with no cost share (decision D4)', async () => {
  const r = await rel();
  const key = 'H5580-001-000';
  const { doc, facts, comparison } = m.buildPlanDocument(r, key, pbpLike(key, null), { mode: 'whole' });
  assert.strictEqual(facts.tiersFrom, 'beneficiary_cost');
  assert.deepStrictEqual(doc.pharmacy.formulary_tiers.map((t) => [t.tier_id, t.name, t.tier_code]), [['T1', 'Tier 1', undefined]]);
  assert.ok(doc.pharmacy.formulary_tiers[0].description.startsWith('beneficiary cost file  20261031.txt: TIER "1", TIER_SPECIALTY_YN "N" on '));
  assert.ok(doc.pharmacy.formulary_items.every((i) => i.formulary_tier_id === 'T1'));
  assert.deepStrictEqual(doc.benefits, [], 'no benefit is written from the cost file');
  assert.ok(doc.source_references.at(-1).excerpt.includes('a Defined Standard plan'));
  assert.strictEqual(comparison.compared, 2, 'the plan name and the deductible only: no PBP tiers to compare the cost rows with');
  assert.deepStrictEqual(m.validatorsOnce().plan(doc), []);
  // A plan with no tiers that the PBP document does not cite as Defined Standard is an error.
  assert.throws(() => m.buildPlanDocument(r, key, pbpLike(key, null, false)), /has no pharmacy\.formulary_tiers and does not cite mrx_benefit_type "1" \(Defined Standard\)/);
});

test('a drug on a tier the plan does not have, and Beneficiary Cost tiers that are not the PBP tiers, are errors', async () => {
  const r = await rel();
  const key = 'S5921-383-000';
  assert.throws(() => m.buildPlanDocument(r, key, pbpLike(key, ['T1', 'T2', 'T3', 'T4']), { mode: 'whole' }), (e) =>
    e.message.includes('the Beneficiary Cost tiers T1, T2, T3, T4, T5 are not the PBP document\'s tiers T1, T2, T3, T4') &&
    e.message.includes('is on T5, which is not a tier of the plan (T1, T2, T3, T4)'));
});

// ---- the plan, the release and the refusal ----------------------------------------------------------
test('a suppressed plan is refused with the cell quoted, and a plan that is not in the file is an error', async () => {
  const dir = mutated(PLANS, (t) => t.replace(/(S5921\|383\|000\|[^\r]*\|)N\r\n/, '$1Y\r\n'));
  const r = await m.loadRelease({ dataDir: dir, release: RELEASE });
  assert.throws(() => m.buildPlanDocument(r, 'S5921-383-000', pbpLike('S5921-383-000', null)), (e) => e.refusal === true &&
    /^S5921-383-000 is refused: plan information {2}20261031\.txt line \d+, PLAN_SUPPRESSED_YN "Y": CMS publishes no drug data for a suppressed plan/.test(e.message));
  const full = await rel();
  assert.throws(() => m.buildPlanDocument(full, 'S9999-001-000', pbpLike('S9999-001-000', null)), /no plan S9999-001-000 in plan information {2}20261031\.txt/);
});

test('a header that is not the layout\'s, a second row for 1 drug, and 2 versions of 1 formulary are errors', async () => {
  await assert.rejects(m.loadRelease({ dataDir: mutated(BASIC, (t) => t.replace('SELECTED_DRUG_YN', 'SELECTED_YN')), release: RELEASE }),
    /basic drugs formulary file {2}20261031\.txt: the header is not the layout's/);
  const first = (t) => t.split('\r\n').find((l) => l.startsWith('00027000|'));
  const dup = await m.loadRelease({ dataDir: mutated(BASIC, (t) => t + first(t) + '\r\n'), release: RELEASE });
  assert.throws(() => m.buildList(dup, '00027000'), /a second row for FORMULARY_ID "00027000", RXCUI "1551300" \(the first is line \d+\)/);
  const ver = await m.loadRelease({ dataDir: mutated(BASIC, (t) => t + first(t).replace('00027000|8|', '00027000|9|').replace('|1551300|', '|9999999|') + '\r\n'), release: RELEASE });
  assert.throws(() => m.buildList(ver, '00027000'), /FORMULARY_VERSION "9", where formulary 00027000 has "8"/);
  await assert.rejects(m.loadRelease({ dataDir: FIXTURES, release: '2027-20261008' }), /--release must be the zip's name without \.zip/);
});

test('the comparison with the PBP document: the 5 examples agree cell for cell; PREMIUM is kept beside the PBP premium, not compared', async () => {
  const r = await rel();
  const results = {};
  for (const g of m.GOLDEN) {
    const { doc } = await pbp.importPlan({ dataDir: m.PBP_FIXTURE_DIR, year: 2027, plan: g.plan });
    const { comparison } = m.buildPlanDocument(r, g.plan, doc, { mode: 'shared', items: [] });
    results[g.plan] = [comparison.compared, comparison.matched, comparison.differences.map((d) => d.kind), comparison.premium];
  }
  assert.deepStrictEqual(results, {
    'S5921-383-000': [104, 104, [], { file: 184.1, pbp: null }],
    'S4802-146-000': [150, 150, [], { file: 5.3, pbp: null }],
    'H2406-013-000': [104, 104, [], { file: 0, pbp: 0 }],
    'H1036-068-000': [108, 108, [], { file: 0, pbp: 0 }],
    // The Summary of Benefits prints $33; Medicare Plan Finder splits it $5.00 health and $28.00 drug (stop-2.md, N1).
    'H5533-019-000': [124, 124, [], { file: 28, pbp: 5 }],
  });
});

test('Plan Information rows that disagree, 2 contract years in 1 formulary, and an indication drug that is not on the list are errors', async () => {
  const twoRows = mutated(PLANS, (t) => {
    const lines = t.split('\r\n');
    const rows = lines.map((l, i) => [l, i]).filter(([l]) => l.startsWith('H2406|013|000|'));
    const [l, i] = rows[1];
    const c = l.split('|'); c[6] = '9.99'; lines[i] = c.join('|');
    return lines.join('\r\n');
  });
  const r1 = await m.loadRelease({ dataDir: twoRows, release: RELEASE });
  assert.throws(() => m.buildPlanDocument(r1, 'H2406-013-000', pbpLike('H2406-013-000', ['T1'])), /PREMIUM is "0\.00" on line \d+ and "9\.99" on line \d+ for the same plan/);
  const year = mutated(BASIC, (t) => t.replace('00027000|8|2027|1593140|', '00027000|8|2026|1593140|'));
  const r2 = await m.loadRelease({ dataDir: year, release: RELEASE });
  assert.throws(() => m.buildList(r2, '00027000'), /CONTRACT_YEAR "2026", where formulary 00027000 has "2027"/);
  const ibc = mutated('Indication Based Coverage Formulary File  20261031.txt', (t) => t.replace('H2960|024|727714|', 'H2960|024|9999999|'));
  const r3 = await m.loadRelease({ dataDir: ibc, release: RELEASE });
  assert.throws(() => m.buildPlanDocument(r3, 'H2960-024-000', pbpLike('H2960-024-000', costTiers(r3, 'H2960-024-000'))), /RXCUI "9999999" is not on formulary 00027403, the plan's Basic Drugs list/);
});

test('--all on the fixtures: every list once, the 5 golden plans as the examples, the edge plans as errors because their PBP rows are not in the fixtures, and the same bytes twice', async () => {
  const runOnce = async () => {
    const out = tempDir();
    const report = await m.runAll({ dataDir: FIXTURES, pbpDataDir: m.PBP_FIXTURE_DIR, release: RELEASE, outDir: out });
    return { out, report };
  };
  const a = await runOnce();
  const b = await runOnce();
  const files = (dir) => fs.readdirSync(dir, { recursive: true }).filter((f) => f.endsWith('.json') || f.endsWith('.jsonl')).map((f) => f.replace(/\\/g, '/')).sort();
  assert.deepStrictEqual(files(a.out), files(b.out));
  for (const f of files(a.out)) assert.ok(fs.readFileSync(path.join(a.out, f)).equals(fs.readFileSync(path.join(b.out, f))), `${f} differs between 2 runs`);
  assert.strictEqual(a.report.run.built, 5);
  assert.deepStrictEqual(a.report.run.refused, []);
  assert.deepStrictEqual(a.report.run.errors.map((e) => e.plan).sort(), m.EDGE.map((e) => e.plan).sort());
  assert.ok(a.report.run.errors.every((e) => /^PBP files: no plan [HS]\d{4}-\d{3}-\d{3} in pbp_Section_A\.txt$/.test(e.reason)));
  assert.strictEqual(files(a.out).filter((f) => f.startsWith('formularies/')).length, 9, '5 golden formularies and the 4 edge plans\' cuts');
  for (const g of m.GOLDEN) assert.strictEqual(fs.readFileSync(path.join(a.out, 'plans', `${g.plan}.json`), 'utf8'), fs.readFileSync(path.join(m.EXAMPLES_DIR, 'plans', `${g.plan}.json`), 'utf8'), g.plan);
  const perPlan = fs.readFileSync(path.join(a.out, 'plans.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepStrictEqual(perPlan.map((x) => [x.plan, x.excluded_items]), [['H1036-068-000', 6], ['H2406-013-000', 6], ['H5533-019-000', 0], ['S4802-146-000', 0], ['S5921-383-000', 6]]);
  assert.deepStrictEqual(a.report.comparison.premium, { no_pbp_premium: 2, both_zero: 2, equal_above_zero: 0, file_above_zero_pbp_zero: 0, file_zero_pbp_above_zero: 0, both_above_zero_differ: 1 });
  await assert.rejects(m.runAll({ dataDir: FIXTURES, pbpDataDir: m.PBP_FIXTURE_DIR, release: RELEASE, outDir: a.out }), /already holds documents/);
});

test('a PBP importer error is a refusal only when every message says the plan type is outside its scope', () => {
  const scope = 'plan type 18 (1876 Cost) is outside the importer\'s scope: HMO, HMOPOS, Local PPO, Regional PPO and Medicare Prescription Drug Plan';
  assert.strictEqual(m.pbpRefusal([scope]), true);
  assert.strictEqual(m.pbpRefusal([scope, 'pbp_a_plan_name is blank']), false);
  assert.strictEqual(m.pbpRefusal(['pbp_a_plan_name is blank']), false);
  assert.strictEqual(m.pbpRefusal([]), false);
});

test('the CLI writes 1 plan whole from the fixtures, and 1 list, each valid', () => {
  const run = (...args) => spawnSync(process.execPath, [path.join('scripts', 'from-partd-formulary.js'), '--data', path.relative(REPO, FIXTURES),
    '--pbp-data', path.relative(REPO, m.PBP_FIXTURE_DIR), '--release', RELEASE, ...args], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 << 20 });
  const plan = run('--plan', 'S5921-383-000');
  assert.strictEqual(plan.status, 0, plan.stderr);
  const doc = JSON.parse(plan.stdout);
  assert.strictEqual(doc.pharmacy.formulary_items.length, 3500, '3,494 drugs and 6 excluded drugs');
  assert.strictEqual(doc.pharmacy.formulary_reference.formulary_items_url, undefined, 'whole: no list to point at');
  assert.deepStrictEqual(m.validatorsOnce().plan(doc), []);
  const list = run('--formulary', '00027165');
  assert.strictEqual(list.status, 0, list.stderr);
  assert.strictEqual(list.stdout, fs.readFileSync(path.join(m.EXAMPLES_DIR, 'formularies', '00027165.json'), 'utf8'));
  const bad = run('--plan', 'S9999-001-000');
  assert.strictEqual(bad.status, 1);
  assert.match(bad.stderr, /^error: no plan S9999-001-000 in plan information/);
});
