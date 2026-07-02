# BPS ↔ FHIR `InsurancePlan` Alignment

**Status:** Draft (BPS v1.1.0)
**Last updated:** 2026-05-21
**Audience:** Implementers integrating BPS-normalized plans with FHIR-based systems (payer APIs, EHRs, member portals, regulatory submissions).

---

## 1. Why this document exists

BPS and FHIR `InsurancePlan` solve overlapping but distinct problems. They are **complementary, not competitive**:

- **FHIR** is the exchange layer. It standardizes how systems _talk_ about a plan — typically over REST, with directory profiles like DaVinci PDex Plan Net adding network and provider context. FHIR is designed for system-to-system messaging.
- **BPS** is the structural layer. It standardizes what a _normalized plan looks like_ after a carrier's source document (SBC, EOC, certificate booklet) has been parsed into machine-readable form. BPS is upstream of FHIR.

The natural integration is: **parse with BPS, exchange as FHIR `InsurancePlan`** (or a DaVinci PDex Plan Net profile). This document explains how to map between the two without losing information.

A note on FHIR versions:

- **R4** (4.0.1) is the version most U.S. payer-API regulations reference today. The mapping below targets R4.
- **R5** added minor changes to `InsurancePlan` (e.g., expanded cardinality on `coverage.network`).
- **R6** is in active ballot at HL7 as of 2026. The `InsurancePlan` resource is one of the resources receiving the broadest revision, including a likely split between **organizational** plan metadata and **product** structure. BPS is closer to the "product" structure scope than to the organizational metadata scope. We will refresh this document once R6 normative behavior stabilizes.

---

## 2. Conceptual mapping

| Concern                                | BPS field(s)                                    | FHIR `InsurancePlan` element                        |
|----------------------------------------|------------------------------------------------|----------------------------------------------------|
| Stable identifier                      | `plan_id`                                       | `InsurancePlan.identifier`                         |
| Display name                           | `plan_name`                                     | `InsurancePlan.name`                               |
| Marketing aliases                      | (none today)                                    | `InsurancePlan.alias[]`                            |
| Carrier / sponsor                      | `carrier`                                       | `InsurancePlan.ownedBy` (Reference to Organization)|
| Plan design (HMO/PPO/EPO/...)          | `plan_type`                                     | `InsurancePlan.type` (CodeableConcept)             |
| Coverage year                          | `plan_year`                                     | _not directly modeled_ — encode in `InsurancePlan.period.start.year` and/or `identifier` |
| Coverage window                        | `coverage_period.start_date`, `.end_date`       | `InsurancePlan.period.start`, `.end`               |
| Effective date of plan document        | `effective_date`                                | `InsurancePlan.period.start` (when no `coverage_period`) |
| Expiry / renewal                       | `expiry_date`                                   | `InsurancePlan.period.end`                         |
| Market segment                         | `market`                                        | `InsurancePlan.plan[].type` (CodeableConcept extension) |
| Network tiers                          | `network_tiers[]`                               | `InsurancePlan.coverage.network[]` and/or `InsurancePlan.network[]` |
| In-network accumulators                | `accumulators.individual_deductible` etc.       | `InsurancePlan.plan[].generalCost[]` _or_ profile-specific extensions |
| Out-of-network accumulators            | `accumulators.oon_individual_deductible` etc.   | Same as above, repeated with a different `applicability` qualifier |
| Per-member embedded deductible flag    | `accumulators.*.embedded`                       | Extension on `generalCost` (no native element)     |
| Benefit                                | `benefits[]`                                    | `InsurancePlan.coverage.benefit[]`                 |
| Benefit name                           | `benefits[].service_name`                       | `InsurancePlan.coverage.benefit.type` (CodeableConcept; `text`) |
| Canonical benefit code                 | `benefits[].canonical_key`                      | `InsurancePlan.coverage.benefit.type.coding[]`     |
| Category                               | `benefits[].category`                           | `InsurancePlan.coverage.type` (CodeableConcept)    |
| Cost-share rows                        | `benefits[].network_cost_shares[]`              | `InsurancePlan.plan[].specificCost[].benefit[].cost[]` |
| Cost-share type (copay/coins/ded)      | `cost_shares[].type`                            | `cost.type` (CodeableConcept, `copay`, `coinsurance`, ...) |
| Cost-share amount                      | `cost_shares[].amount`                          | `cost.value` (Quantity, currency Money)            |
| Cost-share rate (coinsurance)          | `cost_shares[].rate`                            | `cost.value` (Quantity with `code="%"`)            |
| Applicability                          | `cost_shares[].applies_to_deductible`, `applies_to_moop` | `cost.applicability` (CodeableConcept) + qualifiers |
| Conditions (auth / referral)           | `benefits[].conditions[]`                       | `coverage.benefit.requirement` (string) — lossy    |
| Limits (visits / days / dollars)       | `benefits[].limits[]`                           | `coverage.benefit.limit[]`                         |
| Source citation                        | `source_references[]`                           | `InsurancePlan.contact` or extension — lossy       |
| Schema version                         | `schema_version`                                | Extension on `meta`                                |

