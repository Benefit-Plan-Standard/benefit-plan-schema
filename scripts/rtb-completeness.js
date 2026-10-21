#!/usr/bin/env node
/**
 * Counts, for each Benefit Plan Standard document written by a public-file importer, how many of
 * the medical MVP's SHALL items that apply to the plan the document populates. Reads
 * docs/specs/rtb-medical-mvp/shall-should.json. Deterministic: the same inputs give the same output.
 * Spec: docs/specs/rtb-medical-mvp/README.md, section "Conformance", "Completeness".
 *
 * Usage:
 *   node scripts/rtb-completeness.js                      the 10 examples (examples/*.pbp.json, examples/*.puf.json)
 *   node scripts/rtb-completeness.js <document.json> ...  the documents named
 *   --misses                                              also list each missed item and why
 *
 * What is counted, per program (the first source_references excerpt says which importer wrote the document):
 *   - every item labelled SHALL for the program, and the covered-or-not aspect of each extra benefit on
 *     the program's list. KEY and SHOULD items are not counted.
 *   - An item applies to every plan, except the items in APPLIES below, which apply only to some plans
 *     (the point-of-service cost to HMO-POS plans, for example).
 * When an applicable item is populated:
 *   - An item with a gap recorded for the program is a miss, whatever the document carries (README,
 *     "Known gaps in this version").
 *   - A service: its benefit has in-network tier rows (IN, or the facility cost tiers written under IN),
 *     and each is covered with at least 1 cost share, or not covered. The benefit is found by benefit_id
 *     (Medicare Advantage, pbp_benefit_id) or by raw_label (Marketplace, the exact BenefitName).
 *   - An extra benefit: its benefit has in-network tier rows, each with covered true or false.
 *   - Any other item: 1 of its field paths holds a value, or 1 of the columns it reads is quoted with
 *     its value in the document (a column is quoted as name "value"). The quoted cell is the answer when
 *     the plan files none, such as a deductible of "Not Applicable". The 4 columns in SELECTORS only say
 *     which other columns hold the answer and do not count. POPULATED below sets the test for
 *     the items whose answer is neither.
 * Exit codes: 0 = counted (a low count is not an error), 2 = bad input.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SHALL_SHOULD = 'docs/specs/rtb-medical-mvp/shall-should.json';
const PROGRAM_BY_SOURCE = [
  { program: 'medicare_advantage', start: 'CMS Plan Benefit Package (PBP) Benefits' },
  { program: 'marketplace', start: 'CMS Health Insurance Exchange Public Use Files' },
];

const arr = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tierIds = (doc) => (doc.network_tiers || []).map((t) => t.tier_id);
const hasTier = (doc, id) => tierIds(doc).includes(id);
const rowOf = (benefit, tier) => (benefit.network_cost_shares || []).find((r) => r.tier_id === tier);
// The in-network rows of a benefit: the IN row, or the facility cost tiers written under IN
// (cost_designation tiers such as IN_1A_TIER_1, whose parent_tier_id is IN).
function inNetworkRows(doc, benefit) {
  const underIn = new Set((doc.network_tiers || []).filter((t) => t.parent_tier_id === 'IN').map((t) => t.tier_id));
  return ((benefit && benefit.network_cost_shares) || []).filter((r) => r.tier_id === 'IN' || underIn.has(r.tier_id));
}
const isPopulated = (v) => v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);

// Every excerpt and note in the document, where quoted columns are found.
function quotedText(doc) {
  const parts = [];
  for (const s of doc.source_references || []) parts.push(s.excerpt || '');
  for (const b of doc.benefits || []) {
    for (const s of b.source_references || []) parts.push(s.excerpt || '');
    for (const r of b.network_cost_shares || []) parts.push(r.notes || '');
  }
  return parts.join('\n');
}

// A Marketplace item that names the TEHB columns reads the MEHB ones when medical and drug are not
// integrated; the SBC address is quoted under its own label.
function columnAliases(col) {
  const out = [col];
  if (col.startsWith('TEHB')) out.push(`MEHB${col.slice(4)}`);
  if (col === 'URLForSummaryofBenefitsCoverage') out.push('SBC URL from the Plan Attributes PUF:');
  return out;
}

function isQuoted(text, col) {
  return columnAliases(col).some((c) => (c.endsWith(':')
    ? text.includes(c)
    : new RegExp(`(?<![A-Za-z0-9_])${escapeRe(c)} "`).test(text)));
}

// Resolves a data dictionary field path: name, name[], name[0], name[key=value], joined by dots.
function resolvePath(doc, fieldPath) {
  let values = [doc];
  for (const seg of fieldPath.split('.')) {
    const m = /^([A-Za-z0-9_]+)(?:\[([^\]]*)\])?$/.exec(seg);
    if (!m) throw new Error(`cannot read field path "${fieldPath}"`);
    const [, name, sel] = m;
    const next = [];
    for (const v of values) {
      if (v === null || typeof v !== 'object' || !(name in v)) continue;
      const x = v[name];
      if (sel === undefined) next.push(x);
      else if (!Array.isArray(x)) continue;
      else if (sel === '') next.push(...x);
      else if (/^\d+$/.test(sel)) { if (x[Number(sel)] !== undefined) next.push(x[Number(sel)]); }
      else {
        const [k, want] = sel.split('=');
        next.push(...x.filter((e) => e && String(e[k]) === want));
      }
    }
    values = next;
  }
  return values.filter(isPopulated);
}

// Columns that say which other columns hold the answer; quoting one is not an answer. NetworkId only
// picks the plan's row of the Network PUF, whose NetworkURL is the provider directory link.
const SELECTORS = new Set(['MedicalDrugDeductiblesIntegrated', 'MedicalDrugMaximumOutofPocketIntegrated', 'MultipleInNetworkTiers', 'NetworkId']);

function readColumns(entry) {
  return arr(entry.source).flatMap((s) => arr(s.read)).filter((c) => !SELECTORS.has(c));
}

// Items that apply to some plans only, keyed program:item.
const APPLIES = {
  'medicare_advantage:oon_cost': (doc) => doc.plan_type === 'PPO' || hasTier(doc, 'OUT'),
  'medicare_advantage:pos_cost': (doc) => doc.plan_type === 'HMO_POS' || hasTier(doc, 'POS'),
  'medicare_advantage:oon_deductible': (doc) => hasOonOption(doc),
  'medicare_advantage:oon_oop_max': (doc) => hasOonOption(doc),
  'medicare_advantage:combined_amounts': (doc) => hasOonOption(doc),
  'marketplace:drug_deductible': (doc, text) => isQuotedValue(text, 'MedicalDrugDeductiblesIntegrated', 'No'),
  'marketplace:second_tier_cost': (doc, text) => hasSecondTier(doc, text),
  'marketplace:second_tier_amounts': (doc, text) => hasSecondTier(doc, text),
};

function hasOonOption(doc) {
  return ['PPO', 'HMO_POS'].includes(doc.plan_type) || hasTier(doc, 'OUT') || hasTier(doc, 'POS');
}

function hasSecondTier(doc, text) {
  return hasTier(doc, 'IN2') || isQuotedValue(text, 'MultipleInNetworkTiers', 'Yes');
}

function isQuotedValue(text, col, value) {
  return new RegExp(`(?<![A-Za-z0-9_])${escapeRe(col)} "${escapeRe(value)}"`).test(text);
}

// A tier row answers a cost question when it is not covered, or covered with at least 1 cost share.
const answersCost = (row) => !!row && (row.covered === false || (row.covered === true && (row.cost_shares || []).length > 0));
const anyRow = (doc, tier) => (doc.benefits || []).some((b) => answersCost(rowOf(b, tier)));

// Items whose answer is not a field path or a quoted column, keyed program:item.
const POPULATED = {
  // The release and the download date, in the first excerpt.
  'medicare_advantage:data_date': (doc) => {
    const first = ((doc.source_references || [])[0] || {}).excerpt || '';
    return /release "[^"]+"/.test(first) && /downloaded \d{4}-\d{2}-\d{2}/.test(first);
  },
  // The tier list is the answer: an OUT or POS tier is written when the file says the plan has one,
  // and an HMO has neither (importer spec, network tiers).
  'medicare_advantage:oon_coverage': (doc) => tierIds(doc).length > 0,
  // A PPO files its deductible in the annual columns, which cover out-of-network care unless their
  // scope says otherwise (importer spec section 7.3), so the annual answer is also the out-of-network one.
  'medicare_advantage:oon_deductible': (doc, e, text) => byPathOrColumn(doc, e, text)
    || (doc.plan_type === 'PPO' && isQuoted(text, 'pbp_d_ann_deduct_yn')),
  'medicare_advantage:oon_cost': (doc) => anyRow(doc, 'OUT'),
  'medicare_advantage:pos_cost': (doc) => anyRow(doc, 'POS'),
  'marketplace:oon_cost': (doc) => anyRow(doc, 'OUT'),
  'marketplace:second_tier_cost': (doc) => anyRow(doc, 'IN2'),
};

function programOf(doc) {
  const first = ((doc.source_references || [])[0] || {}).excerpt || '';
  const hit = PROGRAM_BY_SOURCE.find((p) => first.startsWith(p.start));
  return hit ? hit.program : null;
}

// The plan key in plan_identifiers. A Marketplace document written before 2026-10-20 (schema 1.1.0) has
// no plan_identifiers and gives the key as text in its first excerpt.
function planKey(doc, program) {
  const system = program === 'medicare_advantage' ? 'cms_contract_plan_segment' : 'hios_plan_id';
  const id = (doc.plan_identifiers || []).find((p) => p.system === system);
  if (id) return id.value;
  if (program === 'medicare_advantage') return null;
  const m = /HIOS plan ID (\S+?)[ .(]/.exec(((doc.source_references || [])[0] || {}).excerpt || '');
  return m ? m[1] : null;
}

function byPathOrColumn(doc, entry, text) {
  return arr(entry.path).some((fp) => resolvePath(doc, fp).length > 0) || readColumns(entry).some((c) => isQuoted(text, c));
}

function findBenefit(doc, program, entry) {
  const benefits = doc.benefits || [];
  if (program === 'medicare_advantage') return entry.pbp_benefit_id ? benefits.find((b) => b.benefit_id === entry.pbp_benefit_id) : undefined;
  return entry.benefit_name ? benefits.find((b) => b.raw_label === entry.benefit_name) : undefined;
}

// Returns { program, key, planYear, applicable, populated, misses: [{ id, why }] }.
function count(doc, ss) {
  const program = programOf(doc);
  if (!program) throw new Error('the first source_references excerpt does not name the PBP or the Marketplace PUFs; not written by a public-file importer');
  const text = quotedText(doc);
  const result = { program, key: planKey(doc, program), planYear: doc.plan_year, applicable: 0, populated: 0, misses: [] };
  for (const it of ss.items) {
    const e = it[program];
    const counted = it.group === 'extras' ? e.on_list === true : e.label === 'SHALL';
    if (!counted) continue;
    const applies = APPLIES[`${program}:${it.id}`];
    if (applies && !applies(doc, text)) continue;
    result.applicable++;
    let ok;
    let why = 'not in the document';
    if (e.gap) {
      ok = false;
      why = `gap ${e.gap}`;
    } else if (POPULATED[`${program}:${it.id}`]) {
      ok = POPULATED[`${program}:${it.id}`](doc, e, text);
    } else if (it.group === 'services') {
      const rows = inNetworkRows(doc, findBenefit(doc, program, e));
      ok = rows.length > 0 && rows.every(answersCost);
    } else if (it.group === 'extras') {
      const rows = inNetworkRows(doc, findBenefit(doc, program, e));
      ok = rows.length > 0 && rows.every((r) => typeof r.covered === 'boolean');
    } else {
      ok = byPathOrColumn(doc, e, text);
    }
    if (ok) result.populated++;
    else result.misses.push({ id: it.id, why });
  }
  return result;
}

const PROGRAM_NAME = { medicare_advantage: 'Medicare Advantage', marketplace: 'Marketplace' };

function report(rows, { misses }) {
  const head = ['Document', 'Plan key', 'Program', 'Plan year', 'Populated', 'Applicable', 'Percent'];
  const body = rows.map((r) => [r.file, r.key || '(none)', PROGRAM_NAME[r.program], String(r.planYear), String(r.populated),
    String(r.applicable), (100 * r.populated / r.applicable).toFixed(1)]);
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
  const line = (cells) => cells.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
  const out = [line(head)];
  rows.forEach((r, i) => {
    out.push(line(body[i]));
    if (misses) for (const m of r.misses) out.push(`    miss ${m.id} (${m.why})`);
  });
  return out.join('\n');
}

function exampleFiles() {
  const dir = path.join(REPO_ROOT, 'examples');
  return fs.readdirSync(dir).filter((f) => /\.(pbp|puf)\.json$/.test(f)).sort().map((f) => path.join(dir, f));
}

function main(argv) {
  const misses = argv.includes('--misses');
  const unknown = argv.filter((a) => a.startsWith('-') && a !== '--misses');
  if (unknown.length || argv.includes('-h')) {
    console.error('usage: node scripts/rtb-completeness.js [--misses] [<document.json> ...]');
    return unknown.length ? 2 : 0;
  }
  const files = argv.filter((a) => !a.startsWith('-'));
  const ss = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, SHALL_SHOULD), 'utf8'));
  const rows = [];
  for (const file of files.length ? files : exampleFiles()) {
    try {
      const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
      rows.push({ file: path.basename(file), ...count(doc, ss) });
    } catch (e) {
      console.error(`error: ${path.basename(file)}: ${e.message}`);
      return 2;
    }
  }
  console.log(report(rows, { misses }));
  return 0;
}

module.exports = { count, resolvePath, isQuoted };

if (require.main === module) process.exit(main(process.argv.slice(2)));
