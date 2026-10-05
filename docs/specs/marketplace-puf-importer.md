# Spec: CMS Marketplace public use files to BPS importer

**Status:** Draft, 2026-10-05
**Reads with:** [`insuranceplan-converter.md`](insuranceplan-converter.md) (the exporter this importer feeds), [`marketplace-puf-parse-report.md`](marketplace-puf-parse-report.md) (every cost-share string in the PY2026 file and how it is read), [`marketplace-puf-vs-sbc-flblue-505.md`](marketplace-puf-vs-sbc-flblue-505.md) (the importer's Florida Blue output against the SBC example)

This spec defines the first importer for the Benefit Plan Standard (BPS): the CMS Health Insurance Exchange public use files (PUFs) in, one BPS v1.1.0 document per plan out. It follows the pattern of the FHIR converter: the benefit mapping lives in a data file, the output is deterministic, 3 golden files are committed, and a test checks them.

---

## 1. Scope

- One direction: public files to BPS. The importer writes BPS JSON only. It never writes FHIR; FHIR comes from `scripts/to-insuranceplan.js` reading the importer's output unchanged.
- One plan in, one BPS v1.1.0 document out. A plan is one plan variant (a 17-character HIOS plan ID, section 5.1).
- Medical plans only. A stand-alone dental plan (`DentalOnlyPlan` "Yes") is refused.
- The importer never adds a value the public files do not contain. It invents no period, basis, network, identifier or cost share. A string it cannot read stops the import for that plan, with the string quoted (section 6). Nothing is guessed.
- Nothing is dropped silently. A value with no BPS field is carried verbatim in `source_references` or in tier `notes`, and benefits with no canonical key are listed by name (section 8).
- The schema is not changed. Where the public file and the schema disagree, section 7 records the reading chosen; section 9 lists the gaps.

## 2. Sources

CMS publishes the Exchange PUFs for each plan year. They cover the states that use the federal platform (Federally-facilitated Exchanges, including states doing plan management, and State-based Exchanges on the federal platform). They do not cover State-based Exchanges with their own platform (for example California, New York). PY2026 covers 30 states: AK AL AR AZ DE FL HI IA IN KS LA MI MO MS MT NC ND NE NH OH OK OR SC SD TN TX UT WI WV WY.

| Item | URL |
|---|---|
| PUF page (all plan years) | https://www.cms.gov/marketplace/resources/data/public-use-files |
| Plan Attributes PUF, plan year YYYY | `https://download.cms.gov/marketplace-puf/YYYY/plan-attributes-puf.zip` |
| Benefits and Cost Sharing PUF, plan year YYYY | `https://download.cms.gov/marketplace-puf/YYYY/benefits-and-cost-sharing-puf.zip` |
| Plan Attributes data dictionary, PY2026 | https://www.cms.gov/files/document/planattributes-datadictionary-py26.pdf |
| Benefits and Cost Sharing data dictionary, PY2026 | https://www.cms.gov/files/document/benefitscostsharing-datadictionary-py26.pdf |
| General information, PY2026 | https://www.cms.gov/files/document/exchange-pufs-geninfofacts-py26.pdf-0 |
| FAQs, PY2026 | https://www.cms.gov/files/document/exchange-pufs-faqs-py26.pdf-0 |

Both files are plan-variant level. The Plan Attributes PUF has one row per plan variant (151 columns in PY2023 and PY2026). The Benefits and Cost Sharing PUF has one row per plan variant per benefit (24 columns). The importer reads 2 files only. The other PUFs (rate, service area, network, business rules) are out of scope.

The data dictionaries list the allowed values of the cost-share columns but do not define them. The readings in section 6 follow from those lists (for example, "after deductible" and "with deductible" are listed as separate values from a plain copay). The verbatim string is always kept (section 5.4), so a reader who reads a value differently can re-derive it.

## 3. Files, inputs and outputs

- **Where the public files go.** `data/puf/<year>/`, unzipped. `data/` is in `.gitignore`; the public files are never committed. The importer finds the 2 CSVs by name pattern (`plan-attributes` and `benefits-and-cost-sharing`, case and separator insensitive), because CMS names them differently across years: PY2026 ships `plan-attributes-puf.csv` and `benefits-and-cost-sharing-puf.csv`, PY2023 ships `Plan_Attributes_PUF.csv` and `Benefits_Cost_Sharing_PUF.csv`.
- **Download record.** `data/puf/<year>/download.json` holds `downloaded` (YYYY-MM-DD), the source page, the 2 zip URLs and a SHA-256 of each file. The importer reads the date from it; `--downloaded YYYY-MM-DD` overrides it.
- **Reading.** Both CSVs are streamed with a small RFC 4180 parser in the script (quoted fields with commas, doubled quotes and line breaks; CRLF, LF or CR record ends; a leading byte order mark dropped). A record whose field count differs from the header is an error. No npm dependency is added.
- **Output.** One BPS v1.1.0 document, checked against `schema/v1.1.0/benefit-plan.schema.json` with the same local Ajv setup as `scripts/validate.js` before it is written. A document that fails the schema is not written.
- **Golden files.** `examples/<slug>.puf.json`, where `<slug>` is `plan_id` lowercased with `_` changed to `-`. The `.puf.json` suffix keeps them out of the converter's `*_example.json` corpus.

## 4. Plan-level mapping

### 4.1 Plan fields

| BPS | Public file (Plan Attributes PUF) | Rule |
|---|---|---|
| `plan_id` | `IssuerMarketPlaceMarketingName`, `PlanMarketingName` | Each name with parenthesized text removed, uppercased, each run of other characters changed to `_`; joined with `_`; cut back to the last `_` until at most 64 characters, so the converter's FHIR id is valid. Example: "Florida Blue (BlueCross BlueShield FL)" and "BlueOptions Gold 1505 ($0 Virtual Visits / ...)" give `FLORIDA_BLUE_BLUEOPTIONS_GOLD_1505`. The slug is not unique across variants of one plan; the HIOS plan ID is the unique key (4.4). |
| `plan_name` | `PlanMarketingName` | Verbatim (trimmed). `PlanVariantMarketingName` goes to `source_references`. |
| `carrier` | `IssuerMarketPlaceMarketingName` | Verbatim (trimmed). |
| `plan_type` | `PlanType` | Verbatim (`HMO`, `PPO`, `EPO`, `POS`), except `Indemnity` becomes `INDEMNITY` to match `vocabularies/plan-types.json`. |
| `plan_year` | `BusinessYear` | Integer. |
| `effective_date`, `expiry_date` | `PlanEffectiveDate`, `PlanExpirationDate` | `M/D/YYYY` to ISO. Omitted when blank (PY2026: 5,206 of 22,059 rows have no expiration date). |
| `market` | `MarketCoverage` | `Individual` to `individual`, `SHOP (Small Group)` to `small_group`. Any other value is an error. See 7.6. |
| `schema_version` | (none) | `1.1.0`. |
| `coverage_period` | (none) | Not written; the public file gives plan dates, not a separate coverage window. |

### 4.2 Network tiers

| Tier | Columns | Written when |
|---|---|---|
| `IN` | `CopayInnTier1`, `CoinsInnTier1` | Always. Named "In-Network", or "In-Network Tier 1" when `IN2` is present. |
| `IN2` | `CopayInnTier2`, `CoinsInnTier2` | Only when at least 1 of the plan's benefit rows has a tier 2 string other than blank or `Not Applicable`. The `MultipleInNetworkTiers` flag alone does not decide it; its value goes to `source_references`. |
| `OUT` | `CopayOutofNet`, `CoinsOutofNet` | Always. Named "Out-of-Network". |

Each tier's `description` names its 2 columns.

### 4.3 Accumulators

The Plan Attributes PUF has 3 column families: medical (`MEHB...`), drug (`DEHB...`) and combined medical and drug (`TEHB...`).

- **Which family.** Deductibles use `TEHB` when `MedicalDrugDeductiblesIntegrated` is "Yes"; otherwise `MEHB`, unless every `MEHB` deductible cell is empty and a `TEHB` cell has a value, in which case `TEHB` is used ("combined values only"). Out-of-pocket maximums follow the same rule with `MedicalDrugMaximumOutofPocketIntegrated`. The choice and the reason are written to `source_references` (4.4).
- **Slots.**

| BPS slot | Column (after the family prefix) | `network_tier` |
|---|---|---|
| `individual_deductible` | `DedInnTier1Individual` | `in-network` |
| `family_deductible` | `DedInnTier1FamilyPerGroup` | `in-network` |
| `individual_oop_max` | `InnTier1IndividualMOOP` | `in-network` |
| `family_oop_max` | `InnTier1FamilyPerGroupMOOP` | `in-network` |
| `oon_individual_deductible` | `DedOutOfNetIndividual` | `out-of-network` |
| `oon_family_deductible` | `DedOutOfNetFamilyPerGroup` | `out-of-network` |
| `oon_individual_oop_max` | `OutOfNetIndividualMOOP` | `out-of-network` |
| `oon_family_oop_max` | `OutOfNetFamilyPerGroupMOOP` | `out-of-network` |

- **Values.** `"$6,000 "`, `"$12000 per group"` and `"$0 per person"` are read as amounts (`$0` is a real $0 deductible and is written). `Not Applicable`, `per group not applicable`, `per person not applicable` and blank mean no value; the slot is omitted. Any other cell is an error.
- **Fields.** `amount`, `currency` `USD`, `network_tier`, and `applies_to`: `medical` for the `MEHB` family, `integrated` for `TEHB`. `period` is not written: the file does not say plan year or calendar year.
- **`embedded`.** On a family slot: `true` when the matching `FamilyPerPerson` cell has a dollar amount (each family member has their own amount inside the family total); `false` when it reads `per person not applicable`; omitted when blank.
- **Not in slots.** Tier 2 accumulators, combined in-and-out-of-network accumulators (`CombInnOon`), the drug family when it is separate, and the default coinsurance cells (`DedInnTier1Coinsurance` and so on). All are carried verbatim in `source_references` (4.4).

### 4.4 Source references

v1.1.0 `source_references[]` items hold `page_number`, `page_range` and `excerpt`. The public files have no pages, so every entry is an `excerpt`, in this order:

1. **Source.** The 2 file names, their download URLs, the plan year, the download date, the HIOS plan ID (v1.1.0 has no identifier field; section 9.1) and `URLForSummaryofBenefitsCoverage`.
2. **Plan attributes with no BPS field**, verbatim, each as `Column "value"`: `StandardComponentId`, `CSRVariationType`, `PlanVariantMarketingName`, `MetalLevel`, `DesignType`, `IsHSAEligible`, `MultipleInNetworkTiers`, `FirstTierUtilization`, `SecondTierUtilization`, `NetworkId`, `ServiceAreaId`, `FormularyId`, `NationalNetwork`, `IsReferralRequiredForSpecialist`, `SpecialistRequiringReferral`, `PlanLevelExclusions`, `OutOfCountryCoverage`, `OutOfServiceAreaCoverage`, `SpecialtyDrugMaximumCoinsurance`, `InpatientCopaymentMaximumDays`, `BeginPrimaryCareCostSharingAfterNumberOfVisits`, `BeginPrimaryCareDeductibleCoinsuranceAfterNumberOfCopays`, `IssuerActuarialValue`, `AVCalculatorOutputNumber`, `FormularyURL`, `PlanBrochure`. Blank cells are skipped.
3. **Accumulators.** The 2 integration flags, which family was used and why, and every non-blank `MEHB`, `DEHB` and `TEHB` cell verbatim in file order.
4. **Unmapped benefits.** Every benefit row whose `BenefitName` has no `canonical_key` in the crosswalk, in file order, each with "Covered" or "Not Covered", and "not in the crosswalk" when the name is missing from the crosswalk file altogether. Omitted when there are none.

## 5. Benefit mapping

### 5.1 Which rows are read

- `--plan` takes a 17-character plan ID (`16842FL0070120-01`) or a 14-character standard component ID (`16842FL0070120`). A 14-character ID resolves to its `-01` variant when present (in the files read, the on-exchange variant without cost-sharing reductions, for example CSR variation "Standard Gold On Exchange Plan"), else to its only variant; with several variants and no `-01`, the importer stops and lists them. `--issuer <id> --state <ST>` lists an issuer's plan variants with their CSR variation and marketing names.
- The Benefits and Cost Sharing rows are those whose `PlanId` equals the chosen variant, in file order. A `BenefitName` that appears twice for one plan is an error.

### 5.2 Crosswalk

`fhir/marketplace-puf-crosswalk.json` maps every distinct `BenefitName` in the PY2026 Benefits and Cost Sharing PUF (273 names, verbatim, including the file's own spellings and truncations such as "Austism Spectrum Disorders" and "Community Health Worke") to a `canonical_key` in `vocabularies/canonical-benefits.json` or to `null`. The rule is the CARIN crosswalk's: a name maps only when the public-file benefit clearly is the canonical service; there is no nearest fit. Each row has `puf_benefit_name`, `canonical_key`, `category` (a code from `vocabularies/categories.json`, or `null` when none fits) and `note` (one line where the decision is not obvious).

**Counts: 71 mapped, 202 unmapped.** Of the 202, 51 are adult or pediatric dental rows (categories `DENTAL` and `DENTAL_PEDIATRIC`), and most of the rest are state-specific benefits with no canonical key. Notable decisions:

| Public-file name | Decision | Why |
|---|---|---|
| Inpatient Hospital Services (e.g., Hospital Stay) | `inpatient_hospital` | The name matches; the file carries physician services in a separate row. |
| Inpatient Physician and Surgical Services | `inpatient_hospital_professional` | Physician and surgeon fees during a stay. |
| Outpatient Facility Fee (e.g., Ambulatory Surgery Center) | `outpatient_surgery_facility` | |
| Outpatient Surgery Physician/Surgical Services | `outpatient_surgery_professional` | Not the narrower `outpatient_surgery_surgeon`. |
| Delivery and All Inpatient Services for Maternity Care | `delivery_inpatient` | Covers facility and professional delivery together. |
| Laboratory Outpatient and Professional Services; X-rays and Diagnostic Imaging | `diagnostic_lab`; `imaging_standard` | The SBC "Diagnostic test (x-ray, blood work)" row is 2 rows here. |
| Prenatal and Postnatal Care | `null` | Combines `prenatal_care` and `postnatal_care`. |
| Rehabilitative Occupational and Rehabilitative Physical Therapy | `null` | Combines `occupational_therapy` and `physical_therapy`. |
| Other Practitioner Office Visit (Nurse, Physician Assistant) | `null` | No key for non-physician practitioner visits. |
| Infusion Therapy | `null` | Site not stated; the vocabulary splits center and home infusion. |
| Mental Health Office Visit, behavioral-health ER and urgent care rows | `null` | Narrower than the general keys. |
| Telehealth, Virtual Visit, Telehealth - Primary Care and similar | `telehealth_visit` | |
| Well Baby Visits and Care; Child Health Supervision | `well_child_visit` | |

The crosswalk was built from PY2026 names. A name in another year's file that is not in the crosswalk is treated as unmapped and listed with "not in the crosswalk" (section 12).

### 5.3 Benefit fields

One BPS benefit per Benefits and Cost Sharing row whose name maps, in file order.

| BPS | From | Rule |
|---|---|---|
| `benefit_id` | `BenefitName` | Uppercased, each run of other characters changed to `_`. Unique within a plan because names are. |
| `benefit_type` | crosswalk `category` | `pharmacy` for `PHARMACY`, else `medical`, as in the 8 SBC examples. |
| `category` | crosswalk | |
| `service_name`, `raw_label` | `BenefitName` | Verbatim. |
| `canonical_key` | crosswalk | |
| `network_cost_shares` | tier columns, `IsCovered`, MOOP flags | 5.4 and 5.5. |
| `limits` | `LimitQty`, `LimitUnit` | 5.6. Always present, possibly empty, as in the examples. |
| `conditions` | `Exclusions`, `Explanation` | 5.7. Always present, possibly empty. |

`IsEHB`, `EHBVarReason` and `QuantLimitOnSvc` are not carried (section 8).

### 5.4 Tier rows and `covered`

For each plan tier (`IN`, `IN2` when present, `OUT`):

- **Coverage.** `IsCovered` "Covered" is `covered: true`; "Not Covered" or blank is `covered: false` (the dictionary says blank equals Not Covered). Any other value is an error. `IsCovered` is a benefit-level flag; the public file has no per-tier coverage flag, so every tier row of a benefit carries the same `covered` value (7.4).
- **Not covered.** Every plan tier gets a row with `covered: false` and empty `cost_shares`. Cost-share strings on a not-covered row are not parsed; when any is non-blank, both are quoted in `notes`.
- **Covered.** A tier whose 2 strings are both blank gets no row. Otherwise the row gets `covered: true`, the steps from 5.5, and `notes` quoting both strings verbatim, for example `PUF CopayInnTier1 "$40.00"; CoinsInnTier1 "Not Applicable"`. A covered tier whose 2 strings both state no step (both `Not Applicable`) has a row with empty `cost_shares`; the converter shows it as "Covered; amount not stated in the BPS document", and `notes` shows what the file said.

### 5.5 Cost-share steps

- The copay column is read first, then the coinsurance column. Each string that states a step adds 1 step; `sequence` counts from 1 in that order. A tier can have 0, 1 or 2 steps. "No Charge" in both columns gives 2 steps (a $0 copay and a 0% coinsurance), as the file says.
- `type`: `copay` from the copay column, `coinsurance` from the coinsurance column.
- `amount` for a copay, `rate` (0 to 1) for a coinsurance; the other is not written.
- `basis`: `per_day` or `per_stay` when the string says "per Day" or "per Stay"; otherwise not written (the file does not say per visit).
- `applies_to_deductible`: section 6.
- `applies_to_moop`: `false` when `IsExclFromInnMOOP` (for `IN` and `IN2`) or `IsExclFromOonMOOP` (for `OUT`) is "Yes"; `true` when "No"; not written when blank.
- `notes` on the step: only for "with deductible" and "before deductible", stating that the copay and the deductible both apply and that this differs from "after deductible".

### 5.6 Limits

`LimitUnit` has the form `<thing> per <period>` (PY2026 has 53 distinct units, all of that form; older dictionaries also list `Lifetime <thing>`).

- `type`: the thing, lowercased, with `(s)` removed and pluralized: `Visit(s)` to `visits`, `Exam(s)` to `exams`, `Item(s)` to `items`, `Days` to `days`, `Dollars` to `dollars`.
- `period`: `per_` plus the period lowercased with spaces changed to `_`: `per_year`, `per_6_months`, `per_3_years`, `per_benefit_period`, `per_lifetime`, `per_admission`, `per_stay`.
- `value`: `LimitQty` as a number (`"35.0"` to 35).
- A unit with a blank or non-numeric `LimitQty`, a unit outside the form, or `QuantLimitOnSvc` "Yes" with both cells blank, is an error. Limits are carried on not-covered benefits too.

The parse report lists every unit and its reading.

### 5.7 Exclusions and explanations

v1.1.0 benefits have `conditions[]` (`type`, `code`, `description`) and no benefit-level notes field. Both free-text columns go to `conditions[]`, verbatim (trimmed): `Exclusions` as `{"type": "exclusion", ...}` and `Explanation` as `{"type": "explanation", ...}`, in that order, without `code`. The converter joins condition descriptions into `coverage.benefit.requirement`, so the text reaches FHIR. An explanation is not a condition in the strict sense (section 9.1).

## 6. Cost-share string grammar

The parser accepts exactly these forms. `$A` is an amount: `$`, digits (optionally with thousands commas), optionally `.` and 1 or 2 digits. `R%` is a rate of 0 to 100, with optional decimals. Surrounding spaces are trimmed. Matching is case-sensitive.

**Both columns**

| String | Reading |
|---|---|
| blank, `Not Applicable` | No step. |
| `No Charge` | Copay column: `copay`, `amount` 0. Coinsurance column: `coinsurance`, `rate` 0. `applies_to_deductible` false. |
| `No Charge after deductible` | As above, `applies_to_deductible` true. |

**Copay columns** (`CopayInnTier1`, `CopayInnTier2`, `CopayOutofNet`)

| String | `amount` | `basis` | `applies_to_deductible` |
|---|---|---|---|
| `$A` | A | | false |
| `$A Copay` | A | | false |
| `$A Copay after deductible` | A | | true |
| `$A Copay with deductible` | A | | true, with a step note |
| `$A Copay before deductible` (PY2014 to PY2017) | A | | true, with a step note |
| `$A Copay per Day` / `per Stay` | A | `per_day` / `per_stay` | false |
| `$A Copay per Day` / `per Stay` + ` after deductible`, ` with deductible` or ` before deductible` | A | `per_day` / `per_stay` | true (a step note for with and before) |

**Coinsurance columns** (`CoinsInnTier1`, `CoinsInnTier2`, `CoinsOutofNet`)

| String | `rate` | `applies_to_deductible` |
|---|---|---|
| `R%` | R / 100 | false |
| `R% Coinsurance after deductible` | R / 100 | true |

**Everything else is unreadable**: a coinsurance form in a copay column or the reverse, `R% Coinsurance` without "after deductible", a rate over 100%, any other wording. An unreadable string is an error on that benefit, reported with the column and the string quoted; the importer writes nothing for that plan. On the PY2026 file there are 0 unreadable strings among 434 distinct strings (373 in copay columns, 61 in coinsurance columns); the parse report has the full table.

**Deductible flag.** The flag is true only when the string says "after deductible", "with deductible" or "before deductible". A plain `$A` or `R%` reads as false: the dictionaries list it as a separate value from the forms that name the deductible. The PY2026 file writes the dictionary's `$X Copay` as `$40.00` and its `X%` as `50.00%`.

## 7. Where the public file and the schema disagree

Each case takes the reading that loses no information.

| # | Concept | Reading chosen |
|---|---|---|
| 7.1 | **Tier 2.** The file has 2 in-network tiers; BPS v1.1.0 has free-form tiers but no tier 2 convention. | A third tier `IN2`, only when the plan has tier 2 values (4.2). Folding tier 2 into `IN` or dropping it would lose values. The converter maps `IN2` to `in-network` with a qualifier (converter spec 6.2). |
| 7.2 | **Combined medical and drug accumulators.** The file can give integrated values only; v1.1.0 has one set of slots. | The integrated values fill the slots with `applies_to: integrated`, and `source_references` records the flags and every cell (4.3). |
| 7.3 | **Family per-person amount without a family total** (for example Florida Blue 1505 out of network: `$500 per person`, `per group not applicable`). v1.1.0 family slots need an `amount`. | No family slot; the per-person cell is in `source_references`. |
| 7.4 | **Coverage is benefit-level in the file, tier-level in BPS.** | Every tier row takes the benefit's `IsCovered` value; the strings are quoted in `notes`, so a tier where both columns say `Not Applicable` shows that. |
| 7.5 | **A benefit with a limit but no cost share** (not covered, or both columns `Not Applicable`). | The limit is written; the tier rows follow 5.4. |
| 7.6 | **Market.** `vocabularies/markets.json` separates `individual` (described as off-exchange) from `individual_on_exchange`; `MarketCoverage` does not. | `individual` from `MarketCoverage`, as specified. The variant's `CSRVariationType` (for example "Standard On Exchange Plan") is in `source_references`. |
| 7.7 | **"with deductible" against "after deductible".** BPS has 1 boolean. | Both are `applies_to_deductible: true`; the step note and the quoted string keep the difference. |
| 7.8 | **Copay and coinsurance on the same tier.** The file has 2 columns per tier; it does not state an order. | 1 step per column that states one, copay first (5.5). |
| 7.9 | **Blank `IsCovered`.** | Not covered, as the dictionary says. |

## 8. Lossy and unmapped items

| Public-file content | Where it goes | Recoverable from the BPS document? |
|---|---|---|
| Benefit rows with no canonical key | Listed by name and coverage in `source_references` | Name and coverage only; their cost shares, limits and text are not carried |
| HIOS plan ID, standard component ID, CSR variation, metal level, HSA eligibility, network, service area and formulary IDs, referral flags, plan-level exclusions, AV numbers, URLs | `source_references` text (4.4) | Yes, as text |
| Tier 2, combined in-and-out, drug-only and coinsurance accumulator cells | `source_references` text (4.3) | Yes, as text |
| Verbatim cost-share strings | Tier `notes` | Yes |
| `IsEHB`, `EHBVarReason` | Not carried | No |
| `QuantLimitOnSvc` | Not carried; it is implied by `limits[]` | Yes, by inference |
| `ImportDate`, `SourceName` | Not carried | No |
| Limit period plan year against calendar year | Not stated in the file; `per_year` | Nothing to recover |

## 9. Schema gaps found

### 9.1 In the public files, not in BPS v1.1.0

| Public-file field | Gap | Workaround here |
|---|---|---|
| `PlanId` (HIOS plan ID), `StandardComponentId` | No plan identifier field in v1.1.0 (the v1.2.0 draft adds `plan_identifiers`) | `source_references` text |
| `MetalLevel` | No metal level field | `source_references` |
| `CSRVariationType` | No plan variant field | `source_references` |
| `IsHSAEligible` | No HSA eligibility field | `source_references` |
| Tier 2 accumulators (`...InnTier2...`) | Accumulator slots exist for in-network and out-of-network only | `source_references` |
| Combined in-and-out-of-network accumulators (`CombInnOon`) | No slot | `source_references` |
| Separate drug deductible and MOOP (`DEHB...`) | No pharmacy accumulator in v1.1.0 (the v1.2.0 draft adds `pharmacy`) | `source_references` |
| Family per-person amount without a family total | Family slots need an `amount`; `embedded` is a boolean with no per-person amount | `source_references` |
| Default plan coinsurance (`...DedInnTier1Coinsurance`) | No plan-level coinsurance field | `source_references` |
| `Explanation` | No benefit-level notes field; carried as a condition of type `explanation` | `conditions[]` |
| `IsEHB`, `EHBVarReason` | No essential health benefit flag | Not carried |
| `NetworkId`, `ServiceAreaId`, `FormularyId`, `FormularyURL` | No network, service area or formulary reference | `source_references` |
| `BeginPrimaryCareCostSharingAfterNumberOfVisits` and the copay-count field | No "first N visits" cost-share rule | `source_references` |
| `InpatientCopaymentMaximumDays` | No cap on the number of per-day copays | `source_references` (the Explanation text often states it too) |

### 9.2 In BPS v1.1.0, not in the public files

| BPS field | Public files |
|---|---|
| Accumulator `period` (per plan year or per calendar year) | Not stated |
| Cost-share `basis` other than per day and per stay (per visit, per prescription, allowed amount) | Not stated |
| `coverage_period` as distinct from plan dates | Not stated |
| `place_of_service`, `coding_hints` | Not in these files |
| Limit `period` plan year against calendar year | "per Year" only |
| Page-level `source_references` | No pages |

### 9.3 Exporter limits met on the way to FHIR

These are not schema gaps, but they decide what reaches FHIR; they are recorded here and not fixed.

- **Tier 2.** In PY2026, 5,351 of the 20,670 medical plan variants (26%) have tier 2 values; in PY2023, 6,797 of 30,911 (22%). The converter first refused any network tier other than `IN` and `OUT`; it now maps `IN2` to `in-network` with a `cost.qualifiers` entry (converter spec 6.2). The Cost Tier value set has no "tier 2" code, so the qualifier is text only unless the tier name says "Value Choice", and the validator warns once per tier 2 entry. The importer names the tier "In-Network Tier 2", because the public file does not name tiers (Florida Blue's "Value Choice Providers" appears only in Explanation text).
- **Keys outside the CARIN crosswalk.** The importer uses canonical keys that `fhir/carin-sbc-crosswalk.json` does not place, so the converter lists them as `bps-unmapped-benefit`: in the 2 PY2026 Bundles, 17 benefits each, among them `delivery_inpatient`, `inpatient_hospital_professional`, `outpatient_surgery_professional`, `well_child_visit` and `substance_use_inpatient`. Some have an obvious SBC row (for example `outpatient_surgery_professional` and the SBC physician/surgeon fee row); adding them to the CARIN crosswalk is a converter decision.
- **Limit codes.** Limit types other than visits, days and dollars, and limit periods other than plan year, calendar year, benefit period and lifetime, are text-only in FHIR and raise validator warnings ([`../../examples/fhir-puf/README.md`](../../examples/fhir-puf/README.md)).

### 9.4 Limits with no benefit row

Found in the SBC examples on 2026-10-05. The PDF prints a limit for a service that has no row of its own and no cost share. BPS v1.1.0 can hold a limit only in a benefit's `limits[]`, and adding a benefit row would invent a cost share the PDF does not print, so each limit is carried as a condition of type `benefit_limit` on the row where the PDF prints it.

| Example | Row where it is printed | PDF text | Page |
|---|---|---|---|
| Florida Blue | `inpatient_hospital` (hospital stay, facility fee) | "Inpatient Rehab Services limited to 21 days." | 4 |
| GatorCare | `inpatient_hospital` (hospital stay, facility fee) | "Inpatient Rehab Services limited to 21 days." | 3 |
| United | `rehabilitation_services` | "Limits per calendar year: Physical, Speech, Occupational, Pulmonary: Unlimited: Cardiac: 90 visits." | 5 |
| United | `skilled_nursing_facility` | "(Inpatient Rehabilitation and Habilitation limited to 90 days each)." | 5 |

### 9.5 Cost-share cap

BPS v1.1.0 has no field for a dollar cap on a cost-share step. Both Aetna SBCs print "$250 (preferred) and $500 (non-preferred) maximum copay for each 30 day supply." for specialty drugs (p. 3). The Aetna examples carry it as a condition of type `cost_share_cap` and in the specialty cost share's `notes`. The v1.2.0 draft adds `max_amount` and `max_basis` on cost shares (Medicare Advantage gap G6), which would hold it as data.

## 10. Determinism

| Item | Rule |
|---|---|
| Purity | `buildDocument(planRow, planHeader, benefitRows, source)` makes no network call, reads no clock, uses no randomness and keeps no state. The CLI streams the files and passes the rows in. |
| Download date | An input, from `download.json` or `--downloaded`; never the clock. |
| Benefit order | File order of the plan's rows. Unmapped names are listed in file order. |
| Key order | Fixed: plan fields in the order of 4.1 (`plan_id` first, `schema_version` last); benefit, tier and step fields in the order of 5.3 to 5.5; accumulator slots in schema order. |
| Numbers | Rates are `Number((R / 100).toFixed(6))`, so `7.00%` gives `0.07`. Amounts are exact. |
| Text | Verbatim, trimmed at both ends; no other normalization. |
| Serialization | `JSON.stringify(doc, null, 2)` plus `\n`, UTF-8, LF line endings. |

The same 2 files and download date always give byte-identical output. The test checks it on the 3 golden plans; a separate run over every PY2026 plan variant gave no error.

## 11. How to run

**Get the files** (once per plan year):

```
mkdir -p data/puf/2026 && cd data/puf/2026
curl -O https://download.cms.gov/marketplace-puf/2026/plan-attributes-puf.zip
curl -O https://download.cms.gov/marketplace-puf/2026/benefits-and-cost-sharing-puf.zip
unzip plan-attributes-puf.zip && unzip benefits-and-cost-sharing-puf.zip
```

Then write `data/puf/2026/download.json` with at least `{"downloaded": "YYYY-MM-DD"}` (the files used for the examples also record the URLs and SHA-256 hashes), or pass `--downloaded` on each run.

**Import and inspect:**

```
node scripts/from-marketplace-puf.js --year 2026 --issuer 40220 --state TX           # list an issuer's plans
node scripts/from-marketplace-puf.js --year 2026 --plan 40220TX0080024-01 --out uhc-gold.json
node scripts/validate.js --schema schema/v1.1.0/benefit-plan.schema.json uhc-gold.json
node scripts/to-insuranceplan.js uhc-gold.json -o uhc-gold.bundle.json             # FHIR
node scripts/puf-parse-report.js                                                   # docs/specs/marketplace-puf-parse-report.md
node scripts/from-marketplace-puf.js --write-golden                                # regenerate the 3 examples, on purpose only
node --test scripts/from-marketplace-puf.test.js
```

A plan import streams both files and takes about 7 seconds for PY2026. Exit code 0 means written; 1 means an error, with nothing written.

## 12. Re-running for a new plan year

1. Download the year's 2 files into `data/puf/<year>/` and write `download.json` (section 11). The importer finds the CSVs by name pattern, so a renamed file needs no code change as long as the names still contain "plan attributes" and "benefits ... cost sharing".
2. Read the year's 2 data dictionaries (same URL pattern, `...-py<yy>.pdf`) for changed columns or new allowed values. Columns the importer reads: section 4 and 5. A renamed column shows up as blank values, so compare the header first.
3. Run `node scripts/puf-parse-report.js --year <year> --out <file>`. Every new cost-share form appears in the unreadable table. Extend the grammar (section 6 and `parseCostShare`) only for forms the dictionary lists, and add a test case for each.
4. List the year's distinct `BenefitName` values and compare them with the crosswalk. New names are imported as unmapped ("not in the crosswalk"); add each to `fhir/marketplace-puf-crosswalk.json` under the rule in 5.2 and update `counts`.
5. Import a few plans, validate them, convert them, and run the HL7 validator as in `examples/fhir/VALIDATION.md`.

Known data issue in PY2023: 33 plan variants of 1 Wyoming issuer (HIOS issuer 11269) have "Dental Check-Up for Children" rows with `LimitUnit` "Visit(s) per 6 Months" and a blank `LimitQty`. The importer refuses those plans (5.6); every other PY2023 medical plan variant imports.

## 13. Tests and golden files

`scripts/from-marketplace-puf.test.js`, run with `node --test scripts/from-marketplace-puf.test.js`:

- CSV parser: quoted commas, doubled quotes, line breaks in fields, CRLF, LF, CR, byte order mark, any chunk size, unterminated quote.
- Grammar: every accepted form, and a list of near-miss strings that must be unreadable with the string quoted.
- Limits and plan-attribute dollar cells.
- `buildDocument` on a small synthetic plan: the mapping rules, tier 2 detection, an unreadable string stopping the import, determinism.
- Crosswalk: unique names, keys and categories in the vocabularies, counts.
- The 3 golden files validate against v1.1.0.
- With the public files present: each golden plan is re-imported and compared byte for byte (after CRLF normalization), imported twice with identical output, and checked that every benefit row is either a benefit or listed as unmapped. Without the files these 3 tests are skipped and say why.

The golden plans:

| File | Plan | Year | Why |
|---|---|---|---|
| `florida-blue-blueoptions-gold-1505.puf.json` | Florida Blue, BlueOptions Gold 1505, 16842FL0070120-01, Gold EPO | 2023 | The comparison with the BlueOptions 505 SBC example. No PY2023 row matches 505 (the comparison document gives the search). Has tier 2. |
| `blue-cross-and-blue-shield-of-louisiana-blue-max-copay-50-50.puf.json` | Blue Cross and Blue Shield of Louisiana, Blue Max Copay (PCP) 50/50 $3300 with 2 $0 PCP Virtual Visits, 97176LA0340010-01, Silver PPO | 2026 | Separate medical deductible, out-of-network values, limits, long explanation text. |
| `unitedhealthcare-uhc-gold-standard.puf.json` | UnitedHealthcare, UHC Gold Standard, 40220TX0080024-01, Texas, Gold HMO | 2026 | Integrated medical and drug accumulators, 100% out-of-network coinsurance, per-month drug limits. |

FHIR Bundles for the 3 plans, and their validator record, are in `examples/fhir-puf/`. They are not golden files and are not published.
