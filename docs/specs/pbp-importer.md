# Spec: CMS Plan Benefit Package (PBP) Benefits to BPS importer

**Status:** Draft, 2026-10-06. Phase 1 (sources, layout, MVP field map, 1 proven parse) and phase 2 session 1 (the plan level: `scripts/from-pbp.js`, sections 3, 4 and 11) are done. Benefits (section 5) are session 2; golden files and the test (section 13) are session 3.
**Reads with:** [`pbp-record-layout-notes.md`](pbp-record-layout-notes.md) (every PBP file, its key and grain), [`marketplace-puf-importer.md`](marketplace-puf-importer.md) (the pattern this importer follows), [`../medicare-advantage-notes.md`](../medicare-advantage-notes.md) (gaps G1 to G14)

This spec defines the second importer for the Benefit Plan Standard (BPS): the CMS Medicare Advantage PBP Benefits files in, one BPS document per plan out. It follows the Marketplace importer's pattern: 1 direction, 1 plan in and 1 document out, nothing invented, nothing dropped silently, the mapping in a data file, deterministic output, golden files and a test. Sections marked **Not yet** are headings kept for phase 2.

---

## 1. Scope

- One direction: PBP files to BPS JSON. The importer never writes FHIR.
- One plan in, one BPS v1.2.0 document out. A plan is 1 PBP key: contract (`pbp_a_hnumber`), plan (`pbp_a_plan_identifier`) and segment (`segment_id`), written `H2406-013-000` (section 4.1).
- Medicare Advantage plan types only for the MVP: 01 HMO, 02 HMOPOS, 04 Local PPO, 31 Regional PPO. Part D-only plans (29, 30), PACE (20), MSA (07), PFFS (09) and cost plans (18) are refused until someone asks for them; the B files hold no cost shares for PACE, MSA and 3 cost plans anyway (layout notes, section 2).
- The importer never adds a value the files do not contain. In particular it does not fill in Medicare-defined amounts (the Part A or Part B deductible) that the files name but do not state (section 7).
- Nothing is dropped silently: a value with no BPS field goes to `source_references` or a tier `notes`, as in the Marketplace importer.
- The schema is not changed. Section 9 lists the gaps.

**Schema version: v1.2.0** (decided 2026-10-06). The output is checked against `schema/v1.2.0/benefit-plan.schema.json`, the draft in the repo, not v1.1.0 as the Marketplace importer uses. Why: the PBP data needs fields that only v1.2.0 has, and v1.1.0 would push them into free text:

| PBP content | v1.2.0 field | v1.1.0 |
|---|---|---|
| Contract, plan and segment | `plan_identifiers` | no identifier field |
| Service area counties | `service_area` | none |
| Copay and coinsurance ranges (minimum and maximum columns; 1,230 plans for specialists) | `amount_min`/`amount_max`, `rate_min`/`rate_max` | `notes` only |
| Inpatient day intervals (days 1 to 5, 6 to 90) | `unit_range` | `notes` only |
| Hearing aid limits per ear or for both ears | `limits[].scope` | none |
| Mandatory or optional supplemental benefits | `coverage_basis` | none |
| Hospital cost-sharing tiers inside the network | `tier_class` `cost_designation`, `parent_tier_id` | none |

## 2. Sources

| Item | Value |
|---|---|
| Index page (all years) | https://www.cms.gov/data-research/statistics-trends-and-reports/medicare-advantagepart-d-contract-and-enrollment-data/benefits-data |
| CY 2027 page | https://www.cms.gov/data-research/statistics-trends-and-reports/medicare-advantagepart-d-contract-and-enrollment-data/benefits-data/pbp-benefits-2027 |
| CY 2027 zip | https://www.cms.gov/files/zip/pbp-benefits-2027.zip |
| Release label | "PBP Benefits-2027", Report Period 2027. No quarter on the page. Zip `Last-Modified` Thu, 01 Oct 2026 17:45:40 GMT. |
| Layout | `PBP_Benefits_2027_dictionary.xlsx` and `Readme_PBP_Benefits_2027.txt`, inside the zip |

The index page also lists CY 2026 (`pbp-benefits-2026`), CY 2026 JSON (`pbp-benefits-2026-json`, `pbp-benefits-2026-json-0`) and CY 2025 JSON pages. No 2027 JSON release is listed. This draft reads the tab-delimited text files only.

## 3. Files, inputs and outputs

