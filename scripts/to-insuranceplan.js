#!/usr/bin/env node
/**
 * Benefit Plan Standard to FHIR R4 InsurancePlan (CARIN SBC profile) converter
 *
 * Converts one BPS document (v1.1.0 or v1.2.0) into a FHIR collection Bundle
 * holding one InsurancePlan and the Organization it references. The target
 * profile is the CARIN Digital Insurance Card SBC InsurancePlan profile, which
 * exists only in hl7.fhir.us.insurance-card#2.0.0-ballot (draft, experimental).
 * Spec: docs/specs/insuranceplan-converter.md
 *
 * toInsurancePlanBundle(bps) is a pure function: no network, no clock, no
 * randomness, no state. The same input always produces the same output.
 *
 * Usage:
 *   node scripts/to-insuranceplan.js <bps.json>               Bundle to stdout
 *   node scripts/to-insuranceplan.js <bps.json> -o <out.json> Bundle to a file
 *   node scripts/to-insuranceplan.js --write-golden           regenerate examples/fhir/
 *   node scripts/to-insuranceplan.js --no-validate <bps.json> skip the input schema check
 *
 * Exit codes: 0 = converted, 1 = invalid input or usage error.
 */

'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const CROSSWALK = require(path.join(REPO_ROOT, 'fhir', 'carin-sbc-crosswalk.json'));
const CANONICAL_BENEFITS = require(path.join(REPO_ROOT, 'vocabularies', 'canonical-benefits.json'));

// ---- canonical URLs ---------------------------------------------------------
const BPS = 'https://benefitplanstandard.org/fhir/';
const BPS_PLAN_ID = 'https://benefitplanstandard.org/plan-id';
const BPS_CANONICAL_BENEFITS = BPS + 'CodeSystem/canonical-benefits';
const bpsExt = (name) => BPS + 'StructureDefinition/' + name;

const CARIN = 'http://hl7.org/fhir/us/insurance-card/';
const SBC_PROFILE = CARIN + 'StructureDefinition/sbc-insurance-plan';
const EXT_DEDUCTIBLE_APPLIES = CARIN + 'StructureDefinition/deductible-applies';
const EXT_COST_APPLIES_TO_NETWORK = CARIN + 'StructureDefinition/cost-applies-to-network';
const EXT_BENEFIT_LIMITATION = CARIN + 'StructureDefinition/benefit-limitation';
const CS_SBC_PLAN_TYPE = CARIN + 'CodeSystem/sbc-plan-type';
const CS_COST_TIER = CARIN + 'CodeSystem/cost-tier';
const CS_LIMIT_TYPE = CARIN + 'CodeSystem/limit-type';
const CS_LIMIT_PERIOD = CARIN + 'CodeSystem/limit-period';

const EXT_DATA_ABSENT = 'http://hl7.org/fhir/StructureDefinition/data-absent-reason';
const CS_INSURANCE_PLAN_TYPE = 'http://terminology.hl7.org/CodeSystem/insurance-plan-type';
const CS_COPAY_TYPE = 'http://terminology.hl7.org/CodeSystem/coverage-copay-type';
const CS_APPLICABILITY = 'http://terminology.hl7.org/CodeSystem/applicability';
const CS_CONTACT_TYPE = 'http://terminology.hl7.org/CodeSystem/contactentity-type';
const HIOS = 'https://www.cms.gov/CCIIO/Resources/Data-Resources/hios';
const ISO_4217 = 'urn:iso:std:iso:4217';
const UCUM = 'http://unitsofmeasure.org';

// Fixed namespace for the name-based (v5) UUIDs used as Bundle fullUrls.
const UUID_NAMESPACE = '5f2d3c1e-8a4b-5c6d-9e0f-1a2b3c4d5e6f';

const SUPPORTED_VERSIONS = ['1.1.0', '1.2.0'];

