# Pharmacy Module (DRAFT — v0.2.0)

> **Status:** Draft. Published for community review. **Not yet normative.** Open issues and PRs welcome.
>
> **What's new vs. v0.1.0** (the structural sketch in [PR #2](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/pull/2))**:** v0.2.0 is a **superset** of v0.1.0. It carries the v0.1.0 structural layer forward unchanged and adds a **drug-level formulary layer**: `pharmacy.formulary_items[]` (drug-to-tier mapping with utilization-management flags), **indication-dependent coverage** via `coverage_exceptions[]`, a `formulary_reference` provenance object with public plan join keys, and an optional canonical `tier_code` on formulary tiers. Every addition is optional and backward-compatible.

## Why a pharmacy module

BPS v1.1.0 introduces `benefit_type: "pharmacy"` on `benefits[]` items, which lets a benefit plan carry pharmacy entries alongside medical without restructuring the schema. That's enough for simple commercial plans where pharmacy looks like "tier 1 = $10 copay, tier 2 = $40 copay" — each tier becomes a benefit entry with `benefit_type: "pharmacy"` and a `canonical_key` like `generic_drugs`.

But real pharmacy benefits — especially Medicare Part D and tiered commercial plans — carry structure that doesn't fit cleanly in `benefits[]`:

- **Formulary tiers.** A drug's tier (T1/T2/T3/T4/T5) is the dominant cost-share determinant. The tier list is a plan-level definition; benefit entries reference it.
- **Pharmacy networks.** Separate from medical `network_tiers[]` — preferred retail, standard retail, mail order, specialty pharmacy.
- **Coverage stages.** Medicare Part D moves members through phases with different cost shares for the same drug. Post-2025 (IRA redesign): Deductible, Initial Coverage, and Catastrophic Coverage (annual out-of-pocket cap; $2,100 in CY2026). The pre-2025 Coverage Gap (donut hole) remains representable for historical plan years.
- **Day supply.** A 30-day retail fill and a 90-day mail-order fill of the same drug are different prices.
- **Pharmacy-specific deductible and OOP max.**
- **Step therapy, quantity limits, prior auth** — pharmacy-specific utilization controls.
- **Drug-level coverage that depends on clinical indication** *(v0.2.0)* — the same drug covered for one diagnosis and excluded for another.

## The two layers

### Layer 1 — structural (from v0.1.0, unchanged)

1. An **optional top-level `pharmacy` object** defining the formulary structure, pharmacy networks, coverage stages, and pharmacy-specific accumulators.
2. **Optional extension fields** on `benefits[]` items (when `benefit_type: "pharmacy"`) that reference into the pharmacy structure: `formulary_tier_id`, `pharmacy_network_id`, `coverage_stage_id`, `day_supply`, `step_therapy_required`, `quantity_limit`.

See `examples/humana_part_d_example.json` (a Medicare Part D plan, CY2026 post-IRA design, exercising tiers, networks, the deductible / initial / catastrophic stages, a pharmacy deductible, and day-supply variation).

### Layer 2 — drug-level formulary and indication-dependent coverage *(new in v0.2.0)*

The structural layer says *"this plan has a Tier 3 with a $47 copay."* The drug-level layer says *"semaglutide is on Tier 3, requires step therapy through metformin, and is covered for type 2 diabetes but excluded for weight management."* That is the layer v0.2.0 adds.

- **`pharmacy.formulary_items[]`** — the drug-level list. Each `formulary_item` places a drug (identified by `rxcui`, with optional `ndc`) on a `formulary_tier_id`, carries `covered` plus UM flags (`prior_authorization`, `step_therapy` + `step_therapy_drugs`, `quantity_limit`, `specialty_pharmacy_required`), and may list `alternatives[]`. Optional: many plans publish tier structure without a full drug list.
- **`coverage_exceptions[]`** — the differentiator. An indication-specific override on a formulary item's default coverage. It models the same drug having different coverage by clinical indication: `coverage_status` (`covered` / `excluded` / `conditional`), an optional `indication_code` (ICD-10-CM), an optional `formulary_tier_id_override`, and a `restrictions_override` (PA/ST/QL that replace the item-level defaults for that indication). **No equivalent exists in FHIR DaVinci `FormularyItem`** — see "Relationship to FHIR" below.
- **`pharmacy.formulary_reference`** — provenance and identity for the formulary data: `formulary_id`, `formulary_url`, `pharmacy_benefit_manager`, a `completeness` enum (`none` → `full_formulary`), `data_sources[]` (with `source_type` covering SBC/SPD extraction, CMS QHP and Part D formularies, FHIR DaVinci, carrier API, manual entry), and **`source_plan_identifiers`** — the public join keys (`hios_id`, `cms_contract_id`, `cms_pbp_id`) used to link external formulary files to this plan.
- **`tier_code` on `formulary_tier`** — an optional canonical tier code from the FHIR DrugTierVS vocabulary, alongside the carrier-facing `drug_class`. Adopters may populate either or both; `drug_class` stays the human/source value, `tier_code` the canonical cross-walk target.

