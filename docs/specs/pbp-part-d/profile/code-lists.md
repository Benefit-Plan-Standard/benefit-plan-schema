# Code lists: pbp_mrx, pbp_mrx_tier, pbp_mrx_p, contract year 2027

Written by `node docs/specs/pbp-part-d/profile/profile-mrx.js` from `data/pbp/2027/PBP_Benefits_2027_dictionary.xlsx` (sheet `PBP_Benefits_2027_dictionary`; a column with a code list takes 1 dictionary row per code). Position-string codes are written as the dictionary writes them, `1 in N`.

## pbp_mrx.txt

90 names in the dictionary, 90 columns in the file; in the file and not the dictionary: none; in the dictionary and not the file: none. The key columns and the Section A columns every file repeats are left out.

| Column | Type | Field title | Codes (CODES = CODE_VALUES; long values cut at 87 characters) |
|---|---|---|---|
| `part_d_model_demo` | CHAR 1 | Part D Model Demo | 1 = Yes; 0 = No |
| `part_d_enhncd_cvrg_demo` | CHAR 1 | Part D Senior Savings Model | 1 = Yes; 0 = No |
| `mrx_form_model_type` | CHAR 5 | Formulary Tier Label Model |  |
| `mrx_drug_ben_yn` | CHAR 1 | Does your plan offer a Medicare Prescription drug (Part D) benefit? | 1 = Yes; 2 = No |
| `mrx_benefit_type` | CHAR 1 | Type of drug benefit | 1 = Defined Standard; 2 = Actuarially Equivalent Standard; 3 = Basic Alternative; 4 = Enhanced Alternative |
| `mrx_partd_network_loc` | CHAR 6 | Describe the components of your pharmacy network | 1 in 1 = Long-Term Care; 1 in 2 = Standard Retail; 1 in 3 = Standard/Preferred Retail; 1 in 4 = Out-of-Network; 1 in 5 = Standard Mail-Order; 1 in 6 = Standard/Preferred Mail-Order |
| `mrx_ltc_attest_flag` | CHAR 1 | Attestation | 1 in 1 = Sponsor attests that it will comply with 42 CFR 423.154. |
| `mrx_first_fill` | CHAR 1 | Does this plan offer a free first fill (i.e. $0 copayment) for any drugs? | 1 = Yes; 2 = No |
| `mrx_otc_meds_pay_ump_yn` | CHAR 1 | Does this plan pay for over-the-counter medications (OTCs) under the utilization management program? | 1 = Yes; 2 = No |
| `mrx_otc_step_therapy_yn` | CHAR 1 | Are any of the RxCUIs contained on the OTC file part of a formal Step Therapy protocol? | 1 = Yes; 2 = No |
| `mrx_otc_meds_attest_flag` | CHAR 1 | Per Chapter 4 of the Medicare Managed Care Manual, an MAO cannot offer the same OTC drug under both its Part C supplemental benefit and its Part D benefit. I attest any OTC drugs that are covered under Part C are separate and distinct from OTC drugs cover | 1 in 1 = Per Chapter 4 of the Medicare Managed Care Manual, an MAO cannot offer the same OTC dru... |
| `mrx_formulary_tiers_num` | NUM 1 | Number of tiers in the Part D benefit |  |
| `mrx_tier_form_ex` | CHAR 1 | What is your Formulary Exceptions Tier? |  |
| `mrx_tier_form_ex_2_yn` | CHAR 1 | Does this plan apply a second less expensive cost-sharing level for all generic drugs approved for formulary exceptions? | 1 = Yes; 2 = No |
| `mrx_tier_form_ex_2` | NUM 1 | Identify the lower level cost sharing Formulary Exceptions Tier |  |
| `mrx_ae_oon_cstshr_struct` | CHAR 1 | Out-of-Network (OON) cost-sharing structure for this plan (note: must comply with statutory requirements for covered insulins, ACIP-recommended adult vaccines, catastrophic claims, and selected drugs) | 1 = Standard Retail Copay/Coinsurance (No Differential)*; 2 = Standard Retail Copay/Coinsurance plus a differential between the OON billed charge and...; 3 = Standard Retail Copay/Coinsurance with Limited Day supply; 4 = The plan's network cost-sharing plus the differential between the OON billed charge and... |
| `mrx_ae_cstshr_apply` | CHAR 1 | How does this plan apply cost sharing in the Initial Coverage Phase? | 1 = Medicare-defined Part D Coinsurance amount; 2 = Cost-Share Tiers |
| `mrx_form_model_desc` | CHAR 4000 | Tier Label Description(s) |  |
| `mrx_ae_ooptcs_apply` | CHAR 1 | How does this plan apply cost sharing beyond the Medicare Part D Annual Out-of-Pocket cost threshold? | 1 = No cost sharing; 2 = Cost Share Tiers |
| `mrx_alt_ded_charge` | CHAR 1 | Does this plan charge the Medicare-defined Part D deductible amount? | 1 = Yes; 2 = No, enter amount; 3 = No Deductible |
| `mrx_alt_ded_amount` | NUM 8 | Enter Deductible Amount |  |
| `mrx_alt_ded_type_yn` | CHAR 1 | Does the Deductible apply to all tiers? | 1 = Yes; 2 = No |
| `mrx_alt_no_ded_tier` | CHAR 7 | Each tier for which the deductible will NOT apply (please note that the deductible will not apply to any of the drugs on each tier selected) | 1 in 1 = Tier 7; 1 in 2 = Tier 1; 1 in 3 = Tier 2; 1 in 4 = Tier 3; 1 in 5 = Tier 4; 1 in 6 = Tier 5; 1 in 7 = Tier 6 |
| `mrx_alt_ded_tier_cstshr_yn` | CHAR 1 | Is the cost-sharing for drugs to which the deductible does not apply the same as the Initial Coverage Phase cost-sharing? | 1 = Yes; 2 = No |
| `mrx_alt_gen_cstshr_struct` | CHAR 1 | Type of cost-sharing structure for these drugs until the deductible is met | 1 = Coinsurance; 2 = Copayment; 3 = Greater of Coinsurance and Copayment; 4 = Lesser of Coinsurance and Copayment |
| `mrx_alt_gen_coins_pct` | NUM 3 | Coinsurance |  |
| `mrx_alt_gen_copay_amt` | NUM 8 | Copayment |  |
| `mrx_alt_oon_cstshr_struct` | CHAR 1 | Out-of-Network (OON) cost-sharing structure for this plan (note: must comply with statutory requirements for covered insulins, ACIP-recommended adult vaccines, catastrophic claims, and selected drugs) | 1 = Standard Retail Copay/Coinsurance (no differential)*; 2 = Standard Retail Copay/Coinsurance plus a differential between the OON billed charge and...; 3 = Standard Retail Copay/Coinsurance with Limited Day Supply; 4 = The plan's network cost-sharing plus the differential between the OON billed charge and... |
| `mrx_alt_red_cost_sharing` | CHAR 1 | Does this plan offer reduced Part D cost sharing as part of your supplemental Part D benefit? | 1 = Yes; 2 = No |
| `mrx_alt_red_cost_sharing_items` | CHAR 3 | Area(s) throughout the Part D benefit where the increase in actuarial value of benefits is reflected | 1 in 1 = Reduced Initial Coverage Phase cost shares; 1 in 2 = Reduced deductible; 1 in 3 = Deductible waived for at least one tier |
| `mrx_alt_excl_drugs_yn` | CHAR 1 | Does this plan cover excluded drugs as part of supplemental coverage (e.g., drugs used to treat erectile dysfunction)? | 1 = Yes; 2 = No |
| `mrx_alt_pre_icl_cost_share` | CHAR 1 | How does this plan apply cost sharing in the Initial Coverage Phase? | 1 = No cost sharing; 2 = Medicare-defined Part D Coinsurance Amount; 3 = Cost Share Tiers |
| `mrx_alt_pre_icl_exclud_only_yn` | CHAR 1 | Does this apply to the excluded drug-only tier? | 1 = Yes; 2 = No |
| `mrx_alt_ira_covg_tier` | CHAR 7 | Tiers have insulin drugs | 1 in 1 = Tier 7; 1 in 2 = Tier 1; 1 in 3 = Tier 2; 1 in 4 = Tier 3; 1 in 5 = Tier 4; 1 in 6 = Tier 5; 1 in 7 = Tier 6 |
| `mrx_alt_cstshr_post_oopt` | CHAR 1 | How does this plan apply cost sharing for excluded drugs beyond the Medicare Part D Annual Out-of-Pocket cost threshold? | 1 = No cost sharing; 2 = Cost-Share Tiers (Different cost sharing than the ICP); 3 = Cost-Share Tiers (Same cost sharing as the ICP) |
| `mrx_gen_loc_rstd` | CHAR 3 | All Standard Retail Cost sharing Location/supply amount(s) that apply | 1 in 1 = In-Network Retail Pharmacy - 3-month supply; 1 in 2 = In-Network Retail Pharmacy - 1-month supply; 1 in 3 = In-Network Retail Pharmacy - 2-month supply |
| `mrx_gen_rstd_1m` | NUM 2 | Number of days for Standard Retail Cost Sharing 1-month supply |  |
| `mrx_gen_rstd_2m` | NUM 3 | Number of days for Standard Retail Cost Sharing 2-month supply |  |
| `mrx_gen_rstd_3m` | NUM 3 | Number of days for Standard Retail Cost Sharing 3-month supply |  |
| `mrx_gen_loc_oon` | CHAR 2 | All Out-of-Network Pharmacy Location/supply amount(s) that apply | 1 in 1 = Out-of-Network Pharmacy - other day supply; 1 in 2 = Out-of-Network Pharmacy - one month supply |
| `mrx_gen_oon_1m` | NUM 2 | Number of days for Out-of-Network Pharmacy 1-month supply |  |
| `mrx_gen_oon_os` | NUM 3 | Number of days for Out-of-Network Pharmacy other day supply |  |
| `mrx_gen_loc_mostd` | CHAR 3 | All Standard Mail-Order Cost Sharing Location/supply amount(s) that apply | 1 in 1 = Standard Mail-Order - 3-month supply; 1 in 2 = Standard Mail-Order - 1-month supply; 1 in 3 = Standard Mail-Order - 2-month supply |
| `mrx_gen_mostd_1m` | NUM 2 | Number of days for Standard Mail-Order Cost Sharing 1-month supply |  |
| `mrx_gen_mostd_2m` | NUM 3 | Number of days for Standard Mail-Order Cost Sharing 2-month supply |  |
| `mrx_gen_mostd_3m` | NUM 3 | Number of days for Standard Mail-Order Cost Sharing 3-month supply |  |
| `mrx_gen_loc_ltc` | CHAR 1 | The Long-Term Care Pharmacy 1-month Location/supply amount(s) that apply | 1 in 1 = Long Term Care Pharmacy - 1-month supply |
| `mrx_gen_ltc_1m` | NUM 2 | Number of days for Long-Term Care Pharmacy 1-month supply |  |
| `mrx_tier_extd_days_gen_yn` | CHAR 1 | Are all of the drugs on your formulary available with an extended day supply? | 1 = Yes; 2 = No |
| `mrx_gen_extd_first_fill` | CHAR 1 | Are any of the drugs available with an extended day supply limited to a 1-month supply for the first fill? | 1 = Yes; 2 = No |
| `mrx_gen_ira_rstd_copay_1m` | NUM 8 | Insulin Copayment amount for Standard Retail Cost-Sharing one month supply |  |
| `mrx_gen_ira_rstd_copay_2m` | NUM 8 | Insulin Copayment amount for Standard Retail Cost-Sharing two month supply |  |
| `mrx_gen_ira_rstd_copay_3m` | NUM 8 | Insulin Copayment amount for Standard Retail Cost-Sharing three month supply |  |
| `mrx_gen_ira_mostd_copay_1m` | NUM 8 | Insulin Copayment amount for Standard Mail Order Cost-Sharing one month supply |  |
| `mrx_gen_ira_mostd_copay_2m` | NUM 8 | Insulin Copayment amount for Standard Mail Order Cost-Sharing two month supply |  |
| `mrx_gen_ira_mostd_copay_3m` | NUM 8 | Insulin Copayment amount for Standard Mail Order Cost-Sharing three month supply |  |
| `mrx_gen_ira_oonp_copay_1m` | NUM 8 | Insulin Copayment amount for Out-of-Network Pharmacy one month supply |  |
| `mrx_gen_ira_oonp_copay_othnum` | NUM 8 | Insulin Copayment amount for Out-of-Network Pharmacy other day supply |  |
| `mrx_gen_ira_ltcp_copay_1m` | NUM 8 | Insulin Copayment amount for Long Term Care Pharmacy one month supply |  |
| `mrx_gen_ira_rstd_coins_1m` | NUM 3 | Insulin Coinsurance percent for Standard Retail Cost-Sharing one month supply |  |
| `mrx_gen_ira_rstd_coins_2m` | NUM 3 | Insulin Coinsurance percent for Standard Retail Cost-Sharing two month supply |  |
| `mrx_gen_ira_rstd_coins_3m` | NUM 3 | Insulin Coinsurance percent for Standard Retail Cost-Sharing three month supply |  |
| `mrx_gen_ira_mostd_coins_1m` | NUM 3 | Insulin Coinsurance percent for Standard Mail Order Cost-Sharing one month supply |  |
| `mrx_gen_ira_mostd_coins_2m` | NUM 3 | Insulin Coinsurance percent for Standard Mail Order Cost-Sharing two month supply |  |
| `mrx_gen_ira_mostd_coins_3m` | NUM 3 | Insulin Coinsurance percent for Standard Mail Order Cost-Sharing three month supply |  |
| `mrx_gen_ira_oonp_coins_1m` | NUM 3 | Insulin Coinsurance percent for Out-of-Network Pharmacy one month supply |  |
| `mrx_gen_ira_oonp_coins_othnum` | NUM 3 | Insulin Coinsurance percent for Out-of-Network Pharmacy other day supply |  |
| `mrx_gen_ira_ltcp_coins_1m` | NUM 3 | Insulin Coinsurance percent for Long Term Care Pharmacy one month supply |  |
| `mrx_avg_exp_cost_share_attest` | CHAR 1 | Attestation | 1 in 1 = I attest that the value(s) entered have been reviewed by the plan's certifying actuary ... |
| `mrx_snp_zerocost_attest` | CHAR 1 | Attestation | 1 in 1 = I attest it is the plan sponsor's intention to buy down the entire cost sharing amount ... |
| `mrx_dsnp_buydown_attest` | CHAR 1 | Attestation | 1 in 1 = I attest it is the plan sponsor's intention to buy down the entire cost sharing amount ... |
| `mrx_vaccine_attest` | CHAR 1 | Attestation | 1 in 1 = I attest that there is no deductible and no cost sharing for an adult vaccine recommend... |
| `mrx_insulin_attest` | CHAR 1 | Attestation | 1 in 1 = I attest that the enrollee cost sharing for each prescription fill up to a one-month su... |
| `mrx_bal_opt_flex` | CHAR 2 | BALANCE model opt-in to specific flexibilities: | 1 in 1 = Are you planning to opt-in to the narrowed risk corridors for Model drugs?; 1 in 2 = Other |
| `mrx_bal_opt_flex_other_desc` | CHAR 4000 | Other BALANCE opt-in description |  |
| `mrx_bal_model_attest` | CHAR 1 | Attestation | 1 in 1 = I attest that all eligible Part D plans including EGWPs will comply with the cost shari... |
| `mrx_balance_covg_tier` | CHAR 7 | Indicate which tiers have BALANCE Model drugs | 1 in 1 = Tier 7; 1 in 2 = Tier 1; 1 in 3 = Tier 2; 1 in 4 = Tier 3; 1 in 5 = Tier 4; 1 in 6 = Tier 5; 1 in 7 = Tier 6 |
| `mrx_balance_cstshr_struc_type` | CHAR 1 | Select the cost share structure for the BALANCE Model drugs: | 2 = Copayment |
| `mrx_balance_mo_tier` | CHAR 7 | Exclude mail order supply? | 1 in 1 = Tier 7; 1 in 2 = Tier 1; 1 in 3 = Tier 2; 1 in 4 = Tier 3; 1 in 5 = Tier 4; 1 in 6 = Tier 5; 1 in 7 = Tier 6 |
| `mrx_balance_extended_tier` | CHAR 7 | Exclude extended day supply? | 1 in 1 = Tier 7; 1 in 2 = Tier 1; 1 in 3 = Tier 2; 1 in 4 = Tier 3; 1 in 5 = Tier 4; 1 in 6 = Tier 5; 1 in 7 = Tier 6 |
| `mrx_balance_deductible_opt` | CHAR 1 | Is there a deductible? | 1 = No deductible; 2 = Same deductible as listed in the regular Medicare Rx benefit; 3 = BALANCE Specific deductible |
| `mrx_balance_deductible_amt` | NUM 9 | BALANCE deductible amount |  |

