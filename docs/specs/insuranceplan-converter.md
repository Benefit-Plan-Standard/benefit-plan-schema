# Spec: BPS to CARIN SBC InsurancePlan converter

**Status:** Accepted, 2026-09-24
**Roadmap:** item 4, "CARIN SBC exporter" (`docs/roadmap.md`)
**Reads with:** [`../fhir-alignment.md`](../fhir-alignment.md), [`../carin-dic-reconciliation.md`](../carin-dic-reconciliation.md)

This spec defines a converter from a Benefit Plan Standard (BPS) document to a FHIR R4 `InsurancePlan` that conforms to the CARIN Digital Insurance Card SBC InsurancePlan profile. The mappings are checked against the profile definitions in the pinned package and against FHIR R4 core.

---

## 1. Scope

- One direction only: BPS to FHIR. There is no FHIR to BPS path.
- One BPS document in, one FHIR `Bundle` out.
- The converter projects the BPS document into FHIR. It does not replace the BPS document. Anything the profile cannot hold is either carried in a BPS extension or listed as not carried (section 7). Nothing is dropped silently.
- The converter never adds a value that the BPS document does not contain. It adds no phone numbers, dates, networks, administrators or cost shares. Where the profile requires an element that the BPS document cannot fill, the converter emits a `data-absent-reason` rather than a guess (section 5).

## 2. Target profile and packages

| Item | Value |
|---|---|
| FHIR version | R4 (4.0.1) |
| Profile | `http://hl7.org/fhir/us/insurance-card/StructureDefinition/sbc-insurance-plan` |
| Package, pinned | `hl7.fhir.us.insurance-card#2.0.0-ballot` (registry package dated 2026-08-13; published at `http://hl7.org/fhir/us/insurance-card/2.0.0-202609-ballot`) |
| Profile status | `status: draft`, `experimental: true` |

**The whole target profile is ballot-stage.** `sbc-insurance-plan` exists only in the `2.0.0-ballot` package. The published STU 1.1.0 package has no SBC profile. The profile, the five extensions it references (`sbc-metadata`, `excluded-services`, `benefit-limitation`, `cost-applies-to-network`, `deductible-applies`), and the five code systems it binds through value sets are all `draft` and `experimental`. The converter output, the docs page, the index and the roadmap all say so. The pin is the ballot package, not the CI build. On 2026-09-24 the definitions this converter relies on are identical in the ballot package and the CI build (compared element by element). When STU 2.0.0 publishes, the converter and golden files are re-validated and refreshed against it.

## 3. Inputs

- BPS documents declaring `schema_version` `1.1.0` or `1.2.0`. Any other value is an error.
- The CLI checks the input against the schema its `schema_version` names (`schema/v1.1.0` or `schema/v1.2.0`), using the same local Ajv setup as `scripts/validate.js`. A document that fails the schema is rejected. Nothing is converted.
- Absent v1.2.0 fields take their v1.1.0 meaning. For example, a tier with no `tier_class` is a `network` tier.
- The 10 files in `examples/` are the test corpus. The 8 SBC examples declare v1.1.0 and the 2 Medicare Advantage examples (`humana_example.json`, `scan_example.json`) declare v1.2.0.

## 4. Outputs

### 4.1 Shape

One `Bundle` per BPS document:

```
Bundle (type: collection)
  entry[0]  InsurancePlan   (meta.profile = sbc-insurance-plan)
  entry[1]  Organization    (the plan owner, from `carrier`)
```

- **Organization.** One per distinct carrier, holding `name` only. It is a base R4 `Organization` and does not claim the C4DIC-Organization profile. That profile requires `meta.lastUpdated`, which would break deterministic output, and it expects payer identifiers (NAIC, payer ID) that BPS does not carry.
- **No `administeredBy`.** BPS has no administrator field. For GatorCare, the BPS document records the sponsor as `carrier`. The converter does not infer the administrator from other text.
- **No provider-network Organizations.** The `CostAppliesToNetwork` extension uses a display-only reference unless the BPS `provider_set.reference` is non-null (section 6.4).

### 4.2 Identity and determinism

