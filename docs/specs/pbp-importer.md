# Spec: CMS Plan Benefit Package (PBP) Benefits to BPS importer

**Status:** Draft, 2026-10-06. Phase 1 (sources, layout, MVP field map, 1 proven parse), phase 2 session 1 (the plan level), session 2 (the MVP benefits, checked line by line against the H2406-013-000 Summary of Benefits) and session 3 (decisions S1, N1, A5, C3 and 5; 5 golden files; the test on committed fixtures; the Summary of Benefits check script; sections 10 to 13) and session 4 (decision 4 confirmed on the Aetna H1609-028 Summary of Benefits; the converter maps the `POS` tier; the 5 golden files converted to FHIR; a second Summary of Benefits check) are done. Confirmed readings and readings still to confirm: end of section 7.
**Reads with:** [`pbp-record-layout-notes.md`](pbp-record-layout-notes.md) (every PBP file, its key and grain), [`marketplace-puf-importer.md`](marketplace-puf-importer.md) (the pattern this importer follows), [`../medicare-advantage-notes.md`](../medicare-advantage-notes.md) (gaps G1 to G14), [`../../fhir/pbp-crosswalk.json`](../../fhir/pbp-crosswalk.json) (the benefit-to-column mapping)

This spec defines the second importer for the Benefit Plan Standard (BPS): the CMS Medicare Advantage PBP Benefits files in, one BPS document per plan out. It follows the Marketplace importer's pattern: 1 direction, 1 plan in and 1 document out, nothing invented, nothing dropped silently, the mapping in a data file, deterministic output, golden files and a test. Sections marked **Not yet** are headings kept for later work.

---

## 1. Scope

- One direction: PBP files to BPS JSON. The importer never writes FHIR.
- One plan in, one BPS v1.2.0 document out. A plan is 1 PBP key: contract (`pbp_a_hnumber`), plan (`pbp_a_plan_identifier`) and segment (`segment_id`), written `H2406-013-000` (section 4.1).
- Medicare Advantage plan types only for the MVP: 01 HMO, 02 HMOPOS, 04 Local PPO, 31 Regional PPO. Part D-only plans (29, 30), PACE (20), MSA (07), PFFS (09) and cost plans (18) are refused until someone asks for them; the B files hold no cost shares for PACE, MSA and 3 cost plans anyway (layout notes, section 2).
- Benefits: the workgroup MVP, 30 rows in `fhir/pbp-crosswalk.json` (section 5.2). Other service categories are not imported yet (section 8).
- The importer never adds a value the files do not contain. In particular it does not fill in Medicare-defined amounts (the Part A or Part B deductible, the Medicare-defined inpatient cost share) that the files name but do not state (section 7).
- Nothing is dropped silently: a value with no BPS field goes to `source_references` (plan or benefit level) or to a tier or step `notes`, as in the Marketplace importer.
- The schema is not changed. Section 9 lists the gaps. The only vocabulary change is `HMO_POS` in `vocabularies/plan-types.json` (decision 3, section 4.1).

**Schema version: v1.2.0** (decided 2026-10-06). The output is checked against `schema/v1.2.0/benefit-plan.schema.json`, the draft in the repo, not v1.1.0 as the Marketplace importer uses. Why: the PBP data needs fields that only v1.2.0 has, and v1.1.0 would push them into free text:

| PBP content | v1.2.0 field | v1.1.0 |
|---|---|---|
| Contract, plan and segment | `plan_identifiers` | no identifier field |
| Service area counties | `service_area` | none |
| Copay and coinsurance ranges (minimum and maximum columns; 1,226 MVP plans for specialists) | `amount_min`/`amount_max`, `rate_min`/`rate_max` | `notes` only |
| Inpatient day intervals (days 1 to 5, 6 to 90) | `unit_range` | `notes` only |
| Hearing aid limits per ear or for both ears | `limits[].scope` | none |
| A hearing aid maximum shared with routine hearing exams | `limits[].shared_limit_id` | none |
| Emergency and urgent care "maximum per visit amount" | `max_amount`, `max_basis` | none |
| Mandatory or optional supplemental benefits | `coverage_basis` | none |
| Values with no field, bound to the benefit they belong to | `benefits[].source_references` | plan level only |
| Hospital cost-sharing tiers inside the network | `tier_class` `cost_designation`, `parent_tier_id` | none |

## 2. Sources

| Item | Value |
|---|---|
| Index page (all years) | https://www.cms.gov/data-research/statistics-trends-and-reports/medicare-advantagepart-d-contract-and-enrollment-data/benefits-data |
| CY 2027 page | https://www.cms.gov/data-research/statistics-trends-and-reports/medicare-advantagepart-d-contract-and-enrollment-data/benefits-data/pbp-benefits-2027 |
| CY 2027 zip | https://www.cms.gov/files/zip/pbp-benefits-2027.zip |
| Release label | "PBP Benefits-2027", Report Period 2027. No quarter on the page. Zip `Last-Modified` Thu, 01 Oct 2026 17:45:40 GMT. |
| Layout | `PBP_Benefits_2027_dictionary.xlsx` and `Readme_PBP_Benefits_2027.txt`, inside the zip |
| Check documents | 2027 Summary of Benefits for H2406-013-000, `data/pbp/2027/sob/H2406-013-000-2027-SB.pdf`, 14 pages, document ID `Y0066_SB_H2406_013_000_2027_M`; 2027 Summary of Benefits for H1609-028-000 (Aetna), `data/pbp/2027/sob/H1609-028-000-2027-SB.pdf`, 14 pages, document ID `Y0001_H1609_028_HP32_SB2027_M` (both read with `pdftotext -layout` and `-raw`; section 13) |

The index page also lists CY 2026 (`pbp-benefits-2026`), CY 2026 JSON (`pbp-benefits-2026-json`, `pbp-benefits-2026-json-0`) and CY 2025 JSON pages. No 2027 JSON release is listed. This draft reads the tab-delimited text files only.

## 3. Files, inputs and outputs

