# Medicare Advantage and the Benefit Plan Standard

**Status:** Working notes, with 2 worked examples.
**Written:** September 16, 2026
**Examples:** [`examples/scan_example.json`](../examples/scan_example.json) (SCAN Classic, 71 benefits) and [`examples/humana_example.json`](../examples/humana_example.json) (Humana Gold Plus H1036-025, 72 benefits)
**Source documents:** [`examples/sources/scan_classic_prime_hmo_los_angeles_2026_summary_of_benefits.pdf`](../examples/sources/scan_classic_prime_hmo_los_angeles_2026_summary_of_benefits.pdf) (20 pages) and [`examples/sources/humana_gold_plus_h1036_025_hmo_2026_summary_of_benefits.pdf`](../examples/sources/humana_gold_plus_h1036_025_hmo_2026_summary_of_benefits.pdf) (24 pages)

These notes answer one question. The Benefit Plan Standard took its shape from the ACA Summary of Benefits and Coverage, so how does it carry to Medicare Advantage?

To find out, I read 2 of the 2026 CMS Summary of Benefits documents end to end and wrote down how they differ from the SBC. Then I decided, field by field, what fits, and built one example from each by hand. Where something didn't fit, I recorded a gap and proposed a field rather than bending an existing field to hold it.

Two naming rules hold throughout. "SBC" always means the ACA Summary of Benefits and Coverage. "Summary of Benefits" always means the CMS document for Medicare Advantage. They're different documents.

Medicaid isn't covered here. I haven't worked through Medicaid plan documents yet, and I'd rather say that than guess.

---

## 1. Two documents with similar names

### The regulatory shape

The SBC is a standardized federal template (Public Health Service Act section 2715, 45 CFR 147.200).

- Every plan fills in the same rows in the same order.
- It opens with questions and answers ("What is the overall deductible?") and prices services in in-network and out-of-network columns.
- It includes a list of excluded services, coverage examples and a glossary reference.
- It leaves the premium out on purpose. The Kaiser and Aetna SBCs in `examples/sources/` both say information about the premium "will be provided separately."

The Summary of Benefits is different. Under 42 CFR 422.2267(e)(5) it's a **model** marketing material, not a standardized one. The rule fixes the content and the order but not the layout, so each plan designs its own. The required order:

1. Monthly premium
2. Deductible and out-of-pocket limits
3. Inpatient and outpatient hospital
4. Ambulatory surgical center
5. Doctor visits
6. Preventive care
7. Emergency and urgently needed services
8. Diagnostic services
9. Hearing, dental and vision
10. Mental health
11. Then the prescription drug stages

The two documents here show how far the layouts can differ.

- **SCAN** prints one table for **2 plans**, SCAN Classic (HMO) and SCAN Prime (HMO), in side-by-side columns with a "What you should know" column on the right. Page 2 is blank, and the pages carry no page numbers.
- **Humana** prints one plan, Humana Gold Plus H1036-025 (HMO), as a label on the left and bullets on the right, one bullet per site of care. Its printed page numbers match the PDF.

So a Summary of Benefits parser can't rely on row positions the way an SBC parser can. The labels follow the CMS order closely, but the table shapes don't.

### Plan identity

Humana prints the contract and plan number in the title (H1036-025) and in every page header (H1036025000).

SCAN prints no contract and plan number for either plan.

- The only identifier on the document is `26C-SBH5425006065`, at the bottom of page 1. It appears to carry 2 plan numbers, 006 and 065, and the document never says which plan each belongs to.
- Public CMS-derived plan listings show SCAN Classic (HMO) in Los Angeles County as H5425-006-0 and SCAN Prime (HMO) as H5425-065-0. The premium, out-of-pocket maximum, Part D deductible and emergency copay in those listings match the 2 columns.
- That mapping comes from outside the PDF, so the SCAN example doesn't depend on it.

### Premium

The Summary of Benefits leads with the premium: $0 for SCAN Classic and $20 for SCAN Prime (SCAN page 3), $0 for Humana (page 4). Humana also prints a Part B premium reduction "by up to $3." The SBC never carries a premium, so the standard has never needed a field for one.

### Deductibles

Neither plan has a medical deductible. SCAN says "No deductible for medical" (page 3), and Humana says "This plan does not have a deductible" (page 4).