| Element | Rule |
|---|---|
| `InsurancePlan.id` | `plan_id` lowercased, with `_` changed to `-`. Example: `AETNA_PPO_1500_80_50` becomes `aetna-ppo-1500-80-50`. An error if the result is not a valid FHIR id. |
| `Organization.id` | `org-` plus a slug of `carrier` (lowercase; each run of other characters becomes `-`). |
| `Bundle.id` | `bps-` plus the InsurancePlan id. |
| `entry.fullUrl` | `urn:uuid:` plus a name-based UUID v5 of `"<ResourceType>/<id>"` under a fixed BPS namespace UUID. Inside the bundle, references use these URNs. |
| Timestamps | None. There is no `Bundle.timestamp` and no `meta.lastUpdated`. |
| Ordering | Array order follows the order of the BPS input. Object keys are emitted in a fixed order. |
| Numbers | Rates are converted to percentages and rounded to 4 decimal places, so `0.07` gives `7`, not `7.000000000000001`. |
| Serialization | `JSON.stringify(x, null, 2)` plus `\n`, UTF-8, LF line endings. |
| Narrative | `text.status = generated`, built only from converted values (plan name, carrier, period, benefit counts). This avoids the `dom-6` best-practice warning. |

The converter is a pure function, `toInsurancePlanBundle(bps) -> Bundle`. It makes no network calls, reads no clock, generates no random values and keeps no state. The same input always gives byte-identical output.

## 5. Profile constraints the design is built around

| Constraint (profile or R4 core) | Design |
|---|---|
| `status` 1..1, fixed `active` | Always `active`. |
| `name` 1..1 | `plan_name`, verbatim. |
| `period` 1..1 | Filled from the first available of: `coverage_period`; `effective_date` / `expiry_date`; `plan_year`. With `plan_year` alone, the dates use year precision (`{"start": "2026", "end": "2026"}`), which is a valid FHIR `dateTime` and claims no day the document does not print. This case applies to Humana. |
| `ownedBy` 1..1 | A reference to the Organization built from `carrier`. |
| `contact` 1..* | **BPS carries no contact details, and none of the 10 examples contains any.** The converter emits exactly one `contact` with `purpose` = `contactentity-type#PAYOR` and a `data-absent-reason` extension of `unknown`. It invents no telecom. |
| `coverage` 1..*, `coverage.type` 1..1 | One `coverage` per SBC category, in order of first appearance. `coverage.type` is that category's `sbc-benefit-category` coding (extensible binding, satisfied). |
| `plan` 1..*, `plan.specificCost` 1..*, `specificCost.benefit` 1..* | A single `plan[0]`. A plan with no benefits inside the 29 codes is an error, because the profile cannot represent it. No example is in that position. |
| `coverage.benefit.type`, `specificCost.category`, `specificCost.benefit.type`: **required** binding to `sbc-benefit-category` (29 codes) | Only benefits in the crosswalk (section 8) are placed in these elements. Section 8.3 gives the rule for everything else. |
| `specificCost.benefit.cost` 2..* | See 5.1. |
| `cost.type` 1..1 | Coded when the BPS type has a code (6.6). Otherwise text: `Not covered`, `Covered; amount not stated in the BPS document`, or `Not stated in the BPS document`. |
| `cost.applicability` 1..1, required binding to `insuranceplan-applicability` (`in-network`, `out-of-network`, `other`) | From the tier (6.2). A tier that maps to none of these is an error. The converter does not guess. |
| `cost.value` 1..1 | A Quantity when BPS gives an amount or rate. Otherwise the Quantity carries `data-absent-reason` (5.1). |

### 5.1 One network column, "not covered", and missing amounts

A BPS benefit becomes one `cost[]` entry per cost-share step, grouped by tier in input order. A tier row with a copay followed by a coinsurance produces two entries.

| BPS situation | `cost[]` entry |
|---|---|
| `covered: true` with one or more `cost_shares` | One entry per step, with `value` set to the amount (USD) or the rate (%). |
| `covered: false` | One entry: `type.text` `Not covered`, and a `value` Quantity whose only content is `data-absent-reason` `not-applicable`. It does **not** use `value: 0`, which a reader could take to mean "free". The IG's own example uses `0`; this spec does not. |
| `covered: true`, `cost_shares` empty (for example GatorCare in-network preventive care, Kaiser surgeon fees, MA allowances) | One entry: `type.text` `Covered; amount not stated in the BPS document`, `value` data-absent-reason `unknown`, with the row `notes` in the BPS cost-share extension. |
| Amount range or rate range (`amount_min`/`amount_max`, `rate_min`/`rate_max`; MA only) | `value` data-absent-reason `unsupported`, because a Quantity cannot hold a range. The bounds go in the BPS cost-share extension. |
| **Fewer than 2 entries after the rows above** (a benefit with a single network column, or an MA benefit priced only at one site of service) | Append one placeholder for the network the benefit does not mention: `out-of-network` if no out-of-network row exists, otherwise `in-network`. The placeholder has `type.text` `Not stated in the BPS document` and `value` data-absent-reason `unknown`. It never says "not covered", because the BPS document does not say that for the benefit. |

