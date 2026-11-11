# Part D formulary importer, stop 2: the build, the evidence and the review

**Date:** November 11, 2026. **For:** the Benefit Plan Standard 1.2.0 release gate. **Status:** built and reviewed; the review's findings are fixed or recorded (section 5); 2 findings wait for a decision (N1 and N2, section 3).

## 1. What was built

- `scripts/from-partd-formulary.js`, to the mapping in [`../partd-formulary-importer.md`](../partd-formulary-importer.md) (decisions D1 to D9 of [`stop-0.md`](stop-0.md)), and `scripts/from-partd-formulary.test.js`, 17 tests on the fixtures.
- `scripts/from-pbp.js`: `loadPlans()`, which reads many plans with each PBP file streamed once, for `--all`. `loadPlan()` and `loadPlans()` share the function that assembles a plan's rows; a test in `scripts/from-pbp.test.js` checks that both give the same rows and documents.
- `test/fixtures/partd-formulary/2027_20261008/`: 17,649 rows cut byte for byte from the 5 files read (every row of the 5 example formularies, and the rows of 4 edge plans), with a `.gitattributes` line.
- `examples/partd-formulary/`: 5 lists and 5 plans, the plans pointing at their lists.

## 2. Evidence

| What | Result | Where |
|---|---|---|
| Tests | `node --test scripts/*.test.js`: 258 pass, 0 fail (240 before) | |
| The 5 examples | rebuilt from the fixtures byte for byte, and by `--all` on the fixtures; every list valid against `formulary.schema.json` and every plan against `benefit-plan.schema.json` | `scripts/from-partd-formulary.test.js` |
| Tier proof on the examples | every drug of the 5 lists and the plans' own items is on a tier of the plan's PBP example, and each plan's `pharmacy` (but for `formulary_items` and `formulary_reference`), `benefits`, identity and first citations are the PBP example's, unchanged | the same |
| Count report | 286 formularies: drugs, plans, tiers, prior authorization, step therapy, quantity limit, 999-day limits and the negotiation flag for each | [`report-2027_20261008.json`](report-2027_20261008.json) |
| Whole release | 286 lists and 5,478 plans written and valid, 0 errors, 17 refused (3 suppressed; 14 of plan types 18 and 09, outside the PBP importer); 2 minutes | spec section 15 |
| Tier proof on the whole release | every drug of every written plan on a tier of that plan: the PBP importer's tiers on the 5,271 tiered plans, which the Beneficiary Cost tiers equal; the Beneficiary Cost tiers on the 207 Defined Standard plans | spec section 15 |
| The file against the PBP documents | 642,243 of 642,271 compared cells and facts agree; 24 cost cells and 4 plan names differ; the premiums are set side by side, not compared (N1) | [`differences-2027_20261008.jsonl`](differences-2027_20261008.jsonl), spec section 15 |
| By eye, against the carriers' own drug lists | 20 drugs on 2 plans: 15 MATCH, 4 READING, 1 DIFFERENCE between the file and the carrier | [`drug-list-checks.md`](drug-list-checks.md) |

## 3. Findings for the owner