Both have a separate Part D deductible that applies only to some drug tiers.

- **SCAN Classic:** "You pay the full cost of your Tier 3 through Tier 5 drugs until you have paid $250" (page 8).
- **Humana:** "$0 deductible for Tier 1, Tier 2 and Tier 3" and "$615 deductible for Tier 4 and Tier 5" (page 4, repeated on page 10).

An SBC can mention a pharmacy deductible under "other deductibles." The Medicare version is different: a medical deductible of $0 next to a drug deductible scoped by tier.

### Out-of-pocket maximum

Medicare Advantage coverage is individual, and neither document has a family amount. SCAN Classic's maximum is $199, and Humana's is $2,000 in-network.

Both maximums are limited to medical services.

- **SCAN** says the maximum "does not include prescription drugs" and defines it as "the most you pay for copays and coinsurance for Medicare-covered medical services for the year" (page 3).
- **Humana** labels its maximum "Medical Maximum out-of-pocket responsibility" (page 4).

Part D runs its own threshold. Both plans print $2,100, after which the member pays $0 for covered drugs (SCAN page 9, Humana page 11).

Humana adds one sentence, printed inside its vision row on page 8: "Copayments, coinsurances, and deductibles paid for supplemental benefits do not count toward your maximum out-of-pocket amount." The wording covers all supplemental benefits, but it appears only in that row.

### Where the cost shares live

The SBCs in this repo don't use these 3 patterns.

**Day ranges.** Humana's copay changes with the day of the stay.

- Inpatient: "$50 copay per day for days 1-6" and "$0 copay per day for days 7-90" (page 4)
- Skilled nursing: "$0 copay per day for days 1-20" and "$160 copay per day for days 21-100" (page 9)

**Site of service.** Humana prices most outpatient services by where they happen. Advanced imaging, for example (page 6):

- Freestanding radiological facility: $50
- Outpatient hospital: $75
- PCP's office: $50
- Specialist's office: $50

X-rays, lab work, diagnostic tests, sleep studies, nuclear medicine, radiation therapy, therapy visits, Part B drugs and medical equipment are priced the same way. Across the medical rows that comes to 17 site labels. SCAN Classic prints one amount per row.

**Units other than the visit.**

- Ambulance: "per one-way trip" (SCAN page 7) and "per date of service" (Humana page 9)
- Hearing aids: "per aid" (SCAN page 4) and "for each" aid (Humana page 7)

### Two kinds of drug benefit

The Summary of Benefits separates Medicare Part B drugs from Part D drugs, and they work differently.

**Part B drugs are a medical benefit.**

- SCAN prints "$0-20% of the Medicare-approved amount for Part B chemotherapy and other Part B drugs." It adds "No more than $35 for a one-month supply" of Part B insulin furnished through durable medical equipment, such as an insulin pump (page 7).
- Humana prints "20% of the cost" by site and $0 for allergy shots. It adds that "Some rebatable Part B drugs may be subject to a lower coinsurance" and caps each insulin product at $35 for a one-month supply (page 9).

**Part D drugs are a grid**, with several dimensions:

- **Tiers:** 5 in each plan.
- **Pharmacy channels:**
  - SCAN has preferred retail, standard retail, preferred mail-order and standard mail-order (page 8).
  - Humana has retail ("Includes all in-network retail pharmacies"), standard mail-order, and preferred mail-order at CenterWell Pharmacy (page 10).
- **Day supplies:** 30-day and 100-day.
- **Coverage stages:** deductible, initial coverage, and catastrophic.
- **Insulin:**
  - SCAN gives insulin its own row on Tier 3.
  - Humana gives it a separate grid in which most cells pair a coinsurance with a cap, such as "25% up to $35" (page 11).
- **Vaccines:**
  - SCAN: "Most adult Part D vaccines" at no cost (page 9).
  - Humana: $0 for adult Part D vaccines recommended by ACIP (page 10).
- **Humana extras:** coverage for erectile dysfunction drugs and prescription vitamins "at Tier 1 cost-share amount," and the Extra Help amounts (page 12).

The SBC has 4 drug rows priced by tier, with retail and sometimes mail-order prices. The Part D grid is several times that size.

### Supplemental benefits

This is the largest block with no SBC counterpart.

Both documents split each benefit area into a Medicare-covered row and a supplemental row.