The placeholder exists only to satisfy `cost` 2..*. It describes the BPS document, not the source PDF: a benefit that the BPS file prices in one network only gets a placeholder even when the source document prints the other column. `examples/fhir/README.md` lists the placeholder count per file, and the docs page explains the placeholder.

## 6. Field-by-field mapping

Namespaces used below:

- `BPS` = `https://benefitplanstandard.org/fhir/` (the BPS extension StructureDefinitions and the canonical-benefits CodeSystem, section 10)
- `sbc-cat` = `http://hl7.org/fhir/us/insurance-card/CodeSystem/sbc-benefit-category`
- `copay-type` = `http://terminology.hl7.org/CodeSystem/coverage-copay-type`
- `applicability` = `http://terminology.hl7.org/CodeSystem/applicability`
- Ballot-stage CARIN elements are marked **[ballot]**. BPS-defined extensions are marked **[BPS ext]**.

### 6.1 Plan level

| BPS | InsurancePlan | Notes |
|---|---|---|
| `plan_id` | `identifier[0]` (system `https://benefitplanstandard.org/plan-id`); also used for `id` | The system URL is the one already used in `fhir-alignment.md`. |
| `plan_identifiers[]` (v1.2.0) | `identifier[1..]`, system `https://benefitplanstandard.org/fhir/identifier/<system>`; `hios_id` uses `https://www.cms.gov/CCIIO/Resources/Data-Resources/hios` | A non-null `source` goes in `bps-identifier-source` **[BPS ext]** on that identifier. For SCAN, this records that the contract and plan number come from public CMS-derived listings, not from the Summary of Benefits. |
| `plan_name` | `name` | Verbatim. |
| `carrier` | `ownedBy` to `Organization.name` | |
| `plan_type` | `plan[0].type`, from `sbc-plan-type` (extensible) | HMO, PPO, POS and EPO map directly. `OAP` (Cigna) has no counterpart and is not in `vocabularies/plan-types.json` either, so it is emitted as text only (`{"text": "OAP"}`), which the validator reports as a warning. The converter does not map it to POS. |
| (none) | `type` = `insurance-plan-type#medical` | True of all inputs. Plan design (`PPO`, `HMO`) goes in `plan.type`, not here. |
| `coverage_period`, `effective_date`, `expiry_date`, `plan_year` | `period` | See section 5. |
| `plan_year`, `market`, `schema_version`, `service_area` (v1.2.0) | `bps-plan-metadata` **[BPS ext]** | `market` can no longer go in `plan.type`, which is bound to `sbc-plan-type`. `service_area` is not mapped to `plan.coverageArea`, because that element needs `Location` resources, which are out of scope. |
| `premium` (v1.2.0) | `plan[0].generalCost[]`, `type.text` `Premium`, `cost` Money, `comment` from `period` and `notes` | |
| `part_b_premium_reduction` (v1.2.0) | `plan[0].generalCost[]`, `type.text` `Part B premium reduction`; `cost` only when `amount` is non-null; `comment` = `notes` verbatim | Humana's amount is null ("up to $3"), so only the comment is emitted. |
| `source_references[]` (plan level) | `bps-source-reference` **[BPS ext]** on `InsurancePlan`, one per entry, in order | Section 9. |
| (none) | `contact` | Section 5. |

### 6.2 Network tiers to `cost.applicability`, `cost.qualifiers` and CostAppliesToNetwork

| BPS tier | FHIR, on each `cost[]` entry keyed to that tier |
|---|---|
| `tier_class` `network` (or absent), `tier_id` `IN` | `applicability` = `applicability#in-network` |
| `tier_class` `network` (or absent), `tier_id` `OUT` | `applicability` = `applicability#out-of-network` |
| Any other `network` tier | Error, with no guessing. All 10 examples use `IN` and `OUT`. |
| `cost_designation` or `modality` with `parent_tier_id` | `applicability` taken from the parent network tier. `qualifiers` **[ballot]** (extensible `cost-tier`): `virtual` for a `modality` tier whose name contains "telehealth" or "virtual"; `value-choice` or `standard` only when a `cost_designation` tier's name is exactly "Value Choice" or "Standard". In every other case, a text-only qualifier with the tier `name`. SCAN's "Retail, Standard" pharmacy pricing is **not** mapped to `standard`, which means Standard Provider. |
| `provider_set` present | `CostAppliesToNetwork` **[ballot]**: `valueReference.display` = `provider_set.name`, plus `reference` only when `provider_set.reference` is non-null (it is null in both examples). |
| `tier_id`, `tier_class`, `parent_tier_id` | Also recorded in `bps-cost-share` **[BPS ext]** (`tierId`) so the BPS keying can be recovered. |

### 6.3 Accumulators to `plan[0].generalCost[]`