| # | Finding | Kind | Size | Proposal |
|---|---|---|---|---|
| N1 | **`PREMIUM` is not the premium the PBP importer writes.** For a Medicare Advantage plan the file's `PREMIUM` reads as the Part D part of the premium: H5533-019 has $28.00 in the file, $5.00 in `pbp_d_mplusc_premium` (written as `premium.amount`), and $33 on its Summary of Benefits, which Medicare Plan Finder splits into $5.00 for health and $28.00 for drugs. Of the 5,155 Medicare Advantage plans written, 1,300 have 2 different amounts and 3,855 the same (3,853 of them $0). For a stand-alone drug plan `PREMIUM` is the whole premium, which no PBP file holds (S5921-383: $184.10, as its Summary of Benefits prints), so the 323 stand-alone documents carry no premium today. Stop 0 mapped `PREMIUM` as "already written from the PBP"; that was wrong for both kinds of plan, and this corrects it. | a source fact with no field for a Medicare Advantage plan; a value not written for a stand-alone plan | small | (a) Now, importer only: write `premium` for a stand-alone drug plan from `PREMIUM`, `period` `per_month` (the layout: "Monthly premium amount"), with the cell quoted; for a Medicare Advantage plan quote `PREMIUM` in the root citations as the file's monthly premium and write nothing. (b) Later, a schema field for the Part D part of a Medicare Advantage premium, or for premium parts, in a draft after this one or in 1.3.0. Neither blocks the formulary: no drug or tier depends on it. |
| N2 | **A tier of excluded drugs only gets $0 after the threshold.** H4286-001 and H4286-003: Tier 5, "Supplemental Drugs", holds excluded drugs only (`mrx_tier_includes` "2"); `pbp_mrx_p.txt` and the Beneficiary Cost file both give it a $10 copay after the out-of-pocket threshold; the PBP importer writes $0, by question Q6 of the Part D mapping (every catastrophic step is $0 for a covered Part D drug). A tier with no Part D drug on it has no covered Part D drug for the $0 to apply to. | an importer reading in `scripts/from-pbp.js` | small: 2 plans in 2027, 1 catastrophic benefit each | Write the file's post-threshold amount for a tier whose `mrx_tier_includes` is "2" (excluded drugs only), keep Q6 for every other tier, and note it in the Part D mapping section 6.6. Your decision, because Q6 was. |
| N3 | **A vaccine limit: 1 in the file, 2 in the carrier's list.** S5921-383, RXCUI 836636 (Vaqta 25 units/0.5 ML syringe): the file's quantity limit is 1 per 999 days; the carrier's list prints "Maximum of 2 vaccines per lifetime". The same line reads the file's 999 days as "per lifetime". | the CMS file against the carrier's document | none | Recorded, not changed, as for the Summary of Benefits checks. D6 (`period` null, the cell quoted) stands; the spec can name "per lifetime" as the carrier's reading of 999 once more lists agree. |
| N4 | **A quantity limit's unit varies by drug** (tablets, grams, mL; the same Trulicity limit is "2" in the file, "4 pens (2 ml)" in 1 list and "2" in another). | confirms gap F3 | none | `units` stays out, as decided in draft 9. |

Also recorded: the 14 plans of types 18 (1876 Cost) and 09 (PFFS) get their lists but no plan document, because the PBP importer covers HMO, HMO-POS, local and regional PPO and stand-alone drug plans; and 2 plan names differ because the file prints a "|" in a name as 3 spaces.

**For the Thursday decision, the formulary side:** the build found no schema gap the formulary needs. N1 is a premium question, not a drug question, and has an importer-only answer for now; N2 is a reading in the PBP importer, 2 plans. Neither moves the date if you decide them by Thursday evening.

## 4. Departures from the spec and the plan

- The examples are in the shared layout only: each plan points at its list. The whole layout (`--plan`) is covered by a test that runs the command line on the fixtures and checks 3,500 items in 1 document.
- The comparison treats a 0% coinsurance and a $0 copay as the same answer; before that rule 12,588 cells differed only that way. Written into the spec, section 8.
- `scripts/from-pbp.js` changed (the loader). Stop 0 did not plan it; without it `--all` would stream every PBP file once per plan.
- The by-eye checks name each drug by its RxNorm name from the NLM RxNav service, because the file names none; nothing from RxNav is written into a document. The UHC drug list link was read from the plan's details page in a browser, because the page builds its links in script; the Humana list was found by its published file name pattern among 9 guides for the same formulary, and the 1 whose cover names the plan was used.
- The 5 lists are 1.7 to 1.9 MB each in the repository (8.9 MB), because every item quotes its row (F4).

## 5. The review

A reviewer with no part in the build read the diff and the evidence, not this file, and re-ran the tests, the whole release, the fixtures cut and 18 of the 20 drug list quotes. It found nothing that writes wrong data, and found the examples, fixtures and whole-release output reproducible byte for byte. Its findings, and what was done:

| # | Finding | Severity | Done |
|---|---|---|---|
| R1 | `--all` filed every PBP importer error as a refusal and exited 0; only a plan type outside that importer's scope is a refusal. | should fix | Fixed: a PBP importer error is a refusal only when every message is a scope message (`pbpRefusal`, tested); any other is an error, and `--all` exits 1. The 2027 run is unchanged: its 14 were all scope refusals. |
| R2 | The README and spec section 15 said every drug is on a tier the PBP importer writes; for the 207 Defined Standard plans the PBP importer writes none. | should fix | Fixed in both. |
| R3 | Spec section 10 promised per-plan counts that the report did not have. | should fix | Fixed: `--all` writes `plans.jsonl`, 1 line per plan (tiers' source, excluded, capped and indication items, compared and agreeing cells, the 2 premiums), and section 10 says what each file holds. |
| R4 | Spec section 13 claimed tests that did not exist (several errors, 2 runs giving the same bytes, `--all`, `loadPlans`). | should fix | 4 tests added (Plan Information rows that disagree, 2 contract years, an indication drug not on the list; `--all` on the fixtures run twice to the same bytes; the refusal rule) and 1 in `scripts/from-pbp.test.js` (`loadPlans` against `loadPlan`). Section 13 now lists what is tested and what is not. |
| R5 | Spec section 4 said nothing is written on an error, which is not so for `--all` and `--write-fixtures`. | should fix | Fixed in the spec and the script's header. |
| R6 | Spec section 7.2 said the root citations carry each file's SHA-256; they do not. | should fix | The text now says what the root citations hold and that the hashes are in `formulary_reference.data_sources[0].notes`. |
| R7 | The comparison checks 1 way; the premium "agreements" (3,853 of them $0 against $0) proved nothing, since the 2 premiums are different quantities; an unknown `COST_TYPE` was not counted. | note | `PREMIUM` is no longer compared: the 2 premiums are counted side by side (`comparison.premium`, `plans.jsonl`). An unknown `COST_TYPE` counts as a compared cell that differs. The 1-way limits are written into spec section 8 ("What the comparison does not see"); in 2027 none hides a difference. |
| R8 | Some numbers in spec section 15 were inexact (sizes in MiB, the 14,074 excluded rows of which 12 are on refused plans, the "not compared" parts), and section 9 kept the stop 0 size estimate. | note | Re-run and rewritten from `report.json` and `plans.jsonl`: sizes in bytes, 14,062 rows written, the 3 parts of the 29,383 not compared. |
| R9 | A plan was called Defined Standard because it had no PBP tiers, without checking. | note | Fixed: Beneficiary Cost tiers are written only when the PBP document cites `mrx_benefit_type "1" (Defined Standard)`; any other plan with no tiers is an error (tested). |
| R10 | `drug-list-checks.md`: the selection rule did not say a picked drug is skipped; the Humana 999-day step was skipped silently; 1 quote had an ellipsis. | note | Fixed, and the quote given in full. |
| R11 | Test issues: a title that claimed more than it tested, an incomplete unchanged-content check, temporary folders left behind. | note | The title and the test now set the 2 premiums side by side; the unchanged check covers all of `pharmacy` but for the 2 added keys; the tests remove their temporary folders, and the 20 left by earlier runs and the reviewer's own are removed. |
| R12 | `--all` and `--write-golden` left stale files; `--out` with `--all` was ignored. | note | `--all` stops if its output folders already hold documents; `--write-golden` warns of a file that is not golden any more; `--all` with `--out` is an error. |

## 6. Decisions after stop 2 (November 11, 2026)

- **N2:** decided by Diego Orofino: the file's amount on a tier of excluded drugs only, Q6 everywhere else. Done in `scripts/from-pbp.js` (`docs/specs/pbp-part-d-mapping.md` section 6.6), with a test.
- **N1, stand-alone drug plans:** decided: their premium is written from `PREMIUM` now. Done in `scripts/from-partd-formulary.js` (spec section 7.2): S5921-383 $184.10 and S4802-146 $5.30 in the examples.
- **N1, Medicare Advantage plans:** not deferred: what the PBP document's premium says, and a proposal for draft 9, wait for a decision; nothing is changed until then.
