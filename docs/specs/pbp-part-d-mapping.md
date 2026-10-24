# Spec: the Part D sections of the PBP importer (pbp_mrx, pbp_mrx_tier, pbp_mrx_p)

**Status:** Built, 2026-10-24. Session 1 decided the mapping, the fixtures and the tests; session 2 built it the same day in `scripts/from-pbp.js` and `scripts/to-insuranceplan.js`, with the tests of section 16 and the results of section 20. Questions Q1 to Q8 (section 19) decided on 2026-10-24: Q1 to Q5, Q7 and Q8 as recommended; Q6 as decided; Q3's reading confirmed on 1 Summary of Benefits in session 2. Where session 2 found this document wrong against the file or the code, it was corrected in the same change; section 20 lists each correction.
**Reads with:** [`pbp-importer.md`](pbp-importer.md) (the medical importer this extends; "spec" below means that document), [`pbp-record-layout-notes.md`](pbp-record-layout-notes.md) section 6.3, [`pbp-part-d/profile/profile.md`](pbp-part-d/profile/profile.md) (every count below, written by [`pbp-part-d/profile/profile-mrx.js`](pbp-part-d/profile/profile-mrx.js); "P4" means its section P4), [`pbp-part-d/profile/code-lists.md`](pbp-part-d/profile/code-lists.md) (the dictionary's code lists for the 3 files), [`../../modules/pharmacy/v0.2.1/README.md`](../../modules/pharmacy/v0.2.1/README.md).
**Schema:** the Benefit Plan Standard 1.2.0 draft 6 (`v1.2.0-draft.6`, commit `30b7980`): the `pharmacy` object, the benefit extension fields of the pharmacy module v0.2.1 and `cost_shares[].moop_ref`. Nothing in the schema changes for this work.

Every number below comes from the profile run of 2026-10-24 over the CY 2027 release ("PBP Benefits-2027", downloaded 2026-10-06), and every cell quoted comes from the plan listings in [`pbp-part-d/profile/plans/`](pbp-part-d/profile/plans/), written by the same script. The listing of the Part D benefits each fixture plan gets under this mapping is there too (`<plan>-benefits.md`, `--benefits`).

---

## 1. Scope

- The Part D benefit of a Medicare Advantage plan with drug coverage (MA-PD) and of a stand-alone Medicare Prescription Drug Plan (PDP), from `pbp_mrx.txt` (1 row per plan, 90 columns), `pbp_mrx_tier.txt` (1 row per plan and tier, 140 columns) and `pbp_mrx_p.txt` (1 row per plan and tier after the out-of-pocket threshold, 20 columns).
- One document per plan (decision D2 of the session brief): an MA-PD's pharmacy object and Part D benefits go into the document its medical benefits are in today; a PDP gets a document of its own with no medical benefits.
- The rules of the medical importer hold unchanged: nothing invented, nothing dropped silently (a value with no field goes to `source_references` or a `notes`), deterministic output, the schema checked before a document is written.
- **Out of scope** (decision D8): the formulary file (drug lists: RxCare's exporter and the November reader); pharmacy pricing (the quarterly pricing file, outside the Benefit Plan Standard); the Marketplace importer; the converter beyond what section 14 says; `pbp_b20.txt` (15 cost plans that do not offer Part D: not Part D); the PDP premium (section 4); the optional supplemental and UF/SSBCI files, as for the medical side.

## 2. Sources

| Item | Value |
|---|---|
| Files | `data/pbp/2027/pbp_mrx.txt`, `pbp_mrx_tier.txt`, `pbp_mrx_p.txt`, with `pbp_Section_A.txt` and `PlanRegionArea.txt`; the release of the medical importer (spec section 2) |
| Layout | `PBP_Benefits_2027_dictionary.xlsx`: every column of the 3 files is in the dictionary and every dictionary name is in a file (`code-lists.md`). The Readme names the 3 files under "The pbp_mrx files for 2027 are provided in three files" and lists their 2026 column changes (Readme change log of January 5, February 13 and May 22, 2026). |
| Part D parameters | CMS, "Announcement of Calendar Year (CY) 2027 Medicare Advantage (MA) Capitation Rates and Part C and Part D Payment Policies", April 6, 2026, https://www.cms.gov/files/document/2027-announcement.pdf (1,622,523 bytes, `Last-Modified` Mon, 06 Apr 2026 16:22:34 GMT, SHA-256 `8bb37a0969062c57600f5cea9a0f2f281ee1377d91444afc36554f58ad0d8504`). Attachment V, Table V-2 "Updated Part D Benefit Parameters for Defined Standard Benefit, Low-Income Subsidy (LIS) and Retiree Drug Subsidy" (page 95): Standard Benefit, Deductible $700, Out-of-Pocket Threshold $2,400 for 2027 ($615 and $2,100 for 2026). Table V-6 "Part D Benefit Parameters for Defined Standard Benefit for CY 2026 and CY 2027 for Non-LIS Beneficiaries" (page 99): a Deductible Phase (cost sharing 100%, deductible $700), an Initial Coverage Phase (cost sharing 25%) and the Out-of-Pocket Threshold of $2,400, and no coverage gap phase. Read in the PDF with `pdftotext -layout`; page numbers are the printed ones, which equal the PDF's. |
| What counts toward the threshold | 42 CFR 423.100, "Incurred costs": "costs incurred by a Part D enrollee ... For ... Covered Part D drugs that are not paid for under the Part D plan as a result of application of any annual deductible or other cost-sharing rules for covered Part D drugs prior to the Part D enrollee satisfying the out-of-pocket threshold ..., including any price differential for which the Part D enrollee is responsible under § 423.124(b)". eCFR, version of 2026-10-01. |
| Drug tier codes | HL7 Da Vinci Payer Data Exchange (PDex) US Drug Formulary 2.1.0 (STU2.1), CodeSystem `http://hl7.org/fhir/us/davinci-drug-formulary/CodeSystem/usdf-DrugTierCS-TEMPORARY-TRIAL-USE`, 11 codes: `generic`, `preferred`, `non-preferred`, `preferred-generic`, `non-preferred-generic`, `specialty`, `brand`, `preferred-brand`, `non-preferred-brand`, `zero-cost-share-preventative`, `medical-service`. This is the "FHIR DrugTierVS vocabulary" the schema's `formulary_tiers[].tier_code` names. The repository has no drug tier vocabulary of its own (`vocabularies/` holds 5 files, none for tiers). |
| Check documents | 2027 Summary of Benefits, Humana Gold Plus H1036-068 (HMO), document ID `H1036_SB_MAPD_HMO_068000_2027_M`, 24 pages, `data/pbp/2027/sob/H1036-068-000-2027-SB.pdf`; 2027 Summary of Benefits, AARP Medicare Rx Preferred from UHC (PDP) S5921-383-000, document ID `Y0066_SB_S5921_383_000_2027_M`, 5 pages, `data/pbp/2027/sob/S5921-383-000-2027-SB.pdf` (section 18). |

## 3. The two populations, and how each is detected

Counts: P1, P2.

| Population | Detection | Plans | Written |
|---|---|---|---|
| **MA-PD** | `pbp_a_plan_type` 01, 02, 04 or 31 and `pbp_mrx.txt` `mrx_drug_ben_yn` "1" | 5,996 | The medical document, plus `pharmacy` and the Part D benefits after the medical ones |
| **PDP** | `pbp_a_plan_type` 29 (every one has `mrx_drug_ben_yn` "1") | 606 | A PDP document (section 4) |
| MA without Part D | 01, 02, 04, 31 and `mrx_drug_ben_yn` "2" | 876 | The medical document as today, with 1 `source_references` entry quoting `mrx_drug_ben_yn` |
| Employer PDP, direct contract | `pbp_a_plan_type` 30 | 2 | Refused (section 4.1) |

The brief's "7,365 MA plans" is every plan with a Section D row, all types but 29 and 30 (layout notes section 5); the importer's MA population is the 6,872 plans of types 01, 02, 04 and 31, of which 5,996 have Part D and 876 do not. The other MA types (07, 09, 18, 20; 436 of them answer Part D "1") stay outside the importer's scope (spec section 1).

The detection reads `mrx_drug_ben_yn`, not Section A's `pbp_a_contract_partd_flag`: 874 MA plans have the contract flag "1" and `mrx_drug_ben_yn` "2" (P16), because the flag describes the contract, not the plan. Every plan of types 01, 02, 04, 31 and 29 has a `pbp_mrx.txt` row (7,971 rows, 0 keys missing from Section A, P1); a missing row is an error. `mrx_drug_ben_yn` other than 1 or 2 is an error.

Inside the 2 populations, the file holds 3 kinds of plan (P2):

| Kind | `mrx_benefit_type` | MA-PD | PDP | Tier rows | What the importer writes |
|---|---|---|---|---|---|
| Tiered design | 2 Actuarially Equivalent Standard, 3 Basic Alternative, 4 Enhanced Alternative | 31 + 20 + 4,905 = 4,956 | 162 + 5 + 151 = 318 | yes, 4 to 6 per plan (1 or 2 on 5 MA-PD plans) | The whole mapping below |
| Defined Standard | 1 | 202 | 5 | none | `pharmacy` with the deductible, the threshold and the stages; no tiers, no networks, no Part D benefits (section 5.7) |
| Employer group plan with no Part D design | blank | 838 | 283 | none | MA-PD: no `pharmacy`, 1 `source_references` entry; PDP: refused (section 4.1) |

The 838 and the 283 are all employer-only plans (`pbp_a_eghp_yn` "1", plan numbers 800 to 999) whose `pbp_mrx.txt` row fills `mrx_drug_ben_yn` and no other `mrx_` column (P2): the file has no Part D design for them. A plan with `mrx_benefit_type` 2, 3 or 4 and no tier rows, or 1 or blank with tier rows, is an error (0 plans).

## 4. The document of a stand-alone PDP

A PDP has a Section A row, a `pbp_mrx.txt` row, its tier and post-threshold rows and `PlanRegionArea.txt` rows, and nothing else: no Section B, C or D row and no `PlanArea.txt` row (P1, P16, P19). Its document:

| Field | PDP | Why |
|---|---|---|
| `plan_id`, `plan_identifiers`, `plan_name`, `carrier` | As spec 4.1 | The key is `S5921-383-000`; `cms_contract_id` `S5921`, `cms_pbp_id` `383`. Every one of the 606 PDP keys starts with `S` (P12). |
| `plan_type` | `PDP` | Already in `vocabularies/plan-types.json` ("Standalone Medicare Part D plan."), so no vocabulary change (decision D7, first half). |
| `plan_year` | `PlanRegionArea` : `contract_year` | As spec 4.1; "2027" on all 10,961 PDP rows. |
| `market` | `medicare_part_d` | A PDP is not Medicare Advantage. `vocabularies/markets.json` has no value for it: proposed in section 13. |
| `service_area` | Not written | PDPs are sold by Part D region (`region_type` "PD"): 326 PDPs have 1 region, 221 have 39 (P16). The schema has counties and 1 state only; the regions go to `source_references`, as for the 73 regional PPOs (spec 4.1 and gap `service_area.regions[]` in spec 9.1). Decision D2 said "a service area from PlanRegionArea.txt": the file is read, but what it holds has no field. |
| `premium` | Not written | The PDP premium is in no PBP file: Section D, which holds the MA premium, has no PDP rows, and the 3 MRx files have no premium column (`code-lists.md`). The S5921-383 Summary of Benefits prints $184.10 a month (page 2). 1 `source_references` entry says so. |
| `contacts` | As spec 4.1, with the Part D phone column | Section A of the 323 individual PDPs (P16): `pbp_a_curmbr_phone` blank on all 323, and `pbp_a_pd_curmbr_phone` ("Customer Service Contact Phone Number for Current Part D Medicare Beneficiaries") filled on all 323, so a PDP's `contacts.member_services_phone` is read from `pbp_a_pd_curmbr_phone` and quoted with its title in the contacts entry, with `pbp_a_pd_curmbr_phone_ext` when filled, as spec 4.1 reads the Medicare Advantage column (decided 2026-10-24, after session 2's first build). `pbp_a_org_website` filled on all 323 (written only when it is a URI with its scheme, as today). |
| `network_tiers` | 1 tier, `IN` | `name` "In-Network", `tier_class` `network`, `description` "A stand-alone Part D plan has no medical provider network. Its Part D cost shares are written on this tier; the pharmacy each applies at is the benefit's pharmacy_network_id (docs/specs/pbp-part-d-mapping.md section 6)." No `provider_directory_url`: `pbp_a_phys_web_addr` is blank on all 323. The schema requires `network_tiers`. |
| `accumulators` | Not written | No medical deductible or maximum exists; the Part D ones are in `pharmacy`. |
| `pharmacy`, `benefits` | Section 5, section 6 | Part D benefits only. |
| `source_references` | Spec 4.4 items 1 to 4, then the regions, the premium entry and the Part D entries of section 8 | |

`buildDocument` stops on a missing Section D row (`no pbp_Section_D.txt row`) for the Medicare Advantage types; for type 29 that is the expected case, and a Section D, Section C (or `pbp_Section_C_OON.txt`, `pbp_Section_C_POS.txt`), Section B or `PlanArea.txt` row on a PDP is an error.

### 4.1 Refusals

- **Type 30** (Employer/Union Only Direct Contract PDP): E3014-801-000 and E3014-802-000, "PSERS Health Options Program Plus" and "Standard" (Employer PDP). Neither has a `pbp_mrx.txt` row; each has 3,246 `PlanArea.txt` rows and no `PlanRegionArea.txt` row (P16). Message: `plan type 30 (Employer/Union Only Direct Contract PDP) is outside the importer's scope: the PBP files hold no Part D benefit for it (no pbp_mrx.txt row; docs/specs/pbp-part-d-mapping.md section 4.1)`. A type 30 plan with a `pbp_mrx.txt` row, which the CY 2027 file does not have, is refused too, with a message that says the mapping is to be extended before it is read: the 2 type 30 plans have `PlanArea.txt` rows, which a PDP does not.
- **An employer PDP with no Part D design** (type 29, `mrx_benefit_type` blank, 283 plans): refused with `the PBP files hold no Part D design for this employer group PDP (pbp_a_eghp_yn "1"; mrx_benefit_type blank; only mrx_drug_ben_yn "1" is filled; docs/specs/pbp-part-d-mapping.md section 4.1)` (the words "employer group" only when `pbp_a_eghp_yn` is "1"; all 283 are). A document would carry a name and regions and no benefit at all. Question Q5 (section 19).

The medical refusal message (spec section 1) changes to name 29 as in scope: `HMO, HMOPOS, Local PPO, Regional PPO and Medicare Prescription Drug Plan only`.

## 5. The pharmacy object

Written for every MA-PD and PDP of the tiered and Defined Standard kinds (section 3). Key order: the schema's (`deductible`, `out_of_pocket_max`, `coverage_stages`, `formulary_tiers`, `pharmacy_networks`).

### 5.1 `formulary_tiers[]` (decision D3)

1 entry per `pbp_mrx_tier.txt` row, in `mrx_tier_id` order.

| Field | Source | Rule |
|---|---|---|
| `tier_id` | `mrx_tier_id` (CHAR 1, no code list) | `T` and the id: `T1` to `T6`. The ids run 1 to n on every plan, with no repeat, and `mrx_tier_label_list` never repeats inside a plan (P11); either failing is an error. `mrx_formulary_tiers_num` equals the row count on all 5,274 plans with tier rows (P3); a difference is an error. |
| `name` | `mrx_tier_label_list` (CHAR 250, "Tier Label Description") | `Tier <n>: <label>`, the label verbatim: `Tier 3: Preferred Brand`. |
| `drug_class` | the label, through the table of section 9 | Written only where the label is exactly 1 of the schema's recommended values (4 labels); otherwise not written. |
| `tier_code` | the label, through the table of section 9 | A DrugTierCS code where the label is that code's meaning (7 labels); otherwise not written. |
| `description` | the tier row's tier-level cells | Quoted, with each code's dictionary label: `pbp_mrx_tier.txt mrx_tier_id "3", mrx_tier_label_list "Preferred Brand", mrx_tier_type_id "1" (ICP), mrx_tier_drug_type "11" (Brand; Generic), mrx_tier_includes "1" (Part D Drugs Only), mrx_tier_cstshr_struct_type "1" (Coinsurance), mrx_tier_extd_days_yn "2", mrx_tier_extd_first_fill "2".` |

**The labels are a closed list in practice.** The dictionary gives `mrx_tier_label_list` no code list (decision D3 and D7 assumed one; there is none). The file holds 13 labels on 27,357 MA-PD and PDP tier rows, and every plan's labels, in id order and joined with ", ", equal its `mrx_form_model_desc` (5,274 of 5,274), which is 1 of 16 tier label models (`mrx_form_model_type`, for example `5F`; `tier-label-models.csv`). So the table of section 9 covers every label of the 2027 file; a label outside it raises the warning `part-d-tier-label-unknown` and the tier is written with `name` and `description` and no `drug_class` or `tier_code`. This replaces decision D3's "an unmapped label writes `other` plus a warning": DrugTierCS has no `other` code, so writing one would put a value outside the vocabulary `tier_code` names, and the 13 known labels are decisions, not warnings.

### 5.2 `pharmacy_networks[]`

The pharmacy locations come from the tier rows' flag columns, each a position string (dictionary, `code-lists.md`): `mrx_tier_locat_rstd`, `_rsplt`, `_mostd`, `_mosplt` (position 1 three-month supply, 2 one-month, 3 two-month), `_oon` (1 other day supply, 2 one-month) and `_ltc` (1 one-month). A location is used when its flag chooses at least 1 supply on at least 1 tier.

| `network_id` | `name` | `network_type` | Written when a tier row uses | Amount columns |
|---|---|---|---|---|
| `RETAIL_STANDARD` | Standard retail | `standard_retail` | `rstd` (retail not split) or `rsplt` | `mrx_tier_rstd_*`, or `mrx_tier_rsstd_*` when split |
| `RETAIL_PREFERRED` | Preferred retail | `preferred_retail` | `rsplt` | `mrx_tier_rspfd_*` |
| `MAIL_ORDER_STANDARD` | Standard mail order | `mail_order` | `mostd` (mail order not split) or `mosplt` | `mrx_tier_mostd_*`, or `mrx_tier_mosstd_*` when split |
| `MAIL_ORDER_PREFERRED` | Preferred mail order | `mail_order` | `mosplt` | `mrx_tier_mospfd_*` |
| `OUT_OF_NETWORK` | Out-of-network pharmacy | `out_of_network` | `oon` | `mrx_tier_oonp_*` |
| `LONG_TERM_CARE` | Long-term care pharmacy | `long_term_care` | `ltc` | `mrx_tier_ltcp_*` |

In this order, each at most once. What the file shows (P7): no plan uses `rstd` on some tiers and `rsplt` on others, or `mostd` and `mosplt`; every tier row of every plan uses `oon` and `ltc`; and the plan-level `mrx_partd_network_loc` ("Describe the components of your pharmacy network", positions Long-Term Care, Standard Retail, Standard/Preferred Retail, Out-of-Network, Standard Mail-Order, Standard/Preferred Mail-Order) equals the locations the tier rows use on all 5,274 plans. The importer checks that equality (a difference is an error) and quotes the cell with its labels. 1,658 MA-PD plans and 256 PDPs split retail; 2,451 and 288 split mail order.

- **The retail standard network is 1 network split or not.** CMS calls the unsplit location "Standard Retail" and the split one "Standard Retail/Preferred Retail", and the split location's standard columns (`rsstd`) carry the same "Standard Retail Cost-Sharing" title as the unsplit ones (`rstd`). So both write `RETAIL_STANDARD`, and the same for mail order.
- **`network_type`** is a string with recommended values in the schema (`preferred_retail`, `standard_retail`, `mail_order`, `specialty_pharmacy`, `long_term_care`), not an enum. Both mail order networks write `mail_order` (the `network_id` and `name` say standard or preferred); the out-of-network pharmacy writes `out_of_network`, a value outside the recommended list, proposed for the pharmacy module v0.2.2 in section 13. Question Q4.
- **`default_day_supply`** is not written: the file states days per tier, location and supply (30, 31 or 34 for a month, 90, 93, 100 or 102 for 3 months, P8), never per network. Each benefit carries its `day_supply`.

### 5.3 `coverage_stages[]` (the stage rule)

| `stage_id` | `name` | `stage_type` | Written when | Other fields |
|---|---|---|---|---|
| `DEDUCTIBLE` | Deductible | `deductible` | `pharmacy.deductible` is written (5.4) | none |
| `INITIAL` | Initial Coverage | `initial` | Always | none |
| `CATASTROPHIC` | Catastrophic Coverage | `catastrophic` | Always | `applies_after_total_out_of_pocket`: the threshold of 5.5 |

There is no coverage gap stage: Table V-6 of the CY 2027 Rate Announcement (page 99) lists a Deductible Phase, an Initial Coverage Phase and the Out-of-Pocket Threshold, and nothing between them. `applies_before_total_drug_cost` is not written: no column states it, and the deductible amount is already in `pharmacy.deductible`.

Benefits are written for `INITIAL` (from `pbp_mrx_tier.txt`) and `CATASTROPHIC` (from `pbp_mrx_p.txt`) only. The file states no cost share for the deductible stage apart from the initial coverage one: `mrx_alt_ded_tier_cstshr_yn` ("Is the cost-sharing for drugs to which the deductible does not apply the same as the Initial Coverage Phase cost-sharing?") is "1" on 4,458 MA-PD plans and 151 PDPs and "2" on 1 plan, H4045-001-000, whose `mrx_alt_gen_cstshr_struct` "1" and `mrx_alt_gen_coins_pct` "0" give the other cost share (P13). So what the deductible does is carried by `applies_to_deductible` and `deductible_ref` on the `INITIAL` rows (6.4), not by a third set of rows. For H4045-001-000 the importer raises the warning `part-d-deductible-stage-cost-share` and quotes the 3 cells.

### 5.4 `deductible` (the deductible rule)

`mrx_alt_ded_charge` ("Does this plan charge the Medicare-defined Part D deductible amount?", 1 Yes, 2 No, enter amount, 3 No Deductible) and `mrx_alt_ded_amount` ("Enter Deductible Amount", NUM 8). Counts, P4:

| `mrx_alt_ded_charge` | MA-PD | PDP | `mrx_alt_ded_amount` | Written |
|---|---|---|---|---|
| 1 | 2,109 | 46 | "700.00" on every one | `amount` 700. The importer checks the amount against the contract year's standard deductible (Table V-2, $700) and raises the warning `part-d-deductible-not-standard` when they differ (0 plans). |
| 2 | 2,366 | 107 | filled on every one; 105 and 6 distinct amounts | `amount` from the cell |
| 3 | 450 | 3 | blank on every one | No `deductible`, no `DEDUCTIBLE` stage |
| blank, with an amount | 233 | 167 | "700.00" | The Actuarially Equivalent Standard (31 and 162) and Defined Standard (202 and 5) plans: `amount` 700 for every tier, with a note that the file names the standard benefit type and no tier answer, and the Summary of Benefits it was confirmed on (Question Q3). A blank code on another benefit type, or with `mrx_alt_ded_type_yn` or `mrx_alt_no_ded_tier` filled, is an error (0 plans). The not-standard warning applies as for code 1. |
| blank, no amount | 838 | 283 | blank | The employer plans of section 3: nothing |

A blank amount with code 1 or 2, or an amount with code 3, is an error (0 plans). `currency` `USD`. `period` is not written: no cell states it, as on the medical side.

**`applies_to_tiers`**: `mrx_alt_ded_type_yn` ("Does the Deductible apply to all tiers?") and `mrx_alt_no_ded_tier` ("Each tier for which the deductible will NOT apply", a 7-position string whose position 1 is Tier 7 and positions 2 to 7 are Tiers 1 to 6, `code-lists.md`).

- `mrx_alt_ded_type_yn` "1" (16 MA-PD plans, 2 PDPs): `applies_to_tiers` not written, which the schema reads as all tiers.
- "2": the plan's tier ids less those `mrx_alt_no_ded_tier` names. H1036-068-000: "0111000" names Tiers 1 to 3, so `["T4", "T5"]`; S5921-383-000: "0110000", so `["T3", "T4", "T5"]`. The commonest patterns are "0110000" (3,252 MA-PD, 79 PDP) and "0110001" (364 MA-PD). A position naming a tier the plan does not have (Tier 7 on every plan; Tier 6 on a 5-tier plan) is an error, and so is "2" with a blank list (0 plans each, P19).
- Blank (the standard benefit types): not written, which the schema reads as all tiers: confirmed on the 2027 Summary of Benefits of S5884-105-000 (Question Q3, section 6.4).

### 5.5 `out_of_pocket_max` (the threshold rule and its source)

**No PBP column holds the threshold** (P15): no column name contains "oop", "threshold", "catast", "tdc" or "troop" except 2 code columns about cost sharing after the threshold (`mrx_ae_ooptcs_apply`, `mrx_alt_cstshr_post_oopt`), and the only amount columns of 1,000 or more are the average expected coinsurance dollars (`mrx_tier_*_coins_avg_1m`, largest 3,206.93).

So this 1 value is **not read from the PBP files**. The importer holds it as a constant per contract year, beside the standard deductible it checks against (5.4):

```
PART_D_PARAMETERS = {
  2027: { deductible: 700, out_of_pocket_threshold: 2400,
          source: 'CMS, "Announcement of Calendar Year (CY) 2027 Medicare Advantage (MA) Capitation Rates and Part C and Part D Payment Policies", April 6, 2026, Attachment V, Table V-2 (page 95) and Table V-6 (page 99), https://www.cms.gov/files/document/2027-announcement.pdf' },
}
```

`out_of_pocket_max`: `amount` 2400, `currency` `USD`, no `period`. The `CATASTROPHIC` stage's `applies_after_total_out_of_pocket` is the same 2400. A root `source_references` entry says the value is not read from the PBP files and quotes the source string (section 8). A contract year with no entry is an error: `no Part D out-of-pocket threshold is recorded for contract year <year>; add it from that year's Rate Announcement (docs/specs/pbp-part-d-mapping.md section 5.5)`. Both check documents print $2,400 (Humana page 11, UHC page 2).

### 5.6 Not written

`formulary_items` (the drug list is out of scope), `formulary_reference` (provenance for formulary data, which this importer does not read; `pbp_a_formulary_web_addr` is quoted in Section A's entry as today), `mail_order_supply_multiplier` (the file gives each supply's amount, which `day_supply` represents exactly, as the field's own description prefers).

### 5.7 Defined Standard plans (202 MA-PD, 5 PDP)

No tier rows (P2). `pharmacy`: `deductible` (amount 700 from the cell, 5.4), `out_of_pocket_max`, the 3 stages. No `formulary_tiers`, no `pharmacy_networks`, no Part D benefits: the defined standard's initial coverage cost share (25%, Table V-6) is not in the file, and the importer does not fill Medicare-defined amounts the files name but do not state (spec section 1 and 7.2). A root `source_references` entry quotes `mrx_benefit_type` "1" with its label, says that the file states no initial coverage cost share, and quotes the plan-level location, days and insulin cells (`mrx_gen_*`, filled on 207 rows, P14). A Defined Standard PDP's document has an empty `benefits` (the schema allows it).

## 6. Benefit rows (decision D4)

### 6.1 Grain: 1 benefit per tier, network and chosen supply

**Initial coverage:** for each tier row, each network of 5.2 the row uses, and each supply its flag chooses (1-month, 2-month, 3-month; out of network also "other"), 1 benefit. **Catastrophic:** 1 benefit per `pbp_mrx_p.txt` row, with no network and no supply, because the file gives 1 cost share per tier after the threshold.

**This departs from decision D4**, which proposed merging the 1-, 2- and 3-month supplies of 1 location into 1 benefit with the lowest `day_supply` and a note wherever their amounts are equal. Argued from the 2 worked plans (section 7) and the whole file:

| | Every supply (this rule) | Equal supplies merged (D4) |
|---|---|---|
| H1036-068-000 | 42 (37 initial + 5 catastrophic) | 33 (28 + 5) |
| S5921-383-000 | 41 (36 + 5) | 38 (33 + 5) |
| All MA-PD plans with tiers (P18) | 235,324; median 42, largest 82 | 169,171; median 32, largest 62 |
| All PDPs with tiers (P18) | 16,304; median 47, largest 82 | 12,490; median 39, largest 74 |

Merging saves 9 benefits on the Humana plan and 10 at the MA-PD median (P18, which also gives the other 3 fixture plans), but it moves supplies out of `day_supply` into free text: on the Humana Summary of Benefits, 9 of the 12 printed 100-day cells of Tiers 1 to 4 (page 11) equal their 30-day cell, so a reader asking "what does a 100-day fill of Tier 3 at retail cost" would find no benefit with `day_supply` 100 and would have to parse a note. Over the file the 2- or 3-month amount equals the 1-month amount in 10,569 of 19,444 two-month copay cells, 15,395 of 28,366 three-month copay cells and 40,725 of 41,426 coinsurance cells (P9), so merging is the common case, not the exception: 69,967 benefits (66,153 MA-PD, 3,814 PDP) would carry their supply only in a note. A median of 42 Part D benefits beside the 38 medical ones is a sane document. Question Q2 keeps the alternative open.

### 6.2 Fields

| Field | Initial coverage | Catastrophic |
|---|---|---|
| `benefit_id` | `RX_T<n>_<network_id>_<supply>_INITIAL`, supply `1M`, `2M`, `3M` or `OTHER`: `RX_T3_MAIL_ORDER_PREFERRED_3M_INITIAL`. Unique because the supply code, not the days, is in the id (out-of-network "other" supplies of 30 days exist on 6 tier rows, P8). | `RX_T<n>_CATASTROPHIC` |
| `benefit_type` | `pharmacy` | `pharmacy` |
| `coverage_basis` | Not written: its values describe Medicare-covered and supplemental Part C services. | Not written |
| `category` | `PHARMACY` (`vocabularies/categories.json`) | `PHARMACY` |
| `service_name` | `Tier <n> (<label>), <network name, lowercase>, <days>-day supply, initial coverage`: `Tier 3 (Preferred Brand), preferred mail order, 100-day supply, initial coverage` | `Tier <n> (<label>), catastrophic coverage` |
| `canonical_key` | From the label (section 9); omitted when the label has none, and the benefit's excerpt then says "no canonical key, carried by name (spec section 9.1)", the medical rule for rows with no key. | The same |
| `raw_label` | The label verbatim | `mrx_tier_post_label_list` verbatim |
| `network_cost_shares` | 1 row: `tier_id` `IN`, `covered` true, 1 step (6.3), and `notes` where 6.5 or 6.7 add one | The same |
| `limits`, `conditions` | `[]` | `[]` |
| `source_references` | Section 8 | Section 8 |
| `formulary_tier_id` | `T<n>` | `T<n>` |
| `pharmacy_network_id` | The network of 5.2 | Not written |
| `coverage_stage_id` | `INITIAL` | `CATASTROPHIC` |
| `day_supply` | The supply's days column (for example `mrx_tier_mosplt_3m_num` "100"), an integer; a chosen supply with a blank days column is an error (0, P8) | Not written |

**`tier_id` `IN` on every Part D row**, confirmed against `buildBenefit`, which writes the in-network row as `tier_id` `IN` (spec 5.3). The document's `network_tiers` are the medical provider networks (and the 1 `IN` tier of a PDP); the pharmacy a cost share applies at is `pharmacy_network_id`, which the pharmacy module v0.2.1 keeps "a separate concept from the medical network_tiers[]". So an out-of-network pharmacy row is `tier_id` `IN` with `pharmacy_network_id` `OUT_OF_NETWORK`, on an HMO and on a PPO alike, and its notes say so (6.7).

Key order: the schema's (`benefit_id`, `benefit_type`, `category`, `service_name`, `canonical_key`, `raw_label`, `network_cost_shares`, `limits`, `conditions`, `source_references`, `formulary_tier_id`, `pharmacy_network_id`, `coverage_stage_id`, `day_supply`).

### 6.3 The cost-share step

`mrx_tier_cstshr_struct_type` (initial coverage): 1 Coinsurance, 2 Copayment, 3 Greater of, 4 Lesser of. The catastrophic step is the $0 of 6.6; its structure and amount cells (`mrx_tier_post_cost_struct`, `mrx_tier_post_copay_amt`, `mrx_tier_post_coins_pct`) are quoted, not written.

| Structure | Step | Cell |
|---|---|---|
| 2 Copayment (11,171 MA-PD and 562 PDP tier rows) | `type` `copay`, `amount` | `mrx_tier_<part>_copay_<supply>` |
| 1 Coinsurance (14,558 and 1,066) | `type` `coinsurance`, `rate` = percent / 100 | `mrx_tier_<part>_coins_<supply>` |
| 3, 4 | Error: `mrx_tier_cstshr_struct_type "3" (Greater of Coinsurance and Copayment) is not mapped (0 tier rows in CY 2027; docs/specs/pbp-part-d-mapping.md section 6.3)` | |

Column types (dictionary): copay columns NUM 8, an amount with 2 decimals; coinsurance columns NUM 3, a whole percent; days columns NUM 2 (1-month) or NUM 3 (2- and 3-month, other); the location flags CHAR 1 to 3, position strings.

Every step: `sequence` 1, `basis` `per_prescription` (each column prices 1 fill of the supply it names; the module's examples use the same value), then the flags of 6.4 and 6.5. Over the file every tier row fills only the columns its structure names (P6); a copay structure with a coinsurance cell filled, or the reverse, is an error, and so is a chosen supply whose amount cell is blank (0, P18). Amounts and percents are read with the medical readers (`amount`, `percent`; spec section 6). The supply columns are `_1m`, `_2m`, `_3m`, and out of network `_1m` and `_othnum` (days in `mrx_tier_oonp_othnumn`, spelled so in the file and the dictionary).

`STEP_ORDER` in `scripts/from-pbp.js` has no `deductible_ref` or `moop_ref`; session 2 adds them after `applies_to_deductible` and `applies_to_moop`, the schema's order.

### 6.4 `applies_to_deductible` and `deductible_ref`

| Plan | Initial coverage step | Catastrophic step |
|---|---|---|
| `pharmacy.deductible` written with `applies_to_tiers` | `applies_to_deductible` true when the tier is in `applies_to_tiers`, else false; `deductible_ref` `pharmacy` | `applies_to_deductible` false, no `deductible_ref`: the stage begins after the threshold, which the deductible counts toward |
| `pharmacy.deductible` written for all tiers (`mrx_alt_ded_type_yn` "1") | true, `deductible_ref` `pharmacy` | false, no `deductible_ref` |
| Standard benefit types (blank code with an amount) | true, `deductible_ref` `pharmacy`; the row's notes quote `mrx_benefit_type` and the blank `mrx_alt_ded_type_yn` and name the Summary of Benefits it was confirmed on (Question Q3) | false, no `deductible_ref` |
| No deductible (code 3) | false, no `deductible_ref` | false, no `deductible_ref` |

**Question Q3, confirmed.** The 2027 Summary of Benefits of S5884-105-000, Humana Basic Rx Plan (PDP), State of Florida, an Actuarially Equivalent Standard plan (`mrx_benefit_type` "2", `mrx_alt_ded_charge` and `mrx_alt_ded_type_yn` blank, `mrx_alt_ded_amount` "700.00"), document `S5884_SB_PD_PDP_105000_2027_M`, 16 pages, https://assets.humana.com/is/content/humana/S5884105000SB27pdf, saved 2026-10-24 as `data/pbp/2027/sob/S5884-105-000-2027-SB.pdf` (7,553,379 bytes, SHA-256 `3a00b5aefb1a7cc733f9936a58b367e56eee5f1688012625d5909f45ae690890`), prints on page 4 "Pharmacy (Part D) deductible $700 deductible", with no tier exception (H1036-068's document names the tiers it skips on the same line), and under DEDUCTIBLE "You pay the full cost of your drugs until you reach $700". The deductible applies to every tier, so the standard benefit types' initial coverage steps carry `applies_to_deductible` true with `deductible_ref` `pharmacy`. Insulin and adult vaccines, which the same document exempts from the deductible (pages 4 and 5), are not written as benefits (Question Q1).

The Humana and UHC documents agree with the H1036-068 and S5921-383 cells: "$0 deductible for Tier 1, Tier 2 and Tier 3, $700 deductible for Tier 4 and Tier 5" (Humana page 4) and "$0 per year for Tier 1 and Tier 2; $300 for Tier 3, Tier 4 and Tier 5" (UHC page 2).

### 6.5 `applies_to_moop`, `moop_ref`, and excluded drugs

Every Part D step carries `moop_ref` `pharmacy` (decision D4). `applies_to_moop` depends on `mrx_tier_includes` (1 Part D Drugs Only, 24,988 tier rows; 2 Excluded Drugs Only, 52; 3 Both Part D and Excluded Drugs, 2,317; P11), because only covered Part D drugs' cost sharing counts toward the threshold (42 CFR 423.100, "Incurred costs", section 2):

- **1:** `applies_to_moop` true.
- **2** (all 52 are the label "Supplemental Drugs"): `applies_to_moop` false, and the row's notes say: `The tier holds only drugs excluded from Part D (mrx_tier_includes "2"); their cost sharing does not count toward the Part D out-of-pocket threshold (42 CFR 423.100, incurred costs).`
- **3:** `applies_to_moop` true, and the notes say that the tier also holds excluded drugs, whose cost sharing does not count (same citation). The file gives 1 cost share for the tier, not 1 per kind of drug.

### 6.6 Catastrophic rows: $0 for a covered Part D drug, and what the file's non-zero amounts are

1,105 of the 27,357 post-threshold rows of MA-PD and PDP plans carry a non-zero copay or coinsurance, on 1,003 plans (P13), and the profile shows what they are:

- every one is on a tier with `mrx_tier_post_includes` 2 or 3 (a tier that holds excluded drugs), on a plan whose `mrx_alt_cstshr_post_oopt` ("How does this plan apply cost sharing for excluded drugs beyond the Medicare Part D Annual Out-of-Pocket cost threshold?") is "3", Cost-Share Tiers (Same cost sharing as the ICP);
- every one equals a 1-month retail amount of the same tier's initial coverage row (1,105 of 1,105);
- no row of a tier with only Part D drugs (`includes` 1) is non-zero.

So the non-zero amount is the excluded drugs' cost sharing after the threshold. Both check documents say so in their own words: S5921-383's Tier 2 ("Generic", `includes` "3") has `mrx_tier_post_copay_amt` "10.00", and its Summary of Benefits prints "Once you're in this stage, you won't pay anything for your Medicare-covered Part D drugs" and lists the "Additional covered drugs ... not covered by Medicare Part D" as Tier 2 medications (page 3); the saved H2406-013 document prints the same with Tier 2's $5 (`mrx_tier_post_copay_amt` "5.00").

**Rule (Question Q6, decided on 2026-10-24):** the catastrophic step of every tier is the covered Part D drug's cost share after the threshold, $0: `type` `copay`, `sequence` 1, `amount` 0, `basis` `per_prescription`, `applies_to_deductible` false (6.4), `applies_to_moop` and `moop_ref` as 6.5. Like the threshold (5.5), this value is not read from the PBP files: the source is 42 CFR 423.104(d)(5)(i) (eCFR, version of 2026-10-01), "After an enrollee's incurred costs exceed the annual out-of-pocket threshold ... for 2024 and each subsequent year, cost-sharing equal to $0", which § 423.104(e)(2) applies to alternative prescription drug coverage ("cost-sharing no greater than that specified in paragraphs (d)(5)(i) or (ii) ... once the annual out-of-pocket threshold ... is met") and § 423.104(f) to enhanced alternative coverage (which "must meet the requirements under paragraph (e)"), after the CY 2027 threshold of $2,400 (Rate Announcement, Attachment V, Table V-6, page 99). Table V-6 states the threshold and no cost sharing after it, so it is cited for the threshold only. `PART_D_PARAMETERS` gains the regulation's text as `post_threshold_source` beside `source`; the threshold's root entry quotes it, and each catastrophic benefit names § 423.104(d)(5)(i). The $0 is the step's amount for every benefit type and every `mrx_tier_post_includes` code; `applies_to_moop` follows 6.5 with `mrx_tier_post_includes`.

The file's post-threshold cells are still read and quoted, never written as the step's amount. The step's `source_references` entry quotes `pbp_mrx_p.txt` with the key, `mrx_tier_post_label_list`, `mrx_tier_post_id`, `mrx_tier_post_includes`, `mrx_tier_post_cost_struct` and the amount cell, and says the $0 comes from the regulation. When the amount is non-zero (1,105 rows), the step's `notes` name it as the amount that applies to the tier's drugs excluded from Part D; for S5921-383 Tier 2: `The file's post-threshold amount for this tier, mrx_tier_post_copay_amt "10.00" (mrx_tier_post_includes "3", Both Part D and Excluded drugs; mrx_alt_cstshr_post_oopt "3", Cost-Share Tiers (Same cost sharing as the ICP)), applies to the drugs on the tier that are excluded from Part D, which do not count toward the out-of-pocket threshold (42 CFR 423.100, incurred costs). The $0 of this step is the covered Part D drug's (42 CFR 423.104(d)(5)(i)).` A non-zero amount on an `includes` 1 tier, which holds no excluded drug, raises the warning `part-d-post-threshold-cost-share` (0 rows) and is quoted in the step's notes as not written, and the step stays $0. Over the CY 2027 file the built documents carry the excluded-drug note on 1,105 catastrophic steps (1,061 on MA-PD plans, 44 on PDPs), the 1,105 rows of P13, and no warning (section 20). The 2 check files (section 18) were run on the built documents. Humana page 12 prints "$0 for plan-covered Part D and Excluded drugs" after $2,400, and H1036-068's Tier 1, its only tier with excluded drugs, has the file amount "0.00", so the step has no note (MATCH). The UHC document prints $0 for covered Part D drugs after the threshold (page 3) and Tier 2's own cost shares (page 2), and says the additional, non-Part D drugs are covered "as Tier 2 medications" with no figure for the stage, so the S5921-383 file has no excluded-drug check, and its Tier 2 step's $0 is checked as the covered drug's (MATCH).

### 6.7 Out-of-network and long-term care rows

- **Out of network:** the notes quote the plan's out-of-network structure with its label, `mrx_alt_oon_cstshr_struct` (alternative designs) or `mrx_ae_oon_cstshr_struct` (Actuarially Equivalent Standard): 1 the standard retail cost share with no differential; 2 the same plus "a differential between the OON billed charge and the Standard Retail allowable" (3,619 Enhanced Alternative MA-PD plans and 149 PDPs, P13); 3 the same "with Limited Day supply"; 4 the network cost share plus the differential with a limited days supply. The differential has no amount in the file and no field; the price differential counts toward the threshold (42 CFR 423.100), so `applies_to_moop` stays true. The notes also say that `tier_id` `IN` is the document's tier for every Part D row and the pharmacy is `OUT_OF_NETWORK`. H1609-028 shows the "other" supply: `mrx_tier_locat_oon` "10", 10 days, `mrx_alt_oon_cstshr_struct` "3".
- **Long-term care:** 1-month only, 31 days on 25,798 tier rows and 34 on 1,559 (P8). Both check documents say long-term care members pay what retail does for 31 days (Humana page 13; UHC page 3); the file states the LTC cells itself, so they are read, not copied from retail.

### 6.8 Order

Medical benefits first, in crosswalk order and unchanged, so the indexes the existing Summary of Benefits checks point at do not move (`H2406-013-000.json`, `H1609-028-000.json`). Then the initial coverage rows by tier id, network in the order of 5.2, supply in the order 1M, 2M, 3M, OTHER; then the catastrophic rows by tier id. H1036-068-000: medical 0 to 37, Part D 38 to 79; S5921-383-000: 0 to 40 (`plans/*-benefits.md`).

## 7. The 2 plans worked through

The full cell-to-benefit listings, with index, `benefit_id`, `day_supply`, the step and the cells, are [`plans/H1036-068-000-benefits.md`](pbp-part-d/profile/plans/H1036-068-000-benefits.md) and [`plans/S5921-383-000-benefits.md`](pbp-part-d/profile/plans/S5921-383-000-benefits.md); the plans' non-blank cells are beside them. The grids below are the same values by tier and network.

### 7.1 H1036-068-000, Humana Gold Plus H1036-068 (HMO), MA-PD

`pbp_mrx.txt`: `mrx_benefit_type` "4" (Enhanced Alternative), `mrx_formulary_tiers_num` "5", `mrx_form_model_type` "5F", `mrx_partd_network_loc` "110101" (Long-Term Care, Standard Retail, Out-of-Network, Standard/Preferred Mail-Order), `mrx_alt_ded_charge` "1", `mrx_alt_ded_amount` "700.00", `mrx_alt_ded_type_yn` "2", `mrx_alt_no_ded_tier` "0111000", `mrx_alt_oon_cstshr_struct` "2", `mrx_alt_cstshr_post_oopt` "1".

`pharmacy`: `deductible` {700, `applies_to_tiers` T4, T5}; `out_of_pocket_max` {2400}; stages `DEDUCTIBLE`, `INITIAL`, `CATASTROPHIC` (2400); tiers T1 "Tier 1: Preferred Generic" (`preferred-generic`, `includes` "3"), T2 Generic, T3 Preferred Brand, T4 Non-Preferred Drug, T5 Specialty Tier; networks `RETAIL_STANDARD` (`rstd`, retail not split), `MAIL_ORDER_STANDARD` and `MAIL_ORDER_PREFERRED` (`mosplt`), `OUT_OF_NETWORK`, `LONG_TERM_CARE`.

| Tier | Flags | Retail standard 30 / 100 days (`rstd`) | Mail standard 30 / 100 (`mosstd`) | Mail preferred 30 / 100 (`mospfd`) | Out of network 30 (`oonp`) | LTC 31 (`ltcp`) | Catastrophic | Deductible applies |
|---|---|---|---|---|---|---|---|---|
| T1 | `rstd` "110", `mosplt` "110" | $0 / $0 | $10 / $30 | $0 / $0 | $0 | $0 | $0 | false |
| T2 | the same | $0 / $0 | $20 / $60 | $0 / $0 | $0 | $0 | $0 | false |
| T3 | the same | 9% / 9% | 9% / 9% | 9% / 7% | 9% | 9% | $0 | false |
| T4 | the same | 50% / 50% | 50% / 50% | 50% / 50% | 50% | 50% | $0 | true |
| T5 | `rstd` "010", `mosplt` "010" | 25% / none | 25% / none | 25% / none | 25% | 25% | $0 | true |

37 initial coverage benefits (8 for each of T1 to T4, 5 for T5) and 5 catastrophic ones. The Summary of Benefits prints the same grid (page 11), the deductible (page 4) and "$0 for plan-covered Part D and Excluded drugs" in the catastrophic stage (page 12). Tier 1's excluded drugs ("Select drugs covered at Tier 1 cost-share amount", page 12) are the `includes` "3" of T1; its post-threshold row is "0.00", as the plan answers `mrx_alt_cstshr_post_oopt` "1" (No cost sharing).

### 7.2 S5921-383-000, AARP Medicare Rx Preferred from UHC (PDP)

`pbp_mrx.txt`: `mrx_benefit_type` "4", `mrx_formulary_tiers_num` "5", `mrx_form_model_type` "5F", `mrx_partd_network_loc` "101101" (Long-Term Care, Standard/Preferred Retail, Out-of-Network, Standard/Preferred Mail-Order), `mrx_alt_ded_charge` "2", `mrx_alt_ded_amount` "300.00", `mrx_alt_ded_type_yn` "2", `mrx_alt_no_ded_tier` "0110000", `mrx_alt_oon_cstshr_struct` "2", `mrx_alt_cstshr_post_oopt` "3". `PlanRegionArea.txt`: region 11 "Florida", `region_type` "PD".

`pharmacy`: `deductible` {300, `applies_to_tiers` T3, T4, T5}; `out_of_pocket_max` {2400}; the 3 stages; tiers as H1036-068's labels (T2 `includes` "3"); networks `RETAIL_STANDARD` and `RETAIL_PREFERRED` (`rsplt`), `MAIL_ORDER_STANDARD` and `MAIL_ORDER_PREFERRED` (`mosplt`), `OUT_OF_NETWORK`, `LONG_TERM_CARE`.

| Tier | Flags | Retail standard 30 / 100 (`rsstd`) | Retail preferred 30 / 100 (`rspfd`) | Mail standard (`mosstd`) | Mail preferred (`mospfd`) | Out of network 30 | LTC 31 | Catastrophic | Deductible applies |
|---|---|---|---|---|---|---|---|---|---|
| T1 | `rsplt` "110", `mosplt` "100" | $5 / $15 | $0 / $0 | 100 days $15 | 100 days $0 | $5 | $5 | $0 | false |
| T2 | the same | $10 / $30 | $5 / $15 | 100 days $30 | 100 days $0 | $10 | $10 | $0; the file's $10 (excluded drugs) quoted and named in the notes (6.6) | false |
| T3 | the same | 22% / 22% | 22% / 22% | 100 days 22% | 100 days 22% | 22% | 22% | $0 | true |
| T4 | `rsplt` "010", `mosplt` "010" | 30% / none | 30% / none | 30 days 30% | 30 days 30% | 30% | 30% | $0 | true |
| T5 | the same | 30% / none | 30% / none | 30 days 30% | 30 days 30% | 30% | 30% | $0 | true |

36 initial coverage benefits (8 for each of T1 to T3, 6 for T4 and T5) and 5 catastrophic ones. The Summary of Benefits prints the retail and 100-day mail columns (pages 2 and 3); it prints no 30-day mail column, so the T4 and T5 mail rows are in the file and not on the page.

## 8. The citation shape (decision D5)

**Each Part D benefit** has 1 `source_references` entry that names the file, the row key, the columns and the values, with each code's dictionary label, then the plan-level cells its flags were read from. For H1036-068's index 59 (`RX_T3_MAIL_ORDER_PREFERRED_3M_INITIAL`), from its cells in `plans/H1036-068-000.md`:

```json
{
  "excerpt": "pbp_mrx_tier.txt, row pbp_a_hnumber \"H1036\", pbp_a_plan_identifier \"068\", segment_id \"0\", mrx_tier_label_list \"Preferred Brand\": mrx_tier_id \"3\", mrx_tier_cstshr_struct_type \"1\" (Coinsurance), mrx_tier_includes \"1\" (Part D Drugs Only), mrx_tier_locat_mosplt \"110\" (Standard/Preferred Mail Order Cost-Sharing - three month supply; Standard/Preferred Mail Order Cost-Sharing - one month supply), mrx_tier_mosplt_3m_num \"100\", mrx_tier_mospfd_coins_3m \"7\". pbp_mrx.txt: mrx_alt_ded_type_yn \"2\", mrx_alt_no_ded_tier \"0111000\" (Tier 1; Tier 2; Tier 3)."
}
```

Its step: `{"type": "coinsurance", "sequence": 1, "rate": 0.07, "basis": "per_prescription", "applies_to_deductible": false, "deductible_ref": "pharmacy", "applies_to_moop": true, "moop_ref": "pharmacy"}`. The Humana document prints 7% in the 100-day preferred mail column for Tier 3 (page 11).

A 1-month benefit also quotes the cells of its location that have no field: the daily copay (`mrx_tier_<part>_copay_daily`, filled on 11,733 tier rows) and the average expected coinsurance dollars (`mrx_tier_<part>_coins_avg_1m`, 13,710 rows; P14). A catastrophic benefit quotes `pbp_mrx_p.txt` with the key, `mrx_tier_post_label_list`, `mrx_tier_post_id`, `mrx_tier_post_includes`, `mrx_tier_post_cost_struct` and the amount, and names the regulation its $0 comes from (6.6). A benefit with no canonical key adds "no canonical key, carried by name (spec section 9.1)".

**The plan level** has no `source_references` inside `pharmacy` (the schema gives the object none), so its references are root entries, after the medical ones and in this order (the existing entries keep their positions):

1. **Part D.** `mrx_drug_ben_yn`, `mrx_benefit_type`, `mrx_formulary_tiers_num`, `mrx_form_model_type`, `mrx_form_model_desc`, with labels, and what was written ("pharmacy and 42 Part D benefits, docs/specs/pbp-part-d-mapping.md"). For an MA plan with "2", the employer kind or Defined Standard, this entry says what was not written and why (sections 3 and 5.7).
2. **Deductible reading:** `mrx_alt_ded_charge`, `_amount`, `_type_yn`, `mrx_alt_no_ded_tier`, `mrx_alt_ded_tier_cstshr_yn` with labels; the standard deductible check of 5.4.
3. **Threshold:** `pharmacy.out_of_pocket_max and the CATASTROPHIC stage's applies_after_total_out_of_pocket are 2400 USD, the contract year 2027 Part D annual out-of-pocket threshold. No PBP column states it; source: ` and the source string of 5.5.
4. **Pharmacy networks:** `mrx_partd_network_loc` with its labels, the out-of-network structure with its label.
5. **Stages:** `mrx_alt_pre_icl_cost_share` or `mrx_ae_cstshr_apply`, `mrx_alt_cstshr_post_oopt` or `mrx_ae_ooptcs_apply`, with labels; "no coverage gap stage: Table V-6, page 99".
6. **Insulin**, 1 entry per tier that has insulin cells (section 10).
7. **Tier-row cells no rule reads**, verbatim, by tier: written only when a tier row fills a cell that no rule above reads or quotes, so nothing is dropped (0 plans in CY 2027, section 20).
8. **Every non-blank `pbp_mrx.txt` cell, verbatim, in file order**, the key columns and the Section A columns every Part D file repeats (`pbp_a_hnumber`, `pbp_a_plan_identifier`, `segment_id`, `pbp_a_ben_cov`, `pbp_a_plan_type`, `orgtype`, `bid_id`, `version`) left out, as the Section D entry does for accumulators.

A Defined Standard plan has items 1, 2, 3, 5 and 8 (no networks, no tier rows); an MA plan with `mrx_drug_ben_yn` "2" or no Part D design has item 1 only, which also quotes any other non-blank `pbp_mrx.txt` cell. The entries follow the medical ones (MA-PD) or the PDP's premium entry. A catastrophic benefit's excerpt also quotes `mrx_tier_post_type_id` and `mrx_tier_post_drug_type` with their labels, and an out-of-network benefit's excerpt quotes the out-of-network structure among its `pbp_mrx.txt` cells.

The PDP's regions and premium entries (section 4) sit where the medical service area and premium entries do.

## 9. Tier labels to `tier_code`, `drug_class` and `canonical_key` (decision D7)

The 13 labels of the CY 2027 file (P10, `tier-labels.csv`), with the tier ids each appears under and its tier rows on MA-PD and PDP plans:

| `mrx_tier_label_list` | Tier rows | Under `mrx_tier_id` | `tier_code` (DrugTierCS) | `drug_class` | `canonical_key` |
|---|---|---|---|---|---|
| Preferred Generic | 4,994 | 1 | `preferred-generic` | `preferred_generic` | `preferred_generic_drugs` |
| Generic | 5,233 | 1, 2 | `generic` | `generic` | `generic_drugs` |
| Preferred Brand | 5,269 | 2, 3 | `preferred-brand` | `preferred_brand` | `preferred_brand_drugs` |
| Non-Preferred Drug | 5,214 | 3, 4 | `non-preferred` | none | `nonpreferred_drugs` (added, section 13) |
| Non-Preferred Brand | 53 | 3, 4 | `non-preferred-brand` | `nonpreferred_brand` | `nonpreferred_brand_drugs` |
| Brand | 1 | 2 | `brand` | none | none |
| Specialty Tier | 5,269 | 4, 5 | `specialty` | none | `specialty_drugs` |
| Select Care Drugs | 846 | 5, 6 | none | none | `select_care_drugs` (added) |
| Injectable Drugs | 268 | 4 | none | none | `injectable_drugs` (added) |
| Vaccines | 130 | 6 | none | none | `vaccine_drugs` (added) |
| Supplemental Drugs | 52 | 5, 6 | none | none | `supplemental_drugs` (added) |
| Select Diabetic Drugs | 24 | 5, 6 | none | none | `select_diabetic_drugs` (added) |
| Single Tier | 4 | 1 | none | none | none |

Why each line reads as it does:

- `tier_code` is written only where a DrugTierCS code is the label's meaning. "Non-Preferred Drug" is `non-preferred` ("Commonly prescribed drugs that cost more than drugs in the 'preferred' tier"), not `non-preferred-brand`: the CMS tier holds generics and brands, which is why it is a different label from "Non-Preferred Brand". "Specialty Tier" is `specialty`. DrugTierCS has no code for a select-care, injectable, vaccine, excluded-drug, diabetic or single tier.
- `drug_class` is written only where the label is 1 of the schema's 7 recommended values (`preferred_generic`, `generic`, `preferred_brand`, `nonpreferred_brand`, `preferred_specialty`, `nonpreferred_specialty`, `preventive`). The pharmacy module v0.2.1's own example writes `specialty` for a specialty tier, a value outside that list; this mapping does not.
- `canonical_key` follows the medical rule (spec 5.2): a key only when the tier clearly is the canonical service, no nearest fit. The 6 keys this table marks "added" are in `vocabularies/canonical-benefits.json` since session 2 (section 13), and the importer writes them; "Brand" and "Single Tier" are carried by name (43 MA-PD benefits in CY 2027). `nonpreferred_brand_drugs` is not the "Non-Preferred Drug" tier, for the reason above. The plan-defined `tier_5_drugs` and `tier_6_drugs` keys ("plan-defined high-cost tier", "highest tier medications") are not used by position: "Select Care Drugs" sits at Tier 6 on 843 tier rows, and on S4802-146 it is an $11 copay tier for 30 days at retail, beside a Tier 5 Specialty Tier on coinsurance (`plans/S4802-146-000-benefits.md`), so the tier number says nothing about cost and "highest tier" would be a guess.
- **Not in the brief's list:** the brief named "select care, insulin, specialty preferred". The 2027 labels have no insulin label and no "specialty preferred" label; insulin is a set of columns on every tier (section 10), and `preferred_specialty_drugs` already exists for a source that has such a tier.

## 10. Insulin (the IRA columns)

Each tier row has 28 insulin columns (`mrx_tier_ira_<part>_copay_<supply>` and `_coins_<supply>`), filled on 19,733 MA-PD and PDP tier rows, and `pbp_mrx.txt` has `mrx_alt_ira_covg_tier` ("Tiers have insulin drugs", the 7-position tier string) and, for Defined Standard plans, `mrx_gen_ira_*` (P14). The pair is the insulin cost share "coinsurance up to a copay": H1036-068 Tier 1 standard mail order, `mrx_tier_ira_mostd_coins_1m` "25" and `mrx_tier_ira_mostd_copay_1m` "10.00", which the Summary of Benefits prints "25% up to $10" (page 12); S5921-383 Tier 3, "22" and "35.00", printed "22%, up to $35" (page 3).

Two naming facts session 2 needs: the insulin columns are named by location, not by split, so the split retail's standard columns `rsstd` pair with `mrx_tier_ira_rstd_*` and the preferred `rspfd` with `mrx_tier_ira_rspfd_*`, and the split mail order's `mosstd` with `mrx_tier_ira_mostd_*` and `mospfd` with `mrx_tier_ira_mopfd_*` (P14, S5921-383's listing); and the out-of-network pair has 1 column for "one month/other day supply" (`mrx_tier_ira_oonp_*_1m`).

**Rule for session 2:** no insulin benefit is written; each tier that has insulin cells gets 1 root `source_references` entry, `Insulin cost sharing for Tier <n> (<label>), no Benefit Plan Standard benefit written (docs/specs/pbp-part-d-mapping.md section 10): ` and its non-blank `mrx_tier_ira_*` cells with `mrx_alt_ira_covg_tier`. The schema can hold the value (a `coinsurance` step with `max_amount` and `max_basis`, the shape the schema's own description gives for "Humana insulin '25% up to $35'"), and the Summary of Benefits prints insulin as rows of its own, so this is Question Q1, not a gap.

## 11. Other columns: quoted, not mapped

Quoted in the root entry of `pbp_mrx.txt` cells (section 8, item 7) or on the benefit they belong to (section 8): the attestations (`mrx_ltc_attest_flag`, `mrx_otc_meds_attest_flag`, `mrx_avg_exp_cost_share_attest`, `mrx_snp_zerocost_attest`, `mrx_dsnp_buydown_attest`, `mrx_vaccine_attest`, `mrx_insulin_attest`), the formulary exception tier (`mrx_tier_form_ex`, `_2_yn`, `_2`), first fill, OTC utilization management and step therapy, excluded drugs (`mrx_alt_excl_drugs_yn`), reduced cost sharing (`mrx_alt_red_cost_sharing`, `_items`), extended day supply (`mrx_tier_extd_days_yn`, `mrx_tier_extd_first_fill`, `mrx_tier_extd_days_gen_yn`, `mrx_gen_extd_first_fill`), the Defined Standard locations and days (`mrx_gen_loc_*`, `mrx_gen_*_1m` and the like), the daily copays and the average coinsurance dollars. The BALANCE model columns (`mrx_bal*`, `mrx_balance_*`, `mrx_tier_bal_*`) are blank on every row, and the demonstration flags `part_d_model_demo` and `part_d_enhncd_cvrg_demo` are blank or "N" (P14; "N" is not a dictionary code, section 12); they are quoted when filled.

## 12. Errors and warnings

Errors (the plan is not written; each message quotes the cells):

- A missing `pbp_mrx.txt` row for types 01, 02, 04, 31, 29; `mrx_drug_ben_yn` not 1 or 2; a Section D, Section B or `PlanArea.txt` row on a PDP.
- A benefit type and tier rows that disagree (section 3); `mrx_formulary_tiers_num` not equal to the tier row count; tier ids not 1 to n, or repeated; a repeated label; post-threshold rows whose (id, label) pairs differ from the tier rows'.
- `mrx_partd_network_loc` not equal to the locations the tier rows use; a flag that is not a string of 0 and 1 of its length.
- A chosen supply with a blank days or amount cell; a copay structure with a coinsurance cell or the reverse; structure 3 or 4.
- Deductible: a blank amount with code 1 or 2, an amount with code 3, `mrx_alt_ded_type_yn` "2" with a blank list, a skipped tier the plan does not have.
- No `PART_D_PARAMETERS` entry for the contract year.
- A code outside the dictionary's list in a column the mapping reads; any unreadable amount, percent or day number (the medical readers).
- `mrx_drug_ben_yn` "2" with tier or post-threshold rows, or on a PDP; a blank `mrx_benefit_type` with any other `mrx_` column filled or with tier rows.
- A tier or post-threshold row whose repeated cells (`part_d_model_demo`, `part_d_enhncd_cvrg_demo`, `mrx_tier_benefit_type` or `mrx_tier_post_benefit_type`, `mrx_tier_form_model_desc` or `mrx_tier_post_form_model_desc`) differ from the plan's `pbp_mrx.txt` cells (0 rows in CY 2027), so that they are quoted once, at the plan level.

Columns the mapping only quotes are quoted verbatim and not checked, as on the medical side. That matters at once: `part_d_enhncd_cvrg_demo` ("Part D Senior Savings Model", dictionary codes 1 Yes and 0 No) is "N" on 1,052 `pbp_mrx.txt` rows and on 5,067 rows of each tier file (P19), a value the dictionary does not list. It is quoted, so it is not an error.

Warnings (the plan is written): `part-d-tier-label-unknown` (5.1), `part-d-deductible-not-standard` (5.4), `part-d-deductible-stage-cost-share` (5.3; H4045-001-000), `part-d-post-threshold-cost-share` (6.6).

Counted over the CY 2027 file by P19 (and P3, P4, P6, P8, P11, P18 for the others): 0 plans meet any error condition above, and 1 plan raises a warning (H4045-001-000). The built importer gives the same over the whole file (section 20).

## 13. Vocabulary and module proposals (decision D7)

Session 2 added the vocabulary entries: `canonical-benefits.json` is version 1.4.0 (was 1.3.0; `vocabulary_id` under `/vocabularies/v1.4.0/`), with 124 keys (16 in `pharmacy`), and `fhir/definitions/CodeSystem-canonical-benefits.json` is rebuilt (version 1.4.0, 124 concepts); `markets.json` is version 1.2.0 (was 1.1.0; `vocabulary_id` under `/vocabularies/v1.2.0/`), with 13 codes. The pharmacy module change waits for a module v0.2.2.

- `vocabularies/plan-types.json`: **no change.** `PDP` ("Standalone Medicare Part D plan.") is already there.
- `vocabularies/markets.json`: `medicare_part_d` (Stand-alone Medicare Part D prescription drug plan (PDP), sold by Part D region; CMS PBP plan type 29), added for the PBP importer's Part D sections. Without it `scripts/validate.js` warns on every PDP document.
- `vocabularies/canonical-benefits.json` (category `pharmacy`), each with the CMS label as its source and its 2027 tier rows:
  - `nonpreferred_drugs` (Non-preferred drugs: brand and generic drugs on a plan's non-preferred tier; CMS PBP tier label "Non-Preferred Drug", 5,214 tier rows), added for the PBP importer's Part D sections.
  - `select_care_drugs` (Select care drugs: a plan-defined tier of drugs for selected conditions; CMS PBP tier label "Select Care Drugs", 846).
  - `injectable_drugs` (Injectable drugs on a tier of their own; CMS PBP tier label "Injectable Drugs", 268).
  - `vaccine_drugs` (Part D vaccines on a tier of their own; CMS PBP tier label "Vaccines", 130). Not `immunizations`, which is the medical service.
  - `supplemental_drugs` (drugs excluded from Part D that the plan covers as a supplemental benefit; CMS PBP tier label "Supplemental Drugs", 52).
  - `select_diabetic_drugs` (CMS PBP tier label "Select Diabetic Drugs", 24).
  - "Single Tier" (4) and "Brand" (1): no key proposed; carried by name.
- **Drug tier codes:** none to propose. `tier_code` takes DrugTierCS codes, an HL7 code system, not a Benefit Plan Standard vocabulary.
- **The pharmacy module v0.2.2** (with the core copy, which `scripts/schema.test.js` keeps deep-equal): add `out_of_network` to `pharmacy_network.network_type`'s recommended values (every tier row of all 5,274 MA-PD and PDP plans with tiers uses the out-of-network location, P7). Optional in the same release: `specialty` to `drug_class`'s list, which the module's own example already uses.

## 14. The converter (decision D8, sharpened)

D8 expected `scripts/to-insuranceplan.js` to ignore the new rows. It does not, as written today:

- `fhir/carin-sbc-crosswalk.json` places `generic_drugs`, `preferred_generic_drugs`, `preferred_brand_drugs`, `nonpreferred_brand_drugs` and `specialty_drugs` under the SBC categories `generic-drugs`, `preferred-brand-drugs`, `non-preferred-brand-drugs` and `specialty-drugs`, so every keyed Part D benefit would be placed: H1036-068 would gain 33 placed benefits (Tiers 1, 2, 3 and 5; Tier 4, "Non-Preferred Drug", has no key) under 3 categories, all on the `IN` network, with nothing in the SBC profile to tell stage, pharmacy or supply apart.
- `generalCosts` already writes `pharmacy.deductible` and `pharmacy.out_of_pocket_max` as `generalCost` entries (since draft 6).
- A PDP has no medical benefit, and `pbpExampleFiles()` converts every `examples/*.pbp.json`.

**Decided and built (Question Q7):** the converter lists a benefit that has a `coverage_stage_id` in `bps-unmapped-benefit` instead of placing it (the SBC profile has no stages, networks of pharmacies or supplies), keeps the 2 `generalCost` entries, and does not convert a document whose `plan_type` is `PDP` (`pbpExampleFiles()` skips it; the CLI and `--write-golden` say why; converter spec section 8.4). The narrative counts the Part D benefits apart from the benefits with no SBC code. The pharmacy module's `humana_part_d_example.json`, a PDP, is refused too; its commercial example converts as before. With the keys of section 13 the "Non-Preferred Drug" tier has a key too, which no SBC code places. The 5 PBP Bundles still change (the 2 `generalCost` entries and the unmapped list), so session 2 regenerates them, re-pins their hashes in `scripts/to-insuranceplan.test.js`, and runs the HL7 validator on them as `examples/fhir/VALIDATION.md` describes.

## 15. Fixture plan

### 15.1 The 5 plans (decision D6)

| Plan | Population | Why |
|---|---|---|
| H1036-068-000 Humana Gold Plus H1036-068 (HMO), Humana | MA-PD, golden | Required by D6. Retail not split, mail order split; deductible code 1 ($700) skipping Tiers 1 to 3; T1 `includes` "3" with a $0 post-threshold row; 100-day supplies. **Summary of Benefits check 1.** |
| H2406-013-000 AARP Medicare Advantage from UHC FL-0021 (PPO), UnitedHealthcare | MA-PD, golden | Deductible code 2 ($685); a PPO (the `IN` rule beside an `OUT` tier); T2 `includes` "3" with a $5 post-threshold row (6.6); its saved Summary of Benefits (PDF pages 6 and 7) already shows the excluded-drug reading. |
| H1609-028-000 Aetna Medicare Select Extra (HMO-POS), Aetna Medicare | MA-PD, golden | **Split retail and a deductible that skips tiers** ($700, Tiers 1 and 2 skipped); 2-month supplies (`rsplt` "111"); out-of-network "other" supply only (`mrx_tier_locat_oon` "10", 10 days) with `mrx_alt_oon_cstshr_struct` "3". |
| S5921-383-000 AARP Medicare Rx Preferred from UHC (PDP), UnitedHealthcare | PDP | Sponsor 1. Enhanced Alternative; deductible code 2 ($300) skipping Tiers 1 and 2; retail and mail order split; mail order 3-month only on Tiers 1 to 3; T2's $10 post-threshold row. **Summary of Benefits check 2.** |
| S4802-146-000 Wellcare Value Script (PDP), Wellcare | PDP | Sponsor 2. 6 tiers with 2 labels that have no `tier_code` ("Injectable Drugs" T4, "Select Care Drugs" T6; their keys are 2 of the section 13 additions); deductible code 1 skipping Tiers 1 and 6; 2-month supplies; region "Florida". |

The 3 MA-PD plans are 3 of the 5 golden plans; H5533-019-000 and H5425-140-000, the other 2, are MA-PD too (P17), so all 5 golden documents gain Part D. The 2 PDPs join `GOLDEN` in `scripts/from-pbp.js`, which makes 7 golden plans: `{ year: 2027, plan: 'S5921-383-000', why: 'PDP (UnitedHealthcare); deductible skipping Tiers 1 and 2; split retail and mail order; excluded-drug cost share after the threshold' }` and `{ year: 2027, plan: 'S4802-146-000', why: 'PDP (Wellcare); 6 tiers, Injectable Drugs and Select Care Drugs with no tier code' }`. Golden file names by the slug rule: `unitedhealthcare-aarp-medicare-rx-preferred-from-uhc.pbp.json`, `wellcare-wellcare-value-script.pbp.json`.

### 15.2 Rows to cut

| File | Rows for the 7 golden plans |
|---|---|
| `pbp_mrx.txt` | 7 (1 per plan) |
| `pbp_mrx_tier.txt` | 36 (5 each, 6 for S4802-146) |
| `pbp_mrx_p.txt` | 36 |
| `pbp_Section_A.txt` | 7 (2 more) |
| `PlanRegionArea.txt` | the PDPs' rows: 1 each (region 11 "Florida") |
| `PlanArea.txt`, Sections B, C, D | none for the PDPs (the cut finds none) |

### 15.3 What `--write-fixtures` has to change

- `READ_FILES` gains `pbp_mrx.txt`, `pbp_mrx_tier.txt` and `pbp_mrx_p.txt` (24 files). `writeFixtures` cuts every file of `READ_FILES` for every `GOLDEN` plan, and `cutFile` keys on the first 3 columns, which the MRx files share, so the cut itself needs no change.
- `loadPlan` reads the 3 files (`one('pbp_mrx.txt', false)`, `rowsFor` for the 2 tier files) and passes `rows.mrx`, `rows.mrxTiers`, `rows.mrxPost` to `buildDocument`.
- `.gitattributes` already marks `test/fixtures/pbp/**/*.txt -text`, so the new fixtures keep their CRLF.
- The fixture `download.json` lists the 7 plans and the record counts of 24 files; the test "the fixtures hold only the golden plans" still holds.

## 16. Tests for session 2

1 per rule, named as `scripts/from-pbp.test.js` names its tests, on the golden plans and on altered fixture rows:

1. `part-d populations: an MA-PD plan gets pharmacy and its Part D benefits after the medical benefits` (H1036-068: medical indexes 0 to 37 unchanged, Part D 38 to 79).
2. `part-d populations: mrx_drug_ben_yn "2" writes no pharmacy object and quotes the answer` (altered H1036-068).
3. `part-d populations: an employer MA-PD with a blank benefit type writes no pharmacy object and a source reference` (altered).
4. `part-d populations: a Defined Standard plan writes the deductible, the threshold and the stages, and no tiers or Part D benefits` (altered `mrx_benefit_type` "1", tier rows removed).
5. `part-d PDP: document shape` (S5921-383: `plan_type` PDP, `market` medicare_part_d, 1 `IN` tier with its description, no `accumulators`, no `service_area`, no `premium`, the regions and the premium entries in `source_references`).
6. `part-d PDP: type 30 is refused with the reason` (altered Section A of a PDP to 30, its MRx rows removed).
7. `part-d PDP: an employer PDP with no Part D design is refused` (altered).
8. `part-d errors: a missing pbp_mrx row, a benefit type that disagrees with the tier rows, mrx_formulary_tiers_num against the rows, tier ids, post-threshold pairs` (altered rows, 1 assertion each).
9. `part-d tiers: tier_id, name, description, and tier_code and drug_class from the label table` (S4802-146: T4 and T6 have neither code).
10. `part-d tiers: an unknown label is written by name with the warning part-d-tier-label-unknown` (altered).
11. `part-d networks: the networks the location flags use, in order, and mrx_partd_network_loc must agree` (H1036-068 five networks, S5921-383 six; an altered flag is an error).
12. `part-d stages: DEDUCTIBLE only with a deductible; CATASTROPHIC carries the threshold; no coverage gap`.
13. `part-d deductible: code 1 with skipped tiers` (H1036-068: 700, T4 and T5) and `code 2` (S5921-383: 300, T3 to T5).
14. `part-d deductible: code 3, the standard benefit types, all tiers, and the not-standard warning` (altered rows).
15. `part-d threshold: out_of_pocket_max 2400 from PART_D_PARAMETERS with its source reference; a contract year with no entry is an error`.
16. `part-d benefits: 1 per tier, network and chosen supply; ids, order, day_supply` (H1036-068: 37 and 5; S5921-383: 36 and 5; H1609-028's OTHER supply).
17. `part-d steps: copay and coinsurance by structure, basis per_prescription; structure 3 is an error; a blank amount on a chosen supply is an error`.
18. `part-d deductible flags: applies_to_deductible and deductible_ref per tier; catastrophic false with no ref`.
19. `part-d threshold flags: moop_ref pharmacy on every step; includes 2 false; includes 3 true with the note` (altered `includes` "2").
20. `part-d catastrophic: every tier's step is $0 with its regulation source; the file's excluded-drug amount is quoted and named in the notes, never the step's amount` (S5921-383 T2 $10; H2406-013 T2 $5).
21. `part-d out of network: the structure note and the IN tier note` (H1036-068 code 2; H1609-028 code 3).
22. `part-d citations: every Part D benefit has 1 excerpt that names the file, the key, the label and every cell it was read from` (all golden plans).
23. `part-d canonical keys: keys from the label table; no key carried by name` (S4802-146).
24. `part-d insulin: the mrx_tier_ira cells quoted once per tier, no insulin benefit` (H1036-068: 5 entries).
25. `part-d references: the plan-level entries in order, after the medical ones`.
26. `part-d schema: every golden document validates against v1.2.0 and scripts/validate.js reports 0 pharmacy warnings`.
27. `part-d determinism: a second build is byte-identical; the golden files from the full files equal the fixture builds` (the existing tests, now over 7 plans).
28. `part-d readers: an unreadable amount, percent, day count or flag quotes the cell` (altered).
29. `converter: Part D benefits are listed as unmapped, the pharmacy generalCost entries are kept, and a PDP document is not converted` (section 14; in `scripts/to-insuranceplan.test.js`).
30. `sob-check: H1036-068-000 and S5921-383-000 golden files against their Summary of Benefits, 0 differences` (section 18).

The vocabulary additions of section 13 are checked by test 23 (every Part D key is in the vocabulary). Built in session 2 under these names: 29 tests in `scripts/from-pbp.test.js` (test 13 as 2 tests, `part-d deductible: code 1 with skipped tiers` and `part-d deductible: code 2`) and test 29 in `scripts/to-insuranceplan.test.js`, plus `part-d PDP: contacts.member_services_phone from pbp_a_pd_curmbr_phone, quoted with its title` for the phone of section 4, and test 23 checks the vocabulary's version 1.4.0; the existing tests that loop over the golden plans run on 7, and those about medical benefits on the 5 Medicare Advantage plans.

**Size of session 2:** about 450 to 550 lines in `scripts/from-pbp.js` (the readers exist; the new parts are the PDP branch, the pharmacy object, the benefit enumeration and the references), 30 tests, 7 golden documents and 5 Bundles regenerated with their hashes, 1 HL7 validator run, 2 vocabulary files changed (markets and canonical benefits), and the spec's sections 1, 3, 4.4, 10, 11 and 13 updated: a full day.

## 17. What session 2 does not change

The medical mapping, the crosswalk's 41 rows and their order, the existing 2 Summary of Benefits check files (their pointers are medical indexes, which stay where they are), the schema and the pharmacy module.

## 18. Summary of Benefits checks (decision D6)

The 2 files are written in this session, in the shape of `H2406-013-000.json`: [`pbp-sob-checks/H1036-068-000.json`](pbp-sob-checks/H1036-068-000.json) and [`pbp-sob-checks/S5921-383-000.json`](pbp-sob-checks/S5921-383-000.json). Their pointers are the indexes of section 6.8 (from `plans/*-benefits.md`), and each benefit check names the tier, network, stage and `day_supply` with the value, so a benefit in the wrong place is a DIFFERENCE, not a silent pass. They cannot pass before session 2 builds the Part D rows (the golden files have none), so no test runs them yet; test 30 does then.

| Plan | Document | Part D pages | Rows checked |
|---|---|---|---|
| H1036-068-000 | `H1036_SB_MAPD_HMO_068000_2027_M`, 24 pages, https://assets.humana.com/is/content/humana/H1036068000SB27pdf, saved 2026-10-24 as `data/pbp/2027/sob/H1036-068-000-2027-SB.pdf` (SHA-256 `cfbff1210553e1ac0ed9ad4d3ab7d74a008494d903f936c17859adbef8e9e11f`) | 4 (Part D deductible), 11 (initial coverage grid, $2,400), 12 (insulin, catastrophic, excluded drugs), 13 (long-term care) | 5 plan-level checks (the deductible and its tiers, the threshold, the 3 stages, the tier names, the networks); each tier's 30- and 100-day retail and standard and preferred mail order cells (27); the deductible flags of the retail 30-day rows (5); the catastrophic rows at $0 for covered Part D drugs (5); the excluded-drug figure after the threshold, $0 on page 12, against Tier 1's catastrophic notes (1); long-term care Tiers 1 and 3 (2); insulin Tier 3 retail 30-day (1) |
| S5921-383-000 | `Y0066_SB_S5921_383_000_2027_M`, 5 pages, https://www.uhc.com/medicare/alphadog/PDFL27PD0398689_000 (linked as "Summary of Benefits (PDF)" from https://www.uhc.com/medicare/health-plans/details.html/33401/099/S5921383000/2027), saved 2026-10-24 as `data/pbp/2027/sob/S5921-383-000-2027-SB.pdf` (SHA-256 `0d24f911994f7737ff2a3e5956f357d8ca949e8860a9b3722f8f7cb1f77002e1`) | 2 (premium, deductible, stages, $2,400, Tiers 1 to 3), 3 (Tiers 3 to 5, insulin, catastrophic, additional drugs, long-term care), 4 (plan type, service area, pharmacy network) | 8 plan-level checks (the plan type, premium and service area, the deductible and its tiers, the threshold, the 3 stages, the tier names, the networks); each tier's retail preferred and standard 30- and 100-day and preferred and standard mail order 100-day cells (22); the deductible flags of the standard retail 30-day rows (5); the catastrophic rows at $0 for covered Part D drugs (5; the page prints no figure after the threshold for the additional, non-Part D drugs, so there is no excluded-drug check); long-term care Tiers 1 and 3 (2); insulin Tier 3 retail preferred 30-day (1) |

H1036-068-000 has 46 checks, S5921-383-000 has 43. The expected READING rows, by design: the PDP premium and service area (section 4) and the insulin rows (Question Q1). S5921-383's Tier 2 catastrophic row reads $0 for covered Part D drugs, as the page prints; the file's $10 is quoted and named in the step's notes as the excluded drugs' amount (section 6.6, Question Q6). A document built by hand from the `plans/*-benefits.md` listings and this mapping, run through `scripts/pbp-sob-check.js` on 2026-10-24, gave `46 checks: 45 MATCH, 1 READING, 0 DIFFERENCE` and `43 checks: 40 MATCH, 3 READING, 0 DIFFERENCE`, and the golden files the importer writes give the same, as the checker prints them (test 30 pins both).

## 19. Questions Q1 to Q8, decided

Decided by Diego Orofino on 2026-10-24: the recommended answers to Q1 to Q5, Q7 and Q8 are accepted, Q6 is decided differently, and the sections above write each answer. The last column stays as the record of what each answer gives up. Q1 leaves a follow-up (insulin benefits with the November formulary reader). Q3's reading was confirmed in session 2 on the S5884-105-000 Summary of Benefits (section 6.4), and the flags are written.

| # | Question | Decided (2026-10-24) | Cost if wrong |
|---|---|---|---|
| Q1 | Write insulin benefits now (`coinsurance` with `max_amount`, per insulin tier, network and supply), or quote the cells (section 10)? | Quote now; write them with the November formulary reader, which is what tells a reader that a drug is insulin. | Until then an app that reads only fields shows the tier's own cost share for an insulin (H1036-068 Tier 4: 50% instead of 25% up to $35); the cap is in the quoted text. Writing them now adds 1 benefit per insulin tier, network and supply (37 on H1036-068, whose 5 tiers all have insulin; 20 on S5921-383, whose Tiers 3 to 5 do) and 2 tests. |
| Q2 | Every supply its own benefit (6.1), or merge equal supplies as D4 proposed? | Every supply. | A median of 10 more benefits per MA-PD plan (42 against 32). The other way, 69,967 benefits would hold their supply only in a note. |
| Q3 | The standard benefit types (Actuarially Equivalent Standard 193 plans, Defined Standard 207) leave `mrx_alt_ded_charge` and `mrx_alt_ded_type_yn` blank: write `applies_to_deductible` true on every tier, or leave it unwritten? | Unwritten, with the note, until confirmed on 1 Actuarially Equivalent Standard Summary of Benefits, then true. Confirmed on 2026-10-24 on S5884-105-000, Humana Basic Rx Plan (PDP), Florida (page 4, section 6.4): written true, with `deductible_ref` `pharmacy`, on the initial coverage steps of the 193 plans; the 207 Defined Standard plans have no benefits. | 1 document confirms the reading; a plan whose own document names tiers the deductible skips would be read wrong, and the file gives no tier answer for these benefit types. |
| Q4 | `network_type` `out_of_network` before the pharmacy module lists it? | Write it and propose it for v0.2.2. | A consumer that knows only the 5 recommended values sees an unknown string; `network_id` and `name` still say out of network. |
| Q5 | Refuse the 283 employer PDPs that have no Part D design, or write a document with a name and regions and no benefit? | Refuse, as type 30. | 283 employer PDPs, which are not sold to individuals, have no document. |
| Q6 | A catastrophic row whose file amount is the excluded drugs' (1,105 rows, 1,003 plans): write the amount with `applies_to_moop` false and the note, or write no step? | Decided differently from the recommendation: every tier's catastrophic step is $0 for a covered Part D drug, cited to 42 CFR 423.104(d)(5)(i) and the threshold of Table V-6, as the threshold is cited; the file's amount is quoted in the step's `source_references` and named in its notes as the excluded drugs' amount, never written as the step's amount (6.6). Built so in session 2: 1,105 steps carry the note over the CY 2027 file, and both check files give 0 differences on the built documents. | An app that reads only fields never sees the excluded drugs' amount. |
| Q7 | The converter and Part D (section 14). | Part D benefits unmapped; the pharmacy `generalCost` entries kept; PDPs not converted. | Placing them puts up to 26 benefits per plan under SBC drug categories with nothing to tell stage, pharmacy or supply apart. |
| Q8 | `drug_class` only from the schema's recommended list, so "Specialty Tier" has none? | Yes, with `specialty` proposed for the module's list (section 13). | 5,269 specialty tiers carry their class only in `tier_code` and `name`. |

Still open from the medical importer and not touched here: P1, H1, H2, O1 and the readings at the end of spec section 7.

## 20. Built (session 2, 2026-10-24)

**Code.** `scripts/from-pbp.js`: `READ_FILES` has 24 files with the 3 Part D files; `loadPlan` passes `rows.mrx`, `rows.mrxTiers` and `rows.mrxPost`; `buildPartD` writes the `pharmacy` object, the benefits and the root entries of sections 5 to 12; `buildPdpDocument` writes the PDP document of section 4; `PART_D_PARAMETERS` holds the 2027 deductible, threshold, `source` and `post_threshold_source`; `STEP_ORDER` has `deductible_ref` and `moop_ref`; `GOLDEN` has the 2 PDPs. `scripts/to-insuranceplan.js`: section 14. `scripts/rtb-completeness.js` leaves the 2 PDP golden files out of its default list, because the medical MVP has no stand-alone Part D plan; its counts for the 10 examples are unchanged.

**Whole-file run** over the CY 2027 file (a throwaway script in the session's scratch space that reads each file once and calls `buildDocument` for every plan of types 01, 02, 04, 31, 29 and 30, with the schema check on every document): 6,872 Medicare Advantage plans built (3,115 type 01, 1,273 type 02, 2,411 type 04, 73 type 31) and 323 PDPs built, 0 errors, 0 schema failures; refused as section 4.1 says, 283 employer PDPs with no Part D design and the 2 type 30 plans. Warnings: `part-d-deductible-stage-cost-share` 1 (H4045-001-000, `mrx_alt_ded_tier_cstshr_yn "2"`, `mrx_alt_gen_cstshr_struct "1"`, `mrx_alt_gen_coins_pct "0"`); the other 3 Part D kinds 0; `medicare-covered-cost-share-blank` 234 on 117 plans, as before. Written:

| | MA-PD | PDP |
|---|---|---|
| `pharmacy`, tiered designs | 4,956 | 318 |
| `pharmacy`, Defined Standard | 202 | 5 |
| No `pharmacy` (`mrx_drug_ben_yn` "2", or the employer plans with no design) | 1,714 | 0 |
| `pharmacy.deductible` | 4,708 | 320 |
| Part D benefits (initial coverage, catastrophic) | 235,324 (209,595, 25,729) | 16,304 (14,676, 1,628) |
| Steps with `applies_to_deductible` true | 103,365 | 11,138 |
| Steps with `applies_to_moop` false (`includes` 2) | 357 | 0 |
| Catastrophic steps with the excluded-drug note (6.6) | 1,061 | 44 |
| Part D benefits with no canonical key ("Brand" 9, "Single Tier" 34) | 43 | 0 |
| Plans with a tier-row cell no rule reads (section 8, item 7) | 0 | 0 |
| `contacts.member_services_phone` (`pbp_a_curmbr_phone`; for a PDP `pbp_a_pd_curmbr_phone`, section 4) | 6,872 | 323 |

The benefit totals are those of P18 (235,324 and 16,304), and the 1,105 notes those of P13.

**Golden documents** (section 15), Part D benefits written: H2406-013-000 33, H1036-068-000 42, H1609-028-000 67, H5533-019-000 67, H5425-140-000 67, S5921-383-000 41, S4802-146-000 70. The 5 Bundles of the Medicare Advantage ones were regenerated and validated (eighth run in `examples/fhir/VALIDATION.md`: 0 errors, the same 17 warnings). The Summary of Benefits checks give the results of section 18.

**What session 2 changed in this document, and why** (each against the file, the code or a source read in session 2):

- Section 4.1: a type 30 plan with a `pbp_mrx.txt` row is refused with its own message, not read as a PDP, because the type 30 plans have `PlanArea.txt` rows, which section 4 makes an error on a PDP. The employer PDP message ends with the section pointer and says "employer group" only for `pbp_a_eghp_yn` "1". Section 4: a Section C row on a PDP is an error too.
- Sections 5.4 and 6.4 and Question Q3: confirmed on the S5884-105-000 Summary of Benefits and written; the "the same" cells of the 6.4 table are spelled out, the catastrophic step false with no reference on every row, as 6.6 says.
- Section 6.6: the reading of § 423.104(e)(2) and (f) follows the eCFR text (paragraph (e) is "Alternative prescription drug coverage", paragraph (f) "Enhanced alternative coverage"); the document had said they apply to "Actuarially Equivalent and Enhanced Alternative coverage". The check-file results on the built documents are recorded.
- Section 8: item 7 (tier-row cells no rule reads) is new, and the repeated Section A columns are named; a catastrophic benefit also quotes `mrx_tier_post_type_id` and `mrx_tier_post_drug_type`.
- Sections 9, 13, 14 and 15.1: section 13 had session 2 add the 6 keys while section 9 called them "proposed" and section 15.1 said S4802-146's 2 tiers have no key; the keys are added and written, and the 3 sections now say so. The vocabulary goes to version 1.4.0 for them, and `markets.json` to 1.2.0 for `medicare_part_d` (decided 2026-10-24; a first build had added both in place, at 1.3.0 and 1.1.0).
- Section 4: a PDP's member services phone is read from `pbp_a_pd_curmbr_phone` (decided 2026-10-24): the section had said contacts as spec 4.1, whose `pbp_a_curmbr_phone` is blank on every PDP, so the first build wrote no phone. Over the CY 2027 file 323 of the 323 PDPs built get the phone, and 6,872 of the 6,872 Medicare Advantage plans keep theirs from `pbp_a_curmbr_phone`.
- Section 12: 2 more error conditions, both 0 in CY 2027 (the Part D answer or blank benefit type against the other cells; the cells the tier rows repeat).
- Section 16: where test 29 lives and how test 13 is split.
- The benefit listings in `pbp-part-d/profile/plans/*-benefits.md` printed the file's post-threshold amount as the catastrophic cost share on 2 rows (H2406-013 Tier 2 "copay $5", S5921-383 Tier 2 "copay $10"), against Question Q6. `profile-mrx.js --benefits` now prints "copay $0" with the file's cells beside it, and the 5 listings were regenerated; nothing else in them changed.
