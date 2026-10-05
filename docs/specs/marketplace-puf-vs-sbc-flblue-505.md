# Florida Blue BlueOptions: SBC example against the public-file document

**Files compared**

- SBC side: `examples/bluecross_example.json`, keyed from `examples/sources/bluecross_blueoptions_505_2023_sbc.pdf` (BlueOptions 505, coverage period 07/01/2023 to 06/30/2024, plan type PPO).
- Public-file side: `examples/florida-blue-blueoptions-gold-1505.puf.json`, written by `scripts/from-marketplace-puf.js` from the PY2023 Plan Attributes PUF and Benefits and Cost Sharing PUF, HIOS plan ID 16842FL0070120-01.

**These are 2 different plans.** The PY2023 Plan Attributes PUF has no BlueOptions 505. A search of its Florida Blue rows for a marketing name containing "BlueOptions" and "505" finds only BlueOptions Gold 1505 (the string "505" is inside "1505"). The confirmation test failed: 1505 has a $0 in-network deductible, not $3,500 per person and $10,500 per family, and no Florida Blue PY2023 row (all 535 rows, every cost-sharing variant, tier 1 and tier 2, medical and combined columns) matches both amounts. 3 cost-sharing reduction variants (73% AV Level Silver: BlueOptions Silver 1423A, 16842FL0070073-04; BlueSelect Silver 1456A, 16842FL0120033-04; BlueCare Silver 1490A, 30252FL0020033-04) have a $3,500 individual deductible with a $7,000 family deductible. Every Florida Blue PY2023 row in the file (issuers 16842 and 30252) is individual market, EPO or HMO, with a plan effective date of 1/1/2023. The SBC prints a PPO with a 07/01/2023 to 06/30/2024 coverage period. 1505 was kept as the closest row by name; the differences below are therefore differences between 2 plans, not errors in either file, unless the PDF settles them.

Other facts that shape the tables:

- The PUF document has 3 network tiers: `IN` (in-network tier 1), `IN2` (tier 2) and `OUT`. Its Explanation text calls the lower-cost tier "Value Choice Providers" (for example on Primary Care Visit). The SBC PDF prints a "Value Choice Provider" sub-tier on 4 rows (primary care, specialist, diagnostic test, urgent care); the SBC file does not carry it, and its `IN` tier holds the other in-network amount on those rows. The tables compare SBC `IN` with PUF `IN` and show PUF `IN2` alongside.
- Benefits are paired by `canonical_key` only. Where the 2 files key the same SBC row differently (for example `outpatient_surgery` against `outpatient_surgery_facility`), the benefit appears in table 3 with a pointer to the other file.
- A cost share "matches" when coverage, type, amount or rate, and the deductible flag are all equal. `basis` is not compared, because the SBC file sets it on every step and the PUF states it only for per-day and per-stay copays; per day and per stay are shown in the text.
- "Covered; both columns Not Applicable" is a PUF tier where both the copay and the coinsurance column say `Not Applicable` (spec section 5.4).

**Settled by the PDF.** The PDF describes BlueOptions 505 only, so it cannot say what plan 1505 charges. A difference is "Not settled" when the SBC file matches its PDF. It "favors the PUF document" when the SBC file departs from its own PDF and the PDF shows what the PUF document shows, and "favors neither" when the PDF matches neither file. No row favors the SBC file, because the PDF says nothing about plan 1505.

## 1. Accumulators

| Slot | SBC file | PUF document | Same | SBC PDF (p. 1) | Settled by the PDF |
|---|---|---|---|---|---|
| `individual_deductible` | $3,500, per_year | $0, applies to integrated | differs | "In-Network: $3,500 Per Person" | Not settled |
| `family_deductible` | $10,500, per_year, embedded not stated | $0, applies to integrated, embedded | differs | "$10,500 Family"; "each family member must meet their own individual deductible until the total amount of deductible expenses paid by all family members meets the overall family deductible" | Amount: not settled. Embedded: favors the PUF document; the PDF describes an embedded family amount, the SBC file does not record it |
| `individual_oop_max` | $3,500, per_year | $5,500, applies to integrated | differs | "In-Network: $3,500 Per Person" | Not settled |
| `family_oop_max` | $10,500, per_year, embedded not stated | $11,000, applies to integrated, embedded | differs | "$10,500 Family"; "they have to meet their own out-of-pocket limits until the overall family out-of-pocket limit has been met" | Amount: not settled. Embedded: favors the PUF document; the PDF describes an embedded family amount, the SBC file does not record it |
| `oon_individual_deductible` | $5,500, per_year | $500, applies to integrated | differs | "Out-of-Network: $5,500 Per Person" | Not settled |
| `oon_family_deductible` | $11,000, per_year, embedded not stated | absent | differs | "$11,000 Family" | Not settled. The PUF row gives $500 per person and "per group not applicable", so the PUF document has no family slot (the per-person cell is kept in its source_references) |
| `oon_individual_oop_max` | $8,500, per_year | $11,000, applies to integrated | differs | "Out-Of-Network: $8,500 Per Person" | Not settled |
| `oon_family_oop_max` | $17,000, per_year, embedded not stated | $22,000, applies to integrated, embedded | differs | "$17,000 Family" | Amount: not settled. Embedded: favors the PUF document; the PDF describes an embedded family amount, the SBC file does not record it |