| BPS | FHIR |
|---|---|
| `*_deductible` slots | `type` = `copay-type#deductible` plus `text` (for example "Individual deductible, out-of-network") |
| `*_oop_max` slots | `type` = `copay-type#maxoutofpocket` plus `text` |
| `amount`, `currency` | `cost` (Money) |
| `network_tier`, `period` | `comment` (readable, for example "out-of-network; per_year") and `bps-accumulator` **[BPS ext]** |
| `embedded`, `applies_to`, slot name | `bps-accumulator` **[BPS ext]** |
| `pharmacy.deductible`, `pharmacy.out_of_pocket_max` (v1.2.0) | `generalCost[]` with the same `type` codes, `text` "Pharmacy deductible" or "Pharmacy out-of-pocket maximum"; `applies_to_tiers` goes in `bps-accumulator` |
| `pharmacy.coverage_stages` (v1.2.0) | Not carried (7) |

Order: slots in BPS object order, then premium, then pharmacy.

### 6.4 Benefits

For each BPS benefit whose `canonical_key` is in the crosswalk (section 8):

| BPS | `coverage[c].benefit[]` | `plan[0].specificCost[c].benefit[]` |
|---|---|---|
| (crosswalk) | `coverage[c].type` = SBC category | `specificCost[c].category` = SBC category |
| `canonical_key` via crosswalk | `type.coding[0]` = SBC row code (required binding) | same |
| `canonical_key` | `type.coding[1]` = `BPS CodeSystem/canonical-benefits#<key>` | same |
| `service_name` | `type.text` | same |
| `conditions[].description` | `requirement`: descriptions joined with `"; "` in input order | |
| `conditions[]` (structured) | `bps-condition` **[BPS ext]** (`type`, `code`, `description`), one per condition | |
| `limits[]` | `BenefitLimitation` **[ballot]**, one per limit (6.5) | |
| `source_references[]` (per benefit; MA only) | `bps-source-reference` **[BPS ext]** | |
| `benefit_id`, `benefit_type`, `category`, `raw_label`, `place_of_service[]`, `moop_applicability`, `coverage_basis`, `alternative_group` | `bps-benefit` **[BPS ext]** | |
| `network_cost_shares[]` | | `cost[]` (5.1, 6.2, 6.6) |

Two BPS benefits that share an SBC row code (for example `diagnostic_lab`, `imaging_standard` and `diagnostic_test`, all in "Diagnostic Test") become separate `benefit[]` entries under the same category. The second coding (the BPS canonical key) and `text` tell them apart.

### 6.5 Limits to `BenefitLimitation` [ballot]

| BPS | Sub-extension | Rule |
|---|---|---|
| `raw_text` (v1.2.0) | `limitText` | Verbatim. Omitted when absent (the one Florida Blue limit has no `raw_text`). |
| `type` | `limitType` (extensible `limit-type`) | `visits`, `days` and `dollars` map directly. Other types (`hearing_aids`, `meals`, `hours`, `miles`, `one_way_trips`, `occurrences`, `pairs_of_eyeglasses`) are text only. |
| `value` | `limitValue` (Quantity) | `unit` from `type`. `dollars` uses currency USD. |
| `period` | `limitPeriod` (extensible `limit-period`) | `per_plan_year` to `plan-year`, `per_calendar_year` to `calendar-year`, `per_benefit_period` and `per_episode` to `benefit-period` (as in `carin-dic-reconciliation.md` 3.3), `per_lifetime` to `lifetime`. **`per_year` becomes text only**: it is ambiguous between plan year and calendar year (`carin-dic-reconciliation.md` 3.3), and the converter does not choose. `per_12_months`, `per_quarter` and `per_discharge` are also text only. |
| `scope`, `shared_limit_id`, `carryover` (v1.2.0) | Not carried as structure (7) | The `limitText` verbatim text usually states them. |

### 6.6 Cost-share steps to `cost[]`

| BPS | FHIR |
|---|---|
| `type` `copay` | `cost.type` = `copay-type#copay` |
| `type` `coinsurance` | `cost.type` = `copay-type#copaypct` |
| `type` `deductible` | `cost.type` = `copay-type#deductible` |
| `amount` | `value` = `{value, unit: "USD", system: "urn:iso:std:iso:4217", code: "USD"}` |
| `rate` | `value` = `{value: rate x 100, unit: "%", system: "http://unitsofmeasure.org", code: "%"}` |
| `applies_to_deductible` | `DeductibleApplies` **[ballot]**, one-to-one. **Exception:** when `deductible_ref` is `pharmacy`, `DeductibleApplies` is omitted. It means "accrues to the plan deductible", and emitting it would misstate a Part D deductible. The flag and the reference go in `bps-cost-share`. |
| `sequence`, `basis`, `applies_to_moop`, `amount_min`/`amount_max`, `rate_min`/`rate_max`, `max_amount`/`max_basis`, `unit_range`, `deductible_ref`, `notes`, row-level `notes`, `tier_id` | `bps-cost-share` **[BPS ext]** |