// ---- vocabularies -------------------------------------------------------------
const SBC_PLAN_TYPES = {
  HMO: 'Health Maintenance Organization (HMO)',
  PPO: 'Preferred Provider Organization (PPO)',
  POS: 'Point of Service (POS)',
  EPO: 'Exclusive Provider Organization (EPO)',
  HDHP: 'High Deductible Health Plan (HDHP)',
  INDEMNITY: 'Indemnity Plan',
};
const COST_TYPES = {
  copay: { code: 'copay', display: 'Copay Amount' },
  coinsurance: { code: 'copaypct', display: 'Copay Percentage' },
  deductible: { code: 'deductible', display: 'Deductible' },
};
const LIMIT_TYPES = { visits: 'Visits', days: 'Days', dollars: 'Dollars' };
const LIMIT_PERIODS = {
  per_plan_year: { code: 'plan-year', display: 'Plan Year' },
  per_calendar_year: { code: 'calendar-year', display: 'Calendar Year' },
  per_benefit_period: { code: 'benefit-period', display: 'Benefit Period' },
  per_episode: { code: 'benefit-period', display: 'Benefit Period' },
  per_lifetime: { code: 'lifetime', display: 'Lifetime' },
};
const ACCUMULATOR_LABELS = {
  individual_deductible: 'Individual deductible',
  family_deductible: 'Family deductible',
  individual_oop_max: 'Individual out-of-pocket maximum',
  family_oop_max: 'Family out-of-pocket maximum',
  oon_individual_deductible: 'Individual deductible',
  oon_family_deductible: 'Family deductible',
  oon_individual_oop_max: 'Individual out-of-pocket maximum',
  oon_family_oop_max: 'Family out-of-pocket maximum',
};
const CANONICAL_LABELS = Object.fromEntries(CANONICAL_BENEFITS.benefits.map((b) => [b.canonical_key, b.label]));

const TEXT_NOT_COVERED = 'Not covered';
const TEXT_AMOUNT_NOT_STATED = 'Covered; amount not stated in the BPS document';
const TEXT_PLACEHOLDER = 'Not stated in the BPS document';

// ---- small helpers ----------------------------------------------------------
const has = (v) => v !== undefined && v !== null;

function fhirId(planId) {
  const id = String(planId).toLowerCase().replace(/_/g, '-');
  if (!/^[A-Za-z0-9\-.]{1,64}$/.test(id)) throw new Error(`plan_id "${planId}" does not make a valid FHIR id`);
  return id;
}

