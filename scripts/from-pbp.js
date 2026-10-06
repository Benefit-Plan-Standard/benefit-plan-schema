#!/usr/bin/env node
/**
 * CMS Plan Benefit Package (PBP) Benefits to Benefit Plan Standard importer
 *
 * Reads the PBP Benefits files that CMS publishes for each contract year
 * (Medicare Advantage) and writes one Benefit Plan Standard v1.2.0 document for
 * one plan. It writes BPS JSON only. Spec: docs/specs/pbp-importer.md; file
 * layout: docs/specs/pbp-record-layout-notes.md.
 *
 * Phase 2, session 1: the plan-level half only (identity, plan type, service
 * area, plan year, deductibles, out-of-pocket maximums, network tiers). The
 * document's benefits[] is empty until session 2.
 *
 * The files are not in the repository. Put them in data/pbp/<year>/ (git-ignored),
 * unzipped, with a download.json that records the download date.
 *
 * buildDocument() is a pure function: no network, no clock, no randomness.
 *
 * Usage:
 *   node scripts/from-pbp.js --year 2027 --plan H2406-013-000 [--out <file>]
 *   node scripts/from-pbp.js --year 2027 --contract H2406        list the contract's plans
 *   options: --data <dir> (default data/pbp), --downloaded <YYYY-MM-DD> (default from download.json)
 *
 * Exit codes: 0 = written or listed, 1 = error (nothing is written).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DATA_DIR = path.join(REPO_ROOT, 'data', 'pbp');
const SCHEMA_VERSION = '1.2.0';
const PBP_ZIP = (year) => `https://www.cms.gov/files/zip/pbp-benefits-${year}.zip`;

// ---- tab-delimited text, Windows-1252, streamed ----------------------------------------
// Records end at CRLF. No quoting. A record whose field count differs from the
// header, or a stray CR or LF inside a record, is an error. Header names are
// lowercased; a name that appears twice must hold the same value in both places.
const DECODER = new TextDecoder('windows-1252');

async function streamTsv(file, onRow) {
  const name = path.basename(file);
  let header = null;
  let firstIndex = null;
  let dupPairs = [];
  let carry = '';
  let line = 0;
  const handle = (rec) => {
    line++;
    if (/[\r\n]/.test(rec)) throw new Error(`${name}: record ${line} holds a line break that is not CRLF`);
    const f = rec.split('\t');
    if (!header) {
      header = f.map((h) => h.trim().toLowerCase());
      firstIndex = new Map();
      header.forEach((h, i) => {
        if (firstIndex.has(h)) dupPairs.push([firstIndex.get(h), i, h]);
        else firstIndex.set(h, i);
      });
      return;
    }
    if (f.length !== header.length) throw new Error(`${name}: record ${line} has ${f.length} fields, the header has ${header.length}`);
    for (const [a, b, h] of dupPairs) {
      if (f[a] !== f[b]) throw new Error(`${name}: record ${line}: the 2 "${h}" columns disagree ("${f[a]}", "${f[b]}")`);
    }
    onRow(f, firstIndex);
  };
  const stream = fs.createReadStream(file, { highWaterMark: 1 << 20 });
  for await (const chunk of stream) {
    // Windows-1252 is 1 byte per character, so each chunk decodes on its own.
    const text = carry + DECODER.decode(chunk);
    const parts = text.split('\r\n');
    carry = parts.pop();
    for (const p of parts) handle(p);
  }
  if (carry !== '') handle(carry);
  if (!header) throw new Error(`${name}: empty file`);
}

// The rows of one file whose first 3 columns are the plan key, as objects keyed
// by lowercased column name. The file's segment is unpadded ("0"), so it is
// compared as a number.
async function rowsFor(file, key) {
  const out = [];
  await streamTsv(file, (f, idx) => {
    if (f[0] !== key.contract || f[1] !== key.plan) return;
    if (!/^\d{1,3}$/.test(f[2])) throw new Error(`${path.basename(file)}: segment_id "${f[2]}" is not 1 to 3 digits`);
    if (Number(f[2]) !== Number(key.segment)) return;
    const row = {};
    for (const [h, i] of idx) row[h] = f[i];
    out.push(row);
  });
  return out;
}

// ---- code lists, verbatim from PBP_Benefits_2027_dictionary.xlsx ------------------------
const PLAN_TYPE_LABELS = {
  '01': 'HMO', '02': 'HMOPOS', '04': 'Local PPO', '05': 'PSO (State License)', '07': 'MSA', '08': 'RFB PFFS',
  '09': 'PFFS', '18': '1876 Cost', '19': 'HCPP - 1833 Cost', '20': 'National Pace', '29': 'Medicare Prescription Drug Plan',
  '30': 'Employer/Union Only Direct Contract PDP', '31': 'Regional PPO', '32': 'Fallback',
  '40': 'Employer/Union Only Direct Contract PFFS', '42': 'RFB HMO', '43': 'RFB HMOPOS', '44': 'RFB Local PPO',
  '45': 'RFB PSO (State License)', '47': 'Employer Direct PPO',
};
// MVP plan types (spec section 1) and the BPS plan_type each one is written as.
// HMOPOS has no code in vocabularies/plan-types.json; the dictionary label is
// written verbatim (spec question P2).
const MVP_PLAN_TYPES = { '01': 'HMO', '02': 'HMOPOS', '04': 'PPO', '31': 'PPO' };
const PPO_TYPES = new Set(['04', '31']);
const DED_TYPES = {
  1: 'Medicare-Defined Part A Deductible amount',
  2: 'Medicare-Defined Part B Deductible amount',
  3: 'Medicare-Defined Part A and B Deductible amount combined as a single deductible',
  4: 'Other, Indicate amount',
};
const MOOP_TYPES = { 1: 'Lower', 2: 'Mandatory', 3: 'Intermediate' };
const HOSPITAL_TIER_CATEGORIES = [
  { code: '1a', file: 'pbp_b1a_inpat_hosp.txt', prefix: 'pbp_b1a', label: 'Inpatient Hospital-Acute' },
  { code: '1b', file: 'pbp_b1b_inpat_hosp.txt', prefix: 'pbp_b1b', label: 'Inpatient Hospital Psychiatric' },
  { code: '2', file: 'pbp_b2_snf.txt', prefix: 'pbp_b2', label: 'Skilled Nursing Facility (SNF)' },
];

// ---- small readers ------------------------------------------------------------------------
function q(row, col) {
  if (!(col in row)) throw new Error(`no column ${col}`);
  return row[col];
}

function cell(row, col) {
  const v = q(row, col);
  return `${col} "${v}"`;
}

// A NUM amount column: "1000.00" -> 1000. Blank -> null. Anything else is an error.
function amount(row, col, errors) {
  const v = q(row, col);
  if (v === '') return null;
  if (!/^\d+(\.\d{1,2})?$/.test(v)) { errors.push(`${col} "${v}" is not an amount`); return null; }
  return Number(v);
}

function yn(row, col, errors, allowBlank = true) {
  const v = q(row, col);
  if (v === '1' || v === '2' || (allowBlank && v === '')) return v;
  errors.push(`${col} "${v}" is not 1 (Yes) or 2 (No)${allowBlank ? ' or blank' : ''}`);
  return null;
}

function idFromName(s) {
  return s.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function pad3(seg) {
  return String(Number(seg)).padStart(3, '0');
}

// ---- accumulators (spec section 4.3) -------------------------------------------------------
function inNetworkSlot(amt) {
  return { amount: amt, currency: 'USD', network_tier: 'in-network', applies_to: 'medical' };
}

function outOfNetworkSlot(amt) {
  return { amount: amt, currency: 'USD', network_tier: 'out-of-network', applies_to: 'medical' };
}

// A deductible family with a Part B flag (in-network and out-of-network families).
// Returns { slot, note }.
function partBDeductible(d, fam, label, slotFn, errors) {
  const has = yn(d, `pbp_d_${fam}_deduct_yn`, errors);
  const partb = yn(d, `pbp_d_${fam}_deduct_partb_yn`, errors);
  const amt = amount(d, `pbp_d_${fam}_deduct_amt`, errors);
  const cells = [`pbp_d_${fam}_deduct_yn`, `pbp_d_${fam}_deduct_partb_yn`, `pbp_d_${fam}_deduct_amt`].map((c) => cell(d, c)).join(', ');
  if (has === '' || has === '2') {
    if (amt !== null) errors.push(`pbp_d_${fam}_deduct_amt has a value but pbp_d_${fam}_deduct_yn is "${has}"`);
    return { slot: null, note: has === '2' ? `${label}: the plan says it has none (${cells}); no slot is written.` : null };
  }
  if (partb === '1') {
    if (amt !== null) errors.push(`pbp_d_${fam}_deduct_amt has a value but the plan charges the Medicare-defined Part B deductible`);
    return {
      slot: null,
      note: `${label}: the plan charges the Medicare-defined Part B deductible amount, which the file does not state (${cells}); ` +
        'the slot needs an amount, so none is written (schema gap, spec section 9.1).',
    };
  }
  if (partb === '2' && amt !== null) return { slot: slotFn(amt), note: null };
  errors.push(`${label}: cannot read ${cells}`);
  return { slot: null, note: null };
}

// The PPO "annual plan deductible" family. Decision 2 (spec section 7): with a
// blank scope the amount is written with network_tier null and the file quoted.
function annualDeductible(d, errors) {
  const cols = ['pbp_d_ann_deduct_yn', 'pbp_d_ann_deduct_amt_type', 'pbp_d_ann_deduct_amt', 'pbp_d_ann_deduct_bens',
    'pbp_d_ann_deduct_inn_mc_yn', 'pbp_d_ann_deduct_inn_nmc_yn', 'pbp_d_ann_deduct_oon_nmc_yn'];
  const cells = cols.map((c) => cell(d, c)).join(', ');
  const has = yn(d, 'pbp_d_ann_deduct_yn', errors, false);
  const type = q(d, 'pbp_d_ann_deduct_amt_type');
  const amt = amount(d, 'pbp_d_ann_deduct_amt', errors);
  if (has === '2') {
    if (type !== '' || amt !== null) errors.push(`annual deductible: pbp_d_ann_deduct_yn "2" but type or amount is filled (${cells})`);
    return { slot: null, notes: [`Annual plan deductible: the plan says it has none (${cell(d, 'pbp_d_ann_deduct_yn')}); no slot is written.`] };
  }
  if (has !== '1') return { slot: null, notes: [] };
  if (!DED_TYPES[type]) { errors.push(`pbp_d_ann_deduct_amt_type "${type}" is not a dictionary code`); return { slot: null, notes: [] }; }
  if (type !== '4') {
    if (amt !== null) errors.push(`annual deductible type ${type} (${DED_TYPES[type]}) carries an amount (${cells})`);
    return {
      slot: null,
      notes: [`Annual plan deductible: type ${type} "${DED_TYPES[type]}", which the file does not state as a dollar amount (${cells}); ` +
        'the slot needs an amount, so none is written (schema gap, spec section 9.1).'],
    };
  }
  if (amt === null) { errors.push(`annual deductible type 4 has no amount (${cells})`); return { slot: null, notes: [] }; }
  const bens = q(d, 'pbp_d_ann_deduct_bens');
  if (bens !== '' && !/^[01]{3}$/.test(bens)) { errors.push(`pbp_d_ann_deduct_bens "${bens}" is not a 3-position string`); return { slot: null, notes: [] }; }
  const oonBit = bens[0] === '1';
  const innBit = bens[1] === '1' || bens[2] === '1';
  if (innBit && !oonBit) {
    return {
      slot: inNetworkSlot(amt),
      notes: [`Annual plan deductible: $${amt}, scope in network only (${cells}); written as individual_deductible, network_tier in-network.`],
    };
  }
  // Blank scope, or a scope that names out-of-network services: amount written, scope unstated.
  const why = bens === ''
    ? 'The file does not say which network or services the deductible applies to (pbp_d_ann_deduct_bens is blank)'
    : 'The scope names out-of-network services, so no single network slot fits';
  return {
    slot: { amount: amt, currency: 'USD', network_tier: null, applies_to: 'medical' },
    notes: [`Annual plan deductible: $${amt}, written as individual_deductible with network_tier null. ${why}. ` +
      `The file says: ${cells}. This reading is not yet confirmed against the plan's Summary of Benefits ` +
      '(docs/specs/pbp-importer.md section 7, TODO).'],
  };
}

function buildAccumulators(d, planType, errors) {
  const acc = {};
  const notes = [];
  const add = (slotName, r) => {
    if (r.slot) acc[slotName] = r.slot;
    for (const n of [].concat(r.note || [], r.notes || [])) if (n) notes.push(n);
  };

  if (PPO_TYPES.has(planType)) {
    add('individual_deductible', annualDeductible(d, errors));
    for (const fam of ['inn', 'oon', 'comb']) {
      if (q(d, `pbp_d_${fam}_deduct_yn`) !== '') errors.push(`a PPO with pbp_d_${fam}_deduct_yn filled; the spec expects the annual family only`);
    }
  } else {
    if (q(d, 'pbp_d_ann_deduct_yn') !== '') errors.push('an HMO or HMO-POS with pbp_d_ann_deduct_yn filled; the spec expects the in-network family');
    if (q(d, 'pbp_d_inn_deduct_yn') === '') errors.push('pbp_d_inn_deduct_yn is blank');
    add('individual_deductible', partBDeductible(d, 'inn', 'In-network deductible', inNetworkSlot, errors));
    add('oon_individual_deductible', partBDeductible(d, 'oon', 'Out-of-network deductible', outOfNetworkSlot, errors));
    const comb = yn(d, 'pbp_d_comb_deduct_yn', errors);
    const combAmt = amount(d, 'pbp_d_comb_deduct_amt', errors);
    if (comb === '1') {
      notes.push('Combined in-network and out-of-network deductible, no Benefit Plan Standard slot (schema gap, spec section 9.1): ' +
        ['pbp_d_comb_deduct_yn', 'pbp_d_comb_deduct_partb_yn', 'pbp_d_comb_deduct_amt'].map((c) => cell(d, c)).join(', ') + '.');
    } else if (comb === '2') {
      notes.push(`Combined in-network and out-of-network deductible: the plan says it has none (${cell(d, 'pbp_d_comb_deduct_yn')}).`);
      if (combAmt !== null) errors.push('pbp_d_comb_deduct_amt has a value but pbp_d_comb_deduct_yn is "2"');
    }
  }

  // In-network MOOP.
  const moop = yn(d, 'pbp_d_out_pocket_amt_yn', errors, false);
  const moopAmt = amount(d, 'pbp_d_out_pocket_amt', errors);
  const moopType = q(d, 'pbp_d_out_pocket_amt_type');
  if (moop === '1') {
    if (moopAmt === null) errors.push('pbp_d_out_pocket_amt_yn "1" but no amount');
    else acc.individual_oop_max = inNetworkSlot(moopAmt);
    if (moopType !== '' && !MOOP_TYPES[moopType]) errors.push(`pbp_d_out_pocket_amt_type "${moopType}" is not a dictionary code`);
    notes.push(`In-network out-of-pocket maximum type, no Benefit Plan Standard field (schema gap, spec section 9.1): ${cell(d, 'pbp_d_out_pocket_amt_type')}` +
      (MOOP_TYPES[moopType] ? ` (${MOOP_TYPES[moopType]})` : '') + '.');
  } else if (moop === '2') {
    notes.push(`In-network out-of-pocket maximum: the plan says it has none (${cell(d, 'pbp_d_out_pocket_amt_yn')}); no slot is written.`);
  }

  // Combined (in and out of network) MOOP: no slot.
  const comb = yn(d, 'pbp_d_comb_max_enr_amt_yn', errors);
  const combType = q(d, 'pbp_d_comb_max_enr_amt_type');
  if (comb === '1') {
    if (amount(d, 'pbp_d_comb_max_enr_amt', errors) === null) errors.push('pbp_d_comb_max_enr_amt_yn "1" but no amount');
    notes.push('Combined in-network and out-of-network out-of-pocket maximum, no Benefit Plan Standard slot (schema gap, spec section 9.1): ' +
      `${cell(d, 'pbp_d_comb_max_enr_amt')}; ${cell(d, 'pbp_d_comb_max_enr_amt_type')}` +
      (MOOP_TYPES[combType] ? ` (${MOOP_TYPES[combType]})` : '') + '.');
  } else if (comb === '2') {
    notes.push(`Combined out-of-pocket maximum: the plan says it has none (${cell(d, 'pbp_d_comb_max_enr_amt_yn')}).`);
  }

  // Out-of-network MOOP.
  const oon = yn(d, 'pbp_d_oon_max_enr_oopc_yn', errors);
  if (oon === '1') {
    const a = amount(d, 'pbp_d_oon_max_enr_oopc_amt', errors);
    if (a === null) errors.push('pbp_d_oon_max_enr_oopc_yn "1" but no amount');
    else acc.oon_individual_oop_max = outOfNetworkSlot(a);
  }

  // Schema order of the slots.
  const order = ['individual_deductible', 'family_deductible', 'individual_oop_max', 'family_oop_max',
    'oon_individual_deductible', 'oon_family_deductible', 'oon_individual_oop_max', 'oon_family_oop_max'];
  const accumulators = {};
  for (const k of order) if (acc[k]) accumulators[k] = acc[k];
  return { accumulators, notes };
}

// Every non-blank Section D cell of the deductible and out-of-pocket families,
// verbatim, in file order. Includes service-level and differential deductibles.
const ACCUMULATOR_PREFIXES = ['pbp_d_ann_deduct_', 'pbp_d_inn_deduct_', 'pbp_d_comb_deduct_', 'pbp_d_oon_deduct_',
  'pbp_d_non_deduct_', 'pbp_d_nmc_deduct_', 'pbp_d_diff_deduct_', 'pbp_d_mand_deduct_', 'pbp_d_deduct_',
  'pbp_d_out_pocket_', 'pbp_d_inn_max_enr_', 'pbp_d_comb_max_enr_', 'pbp_d_oon_max_enr_', 'pbp_d_maxenr_oopc_'];

function accumulatorCells(d) {
  return Object.keys(d)
    .filter((c) => ACCUMULATOR_PREFIXES.some((p) => c.startsWith(p)) && d[c] !== '')
    .map((c) => cell(d, c));
}

// ---- network tiers (spec section 4.2) ------------------------------------------------------
function buildTiers(c, hasOonRows, hasPosRows, hospital, errors) {
  const tiers = [{
    tier_id: 'IN',
    name: 'In-Network',
    description: 'The plan network. Cost sharing in the PBP Section B files (pbp_b*), which carry no network qualifier.',
    tier_class: 'network',
  }];
  const oonYn = c ? q(c, 'pbp_c_oon_yn') : '';
  const posYn = c ? q(c, 'pbp_c_pos_yn') : '';
  if (!['', '1', '2'].includes(oonYn)) errors.push(`pbp_c_oon_yn "${oonYn}" is not a dictionary code`);
  if (!['', '1', '2'].includes(posYn)) errors.push(`pbp_c_pos_yn "${posYn}" is not a dictionary code`);
  if (hasOonRows !== (oonYn === '1')) errors.push(`pbp_c_oon_yn "${oonYn}" but the plan has ${hasOonRows ? '' : 'no '}rows in pbp_Section_C_OON.txt`);
  if (hasPosRows !== (posYn === '1')) errors.push(`pbp_c_pos_yn "${posYn}" but the plan has ${hasPosRows ? '' : 'no '}rows in pbp_Section_C_POS.txt`);
  if (oonYn === '1') {
    tiers.push({
      tier_id: 'OUT',
      name: 'Out-of-Network',
      description: 'pbp_Section_C pbp_c_oon_yn "1". Cost sharing in pbp_Section_C (inpatient, SNF) and pbp_Section_C_OON (outpatient groups).',
      tier_class: 'network',
    });
  }
  if (posYn === '1') {
    tiers.push({
      tier_id: 'POS',
      name: 'Point-of-Service',
      description: 'pbp_Section_C pbp_c_pos_yn "1". Cost sharing in pbp_Section_C_POS (groups).',
      tier_class: 'network',
    });
  }
  for (const h of hospital) {
    const p = h.cat.prefix;
    const main = yn(h.row, `${p}_cost_vary_tiers_yn`, errors);
    const ad = yn(h.row, `${p}_ad_cost_vary_tiers_yn`, errors);
    if (main !== '1' && ad !== '1') continue;
    const mainNum = q(h.row, `${p}_cost_vary_tier_num`);
    const adNum = q(h.row, `${p}_ad_cost_vary_tier_num`);
    const low = q(h.row, `${p}_cost_vary_low_tier`);
    if (main === '1' && ad === '1' && mainNum !== adNum) errors.push(`${p}: ${mainNum} tiers for the stay but ${adNum} for additional days`);
    const num = main === '1' ? mainNum : adNum;
    if (!/^[23]$/.test(num)) { errors.push(`${p}: tier count "${num}" is not 2 or 3`); continue; }
    const cells = [`${p}_cost_vary_tiers_yn`, `${p}_cost_vary_tier_num`, `${p}_cost_vary_low_tier`, `${p}_ad_cost_vary_tiers_yn`, `${p}_ad_cost_vary_tier_num`]
      .map((col) => cell(h.row, col)).join(', ');
    const scope = main === '1' ? 'Medicare-covered stay' + (ad === '1' ? ' and additional days' : '') : 'additional days only';
    for (let t = 1; t <= Number(num); t++) {
      tiers.push({
        tier_id: `IN_${h.cat.code.toUpperCase()}_TIER_${t}`,
        name: `${h.cat.label}, cost-sharing tier ${t}`,
        description: `Service category ${h.cat.code}: cost sharing varies by the hospital or facility used (${scope}). ` +
          `${cells}${low === String(t) ? '; this is the lowest-cost tier' : ''}. The file does not name the facilities in each tier.`,
        tier_class: 'cost_designation',
        parent_tier_id: 'IN',
      });
    }
  }
  return tiers;
}

// ---- service area -------------------------------------------------------------------------
// PlanArea.county_code is the SSA state and county code, not FIPS (spec section
// 4.1), so fips is null and the code goes to source_references.
function buildServiceArea(areaRows, regionRows, year, errors) {
  const years = new Set([...areaRows, ...regionRows].map((r) => r.contract_year));
  if (years.size !== 1) errors.push(`contract_year values ${[...years].join(', ') || '(none)'}: expected exactly 1`);
  const planYear = years.size === 1 ? Number([...years][0]) : null;
  if (planYear !== null && planYear !== year) errors.push(`contract_year ${planYear} is not --year ${year}`);
  const counties = new Map();
  for (const r of areaRows) {
    if (!/^\d{5}$/.test(r.county_code)) errors.push(`county_code "${r.county_code}" is not 5 digits`);
    const k = r.county_code;
    const prev = counties.get(k);
    const entry = prev || { code: k, name: r.county, state: r.stcd, partial: new Set(), eghp: new Set() };
    if (prev && (prev.name !== r.county || prev.state !== r.stcd)) errors.push(`county_code ${k} has 2 names`);
    entry.partial.add(r.partial_flag);
    entry.eghp.add(r.eghp_flag);
    counties.set(k, entry);
  }
  const list = [...counties.values()].sort((a, b) => (a.code < b.code ? -1 : 1));
  const states = [...new Set(list.map((c) => c.state))];
  const regions = [...new Set(regionRows.map((r) => `${r.ma_or_pdp_region_code} "${r.region}" (region_type "${r.region_type}")`))];
  let service_area = null;
  if (list.length) {
    service_area = {
      state: states.length === 1 ? states[0] : null,
      counties: list.map((c) => ({ name: c.name, fips: null })),
    };
  }
  const parts = [];
  if (list.length) {
    parts.push(`Service area from PlanArea.txt, ${list.length} ${list.length === 1 ? 'county' : 'counties'} in ${states.join(', ')}. ` +
      'county_code is the SSA state and county code, not FIPS, so service_area.counties[].fips is null. ' +
      'Each county as county_code, county, stcd, and the partial_flag and eghp_flag values on its rows: ' +
      list.map((c) => `${c.code} ${c.name} ${c.state} partial_flag ${[...c.partial].map((v) => `"${v}"`).join('/')} ` +
        `eghp_flag ${[...c.eghp].map((v) => `"${v}"`).join('/')}`).join('; ') + '.');
    if (states.length > 1) parts.push('The service area spans more than 1 state; service_area.state holds 1 state, so it is null (schema gap, spec section 9.1).');
  }
  if (regions.length) parts.push(`Service area from PlanRegionArea.txt (regions, no counties; schema gap, spec section 9.1): ${regions.join('; ')}.`);
  return { service_area, planYear, excerpt: parts.join(' ') || null };
}

// ---- document --------------------------------------------------------------------------------
const SECTION_A_UNCARRIED = ['bid_id', 'version', 'orgtype', 'pbp_a_org_name', 'pbp_a_org_type', 'pbp_a_ben_cov',
  'pbp_a_network_flag', 'pbp_a_plan_geog_name', 'pbp_a_segment_name', 'pbp_a_eghp_yn', 'pbp_a_special_need_flag',
  'pbp_a_special_need_plan_type', 'pbp_a_snp_institutional_type', 'pbp_a_snp_cond', 'pbp_a_snp_pct',
  'pbp_a_dsnp_zerodollar', 'pbp_a_snp_state_cvg_yn', 'pbp_a_contract_partd_flag', 'pbp_a_hospice_care_yn',
  'pbp_a_continue_yn', 'pbp_a_org_website', 'pbp_a_phys_web_addr', 'pbp_a_formulary_web_addr', 'pbp_a_pharmacy_website'];

function planIdFor(a, keyText) {
  const suffix = '_' + keyText.replace(/-/g, '_');
  let name = idFromName(a.pbp_a_plan_name);
  while (name.length + suffix.length > 64 && name.includes('_')) name = name.slice(0, name.lastIndexOf('_'));
  if (name.length + suffix.length > 64) name = '';
  return (name + suffix).replace(/^_/, '');
}

/**
 * rows:   { a, d, c, hasOonRows, hasPosRows, hospital: [{cat, row}], area: [...], region: [...] }
 *         each row an object keyed by lowercased column name
 * source: { year, downloaded, releaseLabel }
 * Returns { doc, errors }. When errors is non-empty, doc is null.
 */