## 7. Lossy mappings and how each is carried

| BPS content | Where it goes | Round-trips? |
|---|---|---|
| Benefits outside the 29 SBC codes | `bps-unmapped-benefit` (identity only; section 8.3) | Identity only. Cost shares, limits and conditions for these benefits are **not** in the FHIR output. |
| `source_references` | `bps-source-reference`, at the level where BPS has them | Yes |
| `conditions[]` | `requirement` (text) plus `bps-condition` (structured) | Yes |
| `applies_to_moop`, `basis`, `sequence`, caps, ranges, unit ranges | `bps-cost-share` | Yes |
| `embedded`, accumulator `period` and `network_tier` | `bps-accumulator` (plus `comment`) | Yes |
| `raw_label`, `benefit_type`, `place_of_service`, `coverage_basis`, `alternative_group`, `moop_applicability` | `bps-benefit` | Yes |
| `market`, `plan_year`, `schema_version`, `service_area` | `bps-plan-metadata` | Yes |
| Limit `per_year` and non-CARIN limit types | Text-only CodeableConcept | Text only |
| Limit `scope`, `shared_limit_id`, `carryover` | Not carried (only in `limitText` when the source prints it) | No |
| `pharmacy.coverage_stages` | Not carried | No |
| `network_tiers[].description` | Not carried (only `name` goes into qualifier text) | No |

The docs page tells readers to keep the BPS document when they need full fidelity, as `fhir-alignment.md` section 5 already advises.

## 8. SBC benefit category crosswalk

### 8.1 Rule

`canonical_key` alone decides whether a benefit is placed. `category` does not. A key maps only when the SBC row's scope clearly contains the service. There is no nearest-fit mapping. The table lives in a data file (`fhir/carin-sbc-crosswalk.json`) so ports to other languages use the same table.

### 8.2 Crosswalk (`specificCost.category` / `benefit.type`)

| BPS `canonical_key` | Category | Row code |
|---|---|---|
| `preventive_care` | `preventive-care` | `preventive-care` |
| `primary_care` | `primary-care-visit` | `primary-care-visit` |
| `specialist` | `specialist-visit` | `specialist-visit` |
| `diagnostic_test`, `diagnostic_lab`, `imaging_standard` | `diagnostic-test` | `diagnostic-test` |
| `imaging_advanced` | `imaging` | `imaging` |
| `generic_drugs`, `preferred_generic_drugs` | `generic-drugs` | `generic-drugs` |
| `preferred_brand_drugs` | `preferred-brand-drugs` | `preferred-brand-drugs` |
| `nonpreferred_brand_drugs` | `non-preferred-brand-drugs` | `non-preferred-brand-drugs` |
| `specialty_drugs` | `specialty-drugs` | `specialty-drugs` |
| `outpatient_surgery`, `outpatient_surgery_facility` | `hospital-outpatient` | `facility-fee` |
| `surgery_professional`, `outpatient_surgery_surgeon` | `hospital-outpatient` | `physician-surgeon-fee` |
| `inpatient_hospital` | `hospital-inpatient` | `facility-fee` |
| `emergency_room` | `emergency-room-care` | `emergency-room-care` |
| `ambulance` | `emergency-medical-transport` | `emergency-medical-transport` |
| `urgent_care` | `urgent-care` | `urgent-care` |
| `mental_health_outpatient`, `substance_use_outpatient` | `mental-health-outpatient` | `mental-health-outpatient` |
| `mental_health_inpatient` | `mental-health-inpatient` | `mental-health-inpatient` |
| `prenatal_care` | `pregnancy` | `pregnancy` |
| `delivery_professional` | `pregnancy` | `pregnancy-delivery` |
| `delivery_facility` | `pregnancy` | `facility-fee` |
| `rehabilitation_services`, `physical_therapy`, `occupational_therapy`, `speech_therapy` | `rehabilitation` | `rehabilitation` |
| `habilitative_services` | `habilitation` | `habilitation` |
| `skilled_nursing_facility` | `skilled-nursing` | `skilled-nursing` |
| `durable_medical_equipment`, `dme_oxygen_equipment` | `durable-medical-equipment` | `durable-medical-equipment` |
| `hospice_care` | `hospice` | `hospice` |
| `pediatric_eye_exam` | `children-eye-exam` | `children-eye-exam` |
| `pediatric_glasses` | `children-glasses` | `children-glasses` |
| `pediatric_dental_checkup` | `children-dental` | `children-dental` |

