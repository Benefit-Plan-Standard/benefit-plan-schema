# Stop 2a: 10 UnitedHealthcare and AARP plans against their Summaries of Benefits

**Date:** November 11, 2026. **For:** the Benefit Plan Standard 1.2.0 release gate. **Status:** the contract year 2027 column is checked; the 2026 column waits on the Medicare Advantage importer's reading of the 2026 PBP layout (section 3), which needs no schema change.

## 1. The plans

| Plan, 2026 and 2027 | Name | Kind |
|---|---|---|
| H2406-013-000 | AARP Medicare Advantage from UHC FL-0021 (PPO) | Medicare Advantage, Florida |
| H1045-026-000 | AARP Medicare Advantage from UHC FL-0005 (HMO-POS) | Medicare Advantage, Florida |
| H1045-001-000 | UHC Preferred Medicare Advantage FL-0001 (HMO) | Medicare Advantage, Florida |
| H5420-001-000 | UHC MedicareMax Medicare Advantage FL-0028 (HMO) | Medicare Advantage, Florida |
| H1045-059-000 | AARP Medicare Advantage CareFlex from UHC FL-34 (HMO-POS) | Medicare Advantage, Florida |
| S5921-383-000 | AARP Medicare Rx Preferred from UHC (PDP) | stand-alone drug plan, Florida |
| S5921-356-000 | AARP Medicare Rx Saver from UHC (PDP) | stand-alone drug plan, Florida |
| S5921-403-000 | AARP Medicare Rx Preferred from UHC (PDP) | stand-alone drug plan, Texas |
| S5921-367-000 | AARP Medicare Rx Saver from UHC (PDP) | stand-alone drug plan, Texas |
| S5921-413-000 | AARP Medicare Rx Preferred from UHC (PDP) | stand-alone drug plan, California |

Each keeps its contract, plan and segment from 2026 to 2027 in the PBP files.

## 2. Contract year 2027

Each plan's document is the Medicare Advantage importer's document with its Part D drug list and premium parts (`scripts/from-partd-formulary.js --plan`), validated against the 1.2.0 draft 9 schema, and checked with `scripts/pbp-sob-check.js` against 1 check file per plan in [`../pbp-sob-checks/`](../pbp-sob-checks/README.md), premium included.

**453 checks: 423 MATCH, 29 READING, 1 DIFFERENCE.**

- **Agreements, 423 checks:** every premium (a stand-alone plan's, $115.70 to $242.60, from the Part D formulary file; each Medicare Advantage plan's $0, with `drug_amount` $0 checked on the 4 new files), the 2 Part B premium reductions ($55 and $50), the medical and drug deductibles, the out-of-pocket maximums, inpatient and skilled nursing day steps, office visits, emergency and urgent care, outpatient and surgical center, imaging and lab, hearing, vision and dental allowances, therapies, chiropractic, ambulance, foot care, home health, fitness, and the drug tier cost shares the Summaries print.
- **Readings, 29:** of the kinds the October check found: a copay the PBP file states as a range from $0 where the Summary prints the maximum (specialists, urgent care, mental health), an observation copay the file gives per day, and the October H2406-013 and S5921-383 files' own.
- **Contradictions between the CMS file and the carrier's document: 0.**
- **Importer gaps: 1, on 1 plan.** H1045-059's CareFlex credit, "$450 quarterly credit to help lower your out-of-pocket costs" (page 2), is in `pbp_Section_D.txt` as Reductions in Cost Sharing: `pbp_d_rics_yn` "1", `pbp_d_rics_max_bene_amt_1` "450.00", `pbp_d_rics_period_1` "5" (Every 3 months), `pbp_d_rics_mod_1` "010" (Debit Card), with the 38 Medicare service categories it applies to in `pbp_d_rics_mc_cats_1`. `scripts/from-pbp.js` does not read the `pbp_d_rics_` columns, so the document says nothing of it; 95 plans of contract year 2027 have such a credit. The schema can hold it as it stands (a benefit with a dollars limit per 3 months and its categories in `conditions` or `notes`), so this is importer work, not a schema gap.

## 3. Contract year 2026

The 2026 PBP files are downloaded (`data/pbp/2026/`, `pbp-benefits-2026.zip`, 22,892,140 bytes, `Last-Modified` Tue, 28 Oct 2025, SHA-256 `1720048e668f6c9e4abc47c512e537c013600de12860d28aea4f8308b5e51de4`). The Medicare Advantage importer reads the 2027 layout only:

- **Done:** the 2026 Part D parameters, $615 deductible and $2,100 out-of-pocket threshold, the 2026 column of Table V-2 of the CY 2027 Rate Announcement (page 95). S5921-383-000's 2026 document now builds.
- **Left:** the 24 files the importer reads have 60 columns in the 2027 layout that the 2026 files lack (21 combined-group columns in Section D, 30 balance columns in the drug files, 6 dental and hearing columns, 3 in Section A), and a Medicare Advantage plan stops on the first of them it reads (H1045-026-000 and H2406-013-000 on `pbp_d_combo_19b_uf_nmc_cats_1`). Of the 3,528 columns those files have in both years, 3,491 are in both dictionaries, and 100 of them have code lists that differ, compared code by code with spacing ignored: 52 in wording only (code 2 of `pbp_b2_benedesc_lim_ad` is "No, indicate number" in 2026 and "No" in 2027) and 48 in their codes (`pbp_b2_bendesc_ad_nmcs`, 2 code positions in 2026 and 1 in 2027; `pbp_b14c_bendesc_typ_mhc`, the fitness types, whose "1 in 4", Fitness Equipment or Kit, only 2027 has).
- **Does anything in the 2026 files need something the schema cannot hold? No.** The 5 columns only the 2026 files have are a VBID participation flag and an ESRD special needs plan bid-tool date and time (`pbp_a_vbid_indicator`, `pbp_a_BPT_ESRD_date_time`, empty on all 8,081 rows of Section A), 2 insulin out-of-network columns (empty on all 27,565 tier rows), and `mrx_alt_fulfill_desc`, free text on how a plan with reduced initial coverage cost shares raises its actuarial value above the defined standard (4,535 of 8,079 rows), which the importer can quote as it quotes other text. Every code-list difference changes how a cell is read into a field that exists, never which fields there are. The Reductions in Cost Sharing columns are in both years, 62 of them (H1045-059-000's 2026 credit is $550 every 3 months, `pbp_d_rics_max_bene_amt_1` "550.00"; 158 plans have one in 2026).

So the 2026 column is importer work that can finish after the release: read a column the year's files lack as blank and quote the list of them, go through the 100 code lists against what the importer reads, then the 10 plans' 2026 Summaries of Benefits. Its formulary side needs the 2026 monthly Part D file too (the newest the CMS catalog lists is `2026_20260916`).
