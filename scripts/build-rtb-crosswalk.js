#!/usr/bin/env node
/**
 * Generates the medical MVP crosswalk to the SBC InsurancePlan profile,
 * docs/specs/rtb-medical-mvp/carin-crosswalk.md, from docs/specs/rtb-medical-mvp/shall-should.json,
 * docs/specs/rtb-medical-mvp/carin-mapping.json and fhir/carin-sbc-crosswalk.json. Item names and
 * field paths come from scripts/build-rtb-dictionary.js, so the crosswalk and the data dictionary
 * list the same rows in the same order. Deterministic: the same inputs give the same bytes.
 *
 * Usage:
 *   node scripts/build-rtb-crosswalk.js                write carin-crosswalk.md
 *   node scripts/build-rtb-crosswalk.js --check        exit 1 if the file on disk differs
 *   node scripts/build-rtb-crosswalk.js --out <file>   write to <file> instead
 *
 * Exits 1 without writing, and names the item, when:
 *   - the data dictionary generator reports an error;
 *   - an item applies to a program and carin-mapping.json has no entry for it, or has one for a program it does not apply to;
 *   - a verdict, reason, extension or ballot ticket is not one carin-mapping.json defines;
 *   - a cited passage is not in the cited section (the converter specification is silent), or a cited Bundle value differs;
 *   - a service or extra benefit's verdict is not the one fhir/carin-sbc-crosswalk.json and shall-should.json give;
 *   - an entry is "not covered, gap" without a gap in shall-should.json, or has a gap and another verdict;
 *   - a quoted item is not "different" in bps-source-reference;
 *   - FHIR-57526 is named on an entry whose cost does not reach plan.specificCost.benefit.cost, or is missing from
 *     one whose cost does; FHIR-57525 likewise for cost.qualifiers; FHIR-57527 anywhere but the limit rows;
 *   - a file a verdict is read from is not named in the document, so it cannot be introduced where first named.
 * Spec: docs/specs/rtb-medical-mvp/README.md
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { build: buildDictionary, standalone, repoLink, IN_REPO, REPOS } = require('./build-rtb-dictionary.js');

const REPO_ROOT = path.resolve(__dirname, '..');
const SPEC_DIR = 'docs/specs/rtb-medical-mvp';
const SHALL_SHOULD = `${SPEC_DIR}/shall-should.json`;
const MAPPING = `${SPEC_DIR}/carin-mapping.json`;
const CROSSWALK = `${SPEC_DIR}/carin-crosswalk.md`;
const SBC_CROSSWALK = 'fhir/carin-sbc-crosswalk.json';
const DEFINITIONS = 'fhir/definitions';
const PROGRAMS = ['medicare_advantage', 'marketplace'];
const BENEFIT_GROUPS = ['services', 'extras'];
const VERDICTS = ['aligned', 'different', 'not_covered'];
const SPECIFIC_COST = 'plan.specificCost.benefit.cost';
const QUALIFIERS = `${SPECIFIC_COST}.qualifiers`;

const ENTRY_PROPS = new Set(['element', 'extension', 'verdict', 'reason', 'note', 'ballot', 'read_from']);
const EXTRA_ENTRY_PROPS = new Set(['covered', 'cost', 'limits']);
const ITEM_PROPS = new Set(['id', 'note', 'read_from', ...PROGRAMS]);

const readText = (rel) => fs.readFileSync(path.join(REPO_ROOT, rel), 'utf8');
const readJson = (rel) => JSON.parse(readText(rel));
const arr = (v) => (v === undefined || v === null ? [] : Array.isArray(v) ? v : [v]);
const code = (s) => `\`${s}\``;
const cell = (s) => String(s).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ').trim();
const sentence = (s) => (s && !/[.!?]$/.test(s) ? `${s}.` : s);
const upperFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const fill = (s, vars) => (s ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s);
const listText = (xs) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// Stable JSON text, keys sorted, for comparing a cited Bundle value with the expected one.
const stable = (v) => (Array.isArray(v) ? `[${v.map(stable).join(',')}]`
  : v && typeof v === 'object' ? `{${Object.keys(v).sort().map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`
    : JSON.stringify(v));

// The text of each numbered section of a Markdown document, by number ("6.1"), up to the next heading
// of the same or a higher level.
function sectionsOf(markdown) {
  const lines = markdown.split('\n');
  const heads = [];
  lines.forEach((l, i) => {
    const m = /^(#{2,4}) (\d+(?:\.\d+)*)\.? /.exec(l);
    if (m) heads.push({ i, level: m[1].length, num: m[2] });
  });
  const out = new Map();
  heads.forEach((h, k) => {
    const next = heads.slice(k + 1).find((n) => n.level <= h.level);
    out.set(h.num, lines.slice(h.i, next ? next.i : lines.length).join('\n'));
  });
  return out;
}

// Reads a value out of a JSON document by a path such as entry[0].resource.plan[0].type.
function valueAt(doc, p) {
  let v = doc;
  for (const seg of p.replace(/\[(\d+)\]/g, '.$1').split('.')) {
    if (v === undefined || v === null) return undefined;
    v = v[seg];
  }
  return v;
}

const sectionKey = (s) => s.split('.').map((n) => n.padStart(3, '0')).join('.');

function build() {
  const dict = buildDictionary();
  if (dict.errors) return { errors: dict.errors.map((e) => `data dictionary: ${e}`) };
  const ss = readJson(SHALL_SHOULD);
  const m = readJson(MAPPING);
  const sbc = readJson(SBC_CROSSWALK);
  const errors = [];
  const names = Object.fromEntries(PROGRAMS.map((p) => [p, ss.programs[p].name]));
  const groups = new Map(ss.groups.map((g) => [g.id, g]));
  const aspects = groups.get('extras').aspects;
  const gaps = new Map(ss.gaps.map((g) => [g.id, g]));
  const docs = new Map();
  const sectionText = (doc, num) => {
    if (!docs.has(doc)) docs.set(doc, sectionsOf(readText(doc)));
    return docs.get(doc).get(num);
  };
  const bundles = new Map();
  const tickets = m.ballot.tickets;

  // Extension names: Benefit Plan Standard ones must be defined in fhir/definitions, the others named in
  // converter specification section 10.1.
  const defined = new Set(fs.readdirSync(path.join(REPO_ROOT, DEFINITIONS)).filter((f) => f.endsWith('.json'))
    .map((f) => readJson(`${DEFINITIONS}/${f}`).url));
  for (const [name, url] of Object.entries(m.extensions)) {
    if (url.startsWith('https://benefitplanstandard.org/')) {
      if (!defined.has(url)) errors.push(`extension ${name}: ${url} is not defined in ${DEFINITIONS}`);
    } else if (!(sectionText(m.converter_spec, '10.1') || '').includes(url.split('/').pop())) {
      errors.push(`extension ${name}: ${url} is not named in ${m.converter_spec} section 10.1`);
    }
  }

  // A citation must point at a passage that is in the cited section, or at a Bundle value that matches.
  const checkCite = (where, c) => {
    if (c.bundle) {
      if (!bundles.has(c.bundle)) bundles.set(c.bundle, readJson(c.bundle));
      const got = valueAt(bundles.get(c.bundle), c.path);
      if (stable(got) !== stable(c.equals)) {
        errors.push(`${where}: ${c.bundle} ${c.path} is ${JSON.stringify(got)}, not ${JSON.stringify(c.equals)}`);
      }
      return;
    }
    const doc = c.doc || m.converter_spec;
    const text = sectionText(doc, c.section);
    if (text === undefined) errors.push(`${where}: ${doc} has no section ${c.section}`);
    else if (!text.includes(c.cites)) errors.push(`${where}: "${c.cites}" is not in ${doc} section ${c.section}`);
  };

  // Rows in the dictionary's order: identification, plan and network items first, then services and
  // extras, each extra benefit once per aspect. The dictionary rows supply the item name and field path.
  const seq = [];
  for (const it of ss.items.filter((x) => !BENEFIT_GROUPS.includes(x.group))) seq.push({ it, aspect: null });
  for (const it of ss.items.filter((x) => BENEFIT_GROUPS.includes(x.group))) {
    if (it.group === 'extras') for (const a of aspects) seq.push({ it, aspect: a });
    else seq.push({ it, aspect: null });
  }
  if (seq.length !== dict.rows.length) return { errors: [`${seq.length} items and aspects, but the data dictionary has ${dict.rows.length} rows`] };
  seq.forEach((s, i) => {
    if (dict.rows[i].group !== s.it.group) errors.push(`row ${i + 1}: the data dictionary has group ${dict.rows[i].group}, not ${s.it.group}`);
  });

  const onList = (it, p) => (it.group === 'extras' ? it[p].on_list : it[p].label !== null);

  // The mapping lists the same items as shall-should.json, in the same order.
  const mapItems = new Map();
  m.items.forEach((mi, i) => {
    if (!ss.items[i] || ss.items[i].id !== mi.id) errors.push(`${MAPPING}: item ${i + 1} is ${mi.id}, but ${SHALL_SHOULD} has ${ss.items[i] ? ss.items[i].id : 'no item'} there`);
    for (const k of Object.keys(mi)) if (!ITEM_PROPS.has(k)) errors.push(`${mi.id}: unknown property "${k}"`);
    mapItems.set(mi.id, mi);
  });
  if (m.items.length !== ss.items.length) errors.push(`${MAPPING} has ${m.items.length} items, ${SHALL_SHOULD} has ${ss.items.length}`);
  for (const it of ss.items) {
    const mi = mapItems.get(it.id);
    if (!mi) continue;
    for (const p of PROGRAMS) {
      if (onList(it, p) && !mi[p]) errors.push(`${it.id} (${names[p]}): the item applies to ${names[p]} and ${MAPPING} has no entry for it`);
      if (!onList(it, p) && mi[p]) errors.push(`${it.id} (${names[p]}): ${MAPPING} has an entry, but the item does not apply to ${names[p]}`);
    }
  }
  if (errors.length) return { errors };

  // The verdict that the crosswalk file and shall-should.json give a service or an extra benefit.
  const derived = (it, p) => {
    const e = it[p];
    if (e.gap) return { verdict: 'not_covered', reason: 'gap' };
    if (!(p === 'medicare_advantage' ? e.pbp_benefit_id : e.benefit_name)) return { verdict: 'not_covered', reason: 'no_element' };
    if (it.key && sbc.map[it.key]) return { verdict: 'aligned', rule: 'placed' };
    return { verdict: 'different', rule: 'unplaced' };
  };

  // Resolves 1 program's entry for 1 row into its element, verdict and note parts.
  const resolve = (it, aspect, p) => {
    const mi = mapItems.get(it.id);
    const where = `${it.id}${aspect ? ` ${aspect.id}` : ''} (${names[p]})`;
    const raw = mi[p];
    const e = it[p];
    let entry;
    let rule = null;
    if (it.group === 'extras') {
      for (const k of Object.keys(raw)) if (!EXTRA_ENTRY_PROPS.has(k)) errors.push(`${where}: unknown property "${k}"`);
      entry = { verdict: raw[aspect.id] };
    } else {
      for (const k of Object.keys(raw)) if (!ENTRY_PROPS.has(k)) errors.push(`${where}: unknown property "${k}"`);
      entry = raw;
    }
    if (!VERDICTS.includes(entry.verdict)) errors.push(`${where}: verdict "${entry.verdict}" is not aligned, different or not_covered`);
    if (entry.verdict === 'not_covered' && !m.reasons[entry.reason]) errors.push(`${where}: not_covered needs a reason, no_element or gap`);
    if (entry.verdict !== 'not_covered' && entry.reason) errors.push(`${where}: a reason is given for a ${entry.verdict} verdict`);
    if ((entry.reason === 'gap') !== Boolean(e.gap)) {
      errors.push(e.gap ? `${where}: shall-should.json records gap ${e.gap}, so the verdict is not_covered with reason gap`
        : `${where}: reason gap, but shall-should.json records no gap`);
    }

    if (BENEFIT_GROUPS.includes(it.group)) {
      const d = derived(it, p);
      if (d.verdict !== entry.verdict || (d.reason && d.reason !== entry.reason)) {
        errors.push(`${where}: verdict ${entry.verdict}${entry.reason ? ` (${entry.reason})` : ''}, but ${SBC_CROSSWALK} and shall-should.json give ` +
          `${d.verdict}${d.reason ? ` (${d.reason})` : ''}`);
      }
      if (d.rule) {
        const rules = it.group === 'services' ? m.benefit_rules.services : m.benefit_rules.extras[aspect.id];
        rule = rules && rules[d.rule];
        if (!rule) errors.push(`${where}: ${MAPPING} has no ${d.rule} rule for ${it.group}${aspect ? ` ${aspect.id}` : ''}`);
      }
    } else if (e.quoted && !e.gap) {
      rule = m.quoted;
    }
    if (rule && rule.verdict !== entry.verdict) errors.push(`${where}: verdict ${entry.verdict}, but the rule it falls under gives ${rule.verdict}`);
    if (!rule && entry.verdict !== 'not_covered' && !('element' in entry)) errors.push(`${where}: no element and no rule to supply one`);
    if (entry.verdict === 'not_covered' && !entry.note) errors.push(`${where}: a not_covered entry needs a note saying what travels today`);

    const vars = { key: it.key };
    const r = rule || {};
    const element = 'element' in entry ? arr(entry.element) : arr(r.element);
    const extension = [...('extension' in entry ? arr(entry.extension) : arr(r.extension)), ...arr((r.extension_by_program || {})[p])];
    const ballot = [...arr(r.ballot), ...arr(entry.ballot)];
    const readFrom = [...arr(r.read_from), ...arr((r.read_from_by_program || {})[p]), ...arr(mi.read_from), ...arr(entry.read_from)]
      .map((c) => (c.cites ? { ...c, cites: fill(c.cites, vars) } : c));
    if (!readFrom.length) errors.push(`${where}: nothing to read the verdict from`);
    for (const c of readFrom) checkCite(where, c);
    for (const x of extension) if (!m.extensions[x]) errors.push(`${where}: extension ${x} is not in ${MAPPING} extensions`);
    for (const t of ballot) if (!tickets[t]) errors.push(`${where}: ballot ticket ${t} is not in ${MAPPING}`);
    if (e.quoted && !e.gap && !(entry.verdict === 'different' && extension.includes('bps-source-reference'))) {
      errors.push(`${where}: the item is quoted in source_references, so the verdict is different in bps-source-reference`);
    }
    const reachesCost = entry.verdict !== 'not_covered' && element.includes(SPECIFIC_COST);
    if (reachesCost !== ballot.includes('FHIR-57526')) {
      errors.push(`${where}: ${reachesCost ? 'the cost reaches' : 'the cost does not reach'} ${SPECIFIC_COST}, so FHIR-57526 is ${reachesCost ? 'named' : 'not named'}`);
    }
    if (element.includes(QUALIFIERS) !== ballot.includes('FHIR-57525')) errors.push(`${where}: FHIR-57525 is named exactly where ${QUALIFIERS} is the element`);
    if (ballot.includes('FHIR-57527') && !(aspect && aspect.id === 'limits')) errors.push(`${where}: FHIR-57527 is named on the limit rows only`);

    let category = null;
    if (rule && rule === m.benefit_rules.services.placed) category = sbc.map[it.key];
    const ballotText = ballot.map((t) => sentence(`${tickets[t].sentence}, ${m.ballot.status}`)).join(' ');
    return {
      verdict: entry.verdict,
      reason: entry.reason,
      gap: e.gap || null,
      element,
      extension,
      category,
      ballot,
      readFrom,
      rowSentence: (r.row_sentence || {})[p] || null,
      parts: [
        e.gap ? sentence(fill(m.gap_sentence, { gap: e.gap })) : '',
        sentence(fill(r.note, vars)),
        sentence(fill((r.notes || {})[p], vars)),
        sentence(fill(entry.note, vars)),
        ballotText,
        sentence(r.after_ballot),
      ],
    };
  };

  const verdictText = (r) => (r.verdict === 'not_covered' ? `**not covered** (${r.reason === 'gap' ? `gap ${r.gap}` : 'no element'})` : `**${r.verdict}**`);
  const elementText = (r) => {
    const parts = r.element.map((x, i) => (i === 0 && r.category
      ? `${code(x)}, category ${code(r.category.category)}${r.category.type !== r.category.category ? ` and type ${code(r.category.type)}` : ''}`
      : code(x)));
    for (const x of r.extension) parts.push(`extension ${code(m.extensions[x])}`);
    return parts.length ? parts.join('; ') : 'None today';
  };
  const readFromText = (cites) => {
    const seen = new Set();
    const uniq = cites.filter((c) => {
      const k = c.bundle ? `b:${c.bundle}` : `${c.doc || ''}:${c.section}`;
      return !seen.has(k) && seen.add(k);
    });
    const spec = uniq.filter((c) => !c.doc && !c.bundle).map((c) => c.section).sort((a, b) => sectionKey(a).localeCompare(sectionKey(b)));
    const phrases = [];
    if (spec.length) phrases.push(`converter specification ${spec.length > 1 ? 'sections' : 'section'} ${listText(spec)}`);
    for (const c of uniq.filter((x) => x.doc)) phrases.push(`${code(c.doc)} section ${c.section}`);
    for (const c of uniq.filter((x) => x.bundle)) phrases.push(`the Bundle ${code(c.bundle)}`);
    return `Read from ${listText(phrases)}.`;
  };

  const rows = [];
  seq.forEach(({ it, aspect }, i) => {
    const ps = PROGRAMS.filter((p) => onList(it, p));
    const res = {};
    for (const p of ps) res[p] = resolve(it, aspect, p);
    const mi = mapItems.get(it.id);

    let verdict;
    if (ps.length === 2 && verdictText(res[ps[0]]) === verdictText(res[ps[1]])) verdict = verdictText(res[ps[0]]);
    else verdict = ps.map((p) => `${names[p]}: ${verdictText(res[p])}.`).join(' ');

    let element;
    if (ps.length === 1 || elementText(res[ps[0]]) === elementText(res[ps[1]])) element = elementText(res[ps[0]]);
    else element = ps.map((p) => `${names[p]}: ${elementText(res[p])}.`).join(' ');

    // Note parts the programs share are written once; the rest are written per program.
    const shared = [];
    const own = Object.fromEntries(ps.map((p) => [p, []]));
    const nParts = res[ps[0]].parts.length;
    for (let k = 0; k < nParts; k++) {
      const vals = ps.map((p) => res[p].parts[k]);
      if (k === 2 && mi.note) shared.push(sentence(mi.note));
      if (ps.length === 1 || vals[0] === vals[1]) { if (vals[0]) shared.push(vals[0]); }
      else ps.forEach((p, j) => { if (vals[j]) own[p].push(vals[j]); });
      if (k === 1) {
        const halves = ['marketplace', 'medicare_advantage'].filter((p) => ps.includes(p) && res[p].rowSentence).map((p) => res[p].rowSentence);
        if (halves.length) shared.push(sentence(upperFirst(halves.join('; '))));
      }
    }
    const noteParts = [...shared];
    if (ps.length === 2) for (const p of ps) if (own[p].length) noteParts.push(`${names[p]}: ${own[p].join(' ')}`);
    noteParts.push(readFromText(ps.flatMap((p) => res[p].readFrom)));

    rows.push({
      group: it.group,
      id: it.id,
      aspect: aspect ? aspect.id : null,
      item: dict.rows[i].item,
      path: dict.rows[i].path,
      element,
      verdict,
      note: noteParts.join(' '),
      res,
      programs: ps,
    });
  });

  // The extra benefits are all outside the crosswalk today; the limit rows say BenefitLimitation is never emitted.
  const extraKeys = ss.items.filter((x) => x.group === 'extras').map((x) => x.key);
  const placedExtras = extraKeys.filter((k) => sbc.map[k]);
  if (placedExtras.length) errors.push(`extra benefits ${placedExtras.join(', ')} are now in ${SBC_CROSSWALK}; the limit rows' note that BenefitLimitation is never emitted is stale`);

  // The files verdicts are read from, besides the converter specification, are introduced where the crosswalk first names them.
  const cited = new Map();
  for (const r of rows) {
    for (const x of Object.values(r.res)) {
      for (const c of x.readFrom) {
        if (c.doc) cited.set(c.doc, `${REPOS} ${repoLink(c.doc)}`);
        if (c.bundle) cited.set(c.bundle, `${repoLink(c.bundle)} ${IN_REPO}`);
      }
    }
  }
  const text = standalone(render(ss, m, sbc, rows, names), CROSSWALK, [...cited].map(([f, to]) => [code(f), to]), errors);
  if (errors.length) return { errors };
  return { text, rows };
}

function render(ss, m, sbc, rows, names) {
  const L = [];
  const count = (p, f) => rows.filter((r) => r.res[p] && f(r.res[p])).length;
  const both = rows.filter((r) => r.programs.length === 2);
  const split = both.filter((r) => !/^\*\*/.test(r.verdict));
  const only = (p) => rows.filter((r) => r.programs.length === 1 && r.programs[0] === p).length;
  const serviceKeys = ss.items.filter((x) => x.group === 'services' && x.key).map((x) => x.key);
  const extraKeys = ss.items.filter((x) => x.group === 'extras').map((x) => x.key);
  const extraRows = rows.filter((r) => r.group === 'extras').length;
  const tagged = (t) => rows.filter((r) => Object.values(r.res).some((x) => x.ballot.includes(t))).length;
  const mapped = Object.keys(sbc.map).length;

  L.push('# Medical MVP crosswalk to the SBC InsurancePlan profile', '');
  L.push('This crosswalk maps each item of the medical MVP data dictionary to the SBC InsurancePlan profile in the CARIN Digital Insurance Card ' +
    `implementation guide, package ${code(m.package)}. SBC stands for Summary of Benefits and Coverage. For each item it says where the value ` +
    `lands in the Bundle that ${REPOS} ${repoLink(m.converter)} writes from a Benefit Plan Standard document, and gives 1 of 3 verdicts. ${m.attribution}`, '');
  L.push('The crosswalk to the SBC InsurancePlan profile is a Part B item in the workgroup\'s GA draft, the document "RTB Medical. ' +
    'What payers would be asked to supply for GA" (Monica Chopra, October 2026, a draft for discussion, not a workgroup decision), not a GA ask. The profile is at ballot. ' +
    'This crosswalk exists so a pledgee can produce the Bundle when the profile publishes, and nothing in the MVP\'s SHALL list depends on it.', '');
  L.push('The whole profile is ballot-stage. The profile, its extensions and the code systems it binds are draft and experimental in that package ' +
    `(${repoLink(m.converter_spec, 'converter specification')} section 2, ${IN_REPO}). ` +
    '3 changes to the profile were proposed from Benefit Plan Standard implementation experience and merged in June 2026: ' +
    `${Object.entries(m.ballot.tickets).map(([t, x]) => `${x.title} (${t})`).join(', ').replace(/, ([^,]*)$/, ' and $1')}. ` +
    'They are in the STU2 ballot of September 2026, not in a published release, and each row they apply to names them.', '');
  L.push(`The crosswalk is generated from the Benefit Plan Standard repository by ${repoLink('scripts/build-rtb-crosswalk.js')} from ${repoLink(SHALL_SHOULD, code('shall-should.json'))} and ` +
    `${repoLink(MAPPING, code('carin-mapping.json'))} in the same repository folder and ${repoLink(SBC_CROSSWALK)} (${mapped} canonical keys mapped to the profile's ` +
    `benefit categories), all ${IN_REPO}. The item names and field paths are the data ` +
    `dictionary's, so the 2 files list the same rows in the same order. To change it, change those files and run the generator again.`, '');

  L.push('## How to read it', '');
  L.push(`- **aligned**. ${m.verdicts.aligned}`);
  L.push(`- **different**. ${m.verdicts.different}`);
  L.push(`- **not covered**. ${m.verdicts.not_covered} The verdict adds "no element" when ${m.reasons.no_element}, and "gap" when ${m.reasons.gap}. ${m.gap_note}`);
  L.push('- A row that applies to 1 program names the program in the Verdict cell. Where the 2 programs get different verdicts, the cell gives both, ' +
    'the same way the data dictionary splits field paths.');
  L.push(`- The SBC InsurancePlan element is a FHIR path inside ${code('InsurancePlan')}. When the value travels in an extension, the cell gives the ` +
    'extension\'s URL. "None today" means the Bundle has nothing for the item.');
  L.push(`- A benefit is placed in ${code('coverage.benefit')} and ${code('plan.specificCost.benefit')} only when its canonical key is in ${code(SBC_CROSSWALK)}, ` +
    `and only placed benefits have ${code('cost')} entries. Any other benefit is listed by identity in ${code('bps-unmapped-benefit')} (converter specification section 8.3).`);
  L.push(`- Marketplace Bundles are written with ${code('--excluded-services')}, as in the README's commands.`);
  L.push(`- "Read from" names the sections of the converter specification, ${code(m.converter_spec)}, that state the mapping, and any other file the verdict is read from.`, '');

  L.push('## Summary', '');
  L.push(`The crosswalk has ${rows.length} rows, 1 for each row of the data dictionary. ${both.length} rows apply to both programs, ` +
    `${only('medicare_advantage')} to Medicare Advantage only and ${only('marketplace')} to Marketplace only. On ${split.length} of the ${both.length} ` +
    'the 2 programs get different verdicts.', '');
  L.push(`| | ${PROGRAMS.map((p) => names[p]).join(' | ')} |`);
  L.push('|---|---|---|');
  const line = (label, f) => L.push(`| ${label} | ${PROGRAMS.map((p) => count(p, f)).join(' | ')} |`);
  line('Rows that apply', () => true);
  line('Aligned', (x) => x.verdict === 'aligned');
  line('Different', (x) => x.verdict === 'different');
  line('Not covered', (x) => x.verdict === 'not_covered');
  line('Not covered, no element', (x) => x.verdict === 'not_covered' && x.reason === 'no_element');
  line('Not covered, gap', (x) => x.verdict === 'not_covered' && x.reason === 'gap');
  L.push('');
  L.push('| Section | Rows | Medicare Advantage aligned | Medicare Advantage different | Medicare Advantage not covered | Marketplace aligned | Marketplace different | Marketplace not covered |');
  L.push('|---|---|---|---|---|---|---|---|');
  ss.groups.forEach((g, i) => {
    const rs = rows.filter((r) => r.group === g.id);
    const c = (p, v) => rs.filter((r) => r.res[p] && r.res[p].verdict === v).length;
    L.push(`| ${i + 1}. ${g.title} | ${rs.length} | ${PROGRAMS.flatMap((p) => VERDICTS.map((v) => c(p, v))).join(' | ')} |`);
  });
  L.push('');
  const placedServices = serviceKeys.filter((k) => sbc.map[k]).length;
  L.push(`None of the ${extraKeys.length} extra-benefit keys is in ${code(SBC_CROSSWALK)}, so all ${extraRows} extra-benefit rows are different and the ` +
    `BenefitLimitation extension is never emitted for them. Of the ${serviceKeys.length} service keys, ${placedServices} are in it and ` +
    `${serviceKeys.length - placedServices} are not. FHIR-57526 is named on ${tagged('FHIR-57526')} rows, FHIR-57525 on ${tagged('FHIR-57525')} ` +
    `and FHIR-57527 on ${tagged('FHIR-57527')}.`, '');

  ss.groups.forEach((g, i) => {
    L.push(`## ${i + 1}. ${g.title}`, '');
    L.push(g.intro, '');
    L.push('| Item | Benefit Plan Standard field path | SBC InsurancePlan element | Verdict | Note |');
    L.push('|---|---|---|---|---|');
    for (const r of rows.filter((x) => x.group === g.id)) {
      L.push(`| ${[r.item, r.path, r.element, r.verdict, r.note].map(cell).join(' | ')} |`);
    }
    L.push('');
  });
  return L.join('\n');
}