- **Where the files go.** `data/pbp/<year>/`, unzipped next to the zip. `data/` is in `.gitignore`.
- **Download record.** `data/pbp/2027/download.json`: `downloaded` (2026-10-06), `source_page`, `index_page`, `release_label`, `report_period`, `quarter` (null, see layout notes Question 1), `urls`, `zip_last_modified`, `zip_bytes`, and `sha256` of the zip and each of the 144 files in it.
- **Reading.** Tab-delimited, CRLF, header row, no quoting, read as Windows-1252 (layout notes, section 2). The files are streamed; each chunk decodes on its own because Windows-1252 is 1 byte per character. A record whose field count differs from the header, or a CR or LF inside a record, is an error. Columns are matched by lowercased name; a repeated name must hold the same value in both places or it is an error. File names are matched case-insensitively. No npm dependency is added.
- **Files read for the plan level.** `pbp_Section_A`, `pbp_Section_C`, `pbp_Section_C_OON` and `pbp_Section_C_POS` (only whether the plan has rows), `pbp_Section_D`, `pbp_b1a_inpat_hosp`, `pbp_b1b_inpat_hosp` and `pbp_b2_snf` (hospital cost-tier flags only), `PlanArea`, `PlanRegionArea`. One plan takes about 5 seconds, most of it the 172 MB `PlanArea.txt`.
- **Rows.** For each file, the rows whose `pbp_a_hnumber` and `pbp_a_plan_identifier` equal the key and whose `segment_id`, read as a number, equals the key's segment. More than 1 row in a 1-per-plan file is an error; no row in `pbp_Section_A` is an error.
- **Output.** 1 BPS v1.2.0 document, checked against the v1.2.0 schema with the same local Ajv setup as the Marketplace importer before it is written. A document that fails is not written. Until session 2, `benefits` is an empty array and a `source_references` entry says so. Golden files (session 3): `examples/<slug>.pbp.json`.

## 4. Plan-level mapping

Built by `scripts/from-pbp.js` (phase 2, session 1). Checked on 2026-10-06 over every MVP plan in the CY 2027 files: all 6,872 HMO, HMOPOS, local PPO and regional PPO plans build with 0 errors and pass the v1.2.0 schema.

### 4.1 Plan fields

| BPS | PBP file : column | Rule |
|---|---|---|
| `plan_id` | `pbp_Section_A` : `pbp_a_plan_name` and the key | The plan name uppercased, each run of other characters changed to `_`, then `_` and the key with `-` changed to `_`; the name is cut back at `_` until the whole is at most 64 characters. Example: `AARP_MEDICARE_ADVANTAGE_FROM_UHC_FL_0021_PPO_H2406_013_000`. Unique, because the key is. |
| `plan_identifiers[]` | `pbp_a_hnumber`, `pbp_a_plan_identifier`, `segment_id` | `cms_contract_plan_segment` `H2406-013-000`, `cms_contract_id` `H2406`, `cms_pbp_id` `013`. No `source`: the file itself carries the values. |
| `plan_name` | `pbp_a_plan_name` | Verbatim, trimmed. |
| `carrier` | `pbp_a_org_marketing_name` | Verbatim, trimmed. `pbp_a_org_name` (legal name) to `source_references`. Question P1 (marketing or legal name) stays open; marketing name until answered. |
| `plan_type` | `pbp_a_plan_type` | 01 `HMO`; 04 and 31 `PPO`; 02 `HMOPOS`, the dictionary label verbatim, because `vocabularies/plan-types.json` has no HMO-POS code (`scripts/validate.js` warns; Question P2). The code and label go to `source_references`. Any other plan type is refused. |
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
| `IN` | The Section B files, which carry no network qualifier; the Readme describes `pbp_Section_C.txt` as the out-of-network data. `tier_class` `network`. Question T1 (confirm against the Summary of Benefits) stays open. | Always. |
| `OUT` | `pbp_Section_C` : `pbp_c_oon_yn`. `tier_class` `network`. | `pbp_c_oon_yn` is `1` (2,484 MVP plans: every local and regional PPO). The importer checks that the plan has `pbp_Section_C_OON` rows exactly when the flag is `1`. |
| `POS` | `pbp_Section_C` : `pbp_c_pos_yn`. `tier_class` `network`. | `pbp_c_pos_yn` is `1` (1,273 plans: every HMOPOS). Checked against `pbp_Section_C_POS` rows the same way. |
| `IN_1A_TIER_<n>`, `IN_1B_TIER_<n>`, `IN_2_TIER_<n>` | `pbp_b1a`, `pbp_b1b`, `pbp_b2` : `<p>_cost_vary_tiers_yn`, `<p>_cost_vary_tier_num`, `<p>_cost_vary_low_tier`, `<p>_ad_cost_vary_tiers_yn`, `<p>_ad_cost_vary_tier_num`. `tier_class` `cost_designation`, `parent_tier_id` `IN`. | The stay flag or the additional-days flag is `1` (89 plans have at least 1 such category). 1 tier per tier number. The description quotes the 5 cells and marks the lowest-cost tier; the files do not name the facilities in a tier, so `provider_set` is not written. Tiers are per service category, because nothing says tier 1 for 1a and tier 1 for 2 are the same facilities. |

HMO plans have neither `OUT` nor `POS`. No plan in the CY 2027 files declares both.

### 4.3 Accumulators

