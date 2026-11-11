# Part D formulary importer: specification and mapping

**Status:** built November 11, 2026: `scripts/from-partd-formulary.js`, its tests in `scripts/from-partd-formulary.test.js`, the 5 examples in `examples/partd-formulary/`, and a run over the whole release in section 15. The schema it writes to is the Benefit Plan Standard 1.2.0 draft 9 (`schema/v1.2.0/benefit-plan.schema.json` and `schema/v1.2.0/formulary.schema.json`). Decisions D1 to D9 of [`partd-formulary/stop-0.md`](partd-formulary/stop-0.md) section 7 were decided by Diego Orofino on 2026-11-11: every recommended answer is accepted, and the sections below write each one.

**Reads with:** [`partd-formulary/stop-0.md`](partd-formulary/stop-0.md) (the file, its counts and the gate list), [`pbp-part-d-mapping.md`](pbp-part-d-mapping.md) (the Part D sections of the Medicare Advantage importer, which write each plan's tiers, networks, stages and cost shares), [`pbp-importer.md`](pbp-importer.md).

## 1. Scope

The importer reads the CMS monthly public use file "Prescription Drug Plan Formulary and Pharmacy Network Information" and writes, for every Medicare Part D plan in it, the plan's drug list: which drugs are on it, on which tier, with which prior authorization, step therapy and quantity limit. It writes 2 kinds of document:

- a **formulary list** (`schema/v1.2.0/formulary.schema.json`), 1 per `FORMULARY_ID`, written once for every plan that uses it;
- a **plan document** (`schema/v1.2.0/benefit-plan.schema.json`): the Medicare Advantage importer's document for the same plan, with `pharmacy.formulary_reference` and the plan's own formulary items added.

| File in the zip | Read | Why |
|---|---|---|
| Plan Information | yes | The join from a plan to its formulary; checks (section 8). |
| Basic Drugs Formulary | yes | The list (section 5). |
| Excluded Drugs Formulary | yes | Drugs Part D excludes that a plan covers as a supplemental benefit (section 6.1). |
| Beneficiary Cost | yes | The tier proof, the comparison with the PBP document, and the tiers of a Defined Standard plan (sections 7.3 and 8; D4, D7). |
| Indication Based Coverage | yes | Drugs on a formulary for named indications only (section 6.2; D5). |
| Insulin Beneficiary Cost | no | It belongs with the insulin benefits the Part D mapping left open (its question Q1); D9. |
| Geographic Locator | no | The service area comes from the PBP files. |
| Pharmacy Networks (6 parts) | no | Out of scope since October 19, 2026: pharmacy lists and dispensing fees are not plan design. |

## 2. Sources

- The zip, `YYYY_YYYYMMDD.zip`: the first 4 digits are the contract year, the last 8 the date CMS posted it (Methodology). Release `2027_20261008`: https://data.cms.gov/sites/default/files/2026-10/73ce0d29-e440-4d9a-9608-93678a50e8c8/2027_20261008.zip, from the dataset page https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/monthly-prescription-drug-plan-formulary-and-pharmacy-network-information.
- The record layout and the methodology: `PUFRecordLayout-2027.pdf` and `Methodology-PUF-2027.pdf` on data.cms.gov (stop 0, section 1). Not in the zip.
- On disk: `data/partd-formulary/<release>/` (git-ignored), with the zip, `txt/` holding the text files under their names in the zip (the double spaces in "basic drugs formulary file  20261031.txt" kept), and a `download.json` that records the URLs, the download date, `Last-Modified` and every SHA-256. The importer reads the text files and `download.json`; it never fetches.
- The PBP files of the same contract year, `data/pbp/<year>/`, through `scripts/from-pbp.js`.

Every file is pipe-delimited ASCII with a header row and CRLF line ends. The importer checks each header against the column list below, name by name and in order, and stops with an error that quotes both when they differ.

## 3. Join and grain

- **A plan** is `CONTRACT_ID`-`PLAN_ID`-`SEGMENT_ID`, as in `H2406-013-000`. Plan Information has 1 row per plan and county for local Medicare Advantage plans; `FORMULARY_ID`, `PREMIUM`, `DEDUCTIBLE`, `SNP`, `PLAN_NAME`, `CONTRACT_NAME` and `PLAN_SUPPRESSED_YN` must agree on every row of a plan, or the plan is an error (0 plans in 2027).
- **A formulary** is `FORMULARY_ID`. Its rows in Basic Drugs carry 1 `FORMULARY_VERSION` and 1 `CONTRACT_YEAR`; a second value is an error. 1 row per formulary and `RXCUI` (963,666 rows, 963,666 pairs in 2027); a second row for a pair is an error.
- **Excluded Drugs and Indication Based Coverage** rows are keyed by `CONTRACT_ID` and `PLAN_ID`, with no segment and no formulary: a row belongs to every segment of its contract and plan.
- **Beneficiary Cost** rows are keyed by the plan.
- **The PBP year** is `CONTRACT_YEAR`. A plan the PBP files of that year do not have is an error.

## 4. Command line and outputs

```
node scripts/from-partd-formulary.js --release 2027_20261008 --plan H2406-013-000 [--out <file>]
    1 plan's document whole: the PBP document with formulary_reference and every item inline
node scripts/from-partd-formulary.js --release 2027_20261008 --formulary 00027002 [--out <file>]
    1 formulary list
node scripts/from-partd-formulary.js --release 2027_20261008 --all --out-dir <dir>
    every list once, every plan's document pointing at its list, and report.json
node scripts/from-partd-formulary.js --release 2027_20261008 --report [--out <file>]
    the count report only
node scripts/from-partd-formulary.js --write-golden | --write-fixtures
options: --data <dir> (default data/partd-formulary), --pbp-data <dir> (default data/pbp)
```

`--all` writes:

```
<dir>/formularies/00027002.json    the list (section 5)
<dir>/plans/H2406-013-000.json     the plan (section 7), formulary_items_url "../formularies/00027002.json"
<dir>/report.json                  the count report (section 10)
<dir>/plans.jsonl                  1 line per written plan (section 10)
<dir>/differences.jsonl            1 line per difference of section 8
```

Exit codes: 0 written, 1 an error. `--plan`, `--formulary` and `--report` write nothing on an error. `--all` writes into empty folders (it stops if `formularies/` or `plans/` already holds a document, so that no document of an earlier run is left among this run's), writes every list and every plan it can, lists refusals and errors in the report, and exits 1 when a plan is an error; a list that fails its schema stops it. `--write-fixtures` and `--write-golden` write file by file, and `--write-golden` warns of a file in `examples/partd-formulary/` that is not a golden document any more. Like `buildDocument()` in `scripts/from-pbp.js`, the build is a pure function of the files: no network, no clock, no randomness. The import date written is the download date in `download.json`.

## 5. The list: Basic Drugs Formulary to `formulary_items[]`

**Header:** `FORMULARY_ID|FORMULARY_VERSION|CONTRACT_YEAR|RXCUI|NDC|TIER_LEVEL_VALUE|QUANTITY_LIMIT_YN|QUANTITY_LIMIT_AMOUNT|QUANTITY_LIMIT_DAYS|PRIOR_AUTHORIZATION_YN|STEP_THERAPY_YN|SELECTED_DRUG_YN`.

1 item per row, in the file's order. `T<n>` is `T` followed by the tier number without leading zeros, the id `scripts/from-pbp.js` writes for the same tier.

| Column | Field | Rule |
|---|---|---|
| `FORMULARY_ID` | `formulary_reference.formulary_id` | Verbatim, 8 characters. |
| `FORMULARY_VERSION` | `formulary_reference.formulary_version` | Verbatim (draft 9, gap F2). |
| `CONTRACT_YEAR` | `plan_year` (the list's) | As an integer. |
| `RXCUI` | `rxcui` | Trimmed, as a string. Blank is an error. |
| `NDC` | `ndc` | Verbatim; 11 digits, or an error. The layout calls it a "proxy" NDC; there is 1 per RXCUI in the 2027 file. |
| `TIER_LEVEL_VALUE` | `formulary_tier_id` | `T<n>`. A value that is not a whole number from 1 to 99 is an error. |
| `QUANTITY_LIMIT_YN` | `quantity_limit` present or absent | `Y`: written. `N`: absent, and the amount and days must be blank. Any other value, or `Y` with a blank amount or days, is an error. |
| `QUANTITY_LIMIT_AMOUNT` | `quantity_limit.value` | As a number ("0.50" is 0.5). Not a number: an error. |
| `QUANTITY_LIMIT_DAYS` | `quantity_limit.period` | `per_<days>_days`, the days as a whole number ("28" is `per_28_days`). **999** (600 rows in 2027; the layout does not say what it means): `period` null, and the row in the item's citation quotes it (D6). Not a whole number: an error. |
| (no column) | `quantity_limit.units` | Not written: the file gives no unit (draft 9, gap F3). |
| `PRIOR_AUTHORIZATION_YN` | `prior_authorization` | `Y` true, `N` false, anything else an error. |
| `STEP_THERAPY_YN` | `step_therapy` | As above. `step_therapy_drugs` is not written: the file names none. |
| `SELECTED_DRUG_YN` | `negotiation_selected_drug` | As above (draft 9, gap F5). |
| (every row) | `covered` | true: the file lists the drugs on the formulary. |
| (every row) | `coverage_basis` | `medicare_covered` (draft 9, gap F6). |
| (no column) | `drug_name` | Not written: the file names no drug (draft 9, gap F1; D1). |
| (every row) | `source_references` | 1 citation, section 9. |

Not written, no column: `brand_name`, `generic_name`, `dose_form`, `specialty_pharmacy_required`, `alternatives`, `coverage_exceptions` (section 6.2 writes them on the plan's own items).

**The list document**, keys in the schema's order:

- `formulary_reference`: `formulary_id`, `formulary_version`, `completeness` `full_formulary`, and 1 `data_sources` entry: `source_type` `cms_part_d_formulary`, `source_url` the zip URL, `import_timestamp` the download date, `file_date` the posted date from the zip name (`2026-10-08`), `notes` "CMS Prescription Drug Plan Formulary and Pharmacy Network Information, release 2027_20261008, basic drugs formulary file  20261031.txt, SHA-256 ...". `source_plan_identifiers` and `formulary_items_url` describe 1 plan and are not written in a list.
- `plan_year`: `CONTRACT_YEAR`.
- `formulary_items`: section 5's items.
- `source_references`: 1 entry quoting the header row, so that every item's excerpt can be read column by column.
- `schema_version`: `1.2.0`.

## 6. Items that are the plan's alone

A plan document keeps these in its own `pharmacy.formulary_items`, because the rows that make them are keyed by the plan, not by the formulary.

### 6.1 Excluded Drugs Formulary

**Header:** `CONTRACT_ID|PLAN_ID|RXCUI|TIER|QUANTITY_LIMIT_YN|QUANTITY_LIMIT_AMOUNT|QUANTITY_LIMIT_DAYS|PRIOR_AUTH_YN|STEP_THERAPY_YN|CAPPED_BENEFIT_YN`.

Enhanced alternative plans may cover drugs Part D excludes, as a supplemental benefit (Methodology, file 4). 1 item per row, after the list's items, in the file's order.

| Column | Field | Rule |
|---|---|---|
| `CONTRACT_ID`, `PLAN_ID` | (join) | Every segment of the contract and plan. |
| `RXCUI` | `rxcui` | As in section 5. No `ndc`: no column. |
| `TIER` | `formulary_tier_id` | `T<n>`, as in section 5. |
| `QUANTITY_LIMIT_YN` | `quantity_limit` present or absent | `1` written, `0` absent (the layout's codes for this file, where Basic Drugs uses `Y` and `N`). |
| `QUANTITY_LIMIT_AMOUNT`, `QUANTITY_LIMIT_DAYS` | `quantity_limit.value`, `.period` | As in section 5, 999 included. |
| `PRIOR_AUTH_YN`, `STEP_THERAPY_YN` | `prior_authorization`, `step_therapy` | `Y` true, `N` false. |
| `CAPPED_BENEFIT_YN` | `capped_benefit` | `Y` true, `N` false (draft 9, gap F7). The file gives no amount. |
| (every row) | `covered` true, `coverage_basis` `supplemental_mandatory` | Draft 9, gap F6. The 43 rows in 2027 whose drug is also on the plan's Basic list make 2 items with 1 `rxcui`, told apart by `coverage_basis`. |

### 6.2 Indication Based Coverage (D5)

**Header:** `CONTRACT_ID|PLAN_ID|RXCUI|DISEASE`.

The file lists, for a plan, the indications for which a drug "is considered on-formulary" (layout); the drug is on the plan's Basic list too (112 of 112 rows in 2027). The plan's own item for that drug is the list's item with:

- `covered` false: the schema defines `covered` as the status "when no coverage_exception matches", and the drug is on the formulary only for the listed indications;
- 1 `coverage_exceptions` entry per row, in the file's order: `indication_description` the `DISEASE` text verbatim, `indication_code` null (the file has no code), `coverage_status` `covered`;
- a `source_references` with the Basic row's citation and 1 per indication row.

It replaces the list's item (same `rxcui`, `coverage_basis` `medicare_covered`). An `RXCUI` that is not on the plan's Basic list is an error.

## 7. The plan document

### 7.1 What it starts from

`buildDocument()` of `scripts/from-pbp.js` for the plan, with the PBP files of `CONTRACT_YEAR`. Everything that importer writes stays as it writes it: plan identity, premium, service area, the pharmacy deductible, stages, networks, tiers and Part D benefits. The formulary importer adds to `pharmacy` and to the root `source_references`, and, for a stand-alone drug plan only, `premium` (7.2); it changes nothing else.

### 7.2 What it adds

- `pharmacy.formulary_reference`: `formulary_id`, `formulary_version`, `completeness` `full_formulary`, `source_plan_identifiers` (`cms_contract_id`, `cms_pbp_id`; the schema has no segment field, and no 2 segments of a plan use different formularies in 2027), the `data_sources` entry of section 5, and, in the `--all` layout, `formulary_items_url` `../formularies/<FORMULARY_ID>.json`.
- `premium`, for a stand-alone drug plan (contract `S`) only (decided by Diego Orofino on 2026-11-11, finding N1 of [`partd-formulary/stop-2.md`](partd-formulary/stop-2.md)): `amount` the Plan Information `PREMIUM` (dollars and cents, or an error), `currency` `USD`, `period` `per_month` (the layout: "Monthly premium amount"), in the schema's key order, with a root citation that quotes the cell. No PBP file holds a stand-alone plan's premium; a PBP document that already has one is an error. A Medicare Advantage plan's `PREMIUM` is the Part D part of its premium (section 15) and is not written.
- `pharmacy.formulary_items`: with `--plan`, the list's items with the plan's own items (section 6) merged in: an indication item replaces the list item with its `rxcui` and `coverage_basis`, and the excluded-drug items follow the list's. With `--all`, the plan's own items only, and none when it has none.
- Root `source_references`, after the PBP importer's, each with `document` the zip name: 1 entry that quotes the header and the plan's first Plan Information row and says on how many county rows it repeats; 1 for the formulary (its id, version, contract year, row count and header); 1 each for the plan's Indication Based Coverage and Excluded Drugs rows, when it has any; and 1 for its Beneficiary Cost rows, which says whether the tiers were proved against them or, under section 7.3, read from them. The SHA-256 of each file read for the plan is in `pharmacy.formulary_reference.data_sources[0].notes`.

### 7.3 The tier proof, and Defined Standard plans (D4)

Every item's `formulary_tier_id` must be a `tier_id` in the document's `pharmacy.formulary_tiers`; one that is not is an error. Over the 2027 file this holds for every drug of the 5,285 tiered plans (stop 0, section 2.1).

A Defined Standard plan (`mrx_benefit_type` 1, 207 plans in 2027) has no tier rows in the PBP files, so `scripts/from-pbp.js` writes no `formulary_tiers` ([`pbp-part-d-mapping.md`](pbp-part-d-mapping.md) section 5.7). For such a plan, and only when the PBP document has no `formulary_tiers` and cites `mrx_benefit_type "1" (Defined Standard)` in its root `source_references` (any other plan with no tiers is an error), the formulary importer writes them from the plan's Beneficiary Cost rows: 1 tier per `TIER` value, in number order, `tier_id` `T<n>`, `name` "Tier <n>", `tier_code` `specialty` when `TIER_SPECIALTY_YN` is `Y` on the tier's rows (and an error when the tier's rows disagree), and a `description` that quotes the `TIER` and `TIER_SPECIALTY_YN` values and the row count. It writes no cost shares from the file (D7). A root `source_references` entry says the tiers come from the Beneficiary Cost file because the PBP files hold no tier rows for a Defined Standard plan. For all 207 plans in 2027, the Beneficiary Cost tiers equal the tiers on the plan's formulary.

## 8. Checks that write nothing (D7)

The report lists each difference; none stops the build.

- **Beneficiary Cost against the PBP document.** For a tiered plan, the set of `TIER` values must equal the `formulary_tiers` ids, and a difference is an error, not a report line. Then each cost cell is compared with the PBP document's Part D benefit for the same tier, stage, pharmacy and supply: `COVERAGE_LEVEL` 0, 1 and 3 with the stages `DEDUCTIBLE`, `INITIAL` and `CATASTROPHIC`; the `PREF`, `NONPREF`, `MAIL_PREF` and `MAIL_NONPREF` columns with `RETAIL_PREFERRED`, `RETAIL_STANDARD`, `MAIL_ORDER_PREFERRED` and `MAIL_ORDER_STANDARD`; `DAYS_SUPPLY` 1, 2 and 4 with the PBP's 1-month, 3-month and 2-month supply, matched by that position and not by the day count, because the PBP states the days a plan files (100 for a 3-month supply at some plans) where this file says "90 days"; `COST_TYPE` 1 and 2 with a copay and a coinsurance, `COST_AMT` with the amount or rate, `COST_MIN_AMT` and `COST_MAX_AMT` with `min_amount` and `max_amount`; `TIER_SPECIALTY_YN` with a specialty `tier_code`; `DED_APPLIES_YN` with `pharmacy.deductible.applies_to_tiers`. A cell that matches nothing in the document is a report line. $0 is $0: a 0% coinsurance in 1 source and a $0 copay in the other match (the file writes many catastrophic steps as a 0% coinsurance, where the PBP importer writes a $0 copay; this rule took the cost-cell differences of the 2027 run from 12,612 to 24). A `COVERAGE_LEVEL` 0 row (pre-deductible) is not compared cell by cell: the PBP importer writes no deductible-stage benefits, and the deductible's tiers are compared through `DED_APPLIES_YN`.
- **Plan Information against the PBP document.** `DEDUCTIBLE` with `pharmacy.deductible.amount`, `PLAN_NAME` with `plan_name`. `PREMIUM` is not compared, because it is not the same quantity as the PBP importer's `premium.amount` (section 15, finding N1 of [`partd-formulary/stop-2.md`](partd-formulary/stop-2.md)); the report counts the 2 side by side instead (`comparison.premium`). `CONTRACT_NAME`, the region and county columns and `SNP` are not compared: the PBP importer writes the carrier from another column, the service area from the PBP area files, and the SNP flags only as quotes.
- **What the comparison does not see.** It reads the file and looks for the PBP document's answer; a PBP benefit with no row in the file is not compared (in 2027, the out-of-network and long-term care benefits, for which the file has no columns). A file minimum or maximum of 0 is read as "none" and accepts any PBP `min_amount` or `max_amount`. A tier's specialty and deductible flags are read from its first row (no tier's rows disagree in 2027). A catastrophic cell is compared with the tier's 1 catastrophic benefit, whatever its network and supply.

## 9. The citation shape (gap F4)

- **An item** has 1 `source_references` entry: `document` the zip name (`2027_20261008.zip`), `excerpt` the text file's name as in the zip, a colon, and the row verbatim:
  `{"document": "2027_20261008.zip", "excerpt": "basic drugs formulary file  20261031.txt: 00027000|8|2027|1551300|00002143380|3|Y|2|28|Y|N|N"}`
  The header that names each cell is quoted once, in the list's `source_references` (and, for the plan's own items, in the plan's root entry for that file). Formulary `00027000`, 3,494 items, is 1,844,038 bytes as written (2 spaces of indent, 1 key per line); stop 0 estimated 1.29 MB with a flatter layout.
- **An indication item** has the Basic row's entry and 1 entry per indication row.
- `document` names the zip on every citation this importer writes, because a plan document now has 2 sources. The PBP importer's citations name their PBP file in the excerpt and leave `document` absent, as they did before.

## 10. The count report

`report.json`, per formulary: the plans that use it, its drugs, its tiers, and how many have prior authorization, step therapy, a quantity limit, a 999-day quantity limit and the negotiation flag; totals; the refusals and errors (section 11) with their messages; and the section 8 counts by kind, with up to 15 examples of each, and the premiums side by side. `plans.jsonl`, 1 line per written plan: its formulary, whether its tiers came from the PBP files or from Beneficiary Cost, its excluded, capped and indication items, its compared and agreeing cells, and the 2 premiums. `differences.jsonl`: every section 8 difference.

## 11. Errors and refusals

An error quotes the file, the row and the cell; it stops `--plan` and `--formulary` with nothing written, and under `--all` it is listed and the plan is not written. Errors: a header that differs from the layout; a plan, formulary or file the command names that is not there; a plan whose Plan Information rows disagree; a formulary with 2 versions or 2 contract years, or 2 rows for 1 RXCUI; a `CONTRACT_YEAR` the PBP files of that year do not cover; any cell rule of sections 5 and 6 broken; a tier the plan does not have (section 7.3); an indication row whose drug is not on the plan's Basic list.

A **suppressed plan** (`PLAN_SUPPRESSED_YN` `Y`, 3 plans in 2027) is refused with the cell quoted: CMS publishes no drug data for it (Methodology). So is a plan the PBP importer refuses because its plan type is outside that importer's scope, and only that: any other PBP importer error is an error. `--all` lists refusals in the report and goes on.

## 12. Fixtures and examples (D8)

- `test/fixtures/partd-formulary/<release>/`: byte-for-byte rows with the header (ASCII, CRLF) of the 5 example plans: their Plan Information, Excluded Drugs and Beneficiary Cost rows, and every Basic Drugs row of their 5 formularies (17,272 rows; with the edge cut below, 17,289 rows and 0.9 MB), so that `--write-golden` regenerates the examples from the fixtures as the PBP importer's golden plans are. `.gitattributes` gains `test/fixtures/partd-formulary/**/*.txt -text`, on the pattern of the PBP line.
- A small edge cut beside it for the unit tests: a decimal quantity limit, a 999-day limit, an excluded drug with a capped benefit, RXCUI 403957 on both the Basic and Excluded lists of 1 plan, a Defined Standard plan with a single-tier formulary, and 1 indication-based plan.
- The 5 examples, in `examples/partd-formulary/` with the `--all` layout (`formularies/` and `plans/`), each validated against its schema; their tier ids are those of the plan's existing PBP example:

| Plan | Kind | Formulary |
|---|---|---|
| S5921-383-000, AARP Medicare Rx Preferred from UHC (PDP) | stand-alone drug plan, 6 excluded drugs | 00027000 v8, 3,494 drugs |
| S4802-146-000, Wellcare Value Script (PDP) | stand-alone drug plan, 6 tiers | 00027165 v7, 3,260 drugs |
| H2406-013-000, AARP Medicare Advantage from UHC FL-0021 (PPO) | Medicare Advantage with drugs, the list on 660 plans | 00027002 v8, 3,560 drugs |
| H1036-068-000, Humana Gold Plus H1036-068 (HMO) | Medicare Advantage with drugs | 00027368 v6, 3,350 drugs |
| H5533-019-000, UPMC for Life PPO Rx Choice (PPO) | Medicare Advantage with drugs | 00027137 v6, 3,608 drugs |

- 2 examples checked by eye against the plan's own published drug list, 10 drugs each, with what was compared written down: S5921-383-000 and H1036-068-000. A carrier host is fetched only when its `robots.txt` allows it; otherwise the document is downloaded by hand and its retrieval note says so.

## 13. Tests for the build

`scripts/from-partd-formulary.test.js`, 17 tests on the fixtures: the column rules of sections 5 and 6; these errors with their messages: broken cells (blank or non-numeric quantity limits, a tier of 0, an NDC of 10 digits, a flag that is not Y or N, Excluded Drugs' 0 and 1), a header that is not the layout's, a second row for 1 drug, 2 versions or 2 contract years of 1 formulary, Plan Information rows that disagree, an indication drug not on the list, a tier the plan does not have, Beneficiary Cost tiers that are not the PBP tiers, a plan with no tiers that is not Defined Standard, a plan not in the file and a malformed release name; the suppressed-plan refusal; which PBP importer errors are refusals; the 999-day period; the 2 items of RXCUI 403957; the indication item replacing the list item; the Defined Standard tiers; the tier proof and the unchanged PBP content on all 5 examples; the examples rebuilt byte for byte; every list and plan valid; the command line for `--plan` and `--formulary`; and `--all` on the fixtures, run twice to the same bytes, with the edge plans as errors because their PBP rows are not in the fixtures. `scripts/from-pbp.test.js` tests that `loadPlans` gives what `loadPlan` gives, documents included. Not tested by a test: a field count, a line break or a SHA-256 missing from `download.json`, a missing file, a contract year the PBP files do not cover, and `--write-fixtures` (the review of stop 2 ran each of them by hand).

## 14. Decisions D1 to D9 (decided 2026-11-11)

| # | Decided |
|---|---|
| D1 | `formulary_item.drug_name` optional in draft 9; not written. Names from RxNorm can come later as their own step. |
| D2 | Gaps F2 to F7 as fields in draft 9, with item-level `source_references`. |
| D3 | `schema/v1.2.0/formulary.schema.json` and `formulary_reference.formulary_items_url`. |
| D4 | A Defined Standard plan's tiers from Beneficiary Cost when the PBP document has none (section 7.3); no cost shares. |
| D5 | Indication Based Coverage read into `coverage_exceptions` (section 6.2). |
| D6 | A 999-day quantity limit: `period` null, the cell quoted. |
| D7 | Beneficiary Cost proves the tiers and is compared, never written over the PBP values (section 8). |
| D8 | The name, command line, layout, fixtures and 5 examples above. |
| D9 | Insulin Beneficiary Cost not read now. |

## 15. Results on release 2027_20261008 (November 11, 2026)

This run predates 2 decisions of November 11, 2026: a stand-alone drug plan's premium written from `PREMIUM` (7.2), and the PBP importer's step after the threshold on a tier of excluded drugs only (`pbp-part-d-mapping.md` section 6.6), which removes the 24 cost-cell differences below. The committed report and differences are those of this run.

`node scripts/from-partd-formulary.js --release 2027_20261008 --all --out-dir <dir>`, in 2 minutes. The report is [`partd-formulary/report-2027_20261008.json`](partd-formulary/report-2027_20261008.json) (the counts of section 10 for each of the 286 formularies), and every difference of section 8 is a line of [`partd-formulary/differences-2027_20261008.jsonl`](partd-formulary/differences-2027_20261008.jsonl).

- **Lists:** 286, every one valid against `formulary.schema.json`; 1.55 to 2.14 MB each, 505.6 MB in all.
- **Plans:** of the 5,495 in Plan Information, 5,478 written and valid against `benefit-plan.schema.json` (917.4 MB), 0 errors, and 17 refused: the 3 suppressed plans, and 14 plans of types the Medicare Advantage importer does not cover, 7 of type 18 (1876 Cost) and 7 of type 09 (PFFS). Their formularies are among the 286 lists; a plan document needs the PBP importer's document to start from.
- **Tiers:** every drug of every written plan is on a tier of the plan's document (section 7.3). On the 5,271 written tiered plans those are the tiers the PBP importer writes, and the Beneficiary Cost tiers equal them; on the 207 Defined Standard plans, for which the PBP files hold no tier rows, they are the Beneficiary Cost tiers (D4).
- **The plans' own items:** 14,778 excluded-drug items from 14,062 of the 14,074 rows, on every segment of their plans (the other 12 rows belong to 2 refused PFFS plans, H5435-024 and H8145-006), 2,521 of them with a capped benefit; 48 indication items on the 16 plans of the Indication Based Coverage file.
- **Section 8:** 642,271 cells and facts compared on the 5,478 plans, 642,243 agree, 28 differ. Not compared: 29,383 rows and facts (25,839 pre-deductible rows, 3,091 cost rows of the Defined Standard plans, which have no PBP tiers, and 453 deductibles the PBP document gives no amount for). The 28:
  - **24 cost cells on 2 plans**, H4286-001 and H4286-003: Tier 5, "Supplemental Drugs", holds excluded drugs only (`mrx_tier_includes` "2"), and both the file and `pbp_mrx_p.txt` give it a $10 copay after the out-of-pocket threshold, where the PBP importer writes $0 under question Q6 of the Part D mapping (every catastrophic step is $0 for a covered Part D drug). A tier with no Part D drug on it has no covered Part D drug for the $0 to apply to: finding N2.
  - **4 plan names:** 2 Anthem MaineHealth plans whose name has a "|", which the pipe-delimited file prints as 3 spaces, and 2 MultiCare plans whose PBP name is shorter ("MultiCare Health Plan (HMO)" against "MultiCare Health Plan Evergreen Enhanced (HMO)").
- **Premiums, side by side, not compared** (`comparison.premium`): the file's `PREMIUM` is not the premium the PBP importer writes. For H5533-019 the file says $28.00, the PBP `pbp_d_mplusc_premium` (Plan Premium Amount (A/B)) $5.00, and the plan's Summary of Benefits $33, which Medicare Plan Finder splits as a health premium of $5.00 and a drug premium of $28.00 ([`pbp-sob-checks/H5533-019-000.json`](pbp-sob-checks/H5533-019-000.json)). So for a Medicare Advantage plan `PREMIUM` reads as the Part D part of the premium. Of the 5,155 Medicare Advantage plans written: both $0 on 3,853, the same amount above $0 on 2, the PBP premium $0 and the file's not on 512, the file's $0 and the PBP's not on 185, and different amounts above $0 on 603. For the 323 stand-alone drug plans `PREMIUM` is the plan's premium (S5921-383: $184.10, as its Summary of Benefits prints), and no PBP file holds it. Neither is written today: finding N1 of [`partd-formulary/stop-2.md`](partd-formulary/stop-2.md).
- **Against the carriers' own drug lists**, 10 drugs on each of 2 plans: [`partd-formulary/drug-list-checks.md`](partd-formulary/drug-list-checks.md), 19 of 20 agree and 1 differs between the file and the carrier (a vaccine's quantity limit, 1 against 2 per lifetime, on the row whose days are 999).
