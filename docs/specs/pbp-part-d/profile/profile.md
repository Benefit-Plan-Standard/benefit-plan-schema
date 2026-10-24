# Profile: CMS PBP Part D files, contract year 2027

Written by `node docs/specs/pbp-part-d/profile/profile-mrx.js` from `data/pbp/2027/` (release in `download.json`: "PBP Benefits-2027", downloaded 2026-10-06). Do not edit by hand; re-run the script. Files: `pbp_mrx.txt` 7,971 rows, 90 columns; `pbp_mrx_tier.txt` 27,427 rows, 140 columns; `pbp_mrx_p.txt` 27,427 rows, 20 columns. Read with the importer's reader (`streamTsv` in `scripts/from-pbp.js`: CRLF, Windows-1252, field counts checked). Code lists: `code-lists.md`, from the same run. The fixture plans' cells and Part D benefit listings are in `plans/`, written with `--plan` and `--benefits`.

## P1. Populations

Plans in `pbp_Section_A.txt` by `pbp_a_plan_type`; whether each has a `pbp_mrx.txt` row and its `mrx_drug_ben_yn` ("Does your plan offer a Medicare Prescription drug (Part D) benefit?", 1 Yes, 2 No); whether it has `pbp_mrx_tier.txt` and `pbp_mrx_p.txt` rows.

| Type | Label | Section A | pbp_mrx row | drug_ben_yn 1 | drug_ben_yn 2 | drug_ben_yn blank | With tier rows | With post-threshold rows |
|---|---|---|---|---|---|---|---|---|
| 01 | HMO | 3,115 | 3,115 | 2,780 | 335 | 0 | 2,303 | 2,303 |
| 02 | HMOPOS | 1,273 | 1,273 | 1,173 | 100 | 0 | 1,060 | 1,060 |
| 04 | Local PPO | 2,411 | 2,411 | 2,003 | 408 | 0 | 1,571 | 1,571 |
| 07 | MSA | 19 | 19 | 0 | 19 | 0 | 0 | 0 |
| 09 | PFFS | 16 | 16 | 10 | 6 | 0 | 7 | 7 |
| 18 | 1876 Cost | 42 | 42 | 10 | 32 | 0 | 7 | 7 |
| 20 | National Pace | 416 | 416 | 416 | 0 | 0 | 0 | 0 |
| 29 | Medicare Prescription Drug Plan | 606 | 606 | 606 | 0 | 0 | 318 | 318 |
| 30 | Employer/Union Only Direct Contract PDP | 2 | 0 | 0 | 0 | 0 | 0 | 0 |
| 31 | Regional PPO | 73 | 73 | 40 | 33 | 0 | 22 | 22 |
| all |  | 7,973 | 7,971 | 7,038 | 933 | 0 | 5,288 | 5,288 |

`pbp_mrx.txt` keys not in Section A: 0. `pbp_mrx_tier.txt` keys with no `pbp_mrx.txt` row: 0. Plans with tier rows but no post-threshold rows, or the reverse: 0.

Populations used below (MA-PD and PDP are the 2 the importer reads):

| Population | Plans |
|---|---|
| MA-PD (01, 02, 04, 31) | 5,996 |
| PDP (29) | 606 |
| MA without Part D (01, 02, 04, 31) | 876 |
| Other MA-PD (07, 09, 18, 20) | 436 |
| Other, no Part D (07, 09, 18, 20) | 57 |
| Employer PDP (30) | 2 |

## P2. `mrx_benefit_type` by population

"Type of drug benefit". A plan with no tier rows has no tier-level cost shares in the file.

| Population | Code | Label | Plans | With tier rows | Without tier rows |
|---|---|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | Defined Standard | 202 | 0 | 202 |
| MA-PD (01, 02, 04, 31) | 2 | Actuarially Equivalent Standard | 31 | 31 | 0 |
| MA-PD (01, 02, 04, 31) | 3 | Basic Alternative | 20 | 20 | 0 |
| MA-PD (01, 02, 04, 31) | 4 | Enhanced Alternative | 4,905 | 4,905 | 0 |
| MA-PD (01, 02, 04, 31) |  | (blank) | 838 | 0 | 838 |
| PDP (29) | 1 | Defined Standard | 5 | 0 | 5 |
| PDP (29) | 2 | Actuarially Equivalent Standard | 162 | 162 | 0 |
| PDP (29) | 3 | Basic Alternative | 5 | 5 | 0 |
| PDP (29) | 4 | Enhanced Alternative | 151 | 151 | 0 |
| PDP (29) |  | (blank) | 283 | 0 | 283 |
| Other MA-PD (07, 09, 18, 20) | 2 | Actuarially Equivalent Standard | 1 | 1 | 0 |
| Other MA-PD (07, 09, 18, 20) | 3 | Basic Alternative | 2 | 2 | 0 |
| Other MA-PD (07, 09, 18, 20) | 4 | Enhanced Alternative | 11 | 11 | 0 |
| Other MA-PD (07, 09, 18, 20) |  | (blank) | 422 | 0 | 422 |

Plans with `mrx_drug_ben_yn` "1" and a blank `mrx_benefit_type`, by plan type, `pbp_a_eghp_yn` (employer group plan, 1 Yes), plan number range and the `mrx_` columns they fill:

| pbp_a_plan_type | pbp_a_eghp_yn | pbp_a_plan_identifier | mrx_ columns filled | Plans |
|---|---|---|---|---|
| 01 | 1 | 800 to 999 | `mrx_drug_ben_yn` | 334 |
| 02 | 1 | 800 to 999 | `mrx_drug_ben_yn` | 98 |
| 04 | 1 | 800 to 999 | `mrx_drug_ben_yn` | 390 |
| 09 | 1 | 800 to 999 | `mrx_drug_ben_yn` | 3 |
| 18 | 1 | 800 to 999 | `mrx_drug_ben_yn` | 3 |
| 20 | 2 | below 800 | `mrx_drug_ben_yn` | 416 |
| 29 | 1 | 800 to 999 | `mrx_drug_ben_yn` | 283 |
| 31 | 1 | 800 to 999 | `mrx_drug_ben_yn` | 16 |

## P3. Tiers per plan

`mrx_formulary_tiers_num` ("Number of tiers in the Part D benefit"), MA-PD and PDP plans:

| Population | mrx_formulary_tiers_num | Plans |
|---|---|---|
| MA-PD (01, 02, 04, 31) | (blank) | 1,040 |
| MA-PD (01, 02, 04, 31) | 1 | 4 |
| MA-PD (01, 02, 04, 31) | 2 | 1 |
| MA-PD (01, 02, 04, 31) | 4 | 31 |
| MA-PD (01, 02, 04, 31) | 5 | 3,921 |
| MA-PD (01, 02, 04, 31) | 6 | 999 |
| PDP (29) | (blank) | 288 |
| PDP (29) | 5 | 280 |
| PDP (29) | 6 | 38 |

Rows in `pbp_mrx_tier.txt` per plan:

| Population | Tier rows | Plans |
|---|---|---|
| MA-PD (01, 02, 04, 31) | 0 | 1,040 |
| MA-PD (01, 02, 04, 31) | 1 | 4 |
| MA-PD (01, 02, 04, 31) | 2 | 1 |
| MA-PD (01, 02, 04, 31) | 4 | 31 |
| MA-PD (01, 02, 04, 31) | 5 | 3,921 |
| MA-PD (01, 02, 04, 31) | 6 | 999 |
| PDP (29) | 0 | 288 |
| PDP (29) | 5 | 280 |
| PDP (29) | 6 | 38 |

