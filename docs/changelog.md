# Changelog

All notable changes to the **Benefit Plan Standard Schema** will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