function buildDocument(rows, source) {
  const errors = [];
  const { a, d } = rows;
  const key = { contract: a.pbp_a_hnumber, plan: a.pbp_a_plan_identifier, segment: pad3(a.segment_id) };
  const keyText = `${key.contract}-${key.plan}-${key.segment}`;
  const planType = a.pbp_a_plan_type;
  if (!MVP_PLAN_TYPES[planType]) {
    errors.push(`plan type ${planType} (${PLAN_TYPE_LABELS[planType] || 'not in the dictionary'}) is outside the importer's scope: ` +
      'HMO, HMOPOS, Local PPO and Regional PPO only (spec section 1)');
    return { doc: null, errors };
  }
  if (!d) errors.push('no pbp_Section_D.txt row');
  for (const col of ['pbp_a_plan_name', 'pbp_a_org_marketing_name']) if (!a[col] || !a[col].trim()) errors.push(`${col} is blank`);
  if (errors.length) return { doc: null, errors };

  const { accumulators, notes: accNotes } = buildAccumulators(d, planType, errors);
  const network_tiers = buildTiers(rows.c, rows.hasOonRows, rows.hasPosRows, rows.hospital, errors);
  const area = buildServiceArea(rows.area, rows.region, source.year, errors);
  if (errors.length) return { doc: null, errors };
  // HMO-POS plans declare POS and never an out-of-network benefit, yet some fill
  // Section D's out-of-network families. The slot keeps the file's wording; the
  // note says so (spec section 4.3, question A3).
  if (!network_tiers.some((t) => t.tier_id === 'OUT')) {
    const oonSlots = Object.keys(accumulators).filter((k) => k.startsWith('oon_'));
    const combMoop = q(d, 'pbp_d_comb_max_enr_amt_yn') === '1';
    if (oonSlots.length || combMoop) {
      accNotes.push(`The plan declares no out-of-network benefit (pbp_Section_C pbp_c_oon_yn "${rows.c ? rows.c.pbp_c_oon_yn : ''}")` +
        `${network_tiers.some((t) => t.tier_id === 'POS') ? ' but does declare a point-of-service option (pbp_c_pos_yn "1")' : ''}, ` +
        `yet Section D fills ${[...oonSlots, ...(combMoop ? ['the combined out-of-pocket maximum'] : [])].join(' and ')}. ` +
        'The values are written with the file\'s own network wording; whether they apply to the point-of-service option is not stated in the file.');
    }
  }

  const doc = {};
  doc.plan_id = planIdFor(a, keyText);
  doc.plan_identifiers = [
    { system: 'cms_contract_plan_segment', value: keyText },
    { system: 'cms_contract_id', value: key.contract },
    { system: 'cms_pbp_id', value: key.plan },
  ];
  doc.plan_name = a.pbp_a_plan_name.trim();
  doc.carrier = a.pbp_a_org_marketing_name.trim();
  doc.plan_type = MVP_PLAN_TYPES[planType];
  doc.plan_year = area.planYear;
  doc.market = 'medicare_advantage';
  if (area.service_area) doc.service_area = area.service_area;
  doc.network_tiers = network_tiers;
  doc.accumulators = accumulators;
  doc.benefits = [];

  const excerpts = [
    `CMS Plan Benefit Package (PBP) Benefits, contract year ${source.year}, release "${source.releaseLabel}" ` +
      `(${PBP_ZIP(source.year)}), downloaded ${source.downloaded}. Files read: pbp_Section_A.txt, pbp_Section_C.txt, ` +
      'pbp_Section_C_OON.txt, pbp_Section_C_POS.txt, pbp_Section_D.txt, pbp_b1a_inpat_hosp.txt, pbp_b1b_inpat_hosp.txt, ' +
      `pbp_b2_snf.txt, PlanArea.txt, PlanRegionArea.txt. PBP key: pbp_a_hnumber "${a.pbp_a_hnumber}", ` +
      `pbp_a_plan_identifier "${a.pbp_a_plan_identifier}", segment_id "${a.segment_id}" (written padded to 3 digits in plan_identifiers).`,
    `Plan type: pbp_a_plan_type "${planType}" (${PLAN_TYPE_LABELS[planType]}), written as plan_type "${MVP_PLAN_TYPES[planType]}".`,
    'Section A values with no Benefit Plan Standard field, verbatim: ' +
      SECTION_A_UNCARRIED.filter((col) => (a[col] || '') !== '').map((col) => cell(a, col)).join('; ') + '.',
    area.excerpt,
    ...accNotes,
    'Every non-blank Section D deductible and out-of-pocket cell, verbatim, in file order: ' + accumulatorCells(d).join('; ') + '.',
    'Benefits are not yet imported: this document holds the plan level only (importer phase 2, session 1).',
  ];
  doc.source_references = excerpts.filter(Boolean).map((excerpt) => ({ excerpt }));
  doc.schema_version = SCHEMA_VERSION;
  return { doc, errors: [] };
}