Plans with tier rows whose row count equals `mrx_formulary_tiers_num`: 5,274; different: 0.

## P4. Deductible: `mrx_alt_ded_charge` and `mrx_alt_ded_amount`

"Does this plan charge the Medicare-defined Part D deductible amount?" and "Enter Deductible Amount".

| Population | Code | Label | Plans | Amount filled | Amount blank |
|---|---|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | Yes (charges the Medicare-defined Part D deductible amount) | 2,109 | 2,109 | 0 |
| MA-PD (01, 02, 04, 31) | 2 | No, enter amount | 2,366 | 2,366 | 0 |
| MA-PD (01, 02, 04, 31) | 3 | No Deductible | 450 | 0 | 450 |
| MA-PD (01, 02, 04, 31) |  | (blank) | 1,071 | 233 | 838 |
| PDP (29) | 1 | Yes (charges the Medicare-defined Part D deductible amount) | 46 | 46 | 0 |
| PDP (29) | 2 | No, enter amount | 107 | 107 | 0 |
| PDP (29) | 3 | No Deductible | 3 | 0 | 3 |
| PDP (29) |  | (blank) | 450 | 167 | 283 |

Amounts (all amounts for code 1; for code 2 the amounts on 5 or more plans when there are more than 12 distinct):

| Population | Code | mrx_alt_ded_amount | Plans |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | 700.00 | 2,109 |
| MA-PD (01, 02, 04, 31) | 2 | 685.00 | 335 |
| MA-PD (01, 02, 04, 31) | 2 | 650.00 | 258 |
| MA-PD (01, 02, 04, 31) |  | 700.00 | 233 |
| MA-PD (01, 02, 04, 31) | 2 | 500.00 | 192 |
| MA-PD (01, 02, 04, 31) | 2 | 400.00 | 186 |
| MA-PD (01, 02, 04, 31) | 2 | 461.00 | 172 |
| MA-PD (01, 02, 04, 31) | 2 | 300.00 | 113 |
| MA-PD (01, 02, 04, 31) | 2 | 595.00 | 101 |
| MA-PD (01, 02, 04, 31) | 2 | 450.00 | 92 |
| MA-PD (01, 02, 04, 31) | 2 | 200.00 | 79 |
| MA-PD (01, 02, 04, 31) | 2 | 600.00 | 73 |
| MA-PD (01, 02, 04, 31) | 2 | 350.00 | 60 |
| MA-PD (01, 02, 04, 31) | 2 | 250.00 | 59 |
| MA-PD (01, 02, 04, 31) | 2 | 105.00 | 53 |
| MA-PD (01, 02, 04, 31) | 2 | 75.00 | 44 |
| MA-PD (01, 02, 04, 31) | 2 | 100.00 | 38 |
| MA-PD (01, 02, 04, 31) | 2 | 465.00 | 38 |
| MA-PD (01, 02, 04, 31) | 2 | 550.00 | 31 |
| MA-PD (01, 02, 04, 31) | 2 | 150.00 | 26 |
| MA-PD (01, 02, 04, 31) | 2 | 370.00 | 25 |
| MA-PD (01, 02, 04, 31) | 2 | 50.00 | 21 |
| MA-PD (01, 02, 04, 31) | 2 | 440.00 | 20 |
| MA-PD (01, 02, 04, 31) | 2 | 270.00 | 15 |
| MA-PD (01, 02, 04, 31) | 2 | 520.00 | 14 |
| MA-PD (01, 02, 04, 31) | 2 | 405.00 | 14 |
| MA-PD (01, 02, 04, 31) | 2 | 225.00 | 13 |
| MA-PD (01, 02, 04, 31) | 2 | 325.00 | 11 |
| MA-PD (01, 02, 04, 31) | 2 | 475.00 | 11 |
| MA-PD (01, 02, 04, 31) | 2 | 275.00 | 11 |
| MA-PD (01, 02, 04, 31) | 2 | 425.00 | 11 |
| MA-PD (01, 02, 04, 31) | 2 | 55.00 | 11 |
| MA-PD (01, 02, 04, 31) | 2 | 355.00 | 10 |
| MA-PD (01, 02, 04, 31) | 2 | 205.00 | 10 |
| MA-PD (01, 02, 04, 31) | 2 | 395.00 | 10 |
| MA-PD (01, 02, 04, 31) | 2 | 505.00 | 9 |
| MA-PD (01, 02, 04, 31) | 2 | 310.00 | 8 |
| MA-PD (01, 02, 04, 31) | 2 | 490.00 | 7 |
| MA-PD (01, 02, 04, 31) | 2 | 597.00 | 7 |
| MA-PD (01, 02, 04, 31) | 2 | 455.00 | 7 |
| MA-PD (01, 02, 04, 31) | 2 | 210.00 | 6 |
| MA-PD (01, 02, 04, 31) | 2 | 615.00 | 6 |
| MA-PD (01, 02, 04, 31) | 2 | 495.00 | 6 |
| MA-PD (01, 02, 04, 31) | 2 | 390.00 | 5 |
| MA-PD (01, 02, 04, 31) | 2 | 590.00 | 5 |
| MA-PD (01, 02, 04, 31) | 2 | 315.00 | 5 |
| MA-PD (01, 02, 04, 31) | 2 | 340.00 | 5 |
| MA-PD (01, 02, 04, 31) | 2 | 375.00 | 5 |
| MA-PD (01, 02, 04, 31) | 2 | 95.00 | 5 |
| MA-PD (01, 02, 04, 31) | 2 | 280.00 | 5 |
| MA-PD (01, 02, 04, 31) | 2 | 260.00 | 5 |
| PDP (29) |  | 700.00 | 167 |
| PDP (29) | 1 | 700.00 | 46 |
| PDP (29) | 2 | 350.00 | 35 |
| PDP (29) | 2 | 300.00 | 35 |
| PDP (29) | 2 | 687.00 | 34 |
| PDP (29) | 2 | 250.00 | 1 |
| PDP (29) | 2 | 200.00 | 1 |
| PDP (29) | 2 | 125.00 | 1 |

Distinct amounts: MA-PD (01, 02, 04, 31), code 1: 1; MA-PD (01, 02, 04, 31), code 2: 105; MA-PD (01, 02, 04, 31), code : 1; PDP (29), code 1: 1; PDP (29), code 2: 6; PDP (29), code : 1.

## P5. Tiers the deductible skips

Plans with a deductible (`mrx_alt_ded_charge` 1 or 2): `mrx_alt_ded_type_yn` ("Does the Deductible apply to all tiers?", 1 Yes, 2 No) and `mrx_alt_no_ded_tier` ("Each tier for which the deductible will NOT apply", position string; the dictionary puts Tier 7 at position 1 and Tiers 1 to 6 at positions 2 to 7).

