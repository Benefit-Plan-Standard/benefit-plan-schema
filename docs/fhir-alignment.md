# BPS ↔ FHIR `InsurancePlan` Alignment

**Status:** Draft (BPS v1.1.0, with the CARIN SBC InsurancePlan mapping)
**Last updated:** 2026-09-24
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

The FHIR column below is R4 core. Where the CARIN Digital Insurance Card SBC InsurancePlan profile (`sbc-insurance-plan`, ballot package `hl7.fhir.us.insurance-card#2.0.0-ballot`) binds or constrains the element, the CARIN column says how. The converter `scripts/to-insuranceplan.js` implements this table; its spec is [`specs/insuranceplan-converter.md`](specs/insuranceplan-converter.md).

| Concern | BPS field(s) | FHIR R4 `InsurancePlan` element | Under the CARIN SBC profile |
|---|---|---|---|
| Stable identifier | `plan_id` | `identifier` (system `https://benefitplanstandard.org/plan-id`) | Same |
| Regulator identifiers | `plan_identifiers[]` (v1.2.0) | additional `identifier` entries | Same; HIOS uses `https://www.cms.gov/CCIIO/Resources/Data-Resources/hios` |
| Display name | `plan_name` | `name` | `name` 1..1 |
| Marketing aliases | (none today) | `alias[]` | Same |
| Carrier / sponsor | `carrier` | `ownedBy` (Reference to Organization) | `ownedBy` 1..1 |
| Product type | (none) | `type` (`insurance-plan-type`, e.g. `medical`) | Same. Plan design is not a product type. |
| Plan design (HMO/PPO/EPO/...) | `plan_type` | `plan[].type` | `plan.type` bound (extensible) to `sbc-plan-type` (`HMO`, `PPO`, `POS`, `EPO`, `HDHP`, `INDEMNITY`) |
| Coverage window | `coverage_period.start_date`, `.end_date`; else `effective_date`, `expiry_date` | `period.start`, `.end` | `period` 1..1 |
| Coverage year | `plan_year` | `period` at year precision (`"2026"`) only when no more precise date exists; also an extension | Same |
| Market segment | `market` | Extension | Extension (`plan.type` is bound to `sbc-plan-type`) |
| Contact | (none) | `contact` | `contact` 1..*. BPS carries no contact details; the converter emits a PAYOR contact with `data-absent-reason` `unknown`. |
| Network tiers | `network_tiers[]` (`IN`, `OUT`) | `plan[].specificCost[].benefit[].cost[].applicability` (`http://terminology.hl7.org/CodeSystem/applicability`: `in-network`, `out-of-network`, `other`; required binding) | `applicability` 1..1 |
| Designation / modality tiers | `network_tiers[]` with `tier_class` `cost_designation` / `modality` (v1.2.0) | `cost.qualifiers` | `qualifiers` bound (extensible) to Cost Tier (`value-choice`, `standard`, `virtual`), plus the `CostAppliesToNetwork` extension; see [`carin-dic-reconciliation.md`](carin-dic-reconciliation.md) |
| Accumulators | `accumulators.*` | `plan[].generalCost[]`, `type` from `coverage-copay-type` (`deductible`, `maxoutofpocket`), `cost` (Money) | Same |
| In- vs out-of-network accumulator | `accumulators.*.network_tier` | `generalCost.comment`; structured form in an extension (`generalCost` has no `applicability`) | Same |
| Embedded deductible flag | `accumulators.*.embedded` | Extension on `generalCost` | Same |
| Benefit | `benefits[]` | `coverage[].benefit[]` and `plan[].specificCost[].benefit[]` | Only benefits with a code in `sbc-benefit-category` (29 codes, required binding). Others are carried in an extension by identity only. |
| Benefit category | `benefits[].category` | `coverage.type`, `specificCost.category` | Both use an `sbc-benefit-category` code, not the BPS category (`specificCost.category` is a required binding) |
| Benefit type | `benefits[].canonical_key` | `benefit.type` (CodeableConcept) | `benefit.type` required binding to `sbc-benefit-category`; the BPS canonical key can be an additional coding (system `https://benefitplanstandard.org/fhir/CodeSystem/canonical-benefits`) |
| Benefit name | `benefits[].service_name` | `benefit.type.text` | Same |
| Cost-share rows | `benefits[].network_cost_shares[].cost_shares[]` | `specificCost.benefit.cost[]`, one per step, in BPS order | `cost` 2..* per benefit |
| Cost-share type | `cost_shares[].type` | `cost.type` from `coverage-copay-type`: `copay`, `copaypct` (coinsurance), `deductible` | Same |
| Cost-share amount | `cost_shares[].amount` | `cost.value` (Quantity, `system` `urn:iso:std:iso:4217`, `code` `USD`) | `value` 1..1 |
| Cost-share rate | `cost_shares[].rate` | `cost.value` (Quantity, `system` `http://unitsofmeasure.org`, `code` `%`, value 0 to 100) | Same |
| Not covered | `network_cost_shares[].covered: false` | `cost.type.text` `Not covered`, `cost.value` with `data-absent-reason` `not-applicable` | Same |
| Deductible applicability | `cost_shares[].applies_to_deductible` | Extension | `DeductibleApplies` extension on `cost` |
| MOOP applicability | `cost_shares[].applies_to_moop` | Extension | Extension (no CARIN counterpart) |
| Conditions (auth / referral) | `benefits[].conditions[]` | `coverage.benefit.requirement` (string) | Same; structured form in an extension |
| Limits (visits / days / dollars) | `benefits[].limits[]` | `coverage.benefit.limit[]` | `BenefitLimitation` extension on `coverage.benefit` |
| Source citation | `source_references[]` | Extension | Extension, at the level BPS records it (plan or benefit) |
| Schema version | `schema_version` | Extension | Extension |