Section D has no family amounts, so no family slot is written. A written slot has `amount`, `currency` `USD`, `network_tier` and `applies_to` `medical`; `period` is not written (the files do not say plan year or calendar year). A deductible family whose `_yn` is `2` ("No") writes no slot, and a `source_references` entry quotes it; no `$0` is written for "No" (Question A4).

| BPS slot | Plan types | PBP `pbp_Section_D` columns | Rule |
|---|---|---|---|
| `individual_deductible`, `network_tier` `in-network` | 01, 02 | `pbp_d_inn_deduct_yn`, `pbp_d_inn_deduct_partb_yn`, `pbp_d_inn_deduct_amt` | `yn` 1 and `partb_yn` 2 with an amount: written. `partb_yn` 1 (Medicare-defined Part B deductible, no amount in the file): no slot; `source_references` (gap 9.1). |
| `individual_deductible`, by scope | 04, 31 | `pbp_d_ann_deduct_yn`, `_amt_type`, `_amt`, `_bens`, `_inn_mc_yn`, `_inn_nmc_yn`, `_oon_nmc_yn` | Type 4 with an amount and a scope naming in-network services only (`_bens` position 2 or 3, not 1): `network_tier` `in-network`. Type 4 with a blank scope, or a scope that includes position 1 (out-of-network non-Medicare-covered): **amount written, `network_tier` `null`**, and a `source_references` entry quoting all 7 cells (decision 2, section 7). Types 1 to 3 (Medicare-defined, no amount): no slot; `source_references` (gap 9.1). |
| `oon_individual_deductible`, `network_tier` `out-of-network` | 02 | `pbp_d_oon_deduct_yn`, `_partb_yn`, `_amt` | As the in-network family. |
| (no slot) | 02 | `pbp_d_comb_deduct_yn`, `_partb_yn`, `_amt` | `source_references` (gap 9.1). |
| `individual_oop_max`, `network_tier` `in-network` | all | `pbp_d_out_pocket_amt_yn`, `pbp_d_out_pocket_amt` | `yn` 1: written. The type (`pbp_d_out_pocket_amt_type`: 1 Lower, 2 Mandatory, 3 Intermediate) goes to `source_references` (gap 9.1). |
| (no slot) | 02, 04, 31 | `pbp_d_comb_max_enr_amt_yn`, `_amt`, `_amt_type` | `source_references` (gap 9.1). |
| `oon_individual_oop_max`, `network_tier` `out-of-network` | 02, 04 | `pbp_d_oon_max_enr_oopc_yn`, `_amt` | `yn` 1: written. |

A PPO with the in-network, out-of-network or combined deductible family filled, or an HMO or HMOPOS with the annual family filled, is an error; none occurs in the CY 2027 files. Every non-blank cell of the deductible and out-of-pocket families, including the differential and service-category deductible amounts (`pbp_d_diff_deduct_*`, `pbp_d_mand_deduct_*`, `pbp_d_deduct_*`), is also quoted verbatim in 1 `source_references` entry.

Counts over the 6,872 MVP plans: 859 in-network deductible slots, 266 deductible slots with `network_tier` `null`, 32 out-of-network deductible slots, 174 out-of-network out-of-pocket slots.

**HMO-POS and the out-of-network families.** No HMOPOS plan declares an out-of-network benefit (`pbp_c_oon_yn` is blank on all 1,273; all declare POS), yet 115 answer `pbp_d_oon_deduct_yn` with 1, 148 have a combined out-of-pocket maximum and 63 an out-of-network maximum. The dictionary names these columns "Out-of-Network" and "Combined (In-Network and Out-of-Network)" and never mentions POS. The importer writes the slots with the file's wording (`network_tier` `out-of-network`) and adds a `source_references` entry saying the plan declares POS and no out-of-network benefit. **Question A3:** do these values apply to the POS option? The Aetna Medicare Select Extra (HMO-POS) Summary of Benefits can settle it ($500 out-of-network deductible, $10,100 combined maximum; section 13).

### 4.4 Source references

Every entry is an `excerpt`, in this order:

1. **Source.** Release, zip URL, download date, the files read, and the key as the file writes it (`segment_id "0"`).
2. **Plan type.** The code, its dictionary label and what was written.
3. **Section A values with no BPS field,** each as `column "value"`, blanks skipped: `bid_id`, `version`, `orgtype`, `pbp_a_org_name`, `pbp_a_org_type`, `pbp_a_ben_cov`, `pbp_a_network_flag`, `pbp_a_plan_geog_name`, `pbp_a_segment_name`, `pbp_a_eghp_yn`, `pbp_a_special_need_flag`, `pbp_a_special_need_plan_type`, `pbp_a_snp_institutional_type`, `pbp_a_snp_cond`, `pbp_a_snp_pct`, `pbp_a_dsnp_zerodollar`, `pbp_a_snp_state_cvg_yn`, `pbp_a_contract_partd_flag`, `pbp_a_hospice_care_yn`, `pbp_a_continue_yn`, and the 4 web addresses.
4. **Service area.** Each county's SSA code, name, state, `partial_flag` and `eghp_flag`; a note when the counties span more than 1 state; regions for regional plans.
5. **Accumulator readings,** 1 entry each: the deductible reading (with the decision 2 note when it applies), "No" answers, Medicare-defined deductibles, the combined deductible, the maximum's type, the combined maximum, and the HMO-POS note (4.3).
6. **Every non-blank deductible and out-of-pocket cell** of Section D, verbatim, in file order.
7. **Benefits not yet imported** (until session 2).

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