| Population | mrx_alt_ded_type_yn | mrx_alt_no_ded_tier | Tiers named | Plans |
|---|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 2 | "0110000" | Tier 1, Tier 2 | 3,252 |
| MA-PD (01, 02, 04, 31) | 2 | "0110001" | Tier 1, Tier 2, Tier 6 | 364 |
| MA-PD (01, 02, 04, 31) | 2 | "0111000" | Tier 1, Tier 2, Tier 3 | 260 |
| MA-PD (01, 02, 04, 31) | 2 | "0100000" | Tier 1 | 204 |
| MA-PD (01, 02, 04, 31) | 2 | "0100001" | Tier 1, Tier 6 | 200 |
| MA-PD (01, 02, 04, 31) | 2 | "0111001" | Tier 1, Tier 2, Tier 3, Tier 6 | 103 |
| PDP (29) | 2 | "0110000" | Tier 1, Tier 2 | 79 |
| MA-PD (01, 02, 04, 31) | 2 | "0110101" | Tier 1, Tier 2, Tier 4, Tier 6 | 51 |
| PDP (29) | 2 | "0100001" | Tier 1, Tier 6 | 35 |
| PDP (29) | 2 | "0111000" | Tier 1, Tier 2, Tier 3 | 34 |
| MA-PD (01, 02, 04, 31) | 2 | "0000001" | Tier 6 | 20 |
| MA-PD (01, 02, 04, 31) | 1 | (blank) |  | 16 |
| MA-PD (01, 02, 04, 31) | 2 | "0000010" | Tier 5 | 2 |
| MA-PD (01, 02, 04, 31) | 2 | "0100010" | Tier 1, Tier 5 | 2 |
| PDP (29) | 1 | (blank) |  | 2 |
| MA-PD (01, 02, 04, 31) | 2 | "0111101" | Tier 1, Tier 2, Tier 3, Tier 4, Tier 6 | 1 |
| PDP (29) | 2 | "0000001" | Tier 6 | 1 |
| PDP (29) | 2 | "0100000" | Tier 1 | 1 |
| PDP (29) | 2 | "0110001" | Tier 1, Tier 2, Tier 6 | 1 |

## P6. Cost-share structure

`mrx_tier_cstshr_struct_type` on the tier rows of MA-PD and PDP plans:

| Population | Code | Label | Tier rows |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | Coinsurance | 14,558 |
| MA-PD (01, 02, 04, 31) | 2 | Copayment | 11,171 |
| PDP (29) | 1 | Coinsurance | 1,066 |
| PDP (29) | 2 | Copayment | 562 |

Which amount columns a tier row fills, against its structure (all locations and supplies):

| Structure | Columns filled | Tier rows |
|---|---|---|
| 1 | coinsurance | 15,624 |
| 2 | copay | 11,733 |

`mrx_tier_post_cost_struct` on the post-threshold rows (`pbp_mrx_p.txt`):

| Population | Code | Label | Rows |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | Coinsurance | 62 |
| MA-PD (01, 02, 04, 31) | 2 | Copayment | 25,667 |
| PDP (29) | 1 | Coinsurance | 5 |
| PDP (29) | 2 | Copayment | 1,623 |

## P7. Pharmacy locations

A location is used on a tier row when its flag column (for example `mrx_tier_locat_rstd`) chooses at least 1 supply. MA-PD and PDP plans with tier rows.

| Population | Location | Label | Tier rows | Plans |
|---|---|---|---|---|
| MA-PD (01, 02, 04, 31) | `rstd` | Standard retail (retail not split) | 17,095 | 3,298 |
| PDP (29) | `rstd` | Standard retail (retail not split) | 312 | 62 |
| MA-PD (01, 02, 04, 31) | `rsplt` | Retail split into standard and preferred | 8,634 | 1,658 |
| PDP (29) | `rsplt` | Retail split into standard and preferred | 1,316 | 256 |
| MA-PD (01, 02, 04, 31) | `mostd` | Standard mail order (mail order not split) | 12,612 | 2,490 |
| PDP (29) | `mostd` | Standard mail order (mail order not split) | 150 | 30 |
| MA-PD (01, 02, 04, 31) | `mosplt` | Mail order split into standard and preferred | 12,398 | 2,451 |
| PDP (29) | `mosplt` | Mail order split into standard and preferred | 1,406 | 288 |
| MA-PD (01, 02, 04, 31) | `oon` | Out-of-network pharmacy | 25,729 | 4,956 |
| PDP (29) | `oon` | Out-of-network pharmacy | 1,628 | 318 |
| MA-PD (01, 02, 04, 31) | `ltc` | Long-term care pharmacy | 25,729 | 4,956 |
| PDP (29) | `ltc` | Long-term care pharmacy | 1,628 | 318 |

Location sets per plan:

| Population | Locations used | Plans |
|---|---|---|
| MA-PD (01, 02, 04, 31) | rstd + mostd + oon + ltc | 2,130 |
| MA-PD (01, 02, 04, 31) | rsplt + mosplt + oon + ltc | 1,293 |
| MA-PD (01, 02, 04, 31) | rstd + mosplt + oon + ltc | 1,158 |
| MA-PD (01, 02, 04, 31) | rsplt + mostd + oon + ltc | 360 |
| PDP (29) | rsplt + mosplt + oon + ltc | 252 |
| PDP (29) | rstd + mosplt + oon + ltc | 36 |
| PDP (29) | rstd + mostd + oon + ltc | 26 |
| MA-PD (01, 02, 04, 31) | rstd + oon + ltc | 10 |
| MA-PD (01, 02, 04, 31) | rsplt + oon + ltc | 5 |
| PDP (29) | rsplt + mostd + oon + ltc | 4 |

Plans that use `rstd` on some tiers and `rsplt` on others: 0. The same for `mostd` and `mosplt`: 0.

`mrx_partd_network_loc` ("Describe the components of your pharmacy network", DERIVED, position string), positions chosen:

| Population | Position | Plans |
|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 Long-Term Care | 5,158 |
| MA-PD (01, 02, 04, 31) | 2 Standard Retail | 3,500 |
| MA-PD (01, 02, 04, 31) | 3 Standard/Preferred Retail | 1,658 |
| MA-PD (01, 02, 04, 31) | 4 Out-of-Network | 5,158 |
| MA-PD (01, 02, 04, 31) | 5 Standard Mail-Order | 2,669 |
| MA-PD (01, 02, 04, 31) | 6 Standard/Preferred Mail-Order | 2,451 |
| PDP (29) | 1 Long-Term Care | 323 |
| PDP (29) | 2 Standard Retail | 67 |
| PDP (29) | 3 Standard/Preferred Retail | 256 |
| PDP (29) | 4 Out-of-Network | 323 |
| PDP (29) | 5 Standard Mail-Order | 35 |
| PDP (29) | 6 Standard/Preferred Mail-Order | 288 |

Plans with tier rows whose `mrx_partd_network_loc` equals the locations their tier rows use (positions LTC, rstd, rsplt, oon, mostd, mosplt): 5,274; different: 0.

## P8. Days supply

The days-supply column of each chosen supply (for example `mrx_tier_rstd_3m_num`), MA-PD and PDP tier rows. A chosen supply with a blank days column would be a file error.