The SBC file records `period: per_year` on each slot; the PUF document records no period, because the Plan Attributes PUF does not state one. The PUF document records `applies_to: integrated` because the plan states its medical and drug deductibles and out-of-pocket maximums are integrated; the SBC PDF prints a separate "$300 Pharmacy Deductible" and a "$500 Out-of-Network Per Admission Deductible" (p. 1), which have no slot in the v1.1.0 accumulators and are not in the SBC file's accumulators.

## 2. Benefits in both files

26 canonical keys appear in both files. 4 match in both tiers and in limits; 22 differ somewhere. Rows are in SBC file order. A difference row is followed by the PDF check for that tier.

| canonical_key | SBC IN | PUF IN (tier 1) | PUF IN2 (tier 2) | IN | SBC OUT | PUF OUT | OUT | SBC limits | PUF limits | Limits |
|---|---|---|---|---|---|---|---|---|---|---|
| `preventive_care` | $0 copay | $0 copay | Covered; both columns Not Applicable | match | 40% coinsurance, deductible applies | 50% coinsurance | differs | none | none | match |
| `primary_care` | $35 copay | $0 copay | $20 copay | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | none | match |
| `specialist` | $50 copay | $20 copay | $60 copay | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | none | match |
| `imaging_advanced` | $250 copay | $250 copay | Covered; both columns Not Applicable | match | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | none | match |
| `generic_drugs` | $10 copay | $15 copay | Covered; both columns Not Applicable | differs | 50% coinsurance, deductible applies | 100% coinsurance | differs | none | none | match |
| `preferred_brand_drugs` | 40% coinsurance, deductible applies | $50 copay | Covered; both columns Not Applicable | differs | 50% coinsurance, deductible applies | 100% coinsurance | differs | none | none | match |
| `nonpreferred_brand_drugs` | 50% coinsurance, deductible applies | 50% coinsurance | Covered; both columns Not Applicable | differs | 50% coinsurance, deductible applies | 100% coinsurance | differs | none | none | match |
| `specialty_drugs` | Covered, no amount | 50% coinsurance | Covered; both columns Not Applicable | differs | Covered, no amount | 100% coinsurance | differs | none | none | match |
| `emergency_room` | $0 copay, deductible applies | $350 copay | Covered; both columns Not Applicable | differs | $0 copay | $350 copay | differs | none | none | match |
| `ambulance` | $0 copay, deductible applies | 40% coinsurance | Covered; both columns Not Applicable | differs | $0 copay | 40% coinsurance | differs | none | none | match |
| `urgent_care` | $60 copay | $60 copay | $60 copay | match | $60 copay, deductible applies | $60 copay, deductible applies | match | none | none | match |
| `inpatient_hospital` | $0 copay, deductible applies | $600 copay per day | Covered; both columns Not Applicable | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | none | match |
| `mental_health_outpatient` | $0 copay | $60 copay | Covered; both columns Not Applicable | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | none | match |
| `mental_health_inpatient` | $0 copay | $600 copay per day | Covered; both columns Not Applicable | differs | Covered, no amount | 0% coinsurance, deductible applies | differs | none | none | match |
| `home_health_care` | $0 copay, deductible applies | $0 copay | Covered; both columns Not Applicable | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | 60 visits per_benefit_period | differs |
| `rehabilitation_services` | $50 copay | $60 copay | Covered; both columns Not Applicable | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | 35 visits per_benefit_period | differs |
| `habilitative_services` | Not covered | $60 copay | Covered; both columns Not Applicable | differs | Not covered | 50% coinsurance, deductible applies | differs | none | 35 visits per_benefit_period | differs |
| `skilled_nursing_facility` | $0 copay, deductible applies | $500 copay per stay | Covered; both columns Not Applicable | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | 60 days per_benefit_period | differs |
| `durable_medical_equipment` | $0 copay, deductible applies | $0 copay | Covered; both columns Not Applicable | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | none | match |
| `hospice_care` | $0 copay, deductible applies | $0 copay | Covered; both columns Not Applicable | differs | 40% coinsurance, deductible applies | 50% coinsurance, deductible applies | differs | none | none | match |
| `pediatric_eye_exam` | Not covered | $0 copay | Covered; both columns Not Applicable | differs | Not covered | 100% coinsurance | differs | none | 1 visits per_year | differs |
| `pediatric_glasses` | Not covered | $0 copay | Covered; both columns Not Applicable | differs | Not covered | 100% coinsurance | differs | none | 1 items per_year | differs |
| `pediatric_dental_checkup` | Not covered | Not covered | Not covered | match | Not covered | Not covered | match | none | none | match |
| `acupuncture` | Not covered | Not covered | Not covered | match | Not covered | Not covered | match | none | none | match |
| `bariatric_surgery` | Not covered | Not covered | Not covered | match | Not covered | Not covered | match | none | none | match |
| `chiropractic_care` | Covered, no amount | $60 copay | Covered; both columns Not Applicable | differs | Covered, no amount | 50% coinsurance, deductible applies | differs | 25 visits | 35 procedures per_benefit_period | differs |

