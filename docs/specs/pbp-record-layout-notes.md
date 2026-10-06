# Notes: CMS Plan Benefit Package (PBP) Benefits record layout, contract year 2027

**Status:** Notes, 2026-10-06. Read from the files, not from memory.
**Reads with:** [`pbp-importer.md`](pbp-importer.md) (the draft importer spec these notes feed)

Every count and value below comes from the CY 2027 release downloaded on 2026-10-06 (`data/pbp/2027/`, `download.json` holds the URL and SHA-256 of every file). The layout source is `PBP_Benefits_2027_dictionary.xlsx` and `Readme_PBP_Benefits_2027.txt`, both inside the zip. Where these notes could not settle something, it is written as a question.

---

## 1. What ships

| Item | Value |
|---|---|
| Page | https://www.cms.gov/data-research/statistics-trends-and-reports/medicare-advantagepart-d-contract-and-enrollment-data/benefits-data/pbp-benefits-2027 |
| Zip | https://www.cms.gov/files/zip/pbp-benefits-2027.zip (23,373,818 bytes, server `Last-Modified` Thu, 01 Oct 2026 17:45:40 GMT) |
| Release label on the page | "PBP Benefits-2027", Report Period "2027". No quarter is named. |
| Zip contents | 145 files: 71 data `.txt` files, 71 SAS input programs (`.sas`, one per data file), `Readme_PBP_Benefits_2027.txt` and `PBP_Benefits_2027_dictionary.xlsx`. Data files are dated 2026-10-01 inside the zip, the SAS programs and dictionary 2026-09-30. |

The Readme says: "The CY 2027 PBP Benefits file provides the universe of PBP data for all active contracts and contains all the approved benefit and financial data submitted as part of the CY 2027 Bid Submission ... The PBP Benefits file is updated quarterly."

**Question 1.** CMS gives this release no quarter. Is it the first 2027 release (and should later releases be tracked by their `Last-Modified` date), or does CMS label quarters elsewhere?

## 2. File format

- **Delimiter and records.** Tab-delimited text, one header row of column names, CRLF line ends, no quoting: 0 lines in any file contain a `"` character, and every record in every file has exactly as many fields as its header.
- **Encoding.** Windows-1252, not UTF-8. 63 of the 71 data files are pure ASCII. The other 8 hold bytes that are not valid UTF-8: `pbp_Section_A` (0x92, 0x96, 0xD3, 0xE1), `pbp_b10_amb_trans` (0x92, 0x96), `pbp_b10_b19b_amb_trans_vbid_uf` (0x96), `pbp_b14_preventive` (0x95), `pbp_b16_dental` (0x95, 0x96, 0xA0), `pbp_b17_eye_exams_wear` (0x96), `pbp_b19b_model_test_vbid_uf` (0x92), `pbp_step16` (0x95, 0x96, 0xA0). In Windows-1252 these are a right single quote, a bullet, an en dash, a no-break space and the letters Ó and á. Every data file decodes as Windows-1252 with no undefined byte. The Readme is the exception: it is valid UTF-8 (curly quotes).
- **Types.** Every cell is text in the file. The dictionary gives each column a type (`CHAR` or `NUM`) and a length. Amounts are written with 2 decimals (`"1000.00"`), percentages as whole numbers (`"40"`), codes as short strings (`"01"`, `"1"`). The Readme warns that IDs such as plan `001` must be read as text.
- **Blank.** An empty cell. In the B files, 438 plans have every cost-share column blank: the 416 National PACE plans, 19 MSA plans and 3 cost plans in the B files.
- **Repeated column names.** `pbp_Section_A.txt` has `pbp_a_ben_cov` and `pbp_a_plan_type` twice (positions 4 and 23, 5 and 21; 1-based). The 2 copies agree on all 7,973 rows. `PlanArea.txt` and `PlanRegionArea.txt` have `segment_id` twice.
- **Header case.** Mostly lowercase; `pbp_Section_A.txt` has `pbp_a_BPT_MA_date_time` and 2 similar. File names differ in case from the Readme (`pbp_Section_A.txt` in the zip, `pbp_section_a.txt` in the Readme), so a reader on a case-sensitive file system must match names case-insensitively.
- **Code lists.** Single codes (`"1"` Yes, `"2"` No; plan type `"01"` HMO). Multi-select columns use 2 encodings:
  - A position string, which the dictionary writes as `1 in N`: character N is `1` when option N is chosen. Example: `pbp_d_ann_deduct_bens` `"010"` means option 2 only (In-Network Medicare-covered benefits); `pbp_b18b_bendesc_ehc` `"0100"` means option 2 only (Hearing Aids, all types).
  - A semicolon-terminated list of service category codes: `pbp_c_oon_out_mc_bendesc_cats` `"7a;"`, `pbp_d_inn_max_enr_m_cat_ex` `"1a;1b;2;3-1;...;18a;"`.
