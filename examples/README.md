# Examples

22 plans expressed in the Benefit Plan Standard. 10 are read from a published plan document, which ships alongside them in `sources/`. 5 are imported from the CMS Marketplace public use files and 7 from the CMS Plan Benefit Package files: 5 Medicare Advantage plans and 2 stand-alone Medicare Part D plans. Use them to see how a real plan maps into the standard, to test a parser or importer, or as input to the FHIR converter.

How the CMS files become these examples and their FHIR Bundles, with every command: [How the data flows](https://benefitplanstandard.org/docs/specification/data-flow).

## From published plan documents

| File | Plan | Carrier | Market | Plan type | Year | Schema | Benefits | Source document |
|---|---|---|---|---|---|---|---|---|
| `aetna_example.json` | Aetna FL PPO 1500 80/50 | Aetna | Large group | PPO | 2026 | v1.1.0 | 27 | SBC |
| `aetna_ppo5000_example.json` | Aetna FL PPO 5000 80/50 | Aetna | Large group | PPO | 2026 | v1.1.0 | 27 | SBC |
| `ambetter_example.json` | Silver 94 Ambetter HMO (Health Net of CA) | Ambetter | Individual | HMO | 2026 | v1.1.0 | 30 | SBC |
| `bluecross_example.json` | BlueOptions 505 | Florida Blue | Individual | PPO | 2023 | v1.1.0 | 31 | SBC |
| `cigna_example.json` | Open Access Plus, Bowdoin College | Cigna | Large group | OAP | 2026 | v1.1.0 | 30 | SBC |
| `gatorcare_example.json` | Prime EPO (administered by Florida Blue) | GatorCare | Self-funded | EPO | 2026 | v1.1.0 | 29 | SBC |
| `kaiser_example.json` | Gold 80 HMO | Kaiser Permanente | Individual | HMO | 2026 | v1.1.0 | 31 | SBC |
| `united_example.json` | Choice Plus HSA Gold 1700-4 | UnitedHealthcare | Small group | POS | 2026 | v1.1.0 | 29 | SBC |
| `humana_example.json` | Gold Plus H1036-025 (HMO) | Humana | Medicare Advantage | HMO | 2026 | v1.2.0 draft | 72 | CMS Summary of Benefits |
| `scan_example.json` | SCAN Classic (HMO), Los Angeles County | SCAN Health Plan | Medicare Advantage | HMO | 2026 | v1.2.0 draft | 71 | CMS Summary of Benefits |

"Benefits" is the number of entries in `benefits[]`.

## From the CMS Marketplace public use files

| File | Plan | Issuer | State | Market | Metal level | Plan year | Schema | Benefits placed | Source | FHIR Bundle in `fhir-puf/` |
|---|---|---|---|---|---|---|---|---|---|---|
| `avmed-avmed-entrust-gold-125.puf.json` | AvMed Entrust Gold 125 (2026), 19898FL0340001-01 | AvMed | FL | Individual | Gold | 2026 | v1.2.0 | 52 of 73 | Plan Attributes PUF, Benefits and Cost Sharing PUF and Network PUF, PY2026 | Yes |
| `blue-cross-and-blue-shield-of-louisiana-blue-max-copay-50-50.puf.json` | Blue Max Copay (PCP) 50/50 $3300 with 2 $0 PCP Virtual Visits, 97176LA0340010-01 | Blue Cross and Blue Shield of Louisiana | LA | Individual | Silver | 2026 | v1.2.0 | 52 of 75 | Plan Attributes PUF, Benefits and Cost Sharing PUF and Network PUF, PY2026 | Yes |
| `florida-blue-blueoptions-gold-1505.puf.json` | BlueOptions Gold 1505, 16842FL0070120-01 | Florida Blue (BlueCross BlueShield FL) | FL | Individual | Gold | 2023 | v1.2.0 | 52 of 75 | Plan Attributes PUF, Benefits and Cost Sharing PUF and Network PUF, PY2023 | Yes |
| `unitedhealthcare-uhc-bronze-essential.puf.json` | UHC Bronze Essential ($0 Virtual Urgent Care), 68398FL0030058-01 | UnitedHealthcare | FL | Individual | Bronze | 2026 | v1.2.0 | 52 of 68 | Plan Attributes PUF, Benefits and Cost Sharing PUF and Network PUF, PY2026 | Yes |
| `unitedhealthcare-uhc-gold-standard.puf.json` | UHC Gold Standard, 40220TX0080024-01 | UnitedHealthcare | TX | Individual | Gold | 2026 | v1.2.0 | 52 of 68 | Plan Attributes PUF, Benefits and Cost Sharing PUF and Network PUF, PY2026 | Yes |

"Benefits placed" is the number of entries in `benefits[]` out of the plan's rows in the Benefits and Cost Sharing PUF. A row is placed when its benefit name maps to a canonical key in `../fhir/marketplace-puf-crosswalk.json`; the other rows (21, 23, 23, 16 and 16) are listed by name and coverage in `source_references[]`. The plan ID after each name is the HIOS plan ID, which each document carries in `plan_identifiers` (system `hios_plan_id`) since 2026-10-20. Each document's in-network tier also carries the provider directory link from the Network PUF.

## The 7 PBP public-file examples

| File | Plan | Issuer | State | Market | Plan type | Plan year | Schema | Benefits placed | Source | FHIR Bundle in `fhir/` |
|---|---|---|---|---|---|---|---|---|---|---|
| `unitedhealthcare-aarp-medicare-advantage-from-uhc-fl-0021.pbp.json` | AARP Medicare Advantage from UHC FL-0021 (PPO), H2406-013-000, 7 counties | UnitedHealthcare | FL | Medicare Advantage | PPO | 2027 | v1.2.0 | 38 of 41 | CMS PBP Benefits 2027 (Plan Benefit Package data), downloaded 2026-10-06 | Yes |
| `humana-humana-gold-plus-h1036-068.pbp.json` | Humana Gold Plus H1036-068 (HMO), H1036-068-000, 9 counties | Humana | FL | Medicare Advantage | HMO | 2027 | v1.2.0 | 38 of 41 | CMS PBP Benefits 2027 (Plan Benefit Package data), downloaded 2026-10-06 | Yes |
| `aetna-medicare-aetna-medicare-select-extra.pbp.json` | Aetna Medicare Select Extra (HMO-POS), H1609-028-000, 11 counties | Aetna Medicare | FL | Medicare Advantage | HMO-POS | 2027 | v1.2.0 | 38 of 41 | CMS PBP Benefits 2027 (Plan Benefit Package data), downloaded 2026-10-06 | Yes |
| `upmc-for-life-upmc-for-life-ppo-rx-choice.pbp.json` | UPMC for Life PPO Rx Choice (PPO), H5533-019-000, 1 county | UPMC for Life | PA | Medicare Advantage | PPO | 2027 | v1.2.0 | 38 of 41 | CMS PBP Benefits 2027 (Plan Benefit Package data), downloaded 2026-10-06 | Yes |
| `scan-health-plan-scan-costco-medicare-advantage.pbp.json` | SCAN Costco Medicare Advantage (HMO), H5425-140-000, 1 county | SCAN Health Plan | CA | Medicare Advantage | HMO | 2027 | v1.2.0 | 38 of 41 | CMS PBP Benefits 2027 (Plan Benefit Package data), downloaded 2026-10-06 | Yes |
| `unitedhealthcare-aarp-medicare-rx-preferred-from-uhc.pbp.json` | AARP Medicare Rx Preferred from UHC (PDP), S5921-383-000, region 11 Florida | UnitedHealthcare | FL | Medicare Part D | PDP | 2027 | v1.2.0 | Part D only | CMS PBP Benefits 2027 (Plan Benefit Package data), downloaded 2026-10-06 | No |
| `wellcare-wellcare-value-script.pbp.json` | Wellcare Value Script (PDP), S4802-146-000, region 11 Florida | Wellcare | FL | Medicare Part D | PDP | 2027 | v1.2.0 | Part D only | CMS PBP Benefits 2027 (Plan Benefit Package data), downloaded 2026-10-06 | No |

| File | Part D benefits (initial coverage and catastrophic) | Drug tiers | Pharmacy networks | Part D deductible |
|---|---|---|---|---|
| `unitedhealthcare-aarp-medicare-advantage-from-uhc-fl-0021.pbp.json` | 33 (28 and 5) | 5 | 5 | 685 USD, Tiers 3 to 5 |
| `humana-humana-gold-plus-h1036-068.pbp.json` | 42 (37 and 5) | 5 | 5 | 700 USD, Tiers 4 and 5 |
| `aetna-medicare-aetna-medicare-select-extra.pbp.json` | 67 (62 and 5) | 5 | 6 | 700 USD, Tiers 3 to 5 |
| `upmc-for-life-upmc-for-life-ppo-rx-choice.pbp.json` | 67 (62 and 5) | 5 | 6 | 700 USD, Tiers 3 to 5 |
| `scan-health-plan-scan-costco-medicare-advantage.pbp.json` | 67 (62 and 5) | 5 | 6 | 450 USD, Tiers 3 to 5 |
| `unitedhealthcare-aarp-medicare-rx-preferred-from-uhc.pbp.json` | 41 (36 and 5) | 5 | 6 | 300 USD, Tiers 3 to 5 |
| `wellcare-wellcare-value-script.pbp.json` | 70 (64 and 6) | 6 | 6 | 700 USD, Tiers 2 to 5 |

Every Part D document carries `pharmacy.out_of_pocket_max` 2,400 USD, the contract year 2027 Part D threshold, from the CMS Rate Announcement (no PBP column states it), and a $0 catastrophic step per tier for covered Part D drugs; the mapping is [`../docs/specs/pbp-part-d-mapping.md`](../docs/specs/pbp-part-d-mapping.md).

"Benefits placed" is the number of entries in `benefits[]` out of the 41 service categories in `../fhir/pbp-crosswalk.json`, the importer's benefit set; each file's `source_references[]` says "38 written". The 3 not written are the single-type hearing aid rows (18b2, 18b3, 18b4), which none of the 5 plans chooses. A benefit the plan does not offer is written with `covered: false`; dental cleaning and fillings with no entry in the plan's PBP dental section are written that way too, with a note saying the plan filed no entry. Each Bundle places 16 benefits and lists 22 by name as outside the SBC benefit category codes, and since 2026-10-24 its Part D benefits as well, which the SBC profile has no place for. The 2 stand-alone Part D plans have no medical benefits and are not converted. Since 2026-10-20 each document also has the premium, the member services phone and, where Section A gives a full address, the website and the provider directory link (UPMC both, Humana the directory). The plan ID after each name is the contract-plan-segment. The 5 FHIR Bundles are in `fhir/`, not in a folder of their own, and are published on the site with the 10 document-derived Bundles.

## How they were made

- **The 8 SBC examples** are generated from the source Summary of Benefits and Coverage and verified value by value against it. On 2026-10-05 the 8 were corrected against their PDFs for limits and deductible flags; [`../docs/changelog.md`](../docs/changelog.md) has the detail. Also on 2026-10-05, the deductible flags on cost shares whose cell is silent about the deductible were set from the issuer's annotation convention and the SBC template footnote, with the page 1 answer to "Are there services covered before you meet your deductible?". They validate against v1.1.0 and, unchanged, against the v1.2.0 draft.
- **The 2 Medicare Advantage examples** are read from the CMS Summary of Benefits and verified value by value against the cited pages. They use fields added in the v1.2.0 draft, so they validate against that draft only. See [`../docs/medicare-advantage-notes.md`](../docs/medicare-advantage-notes.md).
- **The 5 Marketplace public-file examples** are produced by `scripts/from-marketplace-puf.js` from 3 CMS files for the plan year: the Plan Attributes PUF, the Benefits and Cost Sharing PUF and the Network PUF, which gives the provider directory link. No PDF is read. The output is deterministic: the same 3 files and download dates always give byte-identical output. They are v1.2.0 documents since 2026-10-20 (v1.1.0 before). The 4 for plan year 2026 were checked against the SBC their Plan Attributes PUF row links, with `scripts/pbp-sob-check.js`: UHC Bronze Essential, Blue Max Copay (PCP) 50/50 $3300, UHC Gold Standard and AvMed Entrust Gold 125 (expectations in [`../docs/specs/puf-sbc-checks/`](../docs/specs/puf-sbc-checks/)). See [`../docs/specs/marketplace-puf-importer.md`](../docs/specs/marketplace-puf-importer.md).
- **The 7 PBP public-file examples** are produced by `scripts/from-pbp.js` from the CMS Plan Benefit Package (PBP) Benefits files for contract year 2027. No PDF is read by the importer. The output is deterministic: the same files and download date always give byte-identical output. They are v1.2.0 documents. Six of them were checked against the carrier's 2027 Summary of Benefits with `scripts/pbp-sob-check.js`: H2406-013 (UnitedHealthcare), H1609-028 (Aetna), H5425-140 (SCAN) and H5533-019 (UPMC) on their medical benefits, H1036-068 (Humana) and S5921-383 (UnitedHealthcare, a stand-alone Part D plan) on their Part D benefits. See [`../docs/specs/pbp-importer.md`](../docs/specs/pbp-importer.md) and [`../docs/specs/pbp-part-d-mapping.md`](../docs/specs/pbp-part-d-mapping.md).

## Source references

Every example carries `source_references[]`.

- The 8 SBC examples carry page references at the plan level (18 to 26 per plan), each with a page number and the source text. Individual benefits do not point to a specific reference.
- The 2 Medicare Advantage examples also carry references on every benefit (72 of 72 for Humana, 71 of 71 for SCAN).
- The 5 public-file examples carry 5 plan-level entries each, as text only, because the public files have no pages. The first names the 3 files and their download URLs, the plan year, the download dates (2026-10-05, and 2026-10-20 for the Network PUF), each file's `ImportDate`, the HIOS plan IDs and the SBC URL from the Plan Attributes PUF. The other 4 hold, verbatim, the plan attributes with no BPS field (metal level, cost-sharing reduction variation, network and formulary IDs, the out-of-area and out-of-country answers and descriptions, and others), the Network PUF row behind the provider directory link, every accumulator cell, and the benefit rows with no canonical key. Individual benefits carry no references.
- The 5 Medicare Advantage public-file examples carry 18 to 24 plan-level entries each, as text only, because the PBP files have no pages: the file names, release, URL and download date, the plan type, the Section A values with no BPS field, the Section A cells behind the contacts and the provider directory link, the service area, the Section D premium cells, the deductible and out-of-pocket cells (verbatim), the benefit count, and since 2026-10-24 the Part D entries (the benefit type, the deductible reading, the threshold and its source, the pharmacy networks, the stages, the insulin cells of each tier and every `pbp_mrx.txt` cell). The 2 stand-alone Part D plans carry 15 and 14, with the Part D regions and a premium entry in place of the medical ones; their member services phone is read from Section A's Part D phone column, `pbp_a_pd_curmbr_phone`. Every benefit also carries its own references (all 71 to 105 in each).

## Things to know

- **Deductible flags on silent cells** follow the issuer's annotation convention, read once per chart. A plan with no deductible (Ambetter, Kaiser) is false throughout; wording in the cell always wins.
  - The chart marks where the deductible applies ("Deductible +", "after Deductible"): a silent cell is false. GatorCare and Florida Blue. This holds even when the chart also carries the other kind of mark.
  - The chart marks only where it does not apply ("Deductible does not apply"): a silent cell is true, as the template footnote says. Aetna PPO 1500, Aetna PPO 5000 and Cigna.
  - The chart marks neither: the footnote and the page 1 answer to "Are there services covered before you meet your deductible?" decide, so a silent cell is true unless page 1 exempts the service. United.
- **Florida Blue** (`bluecross_example.json`) is contract year 07/2023 to 06/2024; the other document-derived plans are 2026. Of the 5 Marketplace public-file examples, Florida Blue Gold 1505 is plan year 2023 and the other 4 are 2026; the 5 Medicare Advantage public-file examples are contract year 2027.
- **Florida Blue 505 and Florida Blue Gold 1505 are different plans.** The PY2023 public file has no BlueOptions 505; Gold 1505 is the closest row by name. The comparison is in [`../docs/specs/marketplace-puf-vs-sbc-flblue-505.md`](../docs/specs/marketplace-puf-vs-sbc-flblue-505.md).
- **Kaiser** carries both SBC columns: `IN` (Plan Provider) and `OUT` (Non-Plan Provider), added on 2026-09-25. Out of network, only emergency room care and emergency medical transportation are covered; every other row is not covered. Acupuncture has no out-of-network row, because the SBC prints no value for it.
- **Cigna's plan type** is `OAP` (Open Access Plus), as printed on the SBC.
- **GatorCare** prescription drugs sit in a separate pharmacy SBC (in `sources/`), so they show as not covered on the medical plan.
- **Florida Blue Gold 1505 has a second in-network tier.** The public file has in-network tier 2 values for this plan, so the document carries 3 network tiers: `IN` ("In-Network Tier 1"), `IN2` ("In-Network Tier 2") and `OUT`. Every benefit has an `IN2` row, but only 4 state a tier 2 amount (primary care, specialist, urgent care and nutritional counseling); for the rest, both tier 2 columns say `Not Applicable`, and the row quotes them in `notes`. The plan's Explanation text puts the lower "Value Choice Providers" prices in tier 1 (primary care: tier 1 "No Charge", tier 2 "$20.00"). The FHIR converter maps `IN2` to in-network with a text-only cost-tier qualifier.
- **Home health care and chiropractic care** are in the BPS files (home health in all 8 SBC examples, SCAN, the 5 Marketplace public-file examples and the 5 Medicare Advantage public-file examples; chiropractic in Ambetter, Florida Blue, Cigna, GatorCare, Kaiser, both Medicare Advantage examples, the 5 Marketplace public-file examples and the 5 Medicare Advantage public-file examples), but neither is among the 29 benefit category codes of the SBC InsurancePlan profile. The converter lists them by name in a `bps-unmapped-benefit` extension, so their limits and conditions (for example the home health visit limits in all 8 SBC examples) do not reach the Bundles.

## Condition types used in the examples

The 8 SBC examples carry row text that is not a cost share or a structured limit in `benefits[].conditions[]`, with `description` set to the exact PDF text. Use these 7 types so the files stay consistent:

| Type | Use it for |
|---|---|
| `benefit_limit` | Limit wording kept verbatim: a limit with no benefit row of its own, or a limit whose wording the structured `limits[]` cannot carry in full |
| `exception` | An exception printed inside a cost cell (for example where the deductible does not apply) |
| `site_of_service` | A cost cell that prices settings differently (for example Ambulatory Surgical Center against Hospital) |
| `dispensing_limit` | Drug day-supply wording, 1 condition per channel where retail and mail order differ |
| `cost_share_cap` | A maximum copay or coinsurance amount (also in that cost share's `notes`) |
| `penalty` | A penalty for missing precertification |
| `authorization` | A precertification or preauthorization requirement or threshold |

The 5 public-file examples use 2 other types, 1 per free-text column of the Benefits and Cost Sharing PUF: `exclusion` (the `Exclusions` column) and `explanation` (the `Explanation` column), both verbatim. The 2 Medicare Advantage examples use their own condition types (for example `authorization`, `network`, `eligibility`).

## Folders

- [`sources/`](sources/): the original published PDFs, unmodified, 1 per document-derived example (GatorCare has a second, its pharmacy SBC), so any value can be checked against its source. See [`sources/README.md`](sources/README.md). The public-file examples have no PDF here; the public files are downloaded into `data/puf/<year>/` and not committed.
- [`fhir/`](fhir/): the 10 document-derived examples converted to FHIR R4 Bundles, each holding an `InsurancePlan` in the CARIN Digital Insurance Card SBC InsurancePlan profile (STU 2 ballot) and its `Organization`, with the validation record. The 5 Medicare Advantage public-file examples are converted here too. They are golden files for the converter's tests. The 10 document-derived Bundles and the 5 Medicare Advantage public-file Bundles are published on the site at https://benefitplanstandard.org/fhir/index.json. See [`fhir/README.md`](fhir/README.md).
- [`fhir-puf/`](fhir-puf/): the 5 public-file examples converted to FHIR by the same converter, with their own validation record. They show the chain from the public files to FHIR. They are not golden files, they are not published on the site, and they are not in `fhir/index.json`. See [`fhir-puf/README.md`](fhir-puf/README.md).

## Validate an example

From the repository root:

```
node scripts/validate.js examples/aetna_example.json
node scripts/validate.js --schema schema/v1.2.0/benefit-plan.schema.json examples/humana_example.json
```

## Convert an example to FHIR

```
node scripts/to-insuranceplan.js examples/aetna_example.json
```

The mapping is specified in [`../docs/specs/insuranceplan-converter.md`](../docs/specs/insuranceplan-converter.md).

## Import a plan from the public files

```
node scripts/from-marketplace-puf.js --year 2026 --plan 40220TX0080024-01 --out plan.json
```

The public files must first be downloaded into `data/puf/<year>/`; the importer spec, section 11, gives the steps.

## Import a Medicare Advantage plan from the PBP files

```
node scripts/from-pbp.js --year 2027 --plan H2406-013-000 --out plan.json
node scripts/from-pbp.js --year 2027 --plan S5921-383-000 --out pdp.json    # a stand-alone Part D plan
```

The PBP files must first be downloaded into `data/pbp/<year>/`; the importer spec, section 11, gives the steps.