---

## 3. Worked example

Below is the **same plan** rendered as a BPS document and as a FHIR `InsurancePlan` resource. The BPS document is an illustrative, stripped-down plan modeled on the Aetna PPO 1500 80/50 example; its values are not those of `examples/aetna_example.json`. The FHIR resource is the output of `node scripts/to-insuranceplan.js` for that document.

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

### 3.2 FHIR R4 `InsurancePlan` (CARIN SBC profile)

```json
{
  "resourceType": "InsurancePlan",
  "id": "aetna-ppo-1500-80-50",
  "meta": {
    "profile": [
      "http://hl7.org/fhir/us/insurance-card/StructureDefinition/sbc-insurance-plan"
    ]
  },
  "identifier": [
    {
      "system": "https://benefitplanstandard.org/plan-id",
      "value": "AETNA_PPO_1500_80_50"
    }
  ],
  "status": "active",
  "type": [
    {
      "coding": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/insurance-plan-type",
          "code": "medical",
          "display": "Medical"
        }
      ]
    }
  ],
  "name": "Aetna PPO 1500 80/50 Coinsurance Plan",
  "period": {
    "start": "2025-01-01",
    "end": "2025-12-31"
  },
  "ownedBy": {
    "reference": "urn:uuid:f075485f-1797-58a5-a8ad-8729e4214db0",
    "display": "Aetna"
  },
  "contact": [
    {
      "extension": [
        {
          "url": "http://hl7.org/fhir/StructureDefinition/data-absent-reason",
          "valueCode": "unknown"
        }
      ],
      "purpose": {
        "coding": [
          {
            "system": "http://terminology.hl7.org/CodeSystem/contactentity-type",
            "code": "PAYOR",
            "display": "Payor"
          }
        ]
      }
    }
  ],
  "coverage": [
    {
      "type": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/us/insurance-card/CodeSystem/sbc-benefit-category",
            "code": "primary-care-visit",
            "display": "Primary Care Visit"
          }
        ]
      },
      "benefit": [
        {
          "type": {
            "coding": [
              {
                "system": "http://hl7.org/fhir/us/insurance-card/CodeSystem/sbc-benefit-category",
                "code": "primary-care-visit",
                "display": "Primary Care Visit"
              },
              {
                "system": "https://benefitplanstandard.org/fhir/CodeSystem/canonical-benefits",
                "code": "primary_care",
                "display": "Primary care visit"
              }
            ],
            "text": "Primary care visit"
          }
        }
      ]
    }
  ],
  "plan": [
    {
      "type": {
        "coding": [
          {
            "system": "http://hl7.org/fhir/us/insurance-card/CodeSystem/sbc-plan-type",
            "code": "PPO",
            "display": "Preferred Provider Organization (PPO)"
          }
        ]
      },
      "generalCost": [
        {
          "type": {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/coverage-copay-type",
                "code": "deductible",
                "display": "Deductible"
              }
            ],
            "text": "Individual deductible, in-network"
          },
          "cost": {
            "value": 1500,
            "currency": "USD"
          },
          "comment": "in-network; per_calendar_year; embedded"
        },
        {
          "type": {
            "coding": [
              {
                "system": "http://terminology.hl7.org/CodeSystem/coverage-copay-type",
                "code": "deductible",
                "display": "Deductible"
              }
            ],
            "text": "Individual deductible, out-of-network"
          },
          "cost": {
            "value": 3000,
            "currency": "USD"
          },
          "comment": "out-of-network; per_calendar_year"
        }
      ],
      "specificCost": [
        {
          "category": {
            "coding": [
              {
                "system": "http://hl7.org/fhir/us/insurance-card/CodeSystem/sbc-benefit-category",
                "code": "primary-care-visit",
                "display": "Primary Care Visit"
              }
            ]
          },
          "benefit": [
            {
              "type": {
                "coding": [
                  {
                    "system": "http://hl7.org/fhir/us/insurance-card/CodeSystem/sbc-benefit-category",
                    "code": "primary-care-visit",
                    "display": "Primary Care Visit"
                  },
                  {
                    "system": "https://benefitplanstandard.org/fhir/CodeSystem/canonical-benefits",
                    "code": "primary_care",
                    "display": "Primary care visit"
                  }
                ],
                "text": "Primary care visit"
              },
              "cost": [
                {
                  "extension": [
                    {
                      "url": "http://hl7.org/fhir/us/insurance-card/StructureDefinition/deductible-applies",
                      "valueBoolean": false
                    }
                  ],
                  "type": {
                    "coding": [
                      {
                        "system": "http://terminology.hl7.org/CodeSystem/coverage-copay-type",
                        "code": "copay",
                        "display": "Copay Amount"
                      }
                    ]
                  },
                  "applicability": {
                    "coding": [
                      {
                        "system": "http://terminology.hl7.org/CodeSystem/applicability",
                        "code": "in-network",
                        "display": "In Network"
                      }
                    ]
                  },
                  "value": {
                    "value": 25,
                    "unit": "USD",
                    "system": "urn:iso:std:iso:4217",
                    "code": "USD"
                  }
                },
                {
                  "extension": [
                    {
                      "url": "http://hl7.org/fhir/us/insurance-card/StructureDefinition/deductible-applies",
                      "valueBoolean": true
                    }
                  ],
                  "type": {
                    "coding": [
                      {
                        "system": "http://terminology.hl7.org/CodeSystem/coverage-copay-type",
                        "code": "deductible",
                        "display": "Deductible"
                      }
                    ]
                  },
                  "applicability": {
                    "coding": [
                      {
                        "system": "http://terminology.hl7.org/CodeSystem/applicability",
                        "code": "out-of-network",
                        "display": "Out of Network"
                      }
                    ]
                  },
                  "value": {
                    "value": 100,
                    "unit": "%",
                    "system": "http://unitsofmeasure.org",
                    "code": "%"
                  }
                },
                {
                  "extension": [
                    {
                      "url": "http://hl7.org/fhir/us/insurance-card/StructureDefinition/deductible-applies",
                      "valueBoolean": true
                    }
                  ],
                  "type": {
                    "coding": [
                      {
                        "system": "http://terminology.hl7.org/CodeSystem/coverage-copay-type",
                        "code": "copaypct",
                        "display": "Copay Percentage"
                      }
                    ]
                  },
                  "applicability": {
                    "coding": [
                      {
                        "system": "http://terminology.hl7.org/CodeSystem/applicability",
                        "code": "out-of-network",
                        "display": "Out of Network"
                      }
                    ]
                  },
                  "value": {
                    "value": 50,
                    "unit": "%",
                    "system": "http://unitsofmeasure.org",
                    "code": "%"
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

Notes on the mapping:

1. **BPS `plan_id`** maps to `InsurancePlan.identifier` with the system `https://benefitplanstandard.org/plan-id`. Regulator identifiers (BPS v1.2.0 `plan_identifiers[]`) are added as further identifier entries with their own `system`.
2. **BPS `network_tiers[]`** maps to `cost.applicability`, which R4 binds (required) to `in-network`, `out-of-network` and `other`. Designation and modality tiers keep the applicability of their parent network and add a `cost.qualifiers` entry. FHIR's directory profiles (DaVinci PDex Plan Net) model networks as `Organization` resources; BPS does not, but a BPS `provider_set.reference` can point at one.
3. **BPS accumulators** map to `plan[].generalCost[]`, typed with `coverage-copay-type` (`deductible`, `maxoutofpocket`). `generalCost` has no `applicability`, so the network goes in `comment` and in an extension.
4. **BPS `cost_shares[].sequence`** is preserved by the order of the `cost[]` array (FHIR has no `sequence` on cost rows) and is also recorded in an extension.
5. **BPS `applies_to_deductible`** maps to the CARIN `DeductibleApplies` extension. **`applies_to_moop`** has no FHIR or CARIN counterpart and goes in an extension. `cost.qualifiers` is reserved for cost tiers.
6. **Currency and percentages** are Quantities with a `system`: `urn:iso:std:iso:4217` for dollars and `http://unitsofmeasure.org` for `%`.
7. The output above has the BPS extensions and the narrative removed for readability. The full output, and the extension definitions, come from the converter.

