#!/usr/bin/env node
/**
 * Generates the medical MVP data dictionary, docs/specs/rtb-medical-mvp/data-dictionary.md,
 * from docs/specs/rtb-medical-mvp/shall-should.json, the 2 importer crosswalks
 * (fhir/pbp-crosswalk.json, fhir/marketplace-puf-crosswalk.json) and
 * vocabularies/canonical-benefits.json. Deterministic: the same inputs give the same bytes.
 *
 * Usage:
 *   node scripts/build-rtb-dictionary.js                write data-dictionary.md
 *   node scripts/build-rtb-dictionary.js --check        exit 1 if the file on disk differs
 *   node scripts/build-rtb-dictionary.js --out <file>   write to <file> instead
 *
 * Exits 1 without writing, and names the item, when:
 *   - a SHALL item has no canonical key or no crosswalk row and shall-should.json records no gap for it;
 *   - a crosswalk row's canonical key is not the item's key, or the key is not in the vocabulary;
 *   - a field path is not in the program's schema (v1.2.0 Medicare Advantage, v1.1.0 Marketplace);
 *   - a column named as read is in neither the importer script nor its golden documents;
 *   - a column named as not read appears in the importer script (the gap it records would be stale);
 *   - the README does not open, under its title, with the author line and the preface this generator writes for it;
 *   - a mention to be linked to the repository is no longer in the document.
 * Spec: docs/specs/rtb-medical-mvp/README.md
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SPEC_DIR = 'docs/specs/rtb-medical-mvp';
const SHALL_SHOULD = `${SPEC_DIR}/shall-should.json`;
const DICTIONARY = `${SPEC_DIR}/data-dictionary.md`;
const README = `${SPEC_DIR}/README.md`;
const VOCABULARY = 'vocabularies/canonical-benefits.json';
const REPO = 'https://github.com/Benefit-Plan-Standard/benefit-plan-schema';
const IN_REPO = 'in the Benefit Plan Standard repository';
const REPOS = 'the Benefit Plan Standard repository\'s';
const SPEC_VERSION = '0.2';
const SPEC_DATE = 'October 20, 2026';
const AUTHOR = 'Diego Orofino, the Benefit Plan Standard, dorofino@benefitplanstandard.org. A draft for the workgroup, not a workgroup decision.';
// The 3 documents of the specification: the name the preface gives each, and the term the others use for it
// when that differs.
const SPEC_DOCS = [
  { file: README, name: 'technical specification', term: 'README' },
  { file: DICTIONARY, name: 'data dictionary' },
  { file: `${SPEC_DIR}/carin-crosswalk.md`, name: 'crosswalk to the SBC InsurancePlan profile' },
];
const PROGRAMS = ['medicare_advantage', 'marketplace'];
const BENEFIT_GROUPS = ['services', 'extras'];
const LABELS = ['SHALL', 'SHOULD', 'KEY'];
const QUOTED_PATH = 'source_references[].excerpt';
const SERVICE_COST = 'network_cost_shares[tier_id=IN].cost_shares[]';

const ITEM_PROPS = new Set(['id', 'group', 'name', 'key', 'meaning', 'note', ...PROGRAMS]);
const ENTRY_PROPS = new Set(['label', 'on_list', 'name', 'path', 'source', 'quoted', 'gap', 'not_in_file', 'note',
  'pbp_benefit_id', 'benefit_name', 'scope_covered_test']);
const SOURCE_PROPS = new Set(['file', 'read', 'unread']);

const readText = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));
const arr = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const code = (s) => `\`${s}\``;
const codes = (xs) => xs.map(code).join(', ');
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (text, word) => new RegExp(`(?<![A-Za-z0-9_])${escapeRe(word)}(?![A-Za-z0-9_])`).test(text);
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();
const sentence = (s) => (s && !/[.!?]$/.test(s) ? `${s}.` : s);
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);

// Puts column names, field paths, identifiers and file names written in prose into code spans,
// so that names such as data/puf/<year>/download.json are not read as markup.
function codeify(text) {
  if (!text) return '';
  return String(text).split(' ').map((tok) => {
    const [, lead, core, trail] = /^([("]*)(.*?)([.,;:)"]*)$/.exec(tok);
    if (!core || core.includes('`')) return tok;
    if (/[_<>[]/.test(core) || /\.(txt|csv|json|js|md)$/.test(core) || /^[A-Z][a-z0-9]+[A-Z]/.test(core)) return `${lead}${code(core)}${trail}`;
    return tok;
  }).join(' ');
}

const fileText = (file) => file.replace(/[\w<>/.-]+\.(?:txt|csv|json)\b/g, (m) => code(m));

// The GitHub address of a repository file under main, or of a folder when the path ends in /.
const githubUrl = (rel) => (rel.endsWith('/') ? `${REPO}/tree/main/${rel.slice(0, -1)}` : `${REPO}/blob/main/${rel}`);
const repoLink = (rel, text = code(rel)) => `[${text}](${githubUrl(rel)})`;

// Each document of the specification is also read on its own, away from the repository, and opens with the author
// line and this paragraph under its title.
function preface(file) {
  const self = SPEC_DOCS.find((d) => d.file === file);
  const [a, b] = SPEC_DOCS.filter((d) => d !== self).map((d) => `the [${d.name}](${githubUrl(d.file)})`);
  return 'The [Benefit Plan Standard](https://benefitplanstandard.org) is an open JSON format for health plan benefits, published under the MIT license. ' +
    `Its schema, the importers that read CMS public files, the converter to FHIR and the example plans live in [one repository](${REPO}). ` +
    `This document is the ${self.name}, version ${SPEC_VERSION}, dated ${SPEC_DATE}, 1 of 3 documents that make up the medical MVP ` +
    'technical specification for the CMS Health Tech Ecosystem Real-Time Benefits workgroup. ' +
    `The other 2 are ${a} and ${b}. All 3 are in the [repository folder](${githubUrl(`${SPEC_DIR}/`)}), ` +
    `and the files they name are in the [repository](${REPO}). ` +
    `This document is published as ${code(file.split('/').pop())} in that folder; a Word copy carries the same content.`;
}

const opening = (file) => `${AUTHOR}\n\n${preface(file)}`;

// Puts the author line and the preface under the title of a generated document, links every mention of the other
// 2 documents by name to it on GitHub, and replaces the first appearance of each [text, replacement] in mentions,
// which is how a repository file named in text from the JSON sources is introduced where the document first names it.
function standalone(text, file, mentions, errors) {
  const at = text.indexOf('\n\n');
  let body = text.slice(at);
  for (const d of SPEC_DOCS.filter((x) => x.file !== file)) {
    const term = d.term || d.name;
    body = body.replace(new RegExp(`\\b${escapeRe(term)}\\b`, 'g'), `[${term}](${githubUrl(d.file)})`);
  }
  for (const [from, to] of mentions) {
    const i = body.indexOf(from);
    if (i < 0) errors.push(`${file}: "${from}" is not in the document, so the repository file it names is not introduced there`);
    else body = body.slice(0, i) + to + body.slice(i + from.length);
  }
  return `${text.slice(0, at)}\n\n${opening(file)}${body}`;
}

// True when a field path, with its [filters] read as [], is in the schema.
function inSchema(schema, fieldPath) {
  const defs = schema.$defs || schema.definitions || {};
  const deref = (n) => {
    while (n && n.$ref) n = defs[n.$ref.split('/').pop()];
    return n;
  };
  let node = schema;
  for (const seg of fieldPath.replace(/\[[^\]]*\]/g, '[]').split('.')) {
    node = deref(node);
    node = node && node.properties && node.properties[seg.replace(/\[\]$/, '')];
    if (!node) return false;
    if (seg.endsWith('[]')) {
      node = deref(node);
      node = node && node.items;
      if (!node) return false;
    }
  }
  return true;
}

// Every PBP column a crosswalk object names, in order, once.
function pbpCols(obj) {
  const out = [];
  const walk = (v) => {
    if (typeof v === 'string') { if (/^pbp_/.test(v) && !out.includes(v)) out.push(v); }
    else if (Array.isArray(v)) v.forEach(walk);
    else if (v && typeof v === 'object') Object.values(v).forEach(walk);
  };
  walk(obj);
  return out;
}

// The columns the PBP importer's inpatient_acute handler reads for a stay (scripts/from-pbp.js
// inpatientCols and inpatientInNetwork): _t1 repeats for each facility cost tier, _int1_ for each day interval.
function inpatientText(b) {
  const p = b.prefix;
  const o = b.inpatient || {};
  const part = (k, val) => [`${p}_${k}_yn`, ...(o.stay_amount === false ? [] : [k === 'copay' ? `${p}_copay_mcs_amt_t1` : `${p}_coins_mcs_pct_t1`]),
    `${p}_${k}_mcs_int_num_t1`, `${p}_${k}_mcs_${val}_int1_t1`, `${p}_${k}_mcs_bgnd_int1_t1`, `${p}_${k}_mcs_endd_int1_t1`];
  const ded = o.deductible_amount === null ? [`${p}_ded_yn`] : [`${p}_ded_yn`, `${p}_ded_amt_t1`];
  return `Copay ${codes(part('copay', 'amt'))}; coinsurance ${codes(part('coins', 'pct'))}; service deductible ${codes(ded)}; ` +
    `facility cost tiers ${codes([`${p}_cost_vary_tiers_yn`, `${p}_cost_vary_tier_num`])}. ` +
    `${code('_t1')} repeats for each facility cost tier and ${code('_int1_')} for each day interval.`;
}

function categoryHead(b) {
  const i = b.pbp_label.indexOf(': ');
  return `Category ${b.pbp_code} (${b.pbp_label.slice(i + 2)}), ${code(b.file)}.`;
}

function costParts(b) {
  const parts = [];
  if (b.copay) parts.push(`copay ${codes(pbpCols(b.copay))}`);
  if (b.coins) parts.push(`coinsurance ${codes(pbpCols(b.coins))}`);
  if (b.service_deductible) parts.push(`service deductible ${codes(pbpCols(b.service_deductible))}`);
  return parts;
}

function maServiceText(b) {
  if (b.handler === 'inpatient_acute') return `${categoryHead(b)} ${inpatientText(b)}`;
  return `${categoryHead(b)} ${sentence(costParts(b).join('; ').replace(/^./, (c) => c.toUpperCase()))}`;
}

function maCoveredText(b, errors) {
  const o = b.offered;
  if (!o) {
    errors.push(`${b.benefit_id}: the PBP crosswalk row has no offered test`);
    return '';
  }
  if (o.filled) {
    return `${categoryHead(b)} Covered when ${code(o.filled)} is filled; when it is blank, covered false with a note ` +
      `that the plan filed no entry in the PBP ${o.section} section.`;
  }
  let test = `${code(o.yn)} is 1`;
  if (o.ehc && o.code) test += ` and ${code(o.ehc)} lists ${o.code}`;
  else if (o.ehc) test += ` and position ${o.position} of ${code(o.ehc)} is chosen`;
  const otherwise = {
    not_covered: 'otherwise covered false',
    skip: 'otherwise nothing is written',
    skip_unless_excluded: `covered false when ${code(o.yn)} is 2; when it is 1 and position ${o.position} is not chosen, ` +
      'the plan offers other types only and nothing is written',
  }[o.when_not_chosen];
  if (!otherwise) errors.push(`${b.benefit_id}: offered.when_not_chosen "${o.when_not_chosen}" is not one the generator reads`);
  let text = `${categoryHead(b)} Covered when ${test}; ${otherwise}.`;
  if (b.variant) {
    const which = Object.entries(b.variant.values).map(([v, x]) => `${v} for ${x.pbp_code}`).join(', ');
    text += ` ${code(b.variant.col)} says which: ${which}.`;
  }
  return text;
}

function maExtraCostText(b) {
  const parts = costParts(b);
  const amo = b.variant ? Object.values(b.variant.values).map((x) => x.amo) : arr(b.amo);
  if (amo.length) parts.push(`included or optional ${codes(amo)}`);
  if (b.auth) parts.push(`authorization ${code(b.auth)}`);
  if (b.refer) parts.push(`referral ${code(b.refer)}`);
  return `${categoryHead(b)} ${sentence(parts.join('; ').replace(/^./, (c) => c.toUpperCase()))}`;
}

function maLimitsText(b) {
  if (!b.limits || !b.limits.length) return `${categoryHead(b)} The crosswalk names no limit columns.`;
  const parts = b.limits.map((l) => `${l.kind === 'dollars' ? 'dollar maximum' : `quantity (${code(l.type)})`} ${codes(pbpCols(l))}`);
  return `${categoryHead(b)} ${sentence(parts.join('; ').replace(/^./, (c) => c.toUpperCase()))}`;
}

function build() {
  const ss = readJson(SHALL_SHOULD);
  const errors = [];
  const vocabulary = readJson(VOCABULARY);
  const vocab = new Map(vocabulary.benefits.map((e) => [e.canonical_key, e]));
  const prog = {};
  for (const p of PROGRAMS) {
    const cfg = ss.programs[p];
    const golden = fs.readdirSync(path.join(REPO_ROOT, 'examples')).filter((f) => f.endsWith(cfg.golden_suffix)).sort();
    if (!golden.length) errors.push(`${cfg.name}: no golden documents ending ${cfg.golden_suffix} in examples/`);
    prog[p] = {
      cfg,
      name: cfg.name,
      crosswalk: readJson(cfg.crosswalk),
      schema: readJson(cfg.schema),
      schemaVersion: /v(\d+\.\d+\.\d+)/.exec(cfg.schema)[1],
      script: readText(cfg.importer),
      golden: golden.map((f) => readText(`examples/${f}`)).join('\n'),
    };
  }
  const ma = prog.medicare_advantage;
  const mp = prog.marketplace;
  const pbpRows = ma.crosswalk.benefits;
  const pufRows = mp.crosswalk.map;
  const gaps = new Map(ss.gaps.map((g) => [g.id, g]));
  const groups = new Map(ss.groups.map((g) => [g.id, g]));
  const aspects = groups.get('extras').aspects;

  // Shape of shall-should.json.
  const ids = new Set();
  const usedGaps = new Set();
  for (const it of ss.items) {
    for (const k of Object.keys(it)) if (!ITEM_PROPS.has(k)) errors.push(`${it.id}: unknown property "${k}"`);
    if (ids.has(it.id)) errors.push(`${it.id}: duplicate id`);
    ids.add(it.id);
    if (!groups.has(it.group)) errors.push(`${it.id}: unknown group "${it.group}"`);
    if (BENEFIT_GROUPS.includes(it.group) ? !('key' in it) : !it.name) errors.push(`${it.id}: no ${BENEFIT_GROUPS.includes(it.group) ? 'key' : 'name'}`);
    for (const p of PROGRAMS) {
      const e = it[p];
      if (!e) { errors.push(`${it.id}: no ${prog[p].name} entry`); continue; }
      for (const k of Object.keys(e)) if (!ENTRY_PROPS.has(k)) errors.push(`${it.id} (${prog[p].name}): unknown property "${k}"`);
      if (it.group === 'extras' ? typeof e.on_list !== 'boolean' : !(e.label === null || LABELS.includes(e.label))) {
        errors.push(`${it.id} (${prog[p].name}): ${it.group === 'extras' ? 'on_list must be true or false' : `label "${e.label}" is not SHALL, SHOULD, KEY or null`}`);
      }
      for (const s of arr(e.source)) for (const k of Object.keys(s)) if (!SOURCE_PROPS.has(k)) errors.push(`${it.id} (${prog[p].name}): unknown source property "${k}"`);
      if (e.gap) {
        usedGaps.add(e.gap);
        if (!gaps.has(e.gap)) errors.push(`${it.id} (${prog[p].name}): gap ${e.gap} is not recorded`);
        else if (!gaps.get(e.gap).programs.includes(p)) errors.push(`${it.id} (${prog[p].name}): gap ${e.gap} is not recorded for ${prog[p].name}`);
      }
    }
  }
  for (const g of ss.gaps) if (!usedGaps.has(g.id)) errors.push(`gap ${g.id} is recorded but no item refers to it`);
  if (errors.length) return { errors };

  const onList = (it, p) => (it.group === 'extras' ? it[p].on_list : it[p].label !== null);
  const rowFor = (it, p) => {
    const e = it[p];
    if (p === 'medicare_advantage') return e.pbp_benefit_id ? pbpRows.find((b) => b.benefit_id === e.pbp_benefit_id) || null : null;
    return e.benefit_name ? pufRows.find((r) => r.puf_benefit_name === e.benefit_name) || null : null;
  };

  // Columns: read ones must be in the importer or its golden documents; unread ones must not be in the importer.
  const checkSources = (it, p) => {
    for (const s of arr(it[p].source)) {
      for (const c of arr(s.read)) {
        if (!hasWord(prog[p].script, c) && !hasWord(prog[p].golden, c)) {
          errors.push(`${it.id} (${prog[p].name}): column ${c} is in neither ${prog[p].cfg.importer} nor its golden documents`);
        }
      }
      for (const c of arr(s.unread)) {
        if (hasWord(prog[p].script, c)) errors.push(`${it.id} (${prog[p].name}): column ${c} is named as not read, but ${prog[p].cfg.importer} reads it`);
      }
    }
  };
  const checkPaths = (it, p, paths) => {
    for (const fp of paths) if (!inSchema(prog[p].schema, fp)) errors.push(`${it.id} (${prog[p].name}): ${fp} is not in ${prog[p].cfg.schema}`);
  };

  const sourceText = (e) => arr(e.source).map((s) => {
    const parts = [];
    if (arr(s.read).length) parts.push(codes(arr(s.read)));
    if (arr(s.unread).length) parts.push(`${codes(arr(s.unread))} (not read)`);
    return `${fileText(s.file)}: ${parts.join('; ')}.`;
  }).join(' ');

  const labelText = (l) => (l === 'KEY' ? '**Key**.' : `**${l}**.`);
  const offList = (p) => `Not on the ${prog[p].name} list.`;

  const notes = (parts) => [...new Set(parts.filter(Boolean).map((s) => sentence(s)))].join(' ');
  const progNote = (p, text) => (text ? `${prog[p].name}: ${text}` : '');
  const gapNote = (e) => (e.gap ? `Gap ${e.gap}: ${gaps.get(e.gap).instead}` : '');
  const notInFile = [];
  const nifNote = (it, itemName, p, text) => {
    if (!text) return '';
    notInFile.push({ program: p, item: itemName, text });
    return `${prog[p].name}: not in the CMS file. ${text}`;
  };

  const pathCell = (paths) => {
    const ps = PROGRAMS.filter((p) => paths[p] && paths[p].length);
    if (!ps.length) return '';
    const same = ps.length === 2 && JSON.stringify(paths[ps[0]]) === JSON.stringify(paths[ps[1]]);
    if (ps.length === 1 || same) return codes(paths[ps[0]]);
    return ps.map((p) => `${prog[p].name}: ${codes(paths[p])}.`).join(' ');
  };

  const rows = [];

  // Groups whose items name their own paths and columns: identification, plan, network.
  for (const it of ss.items.filter((x) => !BENEFIT_GROUPS.includes(x.group))) {
    const paths = {};
    const cells = {};
    const noteParts = [codeify(it.note)];
    const labels = {};
    for (const p of PROGRAMS) {
      const e = it[p];
      labels[p] = e.label;
      checkSources(it, p);
      if (e.label === null) {
        cells[p] = offList(p);
        noteParts.push(nifNote(it, it.name, p, codeify(e.not_in_file)));
        noteParts.push(progNote(p, codeify(e.note)));
        continue;
      }
      paths[p] = [...arr(e.path), ...(e.quoted ? [QUOTED_PATH] : [])];
      checkPaths(it, p, paths[p]);
      const gap = e.gap ? gaps.get(e.gap) : null;
      if (e.label === 'SHALL' && !paths[p].length && !gap) errors.push(`SHALL item ${it.id} (${prog[p].name}) has no field and no recorded gap`);
      const notWritten = gap && gap.kind === 'not_read' && !arr(e.source).some((s) => arr(s.read).length);
      cells[p] = [
        labelText(e.label),
        notWritten ? 'Not written today.' : '',
        e.quoted ? `Quoted verbatim in ${code('source_references')}; no Benefit Plan Standard field.` : '',
        sourceText(e),
        e.gap ? `Gap ${e.gap}.` : '',
      ].filter(Boolean).join(' ');
      noteParts.push(progNote(p, codeify(e.note)));
      noteParts.push(nifNote(it, it.name, p, codeify(e.not_in_file)));
      noteParts.push(codeify(gapNote(e)));
      if (gap && gap.proposed) noteParts.push(`Proposed field: ${codeify(gap.proposed)}`);
    }
    rows.push({ group: it.group, item: it.name, path: pathCell(paths), meaning: codeify(it.meaning), cells, note: notes(noteParts), labels });
  }

  // Benefit groups: services and extras, sourced from the crosswalks.
  const itemName = (it, suffix) => {
    const names = PROGRAMS.filter((p) => onList(it, p) && it[p].name).map((p) => [p, it[p].name]);
    let name;
    if (names.length === 2 && names[0][1] !== names[1][1]) name = names.map(([p, n]) => `${prog[p].name}: ${n}.`).join(' ');
    else name = names.length ? names[0][1] : it.id;
    const key = it.key ? ` (${code(it.key)})` : ' (no canonical key)';
    return `${name}${key}${suffix ? `, ${suffix}` : ''}`;
  };
  const plainName = (it) => {
    const names = [...new Set(PROGRAMS.filter((p) => onList(it, p) && it[p].name).map((p) => it[p].name))];
    return names.join(' / ');
  };
  const selector = (it, p, row) => {
    if (p === 'medicare_advantage') {
      if (row && (it.key === null || pbpRows.filter((b) => b.canonical_key === it.key).length > 1)) return `benefits[benefit_id=${row.benefit_id}]`;
      return `benefits[canonical_key=${it.key}]`;
    }
    if (row && pufRows.filter((r) => r.canonical_key === it.key).length > 1) return `benefits[raw_label=${row.puf_benefit_name}]`;
    return `benefits[canonical_key=${it.key}]`;
  };
  const crosswalkRowsText = (it, p) => {
    if (it.key === null) return '';
    if (p === 'medicare_advantage') {
      const rs = pbpRows.filter((b) => b.canonical_key === it.key);
      return rs.length ? `PBP crosswalk rows with this key: ${rs.map((b) => `${b.pbp_code} ${code(b.benefit_id)}`).join(', ')}.`
        : 'No PBP crosswalk row has this key.';
    }
    const ns = pufRows.filter((r) => r.canonical_key === it.key);
    return ns.length ? `Crosswalk names with this key: ${ns.map((r) => `"${r.puf_benefit_name}"`).join(', ')}.`
      : 'No name in the Marketplace crosswalk maps to this key.';
  };
  const benefitNameText = (row) => `BenefitName "${row.puf_benefit_name}", ${code(mp.cfg.benefit_file)}:`;

  for (const it of ss.items.filter((x) => BENEFIT_GROUPS.includes(x.group))) {
    if (it.key !== null && !vocab.has(it.key)) errors.push(`${it.id}: canonical key ${it.key} is not in ${VOCABULARY}`);
    const found = {};
    for (const p of PROGRAMS) {
      const e = it[p];
      checkSources(it, p);
      if (!onList(it, p)) continue;
      const row = rowFor(it, p);
      found[p] = row;
      const ref = p === 'medicare_advantage' ? e.pbp_benefit_id : e.benefit_name;
      if (ref && !row) errors.push(`${it.id} (${prog[p].name}): ${prog[p].cfg.crosswalk} has no row "${ref}"`);
      const gap = e.gap ? gaps.get(e.gap) : null;
      const shall = it.group === 'extras' ? aspects.find((a) => a.id === 'covered').label === 'SHALL' : e.label === 'SHALL';
      if (row) {
        if (it.key === null) {
          if (!gap || gap.kind !== 'no_canonical_key') errors.push(`SHALL item ${it.id} (${prog[p].name}) has no canonical key and no recorded gap`);
          if (row.canonical_key !== null) errors.push(`${it.id} (${prog[p].name}): gap ${e.gap} is stale; the crosswalk row now has key ${row.canonical_key}`);
        } else if (row.canonical_key !== it.key) {
          errors.push(`${it.id} (${prog[p].name}): the crosswalk row "${ref}" has key ${row.canonical_key}, not ${it.key}`);
        }
      } else if (shall && !gap) {
        errors.push(`SHALL item ${it.id} (${prog[p].name}) has no crosswalk row and no recorded gap`);
      }
    }

    if (it.group === 'services') {
      const paths = {};
      const cells = {};
      const labels = {};
      const noteParts = [codeify(it.note)];
      for (const p of PROGRAMS) {
        const e = it[p];
        labels[p] = e.label;
        if (!onList(it, p)) {
          cells[p] = [offList(p), crosswalkRowsText(it, p)].filter(Boolean).join(' ');
          noteParts.push(nifNote(it, plainName(it) || it.id, p, codeify(e.not_in_file)));
          continue;
        }
        const row = found[p];
        paths[p] = [`${selector(it, p, row)}.${SERVICE_COST}`];
        checkPaths(it, p, paths[p]);
        let src;
        if (!row) src = ['Not written today.', sourceText(e) || 'No crosswalk row.'].join(' ');
        else if (p === 'medicare_advantage') src = maServiceText(row);
        else src = `${benefitNameText(row)} ${codes(mp.cfg.columns.in_network)}.`;
        cells[p] = [labelText(e.label), src, e.gap ? `Gap ${e.gap}.` : ''].filter(Boolean).join(' ');
        if (p === 'medicare_advantage' && row) {
          const others = pbpRows.filter((b) => it.key !== null && b.canonical_key === it.key && b !== row);
          if (others.length) noteParts.push(progNote(p, `${others.map((b) => `${code(b.benefit_id)} (category ${b.pbp_code})`).join(', ')} is also written with this key`));
          if (row.handler === 'inpatient_acute') {
            const t = `IN_${row.pbp_code.toUpperCase()}_TIER_1`;
            noteParts.push(progNote(p, `on a plan whose cost varies by facility tier, the rows are ${code(t)}, ${code(t.replace(/1$/, '2'))} and so on instead of ${code('IN')}`));
          }
        }
        noteParts.push(progNote(p, codeify(e.note)));
        noteParts.push(nifNote(it, plainName(it), p, codeify(e.not_in_file)));
        noteParts.push(codeify(gapNote(e)));
      }
      rows.push({ group: it.group, item: itemName(it), path: pathCell(paths), meaning: codeify(it.meaning), cells, note: notes(noteParts), labels });
      continue;
    }

    // Extras: 1 row per aspect.
    for (const a of aspects) {
      const paths = {};
      const cells = {};
      const labels = {};
      const noteParts = [];
      for (const p of PROGRAMS) {
        const e = it[p];
        const cfgAspect = (prog[p].cfg.aspects || {})[a.id] || {};
        if (!onList(it, p)) {
          labels[p] = null;
          cells[p] = a.id === 'covered' ? [offList(p), crosswalkRowsText(it, p)].filter(Boolean).join(' ') : offList(p);
          if (a.id === 'covered') noteParts.push(nifNote(it, plainName(it) || it.id, p, codeify(e.not_in_file)));
          continue;
        }
        labels[p] = a.label;
        const row = found[p];
        const sel = selector(it, p, row);
        if (a.id === 'covered') paths[p] = [`${sel}.network_cost_shares[].covered`];
        else if (a.id === 'cost') {
          paths[p] = [`${sel}.network_cost_shares[].cost_shares[]`, ...(p === 'medicare_advantage' ? [`${sel}.coverage_basis`] : []), `${sel}.conditions[]`];
        } else paths[p] = [`${sel}.limits[]`];
        checkPaths(it, p, paths[p]);
        let src;
        if (!row) src = ['Not written today.', sourceText(e) || 'No crosswalk row.'].join(' ');
        else if (p === 'medicare_advantage') {
          src = a.id === 'covered' ? maCoveredText(row, errors) : a.id === 'cost' ? maExtraCostText(row) : maLimitsText(row);
        } else {
          src = `${benefitNameText(row)} ${codes(mp.cfg.columns[a.id])}.`;
        }
        cells[p] = [labelText(a.label), src, e.gap ? `Gap ${e.gap}.` : ''].filter(Boolean).join(' ');
        if (a.id === 'covered' && e.scope_covered_test) {
          noteParts.push(progNote(p, `the scope counts the benefit as covered when ${codeify(e.scope_covered_test)}, a different test from the importer's`));
        }
        noteParts.push(progNote(p, codeify(cfgAspect.note)));
        if (cfgAspect.not_in_file) noteParts.push(nifNote(it, `The extra benefits, ${a.title}`, p, codeify(cfgAspect.not_in_file)));
        if (a.id === 'covered') noteParts.push(codeify(gapNote(e)));
      }
      rows.push({ group: it.group, item: itemName(it, a.title), path: pathCell(paths), meaning: codeify(a.meaning), cells, note: notes(noteParts), labels });
    }
  }

  if (readText(README).split('\n\n').slice(1, 3).join('\n\n') !== opening(README)) {
    errors.push(`${README} does not open, under its title, with the author line and the preface this generator writes for it`);
  }
  const text = standalone(render(ss, prog, vocabulary, rows, notInFile), DICTIONARY, [
    ['(importer spec section 4.3)', `(${repoLink(ma.cfg.importer_spec, 'importer spec')} section 4.3, ${IN_REPO})`],
    ['in `docs/provider-directory-schema-proposal.md`', `in ${REPOS} ${repoLink('docs/provider-directory-schema-proposal.md')}`],
  ], errors);
  if (errors.length) return { errors };
  return { text, rows, notInFile, gaps: ss.gaps };
}

function render(ss, prog, vocabulary, rows, notInFile) {
  const ma = prog.medicare_advantage;
  const mp = prog.marketplace;
  const pbpKeyed = ma.crosswalk.benefits.filter((b) => b.canonical_key).length;
  const pufMapped = mp.crosswalk.map.filter((r) => r.canonical_key).length;
  const gapIds = ss.gaps.map((g) => g.id);
  const L = [];
  L.push('# Medical MVP data dictionary', '');
  L.push(`This data dictionary lists each item in the medical MVP scope and where it is in a Benefit Plan Standard document written by the 2 public-file importers ${IN_REPO}. ` +
    `The Medicare Advantage importer (${repoLink(ma.cfg.importer)}) reads the ${ma.cfg.files} files for contract year ${ma.crosswalk.contract_year}. ` +
    `The Marketplace importer (${repoLink(mp.cfg.importer)}) reads the ${mp.cfg.files} for plan year ${mp.crosswalk.plan_year}. ` +
    // The attribution's second sentence speaks for shall-should.json; the dictionary words it for itself.
    `${ss.attribution.split('. Service and benefit names')[0]}. ` +
    'The service and benefit names are the scope\'s suggested names. ' +
    'Every other sentence in this dictionary was written for the Benefit Plan Standard and is not the workgroup\'s wording.', '');
  L.push(`The dictionary is generated from the Benefit Plan Standard repository by ${repoLink('scripts/build-rtb-dictionary.js')} from ${repoLink(SHALL_SHOULD, code('shall-should.json'))} in the same repository folder, ` +
    `${repoLink(ma.cfg.crosswalk)} (${ma.crosswalk.benefits.length} rows, ${pbpKeyed} with a canonical key), ` +
    `${repoLink(mp.cfg.crosswalk)} (${mp.crosswalk.map.length} benefit names, ${pufMapped} mapped) and ` +
    `${repoLink(VOCABULARY)} (version ${vocabulary.version}, ${vocabulary.benefits.length} keys), all ${IN_REPO}. ` +
    'To change it, change those files and run the generator again.', '');

  L.push('## How to read it', '');
  for (const l of ['SHALL', 'SHOULD', 'KEY']) L.push(`- ${l === 'KEY' ? '**Key**' : `**${l}**`}. ${ss.labels[l]}`);
  L.push('- Each program column gives the label, then the CMS file and the columns the importer reads for the item.');
  L.push(`- A field path says where the value is in the document. ${code('benefits[canonical_key=primary_care]')} is the item of ${code('benefits')} ` +
    `whose ${code('canonical_key')} is ${code('primary_care')}, and ${code('[tier_id=IN]')} works the same way; ${code('[]')} means every item and ${code('[0]')} the first. ` +
    `Medicare Advantage documents follow schema ${ma.schemaVersion} and Marketplace documents schema ${mp.schemaVersion}.`);
  L.push(`- "Quoted verbatim in ${code('source_references')}" means the CMS file has the value but the schema has no field for it, so the importer copies the column name and the value into a ${code('source_references')} excerpt.`);
  L.push('- "Not on the Medicare Advantage list" or "Not on the Marketplace list" means the scope does not ask for the item in that program. Where a crosswalk still maps the key, the cell names the rows.');
  L.push('- "Not in the CMS file" in a note means the files the importer reads cannot carry the item for that program; the note says what the importer writes instead.');
  L.push('- "(not read)" marks a column that is in the CMS file but that the importer does not read today.');
  L.push(`- Gaps ${gapIds[0]} to ${gapIds[gapIds.length - 1]} are listed at the end. Each row a gap touches repeats it in its note.`, '');
  for (const p of PROGRAMS) {
    L.push(`How the ${prog[p].name} importer reads the files:`, '');
    for (const r of prog[p].cfg.reading) L.push(`- ${codeify(r)}`);
    L.push('');
  }

  const groupRows = (g) => rows.filter((r) => r.group === g);
  const count = (rs, p, l) => rs.filter((r) => r.labels[p] === l).length;
  L.push('## Summary', '');
  L.push('| Section | Rows | Medicare Advantage SHALL | Medicare Advantage SHOULD | Marketplace SHALL | Marketplace SHOULD |');
  L.push('|---|---|---|---|---|---|');
  ss.groups.forEach((g, i) => {
    const rs = groupRows(g.id);
    L.push(`| ${i + 1}. ${g.title} | ${rs.length} | ${count(rs, 'medicare_advantage', 'SHALL')} | ${count(rs, 'medicare_advantage', 'SHOULD')} | ` +
      `${count(rs, 'marketplace', 'SHALL')} | ${count(rs, 'marketplace', 'SHOULD')} |`);
  });
  L.push(`| Total | ${rows.length} | ${count(rows, 'medicare_advantage', 'SHALL')} | ${count(rows, 'medicare_advantage', 'SHOULD')} | ` +
    `${count(rows, 'marketplace', 'SHALL')} | ${count(rows, 'marketplace', 'SHOULD')} |`, '');

  ss.groups.forEach((g, i) => {
    L.push(`## ${i + 1}. ${g.title}`, '');
    L.push(codeify(g.intro), '');
    L.push('| Item | Field path | Meaning | Medicare Advantage | Marketplace | Note |');
    L.push('|---|---|---|---|---|---|');
    for (const r of groupRows(g.id)) {
      L.push(`| ${[r.item, r.path, r.meaning, r.cells.medicare_advantage, r.cells.marketplace, r.note].map(cell).join(' | ')} |`);
    }
    L.push('');
  });

  L.push('## Not in the CMS file', '');
  for (const p of PROGRAMS) {
    L.push(`${prog[p].name}:`, '');
    const seen = new Set();
    const items = notInFile.filter((n) => n.program === p && !seen.has(n.item) && seen.add(n.item));
    if (!items.length) L.push('- None.');
    for (const n of items) L.push(`- ${n.item}. ${n.text}`);
    L.push('');
  }

  L.push('## Known gaps', '');
  for (const g of ss.gaps) {
    const names = g.programs.map((p) => prog[p].name).join(' and ');
    L.push(`- **${g.id}** (${names}). ${codeify(g.title)} ${codeify(g.instead)}${g.proposed ? ` Proposed field: ${codeify(g.proposed)}` : ''}`);
  }
  L.push('');
  return L.join('\n');
}

function main(argv) {
  const outIdx = argv.indexOf('--out');
  const out = outIdx >= 0 ? path.resolve(argv[outIdx + 1]) : path.join(REPO_ROOT, DICTIONARY);
  const shown = path.relative(REPO_ROOT, out).split(path.sep).join('/');
  const r = build();
  if (r.errors) {
    for (const e of r.errors) console.error(`error: ${e}`);
    console.error(`${r.errors.length} error(s); ${DICTIONARY} not written.`);
    return 1;
  }
  if (argv.includes('--check')) {
    const onDisk = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null;
    if (onDisk !== r.text) {
      console.error(`${shown} differs from the generator's output; run node scripts/build-rtb-dictionary.js`);
      return 1;
    }
    console.log(`${shown} is up to date.`);
    return 0;
  }
  fs.writeFileSync(out, r.text);
  const by = (g) => r.rows.filter((x) => x.group === g).length;
  console.log(`wrote ${shown}: ${r.rows.length} rows ` +
    `(${[...new Set(r.rows.map((x) => x.group))].map((g) => `${g} ${by(g)}`).join(', ')})`);
  for (const p of PROGRAMS) {
    const seen = new Set();
    const items = r.notInFile.filter((n) => n.program === p && !seen.has(n.item) && seen.add(n.item)).map((n) => n.item);
    console.log(`not in the CMS file, ${p}: ${items.length ? items.join('; ') : 'none'}`);
  }
  console.log(`gaps: ${r.gaps.map((g) => g.id).join(', ')}`);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { build, standalone, repoLink, IN_REPO, REPOS };
