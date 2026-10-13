# Validation record

**Date:** 2026-09-24; United, Ambetter and Kaiser re-validated 2026-09-25 after data fixes; the 8 SBC files re-validated 2026-10-05 after limits, deductible flags and conditions were read from the source PDFs; Aetna PPO 1500, Aetna PPO 5000, GatorCare and United re-validated 2026-10-05 after the deductible flags on silent cells were set (no count changed)
**Result:** all 10 files pass with **0 errors**. 75 warnings, all explained below. The 5 Medicare Advantage Bundles from the PBP importer were validated on 2026-10-06 (second run) again on 2026-10-09 after 4 of their benefits gained canonical keys (third run), and on 2026-10-11 after the importer gained 10 service categories (fourth run), all at the end of this file: 0 errors; 15 warnings in the second and third runs, 16 in the fourth. On 2026-10-13 all 15 Bundles here were validated again, unchanged, with the 5 Marketplace Bundles of `examples/fhir-puf/` after the adult dental keys and the `excluded-services` extension (fifth run): the same counts for the 15, 0 errors for the 5.

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
java -Dfile.encoding=UTF-8 -jar validator_cli.jar -version 4.0.1 \
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

**3. Text-only limit codings (28 warnings: Aetna PPO 1500 3, Aetna PPO 5000 3, Ambetter 5, Cigna 2, Florida Blue 1, GatorCare 1, Kaiser 5, United 8).** `coverage[].benefit[].extension` (`benefit-limitation`): "No code provided, and a code should be provided from the value set 'Limit Type Value Set'" or "'Limit Period Value Set'". The CARIN limit type codes are `visits`, `days` and `dollars`, and the converter codes a limit period only for plan year, calendar year, benefit period and lifetime; it writes `per_year` as text because the BPS value does not say plan year or calendar year (converter spec 6.6). The bindings are extensible, so each of these is a text-only CodeableConcept carrying the BPS value. The values come from the SBC Limitations column (added 2026-10-05):

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

## Second run: 2026-10-06, the 5 PBP Bundles

**Result:** all 5 files pass with **0 errors**. 15 warnings, explained below.

