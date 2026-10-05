# Examples

13 plans expressed in the Benefit Plan Standard. 10 are read from a published plan document, which ships alongside them in `sources/`. 3 are imported from the CMS Marketplace public use files. Use them to see how a real plan maps into the standard, to test a parser or importer, or as input to the FHIR converter.

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
| `blue-cross-and-blue-shield-of-louisiana-blue-max-copay-50-50.puf.json` | Blue Max Copay (PCP) 50/50 $3300 with 2 $0 PCP Virtual Visits, 97176LA0340010-01 | Blue Cross and Blue Shield of Louisiana | LA | Individual | Silver | 2026 | v1.1.0 | 44 of 75 | Plan Attributes PUF and Benefits and Cost Sharing PUF, PY2026 | Yes |
| `florida-blue-blueoptions-gold-1505.puf.json` | BlueOptions Gold 1505, 16842FL0070120-01 | Florida Blue (BlueCross BlueShield FL) | FL | Individual | Gold | 2023 | v1.1.0 | 44 of 75 | Plan Attributes PUF and Benefits and Cost Sharing PUF, PY2023 | Yes |
| `unitedhealthcare-uhc-gold-standard.puf.json` | UHC Gold Standard, 40220TX0080024-01 | UnitedHealthcare | TX | Individual | Gold | 2026 | v1.1.0 | 44 of 68 | Plan Attributes PUF and Benefits and Cost Sharing PUF, PY2026 | Yes |

"Benefits placed" is the number of entries in `benefits[]` out of the plan's rows in the Benefits and Cost Sharing PUF. A row is placed when its benefit name maps to a canonical key in `../fhir/marketplace-puf-crosswalk.json`; the other rows (31, 31 and 24) are listed by name and coverage in `source_references[]`. The plan ID after each name is the HIOS plan ID, which v1.1.0 has no field for.

## How they were made

- **The 8 SBC examples** are generated from the source Summary of Benefits and Coverage and verified value by value against it. On 2026-10-05 the 8 were corrected against their PDFs for limits and deductible flags; [`../docs/changelog.md`](../docs/changelog.md) has the detail. Also on 2026-10-05, the deductible flags on cost shares whose cell is silent about the deductible were set from the issuer's annotation convention and the SBC template footnote, with the page 1 answer to "Are there services covered before you meet your deductible?". They validate against v1.1.0 and, unchanged, against the v1.2.0 draft.
- **The 2 Medicare Advantage examples** are keyed by hand from the CMS Summary of Benefits and verified value by value against the cited pages. They use fields added in the v1.2.0 draft, so they validate against that draft only. See [`../docs/medicare-advantage-notes.md`](../docs/medicare-advantage-notes.md).
- **The 3 public-file examples** are produced by `scripts/from-marketplace-puf.js` from 2 CMS files for the plan year: the Plan Attributes PUF and the Benefits and Cost Sharing PUF. No PDF is read. The output is deterministic: the same 2 files and download date always give byte-identical output. They validate against v1.1.0 and the v1.2.0 draft. See [`../docs/specs/marketplace-puf-importer.md`](../docs/specs/marketplace-puf-importer.md).

## Source references

Every example carries `source_references[]`.

- The 8 SBC examples carry page references at the plan level (18 to 26 per plan), each with a page number and the source text. Individual benefits do not point to a specific reference.
- The 2 Medicare Advantage examples also carry references on every benefit (72 of 72 for Humana, 71 of 71 for SCAN).
- The 3 public-file examples carry 4 plan-level entries each, as text only, because the public files have no pages. The first names the 2 files and their download URLs, the plan year, the download date (2026-10-05), the HIOS plan ID and the SBC URL from the Plan Attributes PUF. The other 3 hold, verbatim, the plan attributes with no BPS field (metal level, cost-sharing reduction variation, network and formulary IDs and others), every accumulator cell, and the benefit rows with no canonical key. Individual benefits carry no references.

## Things to know

