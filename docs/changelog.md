# Changelog

All notable changes to the **Benefit Plan Standard Schema** will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Tooling: CARIN SBC InsurancePlan converter (2026-09-24)

No schema change. Every BPS document validates exactly as before.

### Added

- `scripts/to-insuranceplan.js`: converts a BPS v1.1.0 or v1.2.0 document into a FHIR R4 collection `Bundle` (one `InsurancePlan` and the `Organization` it references) targeting the CARIN Digital Insurance Card SBC InsurancePlan profile. The converter is a pure function plus a CLI, with deterministic output and ids derived from `plan_id`. The profile exists only in `hl7.fhir.us.insurance-card#2.0.0-ballot` and is draft and experimental. Spec: `docs/specs/insuranceplan-converter.md`.
- `fhir/carin-sbc-crosswalk.json`: BPS `canonical_key` to SBC benefit category crosswalk used by the converter.
- `scripts/build-fhir-definitions.js` and `fhir/definitions/`: the BPS extension StructureDefinitions (`bps-source-reference`, `bps-plan-metadata`, `bps-identifier-source`, `bps-benefit`, `bps-condition`, `bps-cost-share`, `bps-accumulator`, `bps-unmapped-benefit`) and the canonical-benefits CodeSystem, all draft.
- `examples/fhir/`: the converter output for all 10 examples, validated with the HL7 FHIR validator against the ballot package with zero errors (`examples/fhir/VALIDATION.md`). The files are golden files for `scripts/to-insuranceplan.test.js`, which fails on any drift.

### Changed

- `docs/fhir-alignment.md`: the mapping table and worked example now follow FHIR R4 core and the CARIN SBC profile. Plan design goes in `plan.type` (`sbc-plan-type`) rather than `InsurancePlan.type`. Cost-share types use `coverage-copay-type`, and `cost.applicability` uses the R4 applicability code system. Benefit types carry an `sbc-benefit-category` code, with the BPS canonical key as an additional coding. Quantities carry a currency or UCUM `system`. Deductible applicability uses the `DeductibleApplies` extension. The table covers the profile's `contact` and 2-cost minimum, and moves market and source citations to extensions. The worked example is regenerated from the converter.
- `docs/carin-dic-reconciliation.md`: the whole SBC InsurancePlan profile is ballot-stage, not only the three merged changes. The doc now spells out the qualifier mapping for designation and modality tiers and updates the worked example (the `IN` row carries no qualifier). It adds notes on pharmacy `deductible_ref`, text-only limit types and periods, and the missing home health code.
- `docs/roadmap.md`: item 4 updated.

## Pharmacy module [0.2.1] – DRAFT (2026-09-04)

Additive patch to the draft pharmacy module (`modules/pharmacy/v0.2.1/`). v0.2.0 documents validate unchanged.

### Added

- `carrier_formulary_document` on `pharmacy.formulary_reference.data_sources[].source_type` — a carrier-published formulary document: medication guide, prior-authorization program list, program drug list, or pharmacy policy bulletin. Identify the document with `source_url` and `file_date`. Motivation: employer group plans have no CMS machine-readable formulary file; their drug-to-tier placement, utilization-management flags and indication rules are published only in carrier documents, and the v0.2.0 enum had no value for that origin.
- A `description` on `source_type` defining every value.

## [1.2.0] – DRAFT (2026-07-02)

Backward-compatible minor release, in draft. Existing v1.0.0 and v1.1.0 documents continue to validate against v1.2.0 unchanged. Origin: reconciliation of the three `InsurancePlan` changes merged into the HL7 CARIN Digital Insurance Card IG on June 25, 2026 (FHIR-57525 multi-tier cost sharing, FHIR-57526 deductible applicability, FHIR-57527 structured benefit limitation). Full analysis and field-by-field mapping: `docs/carin-dic-reconciliation.md`.

### Added

