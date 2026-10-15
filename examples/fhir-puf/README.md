# FHIR Bundles from the public-file importer

These files prove the chain from the CMS Marketplace public use files to FHIR: `scripts/from-marketplace-puf.js` writes a Benefit Plan Standard v1.1.0 document from the public files, and the existing converter, `scripts/to-insuranceplan.js`, reads that document unchanged and writes the Bundle. They are not golden files, they are not published, and they are not in `fhir/index.json`. The 15 published Bundles are in [`../fhir/`](../fhir/).

Importer spec: [`../../docs/specs/marketplace-puf-importer.md`](../../docs/specs/marketplace-puf-importer.md). Converter spec: [`../../docs/specs/insuranceplan-converter.md`](../../docs/specs/insuranceplan-converter.md). The whole route in one diagram, with every command: [How the data flows](https://benefitplanstandard.org/docs/specification/data-flow).

## Files

| BPS document (`examples/`) | Plan | Bundle | Benefits placed | Outside the SBC codes | Excluded services | Errors | Warnings |
|---|---|---|---|---|---|---|---|
| `blue-cross-and-blue-shield-of-louisiana-blue-max-copay-50-50.puf.json` | Blue Cross and Blue Shield of Louisiana, Blue Max Copay (PCP) 50/50 $3300 with 2 $0 PCP Virtual Visits, PY2026, Silver PPO, 97176LA0340010-01 | `blue-cross-and-blue-shield-of-louisiana-blue-max-copay-50-50.json` | 27 | 25 | 8 | 0 | 4 |
| `unitedhealthcare-uhc-gold-standard.puf.json` | UnitedHealthcare, UHC Gold Standard, PY2026, Texas, Gold HMO, 40220TX0080024-01 | `unitedhealthcare-uhc-gold-standard.json` | 27 | 25 | 9 | 0 | 14 |
| `florida-blue-blueoptions-gold-1505.puf.json` | Florida Blue, BlueOptions Gold 1505, PY2023, Gold EPO, 16842FL0070120-01 | `florida-blue-blueoptions-gold-1505.json` | 27 | 25 | 9 | 0 | 30 |
| `unitedhealthcare-uhc-bronze-essential.puf.json` | UnitedHealthcare, UHC Bronze Essential ($0 Virtual Urgent Care), PY2026, Florida, Bronze HMO, 68398FL0030058-01 | `unitedhealthcare-uhc-bronze-essential.json` | 27 | 25 | 9 | 0 | 12 |
| `avmed-avmed-entrust-gold-125.puf.json` | AvMed, AvMed Entrust Gold 125 (2026), PY2026, Florida, Gold HMO, 19898FL0340001-01 | `avmed-avmed-entrust-gold-125.json` | 27 | 25 | 9 | 0 | 31 |

**Florida Blue 1505 has a second in-network tier.** The plan has in-network tier 2 values in the public file, so the BPS document carries 3 network tiers: `IN`, `IN2` and `OUT`. The converter maps `IN2` to `in-network` with a text-only `cost.qualifiers` entry, "In-Network Tier 2" (converter spec 6.2; the tier name does not contain "Value Choice", so no `value-choice` code). Each placed benefit has 3 `cost[]` entries, 81 in all: 27 tier 1 (in-network, no qualifier), 27 tier 2 (in-network, qualifier) and 27 out-of-network. 23 of the 27 tier 2 entries read "Covered; amount not stated in the BPS document", because both tier 2 columns in the public file say `Not Applicable` for that benefit (importer spec 5.4).

**AvMed Entrust Gold 125 has a second in-network tier too.** Its public-file rows also carry in-network tier 2 values, so the BPS document has `IN`, `IN2` and `OUT`, and the Bundle has 81 `cost[]` entries for its 27 placed benefits: 27 tier 1, 27 tier 2 (text-only qualifier "In-Network Tier 2") and 27 out-of-network. 20 of the 27 tier 2 entries read "Covered; amount not stated in the BPS document", because both tier 2 columns say `Not Applicable` for that benefit.

No Bundle needed a `Not stated in the BPS document` placeholder: every placed benefit has both an in-network and an out-of-network row.

**Excluded services (since 2026-10-13).** The Bundles are written with `--excluded-services`, so each `InsurancePlan` carries the CARIN `excluded-services` extension: 1 `service` per benefit that the BPS document marks `covered` false on every tier, in document order, with `serviceType.text` the vocabulary label and the `description` "Derived from the plan's coverage flags in the CMS Benefits and Cost Sharing PUF, not from a printed Excluded Services section." (converter spec 10.1). All 5 list Acupuncture, Bariatric surgery, Infertility treatment, Routine eye exam and the 3 adult dental classes (Routine dental services, Basic dental care and Major dental care, adult). Hearing aids is listed for AvMed, Florida Blue and UHC Bronze, Routine foot care for all but Florida Blue, Nutritional counseling for UHC Gold, and Pediatric dental checkup for Florida Blue. The `Not covered` cost entries of the placed benefits are unchanged. The 3 adult dental benefits have no SBC benefit category code, so they are also among the benefits outside the SBC codes (25, was 22).

## Validation

Louisiana and Texas first run on 2026-10-05; Florida Blue run on 2026-10-05 after the converter gained second in-network tiers. All 5 run on 2026-10-09, after the 2 Florida plans were added and Hearing Aids, Hearing Exam, Routine Eye Exam (Adult), Routine Foot Care, Other Practitioner Office Visit (Nurse, Physician Assistant) and Rehabilitative Occupational and Rehabilitative Physical Therapy gained canonical keys; the error and warning counts of the first 3 did not change. The counts above and below are from the 2026-10-09 run. Run again on 2026-10-11, after Mental Health Office Visit, Eye Glasses for Adult, Eye Glasses for Adults and Fitness Benefit - Adult gained canonical keys: none of the 5 plans has those rows, the 5 BPS documents and Bundles are byte-identical, and the validator gave the same counts (0 errors; 31, 4, 30, 12 and 14 warnings for AvMed, Louisiana, Florida Blue, UHC Bronze and UHC Gold). Run twice on 2026-10-13. Before the change, on the Bundles as committed: 0 errors; 31, 4, 30, 12 and 14 warnings; 141, 140, 145, 117 and 118 information messages (AvMed, Louisiana, Florida Blue, UHC Bronze, UHC Gold). After Routine Dental Services (Adult), Basic Dental Care - Adult and Major Dental Care - Adult gained canonical keys (each BPS document 52 benefits, was 49) and the Bundles were rewritten with `--excluded-services`: 0 errors; the same 31, 4, 30, 12 and 14 warnings; 144, 143, 148, 120 and 121 information messages. The counts in the table above and the information counts below are from the run after the change. All from the repository root, exactly as [`../fhir/VALIDATION.md`](../fhir/VALIDATION.md) describes:

```
java -Dfile.encoding=UTF-8 -jar validator_cli.jar -version 4.0.1 \
  -ig hl7.fhir.us.insurance-card#2.0.0-ballot \
  -ig fhir/definitions \
  examples/fhir-puf/*.json
```

| Item | Value |
|---|---|
| Validator | `validator_cli.jar` 7.0.0 (Git# 37795f3f571f, built 2026-10-06) for the 2026-10-09 and 2026-10-13 runs; 6.10.4 (Git# 1b90fb13f77b, built 2026-09-04) for the 2026-10-05 runs |
| Java | OpenJDK 17.0.19 |
| Packages | `hl7.fhir.us.insurance-card#2.0.0-ballot` (42 resources), `fhir/definitions` (9 resources), as logged by 6.10.4 |
| Terminology server | `https://tx.fhir.org` |

Before conversion, each BPS document passed `node scripts/validate.js --schema schema/v1.1.0/benefit-plan.schema.json` and, unchanged, `--schema schema/v1.2.0/benefit-plan.schema.json`.

**Tier 2 qualifiers (54 warnings: Florida Blue 27, AvMed 27).** "No code provided, and a code should be provided from the value set 'Cost Tier Value Set'", once per tier 2 `cost[]` entry. The Cost Tier value set has `value-choice`, `standard` and `virtual` and no code for a second tier; the binding is extensible, so the qualifier is text only, as for the Humana site-of-service tiers in `examples/fhir/VALIDATION.md`.

**Text-only `BenefitLimitation` codings (37 warnings).** "No code provided, and a code should be provided from the value set 'Limit Type Value Set'" or "'Limit Period Value Set'". The CARIN limit type codes are `visits`, `days` and `dollars`, and the converter codes a limit period only for plan year, calendar year, benefit period and lifetime; it writes `per_year` as text because the BPS value does not say plan year or calendar year (converter spec 6.6). The public file's `LimitUnit` gives these values:

| File | Text-only value | Warnings |
|---|---|---|
| Florida Blue | limit period `per_year` | 2 |
| Florida Blue | limit type `items` | 1 |
| Louisiana | limit period `per_year` | 2 |
| Louisiana | limit period `per_6_months` | 1 |
| Louisiana | limit type `items` | 1 |
| Texas | limit period `per_year` | 7 |
| Texas | limit period `per_month` | 4 |
| Texas | limit type `exams` | 2 |
| Texas | limit type `items` | 1 |
| UHC Bronze | limit period `per_year` | 6 |
| UHC Bronze | limit period `per_month` | 4 |
| UHC Bronze | limit type `exams` | 1 |
| UHC Bronze | limit type `items` | 1 |
| AvMed | limit period `per_6_months` | 1 |
| AvMed | limit type `exams` | 2 |
| AvMed | limit type `items` | 1 |

**Information messages (676: Florida Blue 148, Louisiana 143, Texas 121, UHC Bronze 120, AvMed 144).** The same message as for the published Bundles: a `bps-*` extension on an element where the profile slices extensions for its own CARIN extensions ("This element does not match any known slice"). Florida Blue, Louisiana and Texas each have 5 more than on 2026-10-05, 1 for each benefit that gained a key and is now listed in a `bps-unmapped-benefit` extension. Each Bundle has 3 more than before 2026-10-13 (661 in all), 1 for each adult dental `bps-unmapped-benefit` extension; the `excluded-services` extension matches the profile's `excludedServices` slice and raises no message.

## Regenerate

```
node scripts/from-marketplace-puf.js --write-golden
node scripts/to-insuranceplan.js --excluded-services examples/blue-cross-and-blue-shield-of-louisiana-blue-max-copay-50-50.puf.json -o examples/fhir-puf/blue-cross-and-blue-shield-of-louisiana-blue-max-copay-50-50.json
node scripts/to-insuranceplan.js --excluded-services examples/unitedhealthcare-uhc-gold-standard.puf.json -o examples/fhir-puf/unitedhealthcare-uhc-gold-standard.json
node scripts/to-insuranceplan.js --excluded-services examples/florida-blue-blueoptions-gold-1505.puf.json -o examples/fhir-puf/florida-blue-blueoptions-gold-1505.json
node scripts/to-insuranceplan.js --excluded-services examples/unitedhealthcare-uhc-bronze-essential.puf.json -o examples/fhir-puf/unitedhealthcare-uhc-bronze-essential.json
node scripts/to-insuranceplan.js --excluded-services examples/avmed-avmed-entrust-gold-125.puf.json -o examples/fhir-puf/avmed-avmed-entrust-gold-125.json
```

The first command needs the public files in `data/puf/<year>/` (importer spec, section 11).