| Location | Supply | Days | Tier rows |
|---|---|---|---|
| `ltc` | 1m | 31 | 25,798 |
| `ltc` | 1m | 34 | 1,559 |
| `mosplt` | 1m | 30 | 10,574 |
| `mosplt` | 1m | 31 | 321 |
| `mosplt` | 2m | 60 | 5,524 |
| `mosplt` | 3m | 90 | 1,999 |
| `mosplt` | 3m | 100 | 8,843 |
| `mostd` | 1m | 30 | 9,912 |
| `mostd` | 1m | 31 | 483 |
| `mostd` | 1m | 34 | 60 |
| `mostd` | 2m | 60 | 7,485 |
| `mostd` | 2m | 62 | 1 |
| `mostd` | 2m | 68 | 50 |
| `mostd` | 3m | 90 | 2,304 |
| `mostd` | 3m | 93 | 12 |
| `mostd` | 3m | 100 | 7,796 |
| `mostd` | 3m | 102 | 54 |
| `oon` | 1m | 30 | 22,484 |
| `oon` | 1m | 31 | 1,242 |
| `oon` | 1m | 34 | 60 |
| `oon` | other | 10 | 3,422 |
| `oon` | other | 14 | 72 |
| `oon` | other | 29 | 59 |
| `oon` | other | 30 | 6 |
| `oon` | other | 33 | 12 |
| `rsplt` | 1m | 30 | 9,315 |
| `rsplt` | 1m | 31 | 635 |
| `rsplt` | 2m | 60 | 6,758 |
| `rsplt` | 3m | 90 | 2,598 |
| `rsplt` | 3m | 100 | 5,288 |
| `rstd` | 1m | 30 | 16,722 |
| `rstd` | 1m | 31 | 613 |
| `rstd` | 1m | 34 | 72 |
| `rstd` | 2m | 60 | 6,988 |
| `rstd` | 2m | 62 | 16 |
| `rstd` | 2m | 68 | 60 |
| `rstd` | 3m | 90 | 1,784 |
| `rstd` | 3m | 93 | 12 |
| `rstd` | 3m | 100 | 11,359 |
| `rstd` | 3m | 102 | 64 |

## P9. 2- and 3-month amounts against the 1-month amount

For each tier row, location part (`rstd`, `rsstd`, `rspfd`, `mostd`, `mosstd`, `mospfd`) and kind, where the 1-month supply is chosen and its amount filled, the 2- or 3-month amount of a chosen 2- or 3-month supply. MA-PD and PDP tier rows.

| Kind | Supply | Against 1-month | Cells |
|---|---|---|---|
| coins | 2m | equal | 17,076 |
| coins | 3m | different | 701 |
| coins | 3m | equal | 23,649 |
| copay | 2m | different | 8,875 |
| copay | 2m | equal | 10,569 |
| copay | 3m | different | 12,971 |
| copay | 3m | equal | 15,395 |

Plans with at least 1 chosen 2- or 3-month supply: 5,274; of those, plans with at least 1 amount different from its 1-month amount: 4,010.

Copay ratios (2- or 3-month amount divided by a non-zero 1-month amount) on 50 or more cells:

| Part | Supply | Ratio | Cells |
|---|---|---|---|
| `mosstd` | 3m | 3.00 | 3,604 |
| `rsstd` | 3m | 3.00 | 3,208 |
| `rsstd` | 2m | 2.00 | 2,936 |
| `mosstd` | 2m | 2.00 | 2,085 |
| `rstd` | 3m | 3.00 | 1,854 |
| `rstd` | 2m | 2.00 | 1,151 |
| `mostd` | 2m | 2.00 | 1,139 |
| `rspfd` | 2m | 2.00 | 1,118 |
| `rspfd` | 3m | 3.00 | 1,115 |
| `mospfd` | 3m | 0.00 | 610 |
| `mostd` | 3m | 2.50 | 428 |
| `mospfd` | 2m | 2.00 | 398 |
| `mostd` | 3m | 2.00 | 397 |
| `rsstd` | 3m | 2.00 | 272 |
| `mostd` | 3m | 3.00 | 232 |
| `mosstd` | 3m | 2.00 | 216 |
| `mospfd` | 3m | 3.00 | 185 |
| `mostd` | 3m | 0.00 | 125 |
| `rspfd` | 3m | 2.00 | 123 |
| `rstd` | 3m | 2.00 | 105 |
| `rsstd` | 3m | 2.50 | 77 |
| `rstd` | 3m | 0.00 | 76 |
| `rspfd` | 3m | 0.00 | 68 |
| `rstd` | 3m | 2.50 | 56 |

## P10. Tier labels

`mrx_tier_label_list` ("Tier Label Description", CHAR 250): the dictionary gives no code list for it. 13 distinct values on 27,357 MA-PD and PDP tier rows; all of them, with the `mrx_tier_id` each appears under, are in `tier-labels.csv`. `mrx_form_model_type` ("Formulary Tier Label Model", DERIVED) and `mrx_form_model_desc` per plan: 16 distinct pairs, in `tier-label-models.csv`.

Plans whose tier labels, in `mrx_tier_id` order and joined with ", ", equal `mrx_form_model_desc`: 5,274; not equal: 0.

| mrx_tier_label_list | Tier rows | mrx_tier_id: rows |
|---|---|---|
| "Preferred Brand" | 5,269 | 2: 312, 3: 4957 |
| "Specialty Tier" | 5,269 | 4: 46, 5: 5223 |
| "Generic" | 5,233 | 1: 276, 2: 4957 |
| "Non-Preferred Drug" | 5,214 | 3: 309, 4: 4905 |
| "Preferred Generic" | 4,994 | 1: 4994 |
| "Select Care Drugs" | 846 | 5: 3, 6: 843 |
| "Injectable Drugs" | 268 | 4: 268 |
| "Vaccines" | 130 | 6: 130 |
| "Non-Preferred Brand" | 53 | 3: 3, 4: 50 |
| "Supplemental Drugs" | 52 | 5: 4, 6: 48 |
| "Select Diabetic Drugs" | 24 | 5: 8, 6: 16 |
| "Single Tier" | 4 | 1: 4 |
| "Brand" | 1 | 2: 1 |

## P11. Tier identity and content

`mrx_tier_id` "1": 5,274; `mrx_tier_id` "2": 5,270; `mrx_tier_id` "3": 5,269; `mrx_tier_id` "4": 5,269; `mrx_tier_id` "5": 5,238; `mrx_tier_id` "6": 1,037.

`mrx_tier_type_id` "1": 27,357.

`mrx_tier_includes` "1": 24,988; `mrx_tier_includes` "2": 52; `mrx_tier_includes` "3": 2,317.

`mrx_tier_drug_type` "01": 4,084; `mrx_tier_drug_type` "10": 480; `mrx_tier_drug_type` "11": 22,793.

Plans with a repeated `mrx_tier_id`: 0; a repeated `mrx_tier_label_list`: 0; tier ids that are not 1 to n: 0. Plans whose post-threshold rows do not carry the same (id, label) pairs as their tier rows: 0.

`mrx_tier_includes` (1 Part D Drugs Only, 2 Excluded Drugs Only, 3 Both Part D and Excluded Drugs) by label:

