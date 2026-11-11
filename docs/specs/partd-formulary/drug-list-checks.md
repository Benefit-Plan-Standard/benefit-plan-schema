# Drug list checks: 2 examples against the plan's own published drug list

**Date:** November 11, 2026. **What is checked:** 10 drugs of each of 2 examples in [`../../../examples/partd-formulary/`](../../../examples/partd-formulary/), each against the drug list (formulary) the carrier publishes for the plan. For each drug: the tier, prior authorization, step therapy, the quantity limit, and, for an excluded drug, that the list prints it among the drugs Part D does not cover. **Result:** 19 of 20 agree (15 MATCH, 4 READING); 1 DIFFERENCE, a quantity limit amount where the CMS file and the carrier's list say different things.

## How the 10 drugs were picked

By a fixed rule over the example, in this order, so that the checked drugs are not hand-picked: the first item in the list's order with step therapy; the first with the negotiation flag; the first of the plan's own items (an excluded drug); the first with a 999-day quantity limit; the first prior authorization item without a quantity limit on Tier 3 and on Tier 4; then the first item with a quantity limit on each tier from 1 to 5; each time skipping a drug already picked, leaving out a step the formulary has no drug for, and stopping at 10. A drug is named by its RxNorm name, read from the NLM RxNav service (`https://rxnav.nlm.nih.gov/REST/rxcui/<RXCUI>/properties.json`, November 11, 2026); the CMS file names no drug. The drug was then found in the carrier's list by name, strength and form.

**MATCH:** the list prints what the example holds. **READING:** the same answer in another shape (the note says how). **DIFFERENCE:** the 2 disagree; the example follows the CMS file, so a difference is recorded, not changed.

## S5921-383-000, AARP Medicare Rx Preferred from UHC (PDP)