- SCAN labels the supplemental rows "Non-Medicare-covered (routine)." It names its routine dental option "Dental Plan CAC73" (page 5).
- Humana labels them "Mandatory supplemental ... benefit" and gives each one a code: HER692, DENF33 and VIS848 (pages 7 and 8).

The supplemental rows use shapes the SBC doesn't.

- **Allowances.**
  - Humana dental: "up to $3000 allowance every year" (page 7).
  - SCAN Classic eyewear: "up to $300 for frames, lenses, and lens options or contact lenses every 12 months" (page 6).
  - Over-the-counter items: both plans give $150 a quarter (SCAN page 13, Humana page 14), but the carryover rules differ. SCAN's unused balance carries over to the next quarter but not the next year. Humana's "expires at the end of the quarter."
- **Grade pricing.** SCAN Classic hearing aids cost $450 (Advanced) or $750 (Premium) per aid (page 4). Humana's cost $199, $699 or $1,299 each for Value, Advanced and Premium Technology (page 7).
- **Either/or options.** Humana eyewear is a $300 allowance "or 2 pairs of select eyeglasses per year at no cost" (page 8).
- **Price ranges.** SCAN Classic comprehensive dental is priced as ranges by category, for example "In-network only: $8-$395" for restorative services (page 5).
- **Eligibility conditions.**
  - SCAN in-home care and meals depend on a hospitalization, a hip or knee replacement, help with activities of daily living, or a chronic condition (page 12).
  - Humana's unlimited transportation benefit is for members with chronic kidney disease, end stage renal disease or a cancer diagnosis (page 9).
- **Non-clinical services:** transportation, meals, in-home support, respite care, fitness, a personal emergency response system, and technology support.
- **Optional add-ons with their own premium.** SCAN Classic offers a dental PPO at $55 a month (page 16). It isn't part of the base plan.

### Networks

Both plans are HMOs.

- **Humana** covers out-of-network providers only in emergency or urgent situations (page 2): "Except in emergency or urgent situations, we do not cover services by out-of-network providers."
- **SCAN** may not pay for out-of-network providers (page 17): "If you use the providers that are not in our network, the plan may not pay for these services."

Both cover emergency and urgently needed services worldwide (SCAN page 4, Humana pages 5 and 6), but neither prints an out-of-network amount for them. Both also say you may be able to fill a prescription at an out-of-network pharmacy and pay more (SCAN page 9, Humana page 12).

Inside the network, some providers are priced differently from the rest.

- SCAN has pharmacies with preferred cost-sharing (page 9).
- Humana prices a "Preferred diabetic supplier" at $0 against 20% at a "Diabetic supplier" (page 12).
- SCAN Prime, which isn't modeled here, prices dental out of network at 50% (page 5).

### Limits

The limits use more units and periods than the SBC's visits, days and dollars.

- **Benefit periods.** SCAN defines "benefit period" on page 6 and uses it for 90 inpatient mental health days and 100 skilled nursing days.
- **Lifetime limits.** Humana covers "up to 190 days in a lifetime for inpatient mental health care in a psychiatric hospital" (page 8).
- **Time windows.**
  - SCAN uses "every 12 months" for exams and hearing aids, and "per year" for trips and visits.
  - Humana uses "per year," and says dental and vision are offered on "a calendar year basis" (pages 7 and 8).
- **Other units:** trips, miles per trip, hours, meals, and hearing aids "per ear". Humana's post-discharge meals are "Limited to 4 times per year."
- **Shared limits.**
  - SCAN routine acupuncture and routine chiropractic share "up to 30 visits per year combined" (pages 12 and 13).
  - SCAN's single line, "up to 2 hearing aids every 12 months," sits under a row that prices both grades.

### Authorization and referral

SCAN prints the authorization rule on almost every row, for example "Prior authorization rules apply for specialist visits."

Humana handles it differently. It prints one footer on every medical page, which says the PCP coordinates specialist care through referrals and points to an outside list of items that may need prior authorization (Humana.com/PAL). Apart from a few rows, Humana's Summary of Benefits doesn't say which services need authorization:

- "Certain trips may require prior authorization" (page 9)
- "Authorization rules may apply" (page 14)

### What these two documents don't have

I checked each of these against the text of both PDFs.

