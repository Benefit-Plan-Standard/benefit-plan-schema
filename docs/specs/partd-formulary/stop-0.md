# Part D formulary importer, stop 0: facts and decisions

**Date:** November 11, 2026. **For:** the Benefit Plan Standard 1.2.0 release gate. **Status:** waiting for the decisions in section 7. No importer code is written; the profile in [`profile/`](profile/) is the evidence for the counts below.

**Reads with:** [`../pbp-part-d-mapping.md`](../pbp-part-d-mapping.md) (the Part D sections of the Medicare Advantage importer, which write each plan's tiers), [`../pbp-importer.md`](../pbp-importer.md), the core schema's `pharmacy` object (`schema/v1.2.0/benefit-plan.schema.json`, `$defs/formulary_item`, `$defs/formulary_reference`).

## 1. The file

| | |
|---|---|
| Source | CMS, Monthly Prescription Drug Plan Formulary and Pharmacy Network Information, https://data.cms.gov/provider-summary-by-type-of-service/medicare-part-d-prescribers/monthly-prescription-drug-plan-formulary-and-pharmacy-network-information |
| Release | `2027_20261008.zip`. The Methodology: the first 4 digits are the contract year, the last 8 the date posted. Contract year 2027, posted October 8, 2026. The data.cms.gov catalog (`data.json`, read November 11, 2026) lists it as the newest monthly release, titled ": 2026-10-15". The files inside carry the date 20261031 in their names; no CMS document read today explains that date. |
| Plan years | 2027 only: `CONTRACT_YEAR` is 2027 on all 963,666 Basic Drugs rows. The Methodology says that from contract year 2027 CMS posts a current-year and an upcoming-year file side by side from October to December; the catalog lists no 2026 monthly file after `2026_20260916.zip` (posted September 23, 2026). |
| Download | November 11, 2026, 2,290,695,063 bytes, `Last-Modified` Thu, 08 Oct 2026 18:30:17 GMT, SHA-256 `5f3bbe4e9ca29bce965403f3780d66452ec446cef5bf01fa050d3c6a990f053c`, into `data/partd-formulary/2027_20261008/` (git-ignored) with a `download.json` that records every hash. `robots.txt` of data.cms.gov does not disallow `/sites/default/files/`; its crawl delay of 10 seconds was kept. |
| Layouts | Not in the zip, which ships "sample files" only. Read from data.cms.gov: `PUFRecordLayout-2027.pdf` (243,911 bytes, SHA-256 `ec4a5688...ead`) and `Methodology-PUF-2027.pdf` (136,477 bytes, SHA-256 `5588154c...842`), with `pdftotext -raw` (the `-layout` reading misaligns the field table). |
| Not opened | The 6 pharmacy networks parts (2.28 GB of the 2.29), out of scope since October 19. |

### 1.1 Files, rows and columns

Rows exclude the header. Every file is pipe-delimited ASCII with CRLF line ends and a header row; every row has the header's column count.

| File | Rows | Columns | Read for |
|---|---|---|---|
| Plan Information | 108,263 | `CONTRACT_ID`, `PLAN_ID`, `SEGMENT_ID`, `CONTRACT_NAME`, `PLAN_NAME`, `FORMULARY_ID`, `PREMIUM`, `DEDUCTIBLE`, `MA_REGION_CODE`, `PDP_REGION_CODE`, `STATE`, `COUNTY_CODE`, `SNP`, `PLAN_SUPPRESSED_YN` | the join |
| Basic Drugs Formulary | 963,666 | `FORMULARY_ID`, `FORMULARY_VERSION`, `CONTRACT_YEAR`, `RXCUI`, `NDC`, `TIER_LEVEL_VALUE`, `QUANTITY_LIMIT_YN`, `QUANTITY_LIMIT_AMOUNT`, `QUANTITY_LIMIT_DAYS`, `PRIOR_AUTHORIZATION_YN`, `STEP_THERAPY_YN`, `SELECTED_DRUG_YN` | `formulary_items[]` |
| Excluded Drugs Formulary | 14,074 | `CONTRACT_ID`, `PLAN_ID`, `RXCUI`, `TIER`, `QUANTITY_LIMIT_YN`, `QUANTITY_LIMIT_AMOUNT`, `QUANTITY_LIMIT_DAYS`, `PRIOR_AUTH_YN`, `STEP_THERAPY_YN`, `CAPPED_BENEFIT_YN` | the excluded-drugs case |
| Beneficiary Cost | 173,613 | `CONTRACT_ID`, `PLAN_ID`, `SEGMENT_ID`, `COVERAGE_LEVEL`, `TIER`, `DAYS_SUPPLY`, then `COST_TYPE_`, `COST_AMT_`, `COST_MIN_AMT_`, `COST_MAX_AMT_` for each of `PREF`, `NONPREF`, `MAIL_PREF`, `MAIL_NONPREF`, then `TIER_SPECIALTY_YN`, `DED_APPLIES_YN` (24) | the tier proof |
| Indication Based Coverage | 112 | `CONTRACT_ID`, `PLAN_ID`, `RXCUI`, `DISEASE` | counted; decision D5 |
| Insulin Beneficiary Cost | 44,855 | `CONTRACT_ID`, `PLAN_ID`, `SEGMENT_ID`, `TIER`, `DAYS_SUPPLY`, 4 copay and 4 coinsurance columns by pharmacy channel | counted only (section 7, D9) |
| Geographic Locator | 3,279 | `COUNTY_CODE`, `STATENAME`, `COUNTY`, `MA_REGION_CODE`, `MA_REGION`, `PDP_REGION_CODE`, `PDP_REGION` | counted only |

## 2. Counts

**Plans.** 5,495 plans by contract, plan and segment: 5,148 local Medicare Advantage (H), 24 regional (R), 323 stand-alone drug plans (S). Plan Information has 1 row per plan and county for local plans; `FORMULARY_ID`, `PREMIUM`, `DEDUCTIBLE`, `SNP`, `PLAN_NAME` and the suppressed flag never differ between the rows of 1 plan. 3 plans are suppressed (`H1280-001-000`, `H2694-001-000`, `H2694-002-000`, 18 rows) and, as the Methodology says, appear in no other file. All 5,492 others are in the CY 2027 PBP `pbp_mrx.txt`. Employer, PACE and demonstration plans are not in the file (Methodology).

**Formularies.** 286, the same 286 in Plan Information and Basic Drugs. Plans per formulary: 1 to 660, median 3; 71 serve 1 plan; `00027002` serves 660. Each formulary has 1 `FORMULARY_VERSION` (values 4 to 16). 258 contract-plans have more than 1 segment, and their segments never use different formularies.

**Drugs.** 1 row per formulary and `RXCUI` (0 formulary and RXCUI pairs with 2 rows), so 1 item per row. 2,968 to 4,127 drugs per formulary, median 3,350. 5,668 RXCUIs and 5,668 NDCs in the whole file, 1 NDC per RXCUI (the layout calls it a "proxy" NDC). Tiers: 1 (254,832 rows), 2 (221,546), 3 (139,202), 4 (157,772), 5 (176,810), 6 (13,504). Quantity limit `Y` on 391,490 rows: the amount is an integer on 374,231 and a decimal on 17,259 (for example "0.50"); the days are 30 on 293,557 rows, 28 on 71,193, and 999 on 600. On every `N` row the amount and days are blank. Prior authorization `Y` 275,103; step therapy `Y` 9,304; selected drug `Y` 25,754.

**Excluded drugs.** 14,074 rows for 2,081 contract-plans. The file has no segment and no formulary id: a row belongs to every segment of its contract and plan (82 contract-plans have more than 1 segment). 2 to 17 drugs per plan, median 6. No NDC column. `QUANTITY_LIMIT_YN` is coded 0 and 1 here (the layout says so), against `Y` and `N` in Basic Drugs. Prior authorization `Y` 1, step therapy `Y` 0, capped benefit `Y` 2,448. 43 rows name a drug that is also on the plan's Basic Drugs list, with a different tier or restriction (3 RXCUIs: 403957 on 30 plans, 757707 on 12, 1248057 on 1); so 1 plan can hold 2 items with the same `rxcui`.

**Beneficiary Cost.** 5,492 plans. Coverage level 0 pre-deductible (25,888 rows), 1 initial coverage (63,773), 3 catastrophic (83,952). Days supply 1 (30 days), 2 (90), 4 (60); 3 "other" is on 0 rows. Specialty tier `Y` on 21,452 rows; deductible applies `Y` on 78,536. Non-zero minimum amounts in 486 cells, non-zero maximum amounts in 2,385.

**Indication based coverage.** 112 rows, 16 contract-plans (3 of contract H2960, 13 of H5050), 3 RXCUIs, 4 diseases. Every row's drug is on the plan's Basic Drugs list. The 16 plans use 2 formularies (`00027403`, `00027397`), and no other plan uses them.

### 2.1 The tier proof, over the whole file

`scripts/from-pbp.js` writes a tiered plan's tiers as `T` plus `mrx_tier_id` from `pbp_mrx_tier.txt` (`T1` to `T6`).

- 5,285 of the 5,492 plans have tier rows in the CY 2027 `pbp_mrx_tier.txt`. For all 5,285, every `TIER_LEVEL_VALUE` on the plan's formulary is one of the plan's `mrx_tier_id` values, and the plan's Beneficiary Cost tiers equal them exactly. 0 exceptions.
- Every Excluded Drugs row's `TIER` is one of its plan's `mrx_tier_id` values (14,074 of 14,074).
- The other 207 plans (202 Medicare Advantage, 5 stand-alone) are Defined Standard plans (`mrx_benefit_type` 1). The PBP files hold no tier rows for them, so the Medicare Advantage importer writes no `formulary_tiers` ([`pbp-part-d-mapping.md`](../pbp-part-d-mapping.md) section 5.7). Their 60 formularies do have tiers (38 a single tier 1, 19 tiers 1 to 5, 3 tiers 1 to 6; 23 of the 60 are shared with tiered plans), and for all 207 plans the Beneficiary Cost tiers equal the formulary's tiers exactly. A drug's `formulary_tier_id` would point at nothing: decision D4.

## 3. The mapping, column by column

`T<n>` below is `T` followed by the number without leading zeros, the id the Medicare Advantage importer writes.

### 3.1 Basic Drugs Formulary to `pharmacy.formulary_items[]` (1 item per row)

| Column | Goes to | Rule |
|---|---|---|
| `FORMULARY_ID` | `formulary_reference.formulary_id` | The join from Plan Information; verbatim, 8 characters. |
| `FORMULARY_VERSION` | no place | Gap F2. |
| `CONTRACT_YEAR` | (check) | Must equal the document's `plan_year`; a difference is an error. |
| `RXCUI` | `rxcui` | Trimmed, as a string. |
| `NDC` | `ndc` | Verbatim, 11 characters. |
| `TIER_LEVEL_VALUE` | `formulary_tier_id` | `T<n>`; an error when the plan's `formulary_tiers` has no such id (section 2.1). |
| `QUANTITY_LIMIT_YN` | `quantity_limit` present or absent | `Y`: written. `N`: absent. Anything else, or `Y` with a blank amount or days, is an error. |
| `QUANTITY_LIMIT_AMOUNT` | `quantity_limit.value` | As a number. |
| `QUANTITY_LIMIT_DAYS` | `quantity_limit.period` | `per_<days>_days`, the form the schema's examples use. 999: decision D6. `units` has no column: gap F3. |
| `PRIOR_AUTHORIZATION_YN` | `prior_authorization` | `Y` true, `N` false. |
| `STEP_THERAPY_YN` | `step_therapy` | `Y` true, `N` false. `step_therapy_drugs` is not written: no column. |
| `SELECTED_DRUG_YN` | no place | Gap F5. |
| (every row) | `covered` | true: the file lists the drugs on the formulary. |
| (no column) | `drug_name` | Required by the schema, and the file names no drug. Gap F1. |

Not written, no column: `brand_name`, `generic_name`, `dose_form`, `specialty_pharmacy_required`, `alternatives`. Each written item quotes its row (gap F4).

### 3.2 Excluded Drugs Formulary to the plan's `formulary_items[]` (the excluded-drugs case)

Enhanced alternative plans may cover drugs Part D excludes, as a supplemental benefit (Methodology, file 4). The rows are the plan's, not the formulary's, so they go in the plan's own document and never in a shared list (section 6.3).

| Column | Goes to | Rule |
|---|---|---|
| `CONTRACT_ID`, `PLAN_ID` | (join) | Every segment of the contract and plan. |
| `RXCUI` | `rxcui` | As in 3.1. No `ndc`: no column. |
| `TIER` | `formulary_tier_id` | `T<n>`, as in 3.1. |
| `QUANTITY_LIMIT_YN` | `quantity_limit` present or absent | `1` written, `0` absent (the layout's codes). |
| `QUANTITY_LIMIT_AMOUNT`, `QUANTITY_LIMIT_DAYS` | `quantity_limit.value`, `.period` | As in 3.1. |
| `PRIOR_AUTH_YN`, `STEP_THERAPY_YN` | `prior_authorization`, `step_therapy` | As in 3.1. |
| `CAPPED_BENEFIT_YN` | no place | Gap F7. |
| (every row) | `covered` true, and a mark that the drug is covered as a supplemental benefit outside Part D | The mark has no place: gap F6. The 43 rows whose drug is also on the Basic list make the mark necessary, since the 2 items share an `rxcui`. |
| (no column) | `drug_name` | Gap F1. |

### 3.3 Plan Information: the join, and checks

| Column | Goes to | Rule |
|---|---|---|
| `CONTRACT_ID`, `PLAN_ID`, `SEGMENT_ID` | the join; `formulary_reference.source_plan_identifiers.cms_contract_id`, `.cms_pbp_id` | `source_plan_identifiers` has no segment. Not a gap for the join: no 2 segments of a plan use different formularies, and the document's `plan_identifiers` already carry `cms_contract_plan_segment`. |
| `FORMULARY_ID` | `formulary_reference.formulary_id` | |
| `CONTRACT_NAME`, `PLAN_NAME`, `PREMIUM`, `DEDUCTIBLE` | already written from the PBP (`carrier`, `plan_name`, `premium`, `pharmacy.deductible`) | Compared with the PBP values and reported; never written over them. |
| `MA_REGION_CODE`, `PDP_REGION_CODE`, `STATE`, `COUNTY_CODE` | already written from the PBP (`service_area`) | Not read. |
| `SNP` | no field; the PBP importer quotes the PBP's SNP flags in `source_references` (Medicare Advantage notes, a known gap with a proposed `eligibility` object) | Not this gate. |
| `PLAN_SUPPRESSED_YN` | (refusal) | `Y`: the plan is refused, with the cell quoted (3 plans). |

The plan-level cells are quoted in the document's root `source_references`, as the PBP importer quotes its plan-level cells.

### 3.4 Beneficiary Cost: the tier proof and a second reading, nothing written

Every column already has a place: the Medicare Advantage importer writes the same facts from `pbp_mrx_tier.txt` (`coverage_stages[]` for `COVERAGE_LEVEL`, `day_supply` for `DAYS_SUPPLY`, `pharmacy_networks[]` for the 4 channels, `cost_shares[]` with `min_amount` and `max_amount` for the cost columns, `formulary_tiers[]` with a specialty `tier_code` for `TIER_SPECIALTY_YN`, `deductible.applies_to_tiers` for `DED_APPLIES_YN`). The formulary importer reads the file to prove the tiers (2.1) and to compare each cost cell with the PBP document's Part D benefits, and reports differences. It writes nothing from it, except under decision D4.

### 3.5 Indication Based Coverage to `coverage_exceptions[]` (if decision D5 reads it)

`DISEASE` verbatim to `indication_description`, `indication_code` null (no code in the file), `coverage_status` "covered", 1 exception per row; the item's `covered` false. The schema defines `covered` as the status "when no coverage_exception matches", and the file lists the only indications for which the drug "is considered on-formulary" (layout). No gap.

## 4. Columns and facts with no place: the gate list

Every gap is additive and optional: a document valid under draft 8 stays valid. F1 and F3 loosen a required property, which a producer never notices and a consumer has to allow for. **None is large. All 8 fit in a draft 9, and Friday holds for the schema if the decisions in section 7 come by Thursday morning.**

| # | Column or fact | Rows | Proposal for draft 9 | Size |
|---|---|---|---|---|
| F1 | `drug_name` is required on `formulary_item`; no column names the drug | all | (a) `drug_name` optional. (b) Keep it required and add a second source, the NLM RxNorm names for each RXCUI, with its own download and citation; its terms not read today. | Small either way; (b) adds a reader to block 2 |
| F2 | `FORMULARY_VERSION` | all | `formulary_reference.formulary_version`, string, optional | Small |
| F3 | `quantity_limit_detail.units` is required; the file gives an amount and days, no unit | 399,716 (Basic and Excluded) | `units` optional | Small |
| F4 | `formulary_item` has no `source_references` (`additionalProperties` false), so an item cannot quote its row | all | `source_references` on `formulary_item`, the core `$defs/source_reference`. Measured on `00027000`: 3,494 items, 0.72 MB pretty-printed without, 1.29 MB with 1 row excerpt each. Without it, the rows are cited once, in `formulary_reference.data_sources[]`. | Small |
| F5 | `SELECTED_DRUG_YN` (a drug selected for the Medicare Drug Price Negotiation Program) | 25,754 | An optional boolean on `formulary_item`, or quoted only (needs F4) | Small |
| F6 | An excluded drug covered as a supplemental benefit | 14,074 | `coverage_basis` on `formulary_item`, with the recommended values of `benefits[].coverage_basis` ("medicare_covered" for a Basic row, "supplemental_mandatory" for an Excluded row) | Small |
| F7 | `CAPPED_BENEFIT_YN` (the layout: "capped benefit restriction"; no amount) | 2,448 | An optional boolean on `formulary_item`, or quoted only (needs F4) | Small |
| F8 | A list shared by many plans has no document shape, and a plan document has no field that points at one | 286 lists, 5,492 plans | A new `schema/v1.2.0/formulary.schema.json` (`schema_version`, `formulary_reference`, `formulary_items`, `source_references`; items by `$ref` to the core `$defs`), and `formulary_reference.formulary_items_url` (format `uri-reference`) in the plan document | Small to medium: the largest on the list |

## 5. What is not a gap

`SEGMENT_ID` (3.3); `SNP` (3.3, an existing Medicare Advantage gap, not this gate's); every Beneficiary Cost column (3.4); the Indication Based Coverage file (3.5); the region and county columns (`service_area`, from the PBP); an NDC on excluded drugs (absent in the file, and `ndc` is optional).

## 6. Proposals

### 6.1 Name

`scripts/from-partd-formulary.js`, with its spec at `docs/specs/partd-formulary-importer.md` (the mapping of section 3, as written after the decisions).

### 6.2 Command line

```
node scripts/from-partd-formulary.js --release 2027_20261008 --plan H2406-013-000 [--out <file>]
    1 plan's document whole: the Medicare Advantage importer's document for the plan,
    with formulary_reference and every formulary item inline
node scripts/from-partd-formulary.js --release 2027_20261008 --formulary 00027002 [--out <file>]
    1 shared list, written once (F8)
node scripts/from-partd-formulary.js --release 2027_20261008 --all --out-dir <dir>
    every list once, every plan's document pointing at its list, and the count report
node scripts/from-partd-formulary.js --release 2027_20261008 --report [--out <file>]
    the count report only: drugs per formulary, prior authorization, step therapy, quantity limit
node scripts/from-partd-formulary.js --write-golden | --write-fixtures
options: --data <dir> (default data/partd-formulary), --pbp-data <dir> (default data/pbp)
```

A plan's document starts from `buildDocument()` of `scripts/from-pbp.js` for the same plan and the PBP year equal to `CONTRACT_YEAR`, so the tiers come from 1 place. A plan missing from the PBP files, a suppressed plan, or a drug whose tier the document does not have is an error, and nothing is written.

### 6.3 Output layout for shared lists

```
<out-dir>/formularies/00027002.json    the list: formulary_reference (id, version, the release, the file hashes) and the Basic Drugs items
<out-dir>/plans/H2406-013-000.json     the plan: formulary_reference with formulary_items_url "../formularies/00027002.json",
                                       and in its own formulary_items only what is the plan's alone: excluded drugs (3.2),
                                       and, under D5, the indication-based items, which replace the list's item of the same rxcui
<out-dir>/report.json
```

A whole plan document (`--plan`) is the same plan file with the list's items merged in. The rule "the plan's own items replace the list's item with the same `rxcui` and `coverage_basis`" goes in the new schema's description and the spec. The whole file is 286 lists of about 0.7 to 1.3 MB each (F4), so 0.2 to 0.4 GB, against 4 to 7 GB if every one of the 5,492 plans carried its list inline.

### 6.4 Fixture cuts

`test/fixtures/partd-formulary/2027_20261008/`, byte-for-byte rows with the header (ASCII, CRLF), with a new `.gitattributes` line on the pattern of the existing PBP one (`test/fixtures/partd-formulary/**/*.txt -text`):

- Plan Information, Excluded Drugs and Beneficiary Cost: the example plans' rows.
- Basic Drugs: every row of the examples' 5 formularies, 17,272 rows and about 0.9 MB, so `--write-golden` regenerates the examples from the fixtures as the PBP importer does.
- A small edge cut for the unit tests: a decimal quantity limit, a 999-day limit, an excluded drug with a capped benefit, a drug on both the Basic and Excluded lists (RXCUI 403957), a Defined Standard plan with a single-tier formulary, and, under D5, 1 indication-based plan.

### 6.5 The 5 examples

All 5 are existing Part D examples, so each has a PBP document, fixtures and a Summary of Benefits check file to build on.

| Plan | Kind | Formulary | Drugs | Plans on the list | PA / ST / QL | Excluded drugs | Tiers (formulary = PBP = cost file) |
|---|---|---|---|---|---|---|---|
| S5921-383-000, AARP Medicare Rx Preferred from UHC (PDP) | stand-alone drug plan | 00027000 v8 | 3,494 | 39 | 1,043 / 50 / 1,547 | 6 | 1 to 5 |
| S4802-146-000, Wellcare Value Script (PDP) | stand-alone drug plan, 6 tiers | 00027165 v7 | 3,260 | 34 | 806 / 19 / 1,309 | 0 | 1 to 6 |
| H2406-013-000, AARP Medicare Advantage from UHC FL-0021 (PPO) | Medicare Advantage with drugs, the most shared list | 00027002 v8 | 3,560 | 660 | 1,062 / 53 / 1,569 | 6 | 1 to 5 |
| H1036-068-000, Humana Gold Plus H1036-068 (HMO) | Medicare Advantage with drugs | 00027368 v6 | 3,350 | 65 | 890 / 19 / 1,542 | 6 | 1 to 5 |
| H5533-019-000, UPMC for Life PPO Rx Choice (PPO) | Medicare Advantage with drugs, a list on 30 plans | 00027137 v6 | 3,608 | 30 | 1,077 / 49 / 1,461 | 0 | 1 to 5 |

The 2 left out: H1609-028-000 (00027013, 540 plans) and H5425-140-000 (00027384). No existing example has indication-based coverage or is a Defined Standard plan; those are covered by the edge cut, not by an example. The 2 by-eye checks (10 drugs each against the plan's own published drug list): S5921-383-000 and H1036-068-000, the 2 plans the Part D mapping worked through by hand; whether each carrier's host allows the fetch is read from its `robots.txt` in block 2.

## 7. Decisions for Diego

| # | Question | Recommended | Alternative |
|---|---|---|---|
| D1 | F1, the drug name | `drug_name` optional in draft 9; names from RxNorm can come later as their own step | RxNorm names now, a second source in block 2 |
| D2 | F2 to F7 | All 6 as listed in section 4, with item-level `source_references` (F4) and booleans for F5 and F7 | F4 at list level only; F5 and F7 quoted, not fields |
| D3 | F8, shared lists | The new `formulary.schema.json` and `formulary_items_url` | No shared shape: whole plan documents only, so no list is written once for the plans that share it |
| D4 | The 207 Defined Standard plans | The formulary importer writes `formulary_tiers` (`T<n>`, "Tier <n>", the specialty flag) from Beneficiary Cost when the PBP document has none, quoting the rows; no cost shares | Refuse the 207 plans (3.8%) |
| D5 | Indication Based Coverage | Read it (112 rows, 16 plans) into `coverage_exceptions[]` as in 3.5 | Leave it out: read only Plan Information, Basic Drugs, Excluded Drugs and Beneficiary Cost |
| D6 | `QUANTITY_LIMIT_DAYS` 999 (600 rows; the layout does not define it) | `period` null and the cell quoted | `per_999_days` as printed |
| D7 | Beneficiary Cost | Proof and comparison only (3.4) | Also write the Defined Standard plans' initial coverage cost shares, which the PBP files do not state and this file does |
| D8 | Name, command line, layout, fixtures, the 5 examples | As in section 6 | |
| D9 | Insulin Beneficiary Cost | Not read now; it belongs with the insulin follow-up the Part D mapping left open (its question Q1) | Read it now |
