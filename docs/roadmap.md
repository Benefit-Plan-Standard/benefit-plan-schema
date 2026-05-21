# Roadmap

This document outlines the planned evolution of the **Benefit Plan Standard Schema**.
Dates are indicative and subject to change based on community feedback and implementation experience.

## Delivered

### v1.1.0 (2026-05-21)

- ✅ **Accumulator groups** — added out-of-network deductible and OOP-max slots, `period`, `network_tier`, and `embedded` fields. Closes the v1.0.0 gap where PPO plans with separate in/out-of-network accumulators could not be fully represented.
- ✅ **Plan identity** — added `plan_year`, `coverage_period`, and `market` at the top level to support cross-year grouping and market segmentation.
- ✅ **Benefit discriminator** — added `benefit_type` to `benefits[]` so the same schema can carry medical, pharmacy, dental, vision, and behavioral health benefits without restructuring.
- ✅ **Canonical vocabulary** — published 100 canonical benefit identifiers as a non-normative recommended vocabulary (`vocabularies/canonical-benefits.json`).
- ✅ **FHIR alignment doc** — `docs/fhir-alignment.md` maps BPS to FHIR R4 `InsurancePlan`.

## Near-term goals

1. **Pharmacy module** — Extend the schema to support detailed Part D and commercial pharmacy benefit structures, including tiers, mail-order rules, and cost-sharing stages. v1.1.0 lays the groundwork via `benefit_type: "pharmacy"`; the next step is a pharmacy-specific module schema.
2. **Behavioral health & supplemental modules** — Provide normalized representation of mental health, substance use, dental, vision, and maternity care as opt-in modules referenced via `benefit_type`.
3. **Utilization management conditions** — Richer modeling of prior authorization, referral requirements, and step-therapy rules.
4. **HealthPlanAPI reference-implementation alignment** — Bring the HealthPlanAPI BIME output into full BPS v1.1.0 conformance (snake_case, top-level fields, `cost_shares[]` array structure, ISO 8601 dates).

## Long-term vision

The Benefit Plan Standard aims to become the de facto model for publishing, sharing, and comparing health benefit plans across carriers and markets.
Future work may include:

- Integration guidance for HRIS systems, benefit administration platforms, and digital navigators.
- Crosswalking to regulatory formats such as SBC machine-readable files and CMS PBP submissions.
- Bi-directional crosswalks to FHIR R4/R5/R6 `InsurancePlan` and the DaVinci / CARIN profiles. See `docs/fhir-alignment.md` for the v1.1.0 crosswalk.
- Certification and compliance frameworks to encourage adoption and ensure quality.

## Contributing ideas

We welcome feedback and proposals from carriers, technology vendors, regulators, and the public.
Please submit issues or pull requests in this repository to discuss enhancements or new modules.