| mrx_tier_label_list | mrx_tier_includes | Tier rows |
|---|---|---|
| "Brand" | 3 | 1 |
| "Generic" | 1 | 3,755 |
| "Generic" | 3 | 1,478 |
| "Injectable Drugs" | 1 | 268 |
| "Non-Preferred Brand" | 1 | 53 |
| "Non-Preferred Drug" | 1 | 5,148 |
| "Non-Preferred Drug" | 3 | 66 |
| "Preferred Brand" | 1 | 5,152 |
| "Preferred Brand" | 3 | 117 |
| "Preferred Generic" | 1 | 4,345 |
| "Preferred Generic" | 3 | 649 |
| "Select Care Drugs" | 1 | 840 |
| "Select Care Drugs" | 3 | 6 |
| "Select Diabetic Drugs" | 1 | 24 |
| "Single Tier" | 1 | 4 |
| "Specialty Tier" | 1 | 5,269 |
| "Supplemental Drugs" | 2 | 52 |
| "Vaccines" | 1 | 130 |

## P12. PDPs by sponsor

606 plans of type 29 under 46 marketing names and 47 contracts; all rows in `pdp-sponsors.csv`. The 15 largest:

| pbp_a_org_marketing_name | pbp_a_org_name | PDPs |
|---|---|---|
| UnitedHealthcare | UNITEDHEALTHCARE INS. CO. & UHC INS. CO. OF NY | 114 |
| Humana | Humana Insurance Co. & Humana Insurance Co. of NY | 105 |
| Wellcare | WELLCARE PRESCRIPTION INSURANCE, INC. | 68 |
| Blue Cross and Blue Shield of IL, NM, OK, TX | MEDCO CONTAINMENT LIFE & MEDCO CONTAINMENT NY & HEALTH CARE SERVICE CORPORATION | 48 |
| Aetna Medicare | SILVERSCRIPT INSURANCE COMPANY | 43 |
| UnitedHealthcare | UNITEDHEALTHCARE INSURANCE COMPANY OF NEW YORK | 33 |
| MG Insurance Company | MG INSURANCE COMPANY | 20 |
| Pharmacy Benefit Dimensions PDP | INDEPENDENT HEALTH BENEFITS CORPORATION | 16 |
| Optum Insurance of Ohio, Inc. | OPTUM INSURANCE OF OHIO, INC. | 11 |
| Granite Alliance | GRANITE ALLIANCE INSURANCE COMPANY | 10 |
| Anthem Insurance Companies, Inc. | ANTHEM INSURANCE COMPANIES, INC. | 9 |
| Avalon Insurance Company | Avalon Insurance Company | 7 |
| BlueRx (PDP) | BCBS OF ALABAMA & UTIC INSURANCE COMPANY | 7 |
| Express Scripts Medicare | MEDCO CONTAINMENT LIFE AND MEDCO CONTAINMENT NY | 7 |
| Moda Health Plan, Inc. | MODA HEALTH PLAN, INC. | 7 |

First letter of `pbp_a_hnumber` by plan type: 01 H 3,115; 02 H 1,273; 04 H 2,411; 07 H 19; 09 H 16; 18 H 42; 20 H 416; 29 S 606; 30 E 2; 31 R 73.

## P13. Initial coverage, deductible-stage and post-threshold answers

`mrx_alt_pre_icl_cost_share`:

| Population | mrx_benefit_type | Value | Plans |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | (blank) | 202 |
| MA-PD (01, 02, 04, 31) | 2 | (blank) | 31 |
| MA-PD (01, 02, 04, 31) | 3 | 3 | 20 |
| MA-PD (01, 02, 04, 31) | 4 | 2 | 4 |
| MA-PD (01, 02, 04, 31) | 4 | 3 | 4,901 |
| MA-PD (01, 02, 04, 31) |  | (blank) | 838 |
| PDP (29) | 1 | (blank) | 5 |
| PDP (29) | 2 | (blank) | 162 |
| PDP (29) | 3 | 3 | 5 |
| PDP (29) | 4 | 3 | 151 |
| PDP (29) |  | (blank) | 283 |

`mrx_ae_cstshr_apply`:

| Population | mrx_benefit_type | Value | Plans |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | (blank) | 202 |
| MA-PD (01, 02, 04, 31) | 2 | 1 | 4 |
| MA-PD (01, 02, 04, 31) | 2 | 2 | 27 |
| MA-PD (01, 02, 04, 31) | 3 | (blank) | 20 |
| MA-PD (01, 02, 04, 31) | 4 | (blank) | 4,905 |
| MA-PD (01, 02, 04, 31) |  | (blank) | 838 |
| PDP (29) | 1 | (blank) | 5 |
| PDP (29) | 2 | 2 | 162 |
| PDP (29) | 3 | (blank) | 5 |
| PDP (29) | 4 | (blank) | 151 |
| PDP (29) |  | (blank) | 283 |

`mrx_alt_cstshr_post_oopt`:

| Population | mrx_benefit_type | Value | Plans |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | (blank) | 202 |
| MA-PD (01, 02, 04, 31) | 2 | (blank) | 31 |
| MA-PD (01, 02, 04, 31) | 3 | 1 | 20 |
| MA-PD (01, 02, 04, 31) | 4 | 1 | 3,565 |
| MA-PD (01, 02, 04, 31) | 4 | 3 | 1,340 |
| MA-PD (01, 02, 04, 31) |  | (blank) | 838 |
| PDP (29) | 1 | (blank) | 5 |
| PDP (29) | 2 | (blank) | 162 |
| PDP (29) | 3 | 1 | 5 |
| PDP (29) | 4 | 1 | 112 |
| PDP (29) | 4 | 3 | 39 |
| PDP (29) |  | (blank) | 283 |

`mrx_ae_ooptcs_apply`:

| Population | mrx_benefit_type | Value | Plans |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | (blank) | 202 |
| MA-PD (01, 02, 04, 31) | 2 | 1 | 31 |
| MA-PD (01, 02, 04, 31) | 3 | (blank) | 20 |
| MA-PD (01, 02, 04, 31) | 4 | (blank) | 4,905 |
| MA-PD (01, 02, 04, 31) |  | (blank) | 838 |
| PDP (29) | 1 | (blank) | 5 |
| PDP (29) | 2 | 1 | 162 |
| PDP (29) | 3 | (blank) | 5 |
| PDP (29) | 4 | (blank) | 151 |
| PDP (29) |  | (blank) | 283 |

`mrx_alt_ded_tier_cstshr_yn`:

| Population | mrx_benefit_type | Value | Plans |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | (blank) | 202 |
| MA-PD (01, 02, 04, 31) | 2 | (blank) | 31 |
| MA-PD (01, 02, 04, 31) | 3 | (blank) | 1 |
| MA-PD (01, 02, 04, 31) | 3 | 1 | 19 |
| MA-PD (01, 02, 04, 31) | 4 | (blank) | 465 |
| MA-PD (01, 02, 04, 31) | 4 | 1 | 4,439 |
| MA-PD (01, 02, 04, 31) | 4 | 2 | 1 |
| MA-PD (01, 02, 04, 31) |  | (blank) | 838 |
| PDP (29) | 1 | (blank) | 5 |
| PDP (29) | 2 | (blank) | 162 |
| PDP (29) | 3 | (blank) | 2 |
| PDP (29) | 3 | 1 | 3 |
| PDP (29) | 4 | (blank) | 3 |
| PDP (29) | 4 | 1 | 148 |
| PDP (29) |  | (blank) | 283 |

`mrx_alt_gen_cstshr_struct`:

| Population | mrx_benefit_type | Value | Plans |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | (blank) | 202 |
| MA-PD (01, 02, 04, 31) | 2 | (blank) | 31 |
| MA-PD (01, 02, 04, 31) | 3 | (blank) | 20 |
| MA-PD (01, 02, 04, 31) | 4 | (blank) | 4,904 |
| MA-PD (01, 02, 04, 31) | 4 | 1 | 1 |
| MA-PD (01, 02, 04, 31) |  | (blank) | 838 |
| PDP (29) | 1 | (blank) | 5 |
| PDP (29) | 2 | (blank) | 162 |
| PDP (29) | 3 | (blank) | 5 |
| PDP (29) | 4 | (blank) | 151 |
| PDP (29) |  | (blank) | 283 |

`mrx_alt_excl_drugs_yn`:

| Population | mrx_benefit_type | Value | Plans |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | (blank) | 202 |
| MA-PD (01, 02, 04, 31) | 2 | (blank) | 31 |
| MA-PD (01, 02, 04, 31) | 3 | (blank) | 20 |
| MA-PD (01, 02, 04, 31) | 4 | 1 | 2,134 |
| MA-PD (01, 02, 04, 31) | 4 | 2 | 2,771 |
| MA-PD (01, 02, 04, 31) |  | (blank) | 838 |
| PDP (29) | 1 | (blank) | 5 |
| PDP (29) | 2 | (blank) | 162 |
| PDP (29) | 3 | (blank) | 5 |
| PDP (29) | 4 | 1 | 75 |
| PDP (29) | 4 | 2 | 76 |
| PDP (29) |  | (blank) | 283 |

`mrx_alt_red_cost_sharing`:

| Population | mrx_benefit_type | Value | Plans |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | (blank) | 202 |
| MA-PD (01, 02, 04, 31) | 2 | (blank) | 31 |
| MA-PD (01, 02, 04, 31) | 3 | (blank) | 20 |
| MA-PD (01, 02, 04, 31) | 4 | 1 | 4,905 |
| MA-PD (01, 02, 04, 31) |  | (blank) | 838 |
| PDP (29) | 1 | (blank) | 5 |
| PDP (29) | 2 | (blank) | 162 |
| PDP (29) | 3 | (blank) | 5 |
| PDP (29) | 4 | 1 | 151 |
| PDP (29) |  | (blank) | 283 |

`mrx_ae_oon_cstshr_struct`:

| Population | mrx_benefit_type | Value | Plans |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | (blank) | 202 |
| MA-PD (01, 02, 04, 31) | 2 | 1 | 15 |
| MA-PD (01, 02, 04, 31) | 2 | 2 | 13 |
| MA-PD (01, 02, 04, 31) | 2 | 4 | 3 |
| MA-PD (01, 02, 04, 31) | 3 | (blank) | 20 |
| MA-PD (01, 02, 04, 31) | 4 | (blank) | 4,905 |
| MA-PD (01, 02, 04, 31) |  | (blank) | 838 |
| PDP (29) | 1 | (blank) | 5 |
| PDP (29) | 2 | 2 | 142 |
| PDP (29) | 2 | 3 | 20 |
| PDP (29) | 3 | (blank) | 5 |
| PDP (29) | 4 | (blank) | 151 |
| PDP (29) |  | (blank) | 283 |

`mrx_alt_oon_cstshr_struct`:

| Population | mrx_benefit_type | Value | Plans |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | (blank) | 202 |
| MA-PD (01, 02, 04, 31) | 2 | (blank) | 31 |
| MA-PD (01, 02, 04, 31) | 3 | 1 | 2 |
| MA-PD (01, 02, 04, 31) | 3 | 2 | 15 |
| MA-PD (01, 02, 04, 31) | 3 | 4 | 3 |
| MA-PD (01, 02, 04, 31) | 4 | 1 | 603 |
| MA-PD (01, 02, 04, 31) | 4 | 2 | 3,619 |
| MA-PD (01, 02, 04, 31) | 4 | 3 | 678 |
| MA-PD (01, 02, 04, 31) | 4 | 4 | 5 |
| MA-PD (01, 02, 04, 31) |  | (blank) | 838 |
| PDP (29) | 1 | (blank) | 5 |
| PDP (29) | 2 | (blank) | 162 |
| PDP (29) | 3 | 1 | 2 |
| PDP (29) | 3 | 2 | 3 |
| PDP (29) | 4 | 1 | 2 |
| PDP (29) | 4 | 2 | 149 |
| PDP (29) |  | (blank) | 283 |

`mrx_first_fill`:

| Population | mrx_benefit_type | Value | Plans |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 1 | (blank) | 202 |
| MA-PD (01, 02, 04, 31) | 2 | (blank) | 31 |
| MA-PD (01, 02, 04, 31) | 3 | 2 | 20 |
| MA-PD (01, 02, 04, 31) | 4 | 2 | 4,905 |
| MA-PD (01, 02, 04, 31) |  | (blank) | 838 |
| PDP (29) | 1 | (blank) | 5 |
| PDP (29) | 2 | (blank) | 162 |
| PDP (29) | 3 | 2 | 5 |
| PDP (29) | 4 | 2 | 151 |
| PDP (29) |  | (blank) | 283 |

Post-threshold rows of MA-PD and PDP plans: 27,357; with a non-zero copay or coinsurance: 1,105, on 1,003 plans. Non-zero rows whose amount equals a 1-month retail amount (`rstd`, `rsstd` or `rspfd`) of the same tier's initial coverage row: 1,105.

| Population | mrx_tier_post_includes | mrx_tier_post_copay_amt | mrx_tier_post_coins_pct | Rows |
|---|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 3 | 2.00 |  | 190 |
| MA-PD (01, 02, 04, 31) | 3 | 5.00 |  | 189 |
| MA-PD (01, 02, 04, 31) | 3 | 10.00 |  | 154 |
| MA-PD (01, 02, 04, 31) | 3 | 6.00 |  | 86 |
| MA-PD (01, 02, 04, 31) | 3 | 4.00 |  | 76 |
| MA-PD (01, 02, 04, 31) | 3 | 8.00 |  | 58 |
| MA-PD (01, 02, 04, 31) | 3 | 1.00 |  | 55 |
| PDP (29) | 3 | 10.00 |  | 34 |
| MA-PD (01, 02, 04, 31) | 3 | 30.00 |  | 29 |
| MA-PD (01, 02, 04, 31) | 3 | 40.00 |  | 24 |
| MA-PD (01, 02, 04, 31) | 3 | 9.00 |  | 21 |
| MA-PD (01, 02, 04, 31) | 3 |  | 32 | 20 |
| MA-PD (01, 02, 04, 31) | 3 |  | 40 | 20 |
| MA-PD (01, 02, 04, 31) | 3 | 12.00 |  | 15 |
| MA-PD (01, 02, 04, 31) | 3 | 45.00 |  | 15 |
| MA-PD (01, 02, 04, 31) | 3 | 15.00 |  | 14 |
| MA-PD (01, 02, 04, 31) | 3 | 7.00 |  | 13 |
| MA-PD (01, 02, 04, 31) | 3 | 14.00 |  | 12 |
| MA-PD (01, 02, 04, 31) | 3 | 100.00 |  | 10 |
| MA-PD (01, 02, 04, 31) | 3 |  | 25 | 8 |
| MA-PD (01, 02, 04, 31) | 3 | 19.00 |  | 7 |
| MA-PD (01, 02, 04, 31) | 3 | 47.00 |  | 7 |
| MA-PD (01, 02, 04, 31) | 3 | 35.00 |  | 6 |
| PDP (29) | 3 | 8.00 |  | 5 |
| MA-PD (01, 02, 04, 31) | 3 | 20.00 |  | 4 |
| MA-PD (01, 02, 04, 31) | 3 |  | 17 | 3 |
| MA-PD (01, 02, 04, 31) | 3 |  | 21 | 3 |
| MA-PD (01, 02, 04, 31) | 3 |  | 22 | 3 |
| MA-PD (01, 02, 04, 31) | 3 | 11.00 |  | 3 |
| MA-PD (01, 02, 04, 31) | 3 | 3.00 |  | 3 |
| PDP (29) | 3 |  | 30 | 3 |
| MA-PD (01, 02, 04, 31) | 2 | 10.00 |  | 2 |
| MA-PD (01, 02, 04, 31) | 3 |  | 30 | 2 |
| MA-PD (01, 02, 04, 31) | 3 |  | 45 | 2 |
| MA-PD (01, 02, 04, 31) | 3 | 75.00 |  | 2 |
| MA-PD (01, 02, 04, 31) | 3 |  | 50 | 1 |
| MA-PD (01, 02, 04, 31) | 3 | 16.00 |  | 1 |
| MA-PD (01, 02, 04, 31) | 3 | 25.00 |  | 1 |
| MA-PD (01, 02, 04, 31) | 3 | 42.00 |  | 1 |
| MA-PD (01, 02, 04, 31) | 3 | 93.00 |  | 1 |
| PDP (29) | 3 |  | 31 | 1 |
| PDP (29) | 3 |  | 32 | 1 |