- **Coverage examples:** neither document has any.
- **Excluded services list:** neither has one. Both say the summary doesn't list every limitation or exclusion and point to the Evidence of Coverage.
- **Glossary:** neither refers to one.
- **Family amounts:** the word "family" doesn't appear in either.
- **Observation cost share:** Humana says a member placed in observation "pays observation cost-share instead of emergency room cost-share" (page 5), but no observation amount appears anywhere in the Humana document.
- **Plan dates:**
  - Humana prints 2026 and says benefits may change on January 1, 2027, but gives no start or end date.
  - SCAN prints January 1 to December 31, 2026.

---

## 2. The model question

For each construct, the question was whether it fits v1.1.0, needs the v1.2.0 draft fields (`tier_class`, `parent_tier_id`, `provider_set`, `limits[].raw_text`), or doesn't fit. Anything that doesn't fit is a gap in section 3.

| Construct | Fit | How the examples carry it |
|---|---|---|
| Plan name, carrier, HMO, plan year, market | v1.1.0 | `plan_type` "HMO", `market` "medicare_advantage" |
| Contract and plan number | Gap (G1) | `plan_id` is a readable slug, as in the other examples |
| Service area (counties) | Gap (G2) | Quoted in `source_references` only |
| Monthly premium, Part B premium reduction | Gap (G3) | Quoted in `source_references` only |
| No medical deductible | v1.1.0 | `individual_deductible` 0, `applies_to` "medical" |
| Medical out-of-pocket maximum, in-network, individual | v1.1.0 | `individual_oop_max`, `applies_to` "medical"; no family slots |
| Part D deductible scoped to tiers | Partial (G4) | Tier rows carry `applies_to_deductible` true or false, with a note naming the Part D amount. The amount has no accumulator slot |
| Part D $2,100 threshold and catastrophic stage | Gap (G4) | Quoted in `source_references` and in the Part D notes |
| Day-range copays | Partial (G5) | One `cost_shares` step per range, `basis` "per_day", range in `notes` |
| Benefit-period and lifetime day limits | v1.2.0 | `limits[]` with `per_benefit_period` or `per_lifetime`, plus `raw_text` |
| Cost share by site of service (Humana) | v1.2.0 | One `network_tiers` entry per site: `tier_class` "modality", `parent_tier_id` "IN" |
| Preferred diabetic supplier (Humana) | v1.2.0 | `tier_class` "cost_designation" with a `provider_set` name |
| Part D channels, day supplies and stages | Doesn't fit core (G4) | One benefit per tier at one 30-day retail price, with the full grid row quoted. SCAN keys it to a "Retail, Standard" `cost_designation` tier, Humana to a "Retail Cost-Sharing" `modality` tier. The rest of the grid belongs to the pharmacy module draft |
| Caps ("no more than $35", "25% up to $35") | Gap (G6) | The cap stays in `notes`; no number goes where the document prints a cap |
| Ranges ("$0-$5 copay", "$0-20%") | Gap (G6) | Cost-share `type` kept, `amount` or `rate` null, range in `notes` |
| Units that aren't printed | v1.1.0 | `basis` is null unless the page prints the unit ("per day", "per aid", "30-day supply") |
| Medicare-covered or supplemental | Gap (G7) | The verbatim `raw_label` carries it. `benefit_type` uses "hearing", "dental", "vision" and a stopgap "non_clinical" |
| Supplemental cost sharing outside the maximum out-of-pocket | v1.1.0 where stated | `applies_to_moop` false and `moop_applicability` "exclude", with the page cited in `notes` |
| Maximum out-of-pocket treatment not stated | Gap (G8) | `moop_applicability` null, `applies_to_moop` left off |
| Allowances | v1.1.0 | `limits[]` type "dollars"; carryover and expiry rules in `notes` (G9) |
| Grade pricing (hearing aids) | v1.1.0 | One benefit per grade |
| Either/or options (Humana eyewear) | Partial (G10) | 2 benefits, with the "or" in `notes` |
| Limits in trips, miles, hours, meals, aids | v1.1.0 | `limits[].type` is a free string |
| Per-ear, per-trip and shared limits | Partial (G11) | Scope in `limits[].type` or `raw_text`; sharing noted on the cost share |
| "Every 12 months" | Partial | `period` "per_12_months", proposed as a recommended value |
| Eligibility, authorization, referral, network-only rules | v1.1.0 | `conditions[]` |
| Worldwide emergency and urgent coverage | v1.1.0 | An `OUT` tier entry with `covered` true, empty `cost_shares`, and a note |
| Optional add-on with its own premium (SCAN dental PPO) | Gap (G12) | Not modeled |
| Extra Help amounts | Gap (G13) | Not modeled |
| One citation per benefit | Gap (G14) | Plan-level `source_references`, one excerpt or more per benefit, in benefit order |
| One document describing two plans (SCAN) | Conversion rule | One Benefit Plan Standard document per plan. The SCAN example is SCAN Classic |

