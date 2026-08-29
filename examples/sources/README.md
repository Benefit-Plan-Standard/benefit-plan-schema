# Example source documents

Original published Summary of Benefits and Coverage (SBC) documents kept beside the examples,
so any value in an example can be checked against its source side by side. The SBC is the
disclosure document US health plans must produce under the ACA (section 2715) in a federally
standardized format and make publicly available. Copies are included unmodified.

| Source PDF | Plan | Pairs with |
|---|---|---|
| `aetna_ppo_1500_80_50_2026_sbc.pdf` | Aetna FL PPO 1500 80/50 (employer PPO, 2026) | `../aetna_example.json` |
| `aetna_ppo_5000_80_50_2026_sbc.pdf` | Aetna FL PPO 5000 80/50 (employer PPO, 2026) | `../aetna_ppo5000_example.json` |
| `bluecross_blueoptions_505_2023_sbc.pdf` | Florida Blue BlueOptions 505 (individual PPO, contract year 07/2023-06/2024) | `../bluecross_example.json` |
| `cigna_open_access_plus_2026_sbc.pdf` | Cigna Open Access Plus, Bowdoin College group (employer OAP, 2026) | `../cigna_example.json` |
| `gatorcare_prime_2026_sbc.pdf` | GatorCare Prime EPO (self-funded employer, administered by Florida Blue, 2026) | `../gatorcare_example.json` |
| `gatorcare_pharmacy_sbc_2026.pdf` | GatorCare pharmacy SBC, shared across the main plans (companion document; prescription drugs are 'Not Covered' on the medical SBC because they live here) | (pharmacy module, future) |
| `uhc_choice_plus_hsa_gold_2026_sbc.pdf` | UHC Choice Plus HSA Gold 1700-4, DC SHOP (HDHP/HSA, 2026) | `../united_example.json` |
| `kaiser_ca_hmo_2026_sbc.pdf` | Kaiser Permanente CA individual/family HMO (2026) | `../kaiser_example.json` |
| `ambetter_silver_94_hmo_2026_sbc.pdf` | Ambetter Silver 94 HMO, California marketplace (CSR silver, 2026) | `../ambetter_example.json` |

Every example in this folder's parent directory is regenerated directly from these
documents through the reference implementation (HealthPlanAPI/BIME) and verified
value-by-value against the source PDF. The JSON, the page references, and the source
line up exactly; values the pipeline does not extract are omitted rather than filled
in by hand, and each example's `source_references` quote the passages that document
any omission.

Regenerated and verified so far: `aetna_example.json`, `aetna_ppo5000_example.json`,
`cigna_example.json`, `kaiser_example.json`, `ambetter_example.json`, `bluecross_example.json`,
`gatorcare_example.json`, `united_example.json`
(every cost-share value checked against the SBC page by page; values the pipeline
does not extract are omitted rather than filled in by hand).

Known, documented imperfection in `kaiser_example.json`: the SBC prices the
Diagnostic test row as "X-ray: $75 / Lab tests: $40" in one cell; the pipeline
carries a single copay per benefit and kept the x-ray value. The full split is
quoted in that example's source_references, and the model change to represent
priced sub-services is tracked in the reference implementation's backlog.