- **Network-tier classification** (from FHIR-57525)
  - `tier_class` (string, nullable, default `"network"`) on `network_tiers[]` items — distinguishes an actual provider network (`network`) from a cost-sharing designation within one network (`cost_designation`, e.g. a carrier's "Value Choice" rate) and from a delivery channel (`modality`, e.g. virtual care). Recommended values, not enum-enforced. Absent means `network`, the pre-v1.2.0 meaning.
  - `parent_tier_id` (string, nullable) on `network_tiers[]` items — for designation/modality tiers, the network tier they live within.
  - `provider_set` (object, nullable: `name` required; `description`, `reference` optional) on `network_tiers[]` items — the set of providers a cost designation applies to, joinable to a provider directory (e.g. a Plan-Net Organization). Maps to the CARIN `CostAppliesToNetwork` extension.
- **Limit enhancements** (from FHIR-57527)
  - `raw_text` (string, nullable) on `benefits[].limits[]` items — verbatim limitation text from the source document. Maps to the CARIN `BenefitLimitation.limitText`.
  - `limits[].period` description now recommends `per_plan_year`, `per_calendar_year`, `per_benefit_period`, `per_lifetime` (legacy `per_year`, `per_episode` remain valid), aligning with the CARIN Limit Period value set.
- **Vocabulary updates (non-normative, apply to all schema versions)**
  - `vocabularies/canonical-benefits.json`: added UnitedHealthcare's descriptor-style
    drug-tier phrasings ("Tier 1 - Your Lowest-Cost Option", "Tier 2/3 - Your
    Midrange-Cost Option", "Tier 4 - Additional High-Cost Options") to the aliases and
    `sbc_label_patterns` of `generic_drugs`, `preferred_brand_drugs`,
    `nonpreferred_brand_drugs`, and `specialty_drugs`. Found while regenerating the
    example corpus: UHC SBCs name drug tiers without the words "generic"/"brand", so
    label-driven mappers missed every prescription-drug row.
- **Documentation**
  - `docs/carin-dic-reconciliation.md` — reconciliation of the three merged CARIN Digital Insurance Card IG changes into BPS, with field-by-field mappings.

### Not changed (already covered)

- Per-cost-share deductible applicability (FHIR-57526) was already expressed by `cost_shares[].applies_to_deductible` (since v1.0.0); reconciled as a mapping note only.
- Typed limits (FHIR-57527's `limitType` / `limitValue` / `limitPeriod`) were already expressed by `limits[].type` / `value` / `period` (since v1.0.0).

### Backward compatibility

- All v1.1.0 required fields remain required in v1.2.0; no field types change; all additions are optional.
- All seven carrier examples validate unchanged against both v1.1.0 and the v1.2.0 draft.
- `additionalProperties: false` boundaries are respected.

### Schema URL

- v1.2.0 draft: `https://benefitplanstandard.org/schema/v1.2.0/benefit-plan.schema.json`
- v1.1.0 remains the current released version.

## [1.2.0] – DRAFT (2026-09-20), Medicare Advantage additions

Second additive block in the v1.2.0 draft. Every addition below is optional, so a document that validated against the draft on July 2 validates unchanged. Origin: two 2026 CMS Summary of Benefits documents read end to end on September 16, 2026, the SCAN Classic (HMO) Summary of Benefits for Los Angeles County and the Humana Gold Plus H1036-025 (HMO) Summary of Benefits, mapped construct by construct against the schema. Fourteen constructs had no home in the standard; twelve are added here. Full analysis, page evidence and verification record: `docs/medicare-advantage-notes.md`. Field-by-field proposal: `docs/medicare-advantage-schema-proposal.md`.

### Added

- **Plan identity**
  - `plan_identifiers` (array, optional) at top level, each entry carrying `system` (required), `value` (required) and `source` (string, nullable). Closes gap G1. Recommended systems: `cms_contract_plan_segment`, `cms_contract_id`, `cms_pbp_id`, `hios_id`. Motivation: Humana prints its contract and plan number in the page 1 title and in every page header, while the SCAN Summary of Benefits prints no contract and plan number for either of its plans, so that value has to come from a public CMS plan listing and `source` records where. Distinct from `plan_id`, which stays a document-local readable slug.
  - `service_area` (object, nullable: `state`, and `counties[]` of `name` and `fips`) at top level. Closes gap G2. Motivation: Medicare Advantage plans are sold by county. Humana page 1 lists Hernando, Hillsborough, Pasco and Pinellas counties in Florida, and SCAN pages 1 and 17 name Los Angeles County. Neither document prints a county FIPS code, so `fips` is nullable.
  - `premium` (object, nullable: `amount` required, plus `currency`, `period`, `notes`) and `part_b_premium_reduction` (object, nullable: `amount` nullable, plus `period`, `notes`) at top level. Closes gap G3. Motivation: the Summary of Benefits leads with the monthly premium (SCAN page 3, Humana page 4), while the ACA SBC leaves the premium out by design, which is why the standard never had a field for it. Humana page 4 also prints a Part B premium reduction as a qualified value, so `amount` is nullable there and the printed wording goes in `notes` rather than being reduced to a number.
- **Pharmacy accumulators**
  - `pharmacy` (object, optional) at top level, carrying `deductible` (with `applies_to_tiers`), `out_of_pocket_max` and `coverage_stages[]`, together with `deductible_ref` (string, nullable) on `benefits[].network_cost_shares[].cost_shares[]` items. Closes gap G4. Motivation: a Medicare Advantage plan with drug coverage runs two sets of accumulators, and core had one. The Part D deductible is scoped to drug tiers (SCAN page 8 charges the full cost of Tier 3 through Tier 5 drugs until the member has paid $250; Humana pages 4 and 10 set $615 for Tier 4 and Tier 5), and the Part D out-of-pocket threshold is separate from the medical maximum ($2,100 in both plans, SCAN page 9 and Humana page 11). `deductible_ref` says which deductible a step's `applies_to_deductible` refers to, with `medical` and `pharmacy` recommended; absent or null means the medical deductible, the pre-v1.2.0 reading. The three shapes are inlined from the draft pharmacy module v0.2.1 and are a strict subset of it, so a document valid under core's `pharmacy` is valid under the module's.
- **Cost-share enhancements**
  - `unit_range` (object, nullable: `from` required, `to` nullable) on `cost_shares[]` items. Closes gap G5. Motivation: Humana's copay changes with the day of the stay (page 4 prices inpatient days 1 to 6 at $50 per day and days 7 to 90 at $0 per day; page 9 prices skilled nursing days 1 to 20 at $0 per day and days 21 to 100 at $160 per day). Previously the range sat in `notes`, so a reader had to parse prose to price day 10. The unit itself stays in `basis`; `unit_range` carries only the bounds, so the two cannot disagree.
  - `max_amount` and `max_basis` for caps, and `amount_min`, `amount_max`, `rate_min`, `rate_max` for ranges (all nullable) on `cost_shares[]` items. Closes gap G6. Motivation: where a document prints a cap or a range, no number could go where the document puts one, so the value stayed in `notes`. Caps: SCAN page 7 caps Part B insulin furnished through durable medical equipment at $35 for a one-month supply, and Humana page 11 pairs a coinsurance with a cap in most cells of its insulin grid. Ranges: SCAN page 7 prices Part B drugs as a range of the Medicare-approved amount, and SCAN page 5 prices comprehensive dental by category as dollar ranges. The Kaiser SBC example has the same cap problem, its specialty tier reading "20% coinsurance up to $250 / prescription", and could now carry it as a `rate` with `max_amount` and `max_basis`; that example is not edited in this release.
- **Benefit-level enhancements**
  - `coverage_basis` (string, nullable) on `benefits[]` items, recommended values `medicare_covered`, `supplemental_mandatory`, `supplemental_optional`. Closes gap G7. Motivation: the main Medicare Advantage axis is which program pays for a benefit, and `benefit_type` names the service domain instead. Both documents split each benefit area into a Medicare-covered row and a supplemental one: SCAN labels its supplemental rows non-Medicare-covered or routine on pages 4 through 7, and Humana labels its mandatory supplemental benefits on pages 7 and 8 with the codes HER692, DENF33 and VIS848. SCAN's optional dental package at $55 a month (page 16) motivates the third value. Absent or null means the document does not make the distinction, the pre-v1.2.0 reading.
  - `alternative_group` (string, nullable) on `benefits[]` items. Closes gap G10. Motivation: Humana page 8 prices eyewear as a $300 allowance or, alternatively, two pairs of select eyeglasses per year at no cost. Modeled as two benefits sharing one group identifier, so a consumer that adds benefits up counts at most one per group instead of both.
  - `source_references` (array) on `benefits[]` items, with the item shape factored into `$defs/source_reference` and referenced from both the plan-level and the new benefit-level list. Closes gap G14. Motivation: with 71 and 72 benefit rows, binding an excerpt to the benefit it evidences by position in one plan-level list is fragile. The plan-level refactor is validation-identical to the previous inline definition, so no document's result changes.
  - `moop_applicability` on `benefits[]` items: an explicit null is now authoritative and means the source document does not state whether the benefit counts toward the maximum out-of-pocket, so a consumer must treat it as unknown rather than fall back to the `applies_to_moop` default. Closes gap G8. Description-only change; the field's type and the boolean `applies_to_moop` are untouched, and an absent field keeps its pre-v1.2.0 meaning of `plan_default`. Motivation: SCAN page 3 excludes prescription drugs from the maximum without saying whether Part B drugs are included, so the page 7 Part B rows are recorded as not stated rather than counted.
- **Limit enhancements**
  - `carryover` (string, nullable) on `benefits[].limits[]` items, recommended values `none`, `next_period`, `within_year`. Closes gap G9. Motivation: both plans give a $150 quarterly over-the-counter allowance and differ on what happens to the unused balance. SCAN page 13 carries it into the next quarter but not the next year, and Humana page 14 lets it expire at the end of the quarter. The difference is now data rather than prose.
  - `scope` and `shared_limit_id` (string, nullable) on `limits[]` items, plus `per_12_months` added to the recommended values of `limits[].period`. Closes gap G11 and extends the limit-scope open item in `docs/carin-dic-reconciliation.md` section 5. Motivation: `scope` is the entity a limit counts against, distinct from `type`, the unit counted, as in Humana page 7 allowing one hearing aid per ear per year. `shared_limit_id` marks one count spread across several benefits: SCAN pages 12 and 13 give routine acupuncture and routine chiropractic 30 visits per year combined, and SCAN page 4 prints a single hearing aid limit over a row that prices two grades, so without it a program that sums limits doubles them. `per_12_months` is a rolling window, which is what SCAN means by "every 12 months" on pages 4 and 6, as distinct from a calendar or plan year.
- **Vocabulary (non-normative, applies to all schema versions)**
  - `vocabularies/categories.json`: twelve category codes added for benefit areas the Summary of Benefits prices and the SBC does not (`HEARING`, `DENTAL`, `VISION`, `PART_B_DRUGS`, `PODIATRY`, `TRANSPORTATION`, `OVER_THE_COUNTER`, `MEALS`, `IN_HOME_SUPPORT`, `FITNESS`, `PERSONAL_EMERGENCY_RESPONSE`, `MEMBER_SUPPORT`), each with a one-line description.
  - `vocabularies/benefit-types.json`: new file, the recommended vocabulary for `benefits[].benefit_type`, which had none. It carries the seven values the schema field description already recommends plus `hearing` and `non_clinical`, the second a stopgap name for transportation, meals, in-home support, fitness, a personal emergency response system and member support, which neither source document groups under a collective term.
- **Examples**
  - `examples/scan_example.json` and `examples/humana_example.json`, the first two Medicare Advantage examples, with their source documents added to `examples/sources/`. Both are keyed by hand from their Summary of Benefits and verified value by value against the cited pages, and both validate against the v1.2.0 draft only.
- **Documentation**
  - `docs/medicare-advantage-notes.md`: how the two documents differ from the SBC, the fourteen gaps, how each example was built, and the verification record.

### Deferred

- **G12, optional supplemental packages (riders).** A `riders[]` array carrying a name, a premium and the benefits that apply only when a member buys the package. SCAN's optional dental package at $55 a month (page 16) is the motivating case. Not in this release, and left out of both examples on purpose.
- **G13, population-specific cost sharing.** A marker on a cost-share set for populations with different cost sharing, such as Extra Help replacing the Part D amounts for members who qualify (Humana page 12). Not in this release, and left out of both examples on purpose.

### Not changed

- `schema/v1.0.0/benefit-plan.schema.json` and `schema/v1.1.0/benefit-plan.schema.json` are untouched. Released versions are frozen.
- Every v1.0.0 and v1.1.0 document validates against v1.2.0 unchanged. Every addition above is optional, no existing field changes type or requiredness, and the `additionalProperties: false` boundaries only gain the new keys. Evidence: the eight SBC examples (`aetna`, `aetna_ppo5000`, `ambetter`, `bluecross`, `cigna`, `gatorcare`, `kaiser`, `united`) are not edited in this release and pass `scripts/validate.js` against both v1.1.0 and the v1.2.0 draft with the same result as before these additions, exit 0 for each file and one advisory vocabulary warning in total (`cigna`, `plan_type` "OAP").

## [1.1.0] – 2026-05-21

Backward-compatible minor release. Existing v1.0.0 documents continue to validate against v1.1.0 unchanged.

### Added

- **Plan identity**
  - `plan_year` (integer) at top level — useful when `effective_date` is absent or when grouping plans across years.
  - `coverage_period` object (`start_date`, `end_date`) at top level — captures the coverage window explicitly, which may differ from `effective_date` / `expiry_date`.
  - `market` (string) at top level — market segment (individual, small_group, large_group, medicare_advantage, etc.). See `vocabularies/markets.json`.
- **Accumulator enhancements**
  - 4 new out-of-network accumulator slots: `oon_individual_deductible`, `oon_family_deductible`, `oon_individual_oop_max`, `oon_family_oop_max`. Closes the v1.0.0 gap where PPO plans with separate in/out-of-network deductibles and OOP maxes could not be fully represented.
  - `period` field on every accumulator (e.g. `"per_calendar_year"`, `"per_plan_year"`).
  - `network_tier` field on every accumulator for explicit network scope.
  - `embedded` boolean for family-level accumulators (member-level embedded sub-deductibles/maxes).
  - `applies_to` field is now available on OOP max accumulators (previously only on deductibles).
- **Benefit-level enhancements**
  - `benefit_type` discriminator on `benefits[]` items — enables future modules (pharmacy, dental, vision, behavioral_health) to share the same schema with a discriminator. Default: `"medical"`.
  - `canonical_key` (string) on `benefits[]` items — machine-readable canonical identifier. See `vocabularies/canonical-benefits.json` for the recommended vocabulary of 100 canonical keys.
  - `raw_label` (string, nullable) on `benefits[]` items — optional verbatim label from the source document for traceability.
- **Cost-share enhancements**
  - `notes` field on `benefits[].network_cost_shares[].cost_shares[]` items. Fixes a known issue in the v1.0.0 SCAN example that placed `notes` here but would have failed `additionalProperties: false`.
- **Recommended vocabularies** (new top-level `vocabularies/` directory)
  - `canonical-benefits.json` — 100 canonical benefit identifiers across 13 categories.
  - `categories.json` — recommended uppercase snake_case category codes.
  - `markets.json` — recommended market codes.
  - `plan-types.json` — recommended plan-design codes.
- **Repository hygiene**
  - `LICENSE` file (MIT) added to the root.
  - `.gitattributes` to normalize line endings across platforms.
- **Documentation**
  - `docs/fhir-alignment.md` — mapping of BPS to FHIR R4 `InsurancePlan`, including the `InsurancePlan` ↔ BPS field-by-field crosswalk, gaps, and how to round-trip.

### Fixed

- `examples/scan_example.json` — removed `notes` from inside `cost_shares[]` items. The text was preserved by merging into the parent `network_cost_shares[].notes` field. (The same `notes` field is now formally defined on `cost_shares[]` in v1.1.0, so future examples may use it directly.)

### Backward compatibility

- All v1.0.0 required fields remain required in v1.1.0.
- All v1.0.0 optional fields remain present with the same types.
- All additions are optional and `additionalProperties: false` boundaries are respected.
- A document declaring `"schema_version": "1.0.0"` validates against the v1.1.0 schema without changes.

### Schema URL

- v1.1.0 canonical: `https://benefitplanstandard.org/schema/v1.1.0/benefit-plan.schema.json`
- v1.0.0 remains available at: `https://benefitplanstandard.org/schema/v1.0.0/benefit-plan.schema.json`

## [1.0.0] – 2025-11-30

### Added

- Initial release of the canonical schema (`schema/v1.0.0/benefit-plan.schema.json`).
- Base repository structure with example documents, modules directory placeholder, and governance documentation.
- Documentation stubs for changelog, roadmap, and governance.
