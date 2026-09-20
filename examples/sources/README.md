# Example source documents

Original published plan documents kept beside the examples, so any value in an example can be
checked against its source side by side. Copies are included unmodified.

There are two kinds of document here. The Summary of Benefits and Coverage (SBC) is the
disclosure document US health plans must produce under the ACA (section 2715) in a federally
standardized format and make publicly available. The Summary of Benefits is the document
Medicare Advantage plans give prospective enrollees; CMS sets its content and order but not
its layout. File names end in `_sbc` or `_summary_of_benefits` so the two are never mixed up.

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
| `scan_classic_prime_hmo_los_angeles_2026_summary_of_benefits.pdf` | SCAN Classic (HMO) and SCAN Prime (HMO), Los Angeles County (Medicare Advantage Summary of Benefits, 2026; one document for both plans) | `../scan_example.json` (SCAN Classic only) |
| `humana_gold_plus_h1036_025_hmo_2026_summary_of_benefits.pdf` | Humana Gold Plus H1036-025 (HMO), Hernando, Hillsborough, Pasco and Pinellas counties, Florida (Medicare Advantage Summary of Benefits, 2026) | `../humana_example.json` |

Every SBC example in this folder's parent directory is regenerated directly from these
documents through the reference implementation and verified
value-by-value against the source PDF. The JSON, the page references, and the source
line up exactly; values the pipeline does not extract are omitted rather than filled
in by hand, and each example's `source_references` quote the passages that document
any omission.

Regenerated and verified so far: `aetna_example.json`, `aetna_ppo5000_example.json`,
`cigna_example.json`, `kaiser_example.json`, `ambetter_example.json`, `bluecross_example.json`,
`gatorcare_example.json`, `united_example.json`
(every cost-share value checked against the SBC page by page; values the pipeline
does not extract are omitted rather than filled in by hand).

The two Medicare Advantage examples, `scan_example.json` and `humana_example.json`, were
built by hand from their Summary of Benefits and checked value by value in a separate pass.
A script found every quoted value on its cited page (in the plan's own column for SCAN), and
a review then compared every benefit with the page images. They use the v1.2.0 draft schema.
How they were built, what didn't fit, and the verification record are in
[`../../docs/medicare-advantage-notes.md`](../../docs/medicare-advantage-notes.md).

Known, documented imperfection in `kaiser_example.json`: the SBC prices the
Diagnostic test row as "X-ray: $75 / Lab tests: $40" in one cell; the pipeline
carries a single copay per benefit and kept the x-ray value. The full split is
quoted in that example's source_references, and the model change to represent
priced sub-services is tracked in the reference implementation's backlog.