---

## 4. Information BPS captures that round-trips lossily into FHIR R4

These are areas where BPS preserves carrier-document fidelity that FHIR R4 cannot natively represent without extensions:

| BPS concept                                  | FHIR R4 status                  | Practical advice                                  |
|----------------------------------------------|----------------------------------|---------------------------------------------------|
| `accumulators.*.embedded`                    | No native element                | Extension on `generalCost` (`bps-accumulator`)    |
| `accumulators.*.period` (`per_calendar_year` vs `per_plan_year`) | Not modeled separately from `period`        | Encode in `comment` or via an extension           |
| `cost_shares[].sequence` (multi-step)        | Array order only                 | Preserve array order; document the convention     |
| `cost_shares[].basis` (`per_visit`, `per_day`, `per_test`, `allowed_amount`) | No native element | Extension on `cost` (`bps-cost-share`); `cost.qualifiers` is reserved for cost tiers under the CARIN profile |
| `benefits[].canonical_key`                   | Encode as a `Coding`             | Use the BPS canonical-benefits CodeSystem URL     |
| `benefits[].raw_label`                       | No native element                | Extension on `coverage.benefit` (`bps-benefit`)   |
| `benefits[].conditions[]` (structured)       | Free-text `requirement`          | `requirement` plus the structured form in an extension (`bps-condition`) |
| `source_references[]` (page, range, excerpt) | No native element                | Extension (`bps-source-reference`), at the level BPS records it; required if your use case is provenance/depositional |
| Benefits with no `sbc-benefit-category` code | Cannot be placed under the CARIN SBC profile (required binding) | Listed by identity in an extension (`bps-unmapped-benefit`); cost sharing not carried |

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