| Item | Value |
|---|---|
| Validator | HL7 FHIR validator `validator_cli.jar` 7.0.0 (Git# 37795f3f571f, built 2026-10-06T19:02:34Z) |
| Java | OpenJDK 17.0.19 |
| FHIR version | 4.0.1 |
| Packages | `hl7.fhir.us.insurance-card#2.0.0-ballot` and `fhir/definitions` |

Command, from the repository root (`-Dfile.encoding=UTF-8` is there because the validator warns without it):

```
java -Dfile.encoding=UTF-8 -jar validator_cli.jar -version 4.0.1 \
  -ig hl7.fhir.us.insurance-card#2.0.0-ballot \
  -ig fhir/definitions \
  examples/fhir/aarp-medicare-advantage-from-uhc-fl-0021-ppo-h2406-013-000.json \
  examples/fhir/humana-gold-plus-h1036-068-hmo-h1036-068-000.json \
  examples/fhir/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json \
  examples/fhir/upmc-for-life-ppo-rx-choice-ppo-h5533-019-000.json \
  examples/fhir/scan-costco-medicare-advantage-hmo-h5425-140-000.json
```

| File | Errors | Warnings | Information |
|---|---|---|---|
| `aarp-medicare-advantage-from-uhc-fl-0021-ppo-h2406-013-000.json` | 0 | 0 | 104 |
| `humana-gold-plus-h1036-068-hmo-h1036-068-000.json` | 0 | 0 | 99 |
| `aetna-medicare-select-extra-hmo-pos-h1609-028-000.json` | 0 | 11 | 103 |
| `upmc-for-life-ppo-rx-choice-ppo-h5533-019-000.json` | 0 | 4 | 104 |
| `scan-costco-medicare-advantage-hmo-h5425-140-000.json` | 0 | 0 | 99 |

**Warnings explained (15).** 14 are text-only `cost.qualifiers` (10 `Point-of-service option` on Aetna and 4 hospital cost tier names on UPMC), because the Cost Tier value set has only `value-choice`, `standard` and `virtual`. 1 is the Aetna `plan.type`, because the SBC Plan Type value set has no HMO-POS code (listed in the PBP importer spec, section 9.3). The information messages are the extension slicing messages, as for the SBC Bundles above.

## Third run: 2026-10-09, the 5 PBP Bundles after the canonical keys

**What changed.** `fhir/pbp-crosswalk.json` now gives 4 of the 30 service categories a canonical key: 18b1 `hearing_aids`, 18a1 `hearing_exam`, 17a1 `routine_eye_exam` and 7f_2 `routine_foot_care` (vocabulary 1.2.0). None of the 4 keys has an SBC benefit category code, so each benefit stays in the `bps-unmapped-benefit` extension, which now carries its `canonicalKey`. Nothing else in the Bundles moved.

**Result:** all 5 files pass with **0 errors**. 15 warnings, the same 15 as the second run. Same validator (`validator_cli.jar` 7.0.0, Git# 37795f3f571f), Java, packages and command as the second run.

| File | Errors | Warnings | Information |
|---|---|---|---|
| `aarp-medicare-advantage-from-uhc-fl-0021-ppo-h2406-013-000.json` | 0 | 0 | 104 |
| `humana-gold-plus-h1036-068-hmo-h1036-068-000.json` | 0 | 0 | 99 |
| `aetna-medicare-select-extra-hmo-pos-h1609-028-000.json` | 0 | 11 | 103 |
| `upmc-for-life-ppo-rx-choice-ppo-h5533-019-000.json` | 0 | 4 | 104 |
| `scan-costco-medicare-advantage-hmo-h5425-140-000.json` | 0 | 0 | 99 |

The counts match the second run file by file: a `canonicalKey` sub-extension inside an existing `bps-unmapped-benefit` extension adds no message.

## Fourth run: 2026-10-11, the 5 PBP Bundles after 10 new service categories

**What changed.** `fhir/pbp-crosswalk.json` has 40 service categories, 33 with a canonical key (was 30 and 23): 7e1 mental health individual sessions, 6 home health, 2 skilled nursing facility, 16b4 dental cleaning, 16c1 dental restorative services, 17b2 eyeglasses, 13b over-the-counter items, 13c meals, 10b transportation and 14c4 fitness, all keyed (vocabulary 1.2.0, 114 entries). Each PBP example now writes 37 of the 40 (was 27 of 30). Of the 10 new benefits only the skilled nursing facility has an SBC benefit category code (`skilled-nursing`), so each Bundle places 15 benefits (was 14) and lists 22 in `bps-unmapped-benefit` extensions (was 13). The 10 SBC Bundles above are byte-identical to the third run's.

**Result:** all 5 files pass with **0 errors**. 16 warnings. Same validator (`validator_cli.jar` 7.0.0, Git# 37795f3f571f), Java, packages and command as the second run.

| File | Errors | Warnings | Information |
|---|---|---|---|
| `aarp-medicare-advantage-from-uhc-fl-0021-ppo-h2406-013-000.json` | 0 | 0 | 120 |
| `humana-gold-plus-h1036-068-hmo-h1036-068-000.json` | 0 | 0 | 114 |
| `aetna-medicare-select-extra-hmo-pos-h1609-028-000.json` | 0 | 12 | 119 |
| `upmc-for-life-ppo-rx-choice-ppo-h5533-019-000.json` | 0 | 4 | 120 |
| `scan-costco-medicare-advantage-hmo-h5425-140-000.json` | 0 | 0 | 115 |

**Warnings explained (16).** The 15 of the third run, plus 1: the skilled nursing facility benefit on Aetna has a point-of-service cost (50% per stay), so it carries the text-only `Point-of-service option` qualifier (11 on Aetna, was 10). All 588 information messages are the extension slicing message, as above; there are 16 more than in the third run on 4 files and 15 more on Humana, from the extensions of the new benefits.

## Fifth run: 2026-10-13, all 15 Bundles unchanged, and the 5 Marketplace Bundles

**What changed.** Vocabulary 1.2.0 gained `dental_routine_adult`, `dental_basic_adult` and `dental_major_adult` (117 entries), and `fhir/marketplace-puf-crosswalk.json` keys the 3 adult dental rows (84 of 273 names mapped). The 5 Marketplace documents have 52 benefits each (was 49). The converter gained the option `--excluded-services`, which writes the CARIN `excluded-services` extension derived from the benefits not covered on any tier, only for documents from the CMS Benefits and Cost Sharing PUF (converter spec 10.1). The 5 Bundles in `examples/fhir-puf/` are rewritten with it. The 15 Bundles in this folder are written without it and are byte-identical to the fourth run's (SHA-256 of all 15 compared before and after; the pinned hashes in `scripts/to-insuranceplan.test.js` are unchanged).

**Result:** all 20 files pass with **0 errors**. Same validator (`validator_cli.jar` 7.0.0, Git# 37795f3f571f), Java and packages as the second run. Command, from the repository root:

```
java -Dfile.encoding=UTF-8 -jar validator_cli.jar -version 4.0.1 \
  -ig hl7.fhir.us.insurance-card#2.0.0-ballot \
  -ig fhir/definitions \
  examples/fhir-puf/*.json examples/fhir/*.json
```

The 15 Bundles in this folder:

| File | Errors | Warnings | Information |
|---|---|---|---|
| `aarp-medicare-advantage-from-uhc-fl-0021-ppo-h2406-013-000.json` | 0 | 0 | 120 |
| `aetna-medicare-select-extra-hmo-pos-h1609-028-000.json` | 0 | 12 | 119 |
| `aetna-ppo-1500-80-50.json` | 0 | 3 | 113 |
| `aetna-ppo-5000-80-50.json` | 0 | 3 | 112 |
| `ambetter-ca-silver-94-hmo.json` | 0 | 5 | 113 |
| `cigna-oap-bowdoin.json` | 0 | 3 | 110 |
| `flblue-blueoptions-505.json` | 0 | 1 | 122 |
| `gatorcare-prime-epo.json` | 0 | 1 | 103 |
| `humana-gold-plus-h1036-025-hmo.json` | 0 | 42 | 180 |
| `humana-gold-plus-h1036-068-hmo-h1036-068-000.json` | 0 | 0 | 114 |
| `kaiser-ca-gold-80-hmo.json` | 0 | 5 | 116 |
| `scan-classic-hmo-los-angeles.json` | 0 | 4 | 148 |
| `scan-costco-medicare-advantage-hmo-h5425-140-000.json` | 0 | 0 | 115 |
| `uhc-choice-plus-hsa-gold-1700.json` | 0 | 8 | 116 |
| `upmc-for-life-ppo-rx-choice-ppo-h5533-019-000.json` | 0 | 4 | 120 |

Each count matches the Results table above (the 10) and the fourth run (the 5 PBP Bundles).

The 5 Marketplace Bundles in `examples/fhir-puf/`, validated the same day before the change (as committed) and after:

| File | Errors before / after | Warnings before / after | Information before / after |
|---|---|---|---|
| `avmed-avmed-entrust-gold-125.json` | 0 / 0 | 31 / 31 | 141 / 144 |
| `blue-cross-and-blue-shield-of-louisiana-blue-max-copay-50-50.json` | 0 / 0 | 4 / 4 | 140 / 143 |
| `florida-blue-blueoptions-gold-1505.json` | 0 / 0 | 30 / 30 | 145 / 148 |
| `unitedhealthcare-uhc-bronze-essential.json` | 0 / 0 | 12 / 12 | 117 / 120 |
| `unitedhealthcare-uhc-gold-standard.json` | 0 / 0 | 14 / 14 | 118 / 121 |

The 3 more information messages per file are the extension slicing message on the 3 new `bps-unmapped-benefit` extensions (the adult dental keys have no SBC benefit category code). The `excluded-services` extension matches the profile's `excludedServices` slice and raises no message. The warnings are explained in `examples/fhir-puf/README.md`.