## pbp_mrx_tier.txt

140 names in the dictionary, 140 columns in the file; in the file and not the dictionary: none; in the dictionary and not the file: none. The key columns and the Section A columns every file repeats are left out.

| Column | Type | Field title | Codes (CODES = CODE_VALUES; long values cut at 87 characters) |
|---|---|---|---|
| `part_d_model_demo` | CHAR 1 | Part D Model Demo | 1 = Yes; 0 = No |
| `part_d_enhncd_cvrg_demo` | CHAR 1 | Part D Senior Savings Model | 1 = Yes; 0 = No |
| `mrx_tier_label_list` | CHAR 250 | Tier Label Description |  |
| `mrx_tier_benefit_type` | CHAR 1 | Type of drug benefit | 1 = Defined Standard; 2 = Actuarially Equivalent Standard; 3 = Basic Alternative; 4 = Enhanced Alternative |
| `mrx_tier_drug_type` | CHAR 2 | Tier Drug type(s) | 1 in 1 = Brand; 1 in 2 = Generic |
| `mrx_tier_includes` | CHAR 1 | Tier Includes | 1 = Part D Drugs Only; 2 = Excluded Drugs Only (e.g., erectile dysfunction drugs); 3 = Both Part D and Excluded Drugs |
| `mrx_tier_cstshr_struct_type` | CHAR 1 | Cost-Share Structure | 1 = Coinsurance; 2 = Copayment; 3 = Greater of Coinsurance and Copayment; 4 = Lesser of Coinsurance and Copayment |
| `mrx_tier_id` | CHAR 1 | Tier ID |  |
| `mrx_tier_type_id` | CHAR 1 | Tier Type ID | 1 = ICP |
| `mrx_tier_locat_rstd` | CHAR 3 | All Standard Retail Cost-Sharing Location/supply amount(s) that apply for this Tier | 1 in 1 = Standard Retail Cost-Sharing - three month supply; 1 in 2 = Standard Retail Cost-Sharing - one month supply; 1 in 3 = Standard Retail Cost-Sharing - two month supply |
| `mrx_tier_locat_rsplt` | CHAR 3 | All Standard Retail/Preferred Retail Cost-Sharing Pharmacy Location/supply amount(s) that apply for this Tier | 1 in 1 = Standard Retail/Preferred Retail Cost-Sharing - three month supply; 1 in 2 = Standard Retail/Preferred Retail Cost-Sharing - one month supply; 1 in 3 = Standard Retail/Preferred Retail Cost-Sharing - two month supply |
| `mrx_tier_locat_oon` | CHAR 2 | All Out-of-Network Pharmacy Location/supply amount(s) that apply for this Tier | 1 in 1 = Out-of-Network Pharmacy - other day supply; 1 in 2 = Out-of-Network Pharmacy - one month supply |
| `mrx_tier_locat_mostd` | CHAR 3 | All Standard Mail-Order Cost-Sharing Location/supply amount(s) that apply for this Tier (Optional) | 1 in 1 = Standard Mail Order Cost-Sharing - three month supply; 1 in 2 = Standard Mail Order Cost-Sharing - one month supply; 1 in 3 = Standard Mail Order Cost-Sharing - two month supply |
| `mrx_tier_locat_mosplt` | CHAR 3 | All Mail-Order Standard/Preferred Location/supply amount(s) that apply for this Tier (Optional) | 1 in 1 = Standard/Preferred Mail Order Cost-Sharing - three month supply; 1 in 2 = Standard/Preferred Mail Order Cost-Sharing - one month supply; 1 in 3 = Standard/Preferred Mail Order Cost-Sharing - two month supply |
| `mrx_tier_locat_ltc` | CHAR 1 | All Long-Term Care Pharmacy Location/supply amount(s) that apply for this Tier | 1 in 1 = Long Term Care Pharmacy - one month supply |
| `mrx_tier_rstd_1m_num` | NUM 2 | Number of days for Standard Retail Cost-Sharing in your 1-month supply |  |
| `mrx_tier_rstd_2m_num` | NUM 3 | Number of days for Standard Retail Cost-Sharing in your 2-month supply |  |
| `mrx_tier_rstd_3m_num` | NUM 3 | Number of days for Standard Retail Cost-Sharing in your 3-month supply |  |
| `mrx_tier_rsplt_1m_num` | NUM 2 | Number of days for Standard Retail/Preferred Retail Cost-Sharing in your 1-month supply |  |
| `mrx_tier_rsplt_2m_num` | NUM 3 | Number of days for Standard Retail/Preferred Retail Cost-Sharing in your 2-month supply |  |
| `mrx_tier_rsplt_3m_num` | NUM 3 | Number of days for Standard Retail/Preferred Retail Cost-Sharing in your 3-month supply |  |
| `mrx_tier_extd_days_yn` | CHAR 1 | Are all drugs on the plan formulary available at an extended day supply? | 1 = Yes; 2 = No |
| `mrx_tier_extd_first_fill` | CHAR 1 | Are any of the drugs available at an extended day supply limited to a 1-month supply for the first fill? | 1 = Yes; 2 = No |
| `mrx_tier_mostd_1m_num` | NUM 2 | Number of days for Standard Mail-Order Cost-Sharing in your 1-month supply |  |
| `mrx_tier_mostd_2m_num` | NUM 3 | Number of days for Standard Mail-Order Cost-Sharing in your 2-month supply |  |
| `mrx_tier_mostd_3m_num` | NUM 3 | Number of days for Standard Mail-Order Cost-Sharing in your 3-month supply |  |
| `mrx_tier_mosplt_1m_num` | NUM 2 | Number of days for Standard/Preferred Mail-Order Cost-Sharing in your 1-month supply |  |
| `mrx_tier_mosplt_2m_num` | NUM 3 | Number of days for Standard/Preferred Mail-Order Cost-Sharing in your 2-month supply |  |
| `mrx_tier_mosplt_3m_num` | NUM 3 | Number of days for Standard/Preferred Mail-Order Cost-Sharing in your 3-month supply |  |
| `mrx_tier_oonp_1m_num` | NUM 2 | Number of days for Out-of-Network Pharmacy in your 1-month supply |  |
| `mrx_tier_oonp_othnumn` | NUM 3 | Number of days for Out-of-Network Pharmacy in your other day supply |  |
| `mrx_tier_ltcp_1m` | NUM 2 | Number of days for Long-Term Care Pharmacy 1-month supply |  |
| `mrx_tier_rstd_copay_1m` | NUM 8 | Copayment amount for Standard Retail Cost-Sharing 1-month supply |  |
| `mrx_tier_rstd_copay_2m` | NUM 8 | Copayment amount for Standard Retail Cost-Sharing 2-month supply |  |
| `mrx_tier_rstd_copay_3m` | NUM 8 | Copayment amount for Standard Retail Cost-Sharing 3-month supply |  |
| `mrx_tier_rstd_coins_avg_1m` | NUM 8 | Avg Expected Coins Dollar Amt Standard Retail Cost-Sharing (1-month supply) ($) |  |
| `mrx_tier_rstd_coins_1m` | NUM 3 | Coinsurance percentage for Standard Retail Cost-Sharing 1-month supply |  |
| `mrx_tier_rstd_coins_2m` | NUM 3 | Coinsurance percentage for Standard Retail Cost-Sharing 2-month supply |  |
| `mrx_tier_rstd_coins_3m` | NUM 3 | Coinsurance percentage for Standard Retail Cost-Sharing 3-month supply |  |
| `mrx_tier_rsstd_copay_1m` | NUM 8 | Copayment amount for Standard Retail Cost-Sharing 1-month supply |  |
| `mrx_tier_rsstd_copay_2m` | NUM 8 | Copayment amount for Standard Retail Cost-Sharing 2-month supply |  |
| `mrx_tier_rsstd_copay_3m` | NUM 8 | Copayment amount for Standard Retail Cost-Sharing 3-month supply |  |
| `mrx_tier_rsstd_coins_avg_1m` | NUM 8 | Avg Expected Coins Dollar Amt Standard Retail Cost-Sharing (1-month supply) ($) |  |
| `mrx_tier_rsstd_coins_1m` | NUM 3 | Coinsurance percentage for Standard Retail Cost-Sharing 1-month supply |  |
| `mrx_tier_rsstd_coins_2m` | NUM 3 | Coinsurance percentage for Standard Retail Cost-Sharing 2-month supply |  |
| `mrx_tier_rsstd_coins_3m` | NUM 3 | Coinsurance percentage for Standard Retail Cost-Sharing 3-month supply |  |
| `mrx_tier_rspfd_copay_1m` | NUM 8 | Copayment amount for Preferred Retail Cost-Sharing 1-month supply |  |
| `mrx_tier_rspfd_copay_2m` | NUM 8 | Copayment amount for Preferred Retail Cost-Sharing 2-month supply |  |
| `mrx_tier_rspfd_copay_3m` | NUM 8 | Copayment amount for Preferred Retail Cost-Sharing 3-month supply |  |
| `mrx_tier_rspfd_coins_avg_1m` | NUM 8 | Avg Expected Coins Dollar Amt Preferred Retail Cost-Sharing (1-month supply) ($) |  |
| `mrx_tier_rspfd_coins_1m` | NUM 3 | Coinsurance percentage for Preferred Retail Cost-Sharing 1-month supply |  |
| `mrx_tier_rspfd_coins_2m` | NUM 3 | Coinsurance percentage for Preferred Retail Cost-Sharing 2-month supply |  |
| `mrx_tier_rspfd_coins_3m` | NUM 3 | Coinsurance percentage for Preferred Retail Cost-Sharing 3-month supply |  |
| `mrx_tier_mostd_copay_1m` | NUM 8 | Copayment amount for Standard Mail-Order Cost-Sharing 1-month supply |  |
| `mrx_tier_mostd_copay_2m` | NUM 8 | Copayment amount for Standard Mail-Order Cost-Sharing 2-month supply |  |
| `mrx_tier_mostd_copay_3m` | NUM 8 | Copayment amount for Standard Mail-Order Cost-Sharing 3-month supply |  |
| `mrx_tier_mostd_coins_1m` | NUM 3 | Coinsurance percentage for Standard Mail-Order Cost-Sharing 1-month supply |  |
| `mrx_tier_mostd_coins_2m` | NUM 3 | Coinsurance percentage for Standard Mail-Order Cost-Sharing 2-month supply |  |
| `mrx_tier_mostd_coins_3m` | NUM 3 | Coinsurance percentage for Standard Mail-Order Cost-Sharing 3-month supply |  |
| `mrx_tier_mosstd_copay_1m` | NUM 8 | Copayment amount for Standard Mail-Order 1-month supply |  |
| `mrx_tier_mosstd_copay_2m` | NUM 8 | Copayment amount for Standard Mail-Order 2-month supply |  |
| `mrx_tier_mosstd_copay_3m` | NUM 8 | Copayment amount for Standard Mail-Order 3-month supply |  |
| `mrx_tier_mosstd_coins_1m` | NUM 3 | Coinsurance percentage for Standard Mail-Order 1-month supply |  |
| `mrx_tier_mosstd_coins_2m` | NUM 3 | Coinsurance percentage for Standard Mail-Order 2-month supply |  |
| `mrx_tier_mosstd_coins_3m` | NUM 3 | Coinsurance percentage for Standard Mail-Order 3-month supply |  |
| `mrx_tier_mospfd_copay_1m` | NUM 8 | Copayment amount for Preferred Mail-Order 1-month supply |  |
| `mrx_tier_mospfd_copay_2m` | NUM 8 | Copayment amount for Preferred Mail-Order 2-month supply |  |
| `mrx_tier_mospfd_copay_3m` | NUM 8 | Copayment amount for Preferred Mail-Order 3-month supply |  |
| `mrx_tier_mospfd_coins_1m` | NUM 3 | Coinsurance percentage for Preferred Mail-Order 1-month supply |  |
| `mrx_tier_mospfd_coins_2m` | NUM 3 | Coinsurance percentage for Preferred Mail-Order 2-month supply |  |
| `mrx_tier_mospfd_coins_3m` | NUM 3 | Coinsurance percentage for Preferred Mail-Order 3-month supply |  |
| `mrx_tier_oonp_copay_1m` | NUM 8 | Copayment amount for Out-of-Network Pharmacy 1-month supply |  |
| `mrx_tier_oonp_copay_othnum` | NUM 8 | Copayment amount for Out-of-Network Pharmacy other day supply |  |
| `mrx_tier_oonp_coins_1m` | NUM 3 | Coinsurance percentage for Out-of-Network Pharmacy 1-month supply |  |
| `mrx_tier_oonp_coins_othnum` | NUM 3 | Coinsurance percentage for Out-of-Network Pharmacy other day supply |  |
| `mrx_tier_ltcp_copay_1m` | NUM 8 | Copayment Amount for Long-Term Care Pharmacy 1-month supply |  |
| `mrx_tier_ltcp_coins_1m` | NUM 3 | Coinsurance percentage for Long-Term Care Pharmacy 1-month supply |  |
| `mrx_tier_rstd_copay_daily` | NUM 8 | Daily Standard Retail Copayment |  |
| `mrx_tier_rsstd_copay_daily` | NUM 8 | Daily Standard Retail Copayment |  |
| `mrx_tier_rspfd_copay_daily` | NUM 8 | Daily Preferred Retail Copayment |  |
| `mrx_tier_mostd_copay_daily` | NUM 8 | Daily Standard Mail-Order Copayment |  |
| `mrx_tier_mosstd_copay_daily` | NUM 8 | Daily Standard Mail-Order Copayment |  |
| `mrx_tier_mospfd_copay_daily` | NUM 8 | Daily Preferred Mail-Order Copayment |  |
| `mrx_tier_ltcp_copay_daily` | NUM 8 | Daily Copayment for Long-Term Care Pharmacy |  |
| `mrx_tier_form_model_desc` | CHAR 4000 | Tier Label Description(s) |  |
| `mrx_tier_ira_rstd_copay_1m` | NUM 8 | Insulin Copayment amount for Standard Retail Cost-Sharing one month supply |  |
| `mrx_tier_ira_rstd_copay_2m` | NUM 8 | Insulin Copayment amount for Standard Retail Cost-Sharing two month supply |  |
| `mrx_tier_ira_rstd_copay_3m` | NUM 8 | Insulin Copayment amount for Standard Retail Cost-Sharing three month supply |  |
| `mrx_tier_ira_rspfd_copay_1m` | NUM 8 | Insulin Copayment amount for Preferred Retail Cost-Sharing one month supply |  |
| `mrx_tier_ira_rspfd_copay_2m` | NUM 8 | Insulin Copayment amount for Preferred Retail Cost-Sharing two month supply |  |
| `mrx_tier_ira_rspfd_copay_3m` | NUM 8 | Insulin Copayment amount for Preferred Retail Cost-Sharing three month supply |  |
| `mrx_tier_ira_mostd_copay_1m` | NUM 8 | Insulin Copayment amount for Standard Mail Order Cost-Sharing one month supply |  |
| `mrx_tier_ira_mostd_copay_2m` | NUM 8 | Insulin Copayment amount for Standard Mail Order Cost-Sharing two month supply |  |
| `mrx_tier_ira_mostd_copay_3m` | NUM 8 | Insulin Copayment amount for Standard Mail Order Cost-Sharing three month supply |  |
| `mrx_tier_ira_mopfd_copay_1m` | NUM 8 | Insulin Copayment amount for Preferred Mail Order one month supply |  |
| `mrx_tier_ira_mopfd_copay_2m` | NUM 8 | Insulin Copayment amount for Preferred Mail Order two month supply |  |
| `mrx_tier_ira_mopfd_copay_3m` | NUM 8 | Insulin Copayment amount for Preferred Mail Order three month supply |  |
| `mrx_tier_ira_oonp_copay_1m` | NUM 8 | Insulin Copayment amount for Out-of-Network Pharmacy one month/other day supply |  |
| `mrx_tier_ira_ltcp_copay_1m` | NUM 8 | Insulin Copayment Amount for Long Term Care Pharmacy one month supply |  |
| `mrx_tier_ira_rstd_coins_1m` | NUM 3 | Insulin Coinsurance percent for Standard Retail Cost-Sharing one month supply |  |
| `mrx_tier_ira_rstd_coins_2m` | NUM 3 | Insulin Coinsurance percent for Standard Retail Cost-Sharing two month supply |  |
| `mrx_tier_ira_rstd_coins_3m` | NUM 3 | Insulin Coinsurance percent for Standard Retail Cost-Sharing three month supply |  |
| `mrx_tier_ira_rspfd_coins_1m` | NUM 3 | Insulin Coinsurance percent for Preferred Retail Cost-Sharing one month supply |  |
| `mrx_tier_ira_rspfd_coins_2m` | NUM 3 | Insulin Coinsurance percent for Preferred Retail Cost-Sharing two month supply |  |
| `mrx_tier_ira_rspfd_coins_3m` | NUM 3 | Insulin Coinsurance percent for Preferred Retail Cost-Sharing three month supply |  |
| `mrx_tier_ira_mostd_coins_1m` | NUM 3 | Insulin Coinsurance percent for Standard Mail Order Cost-Sharing one month supply |  |
| `mrx_tier_ira_mostd_coins_2m` | NUM 3 | Insulin Coinsurance percent for Standard Mail Order Cost-Sharing two month supply |  |
| `mrx_tier_ira_mostd_coins_3m` | NUM 3 | Insulin Coinsurance percent for Standard Mail Order Cost-Sharing three month supply |  |
| `mrx_tier_ira_mopfd_coins_1m` | NUM 3 | Insulin Coinsurance percent for Preferred Mail Order one month supply |  |
| `mrx_tier_ira_mopfd_coins_2m` | NUM 3 | Insulin Coinsurance percent for Preferred Mail Order two month supply |  |
| `mrx_tier_ira_mopfd_coins_3m` | NUM 3 | Insulin Coinsurance percent for Preferred Mail Order three month supply |  |
| `mrx_tier_ira_oonp_coins_1m` | NUM 3 | Insulin Coinsurance percent for Out-of-Network Pharmacy one month/other day supply |  |
| `mrx_tier_ira_ltcp_coins_1m` | NUM 3 | Insulin Coinsurance percent for Long Term Care Pharmacy one month supply |  |
| `mrx_tier_bal_rstd_copay_1m` | NUM 8 | BALANCE Copayment amount for Standard Retail Cost-Sharing one month supply |  |
| `mrx_tier_bal_rstd_copay_day` | NUM 8 | BALANCE Daily Standard Retail Copayment |  |
| `mrx_tier_bal_rstd_copay_2m` | NUM 8 | BALANCE Copayment amount for Standard Retail Cost-Sharing two month supply |  |
| `mrx_tier_bal_rstd_copay_3m` | NUM 8 | BALANCE Copayment amount for Standard Retail Cost-Sharing three month supply |  |
| `mrx_tier_bal_rspfd_copay_1m` | NUM 8 | BALANCE Copayment amount for Preferred Retail Cost-Sharing one month supply |  |
| `mrx_tier_bal_rspfd_copay_day` | NUM 8 | BALANCE Daily Preferred Retail Copayment |  |
| `mrx_tier_bal_rspfd_copay_2m` | NUM 8 | BALANCE Copayment amount for Preferred Retail Cost-Sharing two month supply |  |
| `mrx_tier_bal_rspfd_copay_3m` | NUM 8 | BALANCE Copayment amount for Preferred Retail Cost-Sharing three month supply |  |
| `mrx_tier_bal_mostd_copay_1m` | NUM 8 | BALANCE Copayment amount for Standard Mail Order Cost-Sharing one month supply |  |
| `mrx_tier_bal_mostd_copay_day` | NUM 8 | BALANCE Daily Standard Mail-Order Copayment |  |
| `mrx_tier_bal_mostd_copay_2m` | NUM 8 | BALANCE Copayment amount for Standard Mail Order Cost-Sharing two month supply |  |
| `mrx_tier_bal_mostd_copay_3m` | NUM 8 | BALANCE Copayment amount for Standard Mail Order Cost-Sharing three month supply |  |
| `mrx_tier_bal_mopfd_copay_1m` | NUM 8 | BALANCE Copayment amount for Preferred Mail Order one month supply |  |
| `mrx_tier_bal_mopfd_copay_day` | NUM 8 | BALANCE Daily Preferred Mail-Order Copayment |  |
| `mrx_tier_bal_mopfd_copay_2m` | NUM 8 | BALANCE Copayment amount for Preferred Mail Order two month supply |  |
| `mrx_tier_bal_mopfd_copay_3m` | NUM 8 | BALANCE Copayment amount for Preferred Mail Order three month supply |  |
| `mrx_tier_bal_oonp_copay_1m` | NUM 8 | BALANCE Copayment amount for Out-of-Network Pharmacy one month/other day supply |  |
| `mrx_tier_bal_ltcp_copay_1m` | NUM 8 | BALANCE Copayment Amount for Long Term Care Pharmacy one month supply |  |
| `mrx_tier_bal_ltcp_copay_day` | NUM 8 | BALANCE Daily Copayment for Long-Term Care Pharmacy |  |

