# Florida Blue BlueOptions: SBC example against the public-file document

**Files compared**

- SBC side: `examples/bluecross_example.json`, keyed from `examples/sources/bluecross_blueoptions_505_2023_sbc.pdf` (BlueOptions 505, coverage period 07/01/2023 to 06/30/2024, plan type PPO).
- Public-file side: `examples/florida-blue-blueoptions-gold-1505.puf.json`, written by `scripts/from-marketplace-puf.js` from the PY2023 Plan Attributes PUF and Benefits and Cost Sharing PUF, HIOS plan ID 16842FL0070120-01.

**These are 2 different plans.** The PY2023 Plan Attributes PUF has no BlueOptions 505. A search of its Florida Blue rows for a marketing name containing "BlueOptions" and "505" finds only BlueOptions Gold 1505 (the string "505" is inside "1505"). The confirmation test failed: 1505 has a $0 in-network deductible, not $3,500 per person and $10,500 per family, and no Florida Blue PY2023 row (all 535 rows, every cost-sharing variant, tier 1 and tier 2, medical and combined columns) matches both amounts. 3 cost-sharing reduction variants (73% AV Level Silver: BlueOptions Silver 1423A, 16842FL0070073-04; BlueSelect Silver 1456A, 16842FL0120033-04; BlueCare Silver 1490A, 30252FL0020033-04) have a $3,500 individual deductible with a $7,000 family deductible. Every Florida Blue PY2023 row in the file (issuers 16842 and 30252) is individual market, EPO or HMO, with a plan effective date of 1/1/2023. The SBC prints a PPO with a 07/01/2023 to 06/30/2024 coverage period. 1505 was kept as the closest row by name; the differences below are therefore differences between 2 plans, not errors in either file.

Other facts that shape the tables:

- The PUF document has 3 network tiers: `IN` (in-network tier 1), `IN2` (tier 2) and `OUT`. Its Explanation text calls the lower-cost tier "Value Choice Providers" (for example on Primary Care Visit). The SBC file has 2 tiers, `IN` and `OUT`. The tables compare SBC `IN` with PUF `IN` and show PUF `IN2` alongside.
- Benefits are paired by `canonical_key` only. Where the 2 files key the same SBC row differently (for example `outpatient_surgery` against `outpatient_surgery_facility`), the benefit appears in table 3 with a pointer to the other file.
- A cost share "matches" when coverage, type, amount or rate, and the deductible flag are all equal. `basis` is not compared, because the SBC file sets it on every step and the PUF states it only for per-day and per-stay copays; per day and per stay are shown in the text.
- "Covered; both columns Not Applicable" is a PUF tier where both the copay and the coinsurance column say `Not Applicable` (spec section 5.4).

## 1. Accumulators

| Slot | SBC file | PUF document | Same |
|---|---|---|---|
| `individual_deductible` | $3,500, per_year | $0, applies to integrated | differs |
| `family_deductible` | $10,500, per_year, embedded not stated | $0, applies to integrated, embedded | differs |
| `individual_oop_max` | $3,500, per_year | $5,500, applies to integrated | differs |
| `family_oop_max` | $10,500, per_year, embedded not stated | $11,000, applies to integrated, embedded | differs |
| `oon_individual_deductible` | $5,500, per_year | $500, applies to integrated | differs |
| `oon_family_deductible` | $11,000, per_year, embedded not stated | absent | differs |
| `oon_individual_oop_max` | $8,500, per_year | $11,000, applies to integrated | differs |
| `oon_family_oop_max` | $17,000, per_year, embedded not stated | $22,000, applies to integrated, embedded | differs |

The SBC file records `period: per_year` on each slot; the PUF document records no period, because the Plan Attributes PUF does not state one. The PUF document records `applies_to: integrated` because the plan states its medical and drug deductibles and out-of-pocket maximums are integrated.

## 2. Benefits in both files

26 canonical keys appear in both files. 4 match in both tiers and in limits; 22 differ somewhere. Rows are in SBC file order.