The SBC InsurancePlan profile (`sbc-insurance-plan`) exists only in the ballot package `hl7.fhir.us.insurance-card#2.0.0-ballot`, where the profile, its extensions and the code systems it binds are all draft and experimental. Mappings to it are ballot-stage until STU 2.0.0 publishes.

Three `InsurancePlan` changes originating from BPS implementation experience merged into the CARIN Digital Insurance Card IG's SBC InsurancePlan profile on June 25, 2026 (FHIR-57525 multi-tier cost sharing, FHIR-57526 deductible applicability, FHIR-57527 structured benefit limitation), targeting the September 2026 ballot. They give several of the "lossy" rows above a proper structured home in that profile: designation/modality cost tiers map to `cost.qualifiers` plus the `CostAppliesToNetwork` extension, `applies_to_deductible` maps to the `DeductibleApplies` extension, and typed limits map to the structured `BenefitLimitation` extension. The full field-by-field reconciliation, including the BPS v1.2.0 draft additions (`tier_class`, `parent_tier_id`, `provider_set`, `limits[].raw_text`), lives in [`carin-dic-reconciliation.md`](carin-dic-reconciliation.md).

## 6. Related profiles and reading

- HL7 FHIR R4 `InsurancePlan`: https://hl7.org/fhir/R4/insuranceplan.html
- DaVinci PDex Plan Net Implementation Guide: https://hl7.org/fhir/us/davinci-pdex-plan-net/
- CARIN Blue Button Implementation Guide: https://hl7.org/fhir/us/carin-bb/
- CARIN Digital Insurance Card IG, STU 2 ballot: http://hl7.org/fhir/us/insurance-card/2.0.0-202609-ballot
- BPS to CARIN SBC InsurancePlan converter spec: [`specs/insuranceplan-converter.md`](specs/insuranceplan-converter.md)
- BPS recommended vocabularies: [`../vocabularies/`](../vocabularies/)
- BPS schema (current): [`../schema/v1.1.0/benefit-plan.schema.json`](../schema/v1.1.0/benefit-plan.schema.json)

## 7. Feedback

This document is a draft. If you are integrating BPS with a FHIR-based system and find a mapping that's incomplete, ambiguous, or wrong, please open an issue in this repository. The HL7 R6 ballot is in flight; we plan to refresh this guide once R6 normative behavior stabilizes.