## pbp_mrx_p.txt

20 names in the dictionary, 20 columns in the file; in the file and not the dictionary: none; in the dictionary and not the file: none. The key columns and the Section A columns every file repeats are left out.

| Column | Type | Field title | Codes (CODES = CODE_VALUES; long values cut at 87 characters) |
|---|---|---|---|
| `part_d_model_demo` | CHAR 1 | Part D Model Demo | 1 = Yes; 0 = No |
| `part_d_enhncd_cvrg_demo` | CHAR 1 | Part D Senior Savings Model | 1 = Yes; 0 = No |
| `mrx_tier_post_label_list` | CHAR 250 | Tier Label Description |  |
| `mrx_tier_post_benefit_type` | CHAR 1 | Type of drug benefit | 1 = Defined Standard; 2 = Actuarially Equivalent Standard; 3 = Basic Alternative; 4 = Enhanced Alternative |
| `mrx_tier_post_form_model_desc` | CHAR 4000 | Tier Label Description(s) |  |
| `mrx_tier_post_id` | CHAR 1 | Tier ID - OOP |  |
| `mrx_tier_post_type_id` | CHAR 1 | Tier Type ID - OOP | 2 = OOP |
| `mrx_tier_post_drug_type` | CHAR 2 | Drug type(s) in this Tier | 1 in 1 = Brand; 1 in 2 = Generic |
| `mrx_tier_post_includes` | CHAR 1 | Tier Includes | 1 = Part D Drugs Only; 2 = Excluded drugs only (e.g., erectile dysfunction drugs); 3 = Both Part D and Excluded drugs |
| `mrx_tier_post_cost_struct` | CHAR 1 | Cost-Share Structure | 1 = Coinsurance; 2 = Copayment; 3 = Greater of Coinsurance and Copayment; 4 = Lesser of Coinsurance and Copayment |
| `mrx_tier_post_copay_amt` | NUM 8 | Copayment |  |
| `mrx_tier_post_coins_pct` | NUM 3 | Coinsurance |  |
