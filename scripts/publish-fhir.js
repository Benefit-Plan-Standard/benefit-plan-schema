#!/usr/bin/env node
/**
 * Copies the converter outputs and BPS FHIR definitions into a static-site folder
 * and writes an index.json listing every InsurancePlan file.
 *
 * Usage (from the repo root, with benefit-plan-docs checked out beside this repo):
 *   node scripts/publish-fhir.js ../benefit-plan-docs/static/fhir
 *
 * Layout written under the target folder:
 *   InsurancePlan/<id>.json          the golden Bundles from examples/fhir/, unchanged
 *   StructureDefinition/<name>.json  from fhir/definitions/
 *   CodeSystem/<name>.json           from fhir/definitions/
 *   index.json                       plain JSON list of the InsurancePlan files (not a FHIR resource)
 *
 * The InsurancePlan files are the 10 examples/*_example.json Bundles, then the 5
 * examples/*.pbp.json Bundles. The Marketplace Bundles in examples/fhir-puf/ are not published.
 * The site names its files by slug, because it publishes the repository's examples.
 *
 * Pledgee mode (docs/specs/rtb-medical-mvp/README.md, "What a pledgee publishes"):
 *   node scripts/publish-fhir.js --pledgee <root> [--data <dir>]
 *
 * Reads a pledgee's folder of documents written by the 2 public-file importers,
 * 1 folder per CMS release: <root>/<release>/<plan key>.json and its Bundle,
 * <plan key>.bundle.json, which is SHALL, so a document without one stops the
 * script. <release> is the release as the document's first
 * source_references excerpt gives it, made file-safe: the Medicare Advantage
 * release label (PBP-Benefits-2027), or marketplace-puf-<plan year>-<download date
 * of the Plan Attributes PUF> (the Marketplace files have no release name). Writes
 * <root>/index.json with the site index's header fields and 1 entry per document,
 * newest release first and by plan key within a release, and in every Medicare
 * Advantage release folder <release>/service-areas.json, the counties (or the
 * regions, for a regional PPO) of each plan key in the folder, read from
 * PlanArea.txt and PlanRegionArea.txt of the PBP files in <dir>/<contract year>/
 * (--data, default data/pbp, the folder scripts/from-pbp.js reads). Those files must
 * be the folder's release: their download.json gives its release label and download
 * date. A root with documents and no release folders is read as 1 release with no
 * name (release null) and gets no service-areas.json, and the script says so. It
 * writes nothing else and changes no document or Bundle.
 * Exit codes: 0 = written, 1 = error (nothing is written).
 *
 * The files are static downloads, not a FHIR API. Output is deterministic.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { toInsurancePlanBundle, exampleFiles, pbpExampleFiles, EXAMPLES_DIR, GOLDEN_DIR } = require('./to-insuranceplan.js');
const { programOf, planKey, PROGRAM_NAME } = require('./rtb-completeness.js');
const { streamTsv, pbpDir, pad3, DATA_DIR } = require('./from-pbp.js');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFS_DIR = path.join(REPO_ROOT, 'fhir', 'definitions');
const SITE = 'https://benefitplanstandard.org/fhir/';
const BPS_EXT = 'https://benefitplanstandard.org/fhir/StructureDefinition/';

const MA_LABEL = 'Medicare Advantage, read from the CMS Summary of Benefits, validates against the v1.2.0 draft only.';
const PBP_LABEL = 'Medicare Advantage, imported from the CMS PBP benefits files for contract year 2027, validates against the v1.2.0 draft only.';

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function copyText(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, fs.readFileSync(from, 'utf8').replace(/\r\n/g, '\n'));
}

function indexEntry(file) {
  const bps = readJson(path.join(EXAMPLES_DIR, file));
  const plan = toInsurancePlanBundle(bps).entry[0].resource;
  const golden = path.join(GOLDEN_DIR, plan.id + '.json');
  const published = readJson(golden).entry[0].resource;
  const placed = published.coverage.reduce((n, c) => n + c.benefit.length, 0);
  const unmapped = published.extension.filter((e) => e.url === BPS_EXT + 'bps-unmapped-benefit').length;
  const entry = {
    id: plan.id,
    plan_name: bps.plan_name,
    carrier: bps.carrier,
    plan_type: bps.plan_type,
    plan_year: bps.plan_year,
    bps_schema_version: bps.schema_version,
    bps_example: 'examples/' + file,
    path: 'InsurancePlan/' + plan.id + '.json',
    url: SITE + 'InsurancePlan/' + plan.id + '.json',
    benefits_placed: placed,
    benefits_unmapped: unmapped,
  };
  if (file.endsWith('.pbp.json')) entry.label = PBP_LABEL;
  else if (bps.market === 'medicare_advantage') entry.label = MA_LABEL;
  return entry;
}

function main(argv) {
  if (argv.length !== 1) {
    console.error('usage: node scripts/publish-fhir.js <target-folder>   e.g. ../benefit-plan-docs/static/fhir');
    return 1;
  }
  const target = path.resolve(argv[0]);
  const files = [...exampleFiles(), ...pbpExampleFiles()];
  const entries = files.map(indexEntry);

  for (const e of entries) {
    copyText(path.join(GOLDEN_DIR, e.id + '.json'), path.join(target, e.path));
    console.log('wrote ' + e.path);
  }
  for (const name of fs.readdirSync(DEFS_DIR).filter((f) => f.endsWith('.json')).sort()) {
    const [kind, ...rest] = name.split('-');
    const out = path.join(target, kind, rest.join('-'));
    copyText(path.join(DEFS_DIR, name), out);
    console.log('wrote ' + path.relative(target, out).replace(/\\/g, '/'));
  }

  const index = {
    description: 'Static FHIR R4 Bundles, one per Benefit Plan Standard example, each holding one InsurancePlan and the Organization it references. These are downloadable files, not a FHIR API or endpoint. Generated by scripts/to-insuranceplan.js in the benefit-plan-schema repository.',
    profile: 'http://hl7.org/fhir/us/insurance-card/StructureDefinition/sbc-insurance-plan',
    package: 'hl7.fhir.us.insurance-card#2.0.0-ballot',
    profile_status: 'draft, experimental; ballot-stage',
    fhir_version: '4.0.1',
    bps_repository: 'https://github.com/Benefit-Plan-Standard/benefit-plan-schema',
    converter_spec: 'https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/insuranceplan-converter.md',
    plans: entries,
  };
  fs.writeFileSync(path.join(target, 'index.json'), JSON.stringify(index, null, 2) + '\n');
  console.log('wrote index.json (' + entries.length + ' plans)');
  return 0;
}

// ---- pledgee mode ---------------------------------------------------------------
// The header fields of a pledgee index are those of the site index, then plans; an entry
// has these fields, in this order (the README's list is checked against them).
const INDEX_HEADER_FIELDS = ['description', 'profile', 'package', 'profile_status', 'fhir_version', 'bps_repository', 'converter_spec'];
const PLEDGEE_ENTRY_FIELDS = ['id', 'plan_name', 'carrier', 'plan_type', 'plan_year', 'program', 'bps_schema_version', 'document', 'bundle',
  'service_areas', 'release', 'data_date', 'benefits_placed', 'benefits_unmapped', 'label'];
const PLEDGEE_DESCRIPTION = 'Benefit Plan Standard documents and the FHIR R4 Bundles made from them, 1 entry per document, ' +
  'filed by CMS release, newest release first. These are downloadable files, not a FHIR API or endpoint. ' +
  'Written by scripts/publish-fhir.js --pledgee in the benefit-plan-schema repository.';
// <release>/service-areas.json of a Medicare Advantage release folder: its header fields, then plans. A plan, a
// county and a region have these fields, in this order (the README's lists are checked against them).
const SERVICE_AREAS = 'service-areas.json';
const SERVICE_AREAS_HEADER_FIELDS = ['description', 'release', 'contract_year', 'data_date'];
const SERVICE_AREAS_PLAN_FIELDS = ['plan_key', 'contract', 'plan', 'segment', 'counties', 'regions'];
const COUNTY_FIELDS = ['ssa_county_code', 'county', 'state', 'partial_flag', 'eghp_flag'];
const REGION_FIELDS = ['region_code', 'region', 'region_type'];
const SERVICE_AREAS_DESCRIPTION = 'The service area of each Medicare Advantage plan in this release folder, 1 entry per plan key, ' +
  'read from PlanArea.txt (counties, by SSA county code) and PlanRegionArea.txt (the regions of regional PPOs) of the CMS PBP Benefits files ' +
  'of the release, each value as the file gives it. Written by scripts/publish-fhir.js --pledgee in the benefit-plan-schema repository.';

const fileSafe = (s) => s.replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
const shownPath = (...parts) => path.join(...parts).replace(/\\/g, '/');

// The release of a document written by 1 of the 2 public-file importers, read from its
// first source_references excerpt: { release, label, data_date, year }. release is the
// folder name; data_date is the download date of the release (for Marketplace, of the
// Plan Attributes PUF, the first file the excerpt names); year is the contract year or
// the plan year.
function releaseOf(doc) {
  const program = programOf(doc);
  const first = ((doc.source_references || [])[0] || {}).excerpt || '';
  if (program === 'medicare_advantage') {
    const m = /^CMS Plan Benefit Package \(PBP\) Benefits, contract year (\d{4}), release "([^"]+)" \([^)]*\), downloaded (\d{4}-\d{2}-\d{2})\./.exec(first);
    if (!m) throw new Error('the first source_references excerpt does not give the contract year, the release and the download date');
    if (m[2] === '(not recorded)') throw new Error('the first source_references excerpt names no release label (the download record had none)');
    return { release: fileSafe(m[2]), label: `Medicare Advantage, imported from the CMS PBP Benefits files for contract year ${m[1]}.`, data_date: m[3], year: Number(m[1]) };
  }
  if (program === 'marketplace') {
    const m = /^CMS Health Insurance Exchange Public Use Files, plan year (\d{4}): Plan Attributes PUF \([^)]*\)[^]*?, downloaded (\d{4}-\d{2}-\d{2})/.exec(first);
    if (!m) throw new Error('the first source_references excerpt does not give the plan year and the Plan Attributes PUF download date');
    return { release: `marketplace-puf-${m[1]}-${m[2]}`, label: `Marketplace, imported from the CMS Health Insurance Exchange public use files for plan year ${m[1]}.`,
      data_date: m[2], year: Number(m[1]) };
  }
  throw new Error('the first source_references excerpt does not name the PBP or the Marketplace PUFs; not written by a public-file importer');
}

// The release folders under root, or the root itself as 1 release with no name when it
// holds documents and no folders: [{ release, files }], files being the .json names
// (index.json and service-areas.json, which this script writes, are not read).
function releaseFolders(root) {
  const items = fs.readdirSync(root, { withFileTypes: true }).filter((e) => !e.name.startsWith('.'));
  const dirs = items.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  const jsonIn = (dir) => fs.readdirSync(dir, { withFileTypes: true }).filter((e) => e.isFile() && e.name.endsWith('.json')).map((e) => e.name).sort();
  const top = jsonIn(root).filter((f) => f !== 'index.json');
  if (dirs.length && top.length) throw new Error(`${root} holds release folders and also ${top[0]}; put every document in the folder of its release`);
  if (!dirs.length) return [{ release: null, files: top }];
  return dirs.map((d) => ({ release: d, files: jsonIn(path.join(root, d)).filter((f) => f !== SERVICE_AREAS) }));
}

// The InsurancePlan of a Bundle and its counts, as the site index counts them.
function bundleCounts(bundle, shown) {
  const plan = bundle.resourceType === 'Bundle' && (bundle.entry || []).map((e) => e.resource).find((r) => r && r.resourceType === 'InsurancePlan');
  if (!plan) throw new Error(`${shown} is not a Bundle holding an InsurancePlan`);
  return {
    placed: (plan.coverage || []).reduce((n, c) => n + (c.benefit || []).length, 0),
    unmapped: (plan.extension || []).filter((e) => e.url === BPS_EXT + 'bps-unmapped-benefit').length,
  };
}

// The entries of 1 release folder, by plan key, and the contract or plan years of its documents.
function releaseEntries(root, { release, files }) {
  const rel = (name) => (release === null ? name : `${release}/${name}`);
  const docs = files.filter((f) => !f.endsWith('.bundle.json'));
  for (const b of files.filter((f) => f.endsWith('.bundle.json'))) {
    if (!docs.includes(b.replace(/\.bundle\.json$/, '.json'))) throw new Error(`${rel(b)} has no document beside it`);
  }
  if (!docs.length) throw new Error(`${release === null ? root : rel('')} holds no document`);
  const years = new Set();
  const entries = docs.map((name) => {
    const shown = rel(name);
    const doc = readJson(path.join(root, shown));
    let r;
    try { r = releaseOf(doc); } catch (e) { throw new Error(`${shown}: ${e.message}`); }
    const program = programOf(doc);
    const key = planKey(doc, program);
    if (!key) throw new Error(`${shown}: no plan key in plan_identifiers`);
    if (name !== `${key}.json`) throw new Error(`${shown}: the plan key is ${key}, so the file is named ${key}.json`);
    if (release !== null && release !== r.release) throw new Error(`${shown}: the document's release is ${r.release}, so it belongs in the folder ${r.release}`);
    years.add(r.year);
    const bundleName = `${key}.bundle.json`;
    if (!files.includes(bundleName)) throw new Error(`${shown} has no Bundle beside it, ${rel(bundleName)}; every document has its Bundle`);
    const counts = bundleCounts(readJson(path.join(root, rel(bundleName))), rel(bundleName));
    return {
      id: key,
      plan_name: doc.plan_name,
      carrier: doc.carrier,
      plan_type: doc.plan_type,
      plan_year: doc.plan_year,
      program: PROGRAM_NAME[program],
      bps_schema_version: doc.schema_version,
      document: shown,
      bundle: rel(bundleName),
      service_areas: release !== null && program === 'medicare_advantage' ? rel(SERVICE_AREAS) : null,
      release,
      data_date: r.data_date,
      benefits_placed: counts.placed,
      benefits_unmapped: counts.unmapped,
      label: r.label,
    };
  });
  // A release folder is 1 release, so its documents share 1 download date and 1 year; a
  // root with no folders may hold documents of several releases.
  const dates = [...new Set(entries.map((e) => e.data_date))];
  if (release !== null && dates.length > 1) throw new Error(`${release} holds documents downloaded on ${dates.sort().join(' and ')}; 1 release has 1 download date`);
  if (release !== null && years.size > 1) throw new Error(`${release} holds documents of the years ${[...years].sort().join(' and ')}; 1 release has 1 year`);
  return { entries: entries.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)), year: [...years][0] };
}

// The pledgee index of root: { index, flat, releases, serviceAreas }. Newest release first
// (by download date, then by name), and by plan key within a release. serviceAreas lists
// the Medicare Advantage release folders, each with what its service-areas.json is read for.
function pledgeeIndex(root) {
  const folders = releaseFolders(root).map((f) => ({ ...f, ...releaseEntries(root, f) }));
  folders.sort((a, b) => (a.entries[0].data_date !== b.entries[0].data_date
    ? (a.entries[0].data_date < b.entries[0].data_date ? 1 : -1)
    : (a.release < b.release ? -1 : 1)));
  const index = {
    description: PLEDGEE_DESCRIPTION,
    profile: 'http://hl7.org/fhir/us/insurance-card/StructureDefinition/sbc-insurance-plan',
    package: 'hl7.fhir.us.insurance-card#2.0.0-ballot',
    profile_status: 'draft, experimental; ballot-stage',
    fhir_version: '4.0.1',
    bps_repository: 'https://github.com/Benefit-Plan-Standard/benefit-plan-schema',
    converter_spec: 'https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/insuranceplan-converter.md',
    plans: folders.flatMap((f) => f.entries),
  };
  const serviceAreas = folders.filter((f) => f.release !== null && f.entries[0].service_areas !== null)
    .map((f) => ({ release: f.release, year: f.year, data_date: f.entries[0].data_date, keys: f.entries.map((e) => e.id) }));
  return { index, flat: folders.length === 1 && folders[0].release === null, releases: folders.length, serviceAreas };
}

// The service-areas.json of 1 Medicare Advantage release folder ({ release, year, data_date,
// keys } from pledgeeIndex), read from PlanArea.txt and PlanRegionArea.txt in
// <dataDir>/<year>/ with the reader of scripts/from-pbp.js. Each county and region is
// quoted as the Medicare Advantage importer quotes it, by plan key, then by code. Throws,
// so that nothing is written, when the files are absent, are not the folder's release, or
// list a plan key on no row.
async function serviceAreas({ release, year, data_date, keys }, dataDir = DATA_DIR) {
  const cannot = (why) => new Error(`${release}/${SERVICE_AREAS} cannot be written: ${why}`);
  let dir;
  let files;
  try {
    const found = pbpDir(dataDir, year);
    dir = found.dir;
    files = { area: found.find('PlanArea.txt'), region: found.find('PlanRegionArea.txt') };
  } catch (e) {
    throw cannot(e.message);
  }
  const record = path.join(dir, 'download.json');
  const m = fs.existsSync(record) ? readJson(record) : {};
  if (fileSafe(m.release_label || '') !== release || m.downloaded !== data_date) {
    throw cannot(`the PBP files in ${shownPath(path.relative(process.cwd(), dir))} are release "${m.release_label || '(not recorded)'}", ` +
      `downloaded ${m.downloaded || '(not recorded)'} (their download.json), and the documents are release ${release}, downloaded ${data_date}`);
  }
  const plans = new Map(keys.map((k) => [k, { counties: new Map(), regions: new Map() }]));
  const read = (file, columns, add) => streamTsv(file, (f, idx) => {
    if (!/^\d{1,3}$/.test(f[2])) throw cannot(`${path.basename(file)}: segment_id "${f[2]}" is not 1 to 3 digits`);
    const plan = plans.get(`${f[0]}-${f[1]}-${pad3(f[2])}`);
    if (!plan) return;
    const r = {};
    for (const h of ['contract_year', ...columns]) {
      if (!idx.has(h)) throw cannot(`${path.basename(file)} has no ${h} column`);
      r[h] = f[idx.get(h)];
    }
    if (Number(r.contract_year) !== year) throw cannot(`${path.basename(file)}: contract_year "${r.contract_year}" is not ${year}`);
    add(plan, r);
  });
  await read(files.area, ['county_code', 'county', 'stcd', 'partial_flag', 'eghp_flag'], (plan, r) => {
    const c = { ssa_county_code: r.county_code, county: r.county, state: r.stcd, partial_flag: r.partial_flag, eghp_flag: r.eghp_flag };
    plan.counties.set(JSON.stringify(c), c);
  });
  await read(files.region, ['ma_or_pdp_region_code', 'region', 'region_type'], (plan, r) => {
    const g = { region_code: r.ma_or_pdp_region_code, region: r.region, region_type: r.region_type };
    plan.regions.set(JSON.stringify(g), g);
  });
  const byCode = (field) => (map) => [...map].sort((a, b) => (a[1][field] !== b[1][field] ? (a[1][field] < b[1][field] ? -1 : 1) : (a[0] < b[0] ? -1 : 1))).map((e) => e[1]);
  const out = [...plans.keys()].sort().map((k) => {
    const { counties, regions } = plans.get(k);
    if (!counties.size && !regions.size) throw cannot(`${k} is on no row of PlanArea.txt or PlanRegionArea.txt for contract year ${year}`);
    const [contract, plan, segment] = k.split('-');
    return { plan_key: k, contract, plan, segment, counties: byCode('ssa_county_code')(counties), regions: byCode('region_code')(regions) };
  });
  return { description: SERVICE_AREAS_DESCRIPTION, release, contract_year: year, data_date, plans: out };
}

async function pledgeeMain(argv) {
  const args = [...argv];
  let dataDir = DATA_DIR;
  const at = args.indexOf('--data');
  if (at >= 0) {
    dataDir = args[at + 1] ? path.resolve(args[at + 1]) : null;
    args.splice(at, 2);
  }
  if (args.length !== 1 || !dataDir) {
    console.error('usage: node scripts/publish-fhir.js --pledgee <root> [--data <dir>]   e.g. published (holding published/<release>/<plan key>.json); ' +
      '--data: the PBP files, <dir>/<contract year>/, default data/pbp');
    return 1;
  }
  const root = path.resolve(args[0]);
  let r;
  const areas = [];
  try {
    if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) throw new Error(`no folder ${args[0]}`);
    r = pledgeeIndex(root);
    for (const f of r.serviceAreas) areas.push(await serviceAreas(f, dataDir));
  } catch (e) {
    console.error('error: ' + e.message);
    return 1;
  }
  if (r.flat) {
    const ma = r.index.plans.some((e) => e.program === PROGRAM_NAME.medicare_advantage);
    console.log(`note: ${args[0]} has no release folders, so its documents are read as 1 release with no name, and each entry's release is null` +
      (ma ? `; no ${SERVICE_AREAS} is written, so each entry's service_areas is null` : ''));
  }
  const many = (n, one, more) => `${n.toLocaleString('en-US')} ${n === 1 ? one : more}`;
  for (const a of areas) {
    fs.writeFileSync(path.join(root, a.release, SERVICE_AREAS), JSON.stringify(a, null, 2) + '\n');
    const sum = (field) => a.plans.reduce((n, p) => n + p[field].length, 0);
    console.log(`wrote ${shownPath(args[0], a.release, SERVICE_AREAS)} (${many(a.plans.length, 'plan key', 'plan keys')}, ` +
      `${many(sum('counties'), 'county', 'counties')}, ${many(sum('regions'), 'region', 'regions')})`);
  }
  fs.writeFileSync(path.join(root, 'index.json'), JSON.stringify(r.index, null, 2) + '\n');
  console.log(`wrote ${shownPath(args[0], 'index.json')} (${many(r.index.plans.length, 'document', 'documents')}, ${many(r.releases, 'release', 'releases')})`);
  return 0;
}

module.exports = {
  main, pledgeeMain, pledgeeIndex, releaseOf, serviceAreas, INDEX_HEADER_FIELDS, PLEDGEE_ENTRY_FIELDS,
  SERVICE_AREAS, SERVICE_AREAS_HEADER_FIELDS, SERVICE_AREAS_PLAN_FIELDS, COUNTY_FIELDS, REGION_FIELDS,
};

if (require.main === module) {
  const argv = process.argv.slice(2);
  if (argv[0] === '--pledgee') pledgeeMain(argv.slice(1)).then((code) => process.exit(code));
  else process.exit(main(argv));
}