The row whose 3 key columns equal the requested plan, in each file. Every file listed here has exactly 1 row per plan for the MVP columns (layout notes, section 6). Zero rows or 2 rows is an error. UF and SSBCI group files (`*_vbid_*`, keyed also by `pbp_vbid_group_id`) and optional supplemental step files (keyed also by `pbp_d_opt_identifier`) are not read for the MVP.

### 5.2 Crosswalk

**Not yet.** Proposed: `fhir/pbp-crosswalk.json`, 1 row per PBP service category code (`1a`, `7a`, `7d`, `18b` and so on, the codes in `pbp_d_ann_deduct_inn_mc_cats`) to a `canonical_key`, a `category` and a column prefix, under the CARIN rule (no nearest fit). Known so far: `7a` to `primary_care`, `7d` to `specialist`, `1a` to `inpatient_hospital`. Hearing aids (`18b`) have no canonical key in `vocabularies/canonical-benefits.json` (section 9).

### 5.3 Benefit fields

**Not yet.** Proposed: `benefit_type` `medical` (hearing `hearing`, as in the Humana example), `coverage_basis` `medicare_covered` for Medicare-covered categories and from `_bendesc_amo_*` (2 Mandatory, 3 Optional, 4 Both) for supplemental ones.

### 5.4 Tier rows and `covered`

For a Medicare-covered category the files carry cost shares but no covered flag. **Question D1:** should the importer write `covered: true` for a Medicare-covered category whose cost-share columns are filled, and what should it write when they are all blank? For a supplemental category, `<prefix>_bendesc_yn` (1 Yes, 2 No) says whether the plan offers it. Section 5.7 applies this to hearing aids.

### 5.5 Cost-share steps (MVP columns)

The B files use 1 pattern per service, verified for 7a and 7d (18b uses the same flags with amount columns per aid type, section 5.7):

| Column | Dictionary | Allowed values | BPS |
|---|---|---|---|
| `<p>_copay_yn` | "Is there a copayment?" | 1 Yes, 2 No, 3 Yes with a min & max (0 rows use 3 in 7a and 7d) | 1: a `copay` step |
| `<p>_copay_amt_mc_min`, `<p>_copay_amt_mc_max` | Minimum, maximum copayment | NUM 7, 2 decimals | equal: `amount`; different: `amount_min`, `amount_max` (v1.2.0) |
| `<p>_coins_yn` | "Is there a coinsurance?" | 1, 2, 3 as above | 1: a `coinsurance` step |
| `<p>_coins_pct_mc_min`, `<p>_coins_pct_mc_max` | Minimum, maximum coinsurance | NUM 3, whole percent | equal: `rate` = pct / 100; different: `rate_min`, `rate_max` |
| `<p>_ded_yn`, `<p>_ded_amt` | "Is there a deductible?", amount | 1, 2; NUM 7 | A service-level deductible, separate from the plan deductible; no BPS field (section 9) |
| `<p>_auth_yn`, `<p>_refer_yn` | Authorization, referral required | 1, 2 | `conditions[]` of type `authorization`, `referral` |

7a has no `_auth_yn` or `_refer_yn` column; 7d has both. Ranges are common for specialists: the copay minimum and maximum differ on 1,230 of the 4,234 plans with a 7d copay (the spike plan: $0 to $65), and on 19 of the 2,889 plans with a 7a copay. **Question C1:** what does a range mean on the Summary of Benefits (a range across provider types, or something else)? The dictionary only says "Minimum" and "Maximum".

`applies_to_deductible`: the plan deductible's category list (`pbp_d_inn_deduct_*` or `pbp_d_ann_deduct_inn_mc_cats`) says which categories the deductible applies to. Proposed: true when the benefit's category code is in that list or the `_m_yn` column says it applies to all; false when the plan has no deductible; not written when the scope is blank (4.3).