function serialize(doc) {
  return JSON.stringify(doc, null, 2) + '\n';
}

// ---- reading the files ------------------------------------------------------------------------
function pbpDir(dataDir, year) {
  const dir = path.join(dataDir, String(year));
  if (!fs.existsSync(dir)) throw new Error(`no folder ${path.relative(REPO_ROOT, dir)}; download the contract year ${year} files first (spec section 11)`);
  const names = fs.readdirSync(dir);
  const find = (name) => {
    const hits = names.filter((f) => f.toLowerCase() === name.toLowerCase());
    if (hits.length !== 1) throw new Error(`expected 1 file named ${name} (any case) in ${path.relative(REPO_ROOT, dir)}, found ${hits.length}`);
    return path.join(dir, hits[0]);
  };
  return { dir, find };
}

function readManifest(dir, override) {
  const manifest = path.join(dir, 'download.json');
  const m = fs.existsSync(manifest) ? JSON.parse(fs.readFileSync(manifest, 'utf8')) : {};
  const downloaded = override || m.downloaded;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(downloaded || '')) throw new Error(`no download date: pass --downloaded YYYY-MM-DD or add "downloaded" to ${path.relative(REPO_ROOT, manifest)}`);
  return { downloaded, releaseLabel: m.release_label || '(not recorded)' };
}