- **Example:** [`plans/S5921-383-000.json`](../../../examples/partd-formulary/plans/S5921-383-000.json) with [`formularies/00027000.json`](../../../examples/partd-formulary/formularies/00027000.json): formulary 00027000, version 8, from the CMS file `2027_20261008` (posted October 8, 2026).
- **Carrier document:** "Complete Drug List (Formulary) 2027, AARP Medicare Rx Preferred from UHC (PDP)", Formulary ID Number 00027000, "Last updated October 15, 2026", 135 pages. Source: https://www.uhc.com/medicare/alphadog/PDEX27PD0427185_001, the "Comprehensive Formulary (PDF) (Updated 10/14/2026)" link of https://www.uhc.com/medicare/health-plans/details.html/33401/099/S5921383000/2027, downloaded November 11, 2026, SHA-256 `b2d9da4aa6e716b850e8a8eb3d23f44f61acffaa5ce2e2b02418360f4bbc680e`. The host's `robots.txt` does not disallow `/medicare/`.
- **Read with:** `pdftotext -raw` (the `-layout` reading splits the drug table's columns); pages counted in the PDF. The list prints the tier and "QL" by drug (pages 30 to 94), the quantity limit amounts in a separate chart (pages 95 to 131), and the drugs Part D does not cover under "Additional covered drugs" (page 132).

| # | RXCUI | RxNorm name | Picked for | The example | The list prints | Result |
|---|---|---|---|---|---|---|
| 1 | 313189 | tacrolimus 0.0003 MG/MG Topical Ointment | step therapy | T4, step therapy | "Tacrolimus (External Ointment) G 4 ST; DL" (page 70) | MATCH |
| 2 | 1364441 | apixaban 2.5 MG Oral Tablet [Eliquis] | negotiation flag | T3, quantity limit 60 per 30 days, `negotiation_selected_drug` true | "Eliquis (Oral Tablet) B 3 QL" (page 60); "Maximum of 2 tablets per day" (page 104) | READING: 2 a day is 60 in 30 days. The list has no column for the negotiation flag. |
| 3 | 309594 | vitamin B12 1 MG/ML Injectable Solution | excluded drug | T2, `coverage_basis` "supplemental_mandatory", no limit | "Cyanocobalamin (1000mcg/ml vial) 2", under "Additional covered drugs", which "are not normally covered in a Medicare Advantage plan with prescription drug coverage", as this stand-alone plan's list words it (page 132) | MATCH |
| 4 | 836636 | hepatitis A vaccine 50 UNT/ML, 0.5 ML Prefilled Syringe [Vaqta] | 999-day limit | T3, quantity limit 1, `period` null; the row: `00027000\|8\|2027\|836636\|00006409502\|3\|Y\|1\|999\|N\|N\|N` | "Vaqta (Intramuscular Suspension Prefilled Syringe) B 3 QL" (page 87); "Vaqta (25UNIT/0.5ML Intramuscular Suspension Prefilled Syringe) B Maximum of 2 vaccines per lifetime" (page 128) | DIFFERENCE, the CMS file and the carrier's list: the file states 1 per 999 days and the list 2 per lifetime. The tier and the limit itself agree, and the list reads the file's 999 as "per lifetime", which is what decision D6 left unstated. |
| 5 | 2047882 | testosterone cypionate 200 MG/ML, 1 ML Injection | prior authorization, Tier 3 | T3, prior authorization | "Testosterone Cypionate (Intramuscular Solution) G 3 PA" (page 77) | MATCH |
| 6 | 762833 | somatropin 0.8 MG/ML, 0.25 ML Prefilled Syringe [Genotropin] | prior authorization, Tier 4 | T4, prior authorization | "Genotropin MiniQuick (0.2MG Subcutaneous Prefilled Syringe) B 4 PA; DL" (page 77); 0.25 ML at 0.8 MG/ML is 0.2 MG | MATCH |
| 7 | 310792 | hydrochlorothiazide 12.5 MG / irbesartan 150 MG Oral Tablet | quantity limit, Tier 1 | T1, 30 per 30 days | "Irbesartan-Hydrochlorothiazide (Oral Tablet) G 1 QL" (page 64); "Maximum of 1 tablet per day" (page 110) | READING: 1 a day is 30 in 30 days. |
| 8 | 106346 | mupirocin 0.02 MG/MG Topical Ointment | quantity limit, Tier 2 | T2, 110 per 30 days, no unit | "Mupirocin (External Ointment) G 2 QL" (page 71); "Maximum of 110 grams per 30 days" (page 115) | MATCH. The list gives the unit the file does not (gap F3). |
| 9 | 1551300 | dulaglutide 1.5 MG/ML, 0.5 ML Auto-Injector [Trulicity] | quantity limit, Tier 3 | T3, prior authorization, 2 per 28 days | "Trulicity (Subcutaneous Solution Auto-Injector) B 3 PA; QL" (page 58); "Maximum of 4 pens (2 ml) per 28 days" (page 127) | READING: the file's 2 is the "2 ml"; the list counts the same limit as 4 pens. |
| 10 | 2170613 | galcanezumab-gnlm 100 MG/ML, 1 ML Prefilled Syringe [Emgality] | quantity limit, Tier 4 | T4, prior authorization, 3 per 28 days | "Emgality (300MG Dose) (100MG/ML Subcutaneous Solution Prefilled Syringe) B 4 PA; DL; QL" (page 43); "Maximum of 3 syringes or pens (3 ml) per 28 days" (page 104) | MATCH |

9 agree (6 MATCH, 3 READING), 1 DIFFERENCE. The rule reached 10 drugs before Tier 5.

## H1036-068-000, Humana Gold Plus H1036-068 (HMO)

- **Example:** [`plans/H1036-068-000.json`](../../../examples/partd-formulary/plans/H1036-068-000.json) with [`formularies/00027368.json`](../../../examples/partd-formulary/formularies/00027368.json): formulary 00027368, version 6, from the CMS file `2027_20261008`.
- **Carrier document:** the 2027 Humana Drug List whose cover names "Humana Gold Plus (HMO)" among its plans and "Formulary 27368", "updated on 11/02/2026", document `Y0040_PDG27_FINAL_28C_C`, `20270028PDG2736827C_v8`, 113 pages. Source: https://assets.humana.com/is/content/humana/20270028PDG2736827Cpdf, downloaded November 11, 2026, SHA-256 `66755338f41dd0c7efbd2e18a002612d8b348730af8c072219d9aa408f8a000a`. 9 guides for formulary 27368 are published under that name pattern, for different groups of plans; this one is the 1 whose cover names Humana Gold Plus (HMO). The host has no `robots.txt` (404).
- **Read with:** `pdftotext -raw` (the `-layout` reading shifts the requirements column against the rows); pages counted in the PDF. The list prints tier and requirements, quantity limits included, on 1 line per drug; "Humana Coverage of Additional Prescription Drugs" lists the drugs Part D does not cover (page 92).
- **Dates:** the CMS file has the formulary at version 6 (posted October 8, 2026); the guide was updated November 2, 2026. The 10 drugs agree across that gap.

| # | RXCUI | RxNorm name | Picked for | The example | The list prints | Result |
|---|---|---|---|---|---|---|
| 1 | 745791 | levalbuterol 0.045 MG/ACTUAT, 200 ACTUAT Metered Dose Inhaler | step therapy | T4, step therapy, 30 per 30 days | "levalbuterol tartrate 45 mcg/actuation HFA AEROSOL INHALER MO 4 ST,QL(30 per 30 days)" (page 89) | MATCH |
| 2 | 1364441 | apixaban 2.5 MG Oral Tablet [Eliquis] | negotiation flag | T3, 60 per 30 days, `negotiation_selected_drug` true | "ELIQUIS 2.5 MG TABLET MO 3 QL(60 per 30 days)" (page 48) | MATCH. The list has no column for the negotiation flag. |
| 3 | 309594 | vitamin B12 1 MG/ML Injectable Solution | excluded drug | T1, `coverage_basis` "supplemental_mandatory" | "cyanocobalamin (vitamin b-12) 1,000 mcg/ml SOLUTION 1", under "Humana Coverage of Additional Prescription Drugs": "These drugs are not normally covered under Medicare Part D" (page 92) | MATCH |
| 4 | 205301 | prednisone 5 MG/ML Oral Solution | prior authorization, Tier 3 | T3, prior authorization | "prednisone intensol 5 mg/ml CONCENTRATE MO 3 BvsD" (page 68) | READING: the list's "BvsD" (page 6: information "may need to be submitted to Humana ... so a determination can be made" between Part B and Part D) is the prior authorization the CMS file flags. The UHC list prints the same kind of rule as "B/D,PA". |
| 5 | 208513 | estrogens, conjugated 0.3 MG Oral Tablet [Premarin] | prior authorization, Tier 4 | T4, prior authorization | "PREMARIN 0.3 MG, 0.45 MG, 0.625 MG, 0.9 MG, 1.25 MG TABLET MO 4 PA" (page 73) | MATCH |
| 6 | 310792 | hydrochlorothiazide 12.5 MG / irbesartan 150 MG Oral Tablet | quantity limit, Tier 1 | T1, 60 per 30 days | "irbesartan-hydrochlorothiazide 150-12.5 mg TABLET MO 1 QL(60 per 30 days)" (page 52) | MATCH |
| 7 | 351264 | buprenorphine 2 MG Sublingual Tablet | quantity limit, Tier 2 | T2, 120 per 30 days | "buprenorphine hcl 2 mg, 8 mg SUBLINGUAL TABLET MO 2 QL(120 per 30 days)" (page 13) | MATCH |
| 8 | 1551300 | dulaglutide 1.5 MG/ML, 0.5 ML Auto-Injector [Trulicity] | quantity limit, Tier 3 | T3, prior authorization, 2 per 28 days | "TRULICITY 0.75 MG/0.5 ML, 1.5 MG/0.5 ML, 3 MG/0.5 ML, 4.5 MG/0.5 ML PEN INJECTOR MO 3 PA,QL(2 per 28 days)" (page 47) | MATCH |
| 9 | 2058877 | galcanezumab-gnlm 120 MG/ML, 1 ML Auto-Injector [Emgality] | quantity limit, Tier 4 | T4, prior authorization, 2 per 30 days | "EMGALITY PEN 120 MG/ML PEN INJECTOR MO 4 PA,QL(2 per 30 days)" (page 27) | MATCH |
| 10 | 2725923 | imlunestrant 200 MG Oral Tablet [Inluriyo] | quantity limit, Tier 5 | T5, prior authorization, 84 per 28 days | "INLURIYO 200 MG TABLET DL 5 PA,QL(84 per 28 days)" (page 31) | MATCH |

10 agree (9 MATCH, 1 READING). Formulary 00027368 has no 999-day quantity limit, so the rule picks no drug for that step and reaches Tier 5.

## What the 2 checks show

- Every tier, prior authorization and step therapy flag of the 20 drugs is the one the carrier prints (1 prior authorization as the Part B or Part D rule), on 2 formularies, a stand-alone drug plan and a Medicare Advantage plan, and both lists of drugs Part D does not cover are where the importer puts them (`coverage_basis` "supplemental_mandatory").
- A quantity limit's amount is in the unit the carrier prints beside it (tablets, grams, mL), which the file does not name: the same Trulicity limit is "2" in the file, "4 pens (2 ml)" at UHC and "2" at Humana. So leaving `units` out (gap F3) is right: a reader cannot tell a pen from a mL from the file.
- The 1 difference is between the CMS file and the carrier's list, not in the importer: 1 against 2 vaccines. The same line reads the file's 999 days as "per lifetime".