**Inpatient (1a), tier 1, Medicare-covered stay.** `pbp_b1a_copay_yn`; `pbp_b1a_mc_copay_cstshr_yn_t1` (1: the plan charges the Medicare-defined cost share; no amount in the file); `pbp_b1a_copay_mcs_amt_t1` ("Copayment for Medicare-covered stay"); `pbp_b1a_copay_mcs_int_num_t1` (1 Zero, 2 One, 3 Two, 4 Three intervals); per interval `pbp_b1a_copay_mcs_amt_int<n>_t1`, `_bgnd_int<n>_t1`, `_endd_int<n>_t1` (begin and end day). Proposed: 1 `copay` step per interval with `basis` `per_day` and `unit_range` `{from, to}` (v1.2.0). The coinsurance side has the same shape (`pbp_b1a_coins_mcs_pct_t1`, `..._pct_int<n>_t1`). **Question C2:** is `pbp_b1a_copay_mcs_amt_t1` a per-stay amount, a per-admission amount or a per-benefit-period amount? The dictionary title does not say. It is `0.00` on 4,236 plans.

### 5.6 Limits (MVP part C)

The B files repeat 3 limit patterns:

| Pattern | Columns | Allowed values | BPS `limits[]` |
|---|---|---|---|
| Quantity per period | `<p>_bendesc_lim_<x>` (1 = unlimited, 2 = limited), `<p>_bendesc_num_<x>` or `_numv_<x>` or `_amt_<x>`, `<p>_bendesc_per_<x>`, `<p>_bendesc_per_<x>_d` | per: 1 Every three years, 2 Every two years, 3 Every year, 4 Every six months, 5 Every three months, 6 Other (describe), 7 Every month | `type` from the column (visits, items), `value`, `period` `per_3_years`, `per_2_years`, `per_year`, `per_6_months`, `per_3_months`, `per_month`; code 6 puts the `_d` text in `raw_text` |
| Dollar maximum | `<p>_maxplan_yn`, `<p>_maxplan_amt`, `<p>_maxplan_per`, `<p>_maxplan_per_d` | same periodicity codes | `type` `dollars` |
| Additional inpatient days | `pbp_b1a_bendesc_lim_ad`, `pbp_b1a_bendesc_amt_ad` ("Number of Additional Days per benefit period") | NUM 3 | `type` `days`, `period` `per_benefit_period` |

Not a limit, and with no BPS field: the service-specific MOOP `<p>_maxenr_yn`, `_amt`, `_per` (section 9).

### 5.7 Covered or excluded: hearing aids (MVP part D)

In `pbp_b18_hearing_exams_aids`:

| Column | Allowed values | Across 7,365 plans | BPS |
|---|---|---|---|
| `pbp_b18b_bendesc_yn` | 1 Yes, 2 No | 5,187 Yes, 1,740 No, 438 blank (PACE, MSA, 3 cost plans) | 1: `covered: true`; 2: `covered: false` with no cost shares; blank: no benefit written |
| `pbp_b18b_bendesc_ehc` | position string: 1 Over the Ear, 2 All types, 3 Inner Ear, 4 Outer Ear | `0100` (all types) on 5,185, `1011` on 2 | which aid types; proposed: 1 benefit per type chosen |
| `pbp_b18b_bendesc_amo_at` | 2 Mandatory, 3 Optional, 4 Both | 5,155 Mandatory, 30 Both | `coverage_basis` `supplemental_mandatory` or `supplemental_optional`; **Question H1:** what to write for 4 Both |
| `pbp_b18b_bendesc_lim_at`, `_numv_at`, `_per_at` | quantity per period | 4,635 plans say 2 aids; period 3 Every year on 4,184 | `limits[]` `type` `hearing_aids` |
| `pbp_b18b_maxplan_yn`, `_amt`, `_per`, `_perear` | perear 1 Per ear, 2 One single ear, 3 Both ears combined | 2,402 plans have a maximum | `limits[]` `type` `dollars`, `scope` `per_ear` or both ears (v1.2.0 `scope`) |
| `pbp_b18b_maxplan_in_oon` | 1 In-network services only, 2 Both in-network and out-of-network services | | `source_references` |
| `pbp_b18b_copay_yn`, `pbp_b18b_copay_at_min_amt`, `_max_amt` (and per-type, per-1 and per-2 aid columns) | | 4,637 plans have a copay | `copay` step; the per-2-aids amounts have no basis value in BPS (**Question H2**) |
| `pbp_b18b_auth_yn`, `pbp_b18b_refer_yn` | 1, 2 | | `conditions[]` |

The spike plan H2406-013: `bendesc_yn` 1, all types, Mandatory, 2 aids every year, $700 maximum every year for both ears combined, applying in and out of network, $0 copay, authorization required.

## 6. Cost-share values

There is no string grammar: PBP cost shares are numbers in typed columns. The reading rules are: `NUM` amounts are decimal text and are read exactly; percentages are whole numbers; a `_yn` of `2` means no step; blank means not stated. Any other code than those in the dictionary is an error with the column and value quoted. **Not yet** tested over the whole file.

## 7. Where the public file and the schema disagree