function parseKey(s) {
  const m = /^([A-Z]\d{4})-(\d{3})-(\d{3})$/.exec(s || '');
  if (!m) throw new Error(`--plan must be contract-plan-segment, for example H2406-013-000; got "${s}"`);
  return { contract: m[1], plan: m[2], segment: m[3] };
}

async function loadPlan({ dataDir = DATA_DIR, year, plan, downloaded }) {
  const key = parseKey(plan);
  const { dir, find } = pbpDir(dataDir, year);
  const one = async (file, required) => {
    const r = await rowsFor(find(file), key);
    if (r.length > 1) throw new Error(`${file}: ${r.length} rows for ${plan}`);
    if (required && r.length === 0) throw new Error(`no plan ${plan} in ${file}`);
    return r[0] || null;
  };
  const a = await one('pbp_Section_A.txt', true);
  const rows = {
    a,
    d: await one('pbp_Section_D.txt', false),
    c: await one('pbp_Section_C.txt', false),
    hasOonRows: (await rowsFor(find('pbp_Section_C_OON.txt'), key)).length > 0,
    hasPosRows: (await rowsFor(find('pbp_Section_C_POS.txt'), key)).length > 0,
    hospital: [],
    area: await rowsFor(find('PlanArea.txt'), key),
    region: await rowsFor(find('PlanRegionArea.txt'), key),
  };
  for (const cat of HOSPITAL_TIER_CATEGORIES) {
    const row = await one(cat.file, false);
    if (row) rows.hospital.push({ cat, row });
  }
  return { rows, source: { year, ...readManifest(dir, downloaded) } };
}

