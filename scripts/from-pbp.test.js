/**
 * Tests for scripts/from-pbp.js and scripts/pbp-sob-check.js
 *
 *   node --test scripts/from-pbp.test.js
 *
 * Fails if the importer's output drifts from the golden files examples/*.pbp.json,
 * if output is not deterministic, if the reader or a mapping rule changes
 * behavior (the Part D rules of docs/specs/pbp-part-d-mapping.md included), if
 * the crosswalk names a column the files do not have, or if a Summary of Benefits
 * check (H2406-013-000, H1036-068-000, S5921-383-000) finds a difference. The golden plans
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

const { spawnSync } = require('child_process');

const {
  streamTsv, buildDocument, serialize, loadPlan, validateDocument, pbpDir, goldenSlugs,
  GOLDEN, CROSSWALK, READ_FILES, EXAMPLES_DIR, FIXTURE_DIR, DATA_DIR, PART_D_PARAMETERS,
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
// The Medicare Advantage golden plans; the 2 PDPs have no medical benefits.
const maBuilt = async () => (await built()).filter((x) => x.result.doc.plan_type !== 'PDP');

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
        'handler', 'shared', 'shared_limit_id', 'when', 'value', 'kind', 'type', 'when_not_chosen', 'basis', 'basis_codes', 'code', 'section_c', 'section', 'label', 'source', 'covers', 'codes'].includes(k)) continue;
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
  for (const x of await maBuilt()) {
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

// ---- medical MVP gaps closed on 2026-10-20 (docs/specs/rtb-medical-mvp/README.md) ----------------------
async function alteredPart(plan, part, changes) {
  const { rows, source } = await loadPlan({ dataDir: FIXTURE_DIR, year: 2027, plan });
  rows[part] = { ...rows[part], ...changes };
  return buildDocument(rows, source);
}
const excerptStarting = (doc, start) => (doc.source_references.find((s) => s.excerpt.startsWith(start)) || {}).excerpt;

test('gap G1: category 7i is keyed physical_and_speech_therapy, a rehabilitation key since vocabulary 1.3.0', async () => {
  const vocab = readJson(path.join(REPO, 'vocabularies', 'canonical-benefits.json'));
  assert.strictEqual(vocab.benefits.find((b) => b.canonical_key === 'physical_and_speech_therapy').category, 'rehabilitation');
  assert.strictEqual(CROSSWALK.benefits.find((b) => b.pbp_code === '7i').canonical_key, 'physical_and_speech_therapy');
  for (const x of await maBuilt()) {
    assert.strictEqual(benefit(x.result.doc, 'PHYSICAL_AND_SPEECH_THERAPY').canonical_key, 'physical_and_speech_therapy', x.g.plan);
  }
});

test('gap G2: 14a preventive services, $0 in network on the attestation, out of network from the Section C groups', async () => {
  for (const x of await maBuilt()) {
    const b = benefit(x.result.doc, 'PREVENTIVE_SERVICES');
    assert.ok(b, `${x.g.plan} has no PREVENTIVE_SERVICES benefit`);
    assert.deepStrictEqual([b.canonical_key, b.coverage_basis, b.category], ['preventive_care', 'medicare_covered', 'PREVENTIVE_CARE']);
    const inn = b.network_cost_shares[0];
    assert.strictEqual(inn.tier_id, 'IN');
    assert.deepStrictEqual(inn.cost_shares.map((s) => [s.type, s.amount, s.applies_to_deductible]), [['copay', 0, false]]);
    assert.match(inn.notes, /pbp_b14a_mc_prevent_attest "1"/);
  }
  const ppo = benefit(await docFor('H2406-013-000'), 'PREVENTIVE_SERVICES').network_cost_shares[1];
  assert.deepStrictEqual([ppo.tier_id, ppo.cost_shares[0].type, ppo.cost_shares[0].rate_min, ppo.cost_shares[0].rate_max], ['OUT', 'coinsurance', 0, 0.4]);
  assert.strictEqual(benefit(await docFor('H1609-028-000'), 'PREVENTIVE_SERVICES').network_cost_shares[1].tier_id, 'POS');
  assert.deepStrictEqual(benefit(await docFor('H5425-140-000'), 'PREVENTIVE_SERVICES').conditions.map((c) => c.type), ['authorization', 'referral']);
});

test('gap G2: a blank attestation writes no benefit, with a warning; any other value is an error', async () => {
  const blank = await altered('H2406-013-000', 'pbp_b14_preventive.txt', { pbp_b14a_mc_prevent_attest: '' });
  assert.deepStrictEqual(blank.warnings.map((w) => w.kind), ['medicare-covered-cost-share-blank']);
  assert.strictEqual(benefit(blank.doc, 'PREVENTIVE_SERVICES'), undefined);
  const other = await altered('H2406-013-000', 'pbp_b14_preventive.txt', { pbp_b14a_mc_prevent_attest: '2' });
  assert.strictEqual(other.doc, null);
  assert.ok(other.errors.some((e) => e.includes('pbp_b14a_mc_prevent_attest "2" is not 1')));
});

test('gap G2: a deductible on all in-network Medicare-covered services does not reach 14a; a category list that names 14a is an error', async () => {
  const filed = { pbp_d_inn_deduct_yn: '1', pbp_d_inn_deduct_partb_yn: '2', pbp_d_inn_deduct_amt: '250.00', pbp_d_inn_deduct_bens: '01' };
  const all = await alteredPart('H1036-068-000', 'd', { ...filed, pbp_d_inn_deduct_m_yn: '1' });
  assert.deepStrictEqual(all.errors, []);
  const inn = benefit(all.doc, 'PREVENTIVE_SERVICES').network_cost_shares[0];
  assert.strictEqual(inn.cost_shares[0].applies_to_deductible, false);
  assert.match(inn.notes, /all in-network Medicare-covered services \(pbp_d_inn_deduct_m_yn "1"\)/);
  assert.strictEqual(benefit(all.doc, 'PRIMARY_CARE').network_cost_shares[0].cost_shares[0].applies_to_deductible, true, 'other categories still apply');
  const listed = await alteredPart('H1036-068-000', 'd', { ...filed, pbp_d_inn_deduct_m_yn: '2', pbp_d_inn_deduct_m_cats: '7a;14a;' });
  assert.strictEqual(listed.doc, null);
  assert.ok(listed.errors.some((e) => e.includes('pbp_d_inn_deduct_m_cats "7a;14a;" names 14a')), listed.errors.join('; '));
});

test('gap G3: Section D premium and Part B premium reduction, with no period; absent stays absent', async () => {
  const want = { 'H2406-013-000': [0, null], 'H1036-068-000': [0, 5.4], 'H1609-028-000': [0, null], 'H5533-019-000': [5, 1], 'H5425-140-000': [2, null] };
  for (const x of await maBuilt()) {
    const doc = x.result.doc;
    const [premium, reduction] = want[x.g.plan];
    assert.deepStrictEqual(doc.premium, { amount: premium, currency: 'USD' }, x.g.plan);
    assert.deepStrictEqual(doc.part_b_premium_reduction, reduction === null ? undefined : { amount: reduction }, x.g.plan);
    const ex = excerptStarting(doc, 'Premium from Section D:');
    assert.ok(ex.includes(`pbp_d_mplusc_premium "${x.rows.d.pbp_d_mplusc_premium}"`), x.g.plan);
    assert.ok(ex.includes(`pbp_d_mco_pay_reduct_yn "${reduction === null ? 2 : 1}"`), x.g.plan);
  }
  const blank = await alteredPart('H5533-019-000', 'd', { pbp_d_mplusc_premium: '' });
  assert.strictEqual(blank.doc.premium, undefined);
  assert.ok(!blank.doc.source_references.some((s) => s.excerpt.includes('pbp_d_mplusc_premium "')), 'a blank premium is not quoted as an answer');
  const noAmount = await alteredPart('H5533-019-000', 'd', { pbp_d_mco_pay_reduct_amt: '' });
  assert.ok(noAmount.errors.some((e) => e.includes('pbp_d_mco_pay_reduct_yn "1" but pbp_d_mco_pay_reduct_amt ""')));
  const bOnly = await alteredPart('H5533-019-000', 'd', { pbp_d_mplusc_bonly_premium: '3.00' });
  assert.ok(excerptStarting(bOnly.doc, 'Premium from Section D:').includes('pbp_d_mplusc_bonly_premium "3.00"'));
  assert.deepStrictEqual(bOnly.doc.premium, { amount: 5, currency: 'USD' });
});

test('gaps G4 and G5: Section A phone, website and provider directory; an address with no scheme is quoted, not written', async () => {
  const want = {
    'H2406-013-000': ['(866)627-7806', null, null],
    'H1036-068-000': ['(800)457-4708', null, 'https://www.humana.com/find-care?cm_mmc=provider_Medicare_gov-_-Medicare_gov_link-_-Vanity-_-Link'],
    'H1609-028-000': ['(833)570-6670', null, null],
    'H5533-019-000': ['(877)539-3080', 'https://www.upmchealthplan.com/medicare/', 'https://findcare.upmchealthplan.com/browse?caretype=Medical'],
    'H5425-140-000': ['(800)559-3500', null, null],
  };
  for (const x of await maBuilt()) {
    const doc = x.result.doc;
    const [phone, website, directory] = want[x.g.plan];
    assert.deepStrictEqual(doc.contacts, website ? { member_services_phone: phone, website } : { member_services_phone: phone }, x.g.plan);
    assert.deepStrictEqual(doc.network_tiers.filter((t) => t.provider_directory_url).map((t) => [t.tier_id, t.provider_directory_url]),
      directory ? [['IN', directory]] : [], x.g.plan);
    const ex = excerptStarting(doc, 'Contacts and the provider directory from Section A:');
    for (const col of ['pbp_a_curmbr_phone', 'pbp_a_org_website', 'pbp_a_phys_web_addr']) {
      assert.ok(ex.includes(`${col} "${x.rows.a[col]}"`), `${x.g.plan}: ${col} is quoted`);
    }
    if (!website) assert.match(ex, /pbp_a_org_website "[^"]*", not written as contacts\.website: it has no scheme/);
    assert.ok(!excerptStarting(doc, 'Section A values with no').includes('pbp_a_org_website'), 'the website has a field now');
  }
  const none = await alteredPart('H1036-068-000', 'a', { pbp_a_curmbr_phone: '', pbp_a_org_website: '', pbp_a_phys_web_addr: '' });
  assert.deepStrictEqual(none.errors, []);
  assert.strictEqual(none.doc.contacts, undefined);
  assert.ok(!none.doc.network_tiers.some((t) => 'provider_directory_url' in t));
});

// ---- Part D (docs/specs/pbp-part-d-mapping.md section 16) --------------------------------------------
// The rows of a fixture plan, changed by fn on a deep copy, then built.
async function alteredWith(plan, fn) {
  const { rows, source } = await loadPlan({ dataDir: FIXTURE_DIR, year: 2027, plan });
  const copy = JSON.parse(JSON.stringify(rows));
  fn(copy, source);
  return buildDocument(copy, source);
}
const partD = (doc) => doc.benefits.filter((b) => b.benefit_type === 'pharmacy');
const firstStep = (b) => b.network_cost_shares[0].cost_shares[0];
const tierRowOf = (rows, id) => rows.mrxTiers.find((t) => t.mrx_tier_id === id);
const postRowOf = (rows, id) => rows.mrxPost.find((t) => t.mrx_tier_post_id === id);
const excerpts = (doc) => doc.source_references.map((s) => s.excerpt);

// Every pbp_mrx.txt Part D column blank but mrx_drug_ben_yn, and no tier or post-threshold rows.
function onlyDrugBenefitAnswer(rows, answer) {
  for (const k of Object.keys(rows.mrx)) if (/^(mrx_|part_d_)/.test(k)) rows.mrx[k] = '';
  rows.mrx.mrx_drug_ben_yn = answer;
  rows.mrxTiers = [];
  rows.mrxPost = [];
}
const noPartD = (rows) => onlyDrugBenefitAnswer(rows, '2');

// A Defined Standard plan, as H0034-001-000 files it: no tier rows, the amount with no deductible answer.
function definedStandard(rows) {
  for (const k of Object.keys(rows.mrx)) if (/^mrx_/.test(k) && !['mrx_drug_ben_yn', 'mrx_ltc_attest_flag'].includes(k)) rows.mrx[k] = '';
  Object.assign(rows.mrx, { mrx_benefit_type: '1', mrx_partd_network_loc: '110110', mrx_alt_ded_amount: '700.00',
    mrx_gen_loc_rstd: '110', mrx_gen_rstd_1m: '30', mrx_gen_rstd_3m: '90', mrx_gen_ira_rstd_copay_1m: '35.00' });
  rows.mrxTiers = [];
  rows.mrxPost = [];
}

// An Actuarially Equivalent Standard plan, as S5884-105-000 files it: the amount, no deductible answer, the mrx_ae_ columns.
function actuariallyEquivalent(rows) {
  for (const k of ['mrx_alt_ded_charge', 'mrx_alt_ded_type_yn', 'mrx_alt_no_ded_tier', 'mrx_alt_ded_tier_cstshr_yn', 'mrx_alt_oon_cstshr_struct',
    'mrx_alt_red_cost_sharing', 'mrx_alt_red_cost_sharing_items', 'mrx_alt_excl_drugs_yn', 'mrx_alt_pre_icl_cost_share', 'mrx_alt_cstshr_post_oopt']) rows.mrx[k] = '';
  Object.assign(rows.mrx, { mrx_benefit_type: '2', mrx_alt_ded_amount: '700.00', mrx_ae_oon_cstshr_struct: '2', mrx_ae_cstshr_apply: '2', mrx_ae_ooptcs_apply: '1' });
  for (const t of rows.mrxTiers) t.mrx_tier_benefit_type = '2';
  for (const p of rows.mrxPost) p.mrx_tier_post_benefit_type = '2';
}

// The (index, benefit_id, day_supply) rows of docs/specs/pbp-part-d/profile/plans/<plan>-benefits.md.
function listing(plan) {
  const text = fs.readFileSync(path.join(REPO, 'docs', 'specs', 'pbp-part-d', 'profile', 'plans', `${plan}-benefits.md`), 'utf8');
  return [...text.matchAll(/^\| (\d+) \| `([A-Z0-9_]+)` \| (\d*) \|/gm)].map((m) => [Number(m[1]), m[2], m[3] === '' ? undefined : Number(m[3])]);
}

test('part-d populations: an MA-PD plan gets pharmacy and its Part D benefits after the medical benefits', async () => {
  const doc = await docFor('H1036-068-000');
  const without = await alteredWith('H1036-068-000', noPartD);
  assert.strictEqual(without.doc.benefits.length, 38);
  assert.deepStrictEqual(doc.benefits.slice(0, 38), without.doc.benefits, 'the medical benefits and their indexes do not move');
  assert.strictEqual(doc.benefits.length, 80);
  assert.ok(doc.benefits.slice(38).every((b) => b.benefit_type === 'pharmacy' && b.category === 'PHARMACY'));
  assert.ok(doc.benefits.slice(0, 38).every((b) => b.benefit_type !== 'pharmacy'));
  assert.deepStrictEqual(Object.keys(doc.pharmacy), ['deductible', 'out_of_pocket_max', 'coverage_stages', 'formulary_tiers', 'pharmacy_networks']);
  const keys = Object.keys(doc);
  assert.deepStrictEqual(keys.slice(keys.indexOf('accumulators'), keys.indexOf('accumulators') + 3), ['accumulators', 'pharmacy', 'benefits']);
  for (const x of await maBuilt()) assert.ok(x.result.doc.pharmacy && partD(x.result.doc).length > 0, `${x.g.plan} is an MA-PD plan`);
});

test('part-d populations: mrx_drug_ben_yn "2" writes no pharmacy object and quotes the answer', async () => {
  const r = await alteredWith('H1036-068-000', noPartD);
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.doc.pharmacy, undefined);
  assert.strictEqual(partD(r.doc).length, 0);
  const ex = excerpts(r.doc).filter((e) => e.startsWith('Part D:'));
  assert.strictEqual(ex.length, 1);
  assert.match(ex[0], /^Part D: pbp_mrx\.txt mrx_drug_ben_yn "2" \(No\): the plan offers no Medicare prescription drug \(Part D\) benefit/);
  assert.ok(!excerpts(r.doc).some((e) => e.startsWith('Every non-blank pbp_mrx.txt cell')), '1 entry only');
  const rows = await alteredWith('H1036-068-000', (x) => { x.mrx.mrx_drug_ben_yn = '2'; });
  assert.strictEqual(rows.doc, null);
  assert.ok(rows.errors.some((e) => e.includes('mrx_drug_ben_yn "2" (No) but the plan has 5 pbp_mrx_tier.txt rows')), rows.errors.join('; '));
  const code = await alteredWith('H1036-068-000', (x) => { x.mrx.mrx_drug_ben_yn = '3'; });
  assert.ok(code.errors.some((e) => e.includes('mrx_drug_ben_yn "3" is not 1 (Yes) or 2 (No)')), code.errors.join('; '));
});

test('part-d populations: an employer MA-PD with a blank benefit type writes no pharmacy object and a source reference', async () => {
  const r = await alteredWith('H1036-068-000', (x) => { onlyDrugBenefitAnswer(x, '1'); x.a.pbp_a_eghp_yn = '1'; });
  assert.deepStrictEqual(r.errors, []);
  assert.strictEqual(r.doc.pharmacy, undefined);
  assert.strictEqual(r.doc.benefits.length, 38);
  const ex = excerpts(r.doc).filter((e) => e.startsWith('Part D:'));
  assert.strictEqual(ex.length, 1);
  assert.ok(ex[0].includes('mrx_drug_ben_yn "1" (Yes)') && ex[0].includes('mrx_benefit_type is blank') && ex[0].includes('pbp_a_eghp_yn "1"'), ex[0]);
  const filled = await alteredWith('H1036-068-000', (x) => { onlyDrugBenefitAnswer(x, '1'); x.mrx.mrx_alt_ded_amount = '700.00'; });
  assert.ok(filled.errors.some((e) => e.includes('mrx_benefit_type is blank but pbp_mrx.txt fills mrx_alt_ded_amount "700.00"')), filled.errors.join('; '));
});

test('part-d populations: a Defined Standard plan writes the deductible, the threshold and the stages, and no tiers or Part D benefits', async () => {
  const r = await alteredWith('H1036-068-000', definedStandard);
  assert.deepStrictEqual(r.errors, []);
  assert.deepStrictEqual(r.doc.pharmacy, {
    deductible: { amount: 700, currency: 'USD' },
    out_of_pocket_max: { amount: 2400, currency: 'USD' },
    coverage_stages: [
      { stage_id: 'DEDUCTIBLE', name: 'Deductible', stage_type: 'deductible' },
      { stage_id: 'INITIAL', name: 'Initial Coverage', stage_type: 'initial' },
      { stage_id: 'CATASTROPHIC', name: 'Catastrophic Coverage', stage_type: 'catastrophic', applies_after_total_out_of_pocket: 2400 },
    ],
  });
  assert.strictEqual(partD(r.doc).length, 0);
  const ex = excerpts(r.doc).find((e) => e.startsWith('Part D:'));
  assert.ok(ex.includes('mrx_benefit_type "1" (Defined Standard)') && ex.includes('states no initial coverage cost share'), ex);
  assert.ok(excerpts(r.doc).find((e) => e.startsWith('Every non-blank pbp_mrx.txt cell')).includes('mrx_gen_loc_rstd "110"'));
  const rows = await alteredWith('H1036-068-000', (x) => { x.mrx.mrx_benefit_type = '1'; });
  assert.strictEqual(rows.doc, null, 'a Defined Standard plan with tier rows is an error');
});

test('part-d PDP: document shape', async () => {
  const doc = await docFor('S5921-383-000');
  assert.deepStrictEqual([doc.plan_type, doc.market, doc.plan_year, doc.plan_name], ['PDP', 'medicare_part_d', 2027, 'AARP Medicare Rx Preferred from UHC (PDP)']);
  const markets = readJson(path.join(REPO, 'vocabularies', 'markets.json'));
  assert.deepStrictEqual([markets.version, markets.vocabulary_id], ['1.2.0', 'https://benefitplanstandard.org/vocabularies/v1.2.0/markets.json'],
    'medicare_part_d is markets vocabulary 1.2.0');
  assert.ok(markets.markets.some((m) => m.code === 'medicare_part_d'));
  assert.deepStrictEqual(doc.plan_identifiers, [
    { system: 'cms_contract_plan_segment', value: 'S5921-383-000' },
    { system: 'cms_contract_id', value: 'S5921' },
    { system: 'cms_pbp_id', value: '383' },
  ]);
  assert.deepStrictEqual(doc.network_tiers, [{
    tier_id: 'IN',
    name: 'In-Network',
    description: 'A stand-alone Part D plan has no medical provider network. Its Part D cost shares are written on this tier; the pharmacy each ' +
      "applies at is the benefit's pharmacy_network_id (docs/specs/pbp-part-d-mapping.md section 6).",
    tier_class: 'network',
  }]);
  for (const k of ['accumulators', 'service_area', 'premium', 'part_b_premium_reduction']) assert.strictEqual(doc[k], undefined, k);
  assert.strictEqual(doc.benefits.length, 41);
  assert.ok(doc.benefits.every((b) => b.benefit_type === 'pharmacy'));
  assert.ok(excerpts(doc).includes('Service area from PlanRegionArea.txt (regions, no counties; schema gap, spec section 9.1): 11 "Florida" (region_type "PD").'));
  assert.ok(excerpts(doc).some((e) => e.startsWith('Premium: not written. The PDP premium is in no PBP file')));
  assert.ok(excerpts(doc).includes('Plan type: pbp_a_plan_type "29" (Medicare Prescription Drug Plan), written as plan_type "PDP".'));
  assert.ok(!excerpts(doc).some((e) => e.startsWith('Benefits: the ') || e.startsWith('Premium from Section D')), 'no medical entries');
  for (const [part, value] of [['d', {}], ['c', {}], ['area', [{}]]]) {
    const bad = await alteredWith('S5921-383-000', (x) => { x[part] = value; });
    assert.strictEqual(bad.doc, null, part);
  }
});

test('part-d PDP: contacts.member_services_phone from pbp_a_pd_curmbr_phone, quoted with its title', async () => {
  const want = { 'S5921-383-000': '(866)870-3470', 'S4802-146-000': '(888)550-5252' };
  for (const [plan, phone] of Object.entries(want)) {
    const x = (await built()).find((y) => y.g.plan === plan);
    assert.strictEqual(x.result.doc.contacts.member_services_phone, phone, plan);
    const ex = excerptStarting(x.result.doc, 'Contacts and the provider directory from Section A:');
    assert.ok(ex.startsWith(`Contacts and the provider directory from Section A: pbp_a_pd_curmbr_phone "${phone}" (Customer Service Contact Phone Number ` +
      'for Current Part D Medicare Beneficiaries), written as contacts.member_services_phone;'), ex);
    assert.ok(!ex.includes('pbp_a_curmbr_phone'), 'a PDP files its phone in the Part D column, so the Medicare Advantage column is not read');
  }
  const blank = await alteredWith('S5921-383-000', (x) => { x.a.pbp_a_pd_curmbr_phone = ''; });
  assert.deepStrictEqual(blank.errors, []);
  assert.strictEqual(blank.doc.contacts, undefined, 'the website has no scheme, so no contact is written');
  assert.ok(excerptStarting(blank.doc, 'Contacts and the provider directory from Section A:').includes('pbp_a_pd_curmbr_phone is blank, so contacts.member_services_phone is not written'));
  const ext = await alteredWith('S5921-383-000', (x) => { x.a.pbp_a_pd_curmbr_phone_ext = '123'; });
  assert.ok(excerptStarting(ext.doc, 'Contacts and the provider directory from Section A:').includes('pbp_a_pd_curmbr_phone_ext "123", which has no Benefit Plan Standard field'));
  assert.strictEqual((await docFor('H1036-068-000')).contacts.member_services_phone, '(800)457-4708', 'a Medicare Advantage plan reads pbp_a_curmbr_phone, as before');
});

test('part-d PDP: type 30 is refused with the reason', async () => {
  const r = await alteredWith('S5921-383-000', (x) => { x.a.pbp_a_plan_type = '30'; x.mrx = null; x.mrxTiers = []; x.mrxPost = []; });
  assert.strictEqual(r.doc, null);
  assert.deepStrictEqual(r.errors, ['plan type 30 (Employer/Union Only Direct Contract PDP) is outside the importer\'s scope: the PBP files hold no ' +
    'Part D benefit for it (no pbp_mrx.txt row; docs/specs/pbp-part-d-mapping.md section 4.1)']);
  const other = await alteredWith('H1036-068-000', (x) => { x.a.pbp_a_plan_type = '09'; });
  assert.deepStrictEqual(other.errors, ['plan type 09 (PFFS) is outside the importer\'s scope: HMO, HMOPOS, Local PPO, Regional PPO and ' +
    'Medicare Prescription Drug Plan only (spec section 1)']);
});

test('part-d PDP: an employer PDP with no Part D design is refused', async () => {
  const r = await alteredWith('S5921-383-000', (x) => { onlyDrugBenefitAnswer(x, '1'); x.a.pbp_a_eghp_yn = '1'; });
  assert.strictEqual(r.doc, null);
  assert.deepStrictEqual(r.errors, ['the PBP files hold no Part D design for this employer group PDP (pbp_a_eghp_yn "1"; mrx_benefit_type blank; ' +
    'only mrx_drug_ben_yn "1" is filled; docs/specs/pbp-part-d-mapping.md section 4.1)']);
});

test('part-d errors: a missing pbp_mrx row, a benefit type that disagrees with the tier rows, mrx_formulary_tiers_num against the rows, tier ids, post-threshold pairs', async () => {
  const has = (r, text) => assert.ok(r.doc === null && r.errors.some((e) => e.includes(text)), `${text}: ${r.errors.join('; ')}`);
  has(await alteredWith('H1036-068-000', (x) => { x.mrx = null; }), 'no pbp_mrx.txt row');
  has(await alteredWith('S5921-383-000', (x) => { x.mrx = null; }), 'no pbp_mrx.txt row');
  has(await alteredWith('H1036-068-000', (x) => { x.mrxTiers = []; x.mrxPost = []; }), 'mrx_benefit_type "4" (Enhanced Alternative) but the plan has no pbp_mrx_tier.txt row');
  has(await alteredWith('H1036-068-000', (x) => { x.mrx.mrx_formulary_tiers_num = '4'; }), 'mrx_formulary_tiers_num "4" but the plan has 5 pbp_mrx_tier.txt rows');
  has(await alteredWith('H1036-068-000', (x) => { tierRowOf(x, '5').mrx_tier_id = '7'; }), 'mrx_tier_id values "1", "2", "3", "4", "7" do not run 1 to 5');
  has(await alteredWith('H1036-068-000', (x) => { tierRowOf(x, '5').mrx_tier_label_list = 'Generic'; }), 'mrx_tier_label_list "Generic" is on more than 1 tier');
  has(await alteredWith('H1036-068-000', (x) => { postRowOf(x, '2').mrx_tier_post_label_list = 'Brand'; }),
    'the pbp_mrx_p.txt tiers (mrx_tier_post_id, mrx_tier_post_label_list) are not the pbp_mrx_tier.txt tiers');
});

test('part-d tiers: tier_id, name, description, and tier_code and drug_class from the label table', async () => {
  const doc = await docFor('S4802-146-000');
  assert.deepStrictEqual(doc.pharmacy.formulary_tiers.map((t) => [t.tier_id, t.name, t.tier_code, t.drug_class]), [
    ['T1', 'Tier 1: Generic', 'generic', 'generic'],
    ['T2', 'Tier 2: Preferred Brand', 'preferred-brand', 'preferred_brand'],
    ['T3', 'Tier 3: Non-Preferred Drug', 'non-preferred', undefined],
    ['T4', 'Tier 4: Injectable Drugs', undefined, undefined],
    ['T5', 'Tier 5: Specialty Tier', 'specialty', undefined],
    ['T6', 'Tier 6: Select Care Drugs', undefined, undefined],
  ]);
  const t3 = (await docFor('H1036-068-000')).pharmacy.formulary_tiers[2];
  assert.deepStrictEqual(Object.keys(t3), ['tier_id', 'name', 'drug_class', 'tier_code', 'description']);
  assert.strictEqual(t3.description, 'pbp_mrx_tier.txt mrx_tier_id "3", mrx_tier_label_list "Preferred Brand", mrx_tier_type_id "1" (ICP), ' +
    'mrx_tier_drug_type "11" (Brand; Generic), mrx_tier_includes "1" (Part D Drugs Only), mrx_tier_cstshr_struct_type "1" (Coinsurance), ' +
    'mrx_tier_extd_days_yn "2", mrx_tier_extd_first_fill "2".');
});

test('part-d tiers: an unknown label is written by name with the warning part-d-tier-label-unknown', async () => {
  const r = await alteredWith('H1036-068-000', (x) => {
    tierRowOf(x, '4').mrx_tier_label_list = 'Brand Plus';
    postRowOf(x, '4').mrx_tier_post_label_list = 'Brand Plus';
  });
  assert.deepStrictEqual(r.errors, []);
  assert.deepStrictEqual(r.warnings.map((w) => w.kind), ['part-d-tier-label-unknown']);
  assert.match(r.warnings[0].detail, /mrx_tier_id "4", mrx_tier_label_list "Brand Plus"/);
  const t4 = r.doc.pharmacy.formulary_tiers[3];
  assert.deepStrictEqual(Object.keys(t4), ['tier_id', 'name', 'description']);
  assert.strictEqual(t4.name, 'Tier 4: Brand Plus');
  const rx = partD(r.doc).filter((b) => b.formulary_tier_id === 'T4');
  assert.strictEqual(rx.length, 9);
  assert.ok(rx.every((b) => b.canonical_key === undefined && b.raw_label === 'Brand Plus'));
  assert.ok(rx.every((b) => b.source_references[0].excerpt.endsWith('; no canonical key, carried by name (spec section 9.1).')));
});

test('part-d networks: the networks the location flags use, in order, and mrx_partd_network_loc must agree', async () => {
  const ids = (doc) => doc.pharmacy.pharmacy_networks.map((n) => n.network_id);
  assert.deepStrictEqual(ids(await docFor('H1036-068-000')), ['RETAIL_STANDARD', 'MAIL_ORDER_STANDARD', 'MAIL_ORDER_PREFERRED', 'OUT_OF_NETWORK', 'LONG_TERM_CARE']);
  assert.deepStrictEqual((await docFor('S5921-383-000')).pharmacy.pharmacy_networks, [
    { network_id: 'RETAIL_STANDARD', name: 'Standard retail', network_type: 'standard_retail' },
    { network_id: 'RETAIL_PREFERRED', name: 'Preferred retail', network_type: 'preferred_retail' },
    { network_id: 'MAIL_ORDER_STANDARD', name: 'Standard mail order', network_type: 'mail_order' },
    { network_id: 'MAIL_ORDER_PREFERRED', name: 'Preferred mail order', network_type: 'mail_order' },
    { network_id: 'OUT_OF_NETWORK', name: 'Out-of-network pharmacy', network_type: 'out_of_network' },
    { network_id: 'LONG_TERM_CARE', name: 'Long-term care pharmacy', network_type: 'long_term_care' },
  ]);
  const loc = await alteredWith('H1036-068-000', (x) => { x.mrx.mrx_partd_network_loc = '110100'; });
  assert.ok(loc.doc === null && loc.errors.some((e) => e.includes('mrx_partd_network_loc "110100" (Long-Term Care; Standard Retail; Out-of-Network) ' +
    'but the tier rows use Long-Term Care; Standard Retail; Out-of-Network; Standard/Preferred Mail-Order')), loc.errors.join('; '));
  const flag = await alteredWith('H1036-068-000', (x) => { tierRowOf(x, '1').mrx_tier_locat_rstd = '1x0'; });
  assert.ok(flag.doc === null && flag.errors.some((e) => e.includes('mrx_tier_locat_rstd "1x0" is not a string of 3 characters 0 or 1')), flag.errors.join('; '));
});

test('part-d stages: DEDUCTIBLE only with a deductible; CATASTROPHIC carries the threshold; no coverage gap', async () => {
  assert.deepStrictEqual((await docFor('H1036-068-000')).pharmacy.coverage_stages, [
    { stage_id: 'DEDUCTIBLE', name: 'Deductible', stage_type: 'deductible' },
    { stage_id: 'INITIAL', name: 'Initial Coverage', stage_type: 'initial' },
    { stage_id: 'CATASTROPHIC', name: 'Catastrophic Coverage', stage_type: 'catastrophic', applies_after_total_out_of_pocket: 2400 },
  ]);
  for (const x of await built()) {
    const stages = x.result.doc.pharmacy.coverage_stages;
    assert.ok(!stages.some((s) => /gap/i.test(s.stage_id + s.stage_type)), x.g.plan);
    assert.ok(excerpts(x.result.doc).find((e) => e.startsWith('Coverage stages:')).includes('no coverage gap stage'), x.g.plan);
  }
  const none = await alteredWith('H1036-068-000', (x) => Object.assign(x.mrx, { mrx_alt_ded_charge: '3', mrx_alt_ded_amount: '', mrx_alt_ded_type_yn: '', mrx_alt_no_ded_tier: '' }));
  assert.deepStrictEqual(none.doc.pharmacy.coverage_stages.map((s) => s.stage_id), ['INITIAL', 'CATASTROPHIC']);
});

test('part-d deductible: code 1 with skipped tiers', async () => {
  const doc = await docFor('H1036-068-000');
  assert.deepStrictEqual(doc.pharmacy.deductible, { amount: 700, currency: 'USD', applies_to_tiers: ['T4', 'T5'] });
  const ex = excerpts(doc).find((e) => e.startsWith('Part D deductible:'));
  assert.ok(ex.includes('mrx_alt_ded_charge "1" (Yes)') && ex.includes('mrx_alt_no_ded_tier "0111000" (Tier 1; Tier 2; Tier 3)'), ex);
  assert.ok(ex.includes('the contract year 2027 standard deductible, 700 USD'), ex);
  assert.deepStrictEqual((await docFor('S4802-146-000')).pharmacy.deductible.applies_to_tiers, ['T2', 'T3', 'T4', 'T5']);
});

test('part-d deductible: code 2', async () => {
  const doc = await docFor('S5921-383-000');
  assert.deepStrictEqual(doc.pharmacy.deductible, { amount: 300, currency: 'USD', applies_to_tiers: ['T3', 'T4', 'T5'] });
  assert.ok(excerpts(doc).find((e) => e.startsWith('Part D deductible:')).includes('mrx_alt_ded_charge "2" (No, enter amount), mrx_alt_ded_amount "300.00"'));
  assert.deepStrictEqual((await docFor('H2406-013-000')).pharmacy.deductible.amount, 685);
});

test('part-d deductible: code 3, the standard benefit types, all tiers, and the not-standard warning', async () => {
  const none = await alteredWith('H1036-068-000', (x) => Object.assign(x.mrx, { mrx_alt_ded_charge: '3', mrx_alt_ded_amount: '', mrx_alt_ded_type_yn: '', mrx_alt_no_ded_tier: '' }));
  assert.deepStrictEqual(none.errors, []);
  assert.strictEqual(none.doc.pharmacy.deductible, undefined);
  for (const b of partD(none.doc)) {
    const s = firstStep(b);
    assert.deepStrictEqual([s.applies_to_deductible, s.deductible_ref], [false, undefined], b.benefit_id);
  }
  const amountWithNone = await alteredWith('H1036-068-000', (x) => Object.assign(x.mrx, { mrx_alt_ded_charge: '3', mrx_alt_ded_type_yn: '', mrx_alt_no_ded_tier: '' }));
  assert.ok(amountWithNone.errors.some((e) => e.includes('mrx_alt_ded_amount "700.00" but mrx_alt_ded_charge "3" (No Deductible)')), amountWithNone.errors.join('; '));
  const noAmount = await alteredWith('H1036-068-000', (x) => { x.mrx.mrx_alt_ded_amount = ''; });
  assert.ok(noAmount.errors.some((e) => e.includes('mrx_alt_ded_charge "1" (Yes) but mrx_alt_ded_amount ""')), noAmount.errors.join('; '));
  const noList = await alteredWith('H1036-068-000', (x) => { x.mrx.mrx_alt_no_ded_tier = ''; });
  assert.ok(noList.errors.some((e) => e.includes('mrx_alt_ded_type_yn "2" but mrx_alt_no_ded_tier ""')), noList.errors.join('; '));
  const tier7 = await alteredWith('H1036-068-000', (x) => { x.mrx.mrx_alt_no_ded_tier = '1111000'; });
  assert.ok(tier7.errors.some((e) => e.includes('mrx_alt_no_ded_tier "1111000" names Tier 7, which the plan does not have')), tier7.errors.join('; '));

  const ae = await alteredWith('H1036-068-000', actuariallyEquivalent);
  assert.deepStrictEqual(ae.errors, []);
  assert.deepStrictEqual(ae.doc.pharmacy.deductible, { amount: 700, currency: 'USD' });
  for (const b of partD(ae.doc)) {
    const s = firstStep(b);
    if (b.coverage_stage_id === 'INITIAL') {
      assert.deepStrictEqual([s.applies_to_deductible, s.deductible_ref], [true, 'pharmacy'], b.benefit_id);
      assert.match(b.network_cost_shares[0].notes, /Actuarially Equivalent Standard benefit \(mrx_benefit_type "2"; mrx_alt_ded_type_yn blank.*S5884-105-000.*Question Q3/);
    } else assert.deepStrictEqual([s.applies_to_deductible, s.deductible_ref], [false, undefined], b.benefit_id);
  }
  assert.ok(excerpts(ae.doc).find((e) => e.startsWith('Part D deductible:')).includes('S5884_SB_PD_PDP_105000_2027_M'));

  const all = await alteredWith('H1036-068-000', (x) => Object.assign(x.mrx, { mrx_alt_ded_type_yn: '1', mrx_alt_no_ded_tier: '' }));
  assert.deepStrictEqual(all.doc.pharmacy.deductible, { amount: 700, currency: 'USD' });
  assert.ok(partD(all.doc).filter((b) => b.coverage_stage_id === 'INITIAL').every((b) => firstStep(b).applies_to_deductible === true));

  const odd = await alteredWith('H1036-068-000', (x) => { x.mrx.mrx_alt_ded_amount = '650.00'; });
  assert.deepStrictEqual(odd.errors, []);
  assert.deepStrictEqual(odd.warnings.map((w) => w.kind), ['part-d-deductible-not-standard']);
  assert.strictEqual(odd.doc.pharmacy.deductible.amount, 650);
});

test('part-d threshold: out_of_pocket_max 2400 from PART_D_PARAMETERS with its source reference; a contract year with no entry is an error', async () => {
  assert.deepStrictEqual(Object.keys(PART_D_PARAMETERS), ['2027']);
  assert.deepStrictEqual([PART_D_PARAMETERS[2027].deductible, PART_D_PARAMETERS[2027].out_of_pocket_threshold], [700, 2400]);
  for (const x of await built()) {
    const doc = x.result.doc;
    assert.deepStrictEqual(doc.pharmacy.out_of_pocket_max, { amount: 2400, currency: 'USD' }, x.g.plan);
    const ex = excerpts(doc).find((e) => e.startsWith('pharmacy.out_of_pocket_max and the CATASTROPHIC stage'));
    assert.ok(ex.startsWith('pharmacy.out_of_pocket_max and the CATASTROPHIC stage\'s applies_after_total_out_of_pocket are 2400 USD, the contract ' +
      'year 2027 Part D annual out-of-pocket threshold. No PBP column states it; source: ' + PART_D_PARAMETERS[2027].source), x.g.plan);
  }
  const { rows, source } = await loadPlan({ dataDir: FIXTURE_DIR, year: 2027, plan: 'S5921-383-000' });
  const r = buildDocument(rows, { ...source, year: 2026 });
  assert.strictEqual(r.doc, null);
  assert.ok(r.errors.includes('no Part D out-of-pocket threshold is recorded for contract year 2026; add it from that year\'s Rate Announcement ' +
    '(docs/specs/pbp-part-d-mapping.md section 5.5)'), r.errors.join('; '));
});

test('part-d benefits: 1 per tier, network and chosen supply; ids, order, day_supply', async () => {
  const counts = (doc) => ['INITIAL', 'CATASTROPHIC'].map((s) => partD(doc).filter((b) => b.coverage_stage_id === s).length);
  assert.deepStrictEqual(counts(await docFor('H1036-068-000')), [37, 5]);
  assert.deepStrictEqual(counts(await docFor('S5921-383-000')), [36, 5]);
  for (const plan of ['H1036-068-000', 'H2406-013-000', 'H1609-028-000', 'S5921-383-000', 'S4802-146-000']) {
    const doc = await docFor(plan);
    const want = listing(plan);
    assert.ok(want.length > 0, plan);
    const first = want[0][0];
    assert.strictEqual(first + want.length, doc.benefits.length, `${plan}: the Part D benefits are the last ones`);
    assert.deepStrictEqual(want.map(([i]) => [i, doc.benefits[i].benefit_id, doc.benefits[i].day_supply]), want, plan);
  }
  const other = benefit(await docFor('H1609-028-000'), 'RX_T1_OUT_OF_NETWORK_OTHER_INITIAL');
  assert.deepStrictEqual([other.pharmacy_network_id, other.day_supply, other.service_name],
    ['OUT_OF_NETWORK', 10, 'Tier 1 (Preferred Generic), out-of-network pharmacy, 10-day supply, initial coverage']);
  assert.strictEqual(benefit(await docFor('H1609-028-000'), 'RX_T1_OUT_OF_NETWORK_1M_INITIAL'), undefined);
  const b = benefit(await docFor('H1036-068-000'), 'RX_T3_MAIL_ORDER_PREFERRED_3M_INITIAL');
  assert.deepStrictEqual(Object.keys(b), ['benefit_id', 'benefit_type', 'category', 'service_name', 'canonical_key', 'raw_label', 'network_cost_shares',
    'limits', 'conditions', 'source_references', 'formulary_tier_id', 'pharmacy_network_id', 'coverage_stage_id', 'day_supply']);
  assert.strictEqual(b.service_name, 'Tier 3 (Preferred Brand), preferred mail order, 100-day supply, initial coverage');
  const cat = benefit(await docFor('H1036-068-000'), 'RX_T3_CATASTROPHIC');
  assert.deepStrictEqual(Object.keys(cat), ['benefit_id', 'benefit_type', 'category', 'service_name', 'canonical_key', 'raw_label', 'network_cost_shares',
    'limits', 'conditions', 'source_references', 'formulary_tier_id', 'coverage_stage_id']);
  assert.strictEqual(cat.service_name, 'Tier 3 (Preferred Brand), catastrophic coverage');
});

test('part-d steps: copay and coinsurance by structure, basis per_prescription; structure 3 is an error; a blank amount on a chosen supply is an error', async () => {
  const doc = await docFor('H1036-068-000');
  assert.strictEqual(JSON.stringify(firstStep(doc.benefits[59])), JSON.stringify({ type: 'coinsurance', sequence: 1, rate: 0.07, basis: 'per_prescription',
    applies_to_deductible: false, deductible_ref: 'pharmacy', applies_to_moop: true, moop_ref: 'pharmacy' }));
  assert.strictEqual(JSON.stringify(firstStep(doc.benefits[41])), JSON.stringify({ type: 'copay', sequence: 1, amount: 30, basis: 'per_prescription',
    applies_to_deductible: false, deductible_ref: 'pharmacy', applies_to_moop: true, moop_ref: 'pharmacy' }));
  for (const x of await built()) {
    for (const b of partD(x.result.doc)) {
      assert.strictEqual(b.network_cost_shares.length, 1, b.benefit_id);
      assert.strictEqual(b.network_cost_shares[0].cost_shares.length, 1, b.benefit_id);
      assert.strictEqual(firstStep(b).basis, 'per_prescription', b.benefit_id);
    }
  }
  const has = (r, text) => assert.ok(r.doc === null && r.errors.some((e) => e.includes(text)), `${text}: ${r.errors.join('; ')}`);
  has(await alteredWith('H1036-068-000', (x) => { tierRowOf(x, '3').mrx_tier_cstshr_struct_type = '3'; }),
    'mrx_tier_cstshr_struct_type "3" (Greater of Coinsurance and Copayment) is not mapped (0 tier rows in CY 2027; docs/specs/pbp-part-d-mapping.md section 6.3)');
  has(await alteredWith('H1036-068-000', (x) => { tierRowOf(x, '1').mrx_tier_rstd_copay_1m = ''; }),
    'mrx_tier_locat_rstd "110" chooses the 1-month supply but mrx_tier_rstd_copay_1m is blank');
  has(await alteredWith('H1036-068-000', (x) => { tierRowOf(x, '1').mrx_tier_rstd_1m_num = ''; }), 'mrx_tier_rstd_1m_num "" is not a day number');
  has(await alteredWith('H1036-068-000', (x) => { tierRowOf(x, '1').mrx_tier_rstd_coins_1m = '5'; }),
    'mrx_tier_cstshr_struct_type "2" (Copayment) but mrx_tier_rstd_coins_1m "5" is filled');
});

test('part-d deductible flags: applies_to_deductible and deductible_ref per tier; catastrophic false with no ref', async () => {
  const doc = await docFor('H1036-068-000');
  for (const b of partD(doc)) {
    const s = firstStep(b);
    if (b.coverage_stage_id === 'CATASTROPHIC') {
      assert.deepStrictEqual([s.applies_to_deductible, s.deductible_ref], [false, undefined], b.benefit_id);
    } else {
      assert.deepStrictEqual([s.applies_to_deductible, s.deductible_ref], [['T4', 'T5'].includes(b.formulary_tier_id), 'pharmacy'], b.benefit_id);
    }
  }
  const s5921 = partD(await docFor('S5921-383-000')).filter((b) => b.coverage_stage_id === 'INITIAL');
  assert.deepStrictEqual([...new Set(s5921.filter((b) => firstStep(b).applies_to_deductible).map((b) => b.formulary_tier_id))], ['T3', 'T4', 'T5']);
});

test('part-d threshold flags: moop_ref pharmacy on every step; includes 2 false; includes 3 true with the note', async () => {
  for (const x of await built()) {
    for (const b of partD(x.result.doc)) assert.strictEqual(firstStep(b).moop_ref, 'pharmacy', `${x.g.plan} ${b.benefit_id}`);
  }
  const doc = await docFor('H1036-068-000');
  const t1 = benefit(doc, 'RX_T1_RETAIL_STANDARD_1M_INITIAL');
  assert.strictEqual(firstStep(t1).applies_to_moop, true);
  assert.ok(t1.network_cost_shares[0].notes.includes('The tier also holds drugs excluded from Part D (mrx_tier_includes "3", Both Part D and Excluded Drugs); ' +
    'the file gives 1 cost share for the tier, and the excluded drugs\' cost sharing does not count toward the Part D out-of-pocket threshold ' +
    '(42 CFR 423.100, incurred costs).'), t1.network_cost_shares[0].notes);
  assert.strictEqual(benefit(doc, 'RX_T2_RETAIL_STANDARD_1M_INITIAL').network_cost_shares[0].notes, undefined, 'a Part D-only retail row has no note');
  const r = await alteredWith('H1036-068-000', (x) => { tierRowOf(x, '2').mrx_tier_includes = '2'; });
  const t2 = benefit(r.doc, 'RX_T2_RETAIL_STANDARD_1M_INITIAL');
  assert.strictEqual(firstStep(t2).applies_to_moop, false);
  assert.strictEqual(t2.network_cost_shares[0].notes, 'The tier holds only drugs excluded from Part D (mrx_tier_includes "2"); their cost sharing ' +
    'does not count toward the Part D out-of-pocket threshold (42 CFR 423.100, incurred costs).');
});

test('part-d catastrophic: every tier\'s step is $0 with its regulation source; the file\'s excluded-drug amount is quoted and named in the notes, never the step\'s amount', async () => {
  for (const x of await built()) {
    for (const b of partD(x.result.doc).filter((y) => y.coverage_stage_id === 'CATASTROPHIC')) {
      const s = firstStep(b);
      assert.deepStrictEqual([s.type, s.amount, s.rate, s.sequence], ['copay', 0, undefined, 1], `${x.g.plan} ${b.benefit_id}`);
      assert.ok(b.source_references[0].excerpt.includes('42 CFR 423.104(d)(5)(i)'), b.benefit_id);
    }
  }
  const t2 = benefit(await docFor('S5921-383-000'), 'RX_T2_CATASTROPHIC');
  assert.strictEqual(JSON.stringify(firstStep(t2)), JSON.stringify({ type: 'copay', sequence: 1, amount: 0, basis: 'per_prescription',
    applies_to_deductible: false, applies_to_moop: true, moop_ref: 'pharmacy',
    notes: 'The file\'s post-threshold amount for this tier, mrx_tier_post_copay_amt "10.00" (mrx_tier_post_includes "3", Both Part D and Excluded drugs; ' +
      'mrx_alt_cstshr_post_oopt "3", Cost-Share Tiers (Same cost sharing as the ICP)), applies to the drugs on the tier that are excluded from Part D, ' +
      'which do not count toward the out-of-pocket threshold (42 CFR 423.100, incurred costs). The $0 of this step is the covered Part D drug\'s ' +
      '(42 CFR 423.104(d)(5)(i)).' }));
  assert.ok(t2.source_references[0].excerpt.includes('mrx_tier_post_copay_amt "10.00"'));
  const h2406 = benefit(await docFor('H2406-013-000'), 'RX_T2_CATASTROPHIC');
  assert.ok(firstStep(h2406).notes.startsWith('The file\'s post-threshold amount for this tier, mrx_tier_post_copay_amt "5.00"'));
  assert.strictEqual(firstStep(benefit(await docFor('H1036-068-000'), 'RX_T1_CATASTROPHIC')).notes, undefined, 'a $0 file amount needs no note');
  const r = await alteredWith('H1036-068-000', (x) => { postRowOf(x, '3').mrx_tier_post_copay_amt = '5.00'; });
  assert.deepStrictEqual(r.errors, []);
  assert.deepStrictEqual(r.warnings.map((w) => w.kind), ['part-d-post-threshold-cost-share']);
  const t3 = firstStep(benefit(r.doc, 'RX_T3_CATASTROPHIC'));
  assert.strictEqual(t3.amount, 0);
  assert.ok(t3.notes.includes('mrx_tier_post_copay_amt "5.00"'), t3.notes);
});

test('part-d out of network: the structure note and the IN tier note', async () => {
  const h1036 = benefit(await docFor('H1036-068-000'), 'RX_T1_OUT_OF_NETWORK_1M_INITIAL').network_cost_shares[0];
  assert.strictEqual(h1036.tier_id, 'IN');
  assert.ok(h1036.notes.includes('mrx_alt_oon_cstshr_struct "2" (Standard Retail Copay/Coinsurance plus a differential between the OON billed charge ' +
    'and the Standard Retail allowable)'), h1036.notes);
  assert.ok(h1036.notes.includes('so applies_to_moop stays true'), h1036.notes);
  assert.ok(h1036.notes.includes('tier_id IN is the document\'s tier for every Part D row; the pharmacy is pharmacy_network_id OUT_OF_NETWORK'), h1036.notes);
  const h1609 = benefit(await docFor('H1609-028-000'), 'RX_T1_OUT_OF_NETWORK_OTHER_INITIAL').network_cost_shares[0];
  assert.ok(h1609.notes.includes('mrx_alt_oon_cstshr_struct "3" (Standard Retail Copay/Coinsurance with Limited Day Supply)'), h1609.notes);
  assert.ok(!h1609.notes.includes('differential'), 'structure 3 has no differential');
  const ppo = benefit(await docFor('H2406-013-000'), 'RX_T1_OUT_OF_NETWORK_1M_INITIAL');
  assert.deepStrictEqual(ppo.network_cost_shares.map((r) => r.tier_id), ['IN'], 'a PPO\'s out-of-network pharmacy row is on IN, not OUT');
});

test('part-d citations: every Part D benefit has 1 excerpt that names the file, the key, the label and every cell it was read from', async () => {
  for (const x of await built()) {
    const a = x.rows.a;
    const key = `row pbp_a_hnumber "${a.pbp_a_hnumber}", pbp_a_plan_identifier "${a.pbp_a_plan_identifier}", segment_id "${a.segment_id}"`;
    for (const b of partD(x.result.doc)) {
      assert.strictEqual(b.source_references.length, 1, b.benefit_id);
      const ex = b.source_references[0].excerpt;
      const n = b.formulary_tier_id.slice(1);
      if (b.coverage_stage_id === 'INITIAL') {
        assert.ok(ex.startsWith(`pbp_mrx_tier.txt, ${key}, mrx_tier_label_list "${b.raw_label}": mrx_tier_id "${n}", mrx_tier_cstshr_struct_type "`), ex);
        assert.ok(ex.includes(` "${b.day_supply}"`), `${b.benefit_id}: the days cell`);
        const s = firstStep(b);
        const value = s.type === 'copay' ? `_copay_` : `_coins_`;
        assert.match(ex, new RegExp(`mrx_tier_[a-z]+${value}(1m|2m|3m|othnum) "${s.type === 'copay' ? s.amount.toFixed(2) : Math.round(s.rate * 100)}"`), b.benefit_id);
        assert.match(ex, /mrx_tier_locat_[a-z]+ "[01]+" \(/, b.benefit_id);
        assert.ok(ex.includes('mrx_tier_includes "'), b.benefit_id);
      } else {
        assert.ok(ex.startsWith(`pbp_mrx_p.txt, ${key}, mrx_tier_post_label_list "${b.raw_label}": mrx_tier_post_id "${n}", `), ex);
        assert.match(ex, /mrx_tier_post_includes "[123]" \(/);
        assert.match(ex, /mrx_tier_post_cost_struct "[12]" \(/);
      }
    }
  }
  assert.strictEqual((await docFor('H1036-068-000')).benefits[59].source_references[0].excerpt,
    'pbp_mrx_tier.txt, row pbp_a_hnumber "H1036", pbp_a_plan_identifier "068", segment_id "0", mrx_tier_label_list "Preferred Brand": mrx_tier_id "3", ' +
    'mrx_tier_cstshr_struct_type "1" (Coinsurance), mrx_tier_includes "1" (Part D Drugs Only), mrx_tier_locat_mosplt "110" (Standard/Preferred Mail Order ' +
    'Cost-Sharing - three month supply; Standard/Preferred Mail Order Cost-Sharing - one month supply), mrx_tier_mosplt_3m_num "100", ' +
    'mrx_tier_mospfd_coins_3m "7". pbp_mrx.txt: mrx_alt_ded_type_yn "2", mrx_alt_no_ded_tier "0111000" (Tier 1; Tier 2; Tier 3).');
  const oneMonth = benefit(await docFor('H1036-068-000'), 'RX_T4_RETAIL_STANDARD_1M_INITIAL').source_references[0].excerpt;
  assert.ok(oneMonth.endsWith(' Values with no Benefit Plan Standard field, verbatim: mrx_tier_rstd_copay_daily "0.00"; mrx_tier_rstd_coins_avg_1m "59.00".') ||
    oneMonth.endsWith(' Values with no Benefit Plan Standard field, verbatim: mrx_tier_rstd_coins_avg_1m "59.00".'), oneMonth);
  const mail = benefit(await docFor('H1036-068-000'), 'RX_T1_MAIL_ORDER_STANDARD_1M_INITIAL').source_references[0].excerpt;
  assert.ok(mail.endsWith(' Values with no Benefit Plan Standard field, verbatim: mrx_tier_mosstd_copay_daily "0.33".'), mail);
  assert.ok(!benefit(await docFor('H1036-068-000'), 'RX_T1_MAIL_ORDER_STANDARD_3M_INITIAL').source_references[0].excerpt.includes('copay_daily'),
    'the daily copay belongs to the 1-month supply');
});

test('part-d canonical keys: keys from the label table; no key carried by name', async () => {
  const file = readJson(path.join(REPO, 'vocabularies', 'canonical-benefits.json'));
  assert.strictEqual(file.version, '1.4.0', 'the 6 Part D tier keys are vocabulary 1.4.0');
  assert.strictEqual(file.vocabulary_id, 'https://benefitplanstandard.org/vocabularies/v1.4.0/canonical-benefits.json');
  assert.strictEqual(file.benefits.length, 124);
  const pharmacyKeys = file.benefits.filter((b) => b.category === 'pharmacy').map((b) => b.canonical_key);
  for (const k of ['nonpreferred_drugs', 'select_care_drugs', 'injectable_drugs', 'vaccine_drugs', 'supplemental_drugs', 'select_diabetic_drugs']) {
    assert.ok(pharmacyKeys.includes(k), `${k} is a pharmacy key`);
  }
  assert.strictEqual(file.categories.pharmacy.count, pharmacyKeys.length);
  const codeSystem = readJson(path.join(REPO, 'fhir', 'definitions', 'CodeSystem-canonical-benefits.json'));
  assert.deepStrictEqual([codeSystem.version, codeSystem.count], ['1.4.0', 124]);
  const vocab = new Set(file.benefits.map((b) => b.canonical_key));
  const doc = await docFor('S4802-146-000');
  const keyOf = (t) => [...new Set(partD(doc).filter((b) => b.formulary_tier_id === t).map((b) => b.canonical_key))];
  assert.deepStrictEqual(['T1', 'T2', 'T3', 'T4', 'T5', 'T6'].map(keyOf),
    [['generic_drugs'], ['preferred_brand_drugs'], ['nonpreferred_drugs'], ['injectable_drugs'], ['specialty_drugs'], ['select_care_drugs']]);
  for (const x of await built()) {
    for (const b of partD(x.result.doc)) if (b.canonical_key) assert.ok(vocab.has(b.canonical_key), `${b.canonical_key} is not in the vocabulary`);
  }
  const single = await alteredWith('H1036-068-000', (x) => {
    tierRowOf(x, '4').mrx_tier_label_list = 'Single Tier';
    postRowOf(x, '4').mrx_tier_post_label_list = 'Single Tier';
  });
  assert.deepStrictEqual(single.warnings, [], 'Single Tier is a known label');
  const t4 = partD(single.doc).filter((b) => b.formulary_tier_id === 'T4');
  assert.ok(t4.every((b) => b.canonical_key === undefined && b.source_references[0].excerpt.endsWith('; no canonical key, carried by name (spec section 9.1).')));
});

test('part-d insulin: the mrx_tier_ira cells quoted once per tier, no insulin benefit', async () => {
  const doc = await docFor('H1036-068-000');
  const ins = excerpts(doc).filter((e) => e.startsWith('Insulin cost sharing for Tier '));
  assert.strictEqual(ins.length, 5);
  assert.ok(ins[0].startsWith('Insulin cost sharing for Tier 1 (Preferred Generic), no Benefit Plan Standard benefit written ' +
    '(docs/specs/pbp-part-d-mapping.md section 10): mrx_alt_ira_covg_tier "0111110" (Tier 1; Tier 2; Tier 3; Tier 4; Tier 5), '), ins[0]);
  assert.ok(ins[0].includes('mrx_tier_ira_mostd_copay_1m "10.00"') && ins[0].includes('mrx_tier_ira_mostd_coins_1m "25"'), ins[0]);
  assert.ok(!doc.benefits.some((b) => /insulin/i.test(b.benefit_id + b.service_name)));
  assert.strictEqual(excerpts(await docFor('S5921-383-000')).filter((e) => e.startsWith('Insulin cost sharing for Tier ')).length, 3);
});

test('part-d references: the plan-level entries in order, after the medical ones', async () => {
  const doc = await docFor('H1036-068-000');
  const without = (await alteredWith('H1036-068-000', noPartD)).doc;
  const n = without.source_references.length - 1;
  assert.deepStrictEqual(doc.source_references.slice(0, n), without.source_references.slice(0, n), 'the medical entries keep their positions');
  const starts = ['Part D: ', 'Part D deductible: ', 'pharmacy.out_of_pocket_max and the CATASTROPHIC stage', 'Pharmacy networks: ', 'Coverage stages: ',
    'Insulin cost sharing for Tier 1 ', 'Insulin cost sharing for Tier 2 ', 'Insulin cost sharing for Tier 3 ', 'Insulin cost sharing for Tier 4 ',
    'Insulin cost sharing for Tier 5 ', 'Every non-blank pbp_mrx.txt cell, verbatim, in file order: '];
  const rest = excerpts(doc).slice(n);
  assert.strictEqual(rest.length, starts.length, rest.join('\n'));
  starts.forEach((s, i) => assert.ok(rest[i].startsWith(s), `${i}: ${rest[i]}`));
  assert.ok(rest[0].includes('Written: pharmacy and 42 Part D benefits (docs/specs/pbp-part-d-mapping.md).'), rest[0]);
  assert.ok(!rest[10].includes('pbp_a_hnumber') && !rest[10].includes('bid_id') && rest[10].includes('mrx_vaccine_attest "1"'), rest[10]);
});

test('part-d schema: every golden document validates against v1.2.0 and scripts/validate.js reports 0 pharmacy warnings', async () => {
  const files = (await built()).map((x) => path.join('examples', x.file));
  assert.strictEqual(files.length, 7);
  for (const x of await built()) assert.deepStrictEqual(validateDocument(x.result.doc), [], x.g.plan);
  const r = spawnSync(process.execPath, [path.join('scripts', 'validate.js'), '--schema', path.join('schema', 'v1.2.0', 'benefit-plan.schema.json'), ...files],
    { cwd: REPO, encoding: 'utf8' });
  assert.strictEqual(r.status, 0, r.stdout);
  assert.strictEqual(r.stdout.split(/\r?\n/).filter((l) => l.startsWith('PASS')).length, 7, r.stdout);
  assert.ok(!r.stdout.includes('pharmacy-warning') && !r.stdout.includes('vocab-warning'), r.stdout);
});

test('part-d determinism: a second build is byte-identical; the golden files from the full files equal the fixture builds', async () => {
  assert.deepStrictEqual(GOLDEN.map((g) => g.plan), ['H2406-013-000', 'H1036-068-000', 'H1609-028-000', 'H5533-019-000', 'H5425-140-000', 'S5921-383-000', 'S4802-146-000']);
  assert.strictEqual(goldenFiles().length, 7);
  for (const f of ['unitedhealthcare-aarp-medicare-rx-preferred-from-uhc.pbp.json', 'wellcare-wellcare-value-script.pbp.json']) {
    assert.ok(goldenFiles().includes(f), f);
  }
  for (const x of await built()) assert.strictEqual(serialize(buildDocument(x.rows, x.source).doc), serialize(x.result.doc), x.g.plan);
});

test('part-d readers: an unreadable amount, percent, day count or flag quotes the cell', async () => {
  const has = (r, text) => assert.ok(r.doc === null && r.errors.some((e) => e.includes(text)), `${text}: ${r.errors.join('; ')}`);
  has(await alteredWith('H1036-068-000', (x) => { tierRowOf(x, '1').mrx_tier_rstd_copay_1m = '0.00 USD'; }), 'mrx_tier_rstd_copay_1m "0.00 USD" is not an amount');
  has(await alteredWith('H1036-068-000', (x) => { tierRowOf(x, '3').mrx_tier_rstd_coins_1m = '9.5'; }), 'mrx_tier_rstd_coins_1m "9.5" is not a whole percent from 0 to 100');
  has(await alteredWith('H1036-068-000', (x) => { tierRowOf(x, '1').mrx_tier_rstd_1m_num = 'thirty'; }), 'mrx_tier_rstd_1m_num "thirty" is not a day number');
  has(await alteredWith('H1036-068-000', (x) => { tierRowOf(x, '1').mrx_tier_locat_oon = '1'; }), 'mrx_tier_locat_oon "1" is not a string of 2 characters 0 or 1');
  has(await alteredWith('H1036-068-000', (x) => { x.mrx.mrx_alt_ded_amount = 'seven hundred'; }), 'mrx_alt_ded_amount "seven hundred" is not an amount');
  has(await alteredWith('H1036-068-000', (x) => { postRowOf(x, '1').mrx_tier_post_copay_amt = 'none'; }), 'mrx_tier_post_copay_amt "none" is not an amount');
  has(await alteredWith('H1036-068-000', (x) => { tierRowOf(x, '1').mrx_tier_includes = '4'; }), 'mrx_tier_includes "4" is not a dictionary code');
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
  assert.deepStrictEqual(counts, { MATCH: 71, READING: 12, DIFFERENCE: 0 });
  for (const r of results) if (r.status === 'READING') assert.ok(r.check.note, `${r.check.item}: a READING row needs a note`);
  doc.benefits[1].network_cost_shares[1].cost_shares[0].amount = 90;
  const changed = runChecks(doc, expectations);
  assert.strictEqual(changed.counts.DIFFERENCE, 1, 'a changed value is reported');
});

test('sob-check: H1036-068-000 and S5921-383-000 golden files against their Summary of Benefits, 0 differences', async () => {
  const want = { 'H1036-068-000': { MATCH: 45, READING: 1, DIFFERENCE: 0 }, 'S5921-383-000': { MATCH: 40, READING: 3, DIFFERENCE: 0 } };
  for (const [plan, counts] of Object.entries(want)) {
    const x = (await built()).find((y) => y.g.plan === plan);
    const expectations = readJson(path.join(SOB_CHECKS, `${plan}.json`));
    assert.strictEqual(expectations.golden, `examples/${x.file}`, plan);
    const doc = readJson(path.join(EXAMPLES_DIR, x.file));
    const r = runChecks(doc, expectations);
    assert.deepStrictEqual(r.counts, counts, plan);
    for (const y of r.results) if (y.status === 'READING') assert.ok(y.check.note, `${plan} ${y.check.item}: a READING row needs a note`);
  }
  const doc = readJson(path.join(EXAMPLES_DIR, (await built()).find((y) => y.g.plan === 'S5921-383-000').file));
  doc.benefits[37].network_cost_shares[0].cost_shares[0].amount = 10;
  assert.strictEqual(runChecks(doc, readJson(path.join(SOB_CHECKS, 'S5921-383-000.json'))).counts.DIFFERENCE, 1,
    'the file\'s excluded-drug amount written as the catastrophic step is a difference');
});