---

## 3. Worked example

Below is the **same plan** rendered as a BPS document and as a FHIR `InsurancePlan` resource. The example is a stripped-down version of the Aetna PPO 1500 80/50 plan in `examples/aetna_example.json`.

### 3.1 BPS (v1.1.0)

```jsonc
{
  "plan_id": "AETNA_PPO_1500_80_50",
  "plan_name": "Aetna PPO 1500 80/50 Coinsurance Plan",
  "carrier": "Aetna",
  "plan_type": "PPO",
  "plan_year": 2025,
  "effective_date": "2025-01-01",
  "expiry_date": "2025-12-31",
  "coverage_period": { "start_date": "2025-01-01", "end_date": "2025-12-31" },
  "market": "large_group",
  "network_tiers": [
    { "tier_id": "IN",  "name": "In Network" },
    { "tier_id": "OUT", "name": "Out of Network" }
  ],
  "accumulators": {
    "individual_deductible":     { "amount": 1500, "period": "per_calendar_year", "network_tier": "in-network",     "embedded": true },
    "oon_individual_deductible": { "amount": 3000, "period": "per_calendar_year", "network_tier": "out-of-network" }
  },
  "benefits": [
    {
      "benefit_id":    "PCP_VISIT",
      "benefit_type":  "medical",
      "category":      "PHYSICIAN_SERVICES",
      "service_name":  "Primary care visit",
      "canonical_key": "primary_care",
      "network_cost_shares": [
        { "tier_id": "IN",  "covered": true,
          "cost_shares": [{ "type": "copay", "sequence": 1, "amount": 25, "basis": "per_visit", "applies_to_deductible": false, "applies_to_moop": true }] },
        { "tier_id": "OUT", "covered": true,
          "cost_shares": [
            { "type": "deductible",  "sequence": 1, "rate": 1.0,  "basis": "allowed_amount", "applies_to_deductible": true, "applies_to_moop": true },
            { "type": "coinsurance", "sequence": 2, "rate": 0.50, "basis": "allowed_amount", "applies_to_deductible": true, "applies_to_moop": true }
          ] }
      ]
    }
  ],
  "schema_version": "1.1.0"
}
```

### 3.2 FHIR R4 `InsurancePlan` (equivalent)