async function importPlan(opts) {
  const { rows, source } = await loadPlan(opts);
  const { doc, errors } = buildDocument(rows, source);
  if (errors.length) throw new Error(`${opts.plan} cannot be imported:\n  ${errors.join('\n  ')}`);
  return doc;
}

async function listPlans({ dataDir = DATA_DIR, year, contract }) {
  const { find } = pbpDir(dataDir, year);
  const out = [];
  await streamTsv(find('pbp_Section_A.txt'), (f, idx) => {
    if (f[0] !== contract) return;
    const r = {};
    for (const [h, i] of idx) r[h] = f[i];
    out.push(r);
  });
  out.sort((x, y) => (x.pbp_a_plan_identifier + pad3(x.segment_id) < y.pbp_a_plan_identifier + pad3(y.segment_id) ? -1 : 1));
  return out;
}

// ---- schema check (local files, no network) ------------------------------------------------
function validateDocument(doc) {
  const Ajv2020 = require('ajv/dist/2020');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  try { require('ajv-formats')(ajv); } catch (e) { /* optional */ }
  const schema = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'schema', 'v' + SCHEMA_VERSION, 'benefit-plan.schema.json'), 'utf8'));
  const validate = ajv.compile(schema);
  return validate(doc) ? [] : validate.errors.map((e) => `${e.instancePath || '(root)'} ${e.message}`);
}

