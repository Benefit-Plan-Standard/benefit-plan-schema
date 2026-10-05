# FHIR Bundles from the public-file importer

These files prove the chain from the CMS Marketplace public use files to FHIR: `scripts/from-marketplace-puf.js` writes a Benefit Plan Standard v1.1.0 document from the public files, and the existing converter, `scripts/to-insuranceplan.js`, reads that document unchanged and writes the Bundle. They are not golden files, they are not published, and they are not in `fhir/index.json`. The 10 published Bundles are in [`../fhir/`](../fhir/).

Importer spec: [`../../docs/specs/marketplace-puf-importer.md`](../../docs/specs/marketplace-puf-importer.md). Converter spec: [`../../docs/specs/insuranceplan-converter.md`](../../docs/specs/insuranceplan-converter.md).

## Files

| BPS document (`examples/`) | Plan | Bundle | Benefits placed | Outside the SBC codes | Errors | Warnings |
|---|---|---|---|---|---|---|
| `blue-cross-and-blue-shield-of-louisiana-blue-max-copay-50-50.puf.json` | Blue Cross and Blue Shield of Louisiana, Blue Max Copay (PCP) 50/50 $3300 with 2 $0 PCP Virtual Visits, PY2026, Silver PPO, 97176LA0340010-01 | `blue-cross-and-blue-shield-of-louisiana-blue-max-copay-50-50.json` | 27 | 17 | 0 | 4 |
| `unitedhealthcare-uhc-gold-standard.puf.json` | UnitedHealthcare, UHC Gold Standard, PY2026, Texas, Gold HMO, 40220TX0080024-01 | `unitedhealthcare-uhc-gold-standard.json` | 27 | 17 | 0 | 14 |
| `florida-blue-blueoptions-gold-1505.puf.json` | Florida Blue, BlueOptions Gold 1505, PY2023, Gold EPO, 16842FL0070120-01 | none | | | | |

**No Bundle for Florida Blue 1505.** The plan has in-network tier 2 values in the public file, so the BPS document carries 3 network tiers: `IN`, `IN2` and `OUT`. The converter stops with `network tier "IN2" is neither IN nor OUT; the converter does not guess its applicability`, as its spec requires (section 6.2). The BPS document itself is schema-valid.

Neither Bundle needed a `Not stated in the BPS document` placeholder: every placed benefit has both an in-network and an out-of-network row.

## Validation

Run on 2026-10-05, from the repository root, exactly as [`../fhir/VALIDATION.md`](../fhir/VALIDATION.md) describes:

```
java -jar validator_cli.jar -version 4.0.1 \
  -ig hl7.fhir.us.insurance-card#2.0.0-ballot \
  -ig fhir/definitions \
  examples/fhir-puf/*.json
```

| Item | Value |
|---|---|
| Validator | `validator_cli.jar` 6.10.4 (Git# 1b90fb13f77b, built 2026-09-04) |
| Java | OpenJDK 17.0.19 |
| Packages | `hl7.fhir.us.insurance-card#2.0.0-ballot` (42 resources), `fhir/definitions` (9 resources) |
| Terminology server | `https://tx.fhir.org` |

Before conversion, each BPS document passed `node scripts/validate.js --schema schema/v1.1.0/benefit-plan.schema.json`.

**Warnings (18), all text-only `BenefitLimitation` codings.** "No code provided, and a code should be provided from the value set 'Limit Type Value Set'" or "'Limit Period Value Set'". The CARIN limit type codes are `visits`, `days` and `dollars`, and the converter codes a limit period only for plan year, calendar year, benefit period and lifetime; it writes `per_year` as text because the BPS value does not say plan year or calendar year (converter spec 6.5). The public file's `LimitUnit` gives these values:

| File | Text-only value | Warnings |
|---|---|---|
| Louisiana | limit period `per_year` | 2 |
| Louisiana | limit period `per_6_months` | 1 |
| Louisiana | limit type `items` | 1 |
| Texas | limit period `per_year` | 7 |
| Texas | limit period `per_month` | 4 |
| Texas | limit type `exams` | 2 |
| Texas | limit type `items` | 1 |

**Information messages (248: Louisiana 135, Texas 113).** The same message as for the published Bundles: a `bps-*` extension on an element where the profile slices extensions for its own CARIN extensions ("This element does not match any known slice").

## Regenerate

```
node scripts/from-marketplace-puf.js --write-golden
node scripts/to-insuranceplan.js examples/blue-cross-and-blue-shield-of-louisiana-blue-max-copay-50-50.puf.json -o examples/fhir-puf/blue-cross-and-blue-shield-of-louisiana-blue-max-copay-50-50.json
node scripts/to-insuranceplan.js examples/unitedhealthcare-uhc-gold-standard.puf.json -o examples/fhir-puf/unitedhealthcare-uhc-gold-standard.json
```

The first command needs the public files in `data/puf/<year>/` (importer spec, section 11).