Both examples declare `schema_version` "1.2.0" and validate against the v1.2.0 draft. They fail against v1.1.0 because they use `tier_class` and `raw_text`. They're the first examples on the draft, so if ballot reconciliation reshapes v1.2.0, they'll change with it.

---

## 3. Gaps and proposed fields

These are proposals for review, not schema changes. Nothing in `schema/` changed.

**G1. Regulator plan identifiers.** Add an optional core array, for example `plan_identifiers: [{ "system": "cms_contract_plan_segment", "value": "H1036-025-000" }]`. It would need systems for the CMS contract and plan number and for the marketplace HIOS id.

The pharmacy module draft already has `source_plan_identifiers` (`hios_id`, `cms_contract_id`, `cms_pbp_id`), and its README says a future minor release may promote them to core. The SCAN document is the case for doing that. Its plan's identifier isn't printed on the plan's own document, so the value has to come from another source, and the record should say which.

**G2. Service area.** Add `service_area: { "state": "FL", "counties": [{ "name": "Pasco", "fips": null }] }`. Medicare Advantage plans are sold by county. Neither document prints FIPS codes, so an example would carry names only.

**G3. Premium.** Add `premium: { "amount": 0, "period": "per_month", "notes": null }` and an optional `part_b_premium_reduction`.

**G4. More than one set of accumulators.** Core has one individual deductible and one individual out-of-pocket maximum per network. A Medicare Advantage plan with drug coverage needs 2 sets, one medical and one Part D, and the Part D deductible has to name the tiers it covers. There are 2 ways to get there:

- Wire the pharmacy module's `pharmacy.deductible`, `pharmacy.out_of_pocket_max` and `coverage_stages` into core.
- Make each accumulator slot a list whose entries carry `applies_to` and optional `formulary_tiers`.

Either way, `cost_shares[].applies_to_deductible` also needs a way to say which deductible it means, such as a `deductible_ref`.

**G5. Day ranges on a cost share.** Add `cost_shares[].unit_range: { "from": 1, "to": 6, "unit": "day" }`. Today the range sits in `notes`, so a reader has to parse "Days 1-6" to price day 10.

**G6. Caps and ranges.**

- For caps such as "25% up to $35" and "no more than $35 for a one-month supply," add `max_amount` and `max_basis`.
- For ranges such as "$0-$5" and "$0-20%," add `amount_min`, `amount_max`, `rate_min` and `rate_max`.

The Kaiser SBC example has the same problem. Its specialty tier is "20% coinsurance up to $250 / prescription," and the cap was left out.

**G7. Coverage basis.** Add `benefits[].coverage_basis`, with recommended values `medicare_covered`, `supplemental_mandatory` and `supplemental_optional`. This is the main Medicare Advantage axis. The existing `benefit_type` describes the domain (medical, dental, pharmacy), not which program pays for the benefit.

The examples use `benefit_type` "non_clinical" for transportation, meals, OTC and similar services only because nothing else fits. The two documents don't use that term.

**G8. "Not stated" for maximum out-of-pocket treatment.** `applies_to_moop` is a boolean that defaults to true, so a row where the document is silent reads as counting toward the maximum. There are 2 possible fixes: allow null, or treat a null `moop_applicability` as authoritative. The examples do the second. SCAN's Part B drug rows are one such case, because page 3 excludes "prescription drugs" without saying whether that includes Part B.

**G9. Allowance carryover.** Add `limits[].carryover`, with recommended values `none`, `next_period` and `within_year`, so the difference between SCAN's and Humana's OTC rules becomes data rather than text.

**G10. Either/or options.** Add `benefits[].alternative_group`, a shared id for benefits the member chooses between.

