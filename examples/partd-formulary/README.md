# Part D drug lists

The drug lists of 5 Medicare Part D plans for contract year 2027, in the Benefit Plan Standard 1.2.0 draft 9, from the CMS monthly public use file "Prescription Drug Plan Formulary and Pharmacy Network Information", release `2027_20261008` (posted October 8, 2026). Each plan is also in [`../`](../) as a PBP example; the documents here are those plans with their drug lists added.

- `formularies/<FORMULARY_ID>.json`: a formulary list (`schema/v1.2.0/formulary.schema.json`), written once for every plan that uses it: each drug by RXCUI and NDC, its tier, prior authorization, step therapy, quantity limit and the Medicare Drug Price Negotiation Program flag, each quoting its row of the Basic Drugs Formulary file.
- `plans/<contract-plan-segment>.json`: the plan (`schema/v1.2.0/benefit-plan.schema.json`). `pharmacy.formulary_reference.formulary_items_url` names its list, and `pharmacy.formulary_items` holds only what is the plan's alone: the drugs Part D excludes that the plan covers as a supplemental benefit (`coverage_basis` "supplemental_mandatory").

| Plan | Kind | Formulary | Drugs on the list | Plans on the list | Prior authorization | Step therapy | Quantity limit | The plan's own items |
|---|---|---|---|---|---|---|---|---|
| S5921-383-000, AARP Medicare Rx Preferred from UHC (PDP) | stand-alone drug plan | `00027000`, version 8 | 3,494 | 39 | 1,043 | 50 | 1,547 | 6 excluded drugs |
| S4802-146-000, Wellcare Value Script (PDP) | stand-alone drug plan, 6 tiers | `00027165`, version 7 | 3,260 | 34 | 806 | 19 | 1,309 | none |
| H2406-013-000, AARP Medicare Advantage from UHC FL-0021 (PPO) | Medicare Advantage with drugs | `00027002`, version 8 | 3,560 | 660 | 1,062 | 53 | 1,569 | 6 excluded drugs |
| H1036-068-000, Humana Gold Plus H1036-068 (HMO) | Medicare Advantage with drugs | `00027368`, version 6 | 3,350 | 65 | 890 | 19 | 1,542 | 6 excluded drugs |
| H5533-019-000, UPMC for Life PPO Rx Choice (PPO) | Medicare Advantage with drugs | `00027137`, version 6 | 3,608 | 30 | 1,077 | 49 | 1,461 | none |

Every drug's tier is a tier of the plan's PBP example, and each plan's tiers, networks, stages and benefits are the PBP example's, unchanged. The 2 stand-alone drug plans also carry their monthly premium from the same CMS file (S5921-383 $184.10, S4802-146 $5.30), which no PBP file holds. A drug has no name and a quantity limit has no unit, because the CMS file gives neither ([`../../docs/specs/partd-formulary/stop-0.md`](../../docs/specs/partd-formulary/stop-0.md), gaps F1 and F3).

2 of the plans are checked against the drug list the carrier publishes, 10 drugs each: [`../../docs/specs/partd-formulary/drug-list-checks.md`](../../docs/specs/partd-formulary/drug-list-checks.md). The mapping is [`../../docs/specs/partd-formulary-importer.md`](../../docs/specs/partd-formulary-importer.md).