function main(argv) {
  const outIdx = argv.indexOf('--out');
  const out = outIdx >= 0 ? path.resolve(argv[outIdx + 1]) : path.join(REPO_ROOT, CROSSWALK);
  const shown = path.relative(REPO_ROOT, out).split(path.sep).join('/');
  const r = build();
  if (r.errors) {
    for (const e of r.errors) console.error(`error: ${e}`);
    console.error(`${r.errors.length} error(s); ${CROSSWALK} not written.`);
    return 1;
  }
  if (argv.includes('--check')) {
    const onDisk = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : null;
    if (onDisk !== r.text) {
      console.error(`${shown} differs from the generator's output; run node scripts/build-rtb-crosswalk.js`);
      return 1;
    }
    console.log(`${shown} is up to date.`);
    return 0;
  }
  fs.writeFileSync(out, r.text);
  const tally = PROGRAMS.map((p) => {
    const xs = r.rows.filter((x) => x.res[p]).map((x) => x.res[p]);
    const n = (f) => xs.filter(f).length;
    return `${p} ${xs.length}: aligned ${n((x) => x.verdict === 'aligned')}, different ${n((x) => x.verdict === 'different')}, ` +
      `not covered ${n((x) => x.verdict === 'not_covered')} (no element ${n((x) => x.reason === 'no_element')}, gap ${n((x) => x.reason === 'gap')})`;
  });
  console.log(`wrote ${shown}: ${r.rows.length} rows`);
  for (const t of tally) console.log(t);
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));

module.exports = { build };
