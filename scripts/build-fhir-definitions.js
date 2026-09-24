#!/usr/bin/env node
/**
 * Generates the BPS FHIR conformance resources used by scripts/to-insuranceplan.js:
 * the bps-* extension StructureDefinitions and the canonical-benefits CodeSystem.
 * Output: fhir/definitions/*.json (deterministic; covered by the drift test).
 *
 * Usage:
 *   node scripts/build-fhir-definitions.js            write fhir/definitions/
 *   node scripts/build-fhir-definitions.js --check    exit 1 if the files on disk differ
 *
 * All resources are status draft, experimental, and target FHIR 4.0.1.
 * Spec: docs/specs/insuranceplan-converter.md section 10.2
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'fhir', 'definitions');
const BPS = 'https://benefitplanstandard.org/fhir/';
const VERSION = '0.1.0';
const PUBLISHER = 'Benefit Plan Standard';

const IP = 'InsurancePlan';
const BENEFIT = 'InsurancePlan.coverage.benefit';
const COST = 'InsurancePlan.plan.specificCost.benefit.cost';
const GENERAL_COST = 'InsurancePlan.plan.generalCost';

// name, title, contexts, description, sub-extensions [name, type, max, definition] (or valueType for a simple extension)
const EXTENSIONS = [
  {
    id: 'bps-source-reference', name: 'BPSSourceReference', title: 'BPS Source Reference',
    context: [IP, BENEFIT],
    description: 'A citation from a Benefit Plan Standard document back to its source document: a page and an excerpt. On InsurancePlan it carries the BPS plan-level source_references; on coverage.benefit it carries benefits[].source_references (BPS v1.2.0). A plan-level reference is never attached to a benefit.',
    subs: [
      ['pageNumber', 'integer', '1', 'Page number in the source document.'],
      ['pageRange', 'string', '1', 'Page or line range in the source document, as recorded in BPS.'],
      ['excerpt', 'string', '1', 'Excerpt from the source document.'],
    ],
  },
  {
    id: 'bps-plan-metadata', name: 'BPSPlanMetadata', title: 'BPS Plan Metadata',
    context: [IP],
    description: 'Benefit Plan Standard plan-level fields with no element in the SBC InsurancePlan profile: schema version, plan year, market segment and service area.',
    subs: [
      ['schemaVersion', 'string', '1', 'BPS schema_version of the source document.'],
      ['planYear', 'integer', '1', 'BPS plan_year.'],
      ['market', 'string', '1', 'BPS market (e.g. large_group, individual).'],
      ['serviceAreaState', 'string', '1', 'BPS service_area.state (v1.2.0).'],
      ['serviceAreaCounty', 'string', '*', 'BPS service_area.counties[].name (v1.2.0), one per county.'],
    ],
  },
  {
    id: 'bps-identifier-source', name: 'BPSIdentifierSource', title: 'BPS Identifier Source',
    context: ['Identifier'],
    description: 'Where a regulator-assigned plan identifier came from when the plan document does not print it (BPS plan_identifiers[].source, v1.2.0).',
    valueType: 'string',
  },
  {
    id: 'bps-benefit', name: 'BPSBenefit', title: 'BPS Benefit Detail',
    context: [BENEFIT],
    description: 'Benefit Plan Standard benefit fields with no element in the SBC InsurancePlan profile.',
    subs: [
      ['benefitId', 'string', '1', 'BPS benefits[].benefit_id.'],
      ['benefitType', 'string', '1', 'BPS benefits[].benefit_type.'],
      ['category', 'string', '1', 'BPS benefits[].category.'],
      ['rawLabel', 'string', '1', 'BPS benefits[].raw_label, verbatim.'],
      ['placeOfService', 'string', '*', 'BPS benefits[].place_of_service[].'],
      ['moopApplicability', 'string', '1', 'BPS benefits[].moop_applicability.'],
      ['coverageBasis', 'string', '1', 'BPS benefits[].coverage_basis (v1.2.0).'],
      ['alternativeGroup', 'string', '1', 'BPS benefits[].alternative_group (v1.2.0).'],
    ],
  },
  {
    id: 'bps-condition', name: 'BPSCondition', title: 'BPS Benefit Condition',
    context: [BENEFIT],
    description: 'A structured BPS benefits[].conditions[] entry. The descriptions are also joined into coverage.benefit.requirement.',
    subs: [
      ['type', 'string', '1', 'Condition type (e.g. authorization, referral).'],
      ['code', 'string', '1', 'Condition code, when BPS carries one.'],
      ['description', 'string', '1', 'Condition description.'],
    ],
  },
  {
    id: 'bps-cost-share', name: 'BPSCostShare', title: 'BPS Cost Share Detail',
    context: [COST],
    description: 'Benefit Plan Standard cost-share step fields with no element in the SBC InsurancePlan profile. Rates are percentages (0 to 100).',
    subs: [
      ['tierId', 'string', '1', 'BPS network_cost_shares[].tier_id the entry is keyed to.'],
      ['sequence', 'integer', '1', 'BPS cost_shares[].sequence.'],
      ['basis', 'string', '1', 'BPS cost_shares[].basis (e.g. per_visit, allowed_amount).'],
      ['appliesToDeductible', 'boolean', '1', 'BPS applies_to_deductible, carried here only when the DeductibleApplies extension is withheld because deductibleRef is pharmacy.'],
      ['appliesToMoop', 'boolean', '1', 'BPS cost_shares[].applies_to_moop.'],
      ['deductibleRef', 'string', '1', 'BPS cost_shares[].deductible_ref (v1.2.0).'],
      ['amountMin', 'decimal', '1', 'BPS amount_min (v1.2.0).'],
      ['amountMax', 'decimal', '1', 'BPS amount_max (v1.2.0).'],
      ['rateMin', 'decimal', '1', 'BPS rate_min as a percentage (v1.2.0).'],
      ['rateMax', 'decimal', '1', 'BPS rate_max as a percentage (v1.2.0).'],
      ['maxAmount', 'decimal', '1', 'BPS max_amount (v1.2.0).'],
      ['maxBasis', 'string', '1', 'BPS max_basis (v1.2.0).'],
      ['unitRangeFrom', 'integer', '1', 'BPS unit_range.from (v1.2.0).'],
      ['unitRangeTo', 'integer', '1', 'BPS unit_range.to (v1.2.0).'],
      ['note', 'string', '*', 'BPS cost_shares[].notes and network_cost_shares[].notes.'],
    ],
  },
  {
    id: 'bps-accumulator', name: 'BPSAccumulator', title: 'BPS Accumulator Detail',
    context: [GENERAL_COST],
    description: 'Benefit Plan Standard accumulator fields with no element on InsurancePlan.plan.generalCost.',
    subs: [
      ['slot', 'string', '1', 'BPS accumulator slot name (e.g. oon_individual_deductible, pharmacy.deductible).'],
      ['networkTier', 'string', '1', 'BPS accumulator network_tier.'],
      ['period', 'string', '1', 'BPS accumulator period.'],
      ['embedded', 'boolean', '1', 'BPS accumulator embedded flag.'],
      ['appliesTo', 'string', '1', 'BPS accumulator applies_to.'],
      ['appliesToTier', 'string', '*', 'BPS pharmacy.deductible.applies_to_tiers[] (v1.2.0).'],
    ],
  },
  {
    id: 'bps-unmapped-benefit', name: 'BPSUnmappedBenefit', title: 'BPS Unmapped Benefit',
    context: [IP],
    description: 'A BPS benefit that has no code in the CARIN SBC benefit category code system (a required binding), and so is not placed in coverage or plan.specificCost. Identity only: its cost sharing, limits and conditions are not carried in the FHIR output.',
    subs: [
      ['benefitId', 'string', '1', 'BPS benefits[].benefit_id.'],
      ['canonicalKey', 'string', '1', 'BPS benefits[].canonical_key, when present.'],
      ['serviceName', 'string', '1', 'BPS benefits[].service_name.'],
      ['category', 'string', '1', 'BPS benefits[].category.'],
    ],
  },
];

function header(def) {
  return {
    resourceType: 'StructureDefinition',
    id: def.id,
    url: BPS + 'StructureDefinition/' + def.id,
    version: VERSION,
    name: def.name,
    title: def.title,
    status: 'draft',
    experimental: true,
    publisher: PUBLISHER,
    description: def.description,
    fhirVersion: '4.0.1',
    kind: 'complex-type',
    abstract: false,
    context: def.context.map((expression) => ({ type: 'element', expression })),
    type: 'Extension',
    baseDefinition: 'http://hl7.org/fhir/StructureDefinition/Extension',
    derivation: 'constraint',
  };
}

function simpleExtension(def) {
  const sd = header(def);
  sd.differential = {
    element: [
      { id: 'Extension', path: 'Extension', short: def.title, definition: def.description },
      { id: 'Extension.extension', path: 'Extension.extension', max: '0' },
      { id: 'Extension.url', path: 'Extension.url', fixedUri: sd.url },
      { id: 'Extension.value[x]', path: 'Extension.value[x]', min: 1, type: [{ code: def.valueType }] },
    ],
  };
  return sd;
}

function complexExtension(def) {
  const sd = header(def);
  const element = [
    { id: 'Extension', path: 'Extension', short: def.title, definition: def.description },
    {
      id: 'Extension.extension', path: 'Extension.extension',
      slicing: { discriminator: [{ type: 'value', path: 'url' }], rules: 'closed' }, min: 1,
    },
  ];
  for (const [name, type, max, definition] of def.subs) {
    const base = `Extension.extension:${name}`;
    element.push(
      { id: base, path: 'Extension.extension', sliceName: name, short: definition, definition, min: 0, max },
      { id: `${base}.extension`, path: 'Extension.extension.extension', max: '0' },
      { id: `${base}.url`, path: 'Extension.extension.url', fixedUri: name },
      { id: `${base}.value[x]`, path: 'Extension.extension.value[x]', min: 1, type: [{ code: type }] },
    );
  }
  element.push(
    { id: 'Extension.url', path: 'Extension.url', fixedUri: sd.url },
    { id: 'Extension.value[x]', path: 'Extension.value[x]', max: '0' },
  );
  sd.differential = { element };
  return sd;
}

function canonicalBenefitsCodeSystem() {
  const vocab = require(path.join(REPO_ROOT, 'vocabularies', 'canonical-benefits.json'));
  return {
    resourceType: 'CodeSystem',
    id: 'canonical-benefits',
    url: BPS + 'CodeSystem/canonical-benefits',
    version: vocab.version,
    name: 'BPSCanonicalBenefits',
    title: 'BPS Canonical Benefits',
    status: 'draft',
    experimental: true,
    publisher: PUBLISHER,
    description: 'The Benefit Plan Standard canonical benefit identifiers (vocabularies/canonical-benefits.json), as a FHIR CodeSystem. Non-normative and extensible in BPS; generated from the vocabulary file.',
    caseSensitive: true,
    content: 'complete',
    count: vocab.benefits.length,
    concept: vocab.benefits.map((b) => {
      const c = { code: b.canonical_key, display: b.label };
      if (b.description) c.definition = b.description;
      return c;
    }),
  };
}

function buildAll() {
  const out = {};
  for (const def of EXTENSIONS) {
    out[`StructureDefinition-${def.id}.json`] = def.valueType ? simpleExtension(def) : complexExtension(def);
  }
  out['CodeSystem-canonical-benefits.json'] = canonicalBenefitsCodeSystem();
  const text = {};
  for (const [name, res] of Object.entries(out)) text[name] = JSON.stringify(res, null, 2) + '\n';
  return text;
}

function main(argv) {
  const files = buildAll();
  if (argv.includes('--check')) {
    let ok = true;
    for (const [name, text] of Object.entries(files)) {
      const p = path.join(OUT_DIR, name);
      const onDisk = fs.existsSync(p) ? fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : null;
      if (onDisk !== text) { ok = false; console.log(`differs: fhir/definitions/${name}`); }
    }
    return ok ? 0 : 1;
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, text] of Object.entries(files)) {
    fs.writeFileSync(path.join(OUT_DIR, name), text);
    console.log(`wrote fhir/definitions/${name}`);
  }
  return 0;
}

module.exports = { buildAll, OUT_DIR };

if (require.main === module) process.exit(main(process.argv.slice(2)));