- **SAS programs.** One `.sas` per data file, giving the input order and which columns are character. Not needed to read the text files; the dictionary carries the same type information.

## 3. The dictionary

`PBP_Benefits_2027_dictionary.xlsx` has 1 sheet, `PBP_Benefits_2027_dictionary`, with 26,957 data rows and 11 columns: `FILE`, `NAME`, `TYPE`, `LENGTH`, `SERVICE CATEGORY`, `FIELD_TITLE`, `JSON QUESTION`, `TITLE`, `CODES`, `CODE_VALUES`, `SERVICE CATEGORY DERIVED`. A column with a code list takes 1 row per code; the continuation rows leave `NAME` blank. It covers 69 of the 71 data files. **`PlanArea.txt` and `PlanRegionArea.txt` are not in the dictionary.**

**Question 2, answered 2026-10-06.** `PlanArea.county_code` is the SSA state and county code, not FIPS: Duval is `10150` in the file and in the SSA list, `12031` in FIPS. 3,219 of the 3,262 codes in the file are in the 2018 SSA list. Details and sources: `pbp-importer.md` section 4.5.

## 4. The plan key

Every data file starts with the same 8 columns: `pbp_a_hnumber`, `pbp_a_plan_identifier`, `segment_id`, `pbp_a_ben_cov`, `pbp_a_plan_type`, `orgtype`, `bid_id`, `version`.

| Column | Dictionary | In the file |
|---|---|---|
| `pbp_a_hnumber` | CHAR 5, "H Number" | 5 characters, first letter `H` (7,292 rows), `S` (606), `R` (73), `E` (2) |
| `pbp_a_plan_identifier` | CHAR 3, "Plan ID" | Always 3 characters, zero-padded (`"013"`) |
| `segment_id` | NUM 3, "Segment ID" | **Not padded**: 1 or 2 digits. `"0"` on 7,226 rows; the values present are 0 to 10, 13 to 16, 19 and 21 to 23 |
| `bid_id` | CHAR 13, "BID ID (H-number, Plan ID, Segment ID)" | `H2406_013_0`; equals the 3 key columns joined with `_` on all 7,973 Section A rows |

**The plan key is (`pbp_a_hnumber`, `pbp_a_plan_identifier`, `segment_id`).** It is unique in `pbp_Section_A.txt` (7,973 rows, 7,973 keys). The repo's `plan_identifiers` convention (`docs/medicare-advantage-schema-proposal.md`) writes it `H1036-025-000`, with the segment padded to 3 digits; the file's `"0"` must be padded to match.

**Join to the HETS 271.** The task brief says the HETS 271 returns the H contract number and a 3-digit plan number. Those join to `pbp_a_hnumber` and `pbp_a_plan_identifier` directly (both are text of the same width). The segment is the problem: 266 contract-and-plan pairs have more than 1 segment (747 Section A rows; 109 HMO, 81 local PPO, 76 HMO-POS). For all 266, the segments' county sets in `PlanArea.txt` do not overlap, so the member's county picks exactly 1 segment.

**Question 3, settled 2026-10-06.** The HETS 271 returns the contract and plan number but no segment, so the member's county picks the segment (the county sets of a plan's segments never overlap). A caller holding a FIPS county code needs an SSA crosswalk (`pbp-importer.md` sections 4.1 and 4.5).

## 5. Plan counts

| Count | Value |
|---|---|
| Plans (contract + plan + segment) in `pbp_Section_A.txt` | **7,973** |
| Distinct contract + plan | 7,492 |
| Contracts | 940 |
| Plans in the B files and Section D (Section A minus 606 Part D plans and 2 employer direct-contract PDPs) | 7,365 |
| Medicare Advantage plan types 01, 02, 04, 07, 09, 31 | 6,907, of which 1,385 employer-only (`pbp_a_eghp_yn` 1), 1,969 special needs (`pbp_a_special_need_flag` 1), 3,553 neither |
| Plans in `PlanArea.txt` with a Florida county | 1,319 |