Post-threshold rows by `mrx_tier_post_includes`, the plan's `mrx_alt_cstshr_post_oopt` ("How does this plan apply cost sharing for excluded drugs beyond the Medicare Part D Annual Out-of-Pocket cost threshold?", 1 No cost sharing, 2 Cost-Share Tiers (Different cost sharing than the ICP), 3 Cost-Share Tiers (Same cost sharing as the ICP)) and the amount:

| mrx_tier_post_includes | mrx_alt_cstshr_post_oopt | Amount | Rows |
|---|---|---|---|
| 1 | (blank) | zero or blank | 982 |
| 1 | 1 | zero or blank | 18,557 |
| 1 | 3 | zero or blank | 5,449 |
| 2 | 1 | zero or blank | 46 |
| 2 | 3 | non-zero | 2 |
| 2 | 3 | zero or blank | 4 |
| 3 | 1 | zero or blank | 805 |
| 3 | 3 | non-zero | 1,103 |
| 3 | 3 | zero or blank | 409 |

Plans with rare answers:

| Answer | Plans |
|---|---|
| `mrx_alt_ded_tier_cstshr_yn` "2" (cost sharing before the deductible differs from initial coverage) | H4045-001-000 (struct "1", coins "0", copay "") |
| `mrx_alt_gen_cstshr_struct` filled | H4045-001-000 (struct "1", coins "0", copay "") |
| `mrx_alt_pre_icl_cost_share` "2" (Medicare-defined Part D coinsurance in initial coverage) | H0777-001-000, H1587-001-000, H3810-023-000, H5587-002-000 |
| `mrx_ae_cstshr_apply` "1" (Medicare-defined Part D coinsurance in initial coverage) | H2417-001-000, H2419-001-000, H5703-001-000, H9623-001-000 |

## P14. Other column groups

| Group | Columns | Filled |
|---|---|---|
| Insulin (IRA) cost sharing per tier | `mrx_tier_ira_*` | 19,733 rows (28 columns) |
| Insulin (IRA) cost sharing, plan level | `mrx_gen_ira_*` | 207 rows (18 columns) |
| Daily copays | `mrx_tier_*_copay_daily` | 11,733 rows (7 columns) |
| Average expected coinsurance dollars | `mrx_tier_*_coins_avg_1m` | 13,710 rows (3 columns) |
| BALANCE model, tier | `mrx_tier_bal_*` | 0 rows (0 columns) |
| BALANCE model, plan | `mrx_bal*`, `mrx_balance_*` | 0 rows (0 columns) |
| Generic and Defined Standard locations and days | `mrx_gen_loc_*`, `mrx_gen_*_1m` and the like | 207 rows (13 columns) |

Tier rows with at least 1 insulin cell that differs from the tier's own cell for the same location, supply and kind: 19,733.

`mrx_alt_ira_covg_tier` ("Tiers have insulin drugs", position string, Tier 7 first):

| Population | Value | Plans |
|---|---|---|
| MA-PD (01, 02, 04, 31) | 0111110 | 1,893 |
| MA-PD (01, 02, 04, 31) | 0001110 | 1,653 |
| MA-PD (01, 02, 04, 31) | (blank) | 1,040 |
| MA-PD (01, 02, 04, 31) | 0001100 | 609 |
| PDP (29) | (blank) | 288 |
| MA-PD (01, 02, 04, 31) | 0011000 | 197 |
| MA-PD (01, 02, 04, 31) | 0111111 | 161 |
| PDP (29) | 0111110 | 152 |
| MA-PD (01, 02, 04, 31) | 0111100 | 147 |
| PDP (29) | 0001110 | 94 |
| PDP (29) | 0011000 | 68 |
| MA-PD (01, 02, 04, 31) | 0011100 | 48 |
| MA-PD (01, 02, 04, 31) | 0011110 | 36 |
| MA-PD (01, 02, 04, 31) | 0001101 | 35 |
| MA-PD (01, 02, 04, 31) | 0111000 | 35 |

15 further patterns.

Demonstration flags:

| Population | Flags | Plans |
|---|---|---|
| MA-PD (01, 02, 04, 31) | part_d_model_demo "", part_d_enhncd_cvrg_demo "" | 4,944 |
| MA-PD (01, 02, 04, 31) | part_d_model_demo "", part_d_enhncd_cvrg_demo "N" | 1,052 |
| PDP (29) | part_d_model_demo "", part_d_enhncd_cvrg_demo "" | 606 |

## P15. Columns that could hold the out-of-pocket threshold

Every numeric column of the 3 files (all rows) whose largest value is 1,000 or more:

| File | Column | Numeric cells | Largest | Cells of 1,000 or more |
|---|---|---|---|---|
| pbp_mrx.txt | `mrx_partd_network_loc` | 5,495 | 110110 | 5,495 |
| pbp_mrx.txt | `mrx_alt_no_ded_tier` | 4,622 | 111101 | 4,599 |
| pbp_mrx.txt | `mrx_alt_ira_covg_tier` | 5,288 | 111111 | 5,253 |
| pbp_mrx_tier.txt | `mrx_tier_rstd_coins_avg_1m` | 8,842 | 1693.35 | 138 |
| pbp_mrx_tier.txt | `mrx_tier_rsstd_coins_avg_1m` | 4,898 | 3206.93 | 31 |
| pbp_mrx_tier.txt | `mrx_tier_rspfd_coins_avg_1m` | 4,895 | 3206.93 | 93 |