| # | Concept | Reading |
|---|---|---|
| 7.1 | Combined (in and out of network) out-of-pocket maximum and deductible | No slot. Carried verbatim in `source_references`, as the Marketplace importer does with `CombInnOon`. Gap 9.1. |
| 7.2 | Medicare-defined amounts named but not stated (deductible types 1 to 3, the Part B deductible flag; in session 2, `mc_copay_cstshr_yn` 1) | Nothing written in the slot or step; `source_references` (or, in session 2, tier `notes`) quote the columns. Gap 9.1. |
| 7.3 | PPO annual deductible with a blank scope | **Decision 2 (2026-10-06):** the amount is written in `individual_deductible` with `network_tier` `null` (scope unstated; an explicit `null`, because the slot otherwise defaults to in-network), and a `source_references` entry quotes the 7 annual-deductible cells. Accumulator slots have no notes field, so the note cannot sit on the slot itself. The same reading is used when the scope includes out-of-network services. 266 plans. |
| 7.4 | Copay or coinsurance range | `amount_min`/`amount_max` or `rate_min`/`rate_max` (v1.2.0). Session 2. |
| 7.5 | Periodicity "Every year" | `per_year`; the files do not say plan or calendar year. Session 2. |
| 7.6 | A deductible family answered "No" | No slot, and a `source_references` entry quotes the "No". A `$0` slot is not written (Question A4). |
| 7.7 | HMO-POS out-of-network families with no out-of-network benefit | Written with the file's wording; `source_references` says the plan declares POS only (4.3, Question A3). |

> **TODO (decision 2, Diego).** Confirm the reading of the PPO annual deductible with a blank scope against the H2406-013 (AARP Medicare Advantage from UHC FL-0021, PPO) 2027 Summary of Benefits: does the $1,000 apply in network, out of network, or both? Until then the importer writes `network_tier` `null` (7.3). Not resolved here.

## 8. Lossy and unmapped items

**Not yet** as a full table. Known: service-level deductibles (`<p>_ded_amt`), service-specific out-of-pocket maximums (`<p>_maxenr_*`), the MOOP type (Lower, Intermediate, Mandatory), the employer-only and SNP flags, UF and SSBCI group cost sharing, and optional supplemental packages.

**Later, not mapped now.** Where the non-MVP supplemental benefits sit:

| Benefit | File | Column prefix | Also in |
|---|---|---|---|
| OTC items | `pbp_b13_other_services` | `pbp_b13b_` (53 columns; `pbp_b13b_bendesc_otc` 1 Yes, 2 No; `pbp_b13b_maxplan_amt`) | `pbp_b13_b19b_other_services_vbid_uf`, `pbp_step13` |
| Meals | `pbp_b13_other_services` | `pbp_b13c_` (47 columns) | same |
| Transportation | `pbp_b10_amb_trans` | `pbp_b10b_` (99 columns) | `pbp_b10_b19b_amb_trans_vbid_uf`, `pbp_step10b` |
| Dental | `pbp_b16_dental` | `pbp_b16a_` Medicare-covered, `pbp_b16b_` preventive (238 columns), `pbp_b16c_` comprehensive (338) | `pbp_b16_b19b_dental_vbid_uf`, `pbp_step16` |
| Vision | `pbp_b17_eye_exams_wear` | `pbp_b17a_` exams (91), `pbp_b17b_` eyewear (198) | `pbp_b17_b19b_eye_exams_wear_vbid_uf`, `pbp_step17a`, `pbp_step17b` |
| Non-health SSBCI (food, produce, non-medical transportation) | `pbp_b13i_b19b_services_vbid_ssbci`, `pbp_b13i_b19b_other_services_vbid_ssbci` | `pbp_b13i_` | |

## 9. Schema gaps found

### 9.1 In the PBP files, not in BPS

Each value below is carried verbatim in `source_references` (or, from session 2, in a tier or step `notes`). Nothing is invented. The last column proposes a v1.2.0 field; none is added to the schema here.

