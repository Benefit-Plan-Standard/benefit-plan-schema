# Part D formulary importer: specification and mapping

**Status:** the mapping, written November 11, 2026, before the build. `scripts/from-partd-formulary.js` does not exist yet. The schema it writes to is the Benefit Plan Standard 1.2.0 draft 9 (`schema/v1.2.0/benefit-plan.schema.json` and `schema/v1.2.0/formulary.schema.json`). Decisions D1 to D9 of [`partd-formulary/stop-0.md`](partd-formulary/stop-0.md) section 7 were decided by Diego Orofino on 2026-11-11: every recommended answer is accepted, and the sections below write each one.

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
```

Exit codes: 0 written, 1 an error, and then nothing is written. Like `buildDocument()` in `scripts/from-pbp.js`, the build is a pure function of the files: no network, no clock, no randomness. The import date written is the download date in `download.json`.

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

`buildDocument()` of `scripts/from-pbp.js` for the plan, with the PBP files of `CONTRACT_YEAR`. Everything that importer writes stays as it writes it: plan identity, premium, service area, the pharmacy deductible, stages, networks, tiers and Part D benefits. The formulary importer adds to `pharmacy` and to the root `source_references`, and changes nothing else.

### 7.2 What it adds

- `pharmacy.formulary_reference`: `formulary_id`, `formulary_version`, `completeness` `full_formulary`, `source_plan_identifiers` (`cms_contract_id`, `cms_pbp_id`; the schema has no segment field, and no 2 segments of a plan use different formularies in 2027), the `data_sources` entry of section 5, and, in the `--all` layout, `formulary_items_url` `../formularies/<FORMULARY_ID>.json`.
- `pharmacy.formulary_items`: with `--plan`, the list's items with the plan's own items (section 6) merged in: an indication item replaces the list item with its `rxcui` and `coverage_basis`, and the excluded-drug items follow the list's. With `--all`, the plan's own items only, and none when it has none.
- Root `source_references`, after the PBP importer's: 1 entry that quotes the plan's first Plan Information row and says on how many county rows it repeats; 1 entry per file read for the plan, with its release and SHA-256; and, under section 7.3, the tiers entry.

### 7.3 The tier proof, and Defined Standard plans (D4)

Every item's `formulary_tier_id` must be a `tier_id` in the document's `pharmacy.formulary_tiers`; one that is not is an error. Over the 2027 file this holds for every drug of the 5,285 tiered plans (stop 0, section 2.1).

A Defined Standard plan (`mrx_benefit_type` 1, 207 plans in 2027) has no tier rows in the PBP files, so `scripts/from-pbp.js` writes no `formulary_tiers` ([`pbp-part-d-mapping.md`](pbp-part-d-mapping.md) section 5.7). For such a plan, and only when the PBP document has no `formulary_tiers`, the formulary importer writes them from the plan's Beneficiary Cost rows: 1 tier per `TIER` value, in number order, `tier_id` `T<n>`, `name` "Tier <n>", `tier_code` `specialty` when `TIER_SPECIALTY_YN` is `Y` on the tier's rows (and an error when the tier's rows disagree), and a `description` that quotes the `TIER` and `TIER_SPECIALTY_YN` values and the row count. It writes no cost shares from the file (D7). A root `source_references` entry says the tiers come from the Beneficiary Cost file because the PBP files hold no tier rows for a Defined Standard plan. For all 207 plans in 2027, the Beneficiary Cost tiers equal the tiers on the plan's formulary.

## 8. Checks that write nothing (D7)

The report lists each difference; none stops the build.

- **Beneficiary Cost against the PBP document.** For a tiered plan, the set of `TIER` values must equal the `formulary_tiers` ids, and a difference is an error, not a report line. Then each cost cell is compared with the PBP document's Part D benefit for the same tier, stage, pharmacy and supply: `COVERAGE_LEVEL` 0, 1 and 3 with the stages `DEDUCTIBLE`, `INITIAL` and `CATASTROPHIC`; the `PREF`, `NONPREF`, `MAIL_PREF` and `MAIL_NONPREF` columns with `RETAIL_PREFERRED`, `RETAIL_STANDARD`, `MAIL_ORDER_PREFERRED` and `MAIL_ORDER_STANDARD`; `DAYS_SUPPLY` 1, 2 and 4 with the PBP's 1-month, 3-month and 2-month supply, matched by that position and not by the day count, because the PBP states the days a plan files (100 for a 3-month supply at some plans) where this file says "90 days"; `COST_TYPE` 1 and 2 with a copay and a coinsurance, `COST_AMT` with the amount or rate, `COST_MIN_AMT` and `COST_MAX_AMT` with `min_amount` and `max_amount`; `TIER_SPECIALTY_YN` with a specialty `tier_code`; `DED_APPLIES_YN` with `pharmacy.deductible.applies_to_tiers`. A cell that matches nothing in the document is a report line.
- **Plan Information against the PBP document.** `PREMIUM` with `premium.amount`, `DEDUCTIBLE` with `pharmacy.deductible.amount`, `PLAN_NAME` with `plan_name`. `CONTRACT_NAME`, the region and county columns and `SNP` are not compared: the PBP importer writes the carrier from another column, the service area from the PBP area files, and the SNP flags only as quotes.

## 9. The citation shape (gap F4)

- **An item** has 1 `source_references` entry: `document` the zip name (`2027_20261008.zip`), `excerpt` the text file's name as in the zip, a colon, and the row verbatim:
  `{"document": "2027_20261008.zip", "excerpt": "basic drugs formulary file  20261031.txt: 00027000|8|2027|1551300|00002143380|3|Y|2|28|Y|N|N"}`
  The header that names each cell is quoted once, in the list's `source_references` (and, for the plan's own items, in the plan's root entry for that file). Measured on formulary `00027000`: 3,494 items, 1.29 MB pretty-printed with these citations, 0.72 MB without.
- **An indication item** has the Basic row's entry and 1 entry per indication row.
- `document` names the zip on every citation this importer writes, because a plan document now has 2 sources. The PBP importer's citations name their PBP file in the excerpt and leave `document` absent, as they did before.

## 10. The count report

Per formulary: the plans that use it, its drugs, and how many have prior authorization, step therapy, a quantity limit, a 999-day quantity limit and the negotiation flag. Per plan: excluded drugs, capped benefits, indication items, and whether its tiers came from the PBP files or from Beneficiary Cost. Totals, the refusals (section 11) with their cells, and the section 8 differences.

## 11. Errors and refusals

An error stops the run and writes nothing; it quotes the file, the row and the cell. Errors: a header that differs from the layout; a plan, formulary or file the command names that is not there; a plan whose Plan Information rows disagree; a formulary with 2 versions or 2 contract years, or 2 rows for 1 RXCUI; a `CONTRACT_YEAR` the PBP files of that year do not cover; any cell rule of sections 5 and 6 broken; a tier the plan does not have (section 7.3); an indication row whose drug is not on the plan's Basic list.

A **suppressed plan** (`PLAN_SUPPRESSED_YN` `Y`, 3 plans in 2027) is refused with the cell quoted: CMS publishes no drug data for it (Methodology). `--all` lists refusals in the report and goes on.

## 12. Fixtures and examples (D8)

- `test/fixtures/partd-formulary/<release>/`: byte-for-byte rows with the header (ASCII, CRLF) of the 5 example plans: their Plan Information, Excluded Drugs and Beneficiary Cost rows, and every Basic Drugs row of their 5 formularies (17,272 rows, about 0.9 MB), so that `--write-golden` regenerates the examples from the fixtures as the PBP importer's golden plans are. `.gitattributes` gains `test/fixtures/partd-formulary/**/*.txt -text`, on the pattern of the PBP line.
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

`scripts/from-partd-formulary.test.js`, on the fixtures: each column rule of sections 5 and 6, and each error of section 11 with its message; the 999-day period; the 2 items of RXCUI 403957; the indication item replacing the list item; the Defined Standard tiers; the tier proof on all 5 examples against their PBP examples; `--write-golden` byte-identical to `examples/partd-formulary/`; every list valid against `formulary.schema.json` and every plan against `benefit-plan.schema.json`; and the build has no clock (2 runs give the same bytes).

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
