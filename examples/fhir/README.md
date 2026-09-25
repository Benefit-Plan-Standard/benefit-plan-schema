# FHIR InsurancePlan outputs

Each file here is the output of `scripts/to-insuranceplan.js` for one BPS example in `examples/`: a FHIR R4 collection `Bundle` holding one `InsurancePlan` and the `Organization` it references. The `InsurancePlan` targets the CARIN Digital Insurance Card SBC InsurancePlan profile (`sbc-insurance-plan`). That profile exists only in the ballot package `hl7.fhir.us.insurance-card#2.0.0-ballot` and is draft and experimental. The mapping is specified in [`../../docs/specs/insuranceplan-converter.md`](../../docs/specs/insuranceplan-converter.md).

These files are golden files. `node --test scripts/to-insuranceplan.test.js` fails if the converter's output drifts from them. They also serve as fixtures for ports of the converter to other languages.

Regenerate them on purpose, and only on purpose:

```
node scripts/to-insuranceplan.js --write-golden
```

Validation record: [`VALIDATION.md`](VALIDATION.md).

## Files

| File | BPS source | BPS schema | Benefits placed | Benefits outside the SBC codes | `Not stated in the BPS document` entries |
|---|---|---|---|---|---|
| `aetna-ppo-1500-80-50.json` | `aetna_example.json` | 1.1.0 | 26 | 1 | 0 |
| `aetna-ppo-5000-80-50.json` | `aetna_ppo5000_example.json` | 1.1.0 | 26 | 1 | 0 |
| `ambetter-ca-silver-94-hmo.json` | `ambetter_example.json` | 1.1.0 | 27 | 3 | 2 |
| `cigna-oap-bowdoin.json` | `cigna_example.json` | 1.1.0 | 26 | 4 | 0 |
| `flblue-blueoptions-505.json` | `bluecross_example.json` | 1.1.0 | 27 | 4 | 0 |
| `gatorcare-prime-epo.json` | `gatorcare_example.json` | 1.1.0 | 25 | 4 | 1 |
| `humana-gold-plus-h1036-025-hmo.json` | `humana_example.json` | 1.2.0 | 26 | 46 | 9 |
| `kaiser-ca-gold-80-hmo.json` | `kaiser_example.json` | 1.1.0 | 28 | 3 | 0 |
| `scan-classic-hmo-los-angeles.json` | `scan_example.json` | 1.2.0 | 22 | 49 | 20 |
| `uhc-choice-plus-hsa-gold-1700.json` | `united_example.json` | 1.1.0 | 26 | 3 | 0 |

## Medicare Advantage files

`humana-gold-plus-h1036-025-hmo.json`: Medicare Advantage, keyed by hand from the CMS Summary of Benefits, validates against the v1.2.0 draft only.

`scan-classic-hmo-los-angeles.json`: Medicare Advantage, keyed by hand from the CMS Summary of Benefits, validates against the v1.2.0 draft only.

A Summary of Benefits is not an SBC. These two files conform structurally to the SBC InsurancePlan profile, but most of their benefits (dental, vision, hearing, supplemental benefits, Part B drugs) have no code in the SBC benefit category code system. Those benefits are listed by identity in the `bps-unmapped-benefit` extension, and their cost sharing is not carried.

## Reading the files

- **Benefits outside the SBC codes.** The SBC benefit category binding is required and has 29 codes. A BPS benefit with no code there is not placed in `coverage` or `plan.specificCost`. It is listed in a `bps-unmapped-benefit` extension on the `InsurancePlan`. Home health care is one of these in the eight SBC files and in SCAN, because the code system has no general home health code. The Humana file has no home health benefit.
- **`Not stated in the BPS document`.** The profile requires at least 2 `cost` entries per benefit. When the BPS document has only one, the converter adds an entry for the missing network with this text and a `data-absent-reason` of `unknown`. It describes the BPS document, not the source PDF.
- **Kaiser.** The Kaiser BPS file (`kaiser_example.json`) carries both SBC columns: `Plan Provider` (in-network) and `Non-Plan Provider` (out-of-network). Out of network, emergency room care ($350 / visit) and emergency medical transportation ($250 / trip) are covered at the same amounts as in network; every other chart row is not covered. Acupuncture, which the SBC lists only under "Other Covered Services", has no out-of-network row because the document prints no value for it.
- **Ambetter.** The SBC prints one out-of-network cell, "Covered at In-Network cost-share for emergencies only", across emergency room care, emergency medical transportation and urgent care. The Ambetter BPS file carries it for emergency room care only, so ambulance and urgent care each have an out-of-network `Not stated in the BPS document` entry.
- **Kaiser surgeon fee.** Kaiser's `OUTPATIENT_SURGERY_SURGEON` benefit is the hospital-stay "Physician/surgeon fee" row on page 2 of the SBC, so it is placed under `hospital-inpatient` through an override in `fhir/carin-sbc-crosswalk.json`.
- **Source references.** The 8 SBC files carry page references at the plan level only, on the `InsurancePlan`. The 2 Medicare Advantage files also carry per-benefit page references on each placed benefit.
- **Not covered.** A BPS `covered: false` row becomes a `cost` entry with type text `Not covered` and a `data-absent-reason` of `not-applicable` on the value, not `value: 0`.