| canonical_key | SBC IN | PUF IN (tier 1) | PUF IN2 (tier 2) | IN | SBC OUT | PUF OUT | OUT | SBC limits | PUF limits | Limits |
|---|---|---|---|---|---|---|---|---|---|---|
| `preventive_care` | $0 copay | $0 copay | Covered; both columns Not Applicable | match | 40% coinsurance | 50% coinsurance | differs | none | none | match |
| `primary_care` | $35 copay | $0 copay | $20 copay | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | none | match |
| `specialist` | $50 copay | $20 copay | $60 copay | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | none | match |
| `imaging_advanced` | $250 copay | $250 copay | Covered; both columns Not Applicable | match | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | none | match |
| `generic_drugs` | $10 copay | $15 copay | Covered; both columns Not Applicable | differs | 50% coinsurance | 100% coinsurance | differs | none | none | match |
| `preferred_brand_drugs` | 40% coinsurance, deductible applies | $50 copay | Covered; both columns Not Applicable | differs | 50% coinsurance, deductible applies | 100% coinsurance | differs | none | none | match |
| `nonpreferred_brand_drugs` | 50% coinsurance, deductible applies | 50% coinsurance | Covered; both columns Not Applicable | differs | 50% coinsurance, deductible applies | 100% coinsurance | differs | none | none | match |
| `specialty_drugs` | Covered, no amount | 50% coinsurance | Covered; both columns Not Applicable | differs | Covered, no amount | 100% coinsurance | differs | none | none | match |
| `emergency_room` | $0 copay, deductible applies | $350 copay | Covered; both columns Not Applicable | differs | $0 copay, deductible applies | $350 copay | differs | none | none | match |
| `ambulance` | $0 copay, deductible applies | 40% coinsurance | Covered; both columns Not Applicable | differs | $0 copay, deductible applies | 40% coinsurance | differs | none | none | match |
| `urgent_care` | $60 copay | $60 copay | $60 copay | match | $60 copay, deductible applies | $60 copay, deductible applies | match | none | none | match |
| `inpatient_hospital` | $0 copay, deductible applies | $600 copay per day | Covered; both columns Not Applicable | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | none | match |
| `mental_health_outpatient` | $0 copay | $60 copay | Covered; both columns Not Applicable | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | none | match |
| `mental_health_inpatient` | $0 copay | $600 copay per day | Covered; both columns Not Applicable | differs | Covered, no amount | 0% coinsurance, deductible applies | differs | none | none | match |
| `home_health_care` | $0 copay, deductible applies | $0 copay | Covered; both columns Not Applicable | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | 10 visits | 60 visits per_benefit_period | differs |
| `rehabilitation_services` | $50 copay | $60 copay | Covered; both columns Not Applicable | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | 25 visits; 26 manipulations | 35 visits per_benefit_period | differs |
| `habilitative_services` | Not covered | $60 copay | Covered; both columns Not Applicable | differs | Not covered | 50% coinsurance, deductible applies | differs | none | 35 visits per_benefit_period | differs |
| `skilled_nursing_facility` | $0 copay, deductible applies | $500 copay per stay | Covered; both columns Not Applicable | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | 60 days | 60 days per_benefit_period | differs |
| `durable_medical_equipment` | $0 copay, deductible applies | $0 copay | Covered; both columns Not Applicable | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | none | match |
| `hospice_care` | $0 copay, deductible applies | $0 copay | Covered; both columns Not Applicable | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | none | match |
| `pediatric_eye_exam` | Not covered | $0 copay | Covered; both columns Not Applicable | differs | Not covered | 100% coinsurance | differs | none | 1 visits per_year | differs |
| `pediatric_glasses` | Not covered | $0 copay | Covered; both columns Not Applicable | differs | Not covered | 100% coinsurance | differs | none | 1 items per_year | differs |
| `pediatric_dental_checkup` | Not covered | Not covered | Not covered | match | Not covered | Not covered | match | none | none | match |
| `acupuncture` | Not covered | Not covered | Not covered | match | Not covered | Not covered | match | none | none | match |
| `bariatric_surgery` | Not covered | Not covered | Not covered | match | Not covered | Not covered | match | none | none | match |
| `chiropractic_care` | Covered, no amount | $60 copay | Covered; both columns Not Applicable | differs | Covered, no amount | 50% coinsurance, deductible applies | differs | 25 visits | 35 procedures per_benefit_period | differs |

## 3. Benefits in only one file