Codes not used: `pregnancy-home-health`. `home_health_care` is **not** mapped to it, because that code covers pregnancy home health only.

Before the golden files are frozen, one mapping is checked against the source PDF. Kaiser has both `surgery_professional` and `outpatient_surgery_surgeon`, labeled "Physician/surgeon fees" and "Physician/surgeon fee". If one of them is the hospital-stay row, that key maps to `hospital-inpatient` for Kaiser through an explicit per-benefit override recorded in the crosswalk file. The converter does not infer it.

### 8.3 Benefits outside the 29 codes

A benefit with no `canonical_key`, or with a key not in 8.2, **is not placed in `coverage` or `specificCost`**. The required binding makes any other placement either invalid or a misstatement. Instead, the converter emits one `bps-unmapped-benefit` extension on `InsurancePlan` for each such benefit, carrying `benefitId`, `canonicalKey`, `serviceName` and `category`, in input order. The narrative states the count.

| Example | Benefits | Placed | Outside the 29 codes |
|---|---|---|---|
| aetna | 27 | 26 | 1: home_health_care |
| aetna_ppo5000 | 27 | 26 | 1: home_health_care |
| ambetter | 30 | 27 | 3: home_health_care, chiropractic_care, acupuncture |
| bluecross | 31 | 27 | 4: home_health_care, acupuncture, bariatric_surgery, chiropractic_care |
| cigna | 30 | 26 | 4: home_health_care, acupuncture, bariatric_surgery, chiropractic_care |
| gatorcare | 29 | 25 | 4: home_health_care, acupuncture, bariatric_surgery, chiropractic_care |
| kaiser | 31 | 28 | 3: home_health_care, chiropractic_care, acupuncture |
| united | 29 | 26 | 3: home_health_care, bariatric_surgery, infertility_treatment |
| humana (MA) | 72 | 26 | 46 |
| scan (MA) | 71 | 22 | 49 |

Two consequences of the code system as balloted:

- **Home health care.** "Home health care" is a standard SBC row, but `sbc-benefit-category` has no general home health code (only `pregnancy-home-health`). This is a gap in the code system, so the eight SBC examples and SCAN list home health care as unmapped (Humana has no home health benefit).
- **Medicare Advantage.** Most Summary of Benefits content (dental, vision, hearing, supplemental benefits, Part B drugs, site-of-service pricing) has no home in an SBC profile. The two MA outputs are structurally valid against the profile, but they carry less than a third of their benefits in structured form. The docs page states this plainly.

## 9. Source references

- Plan-level `source_references[]` go only to `InsurancePlan.extension:bps-source-reference`.
- Per-benefit `source_references[]` go only to `coverage.benefit.extension:bps-source-reference`.
- **The 8 SBC examples have plan-level references only.** No benefit in them has `source_references`. Some plan-level excerpts mention a service by name (for example Aetna page 2, "Primary care visit ..."), but the converter **never** attaches a plan-level reference to a benefit, even when the text matches. A test asserts that the SBC outputs contain no benefit-level `bps-source-reference`.
- The 2 MA examples have per-benefit references on every benefit (72 of 72 and 71 of 71), and those are carried per benefit. For benefits outside the 29 codes, the benefit-level references are not carried (the unmapped-benefit entry holds identity only). The docs page says so.
- The docs page describes SBC citations as "page references for the plan document", never as per-benefit citations.

## 10. Extensions and definitions

### 10.1 CARIN extensions used [ballot]

All are `draft`, `experimental`, and in `hl7.fhir.us.insurance-card#2.0.0-ballot` only.

| Extension | Canonical | Where emitted |
|---|---|---|
| DeductibleApplies (FHIR-57526) | `http://hl7.org/fhir/us/insurance-card/StructureDefinition/deductible-applies` | `specificCost.benefit.cost` |
| CostAppliesToNetwork (FHIR-57525) | `.../StructureDefinition/cost-applies-to-network` | `specificCost.benefit.cost` |
| BenefitLimitation (FHIR-57527) | `.../StructureDefinition/benefit-limitation` | `coverage.benefit` |
| Cost Tier value set (FHIR-57525) | `.../ValueSet/cost-tier` | `cost.qualifiers` binding |

`sbc-metadata` and `excluded-services` are not emitted: BPS does not carry the SBC regulatory flags or the "Excluded Services" list. Both are optional (0..1).

### 10.2 BPS-defined conformance resources

Canonical base: `https://benefitplanstandard.org/fhir/`. All are `status: draft`, `experimental: true`, version `0.1.0`, FHIR 4.0.1, with context set to the elements named.