### PDF check for each difference

| canonical_key | Where | SBC PDF (BlueOptions 505) | Settled by the PDF |
|---|---|---|---|
| `preventive_care` | OUT | p. 2: "40% Coinsurance" (no "Deductible +", unlike the rows around it) | Rate: not settled. Deductible flag: favors the PUF document; the SBC file says the deductible applies, its PDF prints no deductible |
| `primary_care` | IN | p. 2: "Value Choice Provider: No Charge, Deductible does not apply/ Primary Care Visits: $35 Copay per Visit/ Virtual Visits: No Charge" | Not settled |
| `primary_care` | OUT | p. 2: "Deductible + 40% Coinsurance" | Not settled |
| `specialist` | IN | p. 2: "Value Choice Specialist: $20 Copay per Visit/ Specialist: $50 Copay per Visit" | Not settled |
| `specialist` | OUT | p. 2: "Deductible + 40% Coinsurance" | Not settled |
| `imaging_advanced` | OUT | p. 2: "Deductible + 40% Coinsurance" | Not settled |
| `generic_drugs` | IN | p. 3: "$10 Copay per Prescription at retail, $25 Copay per Prescription by mail" | Not settled |
| `generic_drugs` | OUT | p. 3: "50% Coinsurance" (no deductible printed) | Rate: not settled. Deductible flag: favors the PUF document; the SBC file says the deductible applies, its PDF prints none |
| `preferred_brand_drugs` | IN | p. 3: "$300 Pharmacy Deductible + 40% Coinsurance at retail" | Not settled |
| `preferred_brand_drugs` | OUT | p. 3: "$300 Pharmacy Deductible + 50% Coinsurance" | Not settled |
| `nonpreferred_brand_drugs` | IN | p. 3: "$300 Pharmacy Deductible + 50% Coinsurance at retail" | Not settled |
| `nonpreferred_brand_drugs` | OUT | p. 3: "$300 Pharmacy Deductible + 50% Coinsurance" | Not settled |
| `specialty_drugs` | IN | p. 3: "Specialty drugs are subject to the cost share based on applicable drug tier." | Not settled |
| `specialty_drugs` | OUT | p. 3: same text as in network | Not settled |
| `emergency_room` | IN | p. 3: "No Charge after Deductible" | Not settled |
| `emergency_room` | OUT | p. 3: "No Charge after In-Network Deductible" | Amount: not settled. Deductible flag: favors neither; the PDF says the in-network deductible applies, both files say it does not |
| `ambulance` | IN | p. 3: "No Charge after Deductible" | Not settled |
| `ambulance` | OUT | p. 3: "No Charge after In-Network Deductible" | Amount: not settled. Deductible flag: favors neither; the PDF says the in-network deductible applies, both files say it does not |
| `inpatient_hospital` | IN | p. 4: "No Charge after Deductible" | Not settled |
| `inpatient_hospital` | OUT | p. 4: "Per Admission Deductible + Deductible + 40% Coinsurance" | Not settled |
| `mental_health_outpatient` | IN | p. 4: "No Charge, Deductible does not apply/ Specialist Virtual Visits: No Charge, Deductible does not apply/ Hospital Opt 1: No Charge, Deductible does not apply" | Not settled |
| `mental_health_outpatient` | OUT | p. 4: "Deductible + 40% Coinsurance" | Not settled |
| `mental_health_inpatient` | IN | p. 4: "No Charge, Deductible does not apply" | Not settled |
| `mental_health_inpatient` | OUT | p. 4: "Physician Services: No Charge, Deductible does not apply/ Hospital: No Charge after In-Network Deductible" | Favors neither; the SBC file carries no amount, and the PUF document's single step matches only the hospital part of what the PDF prints |
| `home_health_care` | IN | p. 4: "No Charge after Deductible" | Not settled |
| `home_health_care` | OUT | p. 4: "Deductible + 40% Coinsurance" | Not settled |
| `home_health_care` | limits | p. 4: "Coverage limited to 10 visits." | Favors neither; the SBC file has no limit, the PDF prints 10 visits, the PUF document has 60 |
| `rehabilitation_services` | IN | p. 4: "$50 Copay per Visit" | Not settled |
| `rehabilitation_services` | OUT | p. 4: "Deductible + 40% Coinsurance" | Not settled |
| `rehabilitation_services` | limits | p. 4: "Coverage limited to 25 visits" | Favors neither; the SBC file has no limit, the PDF prints 25 visits, the PUF document has 35 |
| `habilitative_services` | IN | p. 4: "Not Covered" | Not settled |
| `habilitative_services` | OUT | p. 4: "Not Covered" | Not settled |
| `habilitative_services` | limits | p. 4: no limit (not covered) | Not settled |
| `skilled_nursing_facility` | IN | p. 4: "No Charge after Deductible" | Not settled |
| `skilled_nursing_facility` | OUT | pp. 4 to 5: "Deductible + 40% Coinsurance" (split across the page break) | Not settled |
| `skilled_nursing_facility` | limits | p. 4: "Coverage limited to 60 days." | Favors the PUF document on the value; the SBC file has no limit, the PDF and the PUF document both say 60 days (the PDF states no period) |
| `durable_medical_equipment` | IN | p. 5: "No Charge after Deductible" | Not settled |
| `durable_medical_equipment` | OUT | p. 5: "Deductible + 40% Coinsurance" | Not settled |
| `hospice_care` | IN | p. 5: "No Charge after Deductible" | Not settled |
| `hospice_care` | OUT | p. 5: "Deductible + 40% Coinsurance" | Not settled |
| `pediatric_eye_exam` | IN | p. 5: "Not Covered" | Not settled |
| `pediatric_eye_exam` | OUT | p. 5: "Not Covered" | Not settled |
| `pediatric_eye_exam` | limits | p. 5: no limit (not covered) | Not settled |
| `pediatric_glasses` | IN | p. 5: "Not Covered" | Not settled |
| `pediatric_glasses` | OUT | p. 5: "Not Covered" | Not settled |
| `pediatric_glasses` | limits | p. 5: no limit (not covered) | Not settled |
| `chiropractic_care` | IN | p. 5: "Chiropractic care - Limited to 25 visits" under Other Covered Services; no amount printed | Not settled |
| `chiropractic_care` | OUT | p. 5: no amount printed | Not settled |
| `chiropractic_care` | limits | p. 5: "Limited to 25 visits" | Not settled |

