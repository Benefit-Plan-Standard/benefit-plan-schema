# Examples

Ten plans expressed in the Benefit Plan Standard, each paired with the published document it comes from. Use them to see how a real plan document maps into the standard, to test a parser or importer, or as input to the FHIR converter.

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

## How they were made

- **The 8 SBC examples** are generated from the source Summary of Benefits and Coverage and verified value by value against it. They validate against v1.1.0 and, unchanged, against the v1.2.0 draft.
- **The 2 Medicare Advantage examples** are keyed by hand from the CMS Summary of Benefits and verified value by value against the cited pages. They use fields added in the v1.2.0 draft, so they validate against that draft only. See [`../docs/medicare-advantage-notes.md`](../docs/medicare-advantage-notes.md).

## Source references

Every example carries `source_references[]` with a page number and the source text.

- The 8 SBC examples carry page references at the plan level (18 to 26 per plan). Individual benefits do not point to a specific reference.
- The 2 Medicare Advantage examples also carry references on every benefit (72 of 72 for Humana, 71 of 71 for SCAN).

## Things to know

- **Florida Blue** is contract year 07/2023 to 06/2024; the other plans are 2026.
- **Kaiser** carries only the in-network (Plan Provider) tier. The SBC's out-of-network column is not in the file.
- **Cigna's plan type** is `OAP` (Open Access Plus), as printed on the SBC.
- **GatorCare** prescription drugs sit in a separate pharmacy SBC (in `sources/`), so they show as not covered on the medical plan.

## Condition types used in the examples

The 8 SBC examples carry row text that is not a cost share or a structured limit in `benefits[].conditions[]`, with `description` set to the exact PDF text. Use these types so the files stay consistent:

| Type | Holds |
|---|---|
| `benefit_limit` | Limit wording kept verbatim: a limit with no benefit row of its own, or a limit whose wording the structured `limits[]` cannot carry in full |
| `exception` | An exception printed inside a cost cell (for example where the deductible does not apply) |
| `site_of_service` | A cost cell that prices settings differently (for example Ambulatory Surgical Center against Hospital) |
| `dispensing_limit` | Drug day-supply wording, one condition per channel where retail and mail order differ |
| `cost_share_cap` | A maximum copay or coinsurance amount (also in that cost share's `notes`) |
| `penalty` | A penalty for missing precertification |
| `authorization` | A precertification or preauthorization requirement or threshold |

The 2 Medicare Advantage examples use their own condition types (for example `authorization`, `network`, `eligibility`).

## Folders

- [`sources/`](sources/): the original published PDFs, unmodified, one per example, so any value can be checked against its source. See [`sources/README.md`](sources/README.md).
- [`fhir/`](fhir/): each example converted to a FHIR R4 `InsurancePlan` in the CARIN Digital Insurance Card SBC InsurancePlan profile (STU 2 ballot), with the validation record. See [`fhir/README.md`](fhir/README.md). The same files are published at https://benefitplanstandard.org/fhir/index.json.

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