| Resource | Canonical (under base) | Context | Content |
|---|---|---|---|
| StructureDefinition | `StructureDefinition/bps-source-reference` | `InsurancePlan`, `InsurancePlan.coverage.benefit` | `pageNumber` (integer), `pageRange` (string), `excerpt` (string) |
| StructureDefinition | `StructureDefinition/bps-plan-metadata` | `InsurancePlan` | `schemaVersion`, `planYear`, `market`, `serviceAreaState`, `serviceAreaCounty` (0..*) |
| StructureDefinition | `StructureDefinition/bps-identifier-source` | `Identifier` | string |
| StructureDefinition | `StructureDefinition/bps-benefit` | `InsurancePlan.coverage.benefit` | `benefitId`, `benefitType`, `category`, `rawLabel`, `placeOfService` (0..*), `moopApplicability`, `coverageBasis`, `alternativeGroup` |
| StructureDefinition | `StructureDefinition/bps-condition` | `InsurancePlan.coverage.benefit` | `type`, `code`, `description` |
| StructureDefinition | `StructureDefinition/bps-cost-share` | `InsurancePlan.plan.specificCost.benefit.cost` | `tierId`, `sequence`, `basis`, `appliesToDeductible`, `appliesToMoop`, `deductibleRef`, `amountMin`, `amountMax`, `rateMin`, `rateMax`, `maxAmount`, `maxBasis`, `unitRangeFrom`, `unitRangeTo`, `note` (0..*) |
| StructureDefinition | `StructureDefinition/bps-accumulator` | `InsurancePlan.plan.generalCost` | `slot`, `networkTier`, `period`, `embedded`, `appliesTo`, `appliesToTier` (0..*) |
| StructureDefinition | `StructureDefinition/bps-unmapped-benefit` | `InsurancePlan` | `benefitId`, `canonicalKey`, `serviceName`, `category` |
| CodeSystem | `CodeSystem/canonical-benefits` | | Generated from `vocabularies/canonical-benefits.json` |

**Where they live.** Source: `benefit-plan-schema/fhir/definitions/*.json`. They are generated by `scripts/build-fhir-definitions.js` (the CodeSystem from `vocabularies/canonical-benefits.json`; the StructureDefinitions as differentials, from which the validator generates snapshots). The generated files are also covered by the drift test. They are published as static files at `https://benefitplanstandard.org/fhir/StructureDefinition/<name>.json` and `https://benefitplanstandard.org/fhir/CodeSystem/canonical-benefits.json`. Each canonical URL (the same path without `.json`) redirects a browser to its `.json` file. The redirect is for people reading the files; the validator does not use it.

**How the validator resolves them.** They are loaded locally with `-ig benefit-plan-schema/fhir/definitions`. The validator registers every conformance resource in that folder by canonical URL before it validates, so no fetch of `benefitplanstandard.org` is needed.

## 11. Validation approach

1. **Input.** `node scripts/validate.js --schema schema/v<version>/benefit-plan.schema.json examples/<file>` for each of the 10 examples, using the version each declares. All must pass.
2. **Convert.** `node scripts/to-insuranceplan.js examples/<file> > examples/fhir/<id>.json`.
3. **FHIR validation.** The HL7 validator (`validator_cli.jar`, latest release on the day of the run, version recorded):
   ```
   java -jar validator_cli.jar -version 4.0.1 \
     -ig hl7.fhir.us.insurance-card#2.0.0-ballot \
     -ig fhir/definitions \
     examples/fhir/*.json
   ```
   The InsurancePlan inside each Bundle is checked against `sbc-insurance-plan` through its `meta.profile`. The validator uses its default terminology server (`tx.fhir.org`). The converter itself makes no network calls.
4. **Pass bar.** Zero errors in all 10. Every warning is listed in `examples/fhir/VALIDATION.md` with an explanation. The record also includes the validator version, the package and its date, the terminology server, and per-file counts of errors, warnings and information messages.
5. **Result.** All 10 pass with zero errors. The warnings are text-only `cost.qualifiers` for site-of-service and designation tiers that have no Cost Tier code (Humana and SCAN) and the text-only `OAP` plan type (Cigna). The BPS canonical-benefit coding placed beside the required SBC coding raises no issue. The full record, including a negative control, is in `examples/fhir/VALIDATION.md`.

## 12. Golden files and drift test

