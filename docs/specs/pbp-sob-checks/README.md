# Summary of Benefits checks: Medicare Advantage and Part D

Each file in this folder checks one example plan, value by value, against the plan's own 2027 Summary of Benefits as the carrier publishes it. The example is the Benefit Plan Standard document the Medicare Advantage importer writes from the CMS Plan Benefit Package (PBP) files; the Summary of Benefits is the PDF the carrier gives to members. The file name is the plan's contract, plan and segment id.

The five Medicare Advantage plans here and the four Marketplace plans in [`../puf-sbc-checks/`](../puf-sbc-checks/) are the nine plans picked with the CMS Real-Time Benefits workgroup. S5921-383 is a stand-alone Part D drug plan, checked with the Part D sections of the Medicare Advantage importer.

| File | Plan | Carrier document | Example document | Checks | Match | Reading | Difference |
|---|---|---|---|---|---|---|---|
| [H2406-013-000.json](H2406-013-000.json) | AARP Medicare Advantage from UHC FL-0021 (PPO), UnitedHealthcare | 2027 Summary of Benefits, 14 pages | [example](../../../examples/unitedhealthcare-aarp-medicare-advantage-from-uhc-fl-0021.pbp.json) | 83 | 71 | 12 | 0 |
| [H1609-028-000.json](H1609-028-000.json) | Aetna Medicare Select Extra (HMO-POS) | 2027 Summary of Benefits, 14 pages | [example](../../../examples/aetna-medicare-aetna-medicare-select-extra.pbp.json) | 65 | 47 | 16 | 2 |
| [H1036-068-000.json](H1036-068-000.json) | Humana Gold Plus H1036-068 (HMO) | 2027 Summary of Benefits, 24 pages | [example](../../../examples/humana-humana-gold-plus-h1036-068.pbp.json) | 48 | 46 | 2 | 0 |
| [H5425-140-000.json](H5425-140-000.json) | SCAN Costco Medicare Advantage (HMO), San Francisco County | 2027 Summary of Benefits, 20 pages | [example](../../../examples/scan-health-plan-scan-costco-medicare-advantage.pbp.json) | 46 | 42 | 3 | 1 |
| [H5533-019-000.json](H5533-019-000.json) | UPMC for Life PPO Rx Choice (PPO), Allegheny County | 2027 Summary of Benefits, 14 pages | [example](../../../examples/upmc-for-life-upmc-for-life-ppo-rx-choice.pbp.json) | 77 | 67 | 8 | 2 |
| [S5921-383-000.json](S5921-383-000.json) | AARP Medicare Rx Preferred from UHC (PDP) | 2027 Summary of Benefits, 5 pages | [example](../../../examples/unitedhealthcare-aarp-medicare-rx-preferred-from-uhc.pbp.json) | 43 | 40 | 3 | 0 |

## What a check holds

Every entry in `checks` names the item, the page of the Summary of Benefits it is printed on, the text as printed (`printed`), the value the example document should hold (`expected`) and where it holds it (`path`, a JSON pointer). The `document` block records where the PDF came from, the date it was retrieved, its SHA-256 and its page count, so anyone can fetch the same document and compare.

## Running a check

```
node scripts/pbp-sob-check.js <example document> <check file>
```

For example:

```
node scripts/pbp-sob-check.js examples/aetna-medicare-aetna-medicare-select-extra.pbp.json docs/specs/pbp-sob-checks/H1609-028-000.json
```

The script prints one line per check and a total, and exits 1 when any check is a DIFFERENCE. The counts in the table above are what it prints today; `scripts/from-pbp.test.js` pins them.

## What the three results mean

- **MATCH**: the example document holds the value the Summary of Benefits prints.
- **READING**: the same answer in a different shape, for example a day range the CMS file ends at 90 where the document prints "90+". The check's note says how the two read the same.
- **DIFFERENCE**: the two do not agree. The note says which kind: the CMS file and the carrier document say different things (the importer follows the CMS file, so these are recorded, not changed), or the importer does not read the value yet. Most differences here are a phone number or a web address.