```jsonc
{
  "resourceType": "InsurancePlan",
  "id": "aetna-ppo-1500-80-50",
  "identifier": [{
    "system": "https://benefitplanstandard.org/plan-id",
    "value":  "AETNA_PPO_1500_80_50"
  }],
  "status": "active",
  "type": [{
    "coding": [{
      "system":  "http://terminology.hl7.org/CodeSystem/insurance-plan-type",
      "code":    "ppo",
      "display": "Preferred Provider Organization"
    }]
  }],
  "name": "Aetna PPO 1500 80/50 Coinsurance Plan",
  "period": {
    "start": "2025-01-01",
    "end":   "2025-12-31"
  },
  "ownedBy": { "display": "Aetna" },
  "coverage": [{
    "type": {
      "coding": [{
        "system":  "https://benefitplanstandard.org/vocabularies/categories",
        "code":    "PHYSICIAN_SERVICES",
        "display": "Physician services"
      }]
    },
    "benefit": [{
      "type": {
        "coding": [{
          "system":  "https://benefitplanstandard.org/vocabularies/canonical-benefits",
          "code":    "primary_care",
          "display": "Primary care"
        }],
        "text": "Primary care visit"
      }
    }]
  }],
  "plan": [{
    "identifier": [{
      "system": "https://benefitplanstandard.org/plan-id",
      "value":  "AETNA_PPO_1500_80_50"
    }],
    "generalCost": [
      {
        "type":    { "text": "Individual deductible" },
        "cost":    { "value": 1500, "currency": "USD" },
        "comment": "in-network, per_calendar_year, embedded"
      },
      {
        "type":    { "text": "Individual deductible" },
        "cost":    { "value": 3000, "currency": "USD" },
        "comment": "out-of-network, per_calendar_year"
      }
    ],
    "specificCost": [{
      "category": {
        "coding": [{
          "system":  "https://benefitplanstandard.org/vocabularies/categories",
          "code":    "PHYSICIAN_SERVICES"
        }]
      },
      "benefit": [{
        "type": {
          "coding": [{
            "system": "https://benefitplanstandard.org/vocabularies/canonical-benefits",
            "code":   "primary_care"
          }]
        },
        "cost": [
          {
            "type":          { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/insurance-plan-type", "code": "copay" }] },
            "applicability": { "coding": [{ "system": "https://benefitplanstandard.org/network-tier", "code": "in-network" }] },
            "value":         { "value": 25, "code": "USD" }
          },
          {
            "type":          { "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/insurance-plan-type", "code": "coinsurance" }] },
            "applicability": { "coding": [{ "system": "https://benefitplanstandard.org/network-tier", "code": "out-of-network" }] },
            "qualifiers":    [{ "coding": [{ "system": "https://benefitplanstandard.org/cost-share-qualifier", "code": "applies_to_deductible" }] }],
            "value":         { "value": 50, "code": "%" }
          }
        ]
      }]
    }]
  }]
}
```

Notes on the mapping:

1. **BPS `plan_id`** maps to `InsurancePlan.identifier` (with a recommended `system` URL). Carriers' HIOS/CMS IDs SHOULD also be added as additional identifier entries with their own `system`.
2. **BPS `network_tiers[]`** is collapsed into FHIR `cost.applicability` codes (`in-network`, `out-of-network`, or carrier-specific tier IDs). FHIR's directory profiles (DaVinci PDex Plan Net) handle the formal network definition via `Organization` references; BPS does not. If the receiving system needs the directory, the BPS tier IDs are recommended to mirror the `Organization.identifier.value` so the two can be joined.
3. **BPS accumulators** map to `plan[].generalCost[]`. FHIR does not natively distinguish in-network from out-of-network accumulators; we recommend either (a) using `cost.applicability` if your profile exposes it on `generalCost`, or (b) the `comment` string as a fallback, with structured machine-readable data in a custom extension.
4. **BPS `cost_shares[].sequence`** is preserved by the order of the `cost[]` array in FHIR (FHIR uses array order; it does not have an explicit `sequence` field on cost rows).
5. **BPS `applies_to_deductible` and `applies_to_moop`** map to FHIR `cost.qualifiers`. The codes are not normative in core FHIR; we recommend using the BPS namespace shown above until an HL7 IG ratifies them.

---

## 4. Information BPS captures that round-trips lossily into FHIR R4

These are areas where BPS preserves carrier-document fidelity that FHIR R4 cannot natively represent without extensions:

| BPS concept                                  | FHIR R4 status                  | Practical advice                                  |
|----------------------------------------------|----------------------------------|---------------------------------------------------|
| `accumulators.*.embedded`                    | No native element                | Extension on `generalCost`                        |
| `accumulators.*.period` (`per_calendar_year` vs `per_plan_year`) | Not modeled separately from `period`        | Encode in `comment` or via an extension           |
| `cost_shares[].sequence` (multi-step)        | Array order only                 | Preserve array order; document the convention     |
| `cost_shares[].basis` (`per_visit`, `per_day`, `per_test`, `allowed_amount`) | No native element | Use a qualifier code with a BPS-defined system   |
| `benefits[].canonical_key`                   | Encode as a `Coding`             | Use the BPS canonical-benefits CodeSystem URL     |
| `benefits[].raw_label`                       | No native element                | Extension or `coverage.benefit.requirement`       |
| `benefits[].conditions[]` (structured)       | Free-text `requirement`          | Lossy; preserve structured form in an extension if downstream needs it |
| `source_references[]` (page, range, excerpt) | No native element                | Extension; required if your use case is provenance/depositional |

The DaVinci PDex Plan Net IG closes some of these gaps for U.S. payer use cases, but not all. We recommend keeping the BPS document alongside the FHIR resource (e.g., as an `Attachment` or out-of-band reference) when full fidelity is required.

---

## 5. Round-tripping guidance

If your pipeline goes BPS → FHIR → BPS:

1. Persist the original BPS document. The FHIR resource is a projection, not a replacement.
2. Use stable identifier `system` URLs so BPS `plan_id` survives the round trip.
3. Preserve the `canonical_key` Coding so the BPS benefit identity is reconstructable.
4. Treat anything pushed into `comment`, `requirement`, or generic extensions as best-effort — round-trip equality is not guaranteed.

If your pipeline goes FHIR → BPS:

1. You will need carrier-specific extraction logic; FHIR alone rarely carries enough structured cost-share information to populate BPS without a source document.
2. Use the BPS `source_references[]` field to record where each value originated, even if that source is a FHIR `Bundle` rather than a PDF.

---

## 5a. CARIN Digital Insurance Card IG (June 2026 update)

Three `InsurancePlan` changes originating from BPS implementation experience merged into the CARIN Digital Insurance Card IG's SBC InsurancePlan profile on June 25, 2026 (FHIR-57525 multi-tier cost sharing, FHIR-57526 deductible applicability, FHIR-57527 structured benefit limitation), targeting the September 2026 ballot. They give several of the "lossy" rows above a proper structured home in that profile: designation/modality cost tiers map to `cost.qualifiers` plus the `CostAppliesToNetwork` extension, `applies_to_deductible` maps to the `DeductibleApplies` extension, and typed limits map to the structured `BenefitLimitation` extension. The full field-by-field reconciliation, including the BPS v1.2.0 draft additions (`tier_class`, `parent_tier_id`, `provider_set`, `limits[].raw_text`), lives in [`carin-dic-reconciliation.md`](carin-dic-reconciliation.md).

## 6. Related profiles and reading

- HL7 FHIR R4 `InsurancePlan`: https://hl7.org/fhir/R4/insuranceplan.html
- DaVinci PDex Plan Net Implementation Guide: https://hl7.org/fhir/us/davinci-pdex-plan-net/
- CARIN Blue Button Implementation Guide: https://hl7.org/fhir/us/carin-bb/
- BPS recommended vocabularies: [`../vocabularies/`](../vocabularies/)
- BPS schema (current): [`../schema/v1.1.0/benefit-plan.schema.json`](../schema/v1.1.0/benefit-plan.schema.json)

## 7. Feedback

This document is a draft. If you are integrating BPS with a FHIR-based system and find a mapping that's incomplete, ambiguous, or wrong, please open an issue in this repository. The HL7 R6 ballot is in flight; we plan to refresh this guide once R6 normative behavior stabilizes.
