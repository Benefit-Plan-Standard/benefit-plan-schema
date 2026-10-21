/**
 * Tests for scripts/pbp-segment.js
 *
 *   node --test scripts/pbp-segment.test.js
 *
 * Fails if the county to segment lookup changes behavior: a plan with 1 segment,
 * a contract and plan with 2 segments where the county picks 1, a county no segment
 * serves (an SSA code and a FIPS code), a lookup by county name, a name with 2 SSA
 * codes, the exit code when 2 segments serve 1 county, and the check over every
 * pair with more than 1 segment; and, with --service-areas, the same answers read from
 * a service-areas.json that scripts/publish-fhir.js --pledgee wrote from the fixture
 * rows. Runs on the PlanArea.txt and PlanRegionArea.txt rows committed in
 * test/fixtures/pbp-segment/2027/, so the full PBP files are not needed.
 * Regenerate the fixture on purpose with:
 *   node scripts/pbp-segment.js --write-fixtures
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const { parseCountyName, findSegment, checkAllPairs, main, FIXTURE_DIR, FIXTURE_PLANS, FIXTURE_FILES } = require('./pbp-segment.js');
const { pledgeeMain } = require('./publish-fhir.js');

const year = 2027;
const find = (opts) => findSegment({ dataDir: FIXTURE_DIR, year, ...opts });

// Runs the CLI on the fixture and returns its exit code and what it printed.
async function run(args) {
  const lines = [];
  const out = { log: (l) => lines.push(l), error: (l) => lines.push(l) };
  const code = await main(['--data', FIXTURE_DIR, '--year', String(year), ...args], out);
  return { code, lines };
}

test('the fixture holds the rows of the fixture plans and no others', () => {
  const keys = new Set(FIXTURE_FILES.flatMap((name) => fs.readFileSync(path.join(FIXTURE_DIR, String(year), name), 'latin1')
    .split('\r\n').slice(1).filter(Boolean).map((r) => {
      const f = r.split('\t');
      return `${f[0]}-${f[1]}-${f[2].padStart(3, '0')}`;
    })));
  assert.deepStrictEqual([...keys].sort(), FIXTURE_PLANS.flatMap((p) => p.keys).sort());
});

test('a plan with 1 segment: the county gives segment 000 and the full plan key', async () => {
  const r = await run(['--contract', 'H1609', '--plan', '028', '--county', '10150']);
  assert.strictEqual(r.code, 0);
  assert.deepStrictEqual(r.lines, [
    'county 10150 Duval FL, partial_flag "", eghp_flag "0"',
    'segment 000',
    'plan key H1609-028-000',
  ]);
});

test('2 segments: the county picks 1 of them', async () => {
  const polk = await find({ contract: 'H1019', plan: '103', county: '10520' });
  assert.strictEqual(polk.code, 0);
  assert.deepStrictEqual(polk.lines.slice(-2), ['segment 001', 'plan key H1019-103-001']);
  const pasco = await find({ contract: 'H1019', plan: '103', county: '10500' });
  assert.strictEqual(pasco.code, 0);
  assert.deepStrictEqual(pasco.lines.slice(-2), ['segment 002', 'plan key H1019-103-002']);
});

test('a county no segment serves: exit 1, and a code on no row is named as possibly FIPS', async () => {
  const stJohns = await run(['--contract', 'H1609', '--plan', '028', '--county', '10540']);
  assert.strictEqual(stJohns.code, 1);
  assert.deepStrictEqual(stJohns.lines, ['no segment serves county 10540']);
  // 12109 is the FIPS code of St. Johns County, Florida; PlanArea.txt holds SSA codes.
  const fips = await run(['--contract', 'H1609', '--plan', '028', '--county', '12109']);
  assert.strictEqual(fips.code, 1);
  assert.deepStrictEqual(fips.lines, ['no segment serves county 12109',
    'county_code 12109 is on no row of PlanArea.txt; a FIPS code is not an SSA code (PBP importer spec section 4.5)']);
});

test('lookup by county name and state, case-insensitive', async () => {
  const r = await run(['--contract', 'H2406', '--plan', '013', '--county-name', 'st. johns, fl']);
  assert.strictEqual(r.code, 0);
  assert.deepStrictEqual(r.lines, [
    'county 10540 St. Johns FL, partial_flag "", eghp_flag "0"',
    'segment 000',
    'plan key H2406-013-000',
  ]);
  const notServed = await find({ contract: 'H1609', plan: '028', countyName: 'St. Johns, FL' });
  assert.deepStrictEqual([notServed.code, notServed.lines], [1, ['no segment serves county "St. Johns, FL" (10540)']]);
  const unknown = await find({ contract: 'H1609', plan: '028', countyName: 'Nowhere, FL' });
  assert.deepStrictEqual([unknown.code, unknown.lines], [1, ['no county named "Nowhere, FL" in PlanArea.txt for contract year 2027']]);
});

test('a name with 2 SSA codes is looked up under both', async () => {
  const r = await find({ contract: 'H0504', plan: '056', countyName: 'Los Angeles, CA' });
  assert.strictEqual(r.code, 0);
  assert.deepStrictEqual(r.lines, [
    'county 05200 Los Angeles CA, partial_flag "", eghp_flag "0"',
    'county 05210 Los Angeles CA, partial_flag "", eghp_flag "0"',
    'segment 000',
    'plan key H0504-056-000',
  ]);
});

test('bad input is an error, exit 1', async () => {
  assert.strictEqual((await run(['--contract', 'H1609', '--plan', '028', '--county', '1015'])).code, 1);
  assert.strictEqual((await run(['--contract', 'H1609', '--plan', '28', '--county', '10150'])).code, 1);
  assert.strictEqual((await run(['--contract', 'H1609', '--plan', '028'])).code, 1);
  assert.strictEqual((await run(['--contract', 'H1609', '--plan', '028', '--county', '10150', '--county-name', 'Duval, FL'])).code, 1);
  assert.throws(() => parseCountyName('Duval'), /--county-name must be/);
  assert.deepStrictEqual(parseCountyName(' St. Johns , fl '), { county: 'st. johns', state: 'fl', text: 'St. Johns, FL' });
  const none = await run(['--contract', 'H1609', '--plan', '999', '--county', '10150']);
  assert.strictEqual(none.code, 1);
  assert.match(none.lines[0], /^no rows for H1609-999 in PlanArea\.txt/);
});

// A PlanArea.txt where 2 segments of 1 contract and plan serve the same county,
// which section 4.1 says the files never do.
function overlapFixture() {
  const src = fs.readFileSync(path.join(FIXTURE_DIR, String(year), 'PlanArea.txt'), 'latin1').split('\r\n');
  const rows = src.slice(1).filter((r) => r.startsWith('H1019\t103\t'));
  const polk = rows.find((r) => r.includes('\t10520\t'));
  const twin = polk.split('\t');
  twin[2] = '2';
  twin[6] = 'H1019_103_2';
  twin[9] = '2';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pbp-segment-test-'));
  fs.mkdirSync(path.join(dir, String(year)));
  fs.writeFileSync(path.join(dir, String(year), 'PlanArea.txt'), [src[0], ...rows, twin.join('\t'), ''].join('\r\n'), 'latin1');
  return dir;
}

test('2 segments serving 1 county: exit 2, both listed', async () => {
  const r = await findSegment({ dataDir: overlapFixture(), year, contract: 'H1019', plan: '103', county: '10520' });
  assert.strictEqual(r.code, 2);
  assert.match(r.lines[0], /^county 10520 matches 2 segments of H1019-103; PBP importer spec section 4\.1 says/);
  assert.deepStrictEqual(r.lines.filter((l) => l.startsWith('  segment')), [
    '  segment 001, plan key H1019-103-001',
    '  segment 002, plan key H1019-103-002',
  ]);
});

test('--all-pairs resolves every county of every pair with more than 1 segment', async () => {
  const r = await checkAllPairs({ dataDir: FIXTURE_DIR, year });
  assert.deepStrictEqual([r.code, r.pairs, r.multi, r.checks, r.conflicts], [0, 4, 1, 4, 0]);
  assert.deepStrictEqual(r.lines, [
    'contract year 2027: 4 contract and plan pairs in PlanArea.txt, 1 with more than 1 segment',
    '4 pair and county checks: 4 pick exactly 1 segment, 0 pick more than 1',
  ]);
  const bad = await checkAllPairs({ dataDir: overlapFixture(), year });
  assert.deepStrictEqual([bad.code, bad.conflicts], [2, 1]);
  assert.strictEqual(bad.lines[2], '  H1019-103 county 10520: segments 001, 002');
});

// A service-areas.json written by the index writer from the fixture rows, for every fixture
// plan: each plan key's document is the worked example's, with the plan key changed.
let serviceAreasFile = null;
async function writtenServiceAreas() {
  if (serviceAreasFile) return serviceAreasFile;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'pbp-segment-service-areas-'));
  const folder = path.join(root, 'PBP-Benefits-2027');
  fs.mkdirSync(folder);
  const doc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples', 'aetna-medicare-aetna-medicare-select-extra.pbp.json'), 'utf8'));
  for (const key of FIXTURE_PLANS.flatMap((p) => p.keys)) {
    const id = doc.plan_identifiers.find((x) => x.system === 'cms_contract_plan_segment');
    id.value = key;
    fs.writeFileSync(path.join(folder, `${key}.json`), JSON.stringify(doc, null, 2) + '\n');
  }
  const log = console.log;
  console.log = () => {};
  try { assert.strictEqual(await pledgeeMain([root, '--data', FIXTURE_DIR]), 0); } finally { console.log = log; }
  serviceAreasFile = path.join(folder, 'service-areas.json');
  return serviceAreasFile;
}

async function runServiceAreas(args, y = year) {
  const lines = [];
  const out = { log: (l) => lines.push(l), error: (l) => lines.push(l) };
  const code = await main(['--service-areas', await writtenServiceAreas(), '--year', String(y), ...args], out);
  return { code, lines };
}

test('--service-areas gives the same answer and exit code as PlanArea.txt', async () => {
  const asks = [
    ['--contract', 'H1609', '--plan', '028', '--county-name', 'Duval, FL'],
    ['--contract', 'H1609', '--plan', '028', '--county', '10150'],
    ['--contract', 'H1019', '--plan', '103', '--county', '10520'],
    ['--contract', 'H1019', '--plan', '103', '--county', '10500'],
    ['--contract', 'H2406', '--plan', '013', '--county-name', 'st. johns, fl'],
    ['--contract', 'H0504', '--plan', '056', '--county-name', 'Los Angeles, CA'],
    ['--contract', 'H1609', '--plan', '028', '--county', '10540'],
    ['--contract', 'H1609', '--plan', '028', '--county-name', 'St. Johns, FL'],
  ];
  for (const a of asks) assert.deepStrictEqual(await runServiceAreas(a), await run(a), a.join(' '));
  const duval = await runServiceAreas(asks[0]);
  assert.deepStrictEqual(duval, { code: 0, lines: ['county 10150 Duval FL, partial_flag "", eghp_flag "0"', 'segment 000', 'plan key H1609-028-000'] });
});

test('--service-areas names the file in its messages, and a regional PPO by its region and its segment', async () => {
  const fips = await runServiceAreas(['--contract', 'H1609', '--plan', '028', '--county', '12109']);
  assert.deepStrictEqual(fips, { code: 1, lines: ['no segment serves county 12109',
    'county_code 12109 is in no county of service-areas.json; a FIPS code is not an SSA code (PBP importer spec section 4.5)'] });
  const unknown = await runServiceAreas(['--contract', 'H1609', '--plan', '028', '--county-name', 'Nowhere, FL']);
  assert.deepStrictEqual(unknown, { code: 1, lines: ['no county named "Nowhere, FL" in service-areas.json for contract year 2027'] });
  const absent = await runServiceAreas(['--contract', 'H1609', '--plan', '999', '--county', '10150']);
  assert.deepStrictEqual(absent, { code: 1, lines: ['no plan key of H1609-999 in service-areas.json for contract year 2027'] });
  const regional = await runServiceAreas(['--contract', 'R0759', '--plan', '001', '--county-name', 'Duval, FL']);
  assert.deepStrictEqual(regional, { code: 1, lines: ['R0759-001 is a regional plan, so service-areas.json gives its regions and no counties',
    '  segment 000, plan key R0759-001-000, region 09 "Florida"'] });
  const wrongYear = await runServiceAreas(['--contract', 'H1609', '--plan', '028', '--county', '10150'], 2026);
  assert.deepStrictEqual(wrongYear, { code: 1, lines: ['error: service-areas.json: contract_year 2027 is not --year 2026'] });
});

test('--service-areas --all-pairs resolves every county of every pair in the file with more than 1 segment', async () => {
  const r = await runServiceAreas(['--all-pairs']);
  assert.deepStrictEqual(r, { code: 0, lines: [
    'contract year 2027: 4 contract and plan pairs in service-areas.json, 1 with more than 1 segment',
    '4 pair and county checks: 4 pick exactly 1 segment, 0 pick more than 1',
  ] });
});