Column names containing "oop", "threshold", "catast", "tdc" or "troop": `mrx_ae_ooptcs_apply`, `mrx_alt_cstshr_post_oopt`.

## P16. PDP service areas, type 30, and the Section A Part D flag

PDPs (type 29): 606; with `PlanRegionArea.txt` rows: 606; with `PlanArea.txt` rows: 0.

Regions per PDP: 1 region: 326; 5 regions: 1; 33 regions: 1; 34 regions: 33; 35 regions: 16; 37 regions: 8; 39 regions: 221. Region types on PDP rows: region_type "PD" 10,961. `contract_year` on PDP rows: "2027" 10,961.

Type 30 plans:

| Plan | pbp_a_plan_name | pbp_a_org_marketing_name | pbp_mrx row | PlanRegionArea rows | PlanArea rows |
|---|---|---|---|---|---|
| E3014-801-000 | PSERS Health Options Program Plus (Employer PDP) | Pennsylvania Public School Employees Retirement Sy | no | 0 | 3246 |
| E3014-802-000 | PSERS Health Options Program Standard (Employer PDP) | Pennsylvania Public School Employees Retirement Sy | no | 0 | 3246 |

MA plan types 01, 02, 04, 31: `pbp_a_contract_partd_flag` against `mrx_drug_ben_yn`:

| pbp_a_contract_partd_flag | mrx_drug_ben_yn | Plans |
|---|---|---|
| 1 | 1 | 5,996 |
| 1 | 2 | 874 |
| 2 | 2 | 2 |

Section A contact and web columns of the PDPs, by `pbp_a_eghp_yn` (1 employer group plan, 2 individual):

| pbp_a_eghp_yn | Column | Filled or blank | PDPs |
|---|---|---|---|
| 1 | `pbp_a_curmbr_phone` | blank | 283 |
| 1 | `pbp_a_formulary_web_addr` | filled | 283 |
| 1 | `pbp_a_org_website` | filled | 283 |
| 1 | `pbp_a_pharmacy_website` | filled | 283 |
| 1 | `pbp_a_phys_web_addr` | blank | 283 |
| 2 | `pbp_a_curmbr_phone` | blank | 323 |
| 2 | `pbp_a_formulary_web_addr` | filled | 323 |
| 2 | `pbp_a_org_website` | filled | 323 |
| 2 | `pbp_a_pharmacy_website` | filled | 323 |
| 2 | `pbp_a_phys_web_addr` | blank | 323 |

## P17. Plans for the fixtures

| Population | Retail | Deductible | Plans |
|---|---|---|---|
| MA-PD (01, 02, 04, 31) | retail not split | deductible skips tiers | 2,986 |
| MA-PD (01, 02, 04, 31) | retail not split | no deductible or all tiers | 1,352 |
| MA-PD (01, 02, 04, 31) | split retail | deductible skips tiers | 1,473 |
| MA-PD (01, 02, 04, 31) | split retail | no deductible or all tiers | 185 |
| PDP (29) | retail not split | deductible skips tiers | 4 |
| PDP (29) | retail not split | no deductible or all tiers | 346 |
| PDP (29) | split retail | deductible skips tiers | 147 |
| PDP (29) | split retail | no deductible or all tiers | 109 |

The 5 golden plans of the medical importer:

| Plan | mrx_drug_ben_yn | mrx_benefit_type | mrx_alt_ded_charge | mrx_alt_ded_amount | mrx_alt_ded_type_yn | Tier rows | Split retail | mrx_partd_network_loc |
|---|---|---|---|---|---|---|---|---|
| H2406-013-000 | 1 | 4 | 2 | 685.00 | 2 | 5 | no | 110101 |
| H1036-068-000 | 1 | 4 | 1 | 700.00 | 2 | 5 | no | 110101 |
| H1609-028-000 | 1 | 4 | 1 | 700.00 | 2 | 5 | yes | 101101 |
| H5533-019-000 | 1 | 4 | 1 | 700.00 | 2 | 5 | yes | 101101 |
| H5425-140-000 | 1 | 4 | 2 | 450.00 | 2 | 5 | yes | 101101 |

## P18. Benefits per plan

MA-PD and PDP plans with tier rows. "Every supply": 1 initial coverage benefit per tier row, location part (`rstd`, `rsstd`, `rspfd`, `mostd`, `mosstd`, `mospfd`, `oonp`, `ltcp`) and chosen supply. "Same cost share merged": the supplies of 1 tier row and location part whose copay and coinsurance cells are equal give 1 benefit. Both add 1 catastrophic-stage benefit per `pbp_mrx_p.txt` row.

| Population | Plans | Every supply: benefits | median | largest | Same cost share merged: benefits | median | largest |
|---|---|---|---|---|---|---|---|
| MA-PD (01, 02, 04, 31) | 4,956 | 235,324 | 42 | 82 | 169,171 | 32 | 62 |
| PDP (29) | 318 | 16,304 | 47 | 82 | 12,490 | 39 | 74 |

Chosen supplies whose copay and coinsurance cells are both blank: 0.

The fixture plans:

| Plan | Initial coverage, every supply | Initial coverage, merged | Catastrophic | Every supply: total | Merged: total |
|---|---|---|---|---|---|
| H1036-068-000 | 37 | 28 | 5 | 42 | 33 |
| H2406-013-000 | 28 | 26 | 5 | 33 | 31 |
| H1609-028-000 | 62 | 40 | 5 | 67 | 45 |
| S5921-383-000 | 36 | 33 | 5 | 41 | 38 |
| S4802-146-000 | 64 | 43 | 6 | 70 | 49 |

## P19. The error conditions, counted

MA-PD and PDP plans unless the row says otherwise.

| Condition | Count | Detail |
|---|---|---|
| No `pbp_mrx.txt` row for a plan of type 01, 02, 04, 31 or 29 | 0 |  |
| `mrx_drug_ben_yn` not "1" or "2" | 0 |  |
| A PDP with a `pbp_Section_D.txt`, `pbp_Section_C.txt` or `pbp_b1a_inpat_hosp.txt` row | 0 | Section D 0, Section C 0, pbp_b1a 0 |
| A PDP with `PlanArea.txt` rows | 0 |  |
| `mrx_benefit_type` 2, 3 or 4 with no tier rows, or 1 or blank with tier rows | 0 |  |
| A location flag, `mrx_partd_network_loc`, `mrx_alt_no_ded_tier` or `mrx_alt_ira_covg_tier` that is not a string of 0 and 1 of the dictionary length | 0 |  |
| `mrx_alt_no_ded_tier` names a tier the plan does not have (Tier 7, or a tier above `mrx_formulary_tiers_num`) | 0 |  |
| `mrx_alt_ded_type_yn` "2" with a blank `mrx_alt_no_ded_tier` | 0 |  |
| An unreadable amount, percent or day count in the columns the mapping reads | 0 | amounts 0, percents 0, days 0 |
| A code outside the dictionary in a single-code column of the 3 files | 11,186 | pbp_mrx.txt `part_d_enhncd_cvrg_demo` "N" on 1,052 rows (dictionary: 1, 0); pbp_mrx_tier.txt `part_d_enhncd_cvrg_demo` "N" on 5,067 rows (dictionary: 1, 0); pbp_mrx_p.txt `part_d_enhncd_cvrg_demo` "N" on 5,067 rows (dictionary: 1, 0) |
