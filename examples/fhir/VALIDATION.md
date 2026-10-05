# Validation record

**Date:** 2026-09-24; United, Ambetter and Kaiser re-validated 2026-09-25 after data fixes; the 8 SBC files re-validated 2026-10-05 after limits, deductible flags and conditions were read from the source PDFs; Aetna PPO 1500, Aetna PPO 5000, GatorCare and United re-validated 2026-10-05 after the deductible flags on silent cells were set (no count changed)
**Result:** all 10 files pass with **0 errors**. 75 warnings, all explained below.

## Setup

| Item | Value |
|---|---|
| Validator | HL7 FHIR validator `validator_cli.jar` 6.10.4 (Git# 1b90fb13f77b, built 2026-09-04) |
| Java | OpenJDK 17.0.19 |
| FHIR version | 4.0.1 |
| Target package | `hl7.fhir.us.insurance-card#2.0.0-ballot`, from the FHIR package registry (package date 2026-08-13) |
| Target profile | `http://hl7.org/fhir/us/insurance-card/StructureDefinition/sbc-insurance-plan` (draft, experimental), applied through each InsurancePlan's `meta.profile` |
| BPS definitions | `fhir/definitions/` (8 extension StructureDefinitions and the canonical-benefits CodeSystem), loaded locally with `-ig` |
| Terminology server | `https://tx.fhir.org` (validator default) |

Command, from the repository root:

```
java -jar validator_cli.jar -version 4.0.1 \
  -ig hl7.fhir.us.insurance-card#2.0.0-ballot \
  -ig fhir/definitions \
  examples/fhir/*.json
```

The validator log confirms that it loaded `hl7.fhir.us.insurance-card#2.0.0-ballot` (42 resources) and `fhir/definitions` (9 resources).

Before conversion, each BPS input was checked with `node scripts/validate.js --schema schema/v<version>/benefit-plan.schema.json`, using the version the document declares (v1.1.0 for 8 files, v1.2.0 for Humana and SCAN). All 10 passed.

## Results

| File | Errors | Warnings | Information |
|---|---|---|---|
| `aetna-ppo-1500-80-50.json` | 0 | 3 | 113 |
| `aetna-ppo-5000-80-50.json` | 0 | 3 | 112 |
| `ambetter-ca-silver-94-hmo.json` | 0 | 5 | 113 |
| `cigna-oap-bowdoin.json` | 0 | 3 | 110 |
| `flblue-blueoptions-505.json` | 0 | 1 | 122 |
| `gatorcare-prime-epo.json` | 0 | 1 | 103 |
| `humana-gold-plus-h1036-025-hmo.json` | 0 | 42 | 180 |
| `kaiser-ca-gold-80-hmo.json` | 0 | 5 | 116 |
| `scan-classic-hmo-los-angeles.json` | 0 | 4 | 148 |
| `uhc-choice-plus-hsa-gold-1700.json` | 0 | 8 | 116 |

## Warnings explained

**1. Cigna plan type (1 warning).** `plan[0].type`: "No code provided, and a code should be provided from the value set 'SBC Plan Type Value Set'". The BPS `plan_type` is `OAP` (Open Access Plus). The SBC plan type value set has no such code (HMO, PPO, POS, EPO, HDHP, INDEMNITY), and neither does the BPS plan-types vocabulary. The binding is extensible, so the converter emits `{"text": "OAP"}` rather than mapping OAP to another plan design.

**2. Text-only cost tier qualifiers (46 warnings: Humana 42, SCAN 4).** `plan[0].specificCost[].benefit[].cost[].qualifiers[]`: "No code provided, and a code should be provided from the value set 'Cost Tier Value Set'". The Cost Tier value set has three codes: `value-choice`, `standard` and `virtual`. These entries are keyed to BPS site-of-service or designation tiers that match none of them. The binding is extensible, so each is a text-only qualifier carrying the tier's name.

| File | Qualifier text | Entries |
|---|---|---|
| Humana | Outpatient hospital | 10 |
| Humana | Specialist's office | 10 |
| Humana | PCP's office | 5 |
| Humana | Urgent care center | 4 |
| Humana | Retail Cost-Sharing | 4 |
| Humana | Comprehensive outpatient rehab facility | 3 |
| Humana | Freestanding radiological facility | 2 |
| Humana | DME provider | 2 |
| Humana | Ambulatory surgery center | 1 |
| Humana | Freestanding laboratory | 1 |
| SCAN | Retail, Standard | 4 |

SCAN's "Retail, Standard" is standard retail pharmacy pricing. It is deliberately not coded `standard`, which the value set defines as "Standard Provider". Humana's telehealth tier maps to `virtual` and raises no warning.

**3. Text-only limit codings (28 warnings: Aetna PPO 1500 3, Aetna PPO 5000 3, Ambetter 5, Cigna 2, Florida Blue 1, GatorCare 1, Kaiser 5, United 8).** `coverage[].benefit[].extension` (`benefit-limitation`): "No code provided, and a code should be provided from the value set 'Limit Type Value Set'" or "'Limit Period Value Set'". The CARIN limit type codes are `visits`, `days` and `dollars`, and the converter codes a limit period only for plan year, calendar year, benefit period and lifetime; it writes `per_year` as text because the BPS value does not say plan year or calendar year (converter spec 6.5). The bindings are extensible, so each of these is a text-only CodeableConcept carrying the BPS value. The values come from the SBC Limitations column (added 2026-10-05):

| File | Text-only value | Warnings |
|---|---|---|
| Aetna PPO 1500 | limit type `items` | 1 |
| Aetna PPO 1500 | limit type `exams` | 1 |
| Aetna PPO 1500 | limit period `per_12_months` | 1 |
| Aetna PPO 5000 | limit type `items` | 1 |
| Aetna PPO 5000 | limit type `exams` | 1 |
| Aetna PPO 5000 | limit period `per_12_months` | 1 |
| Ambetter | limit type `check_ups` | 1 |
| Ambetter | limit type `pairs_of_glasses` | 1 |
| Ambetter | limit period `per_12_months` | 2 |
| Ambetter | limit period `per_6_months` | 1 |
| Cigna | limit type `exams` | 1 |
| Cigna | limit period `per_year` | 1 |
| Florida Blue | limit type `manipulations` | 1 |
| GatorCare | limit type `manipulations` | 1 |
| Kaiser | limit type `pairs_of_glasses` | 1 |
| Kaiser | limit type `check_ups` | 1 |
| Kaiser | limit period `per_year` | 3 |
| United | limit type `items` | 1 |
| United | limit type `exams` | 1 |
| United | limit type `pairs_of_glasses` | 1 |
| United | limit type `cleanings` | 1 |
| United | limit period `per_2_years` | 1 |
| United | limit period `per_12_months` | 3 |

Limits and conditions on home health care and chiropractic care stay in the BPS examples but are not in these files: neither benefit has an SBC benefit category code, so the converter lists both as unmapped (converter spec 8.3).

## Information messages

All 1,233 information messages are the same message: "This element does not match any known slice defined in the profile ... sbc-insurance-plan". Each one is a BPS extension (`bps-*`) sitting on an element where the profile slices extensions for its own CARIN extensions. The slicing is open, and each BPS extension is validated against its own definition from `fhir/definitions/`. By location: 507 on `specificCost.benefit.cost`, 338 on `InsurancePlan`, and 388 on `coverage.benefit` (62 of them are the `bps-condition` extensions added to the 8 SBC files on 2026-10-05).

## Negative control

To confirm that the profile and the BPS definitions are enforced, a copy of `aetna-ppo-1500-80-50.json` was validated with three deliberate defects: a benefit type code outside `sbc-benefit-category`, a benefit with a single `cost` entry, and an undefined sub-extension inside `bps-cost-share`. The validator reported 5 errors that covered all three defects:

- unknown code `home-health` in `sbc-benefit-category`, and none of the codings in the SBC Benefit Category value set;
- `specificCost.benefit.cost`: minimum required = 2, but only found 1;
- sub-extension url `foo` is not defined by `bps-cost-share`, and does not match any of its slices.
