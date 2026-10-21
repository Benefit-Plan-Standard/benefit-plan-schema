/**
 * Tests for scripts/publish-fhir.js --pledgee
 *
 *   node --test scripts/publish-fhir.test.js
 *
 * Fails if the pledgee index changes: its header fields (the site index's), its
 * entry fields and their order, the release read from each document, the order of
 * releases and entries, the counts read from each Bundle, the errors that stop it,
 * or the field list in docs/specs/rtb-medical-mvp/README.md ("What a pledgee
 * publishes"), which must name the fields the script writes. Runs on the 2 worked
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

const { main, pledgeeIndex, releaseOf, INDEX_HEADER_FIELDS, PLEDGEE_ENTRY_FIELDS } = require('./publish-fhir.js');

const REPO = path.join(__dirname, '..');
const README = path.join(REPO, 'docs', 'specs', 'rtb-medical-mvp', 'README.md');
const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// The 2 worked examples (README, "Worked example") under their plan-key names.
const EXAMPLES = [
  { key: 'H1609-028-000', doc: 'examples/aetna-medicare-aetna-medicare-select-extra.pbp.json', bundle: 'examples/fhir/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json' },
  { key: '68398FL0030058-01', doc: 'examples/unitedhealthcare-uhc-bronze-essential.puf.json', bundle: 'examples/fhir-puf/unitedhealthcare-uhc-bronze-essential.json' },
];
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'pledgee-test-'));
function place(dir, ex, { bundle = true, name = ex.key } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  fs.copyFileSync(path.join(REPO, ex.doc), path.join(dir, `${name}.json`));
  if (bundle) fs.copyFileSync(path.join(REPO, ex.bundle), path.join(dir, `${name}.bundle.json`));
}
// The UHC document as if its Plan Attributes and Benefits and Cost Sharing PUFs had been downloaded on another date.
function olderMarketplace(dir, date) {
  fs.mkdirSync(dir, { recursive: true });
  const text = fs.readFileSync(path.join(REPO, EXAMPLES[1].doc), 'utf8');
  const from = 'benefits-and-cost-sharing-puf.zip), downloaded 2026-10-05,';
  assert.ok(text.includes(from));
  fs.writeFileSync(path.join(dir, `${EXAMPLES[1].key}.json`), text.replace(from, `benefits-and-cost-sharing-puf.zip), downloaded ${date},`));
}

test('a root with no release folders: 1 release with no name, entries by plan key, counts from the Bundles', () => {
  const root = tmp();
  for (const ex of EXAMPLES) place(root, ex);
  const r = pledgeeIndex(root);
  assert.strictEqual(r.flat, true);
  assert.deepStrictEqual(Object.keys(r.index), [...INDEX_HEADER_FIELDS, 'plans']);
  for (const e of r.index.plans) assert.deepStrictEqual(Object.keys(e), PLEDGEE_ENTRY_FIELDS);
  // The counts are those of the Bundles' own records: examples/fhir-puf/README.md (27 placed, 25 outside the SBC
  // codes) and the sixth validator run in examples/fhir/VALIDATION.md (16 placed, 22 listed).
  assert.deepStrictEqual(r.index.plans, [
    {
      id: '68398FL0030058-01', plan_name: 'UHC Bronze Essential ($0 Virtual Urgent Care)', carrier: 'UnitedHealthcare', plan_type: 'HMO', plan_year: 2026,
      program: 'Marketplace', bps_schema_version: '1.2.0', document: '68398FL0030058-01.json', bundle: '68398FL0030058-01.bundle.json',
      release: null, data_date: '2026-10-05', benefits_placed: 27, benefits_unmapped: 25,
      label: 'Marketplace, imported from the CMS Health Insurance Exchange public use files for plan year 2026.',
    },
    {
      id: 'H1609-028-000', plan_name: 'Aetna Medicare Select Extra (HMO-POS)', carrier: 'Aetna Medicare', plan_type: 'HMO_POS', plan_year: 2027,
      program: 'Medicare Advantage', bps_schema_version: '1.2.0', document: 'H1609-028-000.json', bundle: 'H1609-028-000.bundle.json',
      release: null, data_date: '2026-10-06', benefits_placed: 16, benefits_unmapped: 22,
      label: 'Medicare Advantage, imported from the CMS PBP Benefits files for contract year 2027.',
    },
  ]);
  assert.strictEqual(JSON.stringify(pledgeeIndex(root).index), JSON.stringify(r.index), 'the same index on every run');
});

test('release folders: newest release first, paths include the folder, a release with no Bundle gives nulls', () => {
  const root = tmp();
  place(path.join(root, 'PBP-Benefits-2027'), EXAMPLES[0]);
  place(path.join(root, 'marketplace-puf-2026-2026-10-05'), EXAMPLES[1]);
  olderMarketplace(path.join(root, 'marketplace-puf-2026-2026-09-01'), '2026-09-01');
  const r = pledgeeIndex(root);
  assert.strictEqual(r.flat, false);
  assert.strictEqual(r.releases, 3);
  assert.deepStrictEqual(r.index.plans.map((e) => [e.release, e.id, e.data_date, e.document, e.bundle, e.benefits_placed, e.benefits_unmapped]), [
    ['PBP-Benefits-2027', 'H1609-028-000', '2026-10-06', 'PBP-Benefits-2027/H1609-028-000.json', 'PBP-Benefits-2027/H1609-028-000.bundle.json', 16, 22],
    ['marketplace-puf-2026-2026-10-05', '68398FL0030058-01', '2026-10-05', 'marketplace-puf-2026-2026-10-05/68398FL0030058-01.json',
      'marketplace-puf-2026-2026-10-05/68398FL0030058-01.bundle.json', 27, 25],
    ['marketplace-puf-2026-2026-09-01', '68398FL0030058-01', '2026-09-01', 'marketplace-puf-2026-2026-09-01/68398FL0030058-01.json', null, null, null],
  ]);
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
  const mixed = tmp();
  place(mixed, EXAMPLES[0]);
  place(path.join(mixed, 'marketplace-puf-2026-2026-10-05'), EXAMPLES[1]);
  assert.throws(() => pledgeeIndex(mixed), /holds release folders and also H1609-028-000\.bundle\.json/);
  // A Marketplace folder is named by its date, so only a Medicare Advantage folder can hold 2 download dates.
  const twoDates = tmp();
  place(path.join(twoDates, 'PBP-Benefits-2027'), EXAMPLES[0]);
  const humana = fs.readFileSync(path.join(REPO, 'examples/humana-humana-gold-plus-h1036-068.pbp.json'), 'utf8');
  assert.ok(humana.includes('), downloaded 2026-10-06.'));
  fs.writeFileSync(path.join(twoDates, 'PBP-Benefits-2027', 'H1036-068-000.json'), humana.replace('), downloaded 2026-10-06.', '), downloaded 2026-07-01.'));
  assert.throws(() => pledgeeIndex(twoDates), /PBP-Benefits-2027 holds documents downloaded on 2026-07-01 and 2026-10-06; 1 release has 1 download date/);
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