The importer's rules for what it reads are in [`../pbp-importer.md`](../pbp-importer.md); section 13 describes these checks.

## 10 UnitedHealthcare and AARP plans, contract year 2027 (2026-11-11)

5 UnitedHealthcare Medicare Advantage plans in Florida and 5 AARP stand-alone drug plans in Florida, Texas and California, each checked against its 2027 Summary of Benefits. The document checked is the Medicare Advantage importer's document for the plan with its Part D drug list and premium parts added (`node scripts/from-partd-formulary.js --release 2027_20261008 --plan <plan>`); it is not committed, because a plan's drug list makes it 2 MB. H2406-013 and S5921-383 are checked with their October files above; the other 8 files were written on 2026-11-11 from each Summary of Benefits, item by item, with the pointers and shapes of the October files.

| File | Plan | Carrier document | Checks | Match | Reading | Difference |
|---|---|---|---|---|---|---|
| [H2406-013-000.json](H2406-013-000.json) | AARP Medicare Advantage from UHC FL-0021 (PPO) | 2027 Summary of Benefits, 14 pages | 83 | 71 | 12 | 0 |
| [H1045-026-000.json](H1045-026-000.json) | AARP Medicare Advantage from UHC FL-0005 (HMO-POS) | 2027 Summary of Benefits, 10 pages | 51 | 47 | 4 | 0 |
| [H1045-001-000.json](H1045-001-000.json) | UHC Preferred Medicare Advantage FL-0001 (HMO) | 2027 Summary of Benefits, 10 pages | 52 | 49 | 3 | 0 |
| [H5420-001-000.json](H5420-001-000.json) | UHC MedicareMax Medicare Advantage FL-0028 (HMO) | 2027 Summary of Benefits, 10 pages | 56 | 52 | 4 | 0 |
| [H1045-059-000.json](H1045-059-000.json) | AARP Medicare Advantage CareFlex from UHC FL-34 (HMO-POS) | 2027 Summary of Benefits, 11 pages | 56 | 51 | 4 | 1 |
| [S5921-383-000.json](S5921-383-000.json) | AARP Medicare Rx Preferred from UHC (PDP), Florida | 2027 Summary of Benefits, 5 pages | 43 | 41 | 2 | 0 |
| [S5921-356-000.json](S5921-356-000.json) | AARP Medicare Rx Saver from UHC (PDP), Florida | 2027 Summary of Benefits, 5 pages | 28 | 28 | 0 | 0 |
| [S5921-403-000.json](S5921-403-000.json) | AARP Medicare Rx Preferred from UHC (PDP), Texas | 2027 Summary of Benefits, 5 pages | 28 | 28 | 0 | 0 |
| [S5921-367-000.json](S5921-367-000.json) | AARP Medicare Rx Saver from UHC (PDP), Texas | 2027 Summary of Benefits, 5 pages | 28 | 28 | 0 | 0 |
| [S5921-413-000.json](S5921-413-000.json) | AARP Medicare Rx Preferred from UHC (PDP), California | 2027 Summary of Benefits, 5 pages | 28 | 28 | 0 | 0 |

453 checks: 423 MATCH, 29 READING, 1 DIFFERENCE. The READINGs are the October ones: a copay the PBP file states as a range from $0 where the Summary of Benefits prints the maximum (specialists, urgent care, mental health), an observation copay the file gives per day, and the October file's own. The 1 DIFFERENCE is an importer gap: H1045-059's CareFlex credit, $450 every 3 months toward the member's cost sharing, which `pbp_Section_D.txt` holds as Reductions in Cost Sharing (`pbp_d_rics_*`) and the importer does not read yet. Every premium matches: a stand-alone plan's from the Part D formulary file, and each Medicare Advantage plan's $0; the 4 new Medicare Advantage files check `drug_amount` $0 too, and H2406-013's October file reads `amount` only. S5921-383 has 41 MATCH here and 40 in October: its premium, which the PBP files do not hold, now comes from the formulary file.
