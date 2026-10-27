/**
 * Tests for scripts/publish-fhir.js --pledgee
 *
 *   node --test scripts/publish-fhir.test.js
 *
 * Fails if the pledgee index changes: its header fields (the site index's), its
 * entry fields and their order, the release read from each document, the order of
 * releases and entries, the counts read from each Bundle, the errors that stop it,
 * or the field lists in docs/specs/rtb-medical-mvp/README.md ("What a pledgee
 * publishes"), which must name the fields the script writes; and likewise for the
 * service-areas.json of a Medicare Advantage release folder, read from the PlanArea.txt
 * and PlanRegionArea.txt rows in test/fixtures/pbp-segment/2027/. Runs on the 2 worked
 * example documents and their Bundles, copied under their plan-key names into
 * temporary folders. The site mode is run once, into a temporary folder, for its
 * header fields.
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  main, pledgeeMain, pledgeeIndex, releaseOf, serviceAreas, INDEX_HEADER_FIELDS, PLEDGEE_ENTRY_FIELDS,
  SERVICE_AREAS_HEADER_FIELDS, SERVICE_AREAS_PLAN_FIELDS, COUNTY_FIELDS, REGION_FIELDS,
} = require('./publish-fhir.js');
const { FIXTURE_DIR } = require('./pbp-segment.js');

const REPO = path.join(__dirname, '..');
const README = path.join(REPO, 'docs', 'specs', 'rtb-medical-mvp', 'README.md');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// The 2 worked examples (README, "Worked example") under their plan-key names.
const EXAMPLES = [
  { key: 'H1609-028-000', doc: 'examples/aetna-medicare-aetna-medicare-select-extra.pbp.json', bundle: 'examples/fhir/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json' },
  { key: '68398FL0030058-01', doc: 'examples/unitedhealthcare-uhc-bronze-essential.puf.json', bundle: 'examples/fhir-puf/unitedhealthcare-uhc-bronze-essential.json' },
];
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pledgee-test-'));
// Runs the CLI with console.log silenced; returns its exit code and what it printed to stderr.
async function runMain(args) {
  const [log, error] = [console.log, console.error];
  const errors = [];
  console.log = () => {};
  console.error = (l) => errors.push(l);
  try { return { code: await pledgeeMain(args), errors }; } finally { [console.log, console.error] = [log, error]; }
}
function place(dir, ex, { bundle = true, name = ex.key } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(REPO, ex.doc), path.join(dir, `${name}.json`));
  if (bundle) fs.copyFileSync(path.join(REPO, ex.bundle), path.join(dir, `${name}.bundle.json`));
}
// The UHC document as if its Plan Attributes and Benefits and Cost Sharing PUFs had been downloaded on another date,
// with its Bundle beside it.
function olderMarketplace(dir, date) {
  place(dir, EXAMPLES[1]);
  const text = fs.readFileSync(path.join(REPO, EXAMPLES[1].doc), 'utf8');
  const from = 'benefits-and-cost-sharing-puf.zip), downloaded 2026-10-05,';
  assert.ok(text.includes(from));
  fs.writeFileSync(path.join(dir, `${EXAMPLES[1].key}.json`), text.replace(from, `benefits-and-cost-sharing-puf.zip), downloaded ${date},`));
}
// The Humana example with its first excerpt changed, and its Bundle beside it, in a Medicare Advantage release folder.
function humanaWith(dir, from, to) {
  const text = fs.readFileSync(path.join(REPO, 'examples/humana-humana-gold-plus-h1036-068.pbp.json'), 'utf8');
  assert.ok(text.includes(from));
  fs.writeFileSync(path.join(dir, 'H1036-068-000.json'), text.replace(from, to));
  fs.copyFileSync(path.join(REPO, 'examples/fhir/humana-gold-plus-h1036-068-hmo-h1036-068-000.json'), path.join(dir, 'H1036-068-000.bundle.json'));
}

test('a root with no release folders: 1 release with no name, entries by plan key, counts from the Bundles', () => {
  const root = tmp();
  for (const ex of EXAMPLES) place(root, ex);
  const r = pledgeeIndex(root);
  assert.strictEqual(r.flat, true);
  assert.deepStrictEqual(Object.keys(r.index), [...INDEX_HEADER_FIELDS, 'plans']);
  for (const e of r.index.plans) assert.deepStrictEqual(Object.keys(e), PLEDGEE_ENTRY_FIELDS);
  // The counts are those of the Bundles' own records: examples/fhir-puf/README.md (27 placed, 25 outside the SBC
  // codes) and the eighth validator run in examples/fhir/VALIDATION.md (16 placed, 89 listed: 22 outside the SBC
  // codes and the plan's 67 Part D benefits).
  assert.deepStrictEqual(r.index.plans, [
    {
      id: '68398FL0030058-01', plan_name: 'UHC Bronze Essential ($0 Virtual Urgent Care)', carrier: 'UnitedHealthcare', plan_type: 'HMO', plan_year: 2026,
      program: 'Marketplace', bps_schema_version: '1.2.0', document: '68398FL0030058-01.json', bundle: '68398FL0030058-01.bundle.json',
      service_areas: null, release: null, data_date: '2026-10-05', benefits_placed: 27, benefits_unmapped: 25,
      label: 'Marketplace, imported from the CMS Health Insurance Exchange public use files for plan year 2026.',
    },
    {
      id: 'H1609-028-000', plan_name: 'Aetna Medicare Select Extra (HMO-POS)', carrier: 'Aetna Medicare', plan_type: 'HMO_POS', plan_year: 2027,
      program: 'Medicare Advantage', bps_schema_version: '1.2.0', document: 'H1609-028-000.json', bundle: 'H1609-028-000.bundle.json',
      service_areas: null, release: null, data_date: '2026-10-06', benefits_placed: 16, benefits_unmapped: 89,
      label: 'Medicare Advantage, imported from the CMS PBP Benefits files for contract year 2027.',
    },
  ]);
  assert.strictEqual(JSON.stringify(pledgeeIndex(root).index), JSON.stringify(r.index), 'the same index on every run');
  assert.deepStrictEqual(r.serviceAreas, [], 'a root with no release folders gets no service-areas.json');
});

test('release folders: newest release first, paths include the folder', () => {
  const root = tmp();
  place(path.join(root, 'PBP-Benefits-2027'), EXAMPLES[0]);
  place(path.join(root, 'marketplace-puf-2026-2026-10-05'), EXAMPLES[1]);
  olderMarketplace(path.join(root, 'marketplace-puf-2026-2026-09-01'), '2026-09-01');
  const r = pledgeeIndex(root);
  assert.strictEqual(r.flat, false);
  assert.strictEqual(r.releases, 3);
  assert.deepStrictEqual(r.index.plans.map((e) => [e.release, e.id, e.data_date, e.document, e.bundle, e.benefits_placed, e.benefits_unmapped]), [
    ['PBP-Benefits-2027', 'H1609-028-000', '2026-10-06', 'PBP-Benefits-2027/H1609-028-000.json', 'PBP-Benefits-2027/H1609-028-000.bundle.json', 16, 89],
    ['marketplace-puf-2026-2026-10-05', '68398FL0030058-01', '2026-10-05', 'marketplace-puf-2026-2026-10-05/68398FL0030058-01.json',
      'marketplace-puf-2026-2026-10-05/68398FL0030058-01.bundle.json', 27, 25],
    ['marketplace-puf-2026-2026-09-01', '68398FL0030058-01', '2026-09-01', 'marketplace-puf-2026-2026-09-01/68398FL0030058-01.json',
      'marketplace-puf-2026-2026-09-01/68398FL0030058-01.bundle.json', 27, 25],
  ]);
  assert.deepStrictEqual(r.index.plans.map((e) => e.service_areas), ['PBP-Benefits-2027/service-areas.json', null, null]);
  assert.deepStrictEqual(r.serviceAreas, [{ release: 'PBP-Benefits-2027', year: 2027, data_date: '2026-10-06', keys: ['H1609-028-000'] }]);
});

test('the release of a document, from its first source_references excerpt', () => {
  const doc = (excerpt) => ({ source_references: [{ excerpt }] });
  assert.deepStrictEqual(releaseOf(readJson(path.join(REPO, EXAMPLES[0].doc))).release, 'PBP-Benefits-2027');
  assert.deepStrictEqual(releaseOf(readJson(path.join(REPO, EXAMPLES[1].doc))).release, 'marketplace-puf-2026-2026-10-05');
  // When the 3 Marketplace files share 1 download date, the excerpt names it once, after the 3 files.
  const shared = releaseOf(doc('CMS Health Insurance Exchange Public Use Files, plan year 2026: Plan Attributes PUF (plan-attributes-puf.csv, from a), ' +
    'Benefits and Cost Sharing PUF (benefits-and-cost-sharing-puf.csv, from b) and Network PUF (network-puf.csv, from c), downloaded 2026-11-02. ImportDate'));
  assert.deepStrictEqual([shared.release, shared.data_date], ['marketplace-puf-2026-2026-11-02', '2026-11-02']);
  assert.strictEqual(releaseOf(doc('CMS Plan Benefit Package (PBP) Benefits, contract year 2028, release "PBP Benefits 2028 / Q2" (u), downloaded 2027-04-01. Files')).release,
    'PBP-Benefits-2028-Q2');
  assert.throws(() => releaseOf(doc('CMS Plan Benefit Package (PBP) Benefits, contract year 2027, release "(not recorded)" (u), downloaded 2026-10-06. Files')), /no release label/);
  assert.throws(() => releaseOf(doc('Summary of Benefits, page 1')), /not written by a public-file importer/);
});

test('the errors that stop it, each naming the file', () => {
  const wrongFolder = tmp();
  place(path.join(wrongFolder, 'PBP-Benefits-2027'), EXAMPLES[1]);
  assert.throws(() => pledgeeIndex(wrongFolder), /68398FL0030058-01\.json: the document's release is marketplace-puf-2026-2026-10-05, so it belongs in the folder/);
  const wrongName = tmp();
  place(wrongName, EXAMPLES[0], { bundle: false, name: 'h1609-028-000' });
  assert.throws(() => pledgeeIndex(wrongName), /h1609-028-000\.json: the plan key is H1609-028-000, so the file is named H1609-028-000\.json/);
  const lonelyBundle = tmp();
  place(lonelyBundle, EXAMPLES[0]);
  fs.unlinkSync(path.join(lonelyBundle, 'H1609-028-000.json'));
  assert.throws(() => pledgeeIndex(lonelyBundle), /H1609-028-000\.bundle\.json has no document beside it/);
  // The Bundle is SHALL for every plan, in a root with no release folders and in a release folder.
  const noBundle = tmp();
  place(noBundle, EXAMPLES[0], { bundle: false });
  assert.throws(() => pledgeeIndex(noBundle), /^Error: H1609-028-000\.json has no Bundle beside it, H1609-028-000\.bundle\.json; every document has its Bundle$/);
  const noBundleInRelease = tmp();
  place(path.join(noBundleInRelease, 'PBP-Benefits-2027'), EXAMPLES[0]);
  place(path.join(noBundleInRelease, 'marketplace-puf-2026-2026-10-05'), EXAMPLES[1], { bundle: false });
  assert.throws(() => pledgeeIndex(noBundleInRelease),
    /^Error: marketplace-puf-2026-2026-10-05\/68398FL0030058-01\.json has no Bundle beside it, marketplace-puf-2026-2026-10-05\/68398FL0030058-01\.bundle\.json/);
  const mixed = tmp();
  place(mixed, EXAMPLES[0]);
  place(path.join(mixed, 'marketplace-puf-2026-2026-10-05'), EXAMPLES[1]);
  assert.throws(() => pledgeeIndex(mixed), /holds release folders and also H1609-028-000\.bundle\.json/);
  // A Marketplace folder is named by its date, so only a Medicare Advantage folder can hold 2 download dates.
  const twoDates = tmp();
  place(path.join(twoDates, 'PBP-Benefits-2027'), EXAMPLES[0]);
  humanaWith(path.join(twoDates, 'PBP-Benefits-2027'), '), downloaded 2026-10-06.', '), downloaded 2026-07-01.');
  assert.throws(() => pledgeeIndex(twoDates), /PBP-Benefits-2027 holds documents downloaded on 2026-07-01 and 2026-10-06; 1 release has 1 download date/);
  const twoYears = tmp();
  place(path.join(twoYears, 'PBP-Benefits-2027'), EXAMPLES[0]);
  humanaWith(path.join(twoYears, 'PBP-Benefits-2027'), 'Benefits, contract year 2027, release', 'Benefits, contract year 2028, release');
  assert.throws(() => pledgeeIndex(twoYears), /PBP-Benefits-2027 holds documents of the years 2027 and 2028; 1 release has 1 year/);
});

// The release folder of the Medicare Advantage worked example, as pledgeeIndex gives it.
const AETNA_FOLDER = { release: 'PBP-Benefits-2027', year: 2027, data_date: '2026-10-06', keys: ['H1609-028-000'] };

test('service-areas.json: the counties of a local plan and the region of a regional PPO, by plan key, then by code', async () => {
  const sa = await serviceAreas({ ...AETNA_FOLDER, keys: ['R0759-001-000', 'H1609-028-000'] }, FIXTURE_DIR);
  assert.deepStrictEqual(Object.keys(sa), [...SERVICE_AREAS_HEADER_FIELDS, 'plans']);
  assert.deepStrictEqual([sa.release, sa.contract_year, sa.data_date], ['PBP-Benefits-2027', 2027, '2026-10-06']);
  for (const p of sa.plans) {
    assert.deepStrictEqual(Object.keys(p), SERVICE_AREAS_PLAN_FIELDS);
    for (const c of p.counties) assert.deepStrictEqual(Object.keys(c), COUNTY_FIELDS);
    for (const g of p.regions) assert.deepStrictEqual(Object.keys(g), REGION_FIELDS);
  }
  const [aetna, regional] = sa.plans;
  assert.deepStrictEqual([aetna.plan_key, aetna.contract, aetna.plan, aetna.segment, aetna.regions], ['H1609-028-000', 'H1609', '028', '000', []]);
  // The 11 counties of PlanArea.txt for H1609_028_0, in code order, each quoted as the file gives it.
  assert.deepStrictEqual(aetna.counties.map((c) => c.ssa_county_code),
    ['10070', '10090', '10150', '10280', '10400', '10410', '10480', '10510', '10520', '10570', '10580']);
  assert.deepStrictEqual(aetna.counties[2], { ssa_county_code: '10150', county: 'Duval', state: 'FL', partial_flag: '', eghp_flag: '0' });
  assert.deepStrictEqual(regional, {
    plan_key: 'R0759-001-000', contract: 'R0759', plan: '001', segment: '000', counties: [],
    regions: [{ region_code: '09', region: 'Florida', region_type: 'MA' }],
  });
});

test('service-areas.json cannot be written, and nothing is, when the PBP files are absent, another release, or miss a plan key', async () => {
  const empty = tmp();
  await assert.rejects(serviceAreas(AETNA_FOLDER, empty), /^Error: PBP-Benefits-2027\/service-areas\.json cannot be written: no folder /);
  const noRegions = tmp();
  fs.mkdirSync(path.join(noRegions, '2027'));
  for (const f of ['PlanArea.txt', 'download.json']) fs.copyFileSync(path.join(FIXTURE_DIR, '2027', f), path.join(noRegions, '2027', f));
  await assert.rejects(serviceAreas(AETNA_FOLDER, noRegions), /cannot be written: expected 1 file named PlanRegionArea\.txt/);
  const other = tmp();
  fs.mkdirSync(path.join(other, '2027'));
  for (const f of ['PlanArea.txt', 'PlanRegionArea.txt']) fs.copyFileSync(path.join(FIXTURE_DIR, '2027', f), path.join(other, '2027', f));
  fs.writeFileSync(path.join(other, '2027', 'download.json'), JSON.stringify({ downloaded: '2027-01-15', release_label: 'PBP Benefits-2027' }));
  await assert.rejects(serviceAreas(AETNA_FOLDER, other),
    /cannot be written: the PBP files in .* are release "PBP Benefits-2027", downloaded 2027-01-15 \(their download\.json\), and the documents are release PBP-Benefits-2027, downloaded 2026-10-06/);
  await assert.rejects(serviceAreas({ ...AETNA_FOLDER, keys: ['H1609-028-000', 'H1609-999-000'] }, FIXTURE_DIR),
    /cannot be written: H1609-999-000 is on no row of PlanArea\.txt or PlanRegionArea\.txt for contract year 2027/);
  const root = tmp();
  place(path.join(root, 'PBP-Benefits-2027'), EXAMPLES[0]);
  const r = await runMain([root, '--data', empty]);
  assert.strictEqual(r.code, 1);
  assert.match(r.errors[0], /^error: PBP-Benefits-2027\/service-areas\.json cannot be written/);
  assert.deepStrictEqual(fs.readdirSync(root), ['PBP-Benefits-2027'], 'no index.json');
  assert.deepStrictEqual(fs.readdirSync(path.join(root, 'PBP-Benefits-2027')).sort(), ['H1609-028-000.bundle.json', 'H1609-028-000.json'], 'no service-areas.json');
});

test('the CLI stops and writes no index and no service-areas.json when a document has no Bundle beside it', async () => {
  const root = tmp();
  place(path.join(root, 'PBP-Benefits-2027'), EXAMPLES[0]);
  place(path.join(root, 'marketplace-puf-2026-2026-10-05'), EXAMPLES[1]);
  fs.unlinkSync(path.join(root, 'PBP-Benefits-2027', 'H1609-028-000.bundle.json'));
  const r = await runMain([root, '--data', FIXTURE_DIR]);
  assert.strictEqual(r.code, 1);
  assert.deepStrictEqual(r.errors, ['error: PBP-Benefits-2027/H1609-028-000.json has no Bundle beside it, PBP-Benefits-2027/H1609-028-000.bundle.json; every document has its Bundle']);
  assert.deepStrictEqual(fs.readdirSync(root).sort(), ['PBP-Benefits-2027', 'marketplace-puf-2026-2026-10-05'], 'no index.json');
  assert.deepStrictEqual(fs.readdirSync(path.join(root, 'PBP-Benefits-2027')), ['H1609-028-000.json'], 'no service-areas.json');
});

test('the CLI writes service-areas.json in the Medicare Advantage release folder, and reads it as no document on the next run', async () => {
  const root = tmp();
  place(path.join(root, 'PBP-Benefits-2027'), EXAMPLES[0]);
  place(path.join(root, 'marketplace-puf-2026-2026-10-05'), EXAMPLES[1]);
  assert.strictEqual((await runMain([root, '--data', FIXTURE_DIR])).code, 0);
  const written = fs.readFileSync(path.join(root, 'PBP-Benefits-2027', 'service-areas.json'), 'utf8');
  assert.strictEqual(written, JSON.stringify(await serviceAreas(AETNA_FOLDER, FIXTURE_DIR), null, 2) + '\n');
  assert.ok(!fs.existsSync(path.join(root, 'marketplace-puf-2026-2026-10-05', 'service-areas.json')), 'none for Marketplace');
  const index = readJson(path.join(root, 'index.json'));
  assert.deepStrictEqual(index.plans.map((e) => [e.id, e.service_areas]),
    [['H1609-028-000', 'PBP-Benefits-2027/service-areas.json'], ['68398FL0030058-01', null]]);
  const again = fs.readFileSync(path.join(root, 'index.json'), 'utf8');
  assert.strictEqual((await runMain([root, '--data', FIXTURE_DIR])).code, 0);
  assert.strictEqual(fs.readFileSync(path.join(root, 'index.json'), 'utf8'), again, 'the same index on the next run');
});

test('the header fields are those of the site index, with the same values but the description', () => {
  const site = tmp();
  const log = console.log;
  console.log = () => {};
  try { assert.strictEqual(main([site]), 0); } finally { console.log = log; }
  const siteIndex = readJson(path.join(site, 'index.json'));
  assert.deepStrictEqual(Object.keys(siteIndex), [...INDEX_HEADER_FIELDS, 'plans']);
  const root = tmp();
  place(root, EXAMPLES[0]);
  const { index } = pledgeeIndex(root);
  for (const f of INDEX_HEADER_FIELDS.filter((x) => x !== 'description')) assert.strictEqual(index[f], siteIndex[f], f);
  assert.ok(siteIndex.plans.every((e) => !('release' in e)), 'the site mode is unchanged: its entries have no release');
});

test('the README names the header fields and the entry fields the script writes, in order', () => {
  const text = fs.readFileSync(README, 'utf8').replace(/\r\n/g, '\n');
  const code = (xs) => xs.map((x) => `\`${x}\``);
  const header = code(INDEX_HEADER_FIELDS);
  assert.ok(text.includes(`The index opens with the header fields of the site's index, ${header.slice(0, -1).join(', ')} and ${header[header.length - 1]}, ` +
    'and lists the entries in `plans`'), 'README: the header field list');
  const lead = 'An entry has these fields, in this order:\n\n';
  const at = text.indexOf(lead);
  assert.ok(at >= 0, `README: no "${lead.trim()}"`);
  const table = text.slice(at + lead.length).split('\n\n')[0].split('\n').slice(2);
  assert.deepStrictEqual(table.map((row) => /^\| `([a-z_]+)` \|/.exec(row)[1]), PLEDGEE_ENTRY_FIELDS, 'README: the entry field table');
});

test('the README names the fields of service-areas.json the script writes, in order', () => {
  const text = fs.readFileSync(README, 'utf8').replace(/\r\n/g, '\n');
  const list = (xs) => { const c = xs.map((x) => `\`${x}\``); return `${c.slice(0, -1).join(', ')} and ${c[c.length - 1]}`; };
  assert.ok(text.includes(`\`service-areas.json\` opens with ${list(SERVICE_AREAS_HEADER_FIELDS)}, and lists the plan keys in \`plans\``), 'README: the header field list');
  const lead = 'A plan in `service-areas.json` has these fields, in this order:\n\n';
  const at = text.indexOf(lead);
  assert.ok(at >= 0, `README: no "${lead.trim()}"`);
  const table = text.slice(at + lead.length).split('\n\n')[0].split('\n').slice(2);
  assert.deepStrictEqual(table.map((row) => /^\| `([a-z_]+)` \|/.exec(row)[1]), SERVICE_AREAS_PLAN_FIELDS, 'README: the plan field table');
  assert.ok(text.includes(`A county has ${list(COUNTY_FIELDS)}`), 'README: the county fields');
  assert.ok(text.includes(`a region has ${list(REGION_FIELDS)}`), 'README: the region fields');
});