## 3. Benefits in only one file

5 canonical keys are only in the SBC file and 18 only in the PUF document. "Other file" points to a row in the other file that carries the same SBC or PUF label under a different key, or says none.

| canonical_key | In | IN | IN2 | OUT | Limits | Other file | SBC PDF (BlueOptions 505) |
|---|---|---|---|---|---|---|---|
| `diagnostic_test` | SBC file | $75 copay | | 40% coinsurance, deductible applies | none | PUF rows "Laboratory Outpatient and Professional Services" (diagnostic_lab) and "X-rays and Diagnostic Imaging" (imaging_standard) | p. 2: "Value Choice Specialist: $20 Copay per Visit/ Independent Clinical Lab: No Charge, Deductible does not apply/ Independent Diagnostic Testing Center: $75 Copay per Visit"; out of network "Deductible + 40% Coinsurance" |
| `outpatient_surgery` | SBC file | $0 copay, deductible applies | | 40% coinsurance, deductible applies | none | PUF row "Outpatient Facility Fee (e.g., Ambulatory Surgery Center)" (outpatient_surgery_facility) | p. 3, facility fee: "No Charge after Deductible"; out of network "Deductible + 40% Coinsurance" |
| `surgery_professional` | SBC file | $0 copay, deductible applies | | Covered, no amount | none | PUF row "Outpatient Surgery Physician/Surgical Services" (outpatient_surgery_professional) | p. 3, physician/surgeon fees: "No Charge after Deductible"; out of network "Ambulatory Surgical Center: Deductible + 40% Coinsurance/ Hospital: No Charge after In-Network Deductible" |
| `delivery_professional` | SBC file | $0 copay | | $0 copay | none | PUF row "Delivery and All Inpatient Services for Maternity Care" (delivery_inpatient) covers delivery as one row | p. 4: "No Charge, Deductible does not apply"; out of network the same |
| `delivery_facility` | SBC file | $150 copay | | $150 copay | none | PUF row "Delivery and All Inpatient Services for Maternity Care" (delivery_inpatient) covers delivery as one row | p. 4: "$150 Copay per Day / $750 maximum"; out of network "$150 Copay per Day" |
| `outpatient_surgery_facility` | PUF document ("Outpatient Facility Fee (e.g., Ambulatory Surgery Center)") | $450 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | SBC file benefit OUTPATIENT_SURGERY (outpatient_surgery), the facility fee row | p. 3, facility fee: "No Charge after Deductible" |
| `outpatient_surgery_professional` | PUF document ("Outpatient Surgery Physician/Surgical Services") | $0 copay | Covered; both columns Not Applicable | $0 copay | none | SBC file benefit SURGERY_PROFESSIONAL (surgery_professional) | p. 3, physician/surgeon fees: "No Charge after Deductible" |
| `infertility_treatment` | PUF document ("Infertility Treatment") | Not covered | Not covered | Not covered | none | none | p. 5: listed under "Services Your Plan Generally Does NOT Cover" |
| `inpatient_hospital_professional` | PUF document ("Inpatient Physician and Surgical Services") | $0 copay | Covered; both columns Not Applicable | $0 copay | none | none | p. 4, hospital stay physician/surgeon fees: "No Charge after Deductible"; out of network "No Charge after In-Network Deductible" |
| `delivery_inpatient` | PUF document ("Delivery and All Inpatient Services for Maternity Care") | $600 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | SBC file benefits DELIVERY_PROFESSIONAL and DELIVERY_FACILITY | p. 4: see those 2 rows |
| `substance_use_outpatient` | PUF document ("Substance Abuse Disorder Outpatient Services") | $60 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | none; the SBC file has mental health rows only | p. 4: one row "If you need mental health, behavioral health, or substance abuse services", outpatient "No Charge, Deductible does not apply" |
| `substance_use_inpatient` | PUF document ("Substance Abuse Disorder Inpatient Services") | $600 copay per day | Covered; both columns Not Applicable | 0% coinsurance, deductible applies | none | none; the SBC file has mental health rows only | p. 4: same row, inpatient "No Charge, Deductible does not apply" |
| `speech_therapy` | PUF document ("Rehabilitative Speech Therapy") | $60 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | 35 visits per_benefit_period | none | no separate row; p. 4 rehabilitation services "$50 Copay per Visit" |
| `well_child_visit` | PUF document ("Well Baby Visits and Care") | $0 copay | Covered; both columns Not Applicable | 50% coinsurance | none | none | no separate row; p. 2 preventive care "No Charge, Deductible does not apply" |
| `diagnostic_lab` | PUF document ("Laboratory Outpatient and Professional Services") | $20 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | SBC file benefit DIAGNOSTIC_TEST (diagnostic_test) | p. 2: "Independent Clinical Lab: No Charge, Deductible does not apply" |
| `imaging_standard` | PUF document ("X-rays and Diagnostic Imaging") | $135 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | SBC file benefit DIAGNOSTIC_TEST (diagnostic_test) | p. 2: "Independent Diagnostic Testing Center: $75 Copay per Visit" |
| `dialysis` | PUF document ("Dialysis") | $450 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | none | no row |
| `allergy_testing` | PUF document ("Allergy Testing") | $60 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | none | no row |
| `chemotherapy` | PUF document ("Chemotherapy") | $450 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | none | no row |
| `radiation_therapy` | PUF document ("Radiation") | $450 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | none | no row |
| `diabetes_management` | PUF document ("Diabetes Education") | $0 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | none | no row |
| `dme_prosthetics` | PUF document ("Prosthetic Devices") | $0 copay | Covered; both columns Not Applicable | 50% coinsurance, deductible applies | none | none | no row |
| `nutritional_counseling` | PUF document ("Nutritional Counseling") | $20 copay | $60 copay | 50% coinsurance, deductible applies | none | none | no row |

The PUF document also lists, in its `source_references`, 31 Benefits and Cost Sharing PUF rows whose names have no canonical key (for example "Prenatal and Postnatal Care" and "Rehabilitative Occupational and Rehabilitative Physical Therapy"). They are not compared here. The SBC PDF prints a prenatal "Office visits" row (p. 4, "$35 Copay on initial Visit"; out of network "$35 Copay per Visit") that the SBC file does not carry as a benefit.
