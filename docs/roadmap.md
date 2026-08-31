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
4. **CARIN SBC exporter** — A converter from BPS to the CARIN Digital Insurance Card IG's SBC `InsurancePlan` profile, built in this repo so anyone can run it. The field-by-field mapping is written (`docs/carin-dic-reconciliation.md`); targeted for the week of September 8, 2026, with the two ballot-dependent extensions flagged until STU 2.0.0 publishes.
5. **Medicare Advantage worked examples** — Extend the examples library to the CMS Summary of Benefits format (Medicare Advantage), with source documents alongside, ahead of the 2026 open enrollment period. Committed publicly to the CMS Real-Time Benefits workgroup on 2026-08-31.
6. **HealthPlanAPI reference-implementation alignment** — Bring the HealthPlanAPI BIME output into full BPS v1.1.0 conformance (snake_case, top-level fields, `cost_shares[]` array structure, ISO 8601 dates).

## Evidence from implementation (2026-08)

Verifying a seven-carrier SBC corpus through the reference implementation
(HealthPlanAPI/BIME), value by value against the source PDFs, produced direct
evidence for why BPS models cost sharing the way it does:

- **Carriers price sub-services inside a single SBC row.** Kaiser's 2026 CA HMO
  prints `X-ray: $75 / encounter` and `Lab tests: $40 / encounter` in one
  "Diagnostic test" cell. An extraction or storage model with a single copay slot
  per benefit per tier cannot be faithful to that document — it must either drop a
  value or misstate one. BPS represents it exactly, because the canonical
  vocabulary separates `diagnostic_lab`, `diagnostic_test`, `imaging_standard`,
  and `imaging_advanced` into distinct benefits, each carrying its own
  `cost_shares[]`. The schema is shaped the way the source documents actually are.
- **Cost sharing is a sequence, not a pair.** Real cells like "20% coinsurance
  after $300 copay/visit" (Aetna ER) and "$300 Pharmacy Deductible + 40%
  Coinsurance" (Florida Blue brand drugs) confirm the ordered `cost_shares[]`
  component list (copay, then coinsurance, with per-component deductible/MOOP
  flags) over any flat copay/coinsurance field pair.
- **Caps need a home.** "20% coinsurance up to $250 / prescription"
  (Kaiser specialty tier) is a coinsurance with a per-fill maximum. Candidate for
  a first-class cap field on cost-share components in a future minor version;
  representable today via `limits[]`/notes.

- **Sponsor and administrator are different parties.** GatorCare's 2026 medical SBC
  is produced by Florida Blue as plan administrator: the document titles itself
  "BlueOptions 03768 - Prime EPO Plan" under Florida Blue branding, while the plan
  sponsor (GatorCare) appears nowhere in the header. A single `carrier` field cannot
  say both things, and name-based grouping would file this self-funded plan under its
  administrator, next to Florida Blue's own BlueOptions products. FHIR R4
  `InsurancePlan` models this as `ownedBy` (sponsor) vs `administeredBy`; BPS should
  consider `plan_sponsor` / `administered_by` fields in a future minor version so ASO
  and self-funded plans carry both identities explicitly. Until then, the convention
  in the examples is: `carrier` = the sponsor, `plan_name` = the document's own title,
  verbatim.

The corresponding extraction gaps are tracked in the reference implementation
(`HealthPlanAPI: Docs/development/BIME-KNOWN-LIMITATIONS.md`); the split
multi-service case is its top-priority item.

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