| PBP content | Gap | Where it is carried | Proposed v1.2.0 field |
|---|---|---|---|
| Combined in-and-out-of-network out-of-pocket maximum (`pbp_d_comb_max_enr_amt`; 2,646 plans) | No combined slot | `source_references` | `accumulators.combined_oop_max` (an `oop_max_accumulator`; `network_tier` `combined`) |
| Combined in-and-out-of-network deductible (`pbp_d_comb_deduct_amt`; 113 plans) | No combined slot | `source_references` | `accumulators.combined_deductible` (a `deductible_accumulator`) |
| Medicare-defined deductible with no amount in the file (`pbp_d_ann_deduct_amt_type` 1 to 3: 818 plans; `pbp_d_inn_deduct_partb_yn` 1: 1,273) | Deductible slots require `amount` | `source_references` | `deductible_accumulator.amount_basis` with values `medicare_part_a_deductible`, `medicare_part_b_deductible`, `medicare_part_a_and_b_deductible`, and `amount` required only when `amount_basis` is absent |
| Out-of-pocket maximum type: Lower, Intermediate, Mandatory (`pbp_d_out_pocket_amt_type`, `pbp_d_comb_max_enr_amt_type`) | No field | `source_references` | `oop_max_accumulator.cms_moop_level` (`lower`, `intermediate`, `mandatory`) |
| Deductible scope as a network and a list of service categories (`pbp_d_ann_deduct_bens`, `pbp_d_*_deduct_*_cats`) | `network_tier` holds 1 network; no category list | `source_references`; per-step `applies_to_deductible` (session 2) | `deductible_accumulator.applies_to_categories` (array of category codes), and a documented meaning for an explicit `network_tier` `null` ("not stated"), as G8 did for `moop_applicability` |
| Service-level deductibles (`<p>_ded_amt` in the B files; `pbp_d_diff_deduct_*`, `pbp_d_mand_deduct_*`, `pbp_d_deduct_*` in Section D) | No per-benefit deductible amount | `source_references` (Section D cells, now); session 2 for the B files | A `cost_shares[]` step of `type` `deductible` may already hold it (the schema lists `deductible` as a step type); session 2 checks. Else `benefits[].deductible` (`amount`, `period`) |
| Service-level out-of-pocket maximums (`<p>_maxenr_yn`, `_amt`, `_per`) | `max_amount` caps 1 step per unit, not a yearly cap on a service | session 2: `source_references` | `benefits[].oop_max` (`amount`, `period`) |
| SSA county code (`PlanArea.county_code`) | `counties[]` has `fips` only | `source_references` | `service_area.counties[].ssa_code` |
| Service area across more than 1 state (226 individual plans, 771 employer plans) | `service_area.state` is 1 value; counties carry no state | `state` `null`; `source_references` | `service_area.counties[].state` |
| Partial county (`PlanArea.partial_flag` `*`; 1,030 rows of individual plans) | No field | `source_references` | `service_area.counties[].partial` (boolean) |
| Regions of regional PPOs (`PlanRegionArea`; 73 plans) | Counties only | `source_references` | `service_area.regions[]` (`code`, `name`) |
| Employer-only plan, SNP and SNP type (`pbp_a_eghp_yn`, `pbp_a_special_need_flag`, `pbp_a_special_need_plan_type`) | No field | `source_references` | `eligibility` object (`employer_group_only`, `special_needs_type`) |
| Hospital cost-tier membership (which facilities are tier 1) | The files do not name them | Tier `description` | None needed: `provider_set` exists; the data is missing |
| Medicare-defined cost share on a service (`mc_copay_cstshr_yn` 1) | A step needs an amount or rate | session 2: tier `notes` | Same `amount_basis` idea on `cost_shares[]` |
| Hearing aids | No `canonical_key` in `vocabularies/canonical-benefits.json` | session 2 | Vocabulary: add `hearing_aids` (not a schema change) |
| HMOPOS plan type | No code in `vocabularies/plan-types.json` | `plan_type` `HMOPOS` verbatim; validator warning | Vocabulary: add `HMO-POS` (Question P2) |
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

### 9.3 Exporter limits met on the way to FHIR

**Not yet** checked. Known from the Marketplace work: the converter maps tiers `IN`, `IN2` and `OUT` only, so `POS` and the hospital cost tiers (`IN_1A_TIER_1` and so on) would need a converter decision. A `network_tier` `null` on a deductible has not been run through the converter.

## 10. Determinism

`buildDocument(rows, source)` makes no network call, reads no clock, uses no randomness and keeps no state; `loadPlan` streams the files and passes the rows in. The download date and release label come from `download.json` (or `--downloaded`). Key order is fixed (plan fields in the order of 4.1, `schema_version` last; accumulator slots in schema order; counties in SSA code order; tiers `IN`, `OUT`, `POS`, then hospital tiers by category and number). Amounts are read exactly from the decimal text. Serialization is `JSON.stringify(doc, null, 2)` plus `\n`. The byte-for-byte determinism test is session 3.

## 11. How to run

Getting the files (done on 2026-10-06; `download.json` records it):

```
mkdir -p data/pbp/2027 && cd data/pbp/2027
curl -L -O https://www.cms.gov/files/zip/pbp-benefits-2027.zip
unzip pbp-benefits-2027.zip
```

Import and inspect:

```
node scripts/from-pbp.js --year 2027 --contract H2406                       # list a contract's plans
node scripts/from-pbp.js --year 2027 --plan H2406-013-000 --out h2406.json  # 1 plan, v1.2.0
node scripts/validate.js --schema schema/v1.2.0/benefit-plan.schema.json h2406.json
node scratch/pbp-spike.js H2406-013-0                                       # phase 1 spike (throwaway)
```

Options: `--data <dir>` (default `data/pbp`), `--downloaded YYYY-MM-DD`. Exit code 0 means written or listed; 1 means an error, with nothing written. A plan takes about 5 seconds.

## 12. Re-running for a new plan year