// ---- CLI ----------------------------------------------------------------------------------------
async function main(argv) {
  const opt = {};
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i];
    if (x === '--year') opt.year = Number(argv[++i]);
    else if (x === '--plan') opt.plan = argv[++i];
    else if (x === '--contract') opt.contract = argv[++i];
    else if (x === '--out' || x === '-o') opt.out = argv[++i];
    else if (x === '--data') opt.dataDir = path.resolve(argv[++i]);
    else if (x === '--downloaded') opt.downloaded = argv[++i];
    else if (x === '-h' || x === '--help') {
      console.log('usage: node scripts/from-pbp.js --year <YYYY> --plan <H1234-567-000> [--out <file>]\n' +
        '       node scripts/from-pbp.js --year <YYYY> --contract <H1234>\n' +
        '       options: --data <dir> (default data/pbp), --downloaded <YYYY-MM-DD>');
      return 0;
    } else {
      console.error(`error: unknown argument "${x}"`);
      return 1;
    }
  }
  try {
    if (!opt.year) throw new Error('--year is required');
    if (opt.contract) {
      if (!/^[A-Z]\d{4}$/.test(opt.contract)) throw new Error(`--contract must be like H2406; got "${opt.contract}"`);
      const rows = await listPlans(opt);
      if (rows.length === 0) { console.log(`no plans for contract ${opt.contract} in contract year ${opt.year}`); return 0; }
      for (const r of rows) {
        console.log([`${r.pbp_a_hnumber}-${r.pbp_a_plan_identifier}-${pad3(r.segment_id)}`,
          `${r.pbp_a_plan_type} ${PLAN_TYPE_LABELS[r.pbp_a_plan_type] || '?'}`,
          r.pbp_a_eghp_yn === '1' ? 'employer' : 'individual',
          r.pbp_a_special_need_flag === '1' ? 'SNP' : '-',
          r.pbp_a_plan_name, r.pbp_a_segment_name].join('\t'));
      }
      return 0;
    }
    if (!opt.plan) throw new Error('give --plan <contract-plan-segment>, or --contract <contract> to list plans');
    const doc = await importPlan(opt);
    const errs = validateDocument(doc);
    if (errs.length) throw new Error(`output fails the v${SCHEMA_VERSION} schema:\n  ${errs.join('\n  ')}`);
    const text = serialize(doc);
    if (opt.out) fs.writeFileSync(opt.out, text);
    else process.stdout.write(text);
    return 0;
  } catch (e) {
    console.error('error: ' + e.message);
    return 1;
  }
}

module.exports = {
  streamTsv, rowsFor, buildDocument, serialize, loadPlan, importPlan, listPlans, validateDocument, parseKey, pad3,
  HOSPITAL_TIER_CATEGORIES, MVP_PLAN_TYPES,
  DATA_DIR, SCHEMA_VERSION,
};

if (require.main === module) main(process.argv.slice(2)).then((code) => process.exit(code));