See `examples/formulary_indication_example.json` — a generic, illustrative plan that puts a plain generic on Tier 1 and a GLP-1 (semaglutide) on Tier 3 with three `coverage_exceptions` (covered for type 2 diabetes, excluded for weight management, conditional for cardiovascular risk reduction). The shared `quantity_limit_detail` shape is reused across the benefit extension, `formulary_item`, and `restrictions_override` so a quantity limit has one representation everywhere.

All v0.2.0 additions are **backward-compatible** with BPS v1.1.0 and with v0.1.0 pharmacy documents.

## Relationship to FHIR

This module is deliberately positioned where FHIR cannot reach. FHIR DaVinci `FormularyItem` / `InsurancePlan` can express tier placement and plan-level cost sharing, and BPS cross-walks to it (`tier_code` uses DrugTierVS; `data_sources` recognizes `fhir_davinci_formulary`). But FHIR `FormularyItem` has **no representation for indication-dependent coverage** — a single drug whose coverage, tier, or restrictions change by diagnosis. `coverage_exceptions[]` is that representation. The module remains **structure, not data**: adopters supply their own formularies; BPS supplies the shape and the provenance.

## What this module is NOT

- **Not normative.** The schema fragment in `v0.2.0/pharmacy.schema.json` is published for community review.
- **Not a complete drug formulary.** This module is about structure, not data. Adopters supply their own formularies.
- **Not a replacement for NCPDP, RxNorm, or NDC.** Those identify drugs (`rxcui`/`ndc` reference them). This module models how a plan covers them.
- **Not yet wired into the core schema.** See "Core integration" below.

## Resolved in v0.2.0

These v0.1.0 review questions are answered by this iteration:

- **Top-level `pharmacy` object vs. per-benefit nesting.** *Resolved — top-level.* The drug-level layer (`formulary_items[]`, `formulary_reference`) also lives under `pharmacy{}`, keeping all pharmacy structure in one place and consistent with the module pattern.
- **Drug examples on benefit entries (footgun?).** *Resolved.* `pharmacy.formulary_items[]` is now the authoritative drug list. `drug_examples[]` on benefit entries remains documentation-only and points to `formulary_items[]`.
- **Specialty pharmacy designation.** *Resolved.* Specialty is expressed as a `drug_class` / `tier_code` value (`specialty`) at the tier level **and** as a per-drug `specialty_pharmacy_required` flag on `formulary_item`.
- **Canonical vs. carrier tier vocabulary.** *Resolved.* A tier carries both: `drug_class` (carrier-facing) and the optional canonical `tier_code` (FHIR DrugTierVS).

## Still open / v0.3.0 backlog

- **Pharmacy networks as a separate concept from `network_tiers[]`.** Kept separate in v0.1.0/v0.2.0; still want adopter feedback on whether that's the right call.
- **Medicare Part D discriminator.** Do we need an explicit `pharmacy.type: "medicare_part_d" | "commercial"` rather than inferring from the presence of `coverage_stages`?
- **Compound drugs**, **mail-order-required-after-N-fills**, **vaccines** (often $0 at preferred retail), and **coupons / manufacturer assistance** (MOOP treatment) — deferred to a later iteration.
- **`source_plan_identifiers` placement.** Pharmacy-scoped today; a future BPS minor release may graduate these to a core plan-identity field (see "Core integration").

## Core integration (later — not this PR)

When the module graduates into core **BPS v1.2.0**, the core `benefit-plan.schema.json` will need: a `$ref` to this module (or inlined `$defs`), the plan object opened to allow the `pharmacy` object and the pharmacy benefit-extension fields, and a decision on graduating `source_plan_identifiers` to a top-level core plan-identity field. That wiring is intentionally **out of scope** for this draft.

## How to validate

```bash
ajv validate -s modules/pharmacy/v0.2.0/pharmacy.schema.json \
  -d modules/pharmacy/v0.2.0/examples/formulary_indication_example.json --strict=false

ajv validate -s modules/pharmacy/v0.2.0/pharmacy.schema.json \
  -d modules/pharmacy/v0.2.0/examples/humana_part_d_example.json --strict=false
```

## Provide feedback

- Open an issue: https://github.com/Benefit-Plan-Standard/benefit-plan-schema/issues
- Discussion: https://github.com/Benefit-Plan-Standard/benefit-plan-docs/discussions

We especially want input from carriers, PBMs, brokers, TPAs, and adopters running real Medicare Part D and commercial pharmacy workloads — particularly on the indication-dependent coverage model.