- **Deductible flags on silent cells** follow the issuer's annotation convention, read once per chart. A plan with no deductible (Ambetter, Kaiser) is false throughout; wording in the cell always wins.
  - The chart marks where the deductible applies ("Deductible +", "after Deductible"): a silent cell is false. GatorCare and Florida Blue. This holds even when the chart also carries the other kind of mark.
  - The chart marks only where it does not apply ("Deductible does not apply"): a silent cell is true, as the template footnote says. Aetna PPO 1500, Aetna PPO 5000 and Cigna.
  - The chart marks neither: the footnote and the page 1 answer to "Are there services covered before you meet your deductible?" decide, so a silent cell is true unless page 1 exempts the service. United.
- **Florida Blue** (`bluecross_example.json`) is contract year 07/2023 to 06/2024; the other document-derived plans are 2026. Of the public-file examples, Florida Blue Gold 1505 is plan year 2023 and the other 2 are 2026.
- **Florida Blue 505 and Florida Blue Gold 1505 are different plans.** The PY2023 public file has no BlueOptions 505; Gold 1505 is the closest row by name. The comparison is in [`../docs/specs/marketplace-puf-vs-sbc-flblue-505.md`](../docs/specs/marketplace-puf-vs-sbc-flblue-505.md).
- **Kaiser** carries both SBC columns: `IN` (Plan Provider) and `OUT` (Non-Plan Provider), added on 2026-09-25. Out of network, only emergency room care and emergency medical transportation are covered; every other row is not covered. Acupuncture has no out-of-network row, because the SBC prints no value for it.
- **Cigna's plan type** is `OAP` (Open Access Plus), as printed on the SBC.
- **GatorCare** prescription drugs sit in a separate pharmacy SBC (in `sources/`), so they show as not covered on the medical plan.
- **Florida Blue Gold 1505 has a second in-network tier.** The public file has in-network tier 2 values for this plan, so the document carries 3 network tiers: `IN` ("In-Network Tier 1"), `IN2` ("In-Network Tier 2") and `OUT`. Every benefit has an `IN2` row, but only 4 state a tier 2 amount (primary care, specialist, urgent care and nutritional counseling); for the rest, both tier 2 columns say `Not Applicable`, and the row quotes them in `notes`. The plan's Explanation text puts the lower "Value Choice Providers" prices in tier 1 (primary care: tier 1 "No Charge", tier 2 "$20.00"). The FHIR converter maps `IN2` to in-network with a text-only cost-tier qualifier.
- **Home health care and chiropractic care** are in the BPS files (home health in all 8 SBC examples, all 3 public-file examples and SCAN; chiropractic in Ambetter, Florida Blue, Cigna, GatorCare, Kaiser, both Medicare Advantage examples and all 3 public-file examples), but neither is among the 29 benefit category codes of the SBC InsurancePlan profile. The converter lists them by name in a `bps-unmapped-benefit` extension, so their limits and conditions (for example the home health visit limits in all 8 SBC examples) do not reach the Bundles.

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

The 3 public-file examples use 2 other types, 1 per free-text column of the Benefits and Cost Sharing PUF: `exclusion` (the `Exclusions` column) and `explanation` (the `Explanation` column), both verbatim. The 2 Medicare Advantage examples use their own condition types (for example `authorization`, `network`, `eligibility`).

## Folders

- [`sources/`](sources/): the original published PDFs, unmodified, 1 per document-derived example (GatorCare has a second, its pharmacy SBC), so any value can be checked against its source. See [`sources/README.md`](sources/README.md). The public-file examples have no PDF here; the public files are downloaded into `data/puf/<year>/` and not committed.
- [`fhir/`](fhir/): the 10 document-derived examples converted to FHIR R4 Bundles, each holding an `InsurancePlan` in the CARIN Digital Insurance Card SBC InsurancePlan profile (STU 2 ballot) and its `Organization`, with the validation record. They are golden files for the converter's tests. They are published on the site at https://benefitplanstandard.org/fhir/index.json. See [`fhir/README.md`](fhir/README.md).
- [`fhir-puf/`](fhir-puf/): the 3 public-file examples converted to FHIR by the same converter, with their own validation record. They show the chain from the public files to FHIR. They are not golden files, they are not published on the site, and they are not in `fhir/index.json`. See [`fhir-puf/README.md`](fhir-puf/README.md).

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