**Not yet.** The Readme's change log lists added, dropped and resized columns per update (the CY 2027 Readme has 3 dated entries: January 5, February 13 and May 22, 2026). A new year's import starts by reading that log and diffing the dictionary.

## 13. Tests and golden files

**Not yet** (session 3). Proposed golden plans: the 3 plans of session 1 below.

### Phase 2, session 1 output

`scripts/from-pbp.js` on 2026-10-06, each document valid against v1.2.0 (`scripts/validate.js`; the HMO-POS draws 1 vocabulary warning, `plan_type` `HMOPOS`). Plan level only; `benefits` is empty.

| Plan | Type | Counties (all FL) | Deductible | Out-of-pocket | Tiers | To check on the Summary of Benefits |
|---|---|---|---|---|---|---|
| H2406-013-000 AARP Medicare Advantage from UHC FL-0021 (PPO), UnitedHealthcare | 04 Local PPO, `PPO` | 7: Clay, Duval, Flagler, Nassau, Putnam, St. Johns, Volusia | $1,000 annual deductible, `network_tier` `null` (decision 2) | in network $7,150 (Intermediate); combined $10,750 (`source_references`) | `IN`, `OUT` | what the $1,000 applies to (TODO, section 7) |
| H1036-068-000 Humana Gold Plus H1036-068 (HMO), Humana | 01 HMO, `HMO` | 9: Alachua, Baker, Bradford, Clay, Columbia, Duval, Nassau, Putnam, St. Johns | none (`pbp_d_inn_deduct_yn` 2); no slot | in network $3,300 (Lower) | `IN` | $0 deductible, $3,300 maximum |
| H1609-028-000 Aetna Medicare Select Extra (HMO-POS), Aetna Medicare | 02 HMOPOS, `HMOPOS` | 11: Charlotte, Clay, Duval, Hillsborough, Manatee, Marion, Osceola, Pinellas, Polk, Sarasota, Seminole | none in network; $500 out of network (`oon_individual_deductible`); combined: none | in network $6,750 (Intermediate); combined $10,100 (`source_references`) | `IN`, `POS` | whether the $500 and $10,100 apply to the POS option (Question A3) |

### Phase 1 spike

`scratch/pbp-spike.js` (throwaway, not under `scripts/`) reads H2406-013-0, AARP Medicare Advantage from UHC FL-0021 (PPO), a local PPO with Duval and St. Johns counties in its service area, and printed on 2026-10-06:

| Item | Value | File : column |
|---|---|---|
| Contract, plan, segment | `H2406`, `013`, `0` | `pbp_Section_A` : `pbp_a_hnumber`, `pbp_a_plan_identifier`, `segment_id` |
| Plan name | AARP Medicare Advantage from UHC FL-0021 (PPO) | `pbp_Section_A` : `pbp_a_plan_name` |
| Deductible | `pbp_d_ann_deduct_yn` 1 Yes, type 4 Other, `1000.00`; scope columns blank (TODO, section 7) | `pbp_Section_D` : `pbp_d_ann_deduct_yn`, `pbp_d_ann_deduct_amt_type`, `pbp_d_ann_deduct_amt`, `pbp_d_ann_deduct_bens` |
| In-network MOOP | `7150.00`, type 3 Intermediate | `pbp_Section_D` : `pbp_d_out_pocket_amt`, `pbp_d_out_pocket_amt_type` |
| Combined MOOP | `10750.00` (type blank) | `pbp_Section_D` : `pbp_d_comb_max_enr_amt` |
| Primary care, in network | copay 1 Yes, `0.00` to `0.00`; coinsurance 2 No | `pbp_b7_health_prof` : `pbp_b7a_copay_yn`, `pbp_b7a_copay_amt_mc_min`, `pbp_b7a_copay_amt_mc_max`, `pbp_b7a_coins_yn` |
| Specialist, in network | copay 1 Yes, `0.00` to `65.00`; coinsurance 2 No | `pbp_b7_health_prof` : `pbp_b7d_copay_yn`, `pbp_b7d_copay_amt_mc_min`, `pbp_b7d_copay_amt_mc_max`, `pbp_b7d_coins_yn` |
| Inpatient hospital, in network | copay 1 Yes; stay `0.00`; 2 intervals: `550.00` days 1 to 5, `0.00` days 6 to 90; coinsurance 2 No; no hospital tiers | `pbp_b1a_inpat_hosp` : `pbp_b1a_copay_mcs_amt_t1`, `pbp_b1a_copay_mcs_int_num_t1`, `pbp_b1a_copay_mcs_amt_int1_t1` to `pbp_b1a_copay_mcs_endd_int2_t1`, `pbp_b1a_coins_yn`, `pbp_b1a_cost_vary_tiers_yn` |

**To check against the plan's 2027 Summary of Benefits:** the $1,000 deductible and what it covers, $7,150 in-network and $10,750 combined maximums, $0 primary care, $0 to $65 specialist, $550 per day for days 1 to 5 of an inpatient stay.