function slug(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function uuidV5(name) {
  const ns = Buffer.from(UUID_NAMESPACE.replace(/-/g, ''), 'hex');
  const hash = crypto.createHash('sha1').update(Buffer.concat([ns, Buffer.from(name, 'utf8')])).digest();
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const h = hash.subarray(0, 16).toString('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20, 32)}`;
}

function percent(rate) {
  return Math.round(rate * 100 * 10000) / 10000;
}

function escapeXml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function coding(system, code, display) {
  return display ? { system, code, display } : { system, code };
}

// A sub-extension, or null when the value is absent, so callers can filter.
function sub(url, type, value) {
  if (!has(value)) return null;
  return { url, ['value' + type]: value };
}

function complexExt(url, subs) {
  const extension = subs.flat().filter(Boolean);
  return extension.length ? { extension, url } : null;
}

function dataAbsent(code) {
  return { extension: [{ url: EXT_DATA_ABSENT, valueCode: code }] };
}

function usd(amount) {
  return { value: amount, unit: 'USD', system: ISO_4217, code: 'USD' };
}

function pct(rate) {
  return { value: percent(rate), unit: '%', system: UCUM, code: '%' };
}

// ---- tiers --------------------------------------------------------------------
function tierIndex(bps) {
  const idx = new Map();
  for (const t of bps.network_tiers || []) idx.set(t.tier_id, t);
  return idx;
}

function tierClass(tier) {
  return tier.tier_class || 'network';
}

function applicabilityCode(tiers, tierId, seen = new Set()) {
  const tier = tiers.get(tierId);
  if (!tier) throw new Error(`network_cost_shares refers to unknown tier_id "${tierId}"`);
  if (tierClass(tier) === 'network') {
    if (tier.tier_id === 'IN') return 'in-network';
    if (tier.tier_id === 'OUT') return 'out-of-network';
    throw new Error(`network tier "${tierId}" is neither IN nor OUT; the converter does not guess its applicability`);
  }
  if (!tier.parent_tier_id) throw new Error(`${tierClass(tier)} tier "${tierId}" has no parent_tier_id`);
  if (seen.has(tierId)) throw new Error(`parent_tier_id cycle at "${tierId}"`);
  seen.add(tierId);
  return applicabilityCode(tiers, tier.parent_tier_id, seen);
}

function applicability(code) {
  const display = code === 'in-network' ? 'In Network' : 'Out of Network';
  return { coding: [coding(CS_APPLICABILITY, code, display)] };
}

function qualifierFor(tier) {
  const cls = tierClass(tier);
  if (cls === 'network') return null;
  if (cls === 'modality' && /telehealth|virtual/i.test(tier.name || '')) {
    return { coding: [coding(CS_COST_TIER, 'virtual', 'Virtual Visit')], text: tier.name };
  }
  if (cls === 'cost_designation' && tier.name === 'Value Choice') {
    return { coding: [coding(CS_COST_TIER, 'value-choice', 'Value Choice Provider')], text: tier.name };
  }
  if (cls === 'cost_designation' && tier.name === 'Standard') {
    return { coding: [coding(CS_COST_TIER, 'standard', 'Standard Provider')], text: tier.name };
  }
  return { text: tier.name || tier.tier_id };
}

function costAppliesToNetwork(tier) {
  const ps = tier.provider_set;
  if (!ps) return null;
  const valueReference = {};
  if (has(ps.reference)) valueReference.reference = ps.reference;
  valueReference.display = ps.name;
  return { url: EXT_COST_APPLIES_TO_NETWORK, valueReference };
}

// ---- benefits -------------------------------------------------------------------
function crosswalkFor(planId, benefit) {
  const o = CROSSWALK.overrides.find((x) => x.plan_id === planId && x.benefit_id === benefit.benefit_id);
  if (o) return { category: o.category, type: o.type };
  return (benefit.canonical_key && CROSSWALK.map[benefit.canonical_key]) || null;
}

function sbcConcept(code) {
  return { coding: [coding(CROSSWALK.system, code, CROSSWALK.displays[code])] };
}

function benefitType(benefit, row) {
  const c = [coding(CROSSWALK.system, row, CROSSWALK.displays[row])];
  c.push(coding(BPS_CANONICAL_BENEFITS, benefit.canonical_key, CANONICAL_LABELS[benefit.canonical_key]));
  return { coding: c, text: benefit.service_name };
}

function sourceReferenceExt(ref) {
  return complexExt(bpsExt('bps-source-reference'), [
    sub('pageNumber', 'Integer', ref.page_number),
    sub('pageRange', 'String', ref.page_range),
    sub('excerpt', 'String', ref.excerpt),
  ]);
}

function limitationExt(limit) {
  let limitType = null;
  if (has(limit.type)) {
    limitType = LIMIT_TYPES[limit.type]
      ? { coding: [coding(CS_LIMIT_TYPE, limit.type, LIMIT_TYPES[limit.type])] }
      : { text: limit.type };
  }
  let limitValue = null;
  if (has(limit.value)) {
    limitValue = limit.type === 'dollars' ? usd(limit.value) : { value: limit.value, unit: limit.type };
  }
  let limitPeriod = null;
  if (has(limit.period)) {
    const p = LIMIT_PERIODS[limit.period];
    limitPeriod = p ? { coding: [coding(CS_LIMIT_PERIOD, p.code, p.display)] } : { text: limit.period };
  }
  return complexExt(EXT_BENEFIT_LIMITATION, [
    sub('limitText', 'String', limit.raw_text),
    sub('limitType', 'CodeableConcept', limitType),
    sub('limitValue', 'Quantity', limitValue),
    sub('limitPeriod', 'CodeableConcept', limitPeriod),
  ]);
}

function benefitDetailExt(b) {
  return complexExt(bpsExt('bps-benefit'), [
    sub('benefitId', 'String', b.benefit_id),
    sub('benefitType', 'String', b.benefit_type),
    sub('category', 'String', b.category),
    sub('rawLabel', 'String', b.raw_label),
    (b.place_of_service || []).map((p) => sub('placeOfService', 'String', p)),
    sub('moopApplicability', 'String', b.moop_applicability),
    sub('coverageBasis', 'String', b.coverage_basis),
    sub('alternativeGroup', 'String', b.alternative_group),
  ]);
}

function conditionExt(c) {
  return complexExt(bpsExt('bps-condition'), [
    sub('type', 'String', c.type),
    sub('code', 'String', c.code),
    sub('description', 'String', c.description),
  ]);
}

function coverageBenefit(b, row) {
  const extension = [
    ...(b.limits || []).map(limitationExt),
    benefitDetailExt(b),
    ...(b.conditions || []).map(conditionExt),
    ...(b.source_references || []).map(sourceReferenceExt),
  ].filter(Boolean);
  const out = {};
  if (extension.length) out.extension = extension;
  out.type = benefitType(b, row);
  const req = (b.conditions || []).map((c) => c.description).filter(Boolean);
  if (req.length) out.requirement = req.join('; ');
  return out;
}

function costShareExt(tierId, cs, rowNotes) {
  return complexExt(bpsExt('bps-cost-share'), [
    sub('tierId', 'String', tierId),
    sub('sequence', 'Integer', cs.sequence),
    sub('basis', 'String', cs.basis),
    // Carried here only when DeductibleApplies is withheld (pharmacy deductible).
    sub('appliesToDeductible', 'Boolean', cs.deductible_ref === 'pharmacy' ? cs.applies_to_deductible : null),
    sub('appliesToMoop', 'Boolean', cs.applies_to_moop),
    sub('deductibleRef', 'String', cs.deductible_ref),
    sub('amountMin', 'Decimal', cs.amount_min),
    sub('amountMax', 'Decimal', cs.amount_max),
    sub('rateMin', 'Decimal', has(cs.rate_min) ? percent(cs.rate_min) : null),
    sub('rateMax', 'Decimal', has(cs.rate_max) ? percent(cs.rate_max) : null),
    sub('maxAmount', 'Decimal', cs.max_amount),
    sub('maxBasis', 'String', cs.max_basis),
    sub('unitRangeFrom', 'Integer', cs.unit_range ? cs.unit_range.from : null),
    sub('unitRangeTo', 'Integer', cs.unit_range ? cs.unit_range.to : null),
    sub('note', 'String', cs.notes),
    sub('note', 'String', rowNotes),
  ]);
}

function costEntry({ extension, type, app, qualifier, value }) {
  const out = {};
  const ext = (extension || []).filter(Boolean);
  if (ext.length) out.extension = ext;
  out.type = type;
  out.applicability = applicability(app);
  if (qualifier) out.qualifiers = [qualifier];
  out.value = value;
  return out;
}

function costValue(cs) {
  if (has(cs.amount)) return usd(cs.amount);
  if (has(cs.rate)) return pct(cs.rate);
  if (has(cs.amount_min) || has(cs.amount_max) || has(cs.rate_min) || has(cs.rate_max)) return dataAbsent('unsupported');
  return dataAbsent('unknown');
}

function costType(cs) {
  const t = COST_TYPES[cs.type];
  return t ? { coding: [coding(CS_COPAY_TYPE, t.code, t.display)] } : { text: cs.type };
}

function benefitCosts(b, tiers) {
  const cost = [];
  for (const row of b.network_cost_shares || []) {
    const tier = tiers.get(row.tier_id);
    const app = applicabilityCode(tiers, row.tier_id);
    const qualifier = qualifierFor(tier);
    const network = costAppliesToNetwork(tier);
    const steps = row.cost_shares || [];
    if (!row.covered) {
      cost.push(costEntry({
        extension: [costShareExt(row.tier_id, {}, row.notes)],
        type: { text: TEXT_NOT_COVERED }, app, qualifier, value: dataAbsent('not-applicable'),
      }));
    } else if (steps.length === 0) {
      cost.push(costEntry({
        extension: [network, costShareExt(row.tier_id, {}, row.notes)],
        type: { text: TEXT_AMOUNT_NOT_STATED }, app, qualifier, value: dataAbsent('unknown'),
      }));
    } else {
      steps.forEach((cs, i) => {
        const deductible = has(cs.applies_to_deductible) && cs.deductible_ref !== 'pharmacy'
          ? { url: EXT_DEDUCTIBLE_APPLIES, valueBoolean: cs.applies_to_deductible }
          : null;
        cost.push(costEntry({
          extension: [network, deductible, costShareExt(row.tier_id, cs, i === 0 ? row.notes : null)],
          type: costType(cs), app, qualifier, value: costValue(cs),
        }));
      });
    }
  }
  const apps = cost.map((c) => c.applicability.coding[0].code);
  while (cost.length < 2) {
    const missing = !apps.includes('out-of-network') ? 'out-of-network' : 'in-network';
    apps.push(missing);
    cost.push(costEntry({ type: { text: TEXT_PLACEHOLDER }, app: missing, value: dataAbsent('unknown') }));
  }
  return cost;
}

// ---- plan-level costs ---------------------------------------------------------
function accumulatorCost(slot, a, label, typeCode, typeDisplay) {
  const comment = [a.network_tier, a.period, a.embedded ? 'embedded' : null,
    a.applies_to_tiers ? 'applies to ' + a.applies_to_tiers.join(', ') : null].filter(Boolean).join('; ');
  const out = {};
  const ext = complexExt(bpsExt('bps-accumulator'), [
    sub('slot', 'String', slot),
    sub('networkTier', 'String', a.network_tier),
    sub('period', 'String', a.period),
    sub('embedded', 'Boolean', a.embedded),
    sub('appliesTo', 'String', a.applies_to),
    (a.applies_to_tiers || []).map((t) => sub('appliesToTier', 'String', t)),
  ]);
  if (ext) out.extension = [ext];
  out.type = { coding: [coding(CS_COPAY_TYPE, typeCode, typeDisplay)], text: label };
  if (has(a.amount)) out.cost = { value: a.amount, currency: a.currency || 'USD' };
  if (comment) out.comment = comment;
  return out;
}

function generalCosts(bps) {
  const out = [];
  for (const [slot, a] of Object.entries(bps.accumulators || {})) {
    if (!a) continue;
    const isDeductible = /deductible/.test(slot);
    const base = ACCUMULATOR_LABELS[slot] || slot;
    const label = a.network_tier ? `${base}, ${a.network_tier}` : base;
    out.push(accumulatorCost(slot, a, label,
      isDeductible ? 'deductible' : 'maxoutofpocket',
      isDeductible ? 'Deductible' : 'Maximum out of pocket'));
  }
  if (bps.premium) {
    const p = bps.premium;
    const entry = { type: { text: 'Premium' }, cost: { value: p.amount, currency: p.currency || 'USD' } };
    const comment = [p.period, p.notes].filter(Boolean).join('; ');
    if (comment) entry.comment = comment;
    out.push(entry);
  }
  if (bps.part_b_premium_reduction) {
    const r = bps.part_b_premium_reduction;
    const entry = { type: { text: 'Part B premium reduction' } };
    if (has(r.amount)) entry.cost = { value: r.amount, currency: 'USD' };
    const comment = [r.period, r.notes].filter(Boolean).join('; ');
    if (comment) entry.comment = comment;
    out.push(entry);
  }
  const rx = bps.pharmacy || {};
  if (rx.deductible) {
    out.push(accumulatorCost('pharmacy.deductible', rx.deductible, 'Pharmacy deductible', 'deductible', 'Deductible'));
  }
  if (rx.out_of_pocket_max) {
    out.push(accumulatorCost('pharmacy.out_of_pocket_max', rx.out_of_pocket_max,
      'Pharmacy out-of-pocket maximum', 'maxoutofpocket', 'Maximum out of pocket'));
  }
  return out;
}

// ---- plan-level fields ----------------------------------------------------------
function period(bps) {
  const cp = bps.coverage_period || {};
  const start = cp.start_date || bps.effective_date;
  const end = cp.end_date || bps.expiry_date;
  if (start || end) {
    const p = {};
    if (start) p.start = start;
    if (end) p.end = end;
    return p;
  }
  if (has(bps.plan_year)) return { start: String(bps.plan_year), end: String(bps.plan_year) };
  throw new Error('no coverage_period, effective_date, expiry_date or plan_year to fill InsurancePlan.period');
}

function identifiers(bps) {
  const out = [{ system: BPS_PLAN_ID, value: bps.plan_id }];
  for (const pi of bps.plan_identifiers || []) {
    const id = {};
    if (has(pi.source)) id.extension = [{ url: bpsExt('bps-identifier-source'), valueString: pi.source }];
    id.system = pi.system === 'hios_id' ? HIOS : BPS + 'identifier/' + pi.system;
    id.value = pi.value;
    out.push(id);
  }
  return out;
}

function planType(bps) {
  const t = bps.plan_type;
  if (!t) return null;
  if (SBC_PLAN_TYPES[t]) return { coding: [coding(CS_SBC_PLAN_TYPE, t, SBC_PLAN_TYPES[t])] };
  return { text: t };
}

function planMetadataExt(bps) {
  const area = bps.service_area || {};
  return complexExt(bpsExt('bps-plan-metadata'), [
    sub('schemaVersion', 'String', bps.schema_version),
    sub('planYear', 'Integer', bps.plan_year),
    sub('market', 'String', bps.market),
    sub('serviceAreaState', 'String', area.state),
    (area.counties || []).map((c) => sub('serviceAreaCounty', 'String', c.name)),
  ]);
}

function unmappedExt(b) {
  return complexExt(bpsExt('bps-unmapped-benefit'), [
    sub('benefitId', 'String', b.benefit_id),
    sub('canonicalKey', 'String', b.canonical_key),
    sub('serviceName', 'String', b.service_name),
    sub('category', 'String', b.category),
  ]);
}

function narrative(bps, p, placed, unmapped) {
  const when = [p.start, p.end].filter(Boolean).join(' to ');
  const parts = [
    `<p><b>${escapeXml(bps.plan_name)}</b></p>`,
    `<p>Carrier: ${escapeXml(bps.carrier)}. Plan type: ${escapeXml(bps.plan_type || 'not stated')}. Period: ${escapeXml(when)}.</p>`,
    `<p>${placed} benefits are placed in CARIN SBC benefit categories. ` +
      `${unmapped} benefits have no code in the SBC benefit category code system and are listed, by identity only, in the bps-unmapped-benefit extension.</p>`,
    `<p>Converted from Benefit Plan Standard document ${escapeXml(bps.plan_id)} (schema version ${escapeXml(bps.schema_version)}).</p>`,
  ];
  return { status: 'generated', div: `<div xmlns="http://www.w3.org/1999/xhtml">${parts.join('')}</div>` };
}

// ---- entry point -----------------------------------------------------------------
function toInsurancePlanBundle(bps) {
  if (!bps || typeof bps !== 'object') throw new Error('input is not a BPS document');
  if (!SUPPORTED_VERSIONS.includes(bps.schema_version)) {
    throw new Error(`schema_version "${bps.schema_version}" is not supported (expected ${SUPPORTED_VERSIONS.join(' or ')})`);
  }
  const id = fhirId(bps.plan_id);
  const orgId = 'org-' + slug(bps.carrier);
  const planUrl = 'urn:uuid:' + uuidV5('InsurancePlan/' + id);
  const orgUrl = 'urn:uuid:' + uuidV5('Organization/' + orgId);
  const tiers = tierIndex(bps);

  // Group placed benefits by SBC category, in order of first appearance.
  const groups = new Map();
  const unmapped = [];
  for (const b of bps.benefits) {
    const x = crosswalkFor(bps.plan_id, b);
    if (!x) { unmapped.push(b); continue; }
    if (!groups.has(x.category)) groups.set(x.category, []);
    groups.get(x.category).push({ b, row: x.type });
  }
  const placed = bps.benefits.length - unmapped.length;
  if (placed === 0) throw new Error('no benefit maps to an SBC benefit category; the profile cannot represent this plan');

  const p = period(bps);
  const coverage = [];
  const specificCost = [];
  for (const [category, items] of groups) {
    coverage.push({ type: sbcConcept(category), benefit: items.map(({ b, row }) => coverageBenefit(b, row)) });
    specificCost.push({
      category: sbcConcept(category),
      benefit: items.map(({ b, row }) => ({ type: benefitType(b, row), cost: benefitCosts(b, tiers) })),
    });
  }

  const plan = {};
  const pt = planType(bps);
  if (pt) plan.type = pt;
  const gc = generalCosts(bps);
  if (gc.length) plan.generalCost = gc;
  plan.specificCost = specificCost;

  const insurancePlan = {
    resourceType: 'InsurancePlan',
    id,
    meta: { profile: [SBC_PROFILE] },
    text: narrative(bps, p, placed, unmapped.length),
    extension: [
      planMetadataExt(bps),
      ...(bps.source_references || []).map(sourceReferenceExt),
      ...unmapped.map(unmappedExt),
    ].filter(Boolean),
    identifier: identifiers(bps),
    status: 'active',
    type: [{ coding: [coding(CS_INSURANCE_PLAN_TYPE, 'medical', 'Medical')] }],
    name: bps.plan_name,
    period: p,
    ownedBy: { reference: orgUrl, display: bps.carrier },
    contact: [{
      extension: [{ url: EXT_DATA_ABSENT, valueCode: 'unknown' }],
      purpose: { coding: [coding(CS_CONTACT_TYPE, 'PAYOR', 'Payor')] },
    }],
    coverage,
    plan: [plan],
  };

  const organization = {
    resourceType: 'Organization',
    id: orgId,
    text: {
      status: 'generated',
      div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${escapeXml(bps.carrier)}</p></div>`,
    },
    name: bps.carrier,
  };

  return {
    resourceType: 'Bundle',
    id: 'bps-' + id,
    type: 'collection',
    entry: [
      { fullUrl: planUrl, resource: insurancePlan },
      { fullUrl: orgUrl, resource: organization },
    ],
  };
}

function serialize(bundle) {
  return JSON.stringify(bundle, null, 2) + '\n';
}

// ---- input validation (CLI only; local schema files, no network) ----------------
function validateInput(bps) {
  if (!SUPPORTED_VERSIONS.includes(bps.schema_version)) {
    return [`schema_version "${bps.schema_version}" is not supported`];
  }
  const Ajv2020 = require('ajv/dist/2020');
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  try { require('ajv-formats')(ajv); } catch (e) { /* optional */ }
  const schema = JSON.parse(fs.readFileSync(
    path.join(REPO_ROOT, 'schema', 'v' + bps.schema_version, 'benefit-plan.schema.json'), 'utf8'));
  const validate = ajv.compile(schema);
  return validate(bps) ? [] : validate.errors.map((e) => `${e.instancePath || '(root)'} ${e.message}`);
}

const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');
const GOLDEN_DIR = path.join(EXAMPLES_DIR, 'fhir');

function exampleFiles() {
  return fs.readdirSync(EXAMPLES_DIR).filter((f) => f.endsWith('_example.json')).sort();
}

function main(argv) {
  let out = null;
  let check = true;
  let writeGolden = false;
  const files = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-o' || a === '--out') out = argv[++i];
    else if (a === '--no-validate') check = false;
    else if (a === '--write-golden') writeGolden = true;
    else if (a === '-h' || a === '--help') {
      console.log('usage: node scripts/to-insuranceplan.js [--no-validate] <bps.json> [-o out.json]\n' +
        '       node scripts/to-insuranceplan.js --write-golden');
      return 0;
    } else files.push(a);
  }

  const convertFile = (file) => {
    const bps = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (check) {
      const errors = validateInput(bps);
      if (errors.length) throw new Error(`${file} is not a valid BPS document:\n  ${errors.join('\n  ')}`);
    }
    return toInsurancePlanBundle(bps);
  };

  try {
    if (writeGolden) {
      fs.mkdirSync(GOLDEN_DIR, { recursive: true });
      for (const f of exampleFiles()) {
        const bundle = convertFile(path.join(EXAMPLES_DIR, f));
        const target = path.join(GOLDEN_DIR, bundle.entry[0].resource.id + '.json');
        fs.writeFileSync(target, serialize(bundle));
        console.log(`wrote ${path.relative(REPO_ROOT, target)}  (from ${f})`);
      }
      return 0;
    }
    if (files.length !== 1) {
      console.error('error: give exactly one BPS file. usage: node scripts/to-insuranceplan.js <bps.json>');
      return 1;
    }
    const text = serialize(convertFile(files[0]));
    if (out) fs.writeFileSync(out, text);
    else process.stdout.write(text);
    return 0;
  } catch (e) {
    console.error('error: ' + e.message);
    return 1;
  }
}

module.exports = { toInsurancePlanBundle, serialize, exampleFiles, EXAMPLES_DIR, GOLDEN_DIR };

if (require.main === module) process.exit(main(process.argv.slice(2)));