5 canonical keys are only in the SBC file and 18 only in the PUF document. "Other file" points to a row in the other file that carries the same SBC or PUF label under a different key, or says none.

| canonical_key | In | IN | IN2 | OUT | Limits | Other file |
|---|---|---|---|---|---|---|
| `diagnostic_test` | SBC file | $75 copay | | 40% coinsurance, deductible applies | none | PUF rows "Laboratory Outpatient and Professional Services" (diagnostic_lab) and "X-rays and Diagnostic Imaging" (imaging_standard) |
| `outpatient_surgery` | SBC file | $0 copay, deductible applies | | 40% coinsurance, deductible applies | none | PUF row "Outpatient Facility Fee (e.g., Ambulatory Surgery Center)" (outpatient_surgery_facility) |
| `surgery_professional` | SBC file | $0 copay, deductible applies | | Covered, no amount | none | PUF row "Outpatient Surgery Physician/Surgical Services" (outpatient_surgery_professional) |
| `delivery_professional` | SBC file | $0 copay | | $0 copay | none | PUF row "Delivery and All Inpatient Services for Maternity Care" (delivery_inpatient) covers delivery as one row |
| `delivery_facility` | SBC file | $150 copay | | $150 copay | none | PUF row "Delivery and All Inpatient Services for Maternity Care" (delivery_inpatient) covers delivery as one row |
| `outpatient_surgery_facility` | PUF document ("Outpatient Facility Fee (e.g., Ambulatory Surgery Center)") | $450 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | SBC file benefit OUTPATIENT_SURGERY (outpatient_surgery), the facility fee row |
| `outpatient_surgery_professional` | PUF document ("Outpatient Surgery Physician/Surgical Services") | $0 copay | Covered; both columns Not Applicable | $0 copay | none | SBC file benefit SURGERY_PROFESSIONAL (surgery_professional) |
| `infertility_treatment` | PUF document ("Infertility Treatment") | Not covered | Not covered | Not covered | none | none |
| `inpatient_hospital_professional` | PUF document ("Inpatient Physician and Surgical Services") | $0 copay | Covered; both columns Not Applicable | $0 copay | none | none |
| `delivery_inpatient` | PUF document ("Delivery and All Inpatient Services for Maternity Care") | $600 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | SBC file benefits DELIVERY_PROFESSIONAL and DELIVERY_FACILITY |
| `substance_use_outpatient` | PUF document ("Substance Abuse Disorder Outpatient Services") | $60 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | none; the SBC file has mental health rows only |
| `substance_use_inpatient` | PUF document ("Substance Abuse Disorder Inpatient Services") | $600 copay per day | Covered; both columns Not Applicable | 0% coinsurance, deductible applies | none | none; the SBC file has mental health rows only |
| `speech_therapy` | PUF document ("Rehabilitative Speech Therapy") | $60 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | 35 visits per_benefit_period | none |
| `well_child_visit` | PUF document ("Well Baby Visits and Care") | $0 copay | Covered; both columns Not Applicable | 50% coinsurance | none | none |
| `diagnostic_lab` | PUF document ("Laboratory Outpatient and Professional Services") | $20 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | SBC file benefit DIAGNOSTIC_TEST (diagnostic_test) |
| `imaging_standard` | PUF document ("X-rays and Diagnostic Imaging") | $135 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | SBC file benefit DIAGNOSTIC_TEST (diagnostic_test) |
| `dialysis` | PUF document ("Dialysis") | $450 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | none |
| `allergy_testing` | PUF document ("Allergy Testing") | $60 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | none |
| `chemotherapy` | PUF document ("Chemotherapy") | $450 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | none |
| `radiation_therapy` | PUF document ("Radiation") | $450 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | none |
| `diabetes_management` | PUF document ("Diabetes Education") | $0 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | none |
| `dme_prosthetics` | PUF document ("Prosthetic Devices") | $0 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | none |
| `nutritional_counseling` | PUF document ("Nutritional Counseling") | $20 copay | $60 copay | 50% coinsurance, deductible applies | none | none |

The PUF document also lists, in its `source_references`, 31 Benefits and Cost Sharing PUF rows whose names have no canonical key (for example "Prenatal and Postnatal Care" and "Rehabilitative Occupational and Rehabilitative Physical Therapy"). They are not compared here.