Section A by `pbp_a_plan_type`: 01 HMO 3,115; 04 Local PPO 2,411; 02 HMOPOS 1,273; 29 Medicare Prescription Drug Plan 606; 20 National PACE 416; 31 Regional PPO 73; 18 1876 Cost 42; 07 MSA 19; 09 PFFS 16; 30 Employer/Union Only Direct Contract PDP 2.

## 6. Tables

Grain: "1 per plan" means 1 row per plan key in this release. Files with a `pbp_vbid_group_id` column can hold several rows per plan (1 per UF or SSBCI group); where this release happens to have 1, the table still says "1 per plan".

### 6.1 Sections A, C and D

| File | Rows | Cols | Plans | Grain | Encoding | Holds |
|---|---|---|---|---|---|---|
| `pbp_Section_A.txt` | 7,973 | 89 | 7,973 | 1 per plan | Windows-1252 bytes | General plan information: organization legal and marketing names, plan name, plan type, segment name, employer-only and special needs flags, web addresses and phone numbers. Every plan, including Part D plans. |
| `pbp_Section_C.txt` | 6,768 | 226 | 6,768 | 1 per plan | UTF-8 clean | Out-of-network, point-of-service and visitor/travel data: whether the plan has an out-of-network benefit, the categories it covers, and out-of-network inpatient and SNF cost shares. The Readme says this file can hold several rows per PPO (1 per cost share group); this release has 1 row per plan, and the groups are in the next file. |
| `pbp_Section_C_OON.txt` | 184,765 | 25 | 2,498 | plan x `pbp_c_oon_outpt_group_num_id` | UTF-8 clean | Out-of-network groups: each row lists service category codes and that group's copay and coinsurance (min and max), deductible and maximum plan benefit. Up to 98 groups per plan. |
| `pbp_Section_C_POS.txt` | 3,268 | 25 | 1,273 | plan x `pbp_c_pos_outpt_group_num_id` | UTF-8 clean | Point-of-service groups. The same 17 group fields as the out-of-network file, but with different names (`pbp_c_pos_outpt_mc_bencats`, `pbp_c_pos_outpt_deduct_yn`) and in a different order, so a reader must match by name. Up to 19 per plan. |
| `pbp_Section_D.txt` | 7,365 | 484 | 7,365 | 1 per plan | UTF-8 clean | Plan-level financials: deductibles (4 families), out-of-pocket maximums (in-network, combined, out-of-network, non-network), premiums, Part B premium reduction, balance billing, reductions in cost sharing, combined supplemental benefit packages. |
| `pbp_Section_D_OON.txt` | 11,344 | 19 | 677 | plan x `pbp_d_opt_oon_cat_id` x `pbp_d_opt_oon_identifier` | UTF-8 clean | Optional supplemental plan-level out-of-network deductibles and out-of-pocket limits. |
| `pbp_Section_D_opt.txt` | 1,374 | 21 | 961 | plan x `pbp_d_opt_identifier` | UTF-8 clean | Optional supplemental packages and their premiums. Up to 3 per plan. |

### 6.2 Section B, by service category