**G11. Limit scope and shared limits.** This extends the open item in `carin-dic-reconciliation.md` section 5.

- Add `limits[].scope`, for example `per_ear`, `per_trip` or `per_admission`.
- Add `limits[].shared_limit_id` for one limit counted across several benefits.

Without these fields, a program that adds up the SCAN hearing aid limits counts 4 aids where the page allows 2.

**G12. Optional supplemental packages.** Add a `riders[]` array. Each rider carries a name, a premium, and benefits that apply only when the member buys it.

**G13. Population-specific cost sharing.** Extra Help replaces the Part D cost shares for members who qualify. Add an optional `applies_to_population` on a cost-share set. This is low priority for a worked example.

**G14. A citation on each benefit.** `benefits[]` doesn't allow a citation field, so every example keeps its citations in the plan-level `source_references`, and the link to a benefit is positional. Add an optional `benefits[].source_references` with the same shape as the plan-level one. This matters more for a 70-row Summary of Benefits than for a 30-row SBC.

**Vocabulary.** The recommended categories and canonical keys are SBC-shaped, and the examples use some values outside them. The validator prints 60 advisory warnings for those values.

- **Categories:** `HEARING`, `DENTAL`, `VISION`, `PART_B_DRUGS`, `PODIATRY`, `TRANSPORTATION`, `OVER_THE_COUNTER`, `MEALS`, `IN_HOME_SUPPORT`, `FITNESS`, `PERSONAL_EMERGENCY_RESPONSE`, `MEMBER_SUPPORT`
- **Benefit types:** `hearing` and `non_clinical`
- **Canonical keys:** left off where nothing fits, rather than stretched. For example, "Tier 4 (Non-Preferred Drug)" isn't limited to brand drugs.

---

## 4. How the examples were built

I keyed both files by hand from the PDFs, unlike the 8 SBC examples, which came out of the reference implementation.

**Scope.**

- **SCAN:** the SCAN Classic column only, 71 benefits. SCAN Prime isn't modeled.
- **Humana:** the whole document, 72 benefits.

**Page numbers** are PDF page positions. SCAN's pages are unnumbered; Humana's printed numbers match.

**Citations.** Every benefit has at least one excerpt in `source_references`, and the excerpts run in benefit order. Each excerpt starts with the row's heading path and follows these conventions:

- ` > ` separates heading levels.
- ` | ` separates cells or paragraphs.
- `; ` separates bullets.
- `SCAN Classic:` marks the plan's column, and `What you should know:` marks the right-hand column.
- `(headings on page N)` marks a heading printed on an earlier page.
- On Part D grid rows, the excerpt starts with a `columns:` list of the grid's column headings.

Non-breaking hyphens and curly quotation marks are written as plain ones. Plan-level facts that no benefit field holds (premium, service area, Part D deductible and threshold, Extra Help, the pharmacy notes) are quoted as their own excerpts.

**Values.**

- **Nothing is computed.** An amount or rate appears only where the page prints a single number.
- **Units.** `basis` is null unless the page prints the unit.
- **Ranges and caps** stay in `notes` (G6).
- **Services the page marks "Not covered"** carry `covered: false`.
- **Rows with no structured cost share.** Where the page prints only an allowance, a cap, a cross-reference ("at Tier 1 cost-share amount") or no price at all, the row has empty `cost_shares` and a note. That applies to 3 SCAN rows and 7 Humana rows.

**Part D.** Each tier carries one price: SCAN's Standard retail 30-day price and Humana's Retail 30-day price. The full grid row is quoted.

- **Deductible flags.** `applies_to_deductible` is true only on the tiers the Part D deductible names: SCAN Tiers 3 to 5, except insulin, and Humana Tiers 4 and 5.
- **SCAN insulin** has its own priced row.
- **Humana's insulin grid** is written out in the notes, because most of its cells pair a coinsurance with a cap.

**Maximum out-of-pocket.** Each row falls into one of 3 cases.

- **The document places the row outside the maximum.** The row carries `applies_to_moop: false` and `moop_applicability: "exclude"`. This covers:
  - SCAN rows labeled Non-Medicare-covered or routine, because page 3 defines the maximum over Medicare-covered services
  - Humana rows labeled Mandatory supplemental, per the page 8 sentence
  - Part D rows in both plans
