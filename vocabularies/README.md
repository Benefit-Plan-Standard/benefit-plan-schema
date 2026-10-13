# Vocabularies

This directory contains **non-normative recommended vocabularies** referenced from the BPS schema. They are introduced in v1.1.0 to provide adopters with consistent values for fields the schema deliberately leaves open (strings, not enums), so that ecosystems built on BPS can interoperate without forcing every implementer into the same hard-coded enum.

| File | Used for | Field on schema |
|------|----------|-----------------|
| [`canonical-benefits.json`](./canonical-benefits.json) | Machine-readable canonical identifiers for benefit services (117 entries across 13 categories) | `benefits[].canonical_key` |
| [`categories.json`](./categories.json) | Uppercase snake_case category codes for grouping benefits | `benefits[].category` |
| [`benefit-types.json`](./benefit-types.json) | Domain discriminator values used to support modules | `benefits[].benefit_type` |
| [`markets.json`](./markets.json) | Market segment codes | `market` (top-level) |
| [`plan-types.json`](./plan-types.json) | Plan-design classification codes | `plan_type` (top-level) |

## Status

- **Non-normative.** The JSON Schema does not enforce these via `enum`; the schema treats the corresponding fields as free-form strings. Adopters who want strict validation can layer an additional `enum` constraint locally.
- **Recommended for interoperability.** Adopters SHOULD prefer these values where applicable. If you need a term that doesn't exist here, please open an issue or PR.
- **Versioned alongside the schema.** Vocabularies share the same version number as the schema (currently v1.1.0; `canonical-benefits.json` is at v1.2.0, with the v1.2.0 draft schema). Backward-compatible additions are minor bumps.

## Sources

`canonical-benefits.json` is derived from a production extraction library covering Aetna, Anthem/BCBS, Cigna, UnitedHealthcare, Humana, Florida Blue, GatorCare, Kaiser, SCAN, and others. The 100 canonical keys of v1.1.0 cover the SBC service inventory plus pharmacy formulary tiers, behavioral health, maternity, pediatric, rehabilitation, home health, and specialty care. v1.2.0 adds 6 keys for rows in the CMS Marketplace and Medicare Advantage public files: `hearing_aids`, `hearing_exam`, `routine_eye_exam`, `routine_foot_care`, `other_practitioner_office_visit` and `physical_and_occupational_therapy` (the combined row of the Marketplace Benefits and Cost Sharing PUF; `physical_therapy` and `occupational_therapy` stay for sources that state them separately). The same version then adds 8 keys for the Medicare Advantage supplemental and behavioral health rows of the CMS Plan Benefit Package files: `mental_health_office_visit` (an individual session; narrower than `mental_health_outpatient`, and also the Marketplace "Mental Health Office Visit" row), `dental_cleaning`, `dental_filling`, `eyeglasses`, `otc_allowance`, `meals`, `transportation` (in `other`, beside ambulance) and `fitness_benefit`. On 2026-10-13 it adds 3 keys for the adult dental rows of the Marketplace Benefits and Cost Sharing PUF: `dental_routine_adult`, `dental_basic_adult` and `dental_major_adult`. Each is a class of services as the issuer defines it, not a single service, so the Medicare Advantage cleaning and restorative rows stay on `dental_cleaning` and `dental_filling`.

The `categories.json` codes follow the SBC service-grouping pattern used by HHS.

## Extending

To propose a new term:

1. Open an issue describing the gap and a real-world example (carrier name, SBC excerpt).
2. PR against the relevant vocabulary file. Increment the vocabulary's `version` and add a changelog entry.
3. Maintainers will batch additions into the next BPS minor release.
