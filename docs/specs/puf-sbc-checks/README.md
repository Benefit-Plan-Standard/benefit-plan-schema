# SBC checks: Marketplace

Each file in this folder checks one example plan, value by value, against the plan's own Summary of Benefits and Coverage (SBC) for plan year 2026 as the carrier publishes it. The example is the Benefit Plan Standard document the Marketplace importer writes from the CMS Marketplace public use files (Plan Attributes, Benefits and Cost Sharing, Network); the SBC is the PDF the plan's row in the Plan Attributes file links to. The file name is the plan's HIOS plan id with its variant.

These four plans and the five Medicare Advantage plans in [`../pbp-sob-checks/`](../pbp-sob-checks/) are the nine plans picked with the CMS Real-Time Benefits workgroup.

| File | Plan | Carrier document | Example document | Checks | Match | Reading | Difference |
|---|---|---|---|---|---|---|---|
| [68398FL0030058-01.json](68398FL0030058-01.json) | UHC Bronze Essential (HMO), Florida | 2026 SBC, 12 pages | [example](../../../examples/unitedhealthcare-uhc-bronze-essential.puf.json) | 50 | 39 | 11 | 0 |
| [97176LA0340010-01.json](97176LA0340010-01.json) | Blue Cross and Blue Shield of Louisiana Blue Max Copay 50/50 | 2026 SBC, 10 pages | [example](../../../examples/blue-cross-and-blue-shield-of-louisiana-blue-max-copay-50-50.puf.json) | 69 | 63 | 3 | 3 |
| [40220TX0080024-01.json](40220TX0080024-01.json) | UHC Gold Standard (HMO), Texas | 2026 SBC, 12 pages | [example](../../../examples/unitedhealthcare-uhc-gold-standard.puf.json) | 57 | 45 | 12 | 0 |
| [19898FL0340001-01.json](19898FL0340001-01.json) | AvMed Entrust Gold 125 (HMO), Florida | 2026 SBC, 7 pages | [example](../../../examples/avmed-avmed-entrust-gold-125.puf.json) | 64 | 45 | 17 | 2 |

## What a check holds

Every entry in `checks` names the item, the page of the SBC it is printed on, the text as printed (`printed`), the value the example document should hold (`expected`) and where it holds it (`path`, a JSON pointer). The `document` block records the SBC's address and where the address came from, the date it was retrieved, its SHA-256 and its page count, so anyone can fetch the same document and compare.

## Running a check

The Medicare Advantage check script runs these files unchanged:

```
node scripts/pbp-sob-check.js <example document> <check file>
```

For example:

```
node scripts/pbp-sob-check.js examples/unitedhealthcare-uhc-bronze-essential.puf.json docs/specs/puf-sbc-checks/68398FL0030058-01.json
```

The script prints one line per check and a total, and exits 1 when any check is a DIFFERENCE. The counts in the table above are what it prints today; `scripts/from-marketplace-puf.test.js` pins them.

## What the three results mean

- **MATCH**: the example document holds the value the SBC prints.
- **READING**: the same answer in a different shape. The most common one here: the SBC prints "Not Covered" out of network, and the CMS file files the same benefit as covered at 100% coinsurance, which leaves the member paying the whole cost either way. The check's note says how the two read the same.
- **DIFFERENCE**: the two do not agree, and the note says why. All five here are places where the CMS file and the carrier's SBC say different things; the importer follows the CMS file, so they are recorded, not changed. Two are the provider directory address. The other three are coverage values: Louisiana's hearing aids and chiropractic care, covered in the CMS file and listed as excluded in the SBC, and AvMed's lab cost, $10 in the CMS file and $75 in the SBC.

The importer's rules for what it reads are in [`../marketplace-puf-importer.md`](../marketplace-puf-importer.md).
