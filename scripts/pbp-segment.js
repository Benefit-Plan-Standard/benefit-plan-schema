#!/usr/bin/env node
/**
 * County to segment for a Medicare Advantage plan
 *
 * An eligibility response (HETS 271) gives a plan's contract and plan number but
 * not its segment. The segments of 1 contract and plan serve different counties
 * (docs/specs/pbp-importer.md section 4.1), so the member's county picks the
 * segment. This script reads PlanArea.txt of the CMS PBP Benefits files with the
 * reader of scripts/from-pbp.js and prints the segment and the full plan key, the
 * key scripts/from-pbp.js --plan takes. Spec: docs/specs/rtb-medical-mvp/README.md,
 * "Identifying the plan" and "Plan match".
 *
 * --service-areas <file> reads the counties of a pledgee's service-areas.json, which
 * scripts/publish-fhir.js --pledgee writes in every Medicare Advantage release folder
 * from the same PlanArea.txt, instead of PlanArea.txt, with the same output and exit
 * codes. That file lists only the pledgee's plan keys; a regional PPO has regions in it,
 * not counties, and the script names its segment and plan key and exits 1, as it does
 * when PlanArea.txt has no rows for the plan. Both answers come before the county is
 * looked up, so --county and --county-name give the same one.
 *
 * The county is the 5-digit SSA state and county code, as PlanArea.txt holds it in
 * county_code. A FIPS code is not an SSA code (PBP importer spec section 4.5).
 * --county-name takes the county's name and state instead, "St. Johns, FL", matched
 * to the county and stcd columns case-insensitively over the whole file; a name
 * with 2 codes (Los Angeles, CA: 05200 and 05210) is looked up under both.
 *
 * Usage:
 *   node scripts/pbp-segment.js --year 2027 --contract H1609 --plan 028 --county 10150
 *   node scripts/pbp-segment.js --year 2027 --contract H1609 --plan 028 --county-name "Duval, FL"
 *   node scripts/pbp-segment.js --year 2027 --all-pairs     every county of every contract and plan with more than 1 segment
 *   node scripts/pbp-segment.js --service-areas published/PBP-Benefits-2027/service-areas.json --year 2027 --contract H1609 --plan 028 --county-name "Duval, FL"
 *   node scripts/pbp-segment.js --write-fixtures            re-cut test/fixtures/pbp-segment/ (needs data/pbp/)
 *   options: --data <dir> (default data/pbp), --service-areas <file> (in place of PlanArea.txt)
 *
 * Exit codes: 0 = 1 segment (--all-pairs: every county picks exactly 1), 1 = no
 * segment serves the county, or an error, 2 = more than 1 segment serves the county,
 * which section 4.1 says does not happen; the candidates are printed.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { streamTsv, pbpDir, pad3, cutFile, DATA_DIR } = require('./from-pbp.js');

const REPO_ROOT = path.resolve(__dirname, '..');
// PlanArea.txt and PlanRegionArea.txt rows of the plans below, cut from the full files by
// --write-fixtures and committed (data/ is git-ignored), for scripts/pbp-segment.test.js and
// the service-areas.json tests of scripts/publish-fhir.test.js.
const FIXTURE_DIR = path.join(REPO_ROOT, 'test', 'fixtures', 'pbp-segment');
const FIXTURE_PLANS = [
  { year: 2027, keys: ['H1609-028-000'], why: '1 segment; the worked example plan' },
  { year: 2027, keys: ['H2406-013-000'], why: '1 segment; serves St. Johns, FL (SSA 10540, FIPS 12109)' },
  { year: 2027, keys: ['H1019-103-001', 'H1019-103-002'], why: '2 segments in Florida; the county picks 1' },
  { year: 2027, keys: ['H0504-056-000'], why: '1 segment; serves Los Angeles, CA under both of its SSA codes, 05200 and 05210' },
  { year: 2027, keys: ['R0759-001-000'], why: 'Regional PPO, 1 segment; region 09, Florida, in PlanRegionArea.txt and on no row of PlanArea.txt' },
];
const FIXTURE_FILES = ['PlanArea.txt', 'PlanRegionArea.txt'];
const SECTION_41 = 'PBP importer spec section 4.1';
const SECTION_45 = 'PBP importer spec section 4.5';

const count = (n) => n.toLocaleString('en-US');

// "St. Johns, FL" -> { county: 'st. johns', state: 'fl' }, split at the last comma.
function parseCountyName(s) {
  const i = (s || '').lastIndexOf(',');
  const county = i < 0 ? '' : s.slice(0, i).trim();
  const state = i < 0 ? '' : s.slice(i + 1).trim();
  if (!county || !/^[A-Za-z]{2}$/.test(state)) throw new Error(`--county-name must be "<county>, <state>", for example "St. Johns, FL"; got "${s}"`);
  return { county: county.toLowerCase(), state: state.toLowerCase(), text: `${county}, ${state.toUpperCase()}` };
}

const COLUMNS = ['pbp_a_hnumber', 'pbp_a_plan_identifier', 'segment_id', 'county_code', 'partial_flag', 'contract_year', 'eghp_flag', 'county', 'stcd'];

// The name the messages give the file read: PlanArea.txt, or the service-areas.json given.
const sourceOf = ({ serviceAreas }) => (serviceAreas ? path.basename(serviceAreas) : 'PlanArea.txt');

// The plans of a service-areas.json, checked against --year.
function serviceAreaPlans(file, year) {
  const sa = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!Array.isArray(sa.plans)) throw new Error(`${path.basename(file)} has no plans; it is not a service-areas.json written by scripts/publish-fhir.js --pledgee`);
  if (Number(sa.contract_year) !== year) throw new Error(`${path.basename(file)}: contract_year ${sa.contract_year} is not --year ${year}`);
  return { plans: sa.plans, contractYear: String(sa.contract_year) };
}

// Streams PlanArea.txt, or reads the counties of a service-areas.json, each as the
// PlanArea.txt row it was quoted from, and calls onRow(f, col) for every record, col
// giving the position of each column in COLUMNS.
async function eachRow({ dataDir = DATA_DIR, year, serviceAreas = null }, onRow) {
  if (serviceAreas) {
    const { plans, contractYear } = serviceAreaPlans(serviceAreas, year);
    const col = Object.fromEntries(COLUMNS.map((h, i) => [h, i]));
    for (const p of plans) {
      for (const c of p.counties || []) {
        const r = { pbp_a_hnumber: p.contract, pbp_a_plan_identifier: p.plan, segment_id: p.segment, county_code: c.ssa_county_code,
          partial_flag: c.partial_flag, contract_year: contractYear, eghp_flag: c.eghp_flag, county: c.county, stcd: c.state };
        onRow(COLUMNS.map((h) => String(r[h] === undefined ? '' : r[h])), col);
      }
    }
    return;
  }
  const file = pbpDir(dataDir, year).find('PlanArea.txt');
  let col = null;
  await streamTsv(file, (f, idx) => {
    if (!col) {
      col = {};
      for (const h of COLUMNS) {
        if (!idx.has(h)) throw new Error(`PlanArea.txt has no ${h} column`);
        col[h] = idx.get(h);
      }
    }
    onRow(f, col);
  });
}

// The columns of 1 record that this script reads, checked.
function rowOf(f, col, year, src = 'PlanArea.txt') {
  const r = {};
  for (const h of COLUMNS) r[h] = f[col[h]];
  if (!/^\d{1,3}$/.test(r.segment_id)) throw new Error(`${src}: segment_id "${r.segment_id}" is not 1 to 3 digits`);
  if (!/^\d{5}$/.test(r.county_code)) throw new Error(`${src}: county_code "${r.county_code}" is not 5 digits`);
  if (Number(r.contract_year) !== year) throw new Error(`${src}: contract_year "${r.contract_year}" is not --year ${year}`);
  return r;
}

// 1 pass over PlanArea.txt (or a service-areas.json). Returns the rows of 1 contract and
// plan (every segment), the county codes whose county and stcd match the name, and which
// of the wanted codes appear on any row of the file.
async function readPlanArea({ dataDir, year, serviceAreas, contract, plan, codes = [], name = null }) {
  const rows = [];
  const named = new Map();
  const seen = new Set();
  const src = sourceOf({ serviceAreas });
  await eachRow({ dataDir, year, serviceAreas }, (f, col) => {
    const code = f[col.county_code];
    if (codes.includes(code)) seen.add(code);
    if (name && f[col.county].trim().toLowerCase() === name.county && f[col.stcd].trim().toLowerCase() === name.state) {
      named.set(code, `${f[col.county]} ${f[col.stcd]}`);
    }
    if (f[col.pbp_a_hnumber] === contract && f[col.pbp_a_plan_identifier] === plan) rows.push(rowOf(f, col, year, src));
  });
  return { rows, named, seen };
}

// The segments of 1 contract and plan that serve any of the codes, in segment
// order, each with its rows for those codes.
function segmentsFor(rows, codes) {
  const by = new Map();
  for (const r of rows) {
    if (!codes.includes(r.county_code)) continue;
    const seg = pad3(r.segment_id);
    if (!by.has(seg)) by.set(seg, []);
    by.get(seg).push(r);
  }
  return [...by.keys()].sort().map((segment) => ({ segment, rows: by.get(segment) }));
}

// A county as the Medicare Advantage importer quotes it: code, name, state and
// the 2 flags verbatim.
const countyLine = (r) => `county ${r.county_code} ${r.county} ${r.stcd}, partial_flag "${r.partial_flag}", eghp_flag "${r.eghp_flag}"`;

// Returns { code, lines }: the exit code and what to print.
async function findSegment({ dataDir, year, serviceAreas, contract, plan, county, countyName }) {
  if (!/^[A-Z]\d{4}$/.test(contract || '')) throw new Error(`--contract must be like H1609; got "${contract}"`);
  if (!/^\d{3}$/.test(plan || '')) throw new Error(`--plan must be the 3-digit plan number, like 028; got "${plan}"`);
  if (!county === !countyName) throw new Error('give --county <SSA code> or --county-name "<county>, <state>", not both');
  if (county && !/^\d{5}$/.test(county)) throw new Error(`--county must be the 5-digit SSA state and county code, like 10150; got "${county}"`);
  const name = countyName ? parseCountyName(countyName) : null;
  const { rows, named, seen } = await readPlanArea({ dataDir, year, serviceAreas, contract, plan, codes: county ? [county] : [], name });
  const pair = `${contract}-${plan}`;
  const src = sourceOf({ serviceAreas });
  // A contract and plan with no counties, such as a regional PPO, is answered before the
  // county is looked up, so --county and --county-name get the same message.
  if (rows.length === 0 && serviceAreas) {
    const regional = serviceAreaPlans(serviceAreas, year).plans.filter((p) => p.contract === contract && p.plan === plan && (p.regions || []).length);
    if (!regional.length) return { code: 1, lines: [`no plan key of ${pair} in ${src} for contract year ${year}`] };
    return { code: 1, lines: [`${pair} is a regional plan, so ${src} gives its regions and no counties`,
      ...regional.map((p) => `  segment ${p.segment}, plan key ${p.plan_key}, ${p.regions.map((g) => `region ${g.region_code} "${g.region}"`).join(', ')}`)] };
  }
  if (rows.length === 0) {
    return { code: 1, lines: [`no rows for ${pair} in PlanArea.txt for contract year ${year}; the file lists the counties of local plans, ` +
      'and a regional plan\'s service area is in PlanRegionArea.txt'] };
  }
  if (name && named.size === 0) return { code: 1, lines: [`no county named "${name.text}" in ${src} for contract year ${year}`] };
  const codes = county ? [county] : [...named.keys()].sort();
  const asked = county || `"${name.text}" (${codes.join(', ')})`;
  const found = segmentsFor(rows, codes);
  if (found.length === 0) {
    const lines = [`no segment serves county ${asked}`];
    if (county && !seen.has(county)) {
      lines.push(`county_code ${county} is ${serviceAreas ? 'in no county' : 'on no row'} of ${src}; a FIPS code is not an SSA code (${SECTION_45})`);
    }
    return { code: 1, lines };
  }
  const counties = (rs) => [...new Map(rs.map((r) => [countyLine(r), r])).keys()];
  if (found.length > 1) {
    return {
      code: 2,
      lines: [`county ${asked} matches ${found.length} segments of ${pair}; ${SECTION_41} says the segments of a contract and plan serve different counties`,
        ...found.flatMap((s) => [`  segment ${s.segment}, plan key ${pair}-${s.segment}`, ...counties(s.rows).map((l) => `    ${l}`)])],
    };
  }
  const [s] = found;
  return { code: 0, lines: [...counties(s.rows), `segment ${s.segment}`, `plan key ${pair}-${s.segment}`] };
}

// Every county of every contract and plan with more than 1 segment, each resolved
// as findSegment resolves it: the proposed plan match check (README, "Plan match").
async function checkAllPairs({ dataDir, year, serviceAreas }) {
  // Contract and plan -> county code -> segments; the file has 2.4 million rows, so only these are kept.
  const pairs = new Map();
  const src = sourceOf({ serviceAreas });
  await eachRow({ dataDir, year, serviceAreas }, (f, col) => {
    const r = rowOf(f, col, year, src);
    const k = `${r.pbp_a_hnumber}-${r.pbp_a_plan_identifier}`;
    if (!pairs.has(k)) pairs.set(k, new Map());
    const byCode = pairs.get(k);
    if (!byCode.has(r.county_code)) byCode.set(r.county_code, new Set());
    byCode.get(r.county_code).add(pad3(r.segment_id));
  });
  const segmentsOf = (k) => new Set([...pairs.get(k).values()].flatMap((s) => [...s]));
  const multi = [...pairs.keys()].sort().filter((k) => segmentsOf(k).size > 1);
  let checks = 0;
  const conflicts = [];
  for (const k of multi) {
    for (const [code, segs] of [...pairs.get(k)].sort((a, b) => (a[0] < b[0] ? -1 : 1))) {
      checks++;
      if (segs.size > 1) conflicts.push(`  ${k} county ${code}: segments ${[...segs].sort().join(', ')}`);
    }
  }
  const lines = [
    `contract year ${year}: ${count(pairs.size)} contract and plan ${pairs.size === 1 ? 'pair' : 'pairs'} in ${src}, ${count(multi.length)} with more than 1 segment`,
    `${count(checks)} pair and county checks: ${count(checks - conflicts.length)} pick exactly 1 segment, ${count(conflicts.length)} pick more than 1`,
    ...conflicts,
  ];
  return { code: conflicts.length ? 2 : 0, lines, pairs: pairs.size, multi: multi.length, checks, conflicts: conflicts.length };
}

// Copies the header and the fixture plans' rows of PlanArea.txt and PlanRegionArea.txt,
// byte for byte, into FIXTURE_DIR/<year>/, with a download.json that keeps the release
// label and download date of the full files.
async function writeFixtures({ dataDir = DATA_DIR, fixtureDir = FIXTURE_DIR } = {}) {
  const lines = [];
  for (const year of [...new Set(FIXTURE_PLANS.map((p) => p.year))]) {
    const plans = FIXTURE_PLANS.filter((p) => p.year === year);
    const keys = new Set(plans.flatMap((p) => p.keys));
    const { dir, find } = pbpDir(dataDir, year);
    const outDir = path.join(fixtureDir, String(year));
    fs.mkdirSync(outDir, { recursive: true });
    const records = {};
    for (const name of FIXTURE_FILES) records[name] = await cutFile(find(name), path.join(outDir, name), keys);
    const m = JSON.parse(fs.readFileSync(path.join(dir, 'download.json'), 'utf8'));
    const manifest = {
      description: `Rows of the plans below cut from PlanArea.txt and PlanRegionArea.txt of the CMS PBP Benefits files, contract year ${year}, ` +
        'by node scripts/pbp-segment.js --write-fixtures. Each file holds the original header line and the plans\' records, byte for byte. ' +
        'For scripts/pbp-segment.test.js and scripts/publish-fhir.test.js.',
      downloaded: m.downloaded,
      release_label: m.release_label,
      plans: plans.map((p) => ({ keys: p.keys, why: p.why })),
      records,
    };
    fs.writeFileSync(path.join(outDir, 'download.json'), JSON.stringify(manifest, null, 2) + '\n');
    lines.push(`wrote ${path.relative(REPO_ROOT, outDir).split(path.sep).join('/')}: ${FIXTURE_FILES.map((f) => `${f}, ${records[f]} ${records[f] === 1 ? 'record' : 'records'}`).join('; ')}`);
  }
  return lines;
}

// ---- CLI ----------------------------------------------------------------------------------------
async function main(argv, out = console) {
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--year') opt.year = Number(argv[++i]);
    else if (x === '--contract') opt.contract = argv[++i];
    else if (x === '--plan') opt.plan = argv[++i];
    else if (x === '--county') opt.county = argv[++i];
    else if (x === '--county-name') opt.countyName = argv[++i];
    else if (x === '--data') opt.dataDir = path.resolve(argv[++i]);
    else if (x === '--service-areas') opt.serviceAreas = path.resolve(argv[++i] || '');
    else if (x === '--all-pairs') opt.allPairs = true;
    else if (x === '--write-fixtures') opt.writeFixtures = true;
    else if (x === '-h' || x === '--help') {
      out.log('usage: node scripts/pbp-segment.js --year <YYYY> --contract <H1234> --plan <028> --county <SSA code>\n' +
        '       node scripts/pbp-segment.js --year <YYYY> --contract <H1234> --plan <028> --county-name "<county>, <state>"\n' +
        '       node scripts/pbp-segment.js --year <YYYY> --all-pairs     every county of every contract and plan with more than 1 segment\n' +
        '       node scripts/pbp-segment.js --write-fixtures              re-cut test/fixtures/pbp-segment/ from the full files\n' +
        '       options: --data <dir> (default data/pbp), --service-areas <file> (a service-areas.json in place of PlanArea.txt)');
      return 0;
    } else {
      out.error(`error: unknown argument "${x}"`);
      return 1;
    }
  }
  try {
    if (opt.writeFixtures) {
      for (const line of await writeFixtures({ dataDir: opt.dataDir })) out.log(line);
      return 0;
    }
    if (!Number.isInteger(opt.year)) throw new Error('--year is required');
    const r = opt.allPairs ? await checkAllPairs(opt) : await findSegment(opt);
    for (const line of r.lines) out.log(line);
    return r.code;
  } catch (e) {
    out.error('error: ' + e.message);
    return 1;
  }
}

module.exports = { parseCountyName, readPlanArea, segmentsFor, findSegment, checkAllPairs, writeFixtures, main, COLUMNS, FIXTURE_DIR, FIXTURE_PLANS, FIXTURE_FILES };

if (require.main === module) main(process.argv.slice(2)).then((code) => process.exit(code));
