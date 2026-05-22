# Pharmacy Module (DRAFT — v0.1.0)

> **Status:** Draft sketch. Published for community review. **Not yet normative.** Open issues and PRs welcome.

## Why a pharmacy module

BPS v1.1.0 introduces `benefit_type: "pharmacy"` on `benefits[]` items, which lets a benefit plan carry pharmacy entries alongside medical without restructuring the schema. That's enough for simple commercial plans where pharmacy looks like "tier 1 = $10 copay, tier 2 = $40 copay" — each tier becomes a benefit entry with `benefit_type: "pharmacy"` and a `canonical_key` like `generic_drugs`.

But real pharmacy benefits — especially Medicare Part D and tiered commercial plans — carry structure that doesn't fit cleanly in `benefits[]`:

- **Formulary tiers.** A drug's tier (T1/T2/T3/T4/T5) is the dominant cost-share determinant. The tier list is a plan-level definition; benefit entries reference it.
- **Pharmacy networks.** Separate from medical `network_tiers[]`. A plan might offer preferred retail, standard retail, mail order, and specialty pharmacy networks, each with different cost shares.
- **Coverage stages.** Medicare Part D has Initial Coverage, Coverage Gap (donut hole), and Catastrophic Coverage. Each stage has different cost shares for the same drug.
- **Day supply.** A 30-day retail fill and a 90-day mail-order fill of the same drug are different prices.
- **Pharmacy-specific deductible and OOP max.** Some plans have these separate from the medical accumulators.
- **Step therapy, quantity limits, prior auth.** Pharmacy-specific utilization controls.

The pharmacy module adds:

1. An **optional top-level `pharmacy` object** that defines the formulary structure, pharmacy networks, coverage stages, and pharmacy-specific accumulators.
2. **Optional extension fields** on `benefits[]` items (when `benefit_type: "pharmacy"`) that reference into the pharmacy structure: `formulary_tier_id`, `pharmacy_network_id`, `coverage_stage_id`, `day_supply`, `step_therapy_required`, `quantity_limit`.

Both additions are **backward-compatible** with BPS v1.1.0. A plan with no pharmacy benefits doesn't need the `pharmacy` object at all. A simple commercial plan can use the v1.1.0 base benefit shape without referencing into the pharmacy structure.

## What this sketch is NOT

- **Not normative.** The schema fragment in `v0.1.0/pharmacy.schema.json` is published for community review. Issues, counterproposals, and PRs welcome.
- **Not a complete drug formulary.** This module is about structure, not data. Adopters supply their own formularies.
- **Not a replacement for NCPDP, RxNorm, or NDC.** Those identify drugs. This module models how a plan covers them.
- **Not yet wired into the core schema.** Once the design stabilizes, the core BPS schema will reference this module via `$ref` and the additions will become part of v1.2.0 (or whatever release ships the merged version).

## Design choices we want feedback on

1. **Top-level `pharmacy` object vs. per-benefit nesting.** We chose top-level because formulary tiers and pharmacy networks are plan-level concepts referenced by many benefit entries. Some alternative designs (HL7 FHIR Coverage, X12 271 EB segments) inline tier info per benefit. Which is better for downstream consumers?
2. **Pharmacy networks as a separate concept from `network_tiers[]`.** Medical network tiers and pharmacy network tiers are orthogonal — a plan can have IN-network and OUT-network medical providers AND preferred / standard / mail-order pharmacy networks. We modeled them separately. Is that right, or should pharmacy networks just be additional entries in `network_tiers[]` with a flag?
3. **Medicare Part D stages.** We modeled coverage stages explicitly. For commercial plans without stage structure, the `coverage_stages` array is just omitted. Acceptable, or do we need a discriminator like `pharmacy.type: "medicare_part_d" | "commercial" | "...`?
4. **Drug examples on benefit entries.** We allow an optional `drug_examples[]` string array per benefit entry, but explicitly mark it as non-authoritative. Useful for documentation, or a footgun (someone treats it as the formulary)?

## Worked example

See `v0.1.0/examples/humana_part_d_example.json` for a Medicare Part D plan that exercises:

- Formulary tiers (T1–T5)
- Preferred retail vs. standard retail vs. mail-order pharmacy networks
- Initial Coverage, Coverage Gap, and Catastrophic Coverage stages
- Pharmacy-specific deductible ($300)
- Day-supply variation (30-day retail, 90-day mail-order)

## How to validate

```bash
# The module is published as a standalone JSON schema you can validate
# pharmacy-specific JSON fragments against:
ajv validate \
  -s modules/pharmacy/v0.1.0/pharmacy.schema.json \
  -d modules/pharmacy/v0.1.0/examples/humana_part_d_example.json \
  --strict=false
```

Once the module is merged into the core, the example above will also validate against the core `benefit-plan.schema.json` directly.

## Open questions for the v0.2.0 iteration

- **Specialty pharmacy designation.** Should "specialty drugs" be a `drug_class` value, a separate `pharmacy_network_type`, or both?
- **Compound drugs.** Excluded by most plans; how do we model the exclusion (a benefit with `covered: false`, or a separate `excluded_drug_classes[]` field on `pharmacy`)?
- **Mail-order requirements.** Some plans REQUIRE mail order for maintenance drugs after the second fill. Modeled as a `condition` on the benefit entry, or a top-level `pharmacy.mail_order_required_after_fills` field?
- **Vaccines.** Often covered without cost share at preferred retail. Same benefit entry pattern as a tier, or a separate first-class concept?
- **Coupons and manufacturer assistance.** Excluded from MOOP under some plans; relevant for plan modeling?

## Provide feedback

- Open an issue: https://github.com/Benefit-Plan-Standard/benefit-plan-schema/issues
- Discussion: https://github.com/Benefit-Plan-Standard/benefit-plan-docs/discussions

We expect this sketch to evolve significantly based on input from carriers, PBMs, brokers, and adopters running real Medicare Part D and commercial pharmacy workloads.