| File | Rows | Cols | Plans | Grain | Encoding | Holds |
|---|---|---|---|---|---|---|
| `pbp_b1a_inpat_hosp.txt` | 7,365 | 300 | 7,365 | 1 per plan | UTF-8 clean | 1a Inpatient hospital acute: copay and coinsurance per stay and by day interval, up to 3 hospital tiers, lifetime reserve days, additional days, upgrades. |
| `pbp_b1b_inpat_hosp.txt` | 7,365 | 297 | 7,365 | 1 per plan | UTF-8 clean | 1b Inpatient psychiatric, same shape as 1a. |
| `pbp_b2_snf.txt` | 7,365 | 203 | 7,365 | 1 per plan | UTF-8 clean | 2 Skilled nursing facility. |
| `pbp_b3_cardiac_rehab.txt` | 7,365 | 90 | 7,365 | 1 per plan | UTF-8 clean | 3 Cardiac and pulmonary rehabilitation. |
| `pbp_b4_emerg_urgent.txt` | 7,365 | 81 | 7,365 | 1 per plan | UTF-8 clean | 4 Emergency and urgently needed care, worldwide coverage. |
| `pbp_b5_partial_hosp.txt` | 7,365 | 40 | 7,365 | 1 per plan | UTF-8 clean | 5 Partial hospitalization and intensive outpatient. |
| `pbp_b6_home_health.txt` | 7,365 | 22 | 7,365 | 1 per plan | UTF-8 clean | 6 Home health. |
| `pbp_b7_health_prof.txt` | 7,365 | 218 | 7,365 | 1 per plan | UTF-8 clean | 7 Health care professionals: 7a primary care, 7b chiropractic, 7c occupational therapy, 7d physician specialist, 7e mental health specialty, 7f podiatry, 7g other professional, 7h psychiatric, 7i physical and speech therapy, 7j additional telehealth, 7k opioid treatment. |
| `pbp_b8_clin_diag_ther.txt` | 7,365 | 54 | 7,365 | 1 per plan | UTF-8 clean | 8 Outpatient diagnostic procedures, lab, radiology. |
| `pbp_b9_outpat_hosp.txt` | 7,365 | 89 | 7,365 | 1 per plan | UTF-8 clean | 9 Outpatient hospital, observation, ambulatory surgery center, outpatient substance use, blood. |
| `pbp_b10_amb_trans.txt` | 7,365 | 75 | 7,365 | 1 per plan | Windows-1252 bytes | 10a Ambulance, 10b transportation. |
| `pbp_b11_dme_prosth_orth_sup.txt` | 7,365 | 67 | 7,365 | 1 per plan | UTF-8 clean | 11 Durable medical equipment, prosthetics, supplies, diabetic supplies. |
| `pbp_b12_renal_dialysis.txt` | 7,365 | 22 | 7,365 | 1 per plan | UTF-8 clean | 12 Dialysis. |
| `pbp_b13_other_services.txt` | 7,365 | 159 | 7,365 | 1 per plan | UTF-8 clean | 13 Acupuncture (13a), OTC items (13b), meals (13c), "Other" plan-defined services (13d to 13f), D-SNP integrated services (13g). |
| `pbp_b14_preventive.txt` | 7,365 | 374 | 7,365 | 1 per plan | Windows-1252 bytes | 14 Preventive services, annual physical, health education, fitness and other 14c supplemental services. |
| `pbp_b15_partb_rx_drugs.txt` | 7,365 | 39 | 7,365 | 1 per plan | UTF-8 clean | 15 Medicare Part B drugs (insulin, chemotherapy, other). |
| `pbp_b16_dental.txt` | 7,365 | 302 | 7,365 | 1 per plan | Windows-1252 bytes | 16 Dental: 16a Medicare-covered, 16b preventive, 16c comprehensive. |
| `pbp_b17_eye_exams_wear.txt` | 7,365 | 137 | 7,365 | 1 per plan | Windows-1252 bytes | 17 Vision: 17a eye exams, 17b eyewear. |
| `pbp_b18_hearing_exams_aids.txt` | 7,365 | 144 | 7,365 | 1 per plan | UTF-8 clean | 18 Hearing: 18a exams, 18b prescription hearing aids, 18c OTC hearing aids. |
| `pbp_b19_model_test.txt` | 7,365 | 15 | 7,365 | 1 per plan | UTF-8 clean | 19 Flags for uniformity flexibility (UF) and special supplemental benefits for the chronically ill (SSBCI). |
| `pbp_b20.txt` | 15 | 199 | 15 | 1 per plan | UTF-8 clean | 20 Prescription drugs for cost plans that do not offer Part D. |

Reduced or additional cost sharing for UF and SSBCI groups, keyed by plan and `pbp_vbid_group_id`:

| File | Rows | Cols | Plans | Grain | Encoding |
|---|---|---|---|---|---|
| `pbp_b1a_b19a_inpat_hosp_vbid_uf.txt` | 18 | 301 | 18 | 1 per plan | UTF-8 clean |
| `pbp_b1a_b19b_inpat_hosp_vbid_uf.txt` | 69 | 155 | 69 | 1 per plan | UTF-8 clean |
| `pbp_b1b_b19a_inpat_hosp_vbid_uf.txt` | 15 | 298 | 15 | 1 per plan | UTF-8 clean |
| `pbp_b1b_b19b_inpat_hosp_vbid_uf.txt` | 69 | 151 | 69 | 1 per plan | UTF-8 clean |
| `pbp_b2_b19a_snf_vbid_uf.txt` | 0 | 204 | 0 | (no rows) | UTF-8 clean |
| `pbp_b2_b19b_snf_vbid_uf.txt` | 69 | 125 | 69 | 1 per plan | UTF-8 clean |
| `pbp_b3_b19b_cardiac_rehab_vbid_uf.txt` | 77 | 69 | 77 | 1 per plan | UTF-8 clean |
| `pbp_b4_b19b_emerg_urgent_vbid_uf.txt` | 77 | 45 | 77 | 1 per plan | UTF-8 clean |
| `pbp_b7_b19b_health_prof_vbid_uf.txt` | 179 | 61 | 102 | plan x `pbp_vbid_group_id` | UTF-8 clean |
| `pbp_b10_b19b_amb_trans_vbid_uf.txt` | 862 | 49 | 756 | plan x `pbp_vbid_group_id` | Windows-1252 bytes |
| `pbp_b13_b19b_other_services_vbid_uf.txt` | 1,873 | 140 | 1,447 | plan x `pbp_vbid_group_id` | UTF-8 clean |
| `pbp_b13i_b19b_services_vbid_ssbci.txt` | 2,213 | 235 | 2,213 | 1 per plan | UTF-8 clean |
| `pbp_b13i_b19b_other_services_vbid_ssbci.txt` | 583 | 110 | 583 | 1 per plan | UTF-8 clean |
| `pbp_b14b_b19b_preventive_vbid_uf.txt` | 77 | 25 | 77 | 1 per plan | UTF-8 clean |
| `pbp_b14c_b19b_preventive_vbid_uf.txt` | 1,033 | 296 | 928 | plan x `pbp_vbid_group_id` | UTF-8 clean |
| `pbp_b16_b19b_dental_vbid_uf.txt` | 205 | 283 | 110 | plan x `pbp_vbid_group_id` | UTF-8 clean |
| `pbp_b17_b19b_eye_exams_wear_vbid_uf.txt` | 249 | 117 | 172 | plan x `pbp_vbid_group_id` | UTF-8 clean |
| `pbp_b18_b19b_hearing_exams_aids_vbid_uf.txt` | 249 | 135 | 172 | plan x `pbp_vbid_group_id` | UTF-8 clean |
| `pbp_b19a_model_test_vbid_uf.txt` | 844 | 848 | 713 | plan x `pbp_vbid_group_id` | UTF-8 clean |
| `pbp_b19b_model_test_vbid_uf.txt` | 4,124 | 52 | 3,024 | plan x `pbp_vbid_group_id` | Windows-1252 bytes |

The 2 `pbp_b13i` files hold non-primarily-health-related SSBCI benefits (food and produce, meals, pest control, non-medical transportation, indoor air quality and others), per the Readme.

### 6.3 Part D

| File | Rows | Cols | Plans | Grain | Encoding | Holds |
|---|---|---|---|---|---|---|
| `pbp_mrx.txt` | 7,971 | 90 | 7,971 | 1 per plan | UTF-8 clean | Part D benefit: deductible, coverage structure. Every Section A plan except the 2 employer direct-contract PDPs. |
| `pbp_mrx_tier.txt` | 27,427 | 140 | 5,288 | plan x `mrx_tier_label_list` | UTF-8 clean | Part D cost sharing by formulary tier. Up to 6 tiers. |
| `pbp_mrx_p.txt` | 27,427 | 20 | 5,288 | plan x `mrx_tier_post_label_list` | UTF-8 clean | Part D cost sharing after the out-of-pocket threshold, by tier. |

### 6.4 Optional supplemental ("step-up") files

Each holds 1 optional supplemental package's version of a B category, keyed by plan and `pbp_d_opt_identifier` (which joins to `pbp_Section_D_opt.txt`).