- `examples/fhir/<insuranceplan-id>.json`: 10 Bundles, the output of step 2 above.
- `examples/fhir/README.md`: what the files are, how to regenerate them, and the label for the two MA files (section 13).
- `scripts/to-insuranceplan.test.js`, run with `node --test scripts/to-insuranceplan.test.js` (Node built-in test runner, no dependencies). The test:
  - converts each of the 10 examples and compares the output with the golden file byte for byte (after CRLF normalization, so a Windows checkout does not fail), and fails on any difference;
  - converts each example twice and asserts identical output (determinism);
  - asserts that no SBC output has a benefit-level `bps-source-reference`;
  - asserts that every benefit shows up either placed or unmapped (none lost silently);
  - asserts that `fhir/definitions/` matches what the definitions script generates.
- Goldens are refreshed only on purpose, with `node scripts/to-insuranceplan.js --write-golden`.

The golden files double as fixtures for ports to other languages.

## 13. Publishing layout

All 10 outputs are converted, golden-tested and published.

```
benefit-plan-schema/
  scripts/to-insuranceplan.js          converter: pure function plus CLI
  scripts/to-insuranceplan.test.js     drift, determinism and provenance tests
  scripts/build-fhir-definitions.js    generates fhir/definitions/
  scripts/publish-fhir.js              copies outputs and definitions into the docs site; writes index.json
  fhir/carin-sbc-crosswalk.json        section 8.2 as data
  fhir/definitions/*.json              the 8 bps-* extension StructureDefinitions and the canonical-benefits CodeSystem
  examples/fhir/<id>.json              10 golden Bundles
  examples/fhir/README.md
  examples/fhir/VALIDATION.md          validator run record and warnings explained

benefit-plan-docs/
  static/fhir/InsurancePlan/<id>.json  the 10 Bundles, copied unchanged from examples/fhir/
  static/fhir/index.json               list of all 10
  static/fhir/StructureDefinition/<name>.json   the 8 bps-* extensions
  static/fhir/CodeSystem/canonical-benefits.json
  static/fhir/StructureDefinition/<name>.html   redirect pages: each canonical URL sends a browser to its .json file
  static/fhir/CodeSystem/canonical-benefits.html
  docs/specification/fhir-insuranceplan.md   docs page, added to the Specification sidebar
```

`static/fhir/index.json` is a plain JSON list, not a FHIR resource. Each entry has `id`, `plan_name`, `carrier`, `plan_type`, `plan_year`, `bps_schema_version`, `bps_example`, `path` (for example `InsurancePlan/aetna-ppo-1500-80-50.json`), `url`, `benefits_placed` and `benefits_unmapped`, plus `label` for the two Medicare Advantage files. Top-level fields are `description`, `profile`, `package` (`hl7.fhir.us.insurance-card#2.0.0-ballot`), `profile_status` (`draft, experimental; ballot-stage`), `fhir_version`, `bps_repository` and `converter_spec`.

For `humana` and `scan`, both the index `label` and the docs page read exactly:

> Medicare Advantage, keyed by hand from the CMS Summary of Benefits, validates against the v1.2.0 draft only.

The same text heads `examples/fhir/README.md` for those two files.

**Docs page content.** The page covers:

- the files are static JSON downloads, not a FHIR API, endpoint or server, with no search, no `_format` and no REST semantics (`Bundle.entry.fullUrl` values are `urn:uuid:` identifiers, not addresses);
- the profile is draft and experimental and exists only in `hl7.fhir.us.insurance-card#2.0.0-ballot`;
- how to fetch a file (`curl https://benefitplanstandard.org/fhir/InsurancePlan/<id>.json`) and read `index.json`;
- how to run the converter locally (`node scripts/to-insuranceplan.js examples/aetna_example.json`) and the validator command from section 11;
- what is not carried: benefits outside the 29 codes, the `Not stated in the BPS document` placeholders, and SBC page references that are plan-level only;
- the Medicare Advantage label, and the fact that most MA benefits sit outside an SBC profile.

The page does not describe how the example BPS files were produced.

Links from Markdown to the static JSON use absolute `https://benefitplanstandard.org/...` URLs or `pathname://` links, because `onBrokenLinks: 'throw'` rejects relative links to static files.

## 14. Roadmap item 4 (replacement text)

> 4. **CARIN SBC exporter.** A converter from BPS to the CARIN Digital Insurance Card IG's SBC `InsurancePlan` profile, in this repo (`scripts/to-insuranceplan.js`) so anyone can run it; spec in `docs/specs/insuranceplan-converter.md`. The whole target profile is ballot-stage: `sbc-insurance-plan`, its extensions and the code systems it binds exist only in `hl7.fhir.us.insurance-card#2.0.0-ballot` (draft, experimental). Output is validated against that package and will be refreshed when STU 2.0.0 publishes.

A delivery date is added only once the work is delivered. `benefit-plan-docs/docs/specification/roadmap.md` and `docs/governance/roadmap.md` get the same edit if they carry item 4.