- **Where the files go.** `data/pbp/<year>/`, unzipped next to the zip. `data/` is in `.gitignore`.
- **Download record.** `data/pbp/2027/download.json`: `downloaded` (2026-10-06), `source_page`, `index_page`, `release_label`, `report_period`, `quarter` (null, see layout notes Question 1), `urls`, `zip_last_modified`, `zip_bytes`, and `sha256` of the zip and each of the 144 files in it.
- **Reading.** Tab-delimited, CRLF, header row, no quoting, read as Windows-1252 (layout notes, section 2). The files are streamed; each chunk decodes on its own because Windows-1252 is 1 byte per character. A record whose field count differs from the header, or a CR or LF inside a record, is an error. Columns are matched by lowercased name; a repeated name must hold the same value in both places or it is an error. File names are matched case-insensitively. No npm dependency is added.
- **Files read.** `pbp_Section_A`, `pbp_Section_C`, `pbp_Section_C_OON` and `pbp_Section_C_POS` (the plan's groups), `pbp_Section_D`, the B files named in the crosswalk and the hospital tier files (`pbp_b1a_inpat_hosp`, `pbp_b1b_inpat_hosp`, `pbp_b2_snf`, `pbp_b4_emerg_urgent`, `pbp_b7_health_prof`, `pbp_b8_clin_diag_ther`, `pbp_b9_outpat_hosp`, `pbp_b10_amb_trans`, `pbp_b13_other_services`, `pbp_b17_eye_exams_wear`, `pbp_b18_hearing_exams_aids`), `PlanArea`, `PlanRegionArea`. One plan takes about 5 seconds, most of it the 172 MB `PlanArea.txt`.
- **Rows.** For each file, the rows whose `pbp_a_hnumber` and `pbp_a_plan_identifier` equal the key and whose `segment_id`, read as a number, equals the key's segment. More than 1 row in a 1-per-plan file is an error; no row in `pbp_Section_A` is an error. The out-of-network and point-of-service group files have 1 row per group.
- **Output.** 1 BPS v1.2.0 document, checked against the v1.2.0 schema with the same local Ajv setup as the Marketplace importer before it is written. A document that fails is not written. `buildDocument` also returns warnings (conditions that do not stop the import); the CLI prints them to stderr. Golden files: `examples/<slug>.pbp.json` (section 13).
- **Fixtures.** `test/fixtures/pbp/2027/`: the header and the golden plans' records of each of the 18 files read, cut byte for byte from the full files by `--write-fixtures`, with a `download.json` that keeps the release label and download date. Committed, 135 KB; `data/` is git-ignored, so they cannot live there. `.gitattributes` marks them `-text`, because the reader requires CRLF and the repository default is `eol=lf`.

## 4. Plan-level mapping

Built by `scripts/from-pbp.js`. Checked on 2026-10-06 over every MVP plan in the CY 2027 files: all 6,872 HMO, HMOPOS, local PPO and regional PPO plans build with 0 errors and pass the v1.2.0 schema; 117 warnings, all of 1 kind (section 13).

### 4.1 Plan fields

| BPS | PBP file : column | Rule |
|---|---|---|
| `plan_id` | `pbp_Section_A` : `pbp_a_plan_name` and the key | The plan name uppercased, each run of other characters changed to `_`, then `_` and the key with `-` changed to `_`; the name is cut back at `_` until the whole is at most 64 characters. Example: `AARP_MEDICARE_ADVANTAGE_FROM_UHC_FL_0021_PPO_H2406_013_000`. Unique, because the key is. |
| `plan_identifiers[]` | `pbp_a_hnumber`, `pbp_a_plan_identifier`, `segment_id` | `cms_contract_plan_segment` `H2406-013-000`, `cms_contract_id` `H2406`, `cms_pbp_id` `013`. No `source`: the file itself carries the values. |
| `plan_name` | `pbp_a_plan_name` | Verbatim, trimmed. |
| `carrier` | `pbp_a_org_marketing_name` | Verbatim, trimmed. `pbp_a_org_name` (legal name) to `source_references`. Question P1 (marketing or legal name) stays open; marketing name until answered. |
| `plan_type` | `pbp_a_plan_type` | 01 `HMO`; 04 and 31 `PPO`; 02 `HMO_POS` (**decision 3**, 2026-10-06: `HMO_POS` added to `vocabularies/plan-types.json`, changelog "added for the PBP importer"; 1,273 plans). The code and label go to `source_references`. Any other plan type is refused. |
| `plan_year` | `PlanArea` or `PlanRegionArea` : `contract_year` | The plan's rows must carry exactly 1 value and it must equal `--year`. Section A has no year column. |
| `market` | (none) | `medicare_advantage`. |
| `service_area.state` | `PlanArea` : `stcd` | The state when all the plan's counties are in 1 state; else `null`, and `source_references` lists each county's state (226 individual plans and 771 employer plans span more than 1 state). |
| `service_area.counties[]` | `PlanArea` : `county`, `county_code` | 1 entry per distinct `county_code`, in code order: `name` from `county` verbatim, `fips` `null` (`county_code` is the SSA code, not FIPS; section 4.5). The SSA code, `partial_flag` and `eghp_flag` of each county go to `source_references`. |
| (no field) | `PlanRegionArea` | Regional PPOs (73) have regions, not counties: `service_area` is not written and the regions go to `source_references`. |
| `effective_date`, `expiry_date` | (none) | Not written; no date column in any file. |

**The plan key.** Contract is 5 characters, plan 3 (zero-padded in the file), segment 3, zero-padded from the file's unpadded value (`"0"` becomes `000`). `--plan` takes `H2406-013-000`; `--contract H2406` lists the contract's plans.

**Join to HETS.** The HETS 271 returns the contract number and the 3-digit plan number but no segment. The contract and plan join to `pbp_a_hnumber` and `pbp_a_plan_identifier` directly. 266 contract-and-plan pairs have more than 1 segment; for all 266 the segments' county sets in `PlanArea.txt` do not overlap, so the member's county picks the segment. A caller that holds the member's county as a FIPS code needs an SSA crosswalk first (section 4.5).

### 4.2 Network tiers

| `tier_id` | Source | Written when |
|---|---|---|
| `IN` | The Section B files, which carry no network qualifier; the Readme describes `pbp_Section_C.txt` as the out-of-network data. `tier_class` `network`. Question T1: confirmed for H2406-013 (every in-network value on its Summary of Benefits is the B-file value, section 13). | Always. |
| `OUT` | `pbp_Section_C` : `pbp_c_oon_yn`. `tier_class` `network`. | `pbp_c_oon_yn` is `1` (2,484 MVP plans: every local and regional PPO). The importer checks that the plan has `pbp_Section_C_OON` rows exactly when the flag is `1`. |
| `POS` | `pbp_Section_C` : `pbp_c_pos_yn`. `tier_class` `network`. | `pbp_c_pos_yn` is `1` (1,273 plans: every HMOPOS). Checked against `pbp_Section_C_POS` rows the same way. |
| `IN_1A_TIER_<n>`, `IN_1B_TIER_<n>`, `IN_2_TIER_<n>` | `pbp_b1a`, `pbp_b1b`, `pbp_b2` : `<p>_cost_vary_tiers_yn`, `<p>_cost_vary_tier_num`, `<p>_cost_vary_low_tier`, `<p>_ad_cost_vary_tiers_yn`, `<p>_ad_cost_vary_tier_num`. `tier_class` `cost_designation`, `parent_tier_id` `IN`. | The stay flag or the additional-days flag is `1` (89 plans have at least 1 such category). 1 tier per tier number. The description quotes the 5 cells and marks the lowest-cost tier; the files do not name the facilities in a tier, so `provider_set` is not written. Tiers are per service category, because nothing says tier 1 for 1a and tier 1 for 2 are the same facilities. The inpatient benefit writes 1 row per `IN_1A_TIER_<n>` instead of an `IN` row (section 5.5). |

HMO plans have neither `OUT` nor `POS`. No plan in the CY 2027 files declares both.

### 4.3 Accumulators

Section D has no family amounts, so no family slot is written. A written slot has `amount`, `currency` `USD`, `network_tier` (`IN`, `OUT`, `POS` or `null`; decision N1, 7.9) and `applies_to` `medical`; `period` is not written (the files do not say plan year or calendar year). A deductible family whose `_yn` is `2` ("No") writes no slot, and a `source_references` entry quotes it; no `$0` is written for "No" (**decision 2**, 2026-10-06; Question A4 closed).

| BPS slot | Plan types | PBP columns | Rule |
|---|---|---|---|
| `individual_deductible`, `network_tier` `IN` | 01, 02 | `pbp_d_inn_deduct_yn`, `pbp_d_inn_deduct_partb_yn`, `pbp_d_inn_deduct_amt` | `yn` 1 and `partb_yn` 2 with an amount: written. `partb_yn` 1 (Medicare-defined Part B deductible, no amount in the file): no slot; `source_references` (gap 9.1). |
| `individual_deductible` (`IN` or `null`) or `oon_individual_deductible` (`OUT`) | 04, 31 | `pbp_d_ann_deduct_yn`, `_amt_type`, `_amt`, `_bens`, `_inn_mc_yn`, `_inn_nmc_yn`, `_oon_nmc_yn`, `_14a_yn`; `pbp_Section_C` : `pbp_c_oon_yn`, `pbp_c_oon_mc_bendesc_cats` | Type 4 with an amount. In-network scope only (`_bens` position 2 or 3, not 1): `individual_deductible`, `IN` (859 plans). No in-network scope (`_bens` blank or `100`, neither `_inn_*_yn` is 1) on a plan with an `OUT` tier: `oon_individual_deductible`, `network_tier` `OUT`, the scope list quoted (**decision 1**, section 7.3; 218 plans: 181 blank, 37 `100`, the latter kept on `OUT` by **decision C3**). Scope naming in-network and out-of-network services (`110`, `111`, `011`): `individual_deductible`, `network_tier` `null`, the 7 cells quoted (48 plans). Types 1 to 3 (Medicare-defined, no amount): no slot; `source_references` (gap 9.1). |
| `oon_individual_deductible`, `network_tier` `POS` | 02 | `pbp_d_oon_deduct_yn`, `_partb_yn`, `_amt` (and `_bens`, `_m_yn`, `_m_cats`, `_nm_yn`, `_nm_cats` quoted) | As the in-network family; written to the POS tier with a note quoting the columns (**decision 4**, section 7.8; 32 plans). |
| (no slot) | 02 | `pbp_d_comb_deduct_yn`, `_partb_yn`, `_amt` | `source_references` (gap 9.1). |
| `individual_oop_max`, `network_tier` `IN` | all | `pbp_d_out_pocket_amt_yn`, `pbp_d_out_pocket_amt` | `yn` 1: written (6,872 plans). The type (`pbp_d_out_pocket_amt_type`: 1 Lower, 2 Mandatory, 3 Intermediate) goes to `source_references` (gap 9.1). |
| (no slot) | 02, 04, 31 | `pbp_d_comb_max_enr_amt_yn`, `_amt`, `_amt_type` | `source_references` (gap 9.1). The Summary of Benefits prints this amount in its out-of-network column (section 13). |
| `oon_individual_oop_max` | 04, 31: `OUT`; 02: `POS` | `pbp_d_oon_max_enr_oopc_yn`, `_amt` | `yn` 1: written (111 PPO plans `OUT`, 63 HMO-POS plans `POS` with a note, decision 4). |

A PPO with the in-network, out-of-network or combined deductible family filled, or an HMO or HMOPOS with the annual family filled, is an error; none occurs in the CY 2027 files. Every non-blank cell of the deductible and out-of-pocket families, including the differential and service-category deductible amounts (`pbp_d_diff_deduct_*`, `pbp_d_mand_deduct_*`, `pbp_d_deduct_*`), is also quoted verbatim in 1 `source_references` entry.

**HMO-POS and the out-of-network families.** No HMOPOS plan declares an out-of-network benefit (`pbp_c_oon_yn` is blank on all 1,273; all declare POS), yet 115 answer `pbp_d_oon_deduct_yn` with 1, 148 have a combined out-of-pocket maximum and 63 an out-of-network maximum. Decision 4 reads the out-of-network columns as the POS option's. Section C has its own POS columns, `pbp_c_pos_ded_yn`/`_amt` and `pbp_c_pos_maxenr_oopc_yn`/`_amt`, which the importer quotes in `source_references` for every HMO-POS plan. Compared on the 1,273 plans: both deductible answers Yes with the same amount on 31 (H1609-028: $500 in both); Section D Yes with the Medicare-defined Part B deductible and Section C No on 83; Section D No and Section C Yes on 11 ($500 on 6, $200 on 5); Section D Yes ($250) and Section C No on 1; both No on 1,141; Section D blank on 6. `pbp_c_pos_maxenr_oopc_yn` is blank on all 63 plans with an out-of-network maximum. Where they disagree (12 plans, listed in section 7), Section D is written and Section C is quoted with a note that they disagree (decision A5).

### 4.4 Source references

Every entry is an `excerpt`, in this order:

1. **Source.** Release, zip URL, download date, the files read, and the key as the file writes it (`segment_id "0"`).
2. **Plan type.** The code, its dictionary label and what was written.
3. **Section A values with no BPS field,** each as `column "value"`, blanks skipped: `bid_id`, `version`, `orgtype`, `pbp_a_org_name`, `pbp_a_org_type`, `pbp_a_ben_cov`, `pbp_a_network_flag`, `pbp_a_plan_geog_name`, `pbp_a_segment_name`, `pbp_a_eghp_yn`, `pbp_a_special_need_flag`, `pbp_a_special_need_plan_type`, `pbp_a_snp_institutional_type`, `pbp_a_snp_cond`, `pbp_a_snp_pct`, `pbp_a_dsnp_zerodollar`, `pbp_a_snp_state_cvg_yn`, `pbp_a_contract_partd_flag`, `pbp_a_hospice_care_yn`, `pbp_a_continue_yn`, and the 4 web addresses.
4. **Service area.** Each county's SSA code, name, state, `partial_flag` and `eghp_flag`; a note when the counties span more than 1 state; regions for regional plans.
5. **Accumulator readings,** 1 entry each: the deductible reading (decision 1 or the `null` note), "No" answers, Medicare-defined deductibles, the combined deductible, the maximum's type, the combined maximum, the decision 4 notes, and the Section C POS deductible and maximum on HMO-POS plans.
6. **Every non-blank deductible and out-of-pocket cell** of Section D, verbatim, in file order.
7. **Benefits.** How many crosswalk rows were written, and that other categories are not imported yet.

Each benefit has its own `source_references` (v1.2.0): the PBP category, file and crosswalk; "no canonical key, carried by name" when that applies; the crosswalk's `quote` columns that are not blank; and the coverage-basis note for `4 Both`.

### 4.5 County codes

`PlanArea.county_code` is the **SSA state and county code**, not FIPS. Checked on 2026-10-06 against 2 lists:

- SSA: the CMS SSA-to-FIPS state and county crosswalk as republished by NBER, https://data.nber.org/ssa-fips-state-county-crosswalk/2018/ssa_fips_state_county2018.csv (2018, the latest NBER copy).
- FIPS: Census Bureau 2020 county codes, https://www2.census.gov/geo/docs/reference/codes2020/national_county2020.txt.

| County, FL | `PlanArea.county_code` | SSA code (crosswalk) | FIPS (Census) |
|---|---|---|---|
| Duval | 10150 | 10150 | 12031 |
| St. Johns | 10540 | 10540 | 12109 |
| Clay | 10090 | 10090 | 12019 |
| Nassau | 10440 | 10440 | 12089 |
| Miami-Dade | 10120 | 10120 | 12086 |
| Hillsborough | 10280 | 10280 | 12057 |
| Monroe | 10430 | 10430 | 12087 |

Across the whole file: `PlanArea.txt` has 3,262 distinct `county_code` values, each with 1 name and state. 3,219 are in the 2018 SSA list, and 3,189 of those carry the same county name and state there; the other 30 differ in spelling or by a later rename (for example `02270` "Kusilvak", SSA 2018 "WADE HAMPTON"; `09000` "District of Columbia", SSA "THE DISTRICT"). The 43 codes missing from the 2018 list are newer Alaska census areas (`02063` Chugach, `02066` Copper River), Kalawao in Hawaii, the Virgin Islands and Guam villages. Only 36 of the 3,262 codes are also FIPS codes, and the 28 of those that name the same county are Alaska boroughs, where the SSA and FIPS codes coincide.

So `service_area.counties[].fips` is `null`. Filling it needs a recorded SSA-to-FIPS crosswalk as a second source; that is not done here.

## 5. Benefit mapping

### 5.1 Which rows are read

The plan's row in each B file the crosswalk names (exactly 1 row per plan; 0 rows is an error for a benefit that needs it), its `pbp_Section_C` row, and all its `pbp_Section_C_OON` and `pbp_Section_C_POS` group rows. UF and SSBCI group files (`*_vbid_*`, keyed also by `pbp_vbid_group_id`) and optional supplemental step files (keyed also by `pbp_d_opt_identifier`) are not read for the MVP.

### 5.2 Crosswalk

`fhir/pbp-crosswalk.json` has 1 row per BPS benefit the importer writes, 30 rows: `benefit_id`, `service_name`, `pbp_code` (the category code as the file writes it in category lists: `7a`, `7f_2`, `18b1`), `pbp_label` (the dictionary's label, written as `raw_label`), `medicare_covered`, `file`, `canonical_key` (a key in `vocabularies/canonical-benefits.json` or `null`), `category`, `benefit_type`, and the columns read: `copay`, `coins`, `service_deductible`, `offered` and `amo` for supplemental benefits, `limits`, `auth`, `refer`, `quote` (columns with no field, quoted verbatim), and a one-line `note` where the decision is not obvious. Column names differ between categories (`pbp_b7a_copay_amt_mc_min`, `pbp_b7b_copay_mc_amt_min`, `pbp_b18a_copay_amt`), so every column is named; none is built from a pattern. Every named column was checked against the file headers on 2026-10-06.

The rule is the CARIN crosswalk's: a category maps only when it clearly is the canonical service; there is no nearest fit. **19 rows have a canonical key, 11 do not.** The 11 are still written, carried by `service_name` and `raw_label`, and listed in section 9.1.

| `benefit_id` | PBP category | `canonical_key` | Note |
|---|---|---|---|
| `PRIMARY_CARE` | 7a Primary Care Physician Services | `primary_care` | |
| `SPECIALIST` | 7d Physician Specialist Services | `specialist` | |
| `INPATIENT_HOSPITAL` | 1a Inpatient Hospital-Acute | `inpatient_hospital` | Custom reader (5.5). |
| `OUTPATIENT_HOSPITAL` | 9a1 Outpatient Hospital Services | `outpatient_surgery` | The vocabulary lists "outpatient hospital services" as an alias of `outpatient_surgery`. |
| `OBSERVATION` | 9a2 Observation Services | `observation_care` | |
| `AMBULATORY_SURGICAL_CENTER` | 9b Ambulatory Surgical Center (ASC) Services | `outpatient_surgery_facility` | As the Marketplace crosswalk maps the ASC facility fee. |
| `EMERGENCY` | 4a Emergency Services | `emergency_room` | |
| `URGENT_CARE` | 4b Urgently Needed Services | `urgent_care` | |
| `AMBULANCE_GROUND`, `AMBULANCE_AIR` | 10a1, 10a2 | `ambulance` (both) | |
| `DIAGNOSTIC_TESTS` | 8a1 Diagnostic Procedures/Tests | `diagnostic_test` | |
| `LAB_SERVICES` | 8a2 Lab Services | `diagnostic_lab` | |
| `DIAGNOSTIC_RADIOLOGY` | 8b1 Diagnostic Radiological Services | `imaging_advanced` | The dictionary says "(e.g., CT, MRI, etc.)"; as the Marketplace crosswalk maps "Imaging (CT/PET Scans, MRIs)". |
| `THERAPEUTIC_RADIOLOGY` | 8b2 Therapeutic Radiological Services | `radiation_therapy` | |
| `XRAY` | 8b3 Outpatient X-Ray Services | `imaging_standard` | |
| `PHYSICAL_AND_SPEECH_THERAPY` | 7i Physical Therapy and Speech-Language Pathology Services | `null` | Combines `physical_therapy` and `speech_therapy` (the Marketplace crosswalk leaves the combined OT and PT row unmapped). |
| `OCCUPATIONAL_THERAPY` | 7c Occupational Therapy Services | `occupational_therapy` | |
| `CHIROPRACTIC`, `CHIROPRACTIC_ROUTINE` | 7b Medicare-covered; 7b1 Routine Chiropractic Care | `chiropractic_care` (both) | `coverage_basis` tells them apart. |
| `PODIATRY`, `PODIATRY_ROUTINE` | 7f Medicare-covered; 7f_2 Routine Foot Care | `null` | No podiatry key. |
| `ACUPUNCTURE` | 13a Acupuncture Treatments (supplemental) | `acupuncture` | |
| `HEARING_EXAM`, `HEARING_EXAM_ROUTINE` | 18a Medicare-covered; 18a1 Routine Hearing Exams | `null` | No hearing exam key. |
| `EYE_EXAM`, `EYE_EXAM_ROUTINE` | 17a Medicare-covered; 17a1 Routine Eye Exams | `null` | Only `pediatric_eye_exam` exists. |
| `HEARING_AIDS` | 18b1 Prescription Hearing Aids (all types) | `null` | No hearing aid key. |
| `HEARING_AIDS_INNER_EAR`, `_OUTER_EAR`, `_OVER_THE_EAR` | 18b2, 18b3, 18b4 | `null` | Written only when the plan chooses that aid type (2 plans). |

Cardiac and pulmonary rehabilitation (3-1 to 3-4) carry visit limits only on their supplemental "additional services" and are not in this first set (section 8).

### 5.3 Benefit fields

One BPS benefit per crosswalk row, in crosswalk order, except a supplemental row the plan does not offer and whose `offered.when_not_chosen` is `skip` (5.4).

| BPS | Rule |
|---|---|
| `benefit_id`, `benefit_type`, `category`, `service_name`, `canonical_key` | From the crosswalk. `canonical_key` is omitted when `null`. `benefit_type` `medical`, `hearing` (18a, 18b) or `vision` (17a). |
| `coverage_basis` | `medicare_covered` for a Medicare-covered category. For a supplemental one, the `amo` column: 2 Mandatory `supplemental_mandatory`, 3 Optional `supplemental_optional`, 4 Both `null` with a benefit `source_references` entry (question H1; 30 hearing aid rows). `null` on a supplemental benefit the plan does not offer. |
| `raw_label` | The dictionary's category label, for example `7d: Physician Specialist Services`. |
| `network_cost_shares` | 5.4 and 5.5. |
| `limits` | 5.6. Always present, possibly empty. |
| `conditions` | `auth` column 1: `{type: authorization, description: "Authorization required (pbp_b7d_auth_yn \"1\")."}`; `refer` column 1: the same with `referral`. 2 or blank: nothing. Always present, possibly empty. |
| `source_references` | 4.4. |

### 5.4 Tier rows and `covered`

- **Medicare-covered category: covered** (question D1, answered here: Medicare Advantage plans must cover these). The `IN` row has `covered: true` and the steps of 5.5. When the copay and coinsurance answers are both "No" the row has a $0 copay step whose note quotes both answers (decision S1, 7.12): primary care on 1,876 plans, inpatient on 111. When both answers are blank the benefit is not written, the warning `medicare-covered-cost-share-blank` is raised and a plan `source_references` entry names the category and quotes `pbp_a_ben_cov`: inpatient on the 117 Part B-only plans (`pbp_a_ben_cov` "2"), whose Part A categories the file leaves blank.
- **Supplemental category.** `offered.yn` (`<p>_bendesc_yn`) 1 and position `offered.position` of `offered.ehc` chosen: covered, as above. `offered.yn` 2, or 1 with the position not chosen: `covered: false` on every network-class tier (`IN`, `OUT`, `POS`), empty `cost_shares`, `notes` quoting the cells (the Marketplace importer's not-covered row). For the 3 per-type hearing aid rows a type not chosen writes nothing; for `HEARING_AIDS` (all types) "not chosen" writes nothing when the plan offers hearing aids by type, and `covered: false` when `pbp_b18b_bendesc_yn` is 2 (1,720 plans). Blank `offered.yn` writes nothing and raises the warning `supplemental-offer-blank` (0 in CY 2027).
- **Every tier row** has `notes` quoting the cells it was read from, for example `pbp_b7_health_prof.txt cells: pbp_b7d_copay_yn "1", pbp_b7d_copay_amt_mc_min "0.00", pbp_b7d_copay_amt_mc_max "65.00", pbp_b7d_coins_yn "2", pbp_b7d_ded_yn "2".`
- **`OUT` and `POS`** come from the plan's groups (5.8), and for inpatient from `pbp_Section_C` (5.5). A category no group lists gets no `OUT` or `POS` row: emergency and urgent care are in no out-of-network list on any plan, so they have an `IN` row only. A category the plan-level list `pbp_c_oon_mc_bendesc_cats` names but no group lists would raise the warning `oon-category-without-group` (0 in CY 2027).
- **Hospital cost tiers.** When `pbp_b1a_cost_vary_tiers_yn` or `pbp_b1a_ad_cost_vary_tiers_yn` is 1, the inpatient benefit has 1 row per `IN_1A_TIER_<n>` read from the `_t<n>` columns, and no `IN` row.

### 5.5 Cost-share steps

The B files use 1 pattern per service; the crosswalk names each column.

| Column | Dictionary | BPS |
|---|---|---|
| `copay.yn` | "Is there a copayment?" 1 Yes, 2 No, 3 Yes with a min & max | 1 or 3: a `copay` step; 2 or blank: none; any other value is an error |
| `copay.ehc`, `copay.position` | "Which ... Services have a Copayment", a position string | When the category shares 1 `yn` column between services (8a, 8b, 9a, 10a, 7b, 7f, 17a, 18a, 18b by type), the step is written only when the service's position is 1 |
| `copay.min`, `copay.max` | Minimum, maximum copayment (NUM, 2 decimals) | equal: `amount`; different: `amount_min`, `amount_max`; minimum above maximum, or 1 blank, is an error |
| `coins.*` | The same for coinsurance (whole percent) | equal: `rate` = pct / 100; different: `rate_min`, `rate_max` |
| `basis` | | Written only where the dictionary title states it: `per_visit` (9a1, 7b, 7f), `per_aid` (18b), `per_day` or `per_stay` from `pbp_b9a_copay_obs_per` (observation; 3 Other quotes the description in the step `notes`) |
| `coins.max_amount` | `pbp_b4a_max_visit`, `pbp_b4b_max_visit` "Maximum per visit amount" | `max_amount`, `max_basis` `per_visit` on the coinsurance step (1,603 emergency, 1,886 urgent care rows) |
| `waiver` | "Is the copayment waived if admitted to hospital?", days or hours, number | Step `notes`: `Waived if admitted to the hospital within 24 hours (pbp_b4a_copay_wavdia_yn "1", ...)` |
| `service_deductible` | `<p>_ded_yn`, `<p>_ded_amt` "Is there a deductible?" | A step of `type` `deductible` with `amount`, first in sequence, `notes` saying it is separate from the plan deductible (gap 9.1 answered: the schema's `deductible` step type holds it; 101 steps over the file) |

Steps are numbered from 1: service deductible, copay, coinsurance (inpatient: per-stay then intervals, copay before coinsurance).

**Ranges.** Different minimum and maximum columns are common: specialist on 1,226 of 4,204 plans with a 7d copay, urgent care on 1,610 of 4,680, outpatient hospital, ASC and diagnostic radiology on several thousand. **Reading (question C1, answered for H2406-013):** the minimum and maximum are the lowest and highest cost share among the services the category covers. The file shows it where the Summary of Benefits splits a row: 9a1 `$0`-`$550` is "$0 copay for a colonoscopy, $550 copay otherwise", 9b `$0`-`$500` the same, 8b1 `$0`-`$320` is "$0 copay for each diagnostic mammogram, $320 copay otherwise", while every row with 1 price has minimum equal to maximum (7a, 7c, 7i, 9a2, 4a). Where the Summary of Benefits prints 1 value against a file range (specialist `$0`-`$65` against $65, urgent care `$0`-`$50` against $50, mental health individual sessions `$0`-`$25` against $25), its $0 is on another row: "Virtual medical visits $0 copay" and "Virtual mental health visits $0 copay", priced inside the Medicare-covered category (`pbp_b7j_bendesc_yn` "2": no supplemental telehealth benefit). Over the file, 1,104 of the 1,226 specialist ranges and 1,585 of the 1,610 urgent care ranges start at $0, and the 7j answer does not separate them (644 Yes, 582 No among the specialist ranges). The file never says which service carries the minimum, so the importer writes the range as the file states it and never 1 end of it (gap 9.1: an unlabeled range).

**Inpatient (1a), per tier `t`.** Copay: `pbp_b1a_copay_yn`; `pbp_b1a_mc_copay_cstshr_yn_t<t>` 1 means the Medicare-defined cost share, which the file does not state: no step, tier `notes` (gap 9.1). Otherwise `pbp_b1a_copay_mcs_amt_t<t>` ("Copayment for Medicare-covered stay") is a `per_stay` step when there are no intervals or it is not 0, and `pbp_b1a_copay_mcs_int_num_t<t>` (1 Zero, 2 One, 3 Two, 4 Three intervals) gives 1 `per_day` step per interval with `unit_range` `{from, to}` from `_bgnd_int<n>_t<t>` and `_endd_int<n>_t<t>`. A $0.00 per-stay amount beside intervals is quoted in the tier `notes` only (4,007 MVP plans; question C2 answered: it is the per-stay amount, and `pbp_b1a_hosp_ben_period` says whether the intervals restart per admission, quoted). Coinsurance: the same with `coins`. Additional days (1a1, supplemental), when `pbp_b1a_bendesc_ad_up_nmcs` position 2 is 1: further `per_day` steps from `_ad_` intervals, with a step note quoting the type (Mandatory or Optional) and `pbp_b1a_bendesc_lim_ad`; the file writes an unlimited span as end day `999` (H2406-013: days 91 to 999), written as is. Additional days chosen with the interval count `1` (Zero intervals) give no day range and no amount, so no step is written and the cell is quoted in the tier `notes` (H1609-028, whose Summary of Benefits prints "$0 for additional days"; section 13). Service deductible: `pbp_b1a_ded_yn` with `pbp_b1a_ded_amt_t<t>`; on the 39 plans that answer Yes with no amount, the stay is charged the Medicare-defined cost share, and the tier `notes` say so (no step). `OUT` and `POS`: `pbp_c_oon_*` and `pbp_c_pos_*` inpatient columns of Section C (coinsurance, copay, intervals, Medicare-defined flags, the inpatient deductible), when 1a is in `pbp_c_oon_mc_bendesc_cats` or `pbp_c_pos_mc_bendesc_subcats`.

**`applies_to_deductible`** (decision: written where the file states it, omitted otherwise):

| Tier | Plans | Rule |
|---|---|---|
| `IN` and hospital tiers | 04, 31 | Annual deductible: Medicare-covered categories true when `_bens` position 2 is 1 and (`_inn_mc_yn` 1 or the code is in `_inn_mc_cats`), else false; non-Medicare-covered the same with position 3, `_inn_nmc_*`. `pbp_d_ann_deduct_yn` 2: false. A blank `_bens` with a Medicare-defined type (1 to 3; 581 plans): not written on any tier, because decision 1's reading is verified for type 4 only. |
| `OUT` | 04, 31 | Non-Medicare-covered: position 1 with `_oon_nmc_*`, else false. Medicare-covered: under decision 1, true when the code is in `pbp_c_oon_mc_bendesc_cats` (less 14a when `pbp_d_ann_deduct_14a_yn` is 2), else false; otherwise not written. |
| `IN` | 01, 02 | In-network family: position 2 with `_m_yn`/`_m_cats`, position 1 with `_nm_yn`/`_nm_cats`; `yn` 2 false. Combined with the combined family when `pbp_d_comb_deduct_yn` is 1 (true if either says true). |
| `POS` | 02 | Out-of-network family (decision 4), the same way, with the combined family's out-of-network side. |

When a true flag refers to a deductible with no slot (Medicare-defined Part B deductible, annual types 1 to 3, the combined deductible, or the `null` annual slot), the tier `notes` say which. Over the file: 38,064 true on `IN`, 4,589 on `OUT`, 2,184 on `POS`, 11 on hospital tiers. `pbp_b4a_deduct_yn` and `pbp_b4b_deduct_yn` ask whether the cost sharing "count[s] towards any plan-level deductible", which is not `applies_to_deductible`; they are quoted (gap 9.1).

**`applies_to_moop`**: `IN` from the in-network maximum's scope (`pbp_d_inn_max_enr_oopc_bens` position 2 with `_m_yn`/`_m_cat_ex`, position 1 with `_nm_yn`/`_nm_cat_ex`). `OUT` and `POS`: from the out-of-network maximum's scope when the plan has that slot; otherwise from the combined maximum's out-of-network side (`pbp_d_comb_max_enr_oopc_bens` positions 4 and 1), with a tier note that the flag refers to the combined maximum, which has no slot. Not written when the plan has neither.

### 5.6 Limits

| Pattern | Columns | BPS `limits[]` |
|---|---|---|
| Quantity per period | `lim` (1 unlimited, 2 limited), `num`, `per`, `per_d` | `lim` 2: `type` from the crosswalk (`visits`, `treatments`, `hearing_aids`), `value`, `period` from the periodicity code (1 `per_3_years`, 2 `per_2_years`, 3 `per_year`, 4 `per_6_months`, 5 `per_3_months`, 6 `null`, 7 `per_month`), `raw_text` quoting the cells with the code's label and, for 6, the description. 1 or blank: no limit. |
| Dollar maximum | `<p>_maxplan_yn`, `_amt`, `_per`, `_per_d` | `type` `dollars`; `raw_text` quotes the cells, the per-ear and in-or-out-of-network answers, and which benefits the columns cover |
| Hearing aid maximum covered under 18a | `pbp_b18b_maxplan_type` 1 "Covered under Hearing Exams Category (18a)" (34 plans) | The amount is `pbp_b18a_maxplan_amt`; the hearing aid and routine hearing exam limits both carry `shared_limit_id` `PBP_18A_MAXPLAN` (v1.2.0) |
| Additional inpatient days | `pbp_b1a_bendesc_lim_ad` 2, `pbp_b1a_bendesc_amt_ad` | `type` `days`, `period` `per_benefit_period` (167 plans) |

Periodicity "Every year" is `per_year`; the files do not say plan or calendar year (7.5). Not a limit, and with no BPS field: the service-specific MOOP `<p>_maxenr_*` (quoted; gap 9.1).

### 5.7 Hearing aids

In `pbp_b18_hearing_exams_aids`, over the 6,872 MVP plans:

| Column | Allowed values | BPS |
|---|---|---|
| `pbp_b18b_bendesc_yn` | 1 Yes, 2 No | 1: covered (5,150 all-types rows); 2: `HEARING_AIDS` with `covered: false` (1,720) |
| `pbp_b18b_bendesc_ehc` | 1 Over the Ear, 2 All types, 3 Inner Ear, 4 Outer Ear | 1 benefit per type chosen; `0100` on all but 2 plans |
| `pbp_b18b_bendesc_amo_at` | 2 Mandatory, 3 Optional, 4 Both | `coverage_basis` (5,120 mandatory, 30 Both with `null`, question H1) |
| `pbp_b18b_bendesc_lim_at`, `_numv_at`, `_per_at` | quantity per period | `limits[]` `type` `hearing_aids` (4,165 per year, 324 per 2 years, 167 per 3 years, 6 Other) |
| `pbp_b18b_maxplan_yn`, `_amt`, `_per`, `_perear` | perear 1 Per ear, 2 One single ear, 3 Both ears combined | `type` `dollars`; `scope` `per_ear` (1) or `one_ear` (2); 3 leaves `scope` unwritten (the member-level reading) and `raw_text` says "Both ears combined" |
| `pbp_b18b_maxplan_type`, `pbp_b18b_maxplan_in_oon` | | `raw_text`; type 1: 5.6 |
| `pbp_b18b_copay_yn`, `_at_min_amt`, `_at_max_amt` | | `copay` step, `basis` `per_aid` (range when they differ: H1036-068 `$199`-`$475`) |
| `pbp_b18b_copay_amt_p2_*` (per two aids, by type) | | quoted (question H2) |
| `pbp_b18b_auth_yn`, `pbp_b18b_refer_yn` | | `conditions[]` |

`OUT` and `POS` rows come from the group listing `18b1` (H2406-013: 90% coinsurance).

### 5.8 Out-of-network and point-of-service groups

`pbp_Section_C_OON` and `pbp_Section_C_POS` hold 1 row per group; each group lists Medicare-covered category codes (`pbp_c_oon_out_mc_bendesc_cats`, `pbp_c_pos_outpt_mc_bencats`) and non-Medicare-covered ones (`..._nmc_...`) and carries 1 copay, 1 coinsurance and 1 deductible answer, each with minimum and maximum, plus a maximum plan benefit. The 2 files name the same fields differently and in a different order (layout notes 6.1); the importer names each column (`GROUP_COLS` in `scripts/from-pbp.js`).

**Mapping.** A benefit's `OUT` (or `POS`) row is read from the group whose Medicare-covered list (for a Medicare-covered benefit) or non-Medicare-covered list (for a supplemental one) contains the benefit's `pbp_code`. The steps are read with the same rules as 5.5, and the row `notes` quote the group id, label, list and cells. Groups that list several codes apply their cost share to each (1,248 of the 1,273 HMO-POS plans have a POS group with more than 1 code; H1609-028 group 6 lists 18 codes at 50% coinsurance). Every out-of-network group lists exactly 1 code. Groups that list a parent code with only a maximum plan benefit (`17a`, `18b`, `16b` on H2406-013) do not match the benefit codes (`17a1`, `18b1`) and are not read.

**A service in more than 1 group: 0 plans.** Over the 2,484 plans with out-of-network groups and the 1,273 with point-of-service groups, no category code, MVP or not, appears in more than 1 group of a plan. The importer would raise the warning `service-in-more-than-one-group` and write the steps of each group.

## 6. Cost-share values

There is no string grammar: PBP cost shares are numbers in typed columns. Amounts are decimal text read exactly (`^\d+(\.\d{1,2})?$`); percentages are whole numbers 0 to 100; day numbers are 1 to 3 digits; a `_yn` of 2 means no step; blank means not stated. Any other code than those in the dictionary is an error with the column and value quoted. **Tested over the whole file on 2026-10-06: 0 unreadable values** in the 6,872 MVP plans (section 13).

## 7. Where the public file and the schema disagree

| # | Concept | Reading |
|---|---|---|
| 7.1 | Combined (in and out of network) out-of-pocket maximum and deductible | No slot. Carried verbatim in `source_references`, as the Marketplace importer does with `CombInnOon`. Gap 9.1. The H2406-013 Summary of Benefits prints the combined maximum ($10,750) in its out-of-network column. |
| 7.2 | Medicare-defined amounts named but not stated (deductible types 1 to 3, the Part B deductible flag, `mc_copay_cstshr_yn` and `mc_coins_cstshr_yn` 1, the inpatient deductible answered Yes with no amount) | Nothing written in the slot or step; `source_references` or tier `notes` quote the columns. Gap 9.1. |
| 7.3 | PPO annual deductible with no in-network scope | **Decision 1 (2026-10-06), verified on H2406-013.** On a plan that declares an `OUT` tier and whose annual-deductible columns name no in-network scope (`pbp_d_ann_deduct_bens` blank or `100`, neither `_inn_mc_yn` nor `_inn_nmc_yn` 1), the amount is written as `oon_individual_deductible` with `network_tier` `OUT`, and `source_references` quotes the scope list (`pbp_c_oon_mc_bendesc_cats`, `pbp_d_ann_deduct_14a_yn`, and `_oon_nmc_cats` when position 1 is set). Why: `_bens` has positions for out-of-network non-Medicare-covered, in-network Medicare-covered and in-network non-Medicare-covered services, none for out-of-network Medicare-covered ones, while `pbp_d_ann_deduct_14a_yn` asks about "your OON Medicare-covered Services Deductible"; a blank `_bens` therefore leaves the out-of-network Medicare-covered services only. 218 plans (181 blank, 37 `100`). Any other combination with an out-of-network position (`110`, `111`, `011`; 48 plans) stays `individual_deductible` with `network_tier` `null` and the note. **Verified case:** the H2406-013-000 Summary of Benefits, page 2: in network "No deductible", out of network "$1,000 for covered medical services you receive from providers as described in the Plan Deductible chart"; pages 10 to 12 list the out-of-network categories (section 13). **The rule should be confirmed on 2 more PPO carriers before the importer is called 1.0.** |
| 7.4 | Copay or coinsurance range | `amount_min`/`amount_max` or `rate_min`/`rate_max` (v1.2.0), never 1 end (5.5). |
| 7.5 | Periodicity "Every year" | `per_year`; the files do not say plan or calendar year. |
| 7.6 | A deductible family answered "No" | No slot, and a `source_references` entry quotes the "No". A `$0` slot is not written (decision 2). |
| 7.7 | An HMO with out-of-network families and no `OUT` or `POS` tier | Written with the file's wording; `source_references` says so. None in CY 2027. |
| 7.8 | HMO-POS out-of-network deductible and maximum | **Decision 4 (2026-10-06):** the columns describe the POS option; written as `oon_individual_deductible` and `oon_individual_oop_max` with `network_tier` `POS` and a note quoting the columns. Supported by H1609-028, whose Section C POS deductible ($500) equals its Section D out-of-network deductible and whose `pbp_d_oon_deduct_m_cats` is its POS category list less 14a. **Confirmed 2026-10-06 (session 4)** on H1609-028-000 by 2 sources: (1) Aetna's 2027 Summary of Benefits (`data/pbp/2027/sob/H1609-028-000-2027-SB.pdf`, document ID `Y0001_H1609_028_HP32_SB2027_M`) prints the POS side under "Your out-of-network costs": page 2 "Plan deductible: No in-network deductible, $500 for certain out-of-network services"; page 3 specialist "$70 copay after your plan deductible is met", inpatient "50% per stay after your plan deductible is met", primary care "Not Covered" out of network; (2) CMS Medicare Plan Finder for the same plan (plan details `2027-H1609-028-0`) labels the $500 deductible "Out-of-network" and prints the specialist at $0-$38 in network and $70 out of network, and the out-of-pocket maximum at $6,750 in network and $10,100 out of network. The check is `docs/specs/pbp-sob-checks/H1609-028-000.json` (section 13; 0 differences). The $10,100 is the file's combined maximum (`pbp_d_comb_max_enr_amt`), carried in `source_references` (7.1); `pbp_d_oon_max_enr_oopc_yn` is "2" on this plan, so no POS maximum is written. **Decision A5 (2026-10-06, session 3):** where Section C (`pbp_c_pos_ded_yn`, `_amt`) and Section D (`pbp_d_oon_deduct_yn`, `_amt`) disagree, Section D is written, Section C is quoted in `source_references`, and that entry says they disagree. The 12 plans are listed below this table. Not counted as disagreeing: the 83 plans where Section D names the Medicare-defined Part B deductible (no amount, so no slot) and Section C says "No". |
| 7.9 | Network values in BPS slots | **Decision N1 (2026-10-06, session 3):** `network_tier` holds the document's tier codes `IN`, `OUT` and `POS` everywhere, or `null` where the file does not say (7.3). Session 1's `in-network` and `out-of-network` are replaced: the 859 in-network deductibles and 6,872 in-network maximums are `IN`, the 111 PPO out-of-network maximums `OUT`. |
| 7.10 | A category-level column that covers more than 1 benefit (`pbp_b7b_ded_yn`, `pbp_b7f_auth_yn`, `pbp_b18a_auth_yn`, `pbp_b17a_auth_yn`, `pbp_b18b_maxplan_*`) | Written on each benefit it covers, with the note naming the category it covers. The H2406-013 Summary of Benefits marks authorization only on the Medicare-covered rows (section 13). |
| 7.11 | Out-of-network group with a supplemental benefit's coinsurance "of the allowance" | Written as `coinsurance` with the rate; the file does not say of what amount (H2406-013 hearing aids, 90%; gap 9.1). |
| 7.12 | A covered service answered "No" to copayment and "No" to coinsurance | **Decision S1 (2026-10-06, session 3):** a `copay` step with `amount` 0 and a note quoting both answers, for example `The file states no copayment and no coinsurance for this service (pbp_b7a_copay_yn "2", pbp_b7a_coins_yn "2"); written as a $0 copay`. "No" is the answer 2, or a shared answer 1 whose "which services" position string leaves this service out (`pbp_b8a_copay_ehc` "01" leaves out 8a1). The same reading applies to the out-of-network and point-of-service groups and to the inpatient stay (B file and Section C). This is not the deductible rule: a deductible answered "No" still writes no slot (7.6). Over the CY 2027 file: 14,109 steps, among them primary care on 1,876 plans in network. **To be verified:** no plan whose Summary of Benefits is in `data/pbp/2027/sob/` has such a service (H2406-013 answers "Yes" for every MVP service). A candidate is the golden plan H5425-140-000 (SCAN Costco Medicare Advantage), with 14 such services, among them primary care, specialist and urgent care. |
| 7.13 | Emergency and urgent care priced once | **Decision 5 (2026-10-06, session 3):** emergency stays on the in-network tier only, with a note that the file prices 4a once, with no network, and no out-of-network or point-of-service group lists it. The importer applies the same note to urgent care (4b), which the file treats the same way. Written on every plan with an `OUT` or `POS` tier (3,757). |
| 7.14 | A category the plan's POS (or out-of-network) lists leave out | No `POS` or `OUT` row (5.4); the FHIR converter then adds its "Not stated in the BPS document" placeholder. The H1609-028 Summary of Benefits prints "Not Covered" out of network for 4 such checked rows: primary care (7a), the Medicare-covered and routine hearing exams (18a, 18a1) and hearing aids (18b1), none of them in `pbp_c_pos_mc_bendesc_subcats` or `pbp_c_pos_nmc_bendesc_subcats`. **Question O1, open:** write `covered: false` on the `POS` (or `OUT`) tier, with a note quoting the plan-level list, for a covered benefit whose code the list leaves out, or keep writing no row. Emergency and urgent care are not in the lists either but are priced once for both networks (decision 5), so they need a rule of their own under either answer. |

**The 12 HMO-POS plans where Section C and Section D disagree on the POS deductible (decision A5):**

| Plan | Name, carrier | Section D `pbp_d_oon_deduct_yn`, `_amt` | Section C `pbp_c_pos_ded_yn`, `_amt` | Written |
|---|---|---|---|---|
| H5828-013-000 | Wellpoint Medicare Advantage (HMO-POS), Wellpoint | "1", "250.00" | "2", "" | $250, `network_tier` `POS` |
| H5883-002-001, -002, -003, -004, -007 | BCN Advantage Classic (HMO-POS), Blue Care Network | "2", "" | "1", "500.00" | No slot |
| H5883-003-001, -002, -003, -004, -005 | BCN Advantage Prestige (HMO-POS), Blue Care Network | "2", "" | "1", "200.00" | No slot |
| H5883-017-000 | BCN Advantage Elements (HMO-POS), Blue Care Network | "2", "" | "1", "500.00" | No slot |

### Confirmed readings

Each reading below is written by the importer and has been checked against a source document.

1. **Decision 4 (7.8), confirmed 2026-10-06:** the HMO-POS out-of-network deductible as the POS option's. Aetna H1609-028-000: the 2027 Summary of Benefits (document ID `Y0001_H1609_028_HP32_SB2027_M`, pages 2 and 3, under "Your out-of-network costs") and CMS Medicare Plan Finder (plan details `2027-H1609-028-0`, which labels the $500 deductible "Out-of-network"). Check: `docs/specs/pbp-sob-checks/H1609-028-000.json`, 0 differences.
2. **Decision 1 (7.3), confirmed on 1 carrier:** the PPO annual deductible with no in-network scope as the out-of-network deductible. UnitedHealthcare H2406-013-000: the Summary of Benefits prints in network "No deductible" and out of network $1,000 on a listed set of services (`docs/specs/pbp-sob-checks/H2406-013-000.json`). 2 more carriers are still needed (below).

### Known readings to confirm

Each reading below is written by the importer today and is not yet confirmed against a source document.

1. **Decision 1 on 2 more PPO carriers (7.3).** Verified on 1 UnitedHealthcare plan (H2406-013). Confirm on 2 PPOs from other carriers, at least 1 of them among the 37 with the scope `100` (decision C3), before the importer is called 1.0.
2. **Decision S1's verifying plan (7.12).** No Summary of Benefits in `data/pbp/2027/sob/` shows a service answered "No" to both; confirm on 1 of the 1,876 plans, for example H5425-140-000 (SCAN Costco Medicare Advantage, 14 such services). Its 2027 Summary of Benefits is not yet saved; start from Plan Finder, https://www.medicare.gov/plan-compare/#/plan-details/2027-H5425-140-0?year=2027&lang=en, and save the PDF as `data/pbp/2027/sob/H5425-140-000-2027-SB.pdf`.
3. **Decision 4's out-of-network maximum.** H1609-028 has no POS maximum (`pbp_d_oon_max_enr_oopc_yn` "2"), so only the deductible half of decision 4 is confirmed. The 63 HMO-POS plans with `pbp_d_oon_max_enr_oopc_yn` "1" need 1 Summary of Benefits to confirm the maximum half.

Open question from session 4: **O1** (7.14), a covered category the POS or out-of-network lists leave out.

## 8. Lossy and unmapped items

| PBP content | Where it goes | Recoverable from the BPS document? |
|---|---|---|
| Service categories outside the crosswalk (1b, 2, 3, 5, 6, 7e, 7g, 7h, 7j, 7k, 9c, 9d, 10b, 11, 12, 13b to 13i, 14, 15, 16, 17b, 18c, 20) | Not read | No |
| Which service carries a range's minimum | Not in the file | No |
| Service-specific out-of-pocket maximums (`<p>_maxenr_*`) | Benefit `source_references` | Yes, as text |
| Out-of-pocket maximum type, combined accumulators, Medicare-defined deductibles, Section C POS deductible and maximum | Plan `source_references` | Yes, as text |
| Inpatient lifetime reserve days, upgrades, Part B-only stays, benefit period, cost sharing on discharge day | Benefit `source_references` (`pbp_b1a_hosp_ben_period`, `pbp_b1a_cost_discharge_yn`, upgrades) or not read (lifetime reserve day intervals) | Partly |
| Out-of-network group maximum plan benefit (`pbp_c_oon_outpt_maxplan_*`) | Tier `notes` | Yes, as text |
| Point-of-service authorization and referral (`pbp_c_pos_auth_*`, `pbp_c_pos_refer_*`) | Not read | No |
| "Counts toward a plan-level deductible" (`pbp_b4a_deduct_yn`, `pbp_b4b_deduct_yn`), multiple-services maximum copay (`pbp_b8a_copay_max_yn`) | Benefit `source_references` | Yes, as text |
| Hearing aid copays per 2 aids | Benefit `source_references` | Yes, as text |
| Employer-only and SNP flags, UF and SSBCI group cost sharing, optional supplemental packages | Plan `source_references` (flags) or not read | Flags only |

**Later, not mapped now.** Where the non-MVP supplemental benefits sit:

| Benefit | File | Column prefix | Also in |
|---|---|---|---|
| OTC items | `pbp_b13_other_services` | `pbp_b13b_` (53 columns; `pbp_b13b_bendesc_otc` 1 Yes, 2 No; `pbp_b13b_maxplan_amt`) | `pbp_b13_b19b_other_services_vbid_uf`, `pbp_step13` |
| Meals | `pbp_b13_other_services` | `pbp_b13c_` (47 columns) | same |
| Transportation | `pbp_b10_amb_trans` | `pbp_b10b_` (99 columns) | `pbp_b10_b19b_amb_trans_vbid_uf`, `pbp_step10b` |
| Dental | `pbp_b16_dental` | `pbp_b16a_` Medicare-covered, `pbp_b16b_` preventive (238 columns), `pbp_b16c_` comprehensive (338) | `pbp_b16_b19b_dental_vbid_uf`, `pbp_step16` |
| Vision eyewear | `pbp_b17_eye_exams_wear` | `pbp_b17b_` eyewear (198) | `pbp_b17_b19b_eye_exams_wear_vbid_uf`, `pbp_step17b` |
| Cardiac and pulmonary rehabilitation | `pbp_b3_cardiac_rehab` | `pbp_b3_` (Medicare-covered and additional services, with visit limits) | `pbp_b3_b19b_cardiac_rehab_vbid_uf` |
| Non-health SSBCI (food, produce, non-medical transportation) | `pbp_b13i_b19b_services_vbid_ssbci`, `pbp_b13i_b19b_other_services_vbid_ssbci` | `pbp_b13i_` | |

When category 15 (Part B drugs) is mapped: the file's out-of-network category list includes `15-1-I` (Part B insulin), so decision 1 would flag it as subject to the deductible, while the H2406-013 Summary of Benefits deductible chart (page 11) lists only chemotherapy and other Part B drugs. Check before mapping.

## 9. Schema gaps found

### 9.1 In the PBP files, not in BPS

Each value below is carried verbatim in `source_references` (plan or benefit level) or in a tier or step `notes`. Nothing is invented. The last column proposes a v1.2.0 field; none is added to the schema here (decision 5: the session 1 gaps stay proposals).

| PBP content | Gap | Where it is carried | Proposed v1.2.0 field |
|---|---|---|---|
| Combined in-and-out-of-network out-of-pocket maximum (`pbp_d_comb_max_enr_amt`; 2,646 plans) | No combined slot | `source_references`; `OUT`/`POS` tier notes when `applies_to_moop` refers to it | `accumulators.combined_oop_max` (an `oop_max_accumulator`; `network_tier` `combined`) |
| Combined in-and-out-of-network deductible (`pbp_d_comb_deduct_amt`; 113 plans) | No combined slot | `source_references` | `accumulators.combined_deductible` (a `deductible_accumulator`) |
| Medicare-defined deductible with no amount in the file (`pbp_d_ann_deduct_amt_type` 1 to 3: 818 plans; `pbp_d_inn_deduct_partb_yn` 1: 1,273) | Deductible slots require `amount` | `source_references` | `deductible_accumulator.amount_basis` with values `medicare_part_a_deductible`, `medicare_part_b_deductible`, `medicare_part_a_and_b_deductible`, and `amount` required only when `amount_basis` is absent |
| Out-of-pocket maximum type: Lower, Intermediate, Mandatory (`pbp_d_out_pocket_amt_type`, `pbp_d_comb_max_enr_amt_type`) | No field | `source_references` | `oop_max_accumulator.cms_moop_level` (`lower`, `intermediate`, `mandatory`) |
| Deductible scope as a network and a list of service categories (`pbp_d_ann_deduct_bens`, `pbp_d_*_deduct_*_cats`) | `network_tier` holds 1 network; no category list | `source_references`; per-step `applies_to_deductible` (5.5) | `deductible_accumulator.applies_to_categories` (array of category codes), and a documented meaning for an explicit `network_tier` `null` ("not stated"), as G8 did for `moop_applicability` |
| Service-level deductibles (`<p>_ded_amt`; `pbp_d_diff_deduct_*`, `pbp_d_mand_deduct_*`, `pbp_d_deduct_*` in Section D) | Answered for the B files: a `cost_shares[]` step of `type` `deductible` holds it | B files: `deductible` steps; Section D: `source_references` | None for the B files. Section D differential deductibles: the same step type when those categories are mapped |
| Service-level out-of-pocket maximums (`<p>_maxenr_yn`, `_amt`, `_per`) | `max_amount` caps 1 step per unit, not a yearly cap on a service | Benefit `source_references` | `benefits[].oop_max` (`amount`, `period`) |
| Medicare-defined cost share on a service (`mc_copay_cstshr_yn`, `mc_coins_cstshr_yn` 1; inpatient on 1,554 plans in network) and the inpatient deductible with no amount (39 plans) | A step needs an amount or rate | Tier `notes` | `cost_shares[].amount_basis` (`medicare_defined`), the same idea as the deductible |
| Which service carries a range's minimum (specialist $0 is the virtual visit on H2406-013, outpatient hospital $0 is the colonoscopy) | Range fields have no label per end | The range only; the file has nothing more | `cost_shares[].amount_min_label`, or 1 step per named service when a source names them (not the PBP) |
| "Counts toward any plan-level deductible" (`pbp_b4a_deduct_yn`, `pbp_b4b_deduct_yn`) | `applies_to_deductible` means subject to the deductible, not counting toward it | Benefit `source_references` | `cost_shares[].counts_toward_deductible` (boolean) |
| Coinsurance base: "90% of the allowance amount" (H2406-013 hearing aids out of network) | `rate` has no base | The rate; the base is not in the file | `cost_shares[].rate_basis` (`allowed_amount`, `allowance`) |
| Hearing aid copays per 2 aids (`pbp_b18b_copay_amt_p2_*`) | No `basis` value for a pair | Benefit `source_references` | `basis` value `per_pair` in the recommended list (question H2) |
| Coverage basis "Both" mandatory and optional (`<p>_bendesc_amo_*` 4; 30 hearing aid rows) | `coverage_basis` takes 1 value | `null` and a benefit `source_references` entry | A recommended value `supplemental_mandatory_and_optional`, or 2 benefits (question H1) |
| Section C point-of-service deductible and maximum (`pbp_c_pos_ded_*`, `pbp_c_pos_maxenr_oopc_*`) where they differ from Section D (12 plans) | Decision A5 writes Section D's | `source_references`, with a note naming the disagreement | None; a data question |
| SSA county code (`PlanArea.county_code`) | `counties[]` has `fips` only | `source_references` | `service_area.counties[].ssa_code` |
| Service area across more than 1 state (226 individual plans, 771 employer plans) | `service_area.state` is 1 value; counties carry no state | `state` `null`; `source_references` | `service_area.counties[].state` |
| Partial county (`PlanArea.partial_flag` `*`; 1,030 rows of individual plans) | No field | `source_references` | `service_area.counties[].partial` (boolean) |
| Regions of regional PPOs (`PlanRegionArea`; 73 plans) | Counties only | `source_references` | `service_area.regions[]` (`code`, `name`) |
| Employer-only plan, SNP and SNP type (`pbp_a_eghp_yn`, `pbp_a_special_need_flag`, `pbp_a_special_need_plan_type`) | No field | `source_references` | `eligibility` object (`employer_group_only`, `special_needs_type`) |
| Hospital cost-tier membership (which facilities are tier 1) | The files do not name them | Tier `description` | None needed: `provider_set` exists; the data is missing |
| Services with no canonical key: hearing aids (4 rows), hearing exams (2), eye exams (2), podiatry and routine foot care (2), physical therapy and speech-language pathology combined (1) | No `canonical_key` in `vocabularies/canonical-benefits.json` | Written by `service_name` and `raw_label`, `canonical_key` omitted | Vocabulary (not a schema change): `hearing_aids`, `hearing_exam`, `eye_exam`, `podiatry`, `routine_foot_care`; the combined 7i row stays unmapped unless the vocabulary adds a combined key |
| UF and SSBCI group cost sharing (`pbp_vbid_group_id`) | Population-specific cost sharing, gap G13, open | Not read for the MVP | G13 `applies_to_population` |
| Optional supplemental packages (`pbp_Section_D_opt`, step files) | Riders, gap G12, open | Not read for the MVP | G12 `riders[]` |

### 9.2 In BPS, not in the PBP files

| BPS field | PBP files |
|---|---|
| `effective_date`, `expiry_date`, `coverage_period` | No date columns; `plan_year` comes from `contract_year` |
| Accumulator and limit `period` as plan year or calendar year | Not stated |
| Family accumulators | Section D has no family amounts |
| Page-level `source_references` | No pages |
| `service_area.counties[].fips` | `PlanArea.county_code` is the SSA code (4.5) |
| Cost-share `basis` per visit on most categories | Stated only for 9a1, 7b, 7f, 18b and observation |
| `place_of_service`, `coding_hints` | Not in these files |

### 9.3 Exporter limits met on the way to FHIR

First run on 2026-10-06 (session 3) over the 5 golden files; updated in session 4:

- **`POS` maps since session 4.** Session 3's converter refused the tier (`error: network tier "POS" is not IN, OUT or a second in-network tier`), so no HMO-POS plan reached FHIR. `scripts/to-insuranceplan.js` now maps `POS` to `applicability` `out-of-network` with the text-only qualifier `Point-of-service option`, as it maps `IN2` (converter spec 6.3, which cites the H1609-028 Summary of Benefits and Plan Finder). The 10 published Bundles are byte-identical before and after.
- **All 5 convert** to 1 `Bundle` each (`InsurancePlan` and `Organization`), written to `examples/fhir/` under the converter's naming (the `InsurancePlan` id, from `plan_id`; section 13). Each places the benefits with a crosswalked canonical key under the SBC categories and lists the rest by name in `bps-unmapped-benefit` (the 11 with no canonical key, and `observation_care`, `radiation_therapy`, `chiropractic_care`, `acupuncture`, which `fhir/carin-sbc-crosswalk.json` does not place, as they apply). The hospital cost tiers of H5533-019 (`IN_1A_TIER_1`, `IN_1A_TIER_2`, `tier_class` `cost_designation`) reach FHIR as cost qualifiers with the tier name as text. H1609-028 has 10 `Point-of-service option` entries.
- **HL7 FHIR validator: not run.** `validator_cli.jar` is not on this machine (the `hl7.fhir.us.insurance-card#2.0.0-ballot` package is in the local package cache). The command and the table to fill are in section 13. Not yet checked by the validator: `network_tier` values on accumulators as text, `deductible` steps, the `Point-of-service option` qualifier, `max_amount`, and the limit types `treatments` and `hearing_aids` as text.

## 10. Determinism

| Item | Rule |
|---|---|
| Purity | `buildDocument(rows, source)` makes no network call, reads no clock, uses no randomness and keeps no state. `loadPlan` streams the files and passes the rows in. `fhir/pbp-crosswalk.json` is read once when the module loads. |
| Download date and release label | Inputs, from the year folder's `download.json` or `--downloaded`; never the clock. The fixtures carry the full files' values. |
| Order | Plan fields in the order of 4.1 (`plan_id` first, `schema_version` last); accumulator slots in schema order; counties in SSA code order; tiers `IN`, `OUT`, `POS`, then hospital tiers by category and number; benefits in crosswalk order; tier rows `IN` (or the hospital tiers), then `OUT`, then `POS`; steps numbered deductible, copay, coinsurance, then the $0 step of decision S1; step fields in schema order; groups in file order; `source_references` in the order of 4.4. |
| Numbers | Amounts are read exactly from the decimal text (`"550.00"` gives 550). Rates are the whole percent divided by 100 (`"40"` gives 0.4). Day numbers are integers. |
| Text | Cells are quoted verbatim as `column "value"`; names are trimmed; nothing else is normalized. |
| Serialization | `JSON.stringify(doc, null, 2)` plus `\n`, UTF-8, LF line endings. |

**Checked on 2026-10-06.** Each of the 5 golden plans imported twice from the full files with the CLI: both runs and the committed golden file have the same SHA-256.

| Plan | SHA-256 (first 16 hex digits), run 1 = run 2 = golden |
|---|---|
| H2406-013-000 | `19c0418078997a53` |
| H1036-068-000 | `d6bf06a4c27dd9d0` |
| H1609-028-000 | `c174415a745a3d81` |
| H5533-019-000 | `6cc883b75a27413d` |
| H5425-140-000 | `5feec56088e2d6a6` |

The test checks the same on every run, from the fixtures (a second build of each plan is byte-identical) and, when the full files are present, from the full files. A run over every MVP plan of the CY 2027 file gave 0 errors (section 13).

## 11. How to run

**From a clean clone** (Node.js 18 or later; the schema check uses Ajv, installed locally and not committed, as for the Marketplace importer):

```
git clone https://github.com/Benefit-Plan-Standard/benefit-plan-schema.git && cd benefit-plan-schema
npm install ajv ajv-formats     # one time
node --test scripts/from-pbp.test.js        # 23 pass, 5 skip: the full files are not there yet
```

**Get the files** (once per contract year, about 23 MB zipped):

```
mkdir -p data/pbp/2027 && cd data/pbp/2027
curl -L -O https://www.cms.gov/files/zip/pbp-benefits-2027.zip
unzip pbp-benefits-2027.zip
cd ../../..
```

Then write `data/pbp/2027/download.json` with at least `{"downloaded": "YYYY-MM-DD", "release_label": "PBP Benefits-2027"}` (the file used for the examples also records the URLs and the SHA-256 of every file), or pass `--downloaded` on each run.

**Import and inspect:**

```
node scripts/from-pbp.js --year 2027 --contract H2406                        # list a contract's plans
node scripts/from-pbp.js --year 2027 --plan H2406-013-000 --out h2406.json   # 1 plan, BPS v1.2.0
node scripts/validate.js --schema schema/v1.2.0/benefit-plan.schema.json h2406.json
node scripts/to-insuranceplan.js h2406.json -o h2406.bundle.json            # FHIR (HMO-POS too since session 4, 9.3)
node scripts/pbp-sob-check.js h2406.json docs/specs/pbp-sob-checks/H2406-013-000.json
node scripts/pbp-sob-check.js examples/aetna-medicare-aetna-medicare-select-extra.pbp.json docs/specs/pbp-sob-checks/H1609-028-000.json
node scripts/from-pbp.js --write-golden                                      # regenerate the 5 examples, on purpose only
node scripts/from-pbp.js --write-fixtures                                    # re-cut test/fixtures/pbp/, on purpose only
node --test scripts/from-pbp.test.js                                         # 28 pass with the full files
```

Options: `--data <dir>` (default `data/pbp`), `--downloaded YYYY-MM-DD`. A plan import streams every file it reads and takes about 4 seconds, most of it the 172 MB `PlanArea.txt`. Exit code 0 means written or listed; 1 means an error, with nothing written. Warnings go to stderr as `warning: <kind>: <detail>`. `--write-golden` and `--write-fixtures` need the full files and take about 20 seconds together. `scratch/pbp-bulk2.js` (git-ignored, throwaway) builds every MVP plan in about 3.5 minutes with `node --max-old-space-size=8192`.

## 12. Re-running for a new release

CMS updates the PBP Benefits files during the year and publishes a new contract year each fall. For either:

1. Download the zip into `data/pbp/<year>/`, unzip it, and write `download.json` (section 11). For an update of the same year, keep the old folder elsewhere for comparison; the folder name is the year, so 2 releases of 1 year cannot sit side by side.
2. Read the Readme's change log (`Readme_PBP_Benefits_<year>.txt`; the CY 2027 Readme lists added, dropped and resized columns under 3 dated entries, January 5, February 13 and May 22, 2026) and diff the dictionary (`PBP_Benefits_<year>_dictionary.xlsx`) against the previous one, for the files in 3 and the columns in `fhir/pbp-crosswalk.json`.
3. Run `node --test scripts/from-pbp.test.js`. The crosswalk test checks every column it names against the fixture headers, which are the previous release's; a renamed column shows up as an import error ("no column ...") on the first plan, so import 1 plan of the new release first.
4. Run the whole-file build (`scratch/pbp-bulk2.js` or a loop over `--contract`) and read every error and warning. Any code outside the dictionary is an error with the column and value quoted; extend the reader only for codes the dictionary lists, and add a test case for each.
5. For a new contract year: add golden plans for that year to `GOLDEN` in `scripts/from-pbp.js`, run `--write-fixtures` and `--write-golden`, and download 1 or more Summary of Benefits documents into `data/pbp/<year>/sob/` with an expectations file under `docs/specs/pbp-sob-checks/`. Every reading in "Known readings to confirm" (end of section 7) should be checked again.
6. Import a few plans, validate them, convert them (HMO-POS included), and run the HL7 validator as in section 13.

## 13. Tests and golden files

### Golden files

Written by `node scripts/from-pbp.js --write-golden` from the full CY 2027 files and never by hand. Slug: carrier and plan name, text in parentheses dropped, cut back at `_` to 64 characters, lowercased, `_` changed to `-`, as the Marketplace importer names its examples; when 2 golden plans would share a slug, the contract-plan-segment is appended to both (none do).

| File | Bytes | Plan | Type | Why |
|---|---|---|---|---|
| `unitedhealthcare-aarp-medicare-advantage-from-uhc-fl-0021.pbp.json` | 64,960 | H2406-013-000 AARP Medicare Advantage from UHC FL-0021 (PPO), UnitedHealthcare, FL | Local PPO | The Summary of Benefits check plan; decision 1 out-of-network deductible; ranges; emergency note (decision 5) |
| `humana-humana-gold-plus-h1036-068.pbp.json` | 46,277 | H1036-068-000 Humana Gold Plus H1036-068 (HMO), Humana, FL | HMO | No deductible (decision 2); copay ranges; acupuncture limit |
| `aetna-medicare-aetna-medicare-select-extra.pbp.json` | 57,748 | H1609-028-000 Aetna Medicare Select Extra (HMO-POS), Aetna Medicare, FL | HMO-POS | Point-of-service groups; decision 4 POS deductible; Section C quoted |
| `upmc-for-life-upmc-for-life-ppo-rx-choice.pbp.json` | 63,713 | H5533-019-000 UPMC for Life PPO Rx Choice (PPO), UPMC for Life, PA | Local PPO | Inpatient hospital cost tiers (`IN_1A_TIER_1` $175 and `IN_1A_TIER_2` $200 per day, days 1 to 3); out-of-network hearing aids at a $5,000 copay, as the file states (group 181) |
| `scan-health-plan-scan-costco-medicare-advantage.pbp.json` | 45,309 | H5425-140-000 SCAN Costco Medicare Advantage (HMO), SCAN Health Plan, CA | HMO | Hearing aids under the 18a maximum ($400 per year, `shared_limit_id` `PBP_18A_MAXPLAN` on hearing aids and routine hearing exams); 14 decision S1 $0 steps |

### FHIR Bundles and HL7 validation

Since session 4 (2026-10-06) the 5 golden files are also converted with `scripts/to-insuranceplan.js` into `examples/fhir/`, named as the 10 SBC Bundles are: the `InsurancePlan` id (`plan_id` lowercased, `_` changed to `-`) plus `.json`. `node scripts/to-insuranceplan.js --write-golden` writes them with the 10; `scripts/to-insuranceplan.test.js` checks each against its file byte for byte and against a pinned SHA-256. `scripts/publish-fhir.js` reads only `examples/*_example.json`, so they are not published to the docs site, and the 10 published Bundles are byte-identical before and after the change (checked against `HEAD` and the pinned hashes).

| Bundle (`examples/fhir/`) | Plan | Bytes | Placed / unmapped benefits | `cost[]` entries | Placeholders | Text-only qualifiers |
|---|---|---|---|---|---|---|
| `aarp-medicare-advantage-from-uhc-fl-0021-ppo-h2406-013-000.json` | H2406-013-000 | 163,303 | 14 / 13 | 30 | 2 | 0 |
| `humana-gold-plus-h1036-068-hmo-h1036-068-000.json` | H1036-068-000 | 142,572 | 14 / 13 | 29 | 13 | 0 |
| `aetna-medicare-select-extra-hmo-pos-h1609-028-000.json` | H1609-028-000 | 160,596 | 14 / 13 | 29 | 4 | 10 (`Point-of-service option`) |
| `upmc-for-life-ppo-rx-choice-ppo-h5533-019-000.json` | H5533-019-000 | 163,544 | 14 / 13 | 31 | 2 | 4 (hospital tiers) |
| `scan-costco-medicare-advantage-hmo-h5425-140-000.json` | H5425-140-000 | 137,165 | 14 / 13 | 28 | 13 | 0 |

**HL7 FHIR validator: not run on 2026-10-06.** `validator_cli.jar` is not on this machine; Java (OpenJDK 17.0.19) is, and `hl7.fhir.us.insurance-card#2.0.0-ballot` is in the local FHIR package cache (`~/.fhir/packages`). The command, the one the docs page "Validating" section and `examples/fhir/VALIDATION.md` give, limited to the 5 files, from the repository root (the latest `validator_cli.jar` is at https://github.com/hapifhir/org.hl7.fhir.core/releases/latest/download/validator_cli.jar; the run uses `tx.fhir.org`):

```
java -jar validator_cli.jar -version 4.0.1 \
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
| `aarp-medicare-advantage-from-uhc-fl-0021-ppo-h2406-013-000.json` | not run | not run | not run |
| `humana-gold-plus-h1036-068-hmo-h1036-068-000.json` | not run | not run | not run |
| `aetna-medicare-select-extra-hmo-pos-h1609-028-000.json` | not run | not run | not run |
| `upmc-for-life-ppo-rx-choice-ppo-h5533-019-000.json` | not run | not run | not run |
| `scan-costco-medicare-advantage-hmo-h5425-140-000.json` | not run | not run | not run |

A Bundle with errors is fixed in the importer or the converter and regenerated, never edited by hand.

### Fixtures

`test/fixtures/pbp/2027/` holds the 18 files the importer reads (section 3), each with its original header line and the 5 golden plans' records, byte for byte (257 records, 135 KB), plus `download.json` (description, download date, release label, the 5 plans, the record count per file). Written by `node scripts/from-pbp.js --write-fixtures`. The importer reads them through the same streaming reader as the full files (`--data test/fixtures/pbp`).

### The test

`scripts/from-pbp.test.js`, run with `node --test scripts/from-pbp.test.js`:

- Reader: CRLF records, lowercased header, Windows-1252 bytes; a wrong field count, a bare line break and disagreeing repeated columns are errors.
- Crosswalk: unique ids; keys, categories and benefit types in the vocabularies; counts; every column it names is in the header of its file.
- The committed `examples/*.pbp.json` are the golden set under the slug rule.
- For each golden plan, from the fixtures: 0 errors and 0 warnings, valid against v1.2.0, byte for byte equal to its golden file (after CRLF normalization), and a second build identical.
- With the full files in `data/pbp/2027/`: each golden plan built from them equals the fixture build. Without the files these 5 tests are skipped and say why.
- The fixtures hold only the golden plans.
- Mapping rules on the golden plans: decision N1 (every `network_tier` is `IN`, `OUT`, `POS` or `null`), decision 1, decision 4 and the Section C quote, ranges and day intervals, decision 5, hospital tiers, the shared 18a maximum and decision S1, decision 2.
- Altered fixture rows: an unreadable amount, an unknown code and a minimum above its maximum are errors that quote the cell, with no document; a Medicare-covered category with no answer is not written, with a warning and a source reference.
- The Summary of Benefits checker: pointer and matching rules, and the H2406-013 golden file against its expectations with 0 differences (and 1 difference when a value is changed).

**Output on 2026-10-06**, with the full files present: `tests 28, pass 28, fail 0, skipped 0` (about 20 seconds). In a copy of the repository without `data/`: `tests 28, pass 23, fail 0, skipped 5` (about 1.5 seconds). The Marketplace importer test (18 pass) and the converter test (62 pass) pass unchanged. **Session 4, 2026-10-06:** the same 28 pass here; the converter test has 65 (the 62, 2 of them now expecting the 5 PBP Bundles beside the 10 in `examples/fhir/`, and 3 new: the PBP Bundles, the `POS` tier on the Aetna golden file, and a misnamed point-of-service tier); the Marketplace importer test 18.

### Summary of Benefits check

`scripts/pbp-sob-check.js <document.json> <expectations.json>` compares a document with the values its Summary of Benefits prints. Expectations: 1 JSON per plan in `docs/specs/pbp-sob-checks/`, `{plan, document, golden, spec, checks}`, where each check is `{item, page, printed?, expected, path, expected_reading?, note?}`:

- `path`: a JSON pointer (RFC 6901) into the document.
- `expected`: the printed value as JSON. An object matches when each key it names matches (other keys are ignored); an array must have the same length and match element by element; a scalar must be equal; `{"$absent": true}` matches nothing at that pointer or key.
- `expected_reading`: on a row where the importer's reading differs from the printed value on purpose, the value the document holds instead; `note` says why. `printed` is the document's text.

Each check prints `MATCH`, `READING` (the expected reading, not the printed value) or `DIFFERENCE`; the exit code is 1 when there is a difference. The checker is plain Node.js with no dependency; reading the PDF (`pdftotext -layout`, `pdftotext -raw`) stays a maintainer step that produces the expectations file.

`docs/specs/pbp-sob-checks/H2406-013-000.json` holds session 2's check table as 61 checks. The 7 table rows that differ from the printed value carry `expected_reading`; they are 8 checks, because the routine foot care row also covered the routine eye exam. Output on 2026-10-06 for the golden file:

```
Summary of Benefits check: H2406-013-000 AARP Medicare Advantage from UHC FL-0021 (PPO)
Expectations: H2406-013-000, Y0066_SB_H2406_013_000_2027_M (data/pbp/2027/sob/H2406-013-000-2027-SB.pdf)
MATCH      p2   Annual medical deductible, in network
MATCH      p2   Annual medical deductible, out of network
MATCH      p10  Deductible chart: doctor visits (primary) out of network [PRIMARY_CARE]
MATCH      p10  Deductible chart: inpatient hospital out of network [INPATIENT_HOSPITAL]
MATCH      p2   No deductible in network (primary care) [PRIMARY_CARE]
MATCH      p2   Maximum out-of-pocket amount, in network
READING    p2   Maximum out-of-pocket amount, out of network
             text:     $10,750 This is the most you will pay out-of-pocket each year for Medicare-covered services and supplies received from any provider.
             printed:  {"amount":10750}
             document: (absent)  at /accumulators/oon_individual_oop_max
             reading:  The file states the amount as the combined in-network and out-of-network maximum (pbp_d_comb_max_enr_amt "10750.00"; pbp_d_oon_max_enr_oopc_yn "2"). BPS has no combined slot, so it is in source_references only (spec 7.1).
MATCH      p3   Primary care provider, in network [PRIMARY_CARE]
MATCH      p3   Primary care provider, out of network [PRIMARY_CARE]
READING    p3   Specialists, in network [SPECIALIST]
             text:     $65 copay
             printed:  [{"type":"copay","amount":65}]
             document: [{"type":"copay","sequence":1,"amount_min":0,"amount_max":65,"applies_to_deductible":false,"applies_to_moop":true}]  at /benefits/1/network_cost_shares/0/cost_shares
             reading:  pbp_b7d_copay_amt_mc_min "0.00", _max "65.00". The $0 is the "Virtual medical visits $0 copay" row (page 3), priced inside 7d; the file states the range and not which service is $0 (spec 5.5).
MATCH      p3   Specialists, out of network [SPECIALIST]
MATCH      p2   Inpatient hospital care, in network, days 1 to 5 [INPATIENT_HOSPITAL]
MATCH      p2   Inpatient hospital care, in network, days 6 and beyond [INPATIENT_HOSPITAL]
MATCH      p2   Inpatient hospital care, unlimited days [INPATIENT_HOSPITAL]
MATCH      p2   Inpatient hospital care, out of network [INPATIENT_HOSPITAL]
MATCH      p3   Outpatient hospital, including surgery, in network [OUTPATIENT_HOSPITAL]
MATCH      p3   Outpatient hospital, including surgery, out of network [OUTPATIENT_HOSPITAL]
READING    p3   Outpatient hospital observation services, in network [OBSERVATION]
             text:     $550 copay
             printed:  [{"type":"copay","amount":550,"basis":{"$absent":true}}]
             document: [{"type":"copay","sequence":1,"amount":550,"basis":"per_day","applies_to_deductible":false,"applies_to_moop":true}]  at /benefits/4/network_cost_shares/0/cost_shares
             reading:  pbp_b9a_copay_obs_per "1" (Per day). The document does not print "per day".
MATCH      p3   Outpatient hospital observation services, out of network [OBSERVATION]
MATCH      p3   Ambulatory surgical center (ASC), in network [AMBULATORY_SURGICAL_CENTER]
MATCH      p3   Ambulatory surgical center (ASC), out of network [AMBULATORY_SURGICAL_CENTER]
READING    p4   Emergency care, both networks [EMERGENCY]
             text:     $130 copay per visit (1 value across the in-network and out-of-network columns)
             printed:  [{"tier_id":"IN","cost_shares":[{"type":"copay","amount":130}]},{"tier_id":"OUT","cost_shares":[{"type":"copay","amount":130}]}]
             document: [{"tier_id":"IN","covered":true,"cost_shares":[{"type":"copay","sequence":1,"amount":130,"applies_to_deductible":false,"applies_to_moop":true,"notes":"Waived...  at /benefits/6/network_cost_shares
             reading:  The file prices 4a once, with no network, and no out-of-network group lists 4a; written on the in-network tier only with a note (decision 5, spec 7.13).
READING    p4   Urgently needed services, both networks [URGENT_CARE]
             text:     $50 copay per visit (1 value across both columns)
             printed:  [{"tier_id":"IN","cost_shares":[{"type":"copay","amount":50}]},{"tier_id":"OUT","cost_shares":[{"type":"copay","amount":50}]}]
             document: [{"tier_id":"IN","covered":true,"cost_shares":[{"type":"copay","sequence":1,"amount_min":0,"amount_max":50,"applies_to_deductible":false,"applies_to_moop":tr...  at /benefits/7/network_cost_shares
             reading:  pbp_b4b_copay_amt_mc_min "0.00", _max "50.00"; the document prints no $0 urgent care row, so which service is $0 is not shown. In-network tier only, as emergency care (decision 5).
MATCH      p4   Diagnostic radiology services (e.g. MRI, CT scan), in network [DIAGNOSTIC_RADIOLOGY]
MATCH      p4   Diagnostic radiology services, out of network [DIAGNOSTIC_RADIOLOGY]
MATCH      p4   Lab services, in network [LAB_SERVICES]
MATCH      p4   Lab services, out of network [LAB_SERVICES]
MATCH      p4   Diagnostic tests and procedures, in network [DIAGNOSTIC_TESTS]
MATCH      p4   Diagnostic tests and procedures, out of network [DIAGNOSTIC_TESTS]
MATCH      p4   Therapeutic radiology, in network [THERAPEUTIC_RADIOLOGY]
MATCH      p4   Therapeutic radiology, out of network [THERAPEUTIC_RADIOLOGY]
MATCH      p4   Outpatient X-rays, in network [XRAY]
MATCH      p4   Outpatient X-rays, out of network [XRAY]
MATCH      p4   Exam to diagnose and treat hearing and balance issues, in network [HEARING_EXAM]
MATCH      p4   Exam to diagnose and treat hearing and balance issues, out of network [HEARING_EXAM]
MATCH      p4   Routine hearing exam, in network [HEARING_EXAM_ROUTINE]
MATCH      p4   Routine hearing exam, out of network [HEARING_EXAM_ROUTINE]
READING    p4   Routine hearing exam, prior authorization [HEARING_EXAM_ROUTINE]
             text:     "Routine hearing exam" carries no footnote 2 ("May require your provider to get prior authorization")
             printed:  []
             document: [{"type":"authorization","description":"Authorization required (pbp_b18a_auth_yn \"1\")."}]  at /benefits/23/conditions
             reading:  pbp_b18a_auth_yn "1" covers service category 18a as a whole; the document marks only the Medicare-covered hearing exam (spec 7.10).
MATCH      p4   Hearing aids, covered [HEARING_AIDS]
MATCH      p4   Hearing aids, quantity and allowance [HEARING_AIDS]
MATCH      p4   Hearing aids, out of network [HEARING_AIDS]
MATCH      p5   Exam to diagnose and treat diseases and conditions of the eye, in network [EYE_EXAM]
MATCH      p5   Exam to diagnose and treat diseases and conditions of the eye, out of network [EYE_EXAM]
MATCH      p5   Routine eye exam, in network [EYE_EXAM_ROUTINE]
MATCH      p5   Routine eye exam, out of network [EYE_EXAM_ROUTINE]
MATCH      p5   Routine eye exam, each year [EYE_EXAM_ROUTINE]
READING    p5   Routine eye exam, prior authorization [EYE_EXAM_ROUTINE]
             text:     "Routine eye exam" carries no footnote 2
             printed:  []
             document: [{"type":"authorization","description":"Authorization required (pbp_b17a_auth_yn \"1\")."}]  at /benefits/25/conditions
             reading:  pbp_b17a_auth_yn "1" covers service category 17a as a whole; the document marks only the Medicare-covered eye exam (spec 7.10).
MATCH      p6   Physical therapy and speech and language therapy visit, in network [PHYSICAL_AND_SPEECH_THERAPY]
MATCH      p6   Physical therapy and speech and language therapy visit, out of network [PHYSICAL_AND_SPEECH_THERAPY]
MATCH      p6   Occupational therapy visit, in network [OCCUPATIONAL_THERAPY]
MATCH      p6   Occupational therapy visit, out of network [OCCUPATIONAL_THERAPY]
MATCH      p6   Ambulance, ground, both networks [AMBULANCE_GROUND]
MATCH      p6   Ambulance, air, both networks [AMBULANCE_AIR]
MATCH      p7   Medicare-covered chiropractic care, in network [CHIROPRACTIC]
MATCH      p7   Medicare-covered chiropractic care, out of network [CHIROPRACTIC]
MATCH      p9   Foot exams and treatment, in network [PODIATRY]
MATCH      p9   Foot exams and treatment, out of network [PODIATRY]
MATCH      p9   Routine foot care, in network [PODIATRY_ROUTINE]
MATCH      p9   Routine foot care, out of network [PODIATRY_ROUTINE]
MATCH      p9   Routine foot care, 6 visits per year [PODIATRY_ROUTINE]
READING    p9   Routine foot care, prior authorization [PODIATRY_ROUTINE]
             text:     "Routine foot care" carries no footnote 2
             printed:  []
             document: [{"type":"authorization","description":"Authorization required (pbp_b7f_auth_yn \"1\")."}]  at /benefits/20/conditions
             reading:  pbp_b7f_auth_yn "1" covers service category 7f as a whole; the document marks only foot exams and treatment (spec 7.10).
61 checks: 53 MATCH, 8 READING, 0 DIFFERENCE
```

`docs/specs/pbp-sob-checks/H1609-028-000.json` (session 4) checks the Aetna HMO-POS plan against its 2027 Summary of Benefits, document ID `Y0001_H1609_028_HP32_SB2027_M`, pages 2 to 5: the deductible, both maximums, primary care, specialist, inpatient, outpatient hospital, diagnostic tests, lab, diagnostic radiology, X-rays, emergency and urgent care, hearing exams and hearing aids, both columns. The document's "out-of-network" column is the POS tier (decision 4). 0 differences; the 10 READING rows are: the combined maximum (7.1), 2 ranges where the document prints the top only (specialist $0-$38, which Plan Finder prints as a range; outpatient hospital $0-$350), the additional inpatient days with 0 intervals (5.5), emergency and urgent care on the in-network tier only (decision 5), and 4 rows the document prints "Not Covered" out of network where the importer writes no POS row (7.14, question O1). Output on 2026-10-06 for the golden file:

```
Summary of Benefits check: H1609-028-000 Aetna Medicare Select Extra (HMO-POS)
Expectations: H1609-028-000, Y0001_H1609_028_HP32_SB2027_M (data/pbp/2027/sob/H1609-028-000-2027-SB.pdf)
MATCH      p2   Plan deductible, in network
MATCH      p2   Plan deductible, out of network (POS option)
MATCH      p2   No deductible in network (primary care) [PRIMARY_CARE]
MATCH      p3   Maximum out-of-pocket, in network
READING    p3   Maximum out-of-pocket, in and out of network combined
             text:     $10,100 for in- and out-of-network services combined
             printed:  {"amount":10100}
             document: (absent)  at /accumulators/oon_individual_oop_max
             reading:  The file states the amount as the combined in-network and out-of-network maximum (pbp_d_comb_max_enr_amt "10100.00"; pbp_d_oon_max_enr_oopc_yn "2"), and the document says "combined". BPS has no combined slot, so it is in source_references only (spec 7.1). Plan Finder prints it as the out-of-network maximum.
MATCH      p3   Primary care (PCP), in network [PRIMARY_CARE]
READING    p3   Primary care (PCP), out of network [PRIMARY_CARE]
             text:     Not Covered
             printed:  [{"tier_id":"IN"},{"tier_id":"POS","covered":false}]
             document: [{"tier_id":"IN","covered":true,"cost_shares":[{"type":"copay","sequence":1,"amount":0,"applies_to_deductible":false,"applies_to_moop":true}],"notes":"pbp_b7...  at /benefits/0/network_cost_shares
             reading:  No pbp_Section_C_POS group lists 7a, and pbp_c_pos_mc_bendesc_subcats leaves it out; the importer writes no POS row for a category no group lists (spec 5.4), so the document does not say "not covered". Question O1 (section 7).
READING    p3   Specialist, in network [SPECIALIST]
             text:     $38 copay
             printed:  [{"type":"copay","amount":38}]
             document: [{"type":"copay","sequence":1,"amount_min":0,"amount_max":38,"applies_to_deductible":false,"applies_to_moop":true}]  at /benefits/1/network_cost_shares/0/cost_shares
             reading:  pbp_b7d_copay_amt_mc_min "0.00", _max "38.00". Plan Finder prints the in-network specialist as $0-$38; this document prints no $0 specialist row, so which service is $0 is not shown. The importer writes the range (spec 5.5).
MATCH      p3   Specialist, out of network (POS option) [SPECIALIST]
MATCH      p3   Inpatient hospital, in network, days 1 to 5 [INPATIENT_HOSPITAL]
MATCH      p3   Inpatient hospital, in network, days 6 to 90 [INPATIENT_HOSPITAL]
READING    p3   Inpatient hospital, in network, additional days [INPATIENT_HOSPITAL]
             text:     $0 for additional days ("Inpatient (unlimited number of days)")
             printed:  {"type":"copay","amount":0,"basis":"per_day"}
             document: (absent)  at /benefits/2/network_cost_shares/0/cost_shares/2
             reading:  pbp_b1a_bendesc_ad_up_nmcs "010" (additional days chosen), pbp_b1a_bendesc_amo_ad "2" (Mandatory), pbp_b1a_bendesc_lim_ad "1" (unlimited), pbp_b1a_copay_ad_intrvl_num_t1 "1" (Zero intervals). With 0 intervals the file gives no day range and no amount for the additional days, so the importer writes no step; the cell is quoted in the tier notes. Writing $0 would need a start day the file does not state.
MATCH      p3   Inpatient hospital, out of network (POS option) [INPATIENT_HOSPITAL]
READING    p3   Outpatient hospital, in network [OUTPATIENT_HOSPITAL]
             text:     $350 copay
             printed:  [{"type":"copay","amount":350}]
             document: [{"type":"copay","sequence":1,"amount_min":0,"amount_max":350,"basis":"per_visit","applies_to_deductible":false,"applies_to_moop":true}]  at /benefits/3/network_cost_shares/0/cost_shares
             reading:  pbp_b9a_copay_ohs_amt_min "0.00", _max "350.00". The document prints $350 only and no $0 outpatient row; on H2406-013 the $0 end was the colonoscopy (spec 5.5). The importer writes the range.
MATCH      p3   Outpatient hospital, out of network (POS option) [OUTPATIENT_HOSPITAL]
READING    p3   Emergency care, both networks [EMERGENCY]
             text:     $130 copay for emergency care (in both columns)
             printed:  [{"tier_id":"IN","cost_shares":[{"type":"copay","amount":130}]},{"tier_id":"POS","cost_shares":[{"type":"copay","amount":130}]}]
             document: [{"tier_id":"IN","covered":true,"cost_shares":[{"type":"copay","sequence":1,"amount":130,"applies_to_deductible":false,"applies_to_moop":true,"notes":"Waived...  at /benefits/6/network_cost_shares
             reading:  The file prices 4a once, with no network, and no POS group lists 4a; written on the in-network tier only with a note (decision 5, spec 7.13).
READING    p3   Urgent care, both networks [URGENT_CARE]
             text:     $30 copay for urgent care (in both columns)
             printed:  [{"tier_id":"IN","cost_shares":[{"type":"copay","amount":30}]},{"tier_id":"POS","cost_shares":[{"type":"copay","amount":30}]}]
             document: [{"tier_id":"IN","covered":true,"cost_shares":[{"type":"copay","sequence":1,"amount":30,"applies_to_deductible":false,"applies_to_moop":true}],"notes":"pbp_b...  at /benefits/7/network_cost_shares
             reading:  As emergency care: 4b is priced once and no POS group lists it (decision 5).
MATCH      p4   Diagnostic tests and procedures, in network [DIAGNOSTIC_TESTS]
MATCH      p4   Diagnostic tests and procedures, out of network (POS option) [DIAGNOSTIC_TESTS]
MATCH      p4   Lab services, in network [LAB_SERVICES]
MATCH      p4   Lab services, out of network (POS option) [LAB_SERVICES]
MATCH      p4   Diagnostic radiology services (CT/CAT scan, MRI), in network [DIAGNOSTIC_RADIOLOGY]
MATCH      p4   Diagnostic radiology services, out of network (POS option) [DIAGNOSTIC_RADIOLOGY]
MATCH      p4   Outpatient X-rays, in network [XRAY]
MATCH      p4   Outpatient X-rays, out of network (POS option) [XRAY]
MATCH      p4   Diagnostic hearing exam, in network [HEARING_EXAM]
READING    p4   Diagnostic hearing exam, out of network [HEARING_EXAM]
             text:     Not Covered
             printed:  [{"tier_id":"IN"},{"tier_id":"POS","covered":false}]
             document: [{"tier_id":"IN","covered":true,"cost_shares":[{"type":"copay","sequence":1,"amount":38,"applies_to_deductible":false,"applies_to_moop":true}],"notes":"pbp_b...  at /benefits/22/network_cost_shares
             reading:  No POS group lists 18a, and pbp_c_pos_mc_bendesc_subcats leaves it out; no POS row is written (spec 5.4). Question O1 (section 7).
MATCH      p4   Routine hearing exam, in network [HEARING_EXAM_ROUTINE]
MATCH      p4   Routine hearing exam, 1 every year [HEARING_EXAM_ROUTINE]
READING    p4   Routine hearing exam, out of network [HEARING_EXAM_ROUTINE]
             text:     Not Covered
             printed:  [{"tier_id":"IN"},{"tier_id":"POS","covered":false}]
             document: [{"tier_id":"IN","covered":true,"cost_shares":[{"type":"copay","sequence":1,"amount":0,"applies_to_deductible":false,"applies_to_moop":true}],"notes":"pbp_b1...  at /benefits/23/network_cost_shares
             reading:  No POS group lists 18a1, and pbp_c_pos_nmc_bendesc_subcats ("13d;13e;14c15;") leaves it out; no POS row is written (spec 5.4). Question O1 (section 7).
MATCH      p5   Hearing aids, covered in network [HEARING_AIDS]
MATCH      p5   Hearing aids, allowance [HEARING_AIDS]
READING    p5   Hearing aids, out of network [HEARING_AIDS]
             text:     Not Covered
             printed:  [{"tier_id":"IN"},{"tier_id":"POS","covered":false}]
             document: [{"tier_id":"IN","covered":true,"cost_shares":[{"type":"copay","sequence":1,"amount":0,"basis":"per_aid","applies_to_deductible":false,"applies_to_moop":fals...  at /benefits/26/network_cost_shares
             reading:  No POS group lists 18b1, and pbp_c_pos_nmc_bendesc_subcats leaves it out; no POS row is written (spec 5.4). Question O1 (section 7).
33 checks: 23 MATCH, 10 READING, 0 DIFFERENCE
```

### Whole-file run

`scratch/pbp-bulk2.js` over the CY 2027 file on 2026-10-06, after the session 3 decisions: **6,872 MVP plans built, 0 errors, 0 schema failures, 117 warnings**; 185,431 benefits written. Warnings by kind: `medicare-covered-cost-share-blank` 117 (inpatient on the 117 Part B-only plans, not written); `service-in-more-than-one-group` 0; `oon-category-without-group` 0; `supplemental-offer-blank` 0. `network_tier` values: `IN` 7,731, `OUT` 329, `POS` 95, `null` 48. Decision S1: 14,109 $0 steps. Decision 5: 3,757 plans. Decision A5: 12 plans.

### Open questions

- P1 (carrier: marketing or legal name), H1 (coverage basis "Both"), H2 (per-pair hearing aid copays).
- O1 (a covered category the POS or out-of-network lists leave out, 7.14).
- The HL7 validator run over the 5 PBP Bundles ("FHIR Bundles and HL7 validation" above).
- The readings at the end of section 7.