| File | Rows | Cols | Plans | Grain | Category |
|---|---|---|---|---|---|
| `pbp_step1.txt` | 2 | 214 | 2 | 1 per plan | B1 inpatient |
| `pbp_step1_b.txt` | 0 | 99 | 0 | (no rows) | B1, B-only |
| `pbp_step2.txt` | 3 | 82 | 3 | 1 per plan | B2 SNF |
| `pbp_step2_b.txt` | 0 | 54 | 0 | (no rows) | B2, B-only |
| `pbp_step3.txt` | 0 | 73 | 0 | (no rows) | B3 |
| `pbp_step4.txt` | 14 | 49 | 14 | 1 per plan | B4 |
| `pbp_step7b.txt` | 15 | 43 | 15 | 1 per plan | 7b chiropractic |
| `pbp_step7f.txt` | 0 | 31 | 0 | (no rows) | 7f podiatry |
| `pbp_step10b.txt` | 26 | 52 | 26 | 1 per plan | 10b transportation |
| `pbp_step13.txt` | 28 | 169 | 28 | 1 per plan | B13 |
| `pbp_step14.txt` | 31 | 336 | 31 | 1 per plan | B14 |
| `pbp_step16.txt` | 1,346 | 301 | 956 | plan x `pbp_d_opt_identifier` | 16 dental (Windows-1252 bytes) |
| `pbp_step17a.txt` | 10 | 46 | 7 | plan x `pbp_d_opt_identifier` | 17a eye exams |
| `pbp_step17b.txt` | 495 | 89 | 306 | plan x `pbp_d_opt_identifier` | 17b eyewear |
| `pbp_step18a.txt` | 53 | 45 | 53 | 1 per plan | 18a hearing exams |
| `pbp_step18b.txt` | 113 | 78 | 105 | plan x `pbp_d_opt_identifier` | 18b hearing aids |
| `pbp_step18c.txt` | 0 | 39 | 0 | (no rows) | 18c OTC hearing aids |
| `pbp_step20.txt` | 1 | 184 | 1 | 1 per plan | B20 |

### 6.5 Service area

| File | Rows | Cols | Plans | Grain | Holds |
|---|---|---|---|---|---|
| `PlanArea.txt` | 2,392,399 | 17 | 7,294 | plan x `county_code` x `eghp_flag` | Counties of local MA plans and employer plans: `county_code`, `county`, `stcd`, `contract_year` (2027 on every row), `eghp_flag`, `pending_flag` (0 on every row), `partial_flag` (`*` on 1,174 rows). |
| `PlanRegionArea.txt` | 11,102 | 17 | 681 | plan x `ma_or_pdp_region_code` | Regions of regional MA plans and PDPs: `region_type`, `ma_or_pdp_region_code`, `region`. |

**Question 4, partly answered 2026-10-06.** `PlanArea.eghp_flag` and `partial_flag` are not in the dictionary. What the rows show: every individual plan (`pbp_a_eghp_yn` 2, 5,936 plans) has only `eghp_flag` `0`; employer-only plans have `1` only (264), `0` only (373) or both (721), so `1` appears to mark employer-group service-area rows, which the Readme says the file includes. `partial_flag` `*` is on 1,174 rows (1,030 of them on individual plans) and is blank elsewhere; it reads as a partial-county service area. Neither reading is stated by CMS; the importer quotes both flags verbatim.

## 7. Section D families, by plan type

Section D splits the deductible and the out-of-pocket maximum into families, and which family a plan fills depends on its type. Counted on all 7,365 Section D rows ("filled" means the `_yn` column is not blank):

| Plan type | Plans | Deductible family filled | MOOP filled |
|---|---|---|---|
| 01 HMO | 3,115 | `pbp_d_inn_deduct_*` (in-network) | in-network only |
| 02 HMOPOS | 1,273 | `pbp_d_inn_deduct_*` and, on 1,267, `pbp_d_comb_deduct_*` (combined) and `pbp_d_oon_deduct_*` | in-network; combined on 1,267 |
| 04 Local PPO | 2,411 | `pbp_d_ann_deduct_*` ("annual plan deductible") | in-network and combined |
| 31 Regional PPO | 73 | `pbp_d_ann_deduct_*` | in-network and combined |
| 09 PFFS | 16 | on 14: in-network, combined and out-of-network | on 14: in-network and combined |
| 18 1876 Cost | 42 | on 39: in-network | on 39: in-network |
| 07 MSA, 20 PACE, and 2 PFFS and 3 cost plans | 440 | none | none |

Deductible amounts are not always in the file. `pbp_d_ann_deduct_amt` has a value only when `pbp_d_ann_deduct_amt_type` is `4` ("Other, Indicate amount"; 755 plans); for types 1 to 3 (Medicare-defined Part A, Part B, or A and B combined; 818 plans) it is blank. `pbp_d_inn_deduct_amt` is blank on all 1,273 plans with `pbp_d_inn_deduct_partb_yn` `1` ("charge the Medicare-defined Part B deductible amount") and filled on all 375 with `2`.