- **The row is a Medicare-covered or core medical service.** It follows the plan default, as in the SBC examples.
- **The document doesn't say.** The row has `moop_applicability: null`, no `applies_to_moop`, and a note saying so.

**Left out on purpose:**

- The SCAN Prime column.
- SCAN's optional dental PPO.
- Extra Help.
- Humana's Go365 rewards program, which has no cost share.
- The Part D grid beyond one price per tier.
- Humana's observation cost share, which the document refers to but doesn't print.

---

## 5. Verification record

The check ran as a separate pass after both files were written, in 3 layers. Anything that couldn't be found on its cited page was fixed or removed before this record was written.

**1. Script check.**

- **Excerpts.** Every excerpt fragment must appear on its cited page. For SCAN, value text has to be inside the SCAN Classic column, cropped by position, so a Prime value can't pass. Part D grid rows are compared cell by cell.
- **Numbers.** Every amount, rate and limit value in a benefit must appear in that benefit's own excerpts.
- **Labels and accumulators.** Every `raw_label` must appear on a cited page, and the accumulators must match the plan-level excerpts.

Results: 517 checks on SCAN and 663 on Humana, with 0 failures.

**2. Row alignment.** For each benefit row, the script reads the value printed on the same line as the row label and compares it with the excerpt. It checked 62 SCAN rows and 61 Humana rows.

In 4 rows the value sits on another line of the same cell, so I checked those on the page images:

- SCAN Part B insulin
- SCAN HEALTHtech+
- SCAN telehealth
- Humana urgently needed services

**3. Independent reviews.** A separate review for each document compared every benefit with the rendered page images.

Neither found a wrong amount, rate or site, or any value taken from the SCAN Prime column. They did find errors, which are fixed:

- Humana's hearing aid limit is 1 per ear, not 1 per year.
- Several cost-share units weren't printed, so `basis` is now null.
- A SCAN Tier 5 note misdescribed the mail-order columns.
- SCAN Part B drugs were counted toward the maximum out-of-pocket on a reading the page doesn't support. They're now "not stated."
- SCAN's routine acupuncture and chiropractic rows mixed a referral rule with an authorization rule.
- The Part D rows were keyed to the whole network instead of a pharmacy channel.
- Some notes and excerpts drifted from the printed wording.

A second round of review confirmed the fixes.

**Schema.**

- `node scripts/validate.js --schema schema/v1.2.0/benefit-plan.schema.json examples/scan_example.json examples/humana_example.json` passes both files, with the 60 vocabulary warnings described in section 3.
- Against v1.1.0 both files fail, as expected, on the v1.2.0 fields.

If you find a value that doesn't match its page, that's a bug in the example. I'd like to hear about it.

---

## 6. Carrying this to the digital insurance card

The CARIN Digital Insurance Card IG profiles the SBC as a FHIR `InsurancePlan`. I checked the CI build (2.0.0-ballot) on September 16, 2026. Some of what's in these examples maps cleanly, and some doesn't yet.

**What maps**, via `carin-dic-reconciliation.md`:

- The 3 changes merged in June carry a lot of the Medicare Advantage shape.
- Multi-tier cost sharing is what lets Humana's site-of-service prices sit on one benefit.
- `DeductibleApplies` carries the per-tier Part D flag.
- `BenefitLimitation`'s limit period includes benefit period and lifetime.

**What doesn't map yet:**

- **Benefit categories.** The IG's SBC benefit category code system follows the SBC rows. It has no code for hearing, and its only dental and vision codes are the children's ones. Routine hearing, adult dental and adult vision appear in both documents here and have no category.
- **Cost tiers.** The Cost Tier code system has `value-choice`, `standard` and `virtual`. Only `virtual` corresponds to one of Humana's 17 site labels (telehealth). The other 16 would need adopter codes.
- **Limit types.** The Limit Type code system has `visits`, `days` and `dollars`. These examples also need trips, miles, hours, meals and hearing aids.
- **Deductibles.** `DeductibleApplies` is a boolean, so it can't say which deductible applies (G4).

Those are the candidates for the next round of change requests, if the group decides Medicare Advantage belongs in the same profile. I haven't yet checked how the profile would carry a premium or a Part D out-of-pocket threshold. That's the next thing to look at.
