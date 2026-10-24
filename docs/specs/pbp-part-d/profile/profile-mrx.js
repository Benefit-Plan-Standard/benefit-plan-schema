#!/usr/bin/env node
/**
 * Profile of the CMS PBP Part D files (pbp_mrx, pbp_mrx_tier, pbp_mrx_p), contract year 2027
 *
 * Counts the values the Part D mapping rests on (docs/specs/pbp-part-d-mapping.md):
 * the 2 populations, benefit types, tiers, deductibles, cost-share structures,
 * pharmacy locations, days supply, 1-month against 2- and 3-month amounts,
 * tier labels, PDP sponsors and the columns that could hold the out-of-pocket
 * threshold. Reads the full files in data/pbp/2027/ (git-ignored) with the
 * importer's own reader (scripts/from-pbp.js streamTsv), writes small markdown
 * and CSV files next to this script, and copies no file rows.
 *
 * Usage:
 *   node docs/specs/pbp-part-d/profile/profile-mrx.js                 write profile.md and the CSV files
 *   node docs/specs/pbp-part-d/profile/profile-mrx.js --plan H1036-068-000
 *                                                                      print the plan's non-blank MRx cells
 *   node docs/specs/pbp-part-d/profile/profile-mrx.js --plan H1036-068-000 --benefits [--offset 38]
 *                                                                      list the Part D benefits the mapping gives the plan
 *   options: --data <dir> (default data/pbp), --year <year> (default 2027)
 *
 * No npm dependency. The dictionary workbook is read with a small zip reader
 * (node:zlib) for the code lists in code-lists.md.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const { streamTsv, pad3 } = require(path.join(REPO_ROOT, 'scripts', 'from-pbp.js'));
const OUT_DIR = __dirname;

// ---- arguments ------------------------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = { data: path.join(REPO_ROOT, 'data', 'pbp'), year: 2027, plan: null, benefits: false, offset: 0 };
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === '--data') opt.data = path.resolve(argv[++i]);
  else if (argv[i] === '--year') opt.year = Number(argv[++i]);
  else if (argv[i] === '--plan') opt.plan = argv[++i];
  else if (argv[i] === '--benefits') opt.benefits = true;
  else if (argv[i] === '--offset') opt.offset = Number(argv[++i]);
  else { console.error(`error: unknown argument "${argv[i]}"`); process.exit(1); }
}
const DIR = path.join(opt.data, String(opt.year));
const NAMES = fs.readdirSync(DIR);
function find(name) {
  const hits = NAMES.filter((f) => f.toLowerCase() === name.toLowerCase());
  if (hits.length !== 1) throw new Error(`expected 1 file named ${name} in ${DIR}, found ${hits.length}`);
  return path.join(DIR, hits[0]);
}

// ---- reading --------------------------------------------------------------------------------
const keyOf = (r) => `${r.pbp_a_hnumber}-${r.pbp_a_plan_identifier}-${pad3(r.segment_id)}`;

async function readAll(name, keep) {
  const rows = [];
  let header = null;
  await streamTsv(find(name), (f, idx) => {
    if (!header) header = [...idx.keys()];
    const r = {};
    for (const [h, i] of idx) r[h] = f[i];
    if (!keep || keep(r)) rows.push(r);
  });
  return { rows, header };
}

function groupBy(rows) {
  const m = new Map();
  for (const r of rows) {
    const k = keyOf(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

// ---- the dictionary (xlsx: a zip of XML parts) ---------------------------------------------
function unzip(file) {
  const buf = fs.readFileSync(file);
  let eocd = buf.length - 22;
  while (eocd >= 0 && buf.readUInt32LE(eocd) !== 0x06054b50) eocd--;
  if (eocd < 0) throw new Error(`${file}: not a zip file`);
  const n = buf.readUInt16LE(eocd + 10);
  let p = buf.readUInt32LE(eocd + 16);
  const out = {};
  for (let i = 0; i < n; i++) {
    const method = buf.readUInt16LE(p + 10);
    const size = buf.readUInt32LE(p + 20);
    const nameLen = buf.readUInt16LE(p + 28);
    const extraLen = buf.readUInt16LE(p + 30);
    const commentLen = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen);
    const start = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const data = buf.subarray(start, start + size);
    out[name] = method === 8 ? zlib.inflateRawSync(data) : data;
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

const unescapeXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(Number(d))).replace(/&amp;/g, '&');

// Returns the dictionary rows as objects keyed by the header row (FILE, NAME, TYPE, ...).
function readDictionary(file) {
  const z = unzip(file);
  const strings = [...z['xl/sharedStrings.xml'].toString('utf8').matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map((m) => unescapeXml([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join('')));
  const sheet = Object.keys(z).filter((k) => /^xl\/worksheets\/sheet\d+\.xml$/.test(k));
  if (sheet.length !== 1) throw new Error(`${file}: expected 1 worksheet, found ${sheet.length}`);
  const rows = [];
  for (const m of z[sheet[0]].toString('utf8').matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
    const r = [];
    for (const c of m[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const col = c[1].split('').reduce((a, ch) => a * 26 + ch.charCodeAt(0) - 64, 0) - 1;
      const v = /<v>([\s\S]*?)<\/v>/.exec(c[3] || '');
      if (/t="s"/.test(c[2]) && v) r[col] = strings[Number(v[1])];
      else if (/t="inlineStr"/.test(c[2])) r[col] = unescapeXml([...(c[3] || '').matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((x) => x[1]).join(''));
      else if (v) r[col] = unescapeXml(v[1]);
    }
    rows.push(r);
  }
  const head = rows[0].map((h) => (h || '').trim());
  return rows.slice(1).map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').replace(/\s+/g, ' ').trim()])));
}

// ---- small helpers --------------------------------------------------------------------------
function count(map, k, n = 1) { map.set(k, (map.get(k) || 0) + n); }
const sortedEntries = (m) => [...m.entries()].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])));
const fmt = (n) => n.toLocaleString('en-US');
function table(head, rows) {
  return [`| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map((r) => `| ${r.join(' | ')} |`)].join('\n');
}
const csvCell = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
const csv = (head, rows) => [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
const pos = (s, n) => (s || '')[n - 1] === '1';
const num = (v) => (v === '' || v === undefined ? null : Number(v));

const PLAN_TYPE_LABELS = {
  '01': 'HMO', '02': 'HMOPOS', '04': 'Local PPO', '07': 'MSA', '09': 'PFFS', '18': '1876 Cost',
  '20': 'National Pace', '29': 'Medicare Prescription Drug Plan', '30': 'Employer/Union Only Direct Contract PDP', '31': 'Regional PPO',
};
const MVP_MA = new Set(['01', '02', '04', '31']);
// The fixture plans of docs/specs/pbp-part-d-mapping.md section 15.
const FIXTURE_PLANS = ['H1036-068-000', 'H2406-013-000', 'H1609-028-000', 'S5921-383-000', 'S4802-146-000'];

// The pharmacy locations of pbp_mrx_tier.txt: the flag column (position 1 three-month,
// 2 one-month, 3 two-month supply; out of network: 1 other, 2 one-month), the
// days-supply columns, and the amount column prefixes, from the dictionary.
const LOCATIONS = [
  { id: 'rstd', flag: 'mrx_tier_locat_rstd', label: 'Standard retail (retail not split)', parts: ['rstd'],
    days: { '1m': 'mrx_tier_rstd_1m_num', '2m': 'mrx_tier_rstd_2m_num', '3m': 'mrx_tier_rstd_3m_num' } },
  { id: 'rsplt', flag: 'mrx_tier_locat_rsplt', label: 'Retail split into standard and preferred', parts: ['rsstd', 'rspfd'],
    days: { '1m': 'mrx_tier_rsplt_1m_num', '2m': 'mrx_tier_rsplt_2m_num', '3m': 'mrx_tier_rsplt_3m_num' } },
  { id: 'mostd', flag: 'mrx_tier_locat_mostd', label: 'Standard mail order (mail order not split)', parts: ['mostd'],
    days: { '1m': 'mrx_tier_mostd_1m_num', '2m': 'mrx_tier_mostd_2m_num', '3m': 'mrx_tier_mostd_3m_num' } },
  { id: 'mosplt', flag: 'mrx_tier_locat_mosplt', label: 'Mail order split into standard and preferred', parts: ['mosstd', 'mospfd'],
    days: { '1m': 'mrx_tier_mosplt_1m_num', '2m': 'mrx_tier_mosplt_2m_num', '3m': 'mrx_tier_mosplt_3m_num' } },
  { id: 'oon', flag: 'mrx_tier_locat_oon', label: 'Out-of-network pharmacy', parts: ['oonp'],
    days: { '1m': 'mrx_tier_oonp_1m_num', other: 'mrx_tier_oonp_othnumn' } },
  { id: 'ltc', flag: 'mrx_tier_locat_ltc', label: 'Long-term care pharmacy', parts: ['ltcp'], days: { '1m': 'mrx_tier_ltcp_1m' } },
];
const SUPPLY_POS = { '3m': 1, '1m': 2, '2m': 3 };
const OON_POS = { other: 1, '1m': 2 };
const LTC_POS = { '1m': 1 };

function amountCols(part, supply) {
  if (part === 'oonp') {
    const s = supply === 'other' ? 'othnum' : '1m';
    return { copay: `mrx_tier_oonp_copay_${s}`, coins: `mrx_tier_oonp_coins_${s}` };
  }
  if (part === 'ltcp') return { copay: 'mrx_tier_ltcp_copay_1m', coins: 'mrx_tier_ltcp_coins_1m' };
  return { copay: `mrx_tier_${part}_copay_${supply}`, coins: `mrx_tier_${part}_coins_${supply}` };
}

function flaggedSupplies(loc, row) {
  const f = row[loc.flag] || '';
  const map = loc.id === 'oon' ? OON_POS : loc.id === 'ltc' ? LTC_POS : SUPPLY_POS;
  return Object.keys(loc.days).filter((s) => pos(f, map[s]));
}

// ---- --plan: one plan's non-blank cells ------------------------------------------------------
async function printPlan(plan) {
  const key = plan.toUpperCase();
  const keep = (r) => keyOf(r) === key;
  const out = [];
  for (const name of ['pbp_Section_A.txt', 'pbp_mrx.txt', 'pbp_mrx_tier.txt', 'pbp_mrx_p.txt', 'PlanRegionArea.txt']) {
    const { rows } = await readAll(name, keep);
    out.push(`## ${name}: ${rows.length} row${rows.length === 1 ? '' : 's'}`);
    for (const r of rows) {
      const cols = Object.keys(r).filter((c) => r[c] !== '' && (name !== 'pbp_Section_A.txt' ||
        /^(pbp_a_plan_name|pbp_a_org_marketing_name|pbp_a_org_name|pbp_a_plan_type|pbp_a_contract_partd_flag|pbp_a_eghp_yn|pbp_a_special_need_flag|pbp_a_formulary_web_addr|pbp_a_pharmacy_website|pbp_a_segment_name)$/.test(c)));
      out.push('', table(['Column', 'Value'], cols.map((c) => [`\`${c}\``, `"${r[c]}"`])), '');
    }
  }
  process.stdout.write(`# ${key}: non-blank cells (Section A: identity columns only)\n\n${out.join('\n')}\n`);
}

// ---- --benefits: the Part D benefits a plan gets under the mapping --------------------------
// docs/specs/pbp-part-d-mapping.md sections 5 and 6: 1 initial coverage benefit per tier,
// pharmacy network and chosen supply, in tier, network and supply order, then 1
// catastrophic benefit per pbp_mrx_p.txt row. A listing for the fixture plans and
// the Summary of Benefits checks, not the importer.
const NETWORKS = [
  { id: 'RETAIL_STANDARD', from: [['rstd', 'rstd'], ['rsplt', 'rsstd']] },
  { id: 'RETAIL_PREFERRED', from: [['rsplt', 'rspfd']] },
  { id: 'MAIL_ORDER_STANDARD', from: [['mostd', 'mostd'], ['mosplt', 'mosstd']] },
  { id: 'MAIL_ORDER_PREFERRED', from: [['mosplt', 'mospfd']] },
  { id: 'OUT_OF_NETWORK', from: [['oon', 'oonp']] },
  { id: 'LONG_TERM_CARE', from: [['ltc', 'ltcp']] },
];
const SUPPLIES = [['1m', '1M'], ['2m', '2M'], ['3m', '3M'], ['other', 'OTHER']];

async function printBenefits(plan, offset) {
  const key = plan.toUpperCase();
  const keep = (r) => keyOf(r) === key;
  const ts = (await readAll('pbp_mrx_tier.txt', keep)).rows.sort((x, y) => Number(x.mrx_tier_id) - Number(y.mrx_tier_id));
  const ps = (await readAll('pbp_mrx_p.txt', keep)).rows.sort((x, y) => Number(x.mrx_tier_post_id) - Number(y.mrx_tier_post_id));
  const rows = [];
  const step = (struct, copay, coins) => (struct === '2' ? `copay $${Number(copay)}` : struct === '1' ? `coinsurance ${Number(coins)}%` : `structure "${struct}"`);
  for (const r of ts) {
    for (const net of NETWORKS) {
      for (const [locId, part] of net.from) {
        const loc = LOCATIONS.find((l) => l.id === locId);
        const chosen = flaggedSupplies(loc, r);
        for (const [s, code] of SUPPLIES.filter(([x]) => chosen.includes(x))) {
          const cols = amountCols(part, s);
          const amountCol = r.mrx_tier_cstshr_struct_type === '2' ? cols.copay : cols.coins;
          rows.push([`RX_T${r.mrx_tier_id}_${net.id}_${code}_INITIAL`, r[loc.days[s]], step(r.mrx_tier_cstshr_struct_type, r[cols.copay], r[cols.coins]),
            `\`${loc.flag}\` "${r[loc.flag]}", \`${loc.days[s]}\` "${r[loc.days[s]]}", \`${amountCol}\` "${r[amountCol]}"`]);
        }
      }
    }
  }
  // The catastrophic step is $0 for a covered Part D drug (mapping 6.6, Question Q6); the
  // file's post-threshold cells are listed beside it, never as the step.
  for (const p of ps) {
    rows.push([`RX_T${p.mrx_tier_post_id}_CATASTROPHIC`, '', 'copay $0',
      `\`mrx_tier_post_includes\` "${p.mrx_tier_post_includes}", \`mrx_tier_post_cost_struct\` "${p.mrx_tier_post_cost_struct}", ` +
      (p.mrx_tier_post_cost_struct === '2' ? `\`mrx_tier_post_copay_amt\` "${p.mrx_tier_post_copay_amt}"` : `\`mrx_tier_post_coins_pct\` "${p.mrx_tier_post_coins_pct}"`)]);
  }
  process.stdout.write(`# ${key}: Part D benefits under docs/specs/pbp-part-d-mapping.md\n\n` +
    `Written by \`node docs/specs/pbp-part-d/profile/profile-mrx.js --plan ${key} --benefits${offset ? ` --offset ${offset}` : ''}\`. ` +
    `${rows.length} benefits; the index is the position in \`benefits[]\`${offset ? `, after the ${offset} medical benefits of the current golden file` : ''}. ` +
    'Labels and tier-level cells: the plan\'s cell listing in this folder.\n\n' +
    table(['Index', 'benefit_id', 'day_supply', 'Cost share', 'Cells'], rows.map((r, i) => [String(offset + i), `\`${r[0]}\``, r[1], r[2], r[3]])) + '\n');
}

// ---- the profile ------------------------------------------------------------------------------
async function profile() {
  const sections = [];
  const add = (id, title, body) => sections.push(`## ${id}. ${title}\n\n${body}\n`);

  const A = (await readAll('pbp_Section_A.txt')).rows;
  const mrxFile = await readAll('pbp_mrx.txt');
  const tierFile = await readAll('pbp_mrx_tier.txt');
  const postFile = await readAll('pbp_mrx_p.txt');
  const region = (await readAll('PlanRegionArea.txt')).rows;
  const typeOf = new Map(A.map((a) => [keyOf(a), a.pbp_a_plan_type]));
  const aByKey = new Map(A.map((a) => [keyOf(a), a]));
  // PlanArea is 172 MB: keep only the keys of plan types 29 and 30.
  const pdpKeys = new Set(A.filter((a) => ['29', '30'].includes(a.pbp_a_plan_type)).map(keyOf));
  const areaPdp = (await readAll('PlanArea.txt', (r) => pdpKeys.has(keyOf(r)))).rows;

  const mrx = new Map(mrxFile.rows.map((r) => [keyOf(r), r]));
  if (mrx.size !== mrxFile.rows.length) throw new Error('pbp_mrx.txt: a plan key appears twice');
  const tiers = groupBy(tierFile.rows);
  const posts = groupBy(postFile.rows);
  const regions = groupBy(region);
  const pop = (k) => {
    const t = typeOf.get(k);
    if (t === '29') return 'PDP (29)';
    if (t === '30') return 'Employer PDP (30)';
    const m = mrx.get(k);
    if (MVP_MA.has(t)) return m && m.mrx_drug_ben_yn === '1' ? 'MA-PD (01, 02, 04, 31)' : 'MA without Part D (01, 02, 04, 31)';
    return m && m.mrx_drug_ben_yn === '1' ? 'Other MA-PD (07, 09, 18, 20)' : 'Other, no Part D (07, 09, 18, 20)';
  };
  const POPS = ['MA-PD (01, 02, 04, 31)', 'PDP (29)', 'MA without Part D (01, 02, 04, 31)', 'Other MA-PD (07, 09, 18, 20)',
    'Other, no Part D (07, 09, 18, 20)', 'Employer PDP (30)'];
  const IMPORTED = new Set(['MA-PD (01, 02, 04, 31)', 'PDP (29)']);

  // P1 populations by plan type.
  {
    const byType = new Map();
    for (const a of A) {
      const k = keyOf(a);
      const t = a.pbp_a_plan_type;
      if (!byType.has(t)) byType.set(t, { a: 0, mrx: 0, yes: 0, no: 0, blank: 0, tier: 0, post: 0 });
      const c = byType.get(t);
      c.a++;
      const m = mrx.get(k);
      if (m) {
        c.mrx++;
        if (m.mrx_drug_ben_yn === '1') c.yes++; else if (m.mrx_drug_ben_yn === '2') c.no++; else c.blank++;
      }
      if (tiers.has(k)) c.tier++;
      if (posts.has(k)) c.post++;
    }
    const rows = [...byType.entries()].sort((x, y) => x[0].localeCompare(y[0])).map(([t, c]) =>
      [t, PLAN_TYPE_LABELS[t] || t, fmt(c.a), fmt(c.mrx), fmt(c.yes), fmt(c.no), fmt(c.blank), fmt(c.tier), fmt(c.post)]);
    const tot = (f) => fmt([...byType.values()].reduce((s, c) => s + c[f], 0));
    rows.push(['all', '', tot('a'), tot('mrx'), tot('yes'), tot('no'), tot('blank'), tot('tier'), tot('post')]);
    const notInA = [...mrx.keys()].filter((k) => !typeOf.has(k)).length;
    const tierNotMrx = [...tiers.keys()].filter((k) => !mrx.has(k)).length;
    const postNotTier = [...posts.keys()].filter((k) => !tiers.has(k)).length + [...tiers.keys()].filter((k) => !posts.has(k)).length;
    const popCounts = new Map();
    for (const k of typeOf.keys()) count(popCounts, pop(k));
    add('P1', 'Populations', 'Plans in `pbp_Section_A.txt` by `pbp_a_plan_type`; whether each has a `pbp_mrx.txt` row and its `mrx_drug_ben_yn` ' +
      '("Does your plan offer a Medicare Prescription drug (Part D) benefit?", 1 Yes, 2 No); whether it has `pbp_mrx_tier.txt` and `pbp_mrx_p.txt` rows.\n\n' +
      table(['Type', 'Label', 'Section A', 'pbp_mrx row', 'drug_ben_yn 1', 'drug_ben_yn 2', 'drug_ben_yn blank', 'With tier rows', 'With post-threshold rows'], rows) +
      `\n\n\`pbp_mrx.txt\` keys not in Section A: ${notInA}. \`pbp_mrx_tier.txt\` keys with no \`pbp_mrx.txt\` row: ${tierNotMrx}. ` +
      `Plans with tier rows but no post-threshold rows, or the reverse: ${postNotTier}.\n\n` +
      'Populations used below (MA-PD and PDP are the 2 the importer reads):\n\n' +
      table(['Population', 'Plans'], POPS.map((p) => [p, fmt(popCounts.get(p) || 0)])));
  }

  // P2 benefit type by population, and tier rows.
  const BT = { 1: 'Defined Standard', 2: 'Actuarially Equivalent Standard', 3: 'Basic Alternative', 4: 'Enhanced Alternative' };
  {
    const rows = [];
    for (const p of POPS.filter((x) => IMPORTED.has(x) || x === 'Other MA-PD (07, 09, 18, 20)')) {
      for (const [code, label] of [...Object.entries(BT), ['', '(blank)']]) {
        let n = 0, withTiers = 0;
        for (const [k, m] of mrx) {
          if (pop(k) !== p || m.mrx_benefit_type !== code) continue;
          n++;
          if (tiers.has(k)) withTiers++;
        }
        if (n) rows.push([p, code === '' ? '' : code, label, fmt(n), fmt(withTiers), fmt(n - withTiers)]);
      }
    }
    // Plans that answer Yes to Part D and leave the benefit type blank: which columns they fill.
    const blank = new Map();
    for (const [k, m] of mrx) {
      if (m.mrx_drug_ben_yn !== '1' || m.mrx_benefit_type !== '') continue;
      const a = aByKey.get(k);
      const filled = Object.keys(m).filter((c) => /^mrx_/.test(c) && m[c] !== '').join(', ');
      count(blank, `${a.pbp_a_plan_type}|${a.pbp_a_eghp_yn}|${a.pbp_a_plan_identifier >= '800' ? '800 to 999' : 'below 800'}|${filled}`);
    }
    add('P2', '`mrx_benefit_type` by population', '"Type of drug benefit". A plan with no tier rows has no tier-level cost shares in the file.\n\n' +
      table(['Population', 'Code', 'Label', 'Plans', 'With tier rows', 'Without tier rows'], rows) +
      '\n\nPlans with `mrx_drug_ben_yn` "1" and a blank `mrx_benefit_type`, by plan type, `pbp_a_eghp_yn` (employer group plan, 1 Yes), plan number range and the `mrx_` columns they fill:\n\n' +
      table(['pbp_a_plan_type', 'pbp_a_eghp_yn', 'pbp_a_plan_identifier', 'mrx_ columns filled', 'Plans'],
        [...blank.entries()].sort().map(([k, n]) => [...k.split('|').map((v, i) => (i === 3 ? v.split(', ').map((c) => `\`${c}\``).join(', ') : v)), fmt(n)])));
  }

  const imported = [...mrx.keys()].filter((k) => IMPORTED.has(pop(k)));

  // P3 tiers: mrx_formulary_tiers_num against the tier rows.
  {
    const dist = new Map();
    let agree = 0, disagree = 0;
    const perPlan = new Map();
    for (const k of imported) {
      const m = mrx.get(k);
      const n = (tiers.get(k) || []).length;
      count(dist, `${pop(k)}|${m.mrx_formulary_tiers_num || '(blank)'}`);
      count(perPlan, `${pop(k)}|${n}`);
      if (n && String(n) === m.mrx_formulary_tiers_num) agree++; else if (n) disagree++;
    }
    const rows = [...dist.entries()].sort().map(([k, n]) => [...k.split('|'), fmt(n)]);
    const rows2 = [...perPlan.entries()].sort().map(([k, n]) => [...k.split('|'), fmt(n)]);
    add('P3', 'Tiers per plan', '`mrx_formulary_tiers_num` ("Number of tiers in the Part D benefit"), MA-PD and PDP plans:\n\n' +
      table(['Population', 'mrx_formulary_tiers_num', 'Plans'], rows) +
      '\n\nRows in `pbp_mrx_tier.txt` per plan:\n\n' + table(['Population', 'Tier rows', 'Plans'], rows2) +
      `\n\nPlans with tier rows whose row count equals \`mrx_formulary_tiers_num\`: ${fmt(agree)}; different: ${fmt(disagree)}.`);
  }

  // P4 deductible.
  {
    const DED = { 1: 'Yes (charges the Medicare-defined Part D deductible amount)', 2: 'No, enter amount', 3: 'No Deductible' };
    const rows = [];
    const amounts = new Map();
    for (const p of [...IMPORTED]) {
      for (const code of ['1', '2', '3', '']) {
        let n = 0, filled = 0, blank = 0;
        for (const k of imported) {
          const m = mrx.get(k);
          if (pop(k) !== p || m.mrx_alt_ded_charge !== code) continue;
          n++;
          if (m.mrx_alt_ded_amount === '') blank++; else { filled++; count(amounts, `${p}|${code}|${m.mrx_alt_ded_amount}`); }
        }
        if (n) rows.push([p, code, DED[code] || '(blank)', fmt(n), fmt(filled), fmt(blank)]);
      }
    }
    const amtRows = [...amounts.entries()].sort((x, y) => x[0].split('|')[0].localeCompare(y[0].split('|')[0]) || y[1] - x[1])
      .filter(([, n], i, all) => n >= 5 || all.filter(([k2]) => k2.split('|').slice(0, 2).join('|') === all[i][0].split('|').slice(0, 2).join('|')).length <= 12)
      .map(([k, n]) => [...k.split('|'), fmt(n)]);
    const distinct = new Map();
    for (const k of amounts.keys()) count(distinct, k.split('|').slice(0, 2).join('|'));
    add('P4', 'Deductible: `mrx_alt_ded_charge` and `mrx_alt_ded_amount`', '"Does this plan charge the Medicare-defined Part D deductible amount?" and "Enter Deductible Amount".\n\n' +
      table(['Population', 'Code', 'Label', 'Plans', 'Amount filled', 'Amount blank'], rows) +
      '\n\nAmounts (all amounts for code 1; for code 2 the amounts on 5 or more plans when there are more than 12 distinct):\n\n' +
      table(['Population', 'Code', 'mrx_alt_ded_amount', 'Plans'], amtRows) +
      '\n\nDistinct amounts: ' + [...distinct.entries()].map(([k, n]) => `${k.replace('|', ', code ')}: ${n}`).join('; ') + '.');
  }

  // P5 deductible tiers.
  {
    const rows = [];
    const pats = new Map();
    for (const k of imported) {
      const m = mrx.get(k);
      if (m.mrx_alt_ded_charge !== '1' && m.mrx_alt_ded_charge !== '2') continue;
      count(pats, `${pop(k)}|${m.mrx_alt_ded_type_yn || '(blank)'}|${m.mrx_alt_no_ded_tier || '(blank)'}`);
    }
    const TIERPOS = ['Tier 7', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Tier 5', 'Tier 6'];
    for (const [k, n] of sortedEntries(pats)) {
      const [p, yn, s] = k.split('|');
      const named = /^[01]{7}$/.test(s) ? TIERPOS.filter((t, i) => s[i] === '1').join(', ') || 'none' : '';
      rows.push([p, yn, s === '(blank)' ? s : `"${s}"`, named, fmt(n)]);
    }
    add('P5', 'Tiers the deductible skips', 'Plans with a deductible (`mrx_alt_ded_charge` 1 or 2): `mrx_alt_ded_type_yn` ("Does the Deductible apply to all tiers?", 1 Yes, 2 No) ' +
      'and `mrx_alt_no_ded_tier` ("Each tier for which the deductible will NOT apply", position string; the dictionary puts Tier 7 at position 1 and Tiers 1 to 6 at positions 2 to 7).\n\n' +
      table(['Population', 'mrx_alt_ded_type_yn', 'mrx_alt_no_ded_tier', 'Tiers named', 'Plans'], rows));
  }

  const importedTiers = imported.flatMap((k) => (tiers.get(k) || []).map((r) => ({ k, r })));

  // P6 cost-share structure.
  {
    const ST = { 1: 'Coinsurance', 2: 'Copayment', 3: 'Greater of Coinsurance and Copayment', 4: 'Lesser of Coinsurance and Copayment' };
    const dist = new Map();
    const postDist = new Map();
    for (const { k, r } of importedTiers) count(dist, `${pop(k)}|${r.mrx_tier_cstshr_struct_type || '(blank)'}`);
    for (const k of imported) for (const r of posts.get(k) || []) count(postDist, `${pop(k)}|${r.mrx_tier_post_cost_struct || '(blank)'}`);
    // Whether the filled amount columns match the structure, over every location and supply.
    const shape = new Map();
    for (const { r } of importedTiers) {
      let copay = false, coins = false;
      for (const loc of LOCATIONS) for (const part of loc.parts) for (const s of Object.keys(loc.days)) {
        const c = amountCols(part, s);
        if ((r[c.copay] || '') !== '') copay = true;
        if ((r[c.coins] || '') !== '') coins = true;
      }
      count(shape, `${r.mrx_tier_cstshr_struct_type}|${copay ? 'copay' : ''}${copay && coins ? ' and ' : ''}${coins ? 'coinsurance' : ''}${!copay && !coins ? 'neither' : ''}`);
    }
    add('P6', 'Cost-share structure', '`mrx_tier_cstshr_struct_type` on the tier rows of MA-PD and PDP plans:\n\n' +
      table(['Population', 'Code', 'Label', 'Tier rows'], [...dist.entries()].sort().map(([k, n]) => { const [p, c] = k.split('|'); return [p, c, ST[c] || '', fmt(n)]; })) +
      '\n\nWhich amount columns a tier row fills, against its structure (all locations and supplies):\n\n' +
      table(['Structure', 'Columns filled', 'Tier rows'], [...shape.entries()].sort().map(([k, n]) => [...k.split('|'), fmt(n)])) +
      '\n\n`mrx_tier_post_cost_struct` on the post-threshold rows (`pbp_mrx_p.txt`):\n\n' +
      table(['Population', 'Code', 'Label', 'Rows'], [...postDist.entries()].sort().map(([k, n]) => { const [p, c] = k.split('|'); return [p, c, ST[c] || '', fmt(n)]; })));
  }

  // P7 pharmacy locations.
  {
    const locRows = new Map();
    const planLoc = new Map();
    const combos = new Map();
    for (const k of imported) {
      const ts = tiers.get(k) || [];
      if (!ts.length) continue;
      const set = new Set();
      for (const r of ts) for (const loc of LOCATIONS) if (flaggedSupplies(loc, r).length) { count(locRows, `${pop(k)}|${loc.id}`); set.add(loc.id); }
      for (const id of set) count(planLoc, `${pop(k)}|${id}`);
      count(combos, `${pop(k)}|${LOCATIONS.map((l) => l.id).filter((id) => set.has(id)).join(' + ') || '(none)'}`);
    }
    // Plans that mix rstd and rsplt across tiers, or mostd and mosplt.
    let mixRetail = 0, mixMail = 0;
    for (const k of imported) {
      const ts = tiers.get(k) || [];
      const has = (id) => ts.some((r) => flaggedSupplies(LOCATIONS.find((l) => l.id === id), r).length);
      if (has('rstd') && has('rsplt')) mixRetail++;
      if (has('mostd') && has('mosplt')) mixMail++;
    }
    // Plan-level mrx_partd_network_loc positions.
    const NL = ['Long-Term Care', 'Standard Retail', 'Standard/Preferred Retail', 'Out-of-Network', 'Standard Mail-Order', 'Standard/Preferred Mail-Order'];
    const nl = new Map();
    let nlAgree = 0, nlDiff = 0;
    for (const k of imported) {
      const s = mrx.get(k).mrx_partd_network_loc || '';
      NL.forEach((label, i) => { if (s[i] === '1') count(nl, `${pop(k)}|${i + 1} ${label}`); });
      const ts = tiers.get(k) || [];
      if (!ts.length) continue;
      const used = new Set();
      for (const r of ts) for (const loc of LOCATIONS) if (flaggedSupplies(loc, r).length) used.add(loc.id);
      const expect = [used.has('ltc'), used.has('rstd'), used.has('rsplt'), used.has('oon'), used.has('mostd'), used.has('mosplt')].map((b) => (b ? '1' : '0')).join('');
      if (expect === s) nlAgree++; else nlDiff++;
    }
    add('P7', 'Pharmacy locations', 'A location is used on a tier row when its flag column (for example `mrx_tier_locat_rstd`) chooses at least 1 supply. MA-PD and PDP plans with tier rows.\n\n' +
      table(['Population', 'Location', 'Label', 'Tier rows', 'Plans'], LOCATIONS.flatMap((l) => [...IMPORTED].map((p) =>
        [p, `\`${l.id}\``, l.label, fmt(locRows.get(`${p}|${l.id}`) || 0), fmt(planLoc.get(`${p}|${l.id}`) || 0)]))) +
      '\n\nLocation sets per plan:\n\n' + table(['Population', 'Locations used', 'Plans'], [...combos.entries()].sort((x, y) => y[1] - x[1]).map(([k, n]) => [...k.split('|'), fmt(n)])) +
      `\n\nPlans that use \`rstd\` on some tiers and \`rsplt\` on others: ${mixRetail}. The same for \`mostd\` and \`mosplt\`: ${mixMail}.\n\n` +
      '`mrx_partd_network_loc` ("Describe the components of your pharmacy network", DERIVED, position string), positions chosen:\n\n' +
      table(['Population', 'Position', 'Plans'], [...nl.entries()].sort().map(([k, n]) => [...k.split('|'), fmt(n)])) +
      `\n\nPlans with tier rows whose \`mrx_partd_network_loc\` equals the locations their tier rows use (positions LTC, rstd, rsplt, oon, mostd, mosplt): ${fmt(nlAgree)}; different: ${fmt(nlDiff)}.`);
  }

  // P8 days supply.
  {
    const d = new Map();
    for (const { r } of importedTiers) {
      for (const loc of LOCATIONS) {
        for (const s of flaggedSupplies(loc, r)) count(d, `${loc.id}|${s}|${r[loc.days[s]] || '(blank)'}`);
      }
    }
    const rows = [...d.entries()].sort((x, y) => x[0].localeCompare(y[0], 'en', { numeric: true })).map(([k, n]) => [...k.split('|').map((v, i) => (i === 0 ? `\`${v}\`` : v)), fmt(n)]);
    add('P8', 'Days supply', 'The days-supply column of each chosen supply (for example `mrx_tier_rstd_3m_num`), MA-PD and PDP tier rows. A chosen supply with a blank days column would be a file error.\n\n' +
      table(['Location', 'Supply', 'Days', 'Tier rows'], rows));
  }

  // P9 2- and 3-month amounts against the 1-month amount.
  {
    const cmp = new Map();
    const ratio = new Map();
    const plansDiffer = new Set();
    const plansAny3 = new Set();
    for (const { k, r } of importedTiers) {
      for (const loc of LOCATIONS) {
        const sup = flaggedSupplies(loc, r);
        if (!sup.includes('1m')) continue;
        for (const part of loc.parts) {
          for (const kind of ['copay', 'coins']) {
            const one = r[amountCols(part, '1m')[kind]];
            if (one === '' || one === undefined) continue;
            for (const s of ['2m', '3m'].filter((x) => sup.includes(x))) {
              const v = r[amountCols(part, s)[kind]];
              plansAny3.add(k);
              let tag;
              if (v === '' || v === undefined) tag = 'blank';
              else if (Number(v) === Number(one)) tag = 'equal';
              else { tag = 'different'; plansDiffer.add(k); }
              count(cmp, `${kind}|${s}|${tag}`);
              if (kind === 'copay' && tag === 'different' && Number(one) > 0) count(ratio, `${part}|${s}|${(Number(v) / Number(one)).toFixed(2)}`);
            }
          }
        }
      }
    }
    const rRows = sortedEntries(ratio).filter(([, n]) => n >= 50).map(([k, n]) => [...k.split('|').map((v, i) => (i === 0 ? `\`${v}\`` : v)), fmt(n)]);
    add('P9', '2- and 3-month amounts against the 1-month amount', 'For each tier row, location part (`rstd`, `rsstd`, `rspfd`, `mostd`, `mosstd`, `mospfd`) and kind, where the 1-month supply is chosen and its amount filled, ' +
      'the 2- or 3-month amount of a chosen 2- or 3-month supply. MA-PD and PDP tier rows.\n\n' +
      table(['Kind', 'Supply', 'Against 1-month', 'Cells'], [...cmp.entries()].sort().map(([k, n]) => [...k.split('|'), fmt(n)])) +
      `\n\nPlans with at least 1 chosen 2- or 3-month supply: ${fmt(plansAny3.size)}; of those, plans with at least 1 amount different from its 1-month amount: ${fmt(plansDiffer.size)}.\n\n` +
      'Copay ratios (2- or 3-month amount divided by a non-zero 1-month amount) on 50 or more cells:\n\n' +
      table(['Part', 'Supply', 'Ratio', 'Cells'], rRows));
  }

  // P10 tier labels.
  const labelCount = new Map();
  const labelById = new Map();
  {
    for (const { k, r } of importedTiers) {
      count(labelCount, r.mrx_tier_label_list);
      count(labelById, `${r.mrx_tier_label_list}|${r.mrx_tier_id}`);
      void k;
    }
    const rows = sortedEntries(labelCount).map(([l, n]) => {
      const ids = [...labelById.entries()].filter(([x]) => x.split('|')[0] === l).sort().map(([x, c]) => `${x.split('|')[1]}: ${c}`).join(', ');
      return [l, n, ids];
    });
    fs.writeFileSync(path.join(OUT_DIR, 'tier-labels.csv'), csv(['mrx_tier_label_list', 'tier_rows', 'mrx_tier_id_counts'], rows));
    const models = new Map();
    for (const k of imported) {
      const m = mrx.get(k);
      if (m.mrx_form_model_type || m.mrx_form_model_desc) count(models, `${m.mrx_form_model_type}|${m.mrx_form_model_desc}`);
    }
    fs.writeFileSync(path.join(OUT_DIR, 'tier-label-models.csv'), csv(['mrx_form_model_type', 'mrx_form_model_desc', 'plans'],
      sortedEntries(models).map(([k, n]) => [...k.split('|'), n])));
    // Does each tier row's label appear in its plan's model description, in mrx_tier_id order?
    let inOrder = 0, notInOrder = 0;
    for (const k of imported) {
      const ts = (tiers.get(k) || []).slice().sort((x, y) => Number(x.mrx_tier_id) - Number(y.mrx_tier_id));
      if (!ts.length) continue;
      const desc = mrx.get(k).mrx_form_model_desc;
      if (ts.map((r) => r.mrx_tier_label_list).join(', ') === desc) inOrder++; else notInOrder++;
    }
    add('P10', 'Tier labels', `\`mrx_tier_label_list\` ("Tier Label Description", CHAR 250): the dictionary gives no code list for it. ${labelCount.size} distinct values on ` +
      `${fmt(importedTiers.length)} MA-PD and PDP tier rows; all of them, with the \`mrx_tier_id\` each appears under, are in \`tier-labels.csv\`. ` +
      `\`mrx_form_model_type\` ("Formulary Tier Label Model", DERIVED) and \`mrx_form_model_desc\` per plan: ${models.size} distinct pairs, in \`tier-label-models.csv\`.\n\n` +
      `Plans whose tier labels, in \`mrx_tier_id\` order and joined with ", ", equal \`mrx_form_model_desc\`: ${fmt(inOrder)}; not equal: ${fmt(notInOrder)}.\n\n` +
      table(['mrx_tier_label_list', 'Tier rows', 'mrx_tier_id: rows'], rows.slice(0, 40).map(([l, n, ids]) => [`"${l}"`, fmt(n), ids])) +
      (rows.length > 40 ? `\n\nThe ${rows.length - 40} other labels are in \`tier-labels.csv\`.` : ''));
  }

  // P11 tier id, type, includes, drug type, key uniqueness.
  {
    const dist = (col) => {
      const m = new Map();
      for (const { r } of importedTiers) count(m, r[col] || '(blank)');
      return [...m.entries()].sort().map(([v, n]) => `\`${col}\` "${v}": ${fmt(n)}`).join('; ');
    };
    let dupId = 0, dupLabel = 0, gaps = 0, postMismatch = 0;
    for (const k of imported) {
      const ts = tiers.get(k) || [];
      if (!ts.length) continue;
      const ids = ts.map((r) => r.mrx_tier_id);
      if (new Set(ids).size !== ids.length) dupId++;
      if (new Set(ts.map((r) => r.mrx_tier_label_list)).size !== ts.length) dupLabel++;
      const sorted = ids.map(Number).sort((x, y) => x - y);
      if (sorted.some((v, i) => v !== i + 1)) gaps++;
      const ps = (posts.get(k) || []).map((r) => `${r.mrx_tier_post_id}|${r.mrx_tier_post_label_list}`).sort().join(';');
      if (ps !== ts.map((r) => `${r.mrx_tier_id}|${r.mrx_tier_label_list}`).sort().join(';')) postMismatch++;
    }
    const byInc = new Map();
    for (const { r } of importedTiers) count(byInc, `${r.mrx_tier_label_list}|${r.mrx_tier_includes}`);
    add('P11', 'Tier identity and content', [dist('mrx_tier_id'), dist('mrx_tier_type_id'), dist('mrx_tier_includes'), dist('mrx_tier_drug_type')].join('.\n\n') + '.\n\n' +
      `Plans with a repeated \`mrx_tier_id\`: ${dupId}; a repeated \`mrx_tier_label_list\`: ${dupLabel}; tier ids that are not 1 to n: ${gaps}. ` +
      `Plans whose post-threshold rows do not carry the same (id, label) pairs as their tier rows: ${postMismatch}.\n\n` +
      '`mrx_tier_includes` (1 Part D Drugs Only, 2 Excluded Drugs Only, 3 Both Part D and Excluded Drugs) by label:\n\n' +
      table(['mrx_tier_label_list', 'mrx_tier_includes', 'Tier rows'], [...byInc.entries()].sort().map(([k, n]) => { const [l, i] = k.split('|'); return [`"${l}"`, i, fmt(n)]; })));
  }

  // P12 PDPs by sponsor.
  {
    const s = new Map();
    for (const a of A) if (a.pbp_a_plan_type === '29') count(s, `${a.pbp_a_org_marketing_name.trim()}|${a.pbp_a_org_name.trim()}`);
    const rows = sortedEntries(s).map(([k, n]) => [...k.split('|'), n]);
    fs.writeFileSync(path.join(OUT_DIR, 'pdp-sponsors.csv'), csv(['pbp_a_org_marketing_name', 'pbp_a_org_name', 'pdp_plans'], rows));
    const contracts = new Set(A.filter((a) => a.pbp_a_plan_type === '29').map((a) => a.pbp_a_hnumber));
    const prefix = new Map();
    for (const a of A) count(prefix, `${a.pbp_a_plan_type}|${a.pbp_a_hnumber[0]}`);
    add('P12', 'PDPs by sponsor', `${fmt(rows.reduce((t, r) => t + r[2], 0))} plans of type 29 under ${rows.length} marketing names and ${contracts.size} contracts; ` +
      'all rows in `pdp-sponsors.csv`. The 15 largest:\n\n' + table(['pbp_a_org_marketing_name', 'pbp_a_org_name', 'PDPs'], rows.slice(0, 15).map(([m, o, n]) => [m, o, fmt(n)])) +
      '\n\nFirst letter of `pbp_a_hnumber` by plan type: ' + [...prefix.entries()].sort().map(([k, n]) => `${k.replace('|', ' ')} ${fmt(n)}`).join('; ') + '.');
  }

  // P13 phases: initial coverage and after the threshold.
  {
    const lines = [];
    for (const col of ['mrx_alt_pre_icl_cost_share', 'mrx_ae_cstshr_apply', 'mrx_alt_cstshr_post_oopt', 'mrx_ae_ooptcs_apply', 'mrx_alt_ded_tier_cstshr_yn',
      'mrx_alt_gen_cstshr_struct', 'mrx_alt_excl_drugs_yn', 'mrx_alt_red_cost_sharing', 'mrx_ae_oon_cstshr_struct', 'mrx_alt_oon_cstshr_struct', 'mrx_first_fill']) {
      const m = new Map();
      for (const k of imported) count(m, `${pop(k)}|${mrx.get(k).mrx_benefit_type}|${mrx.get(k)[col] || '(blank)'}`);
      lines.push(`\`${col}\`:\n\n` + table(['Population', 'mrx_benefit_type', 'Value', 'Plans'], [...m.entries()].sort().map(([k, n]) => [...k.split('|'), fmt(n)])));
    }
    // Non-zero cost shares after the threshold.
    let postRows = 0, postNonZero = 0;
    const nz = new Map();
    for (const k of imported) for (const r of posts.get(k) || []) {
      postRows++;
      const c = r.mrx_tier_post_copay_amt, p = r.mrx_tier_post_coins_pct;
      if ((c !== '' && Number(c) !== 0) || (p !== '' && Number(p) !== 0)) { postNonZero++; count(nz, `${pop(k)}|${r.mrx_tier_post_includes}|${c}|${p}`); }
    }
    // Each post-threshold row against its plan's answer for excluded drugs and the tier's own initial coverage amount.
    const tierOf = new Map(importedTiers.map(({ k, r }) => [`${k}|${r.mrx_tier_id}`, r]));
    const xt = new Map();
    const nzPlans = new Set();
    let equalIcp = 0;
    for (const k of imported) for (const r of posts.get(k) || []) {
      const c = r.mrx_tier_post_copay_amt, p = r.mrx_tier_post_coins_pct;
      const isNz = (c !== '' && Number(c) !== 0) || (p !== '' && Number(p) !== 0);
      count(xt, `${r.mrx_tier_post_includes}|${mrx.get(k).mrx_alt_cstshr_post_oopt || '(blank)'}|${isNz ? 'non-zero' : 'zero or blank'}`);
      if (!isNz) continue;
      nzPlans.add(k);
      const t = tierOf.get(`${k}|${r.mrx_tier_post_id}`);
      const v = c !== '' ? c : p;
      const icp = ['rstd', 'rsstd', 'rspfd'].flatMap((part) => [t[`mrx_tier_${part}_copay_1m`], t[`mrx_tier_${part}_coins_1m`]]).filter((x) => x !== '');
      if (icp.some((x) => Number(x) === Number(v))) equalIcp++;
    }
    lines.push(`Post-threshold rows of MA-PD and PDP plans: ${fmt(postRows)}; with a non-zero copay or coinsurance: ${fmt(postNonZero)}, on ${fmt(nzPlans.size)} plans. ` +
      `Non-zero rows whose amount equals a 1-month retail amount (\`rstd\`, \`rsstd\` or \`rspfd\`) of the same tier's initial coverage row: ${fmt(equalIcp)}.` +
      (nz.size ? '\n\n' + table(['Population', 'mrx_tier_post_includes', 'mrx_tier_post_copay_amt', 'mrx_tier_post_coins_pct', 'Rows'], sortedEntries(nz).map(([k, n]) => [...k.split('|'), fmt(n)])) : '') +
      '\n\nPost-threshold rows by `mrx_tier_post_includes`, the plan\'s `mrx_alt_cstshr_post_oopt` ("How does this plan apply cost sharing for excluded drugs beyond the ' +
      'Medicare Part D Annual Out-of-Pocket cost threshold?", 1 No cost sharing, 2 Cost-Share Tiers (Different cost sharing than the ICP), 3 Cost-Share Tiers (Same cost sharing as the ICP)) and the amount:\n\n' +
      table(['mrx_tier_post_includes', 'mrx_alt_cstshr_post_oopt', 'Amount', 'Rows'], [...xt.entries()].sort().map(([k, n]) => [...k.split('|'), fmt(n)])));
    const odd = [
      ['`mrx_alt_ded_tier_cstshr_yn` "2" (cost sharing before the deductible differs from initial coverage)', imported.filter((k) => mrx.get(k).mrx_alt_ded_tier_cstshr_yn === '2')],
      ['`mrx_alt_gen_cstshr_struct` filled', imported.filter((k) => mrx.get(k).mrx_alt_gen_cstshr_struct !== '')],
      ['`mrx_alt_pre_icl_cost_share` "2" (Medicare-defined Part D coinsurance in initial coverage)', imported.filter((k) => mrx.get(k).mrx_alt_pre_icl_cost_share === '2')],
      ['`mrx_ae_cstshr_apply` "1" (Medicare-defined Part D coinsurance in initial coverage)', imported.filter((k) => mrx.get(k).mrx_ae_cstshr_apply === '1')],
    ];
    lines.push('Plans with rare answers:\n\n' + table(['Answer', 'Plans'], odd.map(([t, ks]) => [t, ks.map((k) => {
      const m = mrx.get(k);
      return k + (m.mrx_alt_gen_cstshr_struct ? ` (struct "${m.mrx_alt_gen_cstshr_struct}", coins "${m.mrx_alt_gen_coins_pct}", copay "${m.mrx_alt_gen_copay_amt}")` : '');
    }).join(', ')])));
    add('P13', 'Initial coverage, deductible-stage and post-threshold answers', lines.join('\n\n'));
  }

  // P14 other column groups: insulin (IRA), daily copays, BALANCE, averages, Defined Standard columns.
  {
    const filled = (rows, re) => {
      let r = 0;
      const cols = new Set();
      for (const row of rows) {
        const hit = Object.keys(row).filter((c) => re.test(c) && row[c] !== '');
        if (hit.length) { r++; hit.forEach((c) => cols.add(c)); }
      }
      return `${fmt(r)} rows (${cols.size} columns)`;
    };
    const tierRows = importedTiers.map((x) => x.r);
    const mrxRows = imported.map((k) => mrx.get(k));
    const iraDiff = tierRows.filter((r) => LOCATIONS.some((loc) => loc.parts.some((part) => Object.keys(loc.days).some((s) => {
      if (part === 'oonp' && s === 'other') return false;
      const base = amountCols(part, s);
      const ira = { copay: base.copay.replace('mrx_tier_', 'mrx_tier_ira_').replace('mospfd', 'mopfd').replace('_rsstd_', '_rstd_').replace('_mosstd_', '_mostd_'),
        coins: base.coins.replace('mrx_tier_', 'mrx_tier_ira_').replace('mospfd', 'mopfd').replace('_rsstd_', '_rstd_').replace('_mosstd_', '_mostd_') };
      return ['copay', 'coins'].some((kind) => (r[ira[kind]] || '') !== '' && (r[ira[kind]] !== (r[base[kind]] || '')));
    })))).length;
    const iraTier = new Map();
    for (const k of imported) count(iraTier, `${pop(k)}|${mrx.get(k).mrx_alt_ira_covg_tier || '(blank)'}`);
    const demo = new Map();
    for (const k of imported) count(demo, `${pop(k)}|part_d_model_demo "${mrx.get(k).part_d_model_demo}", part_d_enhncd_cvrg_demo "${mrx.get(k).part_d_enhncd_cvrg_demo}"`);
    add('P14', 'Other column groups', table(['Group', 'Columns', 'Filled'], [
      ['Insulin (IRA) cost sharing per tier', '`mrx_tier_ira_*`', filled(tierRows, /^mrx_tier_ira_/)],
      ['Insulin (IRA) cost sharing, plan level', '`mrx_gen_ira_*`', filled(mrxRows, /^mrx_gen_ira_/)],
      ['Daily copays', '`mrx_tier_*_copay_daily`', filled(tierRows, /_copay_daily$/)],
      ['Average expected coinsurance dollars', '`mrx_tier_*_coins_avg_1m`', filled(tierRows, /_coins_avg_1m$/)],
      ['BALANCE model, tier', '`mrx_tier_bal_*`', filled(tierRows, /^mrx_tier_bal_/)],
      ['BALANCE model, plan', '`mrx_bal*`, `mrx_balance_*`', filled(mrxRows, /^mrx_bal/)],
      ['Generic and Defined Standard locations and days', '`mrx_gen_loc_*`, `mrx_gen_*_1m` and the like', filled(mrxRows, /^mrx_gen_(loc|rstd|oon|mostd|ltc)/)],
    ]) + `\n\nTier rows with at least 1 insulin cell that differs from the tier's own cell for the same location, supply and kind: ${fmt(iraDiff)}.\n\n` +
      '`mrx_alt_ira_covg_tier` ("Tiers have insulin drugs", position string, Tier 7 first):\n\n' +
      table(['Population', 'Value', 'Plans'], sortedEntries(iraTier).slice(0, 15).map(([k, n]) => [...k.split('|'), fmt(n)])) +
      (iraTier.size > 15 ? `\n\n${iraTier.size - 15} further patterns.` : '') + '\n\nDemonstration flags:\n\n' +
      table(['Population', 'Flags', 'Plans'], sortedEntries(demo).map(([k, n]) => [...k.split('|'), fmt(n)])));
  }

  // P15 the out-of-pocket threshold: does any column hold it?
  {
    const rows = [];
    for (const [name, file] of [['pbp_mrx.txt', mrxFile], ['pbp_mrx_tier.txt', tierFile], ['pbp_mrx_p.txt', postFile]]) {
      for (const col of file.header) {
        if (/^(pbp_a_|segment_id|orgtype|bid_id|version)/.test(col)) continue;
        let max = null, n = 0, big = 0;
        for (const r of file.rows) {
          const v = r[col];
          if (!/^\d+(\.\d+)?$/.test(v || '')) continue;
          n++;
          const x = Number(v);
          if (max === null || x > max) max = x;
          if (x >= 1000) big++;
        }
        if (n && max >= 1000) rows.push([name, `\`${col}\``, fmt(n), String(max), fmt(big)]);
      }
    }
    const names = [mrxFile, tierFile, postFile].flatMap((f) => f.header).filter((c) => /oop|threshold|catast|tdc|troop/.test(c));
    add('P15', 'Columns that could hold the out-of-pocket threshold', 'Every numeric column of the 3 files (all rows) whose largest value is 1,000 or more:\n\n' +
      table(['File', 'Column', 'Numeric cells', 'Largest', 'Cells of 1,000 or more'], rows) +
      `\n\nColumn names containing "oop", "threshold", "catast", "tdc" or "troop": ${names.map((c) => `\`${c}\``).join(', ') || 'none'}.`);
  }

  // P16 PDP service areas and type 30.
  {
    const pdp = A.filter((a) => a.pbp_a_plan_type === '29').map(keyOf);
    const withRegion = pdp.filter((k) => regions.has(k));
    const rt = new Map();
    const perPlan = new Map();
    for (const k of withRegion) {
      for (const r of regions.get(k)) count(rt, `region_type "${r.region_type}"`);
      count(perPlan, regions.get(k).length);
    }
    const yrs = new Map();
    for (const k of withRegion) for (const r of regions.get(k)) count(yrs, r.contract_year);
    const areaKeys = new Set(areaPdp.map(keyOf));
    const t30 = A.filter((a) => a.pbp_a_plan_type === '30').map((a) => [keyOf(a), a.pbp_a_plan_name.trim(), a.pbp_a_org_marketing_name.trim(),
      mrx.has(keyOf(a)) ? 'yes' : 'no', regions.has(keyOf(a)) ? regions.get(keyOf(a)).length : 0, areaPdp.filter((r) => keyOf(r) === keyOf(a)).length]);
    const partd = new Map();
    for (const a of A) if (MVP_MA.has(a.pbp_a_plan_type)) count(partd, `${a.pbp_a_contract_partd_flag || '(blank)'}|${mrx.get(keyOf(a)) ? mrx.get(keyOf(a)).mrx_drug_ben_yn || '(blank)' : '(no row)'}`);
    // Section A contact columns of the PDPs, by employer flag.
    const contact = new Map();
    for (const a of A) {
      if (a.pbp_a_plan_type !== '29') continue;
      for (const c of ['pbp_a_curmbr_phone', 'pbp_a_org_website', 'pbp_a_phys_web_addr', 'pbp_a_pharmacy_website', 'pbp_a_formulary_web_addr']) {
        count(contact, `${a.pbp_a_eghp_yn}|${c}|${(a[c] || '').trim() ? 'filled' : 'blank'}`);
      }
    }
    add('P16', 'PDP service areas, type 30, and the Section A Part D flag', `PDPs (type 29): ${fmt(pdp.length)}; with \`PlanRegionArea.txt\` rows: ${fmt(withRegion.length)}; with \`PlanArea.txt\` rows: ${areaKeys.size === 0 ? 0 : [...areaKeys].filter((k) => typeOf.get(k) === '29').length}.\n\n` +
      'Regions per PDP: ' + [...perPlan.entries()].sort((x, y) => x[0] - y[0]).map(([n, c]) => `${n} region${n === 1 ? '' : 's'}: ${fmt(c)}`).join('; ') + '. ' +
      'Region types on PDP rows: ' + [...rt.entries()].map(([k, n]) => `${k} ${fmt(n)}`).join('; ') + '. `contract_year` on PDP rows: ' + [...yrs.entries()].map(([k, n]) => `"${k}" ${fmt(n)}`).join('; ') + '.\n\n' +
      'Type 30 plans:\n\n' + table(['Plan', 'pbp_a_plan_name', 'pbp_a_org_marketing_name', 'pbp_mrx row', 'PlanRegionArea rows', 'PlanArea rows'], t30) +
      '\n\nMA plan types 01, 02, 04, 31: `pbp_a_contract_partd_flag` against `mrx_drug_ben_yn`:\n\n' +
      table(['pbp_a_contract_partd_flag', 'mrx_drug_ben_yn', 'Plans'], [...partd.entries()].sort().map(([k, n]) => [...k.split('|'), fmt(n)])) +
      '\n\nSection A contact and web columns of the PDPs, by `pbp_a_eghp_yn` (1 employer group plan, 2 individual):\n\n' +
      table(['pbp_a_eghp_yn', 'Column', 'Filled or blank', 'PDPs'], [...contact.entries()].sort().map(([k, n]) => [...k.split('|').map((v, i) => (i === 1 ? `\`${v}\`` : v)), fmt(n)])));
  }

  // P17 candidate plans for the fixtures.
  {
    const isSplit = (k) => (tiers.get(k) || []).some((r) => flaggedSupplies(LOCATIONS[1], r).length);
    const skips = (k) => ['1', '2'].includes(mrx.get(k).mrx_alt_ded_charge) && mrx.get(k).mrx_alt_ded_type_yn === '2';
    const c = new Map();
    for (const k of imported) count(c, `${pop(k)}|${isSplit(k) ? 'split retail' : 'retail not split'}|${skips(k) ? 'deductible skips tiers' : 'no deductible or all tiers'}`);
    const golden = ['H2406-013-000', 'H1036-068-000', 'H1609-028-000', 'H5533-019-000', 'H5425-140-000'].map((k) => {
      const m = mrx.get(k);
      return [k, m ? m.mrx_drug_ben_yn : '(no row)', m ? m.mrx_benefit_type : '', m ? m.mrx_alt_ded_charge : '', m ? m.mrx_alt_ded_amount : '',
        m ? m.mrx_alt_ded_type_yn : '', (tiers.get(k) || []).length, isSplit(k) ? 'yes' : 'no', m ? m.mrx_partd_network_loc : ''];
    });
    add('P17', 'Plans for the fixtures', table(['Population', 'Retail', 'Deductible', 'Plans'], [...c.entries()].sort().map(([k, n]) => [...k.split('|'), fmt(n)])) +
      '\n\nThe 5 golden plans of the medical importer:\n\n' +
      table(['Plan', 'mrx_drug_ben_yn', 'mrx_benefit_type', 'mrx_alt_ded_charge', 'mrx_alt_ded_amount', 'mrx_alt_ded_type_yn', 'Tier rows', 'Split retail', 'mrx_partd_network_loc'], golden));
  }

  // P18 benefit counts: every chosen supply as its own benefit (the rule of
  // docs/specs/pbp-part-d-mapping.md section 6), against merging the supplies of 1
  // location part that have the same copay and coinsurance (the alternative it weighs).
  {
    const every = new Map();
    const collapsed = new Map();
    const perFixture = new Map();
    let blankCells = 0;
    const median = (a) => { const s = a.slice().sort((x, y) => x - y); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };
    for (const k of imported) {
      const ts = tiers.get(k) || [];
      if (!ts.length) continue;
      let e = 0, c = 0;
      for (const r of ts) {
        for (const loc of LOCATIONS) {
          const sup = flaggedSupplies(loc, r);
          for (const part of loc.parts) {
            const keys = new Set();
            for (const s of sup) {
              const cols = amountCols(part, s);
              const cp = r[cols.copay] || '', co = r[cols.coins] || '';
              if (cp === '' && co === '') blankCells++;
              keys.add(`${cp === '' ? '' : Number(cp)}|${co === '' ? '' : Number(co)}`);
              e++;
            }
            c += keys.size;
          }
        }
      }
      // Plus 1 catastrophic-stage benefit per post-threshold row.
      const post = (posts.get(k) || []).length;
      if (!every.has(pop(k))) { every.set(pop(k), []); collapsed.set(pop(k), []); }
      every.get(pop(k)).push(e + post);
      collapsed.get(pop(k)).push(c + post);
      if (FIXTURE_PLANS.includes(k)) perFixture.set(k, [e, c, post]);
    }
    const sum = (a) => a.reduce((s, x) => s + x, 0);
    const rows = [...every.keys()].sort().map((p) => [p, fmt(every.get(p).length), fmt(sum(every.get(p))), String(median(every.get(p))), String(Math.max(...every.get(p))),
      fmt(sum(collapsed.get(p))), String(median(collapsed.get(p))), String(Math.max(...collapsed.get(p)))]);
    add('P18', 'Benefits per plan', 'MA-PD and PDP plans with tier rows. "Every supply": 1 initial coverage benefit per tier row, location part (`rstd`, `rsstd`, `rspfd`, `mostd`, `mosstd`, `mospfd`, `oonp`, `ltcp`) and chosen supply. ' +
      '"Same cost share merged": the supplies of 1 tier row and location part whose copay and coinsurance cells are equal give 1 benefit. Both add 1 catastrophic-stage benefit per `pbp_mrx_p.txt` row.\n\n' +
      table(['Population', 'Plans', 'Every supply: benefits', 'median', 'largest', 'Same cost share merged: benefits', 'median', 'largest'], rows) +
      `\n\nChosen supplies whose copay and coinsurance cells are both blank: ${fmt(blankCells)}.\n\nThe fixture plans:\n\n` +
      table(['Plan', 'Initial coverage, every supply', 'Initial coverage, merged', 'Catastrophic', 'Every supply: total', 'Merged: total'],
        FIXTURE_PLANS.map((k) => { const [e, c, p] = perFixture.get(k) || [0, 0, 0]; return [k, String(e), String(c), String(p), String(e + p), String(c + p)]; })));
  }

  // P19 the error conditions of docs/specs/pbp-part-d-mapping.md section 12, counted.
  {
    const lines = [];
    const tally = (label, n, detail) => lines.push([label, fmt(n), detail || '']);
    const typeKeys = (types) => A.filter((a) => types.includes(a.pbp_a_plan_type)).map(keyOf);
    tally('No `pbp_mrx.txt` row for a plan of type 01, 02, 04, 31 or 29', typeKeys(['01', '02', '04', '31', '29']).filter((k) => !mrx.has(k)).length);
    tally('`mrx_drug_ben_yn` not "1" or "2"', [...mrx.values()].filter((m) => !['1', '2'].includes(m.mrx_drug_ben_yn)).length);
    const pdps = new Set(typeKeys(['29']));
    const dRows = (await readAll('pbp_Section_D.txt', (r) => pdps.has(keyOf(r)))).rows.length;
    const bRows = (await readAll('pbp_b1a_inpat_hosp.txt', (r) => pdps.has(keyOf(r)))).rows.length;
    const cRows = (await readAll('pbp_Section_C.txt', (r) => pdps.has(keyOf(r)))).rows.length;
    tally('A PDP with a `pbp_Section_D.txt`, `pbp_Section_C.txt` or `pbp_b1a_inpat_hosp.txt` row', dRows + cRows + bRows, `Section D ${dRows}, Section C ${cRows}, pbp_b1a ${bRows}`);
    tally('A PDP with `PlanArea.txt` rows', areaPdp.filter((r) => pdps.has(keyOf(r))).length);
    tally('`mrx_benefit_type` 2, 3 or 4 with no tier rows, or 1 or blank with tier rows', imported.filter((k) => {
      const bt = mrx.get(k).mrx_benefit_type; const has = tiers.has(k);
      return (['2', '3', '4'].includes(bt) && !has) || (['1', ''].includes(bt) && has);
    }).length);
    // Position strings: length and characters.
    const LEN = { mrx_tier_locat_rstd: 3, mrx_tier_locat_rsplt: 3, mrx_tier_locat_oon: 2, mrx_tier_locat_mostd: 3, mrx_tier_locat_mosplt: 3, mrx_tier_locat_ltc: 1 };
    let badFlag = 0;
    for (const { r } of importedTiers) for (const [c, n] of Object.entries(LEN)) if (r[c] !== '' && !new RegExp(`^[01]{${n}}$`).test(r[c])) badFlag++;
    let badPlanFlag = 0;
    for (const k of imported) {
      const m = mrx.get(k);
      for (const [c, n] of [['mrx_partd_network_loc', 6], ['mrx_alt_no_ded_tier', 7], ['mrx_alt_ira_covg_tier', 7]]) if (m[c] !== '' && !new RegExp(`^[01]{${n}}$`).test(m[c])) badPlanFlag++;
    }
    tally('A location flag, `mrx_partd_network_loc`, `mrx_alt_no_ded_tier` or `mrx_alt_ira_covg_tier` that is not a string of 0 and 1 of the dictionary length', badFlag + badPlanFlag);
    // A skipped tier the plan does not have.
    let skipMissing = 0;
    for (const k of imported) {
      const m = mrx.get(k);
      if (m.mrx_alt_ded_type_yn !== '2') continue;
      const n = (tiers.get(k) || []).length;
      const s = m.mrx_alt_no_ded_tier;
      if (s[0] === '1') skipMissing++;
      for (let t = 1; t <= 6; t++) if (s[t] === '1' && t > n) { skipMissing++; break; }
    }
    tally('`mrx_alt_no_ded_tier` names a tier the plan does not have (Tier 7, or a tier above `mrx_formulary_tiers_num`)', skipMissing);
    tally('`mrx_alt_ded_type_yn` "2" with a blank `mrx_alt_no_ded_tier`', imported.filter((k) => mrx.get(k).mrx_alt_ded_type_yn === '2' && mrx.get(k).mrx_alt_no_ded_tier === '').length);
    // Readable numbers in every amount, percent and days column of the tier and post rows.
    let badAmount = 0, badPct = 0, badDays = 0;
    const amountRe = /^\d+(\.\d{1,2})?$/;
    for (const { r } of importedTiers) {
      for (const c of Object.keys(r)) {
        const v = r[c];
        if (v === '') continue;
        if (/_copay_(1m|2m|3m|othnum|daily|day)$|_coins_avg_1m$/.test(c) && !amountRe.test(v)) badAmount++;
        else if (/_coins_(1m|2m|3m|othnum)$/.test(c) && !(/^\d{1,3}$/.test(v) && Number(v) <= 100)) badPct++;
        else if (/_num$|_numn$|_ltcp_1m$/.test(c) && !/^\d{1,3}$/.test(v)) badDays++;
      }
    }
    for (const k of imported) for (const r of posts.get(k) || []) {
      if (r.mrx_tier_post_copay_amt !== '' && !amountRe.test(r.mrx_tier_post_copay_amt)) badAmount++;
      if (r.mrx_tier_post_coins_pct !== '' && !(/^\d{1,3}$/.test(r.mrx_tier_post_coins_pct) && Number(r.mrx_tier_post_coins_pct) <= 100)) badPct++;
    }
    for (const k of imported) if (mrx.get(k).mrx_alt_ded_amount !== '' && !amountRe.test(mrx.get(k).mrx_alt_ded_amount)) badAmount++;
    tally('An unreadable amount, percent or day count in the columns the mapping reads', badAmount + badPct + badDays, `amounts ${badAmount}, percents ${badPct}, days ${badDays}`);
    // Codes outside the dictionary, for every single-code column of the 3 files (position strings excepted).
    const dict = readDictionary(find('PBP_Benefits_2027_dictionary.xlsx'));
    const outside = new Map();
    for (const [file, rowsOf] of [['pbp_mrx', imported.map((k) => mrx.get(k))], ['pbp_mrx_tier', importedTiers.map((x) => x.r)],
      ['pbp_mrx_p', imported.flatMap((k) => posts.get(k) || [])]]) {
      const codes = new Map();
      for (const d of dict.filter((x) => x.FILE.toLowerCase() === file && x.CODES !== '' && !/^1 in /.test(x.CODES))) {
        const n = d.NAME.toLowerCase();
        if (/^(pbp_a_|orgtype$)/.test(n)) continue;
        if (!codes.has(n)) codes.set(n, new Set());
        codes.get(n).add(d.CODES);
      }
      for (const r of rowsOf) for (const [n, set] of codes) if (r[n] !== '' && !set.has(r[n])) count(outside, `${file}.txt|${n}|${r[n]}|${[...set].join(', ')}`);
    }
    tally('A code outside the dictionary in a single-code column of the 3 files', [...outside.values()].reduce((s, n) => s + n, 0),
      [...outside.entries()].map(([k, n]) => { const [f, c, v, allowed] = k.split('|'); return `${f} \`${c}\` "${v}" on ${fmt(n)} rows (dictionary: ${allowed})`; }).join('; '));
    add('P19', 'The error conditions, counted', 'MA-PD and PDP plans unless the row says otherwise.\n\n' + table(['Condition', 'Count', 'Detail'], lines));
  }

  const head = `# Profile: CMS PBP Part D files, contract year ${opt.year}\n\n` +
    `Written by \`node docs/specs/pbp-part-d/profile/profile-mrx.js\` from \`data/pbp/${opt.year}/\` (release in \`download.json\`: ` +
    `"${JSON.parse(fs.readFileSync(path.join(DIR, 'download.json'), 'utf8')).release_label}", downloaded ` +
    `${JSON.parse(fs.readFileSync(path.join(DIR, 'download.json'), 'utf8')).downloaded}). Do not edit by hand; re-run the script. ` +
    `Files: \`pbp_mrx.txt\` ${fmt(mrxFile.rows.length)} rows, ${mrxFile.header.length} columns; \`pbp_mrx_tier.txt\` ${fmt(tierFile.rows.length)} rows, ` +
    `${tierFile.header.length} columns; \`pbp_mrx_p.txt\` ${fmt(postFile.rows.length)} rows, ${postFile.header.length} columns. Read with the importer's reader ` +
    '(`streamTsv` in `scripts/from-pbp.js`: CRLF, Windows-1252, field counts checked). Code lists: `code-lists.md`, from the same run. ' +
    'The fixture plans\' cells and Part D benefit listings are in `plans/`, written with `--plan` and `--benefits`.\n';
  fs.writeFileSync(path.join(OUT_DIR, 'profile.md'), `${head}\n${sections.join('\n')}`);

  // Code lists of the 3 files, verbatim from the dictionary.
  const dict = readDictionary(find('PBP_Benefits_2027_dictionary.xlsx'));
  const parts = [];
  for (const file of ['pbp_mrx', 'pbp_mrx_tier', 'pbp_mrx_p']) {
    const rows = dict.filter((d) => d.FILE.toLowerCase() === file);
    const header = { pbp_mrx: mrxFile, pbp_mrx_tier: tierFile, pbp_mrx_p: postFile }[file].header;
    const names = [...new Set(rows.map((d) => d.NAME.toLowerCase()))];
    const missing = header.filter((h) => !names.includes(h));
    const extra = names.filter((n) => !header.includes(n));
    const lines = [];
    for (const n of names) {
      if (/^(pbp_a_|orgtype$|segment_id$|bid_id$|version$)/.test(n)) continue;
      const own = rows.filter((d) => d.NAME.toLowerCase() === n);
      const first = own.find((d) => d.TYPE) || own[0];
      const codes = own.filter((d) => d.CODES !== '');
      lines.push([`\`${n}\``, `${first.TYPE} ${first.LENGTH}`, first.FIELD_TITLE || first.TITLE,
        codes.map((d) => `${d.CODES} = ${d.CODE_VALUES.length > 90 ? d.CODE_VALUES.slice(0, 87) + '...' : d.CODE_VALUES}`).join('; ')]);
    }
    parts.push(`## ${file}.txt\n\n${names.length} names in the dictionary, ${header.length} columns in the file; in the file and not the dictionary: ` +
      `${missing.length ? missing.join(', ') : 'none'}; in the dictionary and not the file: ${extra.length ? extra.join(', ') : 'none'}. ` +
      'The key columns and the Section A columns every file repeats are left out.\n\n' +
      table(['Column', 'Type', 'Field title', 'Codes (CODES = CODE_VALUES; long values cut at 87 characters)'], lines.map((l) => l.map((x) => String(x).replace(/\|/g, '/')))));
  }
  fs.writeFileSync(path.join(OUT_DIR, 'code-lists.md'), `# Code lists: pbp_mrx, pbp_mrx_tier, pbp_mrx_p, contract year ${opt.year}\n\n` +
    `Written by \`node docs/specs/pbp-part-d/profile/profile-mrx.js\` from \`data/pbp/${opt.year}/PBP_Benefits_${opt.year}_dictionary.xlsx\` ` +
    '(sheet `PBP_Benefits_2027_dictionary`; a column with a code list takes 1 dictionary row per code). Position-string codes are written as the dictionary writes them, `1 in N`.\n\n' +
    parts.join('\n\n') + '\n');
  console.log(`wrote ${['profile.md', 'code-lists.md', 'tier-labels.csv', 'tier-label-models.csv', 'pdp-sponsors.csv'].map((f) => path.relative(REPO_ROOT, path.join(OUT_DIR, f))).join(', ')}`);
}

(opt.plan ? (opt.benefits ? printBenefits(opt.plan, opt.offset) : printPlan(opt.plan)) : profile())
  .catch((e) => { console.error('error: ' + e.message); process.exit(1); });
