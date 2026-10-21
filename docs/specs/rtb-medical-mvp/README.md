# Medical MVP technical specification

Diego Orofino, the Benefit Plan Standard, dorofino@benefitplanstandard.org. A draft for the workgroup, not a workgroup decision.

The [Benefit Plan Standard](https://benefitplanstandard.org) is an open JSON format for health plan benefits, published under the MIT license. Its schema, the importers that read CMS public files, the converter to FHIR and the example plans live in [one repository](https://github.com/Benefit-Plan-Standard/benefit-plan-schema). This document is the technical specification, version 0.2, dated October 20, 2026, 1 of 3 documents that make up the medical MVP technical specification for the CMS Health Tech Ecosystem Real-Time Benefits workgroup. The other 2 are the [data dictionary](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/data-dictionary.md) and the [crosswalk to the SBC InsurancePlan profile](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/carin-crosswalk.md). All 3 are in the [repository folder](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/tree/main/docs/specs/rtb-medical-mvp), and the files they name are in the [repository](https://github.com/Benefit-Plan-Standard/benefit-plan-schema). This document is published as `README.md` in that folder; a Word copy carries the same content.

The specification is 5 files in the repository folder, and 4 scripts that sit with the Benefit Plan Standard repository's other scripts:

| File | What it is |
|---|---|
| [`README.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/README.md) | This document, with the purpose, scope, how a plan is identified, retrieval and the file contract, what a pledgee publishes, how to read the dictionary, the known gaps, a worked example, conformance with its proposed numbers, the status and the follow-ups. |
| [`data-dictionary.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/data-dictionary.md) | Every item in scope, where it is in a Benefit Plan Standard document, and where each importer reads it in the CMS files. Generated; do not edit it. |
| [`shall-should.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/shall-should.json) | The SHALL and SHOULD assignments, 1 entry per item, with the field paths, the CMS columns and the known gaps. The dictionary and the crosswalk are generated from it. |
| [`carin-crosswalk.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/carin-crosswalk.md) | Every row of the dictionary mapped to the SBC InsurancePlan profile of the CARIN Digital Insurance Card implementation guide (SBC stands for Summary of Benefits and Coverage), with where the value lands in the Bundle and 1 of 3 verdicts. Generated; do not edit it. |
| [`carin-mapping.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/carin-mapping.json) | For each item and program, the profile element, the verdict, the note and the converter spec sections the verdict is read from. The crosswalk is generated from it. |
| [`scripts/build-rtb-dictionary.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/build-rtb-dictionary.js) | The dictionary generator. It reads `shall-should.json`, the 2 importer crosswalks and the canonical benefit vocabulary, and writes [`data-dictionary.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/data-dictionary.md). |
| [`scripts/build-rtb-crosswalk.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/build-rtb-crosswalk.js) | The crosswalk generator. It reads `shall-should.json`, `carin-mapping.json` and the Benefit Plan Standard repository's [`fhir/carin-sbc-crosswalk.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/fhir/carin-sbc-crosswalk.json), takes the item names and field paths from the dictionary generator, and writes [`carin-crosswalk.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/carin-crosswalk.md). |
| [`scripts/rtb-completeness.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/rtb-completeness.js) | The completeness count. It reads `shall-should.json` and 1 or more documents, and prints for each plan how many of the SHALL items that apply to it the document populates (Conformance). |
| [`scripts/build-rtb-docx.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/build-rtb-docx.js) | Writes the Word copies of the 3 documents. Run `npm install docx` once, then `node scripts/build-rtb-docx.js`; it writes `rtb-medical-mvp-specification-<version>.docx`, `-data-dictionary-` and `-carin-crosswalk-` into `dist/`, which is git-ignored. The Markdown is the source; a Word copy carries the same content. |

## Purpose

The medical MVP answers questions about plan design. The workgroup's 4 use cases ask what the plan covers and what the member pays (use case 1), whether the cost changes with where the member goes (use case 2), whether a service has a limit (use case 3), and whether the plan covers an extra benefit such as hearing aids (use case 4). CMS already publishes these answers for Medicare Advantage and Marketplace plans. This specification says which items a pledgee makes available to the member and where each item is, both in the CMS files and in a Benefit Plan Standard document, so an app can ask the same question the same way for either program.

Medical is a plan-level document, not a priced transaction. There is no request and response for 1 service. An app identifies the plan and reads the answer from the plan's document.

## Scope

### Programs and data

| Program | CMS files | Year | Importer |
|---|---|---|---|
| Medicare Advantage | Plan Benefit Package (PBP) Benefits, release "PBP Benefits-2027" | Contract year 2027 | [`scripts/from-pbp.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/from-pbp.js), spec [`pbp-importer.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/pbp-importer.md), in the Benefit Plan Standard repository |
| Marketplace | Health Insurance Exchange public use files (PUFs): the Plan Attributes PUF and the Benefits and Cost Sharing PUF | Plan year 2026 | [`scripts/from-marketplace-puf.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/from-marketplace-puf.js), spec [`marketplace-puf-importer.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/marketplace-puf-importer.md), in the Benefit Plan Standard repository |

The Medicare Advantage importer takes HMO, HMO-POS, local PPO and regional PPO plans and refuses other plan types. The Marketplace files cover plans sold through HealthCare.gov, in 30 states for plan year 2026; states that run their own exchange publish elsewhere. The 2 programs use different years in the same MVP, which is why every answer carries its plan year and the date of the CMS data. The SHALL and SHOULD assignments follow the workgroup's medical MVP scope (Monica Chopra's pledge proposal, October 2026).

### What a pledgee makes available

These items are SHALL in both programs:

- the plan year and the date of the CMS data, on every answer;
- the plan-level fields that apply to the member's plan;
- the in-network cost of 16 services: the 12 core services, 3 more care settings from use case 2, and preventive services at $0 in network;
- the use case 2 network items: in-network against out-of-network cost, the out-of-network deductible and out-of-pocket maximum, combined in- and out-of-network amounts, and the provider directory link, plus, for Medicare Advantage HMO-POS plans, the point-of-service cost and, for Marketplace plans with a second in-network tier, the cost in that tier;
- whether the plan covers each of 10 extra benefits.

These items are SHOULD:

- the cost, conditions and limits of the 10 extra benefits;
- telehealth, in Medicare Advantage;
- the employer group plan flag, in Medicare Advantage.

Use case 3, limits on a service, has no SHALL in the MVP. This is a known gap, to revisit for GA. Limits on the 10 extra benefits are SHOULD.

The 2 programs file different services, so the lists differ where the files do:

| | Medicare Advantage | Marketplace |
|---|---|---|
| Outpatient care | Outpatient hospital services (`outpatient_surgery`) and outpatient surgery center (`outpatient_surgery_facility`) | Facility fee (`outpatient_surgery_facility`) and doctor's fee (`outpatient_surgery_professional`) |
| Therapy | Physical therapy and speech therapy, priced together (no canonical key, gap G1) | Physical therapy and occupational therapy (`physical_and_occupational_therapy`) |
| Mental health | Individual session (`mental_health_office_visit`) | Outpatient services (`mental_health_outpatient`) |
| Third extra care setting | Hospital observation (`observation_care`) | Nurse or physician assistant visit (`other_practitioner_office_visit`) |
| Extra benefits | Hearing aids, routine eye exam, dental cleanings, fillings, eyeglasses, over-the-counter allowance, fitness, rides to medical appointments, meals, routine hearing exam | Hearing aids, routine eye exam, routine, basic and major adult dental care, chiropractic care, acupuncture, routine foot care, infertility treatment, weight loss surgery |

### Not in scope

The MVP does not answer questions that need the member's own numbers, such as visits used or deductible met, or a price for a specific service from a specific provider. Neither program's public files say which providers are in a plan's network. The Marketplace monthly premium depends on the member's age and area and is not in the 2 files the Marketplace importer reads.

## Identifying the plan

This specification starts from the plan key. How an app learns which plan the member is on, whether from the member, an insurance card or a connection to the payer, is outside it.

### Medicare Advantage

A plan is a contract, a plan and a segment, which the PBP files call `bid_id`. The importer writes the key as `H1609-028-000`: the 5-character contract, the 3-digit plan and the segment padded to 3 digits. The PBP files' own `bid_id` column writes the same key as `H1609_028_0`. The 2 forms are the same key. The document carries the key in `plan_identifiers`, with system `cms_contract_plan_segment`, and quotes the file's `bid_id` value in `source_references`.

An eligibility response from the HIPAA Eligibility Transaction System (HETS 271) gives the contract and the plan but not the segment. In the contract year 2027 files, 266 contract and plan pairs have more than 1 segment, and in every one the segments serve different counties, so the member's county picks the segment (PBP importer spec section 4.1).

### Marketplace

A plan is a plan variant: the 14-character HIOS plan id, assigned by CMS's Health Insurance Oversight System, and a 2-digit variant, for example `68398FL0030058-01`. The files call this `PlanId`. The variant matters, because the cost-sharing reduction variants of 1 plan have different costs. The importer also takes the 14-character id alone and picks its `-01` variant when there is one (Marketplace importer spec section 5.1).

A Marketplace document is written in schema 1.1.0, which has no `plan_identifiers`, so the key appears only as text in the first `source_references` excerpt (gap G7).

## Retrieval and the file contract

This is a file contract, not an API. It describes documents an app retrieves, not endpoints, and there is no hosted service.

### What comes back

For each plan, 2 files:

1. The Benefit Plan Standard JSON document for the plan. The importer checks it against the schema before writing it: schema 1.2.0 for Medicare Advantage, 1.1.0 for Marketplace. An import that fails writes nothing.
2. The SBC InsurancePlan Bundle that the Benefit Plan Standard repository's [`scripts/to-insuranceplan.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/to-insuranceplan.js) produces from that document: a FHIR R4 collection Bundle holding 1 InsurancePlan and the Organization it references, in the SBC InsurancePlan profile of the CARIN Digital Insurance Card implementation guide (`hl7.fhir.us.insurance-card#2.0.0-ballot`, a ballot draft). For a Marketplace document, `--excluded-services` also writes the excluded-services extension of the CARIN Digital Insurance Card implementation guide, derived from the plan's coverage flags. The converter spec is [`insuranceplan-converter.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/insuranceplan-converter.md), in the Benefit Plan Standard repository.

The documents quote the CMS cells they were read from. Each tier row of a benefit quotes its cells in `notes`, except a Marketplace row that is not covered (Follow-ups), and a value with no field is quoted in `source_references`.

The crosswalk to the SBC InsurancePlan profile in the CARIN Digital Insurance Card implementation guide is a Part B item in the workgroup's GA draft, the document "RTB Medical. What payers would be asked to supply for GA" (Monica Chopra, October 2026, a draft for discussion, not a workgroup decision) (the profile is at ballot), not a GA ask; the crosswalk, [`carin-crosswalk.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/carin-crosswalk.md), exists so a pledgee can produce that Bundle when the profile publishes, and nothing in the MVP's SHALL list depends on it.

### How to get them

Run the importers on the CMS files, or read the published examples.

The importers need Node.js 18 or later and a local copy of Ajv for the schema check:

```sh
git clone https://github.com/Benefit-Plan-Standard/benefit-plan-schema.git
cd benefit-plan-schema
npm install ajv ajv-formats
```

For Medicare Advantage, each import records the download date, so write `data/pbp/2027/download.json` with `{"downloaded": "YYYY-MM-DD", "release_label": "PBP Benefits-2027"}`, or pass `--downloaded YYYY-MM-DD`.

```sh
mkdir -p data/pbp/2027 && cd data/pbp/2027
curl -L -O https://www.cms.gov/files/zip/pbp-benefits-2027.zip
unzip pbp-benefits-2027.zip
cd ../../..
node scripts/from-pbp.js --year 2027 --plan H1609-028-000 --out h1609-028-000.json
node scripts/to-insuranceplan.js h1609-028-000.json -o h1609-028-000.bundle.json
```

For Marketplace plans, write `data/puf/2026/download.json` with `{"downloaded": "YYYY-MM-DD"}`, or pass `--downloaded YYYY-MM-DD`. The importer reads 2 files, the Plan Attributes PUF and the Benefits and Cost Sharing PUF. It does not read the Network PUF today (gap G5).

```sh
mkdir -p data/puf/2026 && cd data/puf/2026
curl -O https://download.cms.gov/marketplace-puf/2026/plan-attributes-puf.zip
curl -O https://download.cms.gov/marketplace-puf/2026/benefits-and-cost-sharing-puf.zip
unzip plan-attributes-puf.zip && unzip benefits-and-cost-sharing-puf.zip
cd ../../..
node scripts/from-marketplace-puf.js --year 2026 --plan 68398FL0030058-01 --out 68398FL0030058-01.json
node scripts/to-insuranceplan.js --excluded-services 68398FL0030058-01.json -o 68398FL0030058-01.bundle.json
```

On the files used for the examples, these 4 commands write documents and Bundles byte-identical to the 2 examples below, in the Benefit Plan Standard repository.

| Plan key | Plan | Document | Bundle |
|---|---|---|---|
| `H1609-028-000` | Aetna Medicare Select Extra (HMO-POS), Medicare Advantage | [`examples/aetna-medicare-aetna-medicare-select-extra.pbp.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/examples/aetna-medicare-aetna-medicare-select-extra.pbp.json) | [`examples/fhir/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/examples/fhir/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json), also [published on the site](https://benefitplanstandard.org/fhir/InsurancePlan/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json) |
| `68398FL0030058-01` | UHC Bronze Essential, Marketplace | [`examples/unitedhealthcare-uhc-bronze-essential.puf.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/examples/unitedhealthcare-uhc-bronze-essential.puf.json) | [`examples/fhir-puf/unitedhealthcare-uhc-bronze-essential.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/examples/fhir-puf/unitedhealthcare-uhc-bronze-essential.json), in the repository only |

The Benefit Plan Standard repository has 5 examples for each program: [`examples/*.pbp.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/tree/main/examples) with their Bundles in [`examples/fhir/`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/tree/main/examples/fhir), and [`examples/*.puf.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/tree/main/examples) with their Bundles in [`examples/fhir-puf/`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/tree/main/examples/fhir-puf). The [site's index](https://benefitplanstandard.org/fhir/index.json) lists 15 Bundles: the 5 Medicare Advantage Bundles and 10 read from plan documents. The Marketplace Bundles are not on the site.

### Source, date and refresh

Section 5 of the GA draft, "MVP accuracy and QA", asks that every answer carry its source and date (its check 2, "Source and date on every answer") and that the data be refreshed with each CMS release (its check 6, "Refresh with each CMS release"). This section is where both land.

Every document a pledgee publishes, and every answer an app builds from it, SHALL carry:

- the plan year;
- the CMS files and their release, which for Medicare Advantage is the release label, `PBP Benefits-2027`, and for Marketplace is the Plan Attributes PUF and the Benefits and Cost Sharing PUF for plan year 2026, by file name and download address;
- the date the files were downloaded;
- a link to the plan's official documents where the CMS files give one, and otherwise a statement that they give none.

The importers write the first 3 into every document. What they can write differs by program, because the CMS files differ.

**Medicare Advantage.** The importer writes the plan year in `plan_year`, and the release label, the download address and the download date in the first `source_references` excerpt, which for `H1609-028-000` begins `CMS Plan Benefit Package (PBP) Benefits, contract year 2027, release "PBP Benefits-2027" (https://www.cms.gov/files/zip/pbp-benefits-2027.zip), downloaded 2026-10-06.` It reads the label and the date from the download record, `data/pbp/<year>/download.json`. The download record used for the examples also holds the SHA-256 hash of the zip and of each file in it; the importer does not copy the hashes into the document.

**Marketplace.** The importer writes the plan year in `plan_year`, and the 2 file names, their download addresses and the download date in the first excerpt. It reads the date from the download record, `data/puf/<year>/download.json`, which for the examples also holds the 2 addresses and the SHA-256 hash of each file, and has no release label. Each file has its own `ImportDate` column (October 15, 2025, on both files' rows for `68398FL0030058-01`), which the importer does not carry today (gap G6). Until G6 closes, the release identifier for a Marketplace document is the download date together with the SHA-256 hashes. The hashes are in the download record, not in the document, so the document by itself identifies its release by the download date only.

For the link, the Plan Attributes PUF gives 3 addresses for each plan: the Summary of Benefits and Coverage (`URLForSummaryofBenefitsCoverage`), the brochure (`PlanBrochure`) and the drug list (`FormularyURL`). The Marketplace importer quotes all 3 in `source_references`. The PBP files give no address for the plan's Summary of Benefits. Section A gives the plan's website, provider directory, drug list and pharmacy directory (`pbp_a_org_website`, `pbp_a_phys_web_addr`, `pbp_a_formulary_web_addr`, `pbp_a_pharmacy_website`), and the Medicare Advantage importer quotes all 4. So for the plan's benefits, a Medicare Advantage answer links the plan's page on Medicare Plan Finder, found by contract and plan, or says that the CMS files give no link to the Summary of Benefits. That link is a rule for the pledgee; the importer writes none.

A pledgee SHALL rerun the importers on every new or corrected CMS release, publish 1 document version per release, and retire a plan year's documents when the plan year ends, so that no app serves a past year as current. The PBP Readme, `Readme_PBP_Benefits_2027.txt`, says the PBP Benefits file is updated quarterly. The proposed cadence for the MVP is within 7 days of a CMS release (proposal for the workgroup to set).

Of these, the importers do 2 things today: every document they write carries its download date, and every Medicare Advantage document carries its release label. The version per release and the retirement at the end of the plan year are rules for the pledgee, and nothing in the repository does them. The importers read 1 release per year folder (`data/pbp/2027/`, `data/puf/2026/`), so 2 releases of 1 year cannot sit side by side, and a pledgee keeps the earlier release's files elsewhere to compare them (section 12 of each importer spec).

## What a pledgee publishes

This is the minimum contract, what a pledgee publishes for each plan and what a reader may assume. It describes what the importers and the converter produce today.

For each plan, a pledgee publishes the 2 files under What comes back: the Benefit Plan Standard document and the SBC InsurancePlan Bundle made from it. The importers and the converter write the file names they are given (`--out`, `-o`). A pledgee names the 2 files by plan key, `<plan key>.json` and `<plan key>.bundle.json`, as the commands under How to get them do.

An index lists the published Bundles, in the pattern of the site's [`fhir/index.json`](https://benefitplanstandard.org/fhir/index.json), which the Benefit Plan Standard repository's [`scripts/publish-fhir.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/publish-fhir.js) writes. It is 1 JSON file with 1 entry per Bundle, giving `id`, `plan_name`, `carrier`, `plan_type`, `plan_year`, `bps_schema_version`, the document (`bps_example`), the Bundle (`path` and `url`), and the counts `benefits_placed` and `benefits_unmapped`. An entry has no plan key today (Follow-ups).

A document counts when it carries all 6 of these:

1. It passes its schema, 1.2.0 for Medicare Advantage and 1.1.0 for Marketplace. The importers check this before writing, and an import that fails writes nothing.
2. The plan key, in `plan_identifiers` for Medicare Advantage, and as text in the first `source_references` excerpt for Marketplace (gap G7).
3. The plan year, in `plan_year`.
4. The release. For Medicare Advantage this is the release label. For Marketplace it is the 2 file names and addresses, with the download date and the hashes as the release identifier until G6 closes.
5. The download date, in the first excerpt.
6. The CMS cells behind its values. Every tier row with a cost share quotes its cells in `notes`, a Medicare Advantage row that is not covered quotes the cell that says so, and a value with no field is quoted in `source_references`. A Marketplace row that is not covered quotes no cell today, because the importer does not quote `IsCovered` (Follow-ups).

A reader may assume nothing beyond the files. There is no hosted service and no request for 1 service. An app retrieves the plan's document or its Bundle and reads the answer from it, and a benefit missing from a document means the CMS files hold no answer for it (Reading the data dictionary).

## Reading the data dictionary

[`data-dictionary.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/data-dictionary.md) has 106 rows in 5 sections: the plan key, plan year and date of the data; plan-level fields; network items; services with a cost; and the extra benefits. Each extra benefit has 3 rows, for whether it is covered (SHALL), its cost and conditions (SHOULD), and its limits (SHOULD).

| Column | What it holds |
|---|---|
| Item | The workgroup's name for the service or benefit, with the canonical key from the Benefit Plan Standard repository's [`vocabularies/canonical-benefits.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/vocabularies/canonical-benefits.json) beside it. Where the 2 programs name an item differently, both names are shown. Plan-level items carry short names of ours. |
| Field path | Where the value is in the document. `benefits[canonical_key=primary_care]` is the item of `benefits` whose `canonical_key` is `primary_care`; `[]` means every item and `[0]` the first. |
| Meaning | What the item is, in 1 sentence. |
| Medicare Advantage, Marketplace | The label for that program, then where the importer reads the item: the CMS file and its columns, the PBP category, or the exact Marketplace BenefitName. |
| Note | How the importer reads the columns, anything not in the CMS file, and the full text of any gap that touches the row. |

The labels are SHALL, SHOULD and Key. Key marks the plan key, which an app uses to find the document and does not show the member. "Not on the Medicare Advantage list" or "Not on the Marketplace list" means the scope does not ask for the item in that program; where a crosswalk still maps the key, the cell names the rows.

"Not in the CMS file" and a gap are different things. "Not in the CMS file" means the files the importer reads cannot carry the item for that program, so there is nothing for an importer to fix; the note says what the importer writes instead. Medicare Advantage coverage dates are an example: no PBP file has a date column. A gap means the scope asks for something the CMS file has, but the importer or the schema does not carry it today. Gaps can be closed, and the next section lists them.

"Quoted verbatim in `source_references`" means the CMS file has the value and the schema has no field for it, so the importer copies the column and its value into a `source_references` excerpt. "(not read)" marks a column that is in the CMS file but that the importer does not read today.

A benefit missing from a document means the files hold no answer for it. It never means the plan does not cover the benefit. A benefit the plan does not cover is written with `covered` false on every tier. For Medicare Advantage dental cleanings and fillings, `covered` false can also mean the plan filed no dental entry, and the row's notes say so.

To regenerate the dictionary, run `node scripts/build-rtb-dictionary.js`; `--check` exits 1 if the file on disk differs. The generator stops, and names the item, when a SHALL item has no canonical key or no crosswalk row and `shall-should.json` records no gap for it, when a field path is not in the program's schema, or when a column named as read is in neither the importer nor its example documents.

## Known gaps in this version

The importers do not yet carry 8 things the scope asks for. Closing them is work on the importers, with a vocabulary key for G1 and possibly a schema field for G4 and G5; none is a change to the scope. Each gap is repeated in the note of every dictionary row it touches.

- **G1.** The PBP files price physical therapy and speech therapy together (category 7i), and the vocabulary has no key for that pair. The Medicare Advantage importer writes the benefit by name, `PHYSICAL_AND_SPEECH_THERAPY`, without a canonical key.
- **G2.** The Medicare Advantage importer does not read preventive services (category 14a), so a Medicare Advantage document has no `preventive_care` benefit. The plan's answer is in `pbp_b14a_mc_prevent_attest`.
- **G3.** The Medicare Advantage importer does not read the monthly premium or the Part B premium reduction, although the schema has `premium` and `part_b_premium_reduction`.
- **G4.** The Medicare Advantage importer does not read the member services phone, and the schema has no field for it. The plan's website is quoted in `source_references`.
- **G5.** The schema has no field for the provider directory link. The Medicare Advantage importer quotes the address in `source_references`; the Marketplace importer does not read the Network PUF, where the address is. The proposed field is `network_tiers[].provider_network`, in the Benefit Plan Standard repository's [`provider-directory-schema-proposal.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/provider-directory-schema-proposal.md).
- **G6.** The Marketplace importer does not carry the files' `ImportDate`. It records the date the files were downloaded instead.
- **G7.** Marketplace documents are written in schema 1.1.0, which has no `plan_identifiers`, so the plan key is only text in the first `source_references` excerpt.
- **G8.** The Marketplace importer quotes whether the plan covers care outside its service area or outside the country, but does not read the 2 columns that describe that coverage, so no field is written for them.

## Worked example

This section walks 1 member question end to end, for 1 plan in each program: "What does this plan charge for a primary care visit, and does it need prior authorization?" Every value is read from the 2 example documents, their Bundles and the CMS files they were made from.

| | Medicare Advantage | Marketplace |
|---|---|---|
| Plan key | `H1609-028-000`, Aetna Medicare Select Extra (HMO-POS) | `68398FL0030058-01`, UHC Bronze Essential ($0 Virtual Urgent Care) |
| CMS file and row | `pbp_b7_health_prof.txt`, the row whose `bid_id` is `H1609_028_0`, category 7a | `benefits-and-cost-sharing-puf.csv`, the row whose `PlanId` is `68398FL0030058-01` and whose `BenefitName` is "Primary Care Visit to Treat an Injury or Illness" |
| Document path | `benefits[canonical_key=primary_care].network_cost_shares[tier_id=IN]` | `benefits[canonical_key=primary_care].network_cost_shares[tier_id=IN]` |
| In-network value | Covered, 1 copay step of $0, `applies_to_deductible` false | Covered, 1 coinsurance step at rate 0, `applies_to_deductible` true |
| Cells quoted in `notes` | `pbp_b7a_copay_yn "1"`, `pbp_b7a_copay_amt_mc_min "0.00"`, `pbp_b7a_copay_amt_mc_max "0.00"`, `pbp_b7a_coins_yn "2"`, `pbp_b7a_ded_yn "2"` | `CopayInnTier1 "Not Applicable"`, `CoinsInnTier1 "No Charge after deductible"` |
| Deductible | None in network. `source_references` quotes `pbp_d_inn_deduct_yn "2"`, and no slot is written. | `accumulators.individual_deductible`, $10,600, from `TEHBDedInnTier1Individual "$10,600"` |
| Outside the network | No `POS` row, because no `pbp_Section_C_POS.txt` group lists 7a. The Summary of Benefits prints "Not Covered" (Accuracy, reading kind 1). | `network_cost_shares[tier_id=OUT]`, coinsurance at rate 1, from `CoinsOutofNet "100.00%"` |
| Prior authorization | `conditions` is empty. `pbp_b7_health_prof.txt` has no authorization or referral column for 7a (categories 7b to 7k have `_auth_yn` and `_refer_yn`), so the file does not say. | Not in the CMS file. The plan-level referral answer is quoted in `source_references`: `IsReferralRequiredForSpecialist "Yes"`, `SpecialistRequiringReferral "All, except OBGYN and as state mandated."` |
| Other conditions | None | 1 explanation in `conditions`, "Cost sharing for Virtual Primary Care matches in-person office visit." |
| Bundle element | `InsurancePlan.plan[0].specificCost[0]`, category `primary-care-visit`, with a `copay` cost, `in-network`, value 0 USD, `deductible-applies` false, and an `out-of-network` cost typed "Not stated in the BPS document", whose value carries the `data-absent-reason` `unknown` | `InsurancePlan.plan[0].specificCost[18]`, category `primary-care-visit`, with a `copaypct` cost, `in-network`, value 0 percent, `deductible-applies` true, and an `out-of-network` cost of 100 percent |
| Plan year and as-of date | 2027, release `PBP Benefits-2027`, downloaded 2026-10-06 | 2026, the Plan Attributes PUF and the Benefits and Cost Sharing PUF for plan year 2026, downloaded 2026-10-05 |

In both documents the plan year is in `plan_year`, and the release and the download date are in the first `source_references` excerpt. In both Bundles they are in the `planYear` part of the `bps-plan-metadata` extension and in the first `bps-source-reference` extension.

For the Aetna plan, an app answers that a primary care visit costs $0 in network with no deductible, for plan year 2027, from release PBP Benefits-2027 downloaded October 6, 2026. The CMS file does not say whether the visit needs prior authorization, and it gives no point-of-service cost for the visit.

For the UHC plan, an app answers that the file says "No Charge after deductible" in network, with a $10,600 deductible, and 100 percent out of network, for plan year 2026, from the files downloaded October 5, 2026. Whether the visit needs prior authorization is not in the CMS file. The plan's referral answer, which is about specialists, travels with the document.

## Conformance

Everything in this section is a proposal for the workgroup to set. Each of the 3 measures has a starting number with its reason, and the last subsection proposes a rule for moving SHOULD items to SHALL at GA. The workgroup sets the numbers and can change any of them.

### Completeness (proposal for the workgroup to set)

Of the SHALL items in scope that apply to a plan, how many the plan's document populates. It is counted per plan, for each program.

The proposed threshold is 90 percent for each plan. The 5 Marketplace examples meet it today, and the 5 Medicare Advantage examples would meet it once G2 and G3 close (92.3 to 93.0 percent), which is work on the importer with no schema change.

[`scripts/rtb-completeness.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/rtb-completeness.js) does the count, and its header states each rule. It counts every item labelled SHALL for the plan's program and the covered-or-not aspect of each extra benefit on the program's list; KEY and SHOULD items are not counted. A few items apply only to some plans: the out-of-network and point-of-service items to plans with that option, the separate drug deductible to Marketplace plans that keep one, and the second-tier items to Marketplace plans with a second in-network tier. An item with a known gap counts as a miss even where the document carries part of it, so every gap shows in the number. Any other item is populated when the document holds its answer: the field, or the CMS cell quoted in `source_references` where the schema has no field or the plan files none, such as a deductible of "Not Applicable".

Run on the 10 examples, `node scripts/rtb-completeness.js --misses` gives:

| Plan key | Plan | Program | Plan year | Populated | Applicable | Percent | Misses |
|---|---|---|---|---|---|---|---|
| `H1609-028-000` | Aetna Medicare Select Extra (HMO-POS) | Medicare Advantage | 2027 | 37 | 43 | 86.0 | G1, G2, G3 (2 items), G4, G5 |
| `H1036-068-000` | Humana Gold Plus H1036-068 (HMO) | Medicare Advantage | 2027 | 33 | 39 | 84.6 | G1, G2, G3 (2 items), G4, G5 |
| `H5425-140-000` | SCAN Costco Medicare Advantage (HMO) | Medicare Advantage | 2027 | 33 | 39 | 84.6 | G1, G2, G3 (2 items), G4, G5 |
| `H2406-013-000` | AARP Medicare Advantage from UHC FL-0021 (PPO) | Medicare Advantage | 2027 | 37 | 43 | 86.0 | G1, G2, G3 (2 items), G4, G5 |
| `H5533-019-000` | UPMC for Life PPO Rx Choice (PPO) | Medicare Advantage | 2027 | 37 | 43 | 86.0 | G1, G2, G3 (2 items), G4, G5 |
| `19898FL0340001-01` | AvMed Entrust Gold 125 (2026) | Marketplace | 2026 | 45 | 49 | 91.8 | G5, G6, G8, plan-wide exclusions |
| `97176LA0340010-01` | Blue Max Copay (PCP) 50/50 $3300 with 2 $0 PCP Virtual Visits | Marketplace | 2026 | 44 | 48 | 91.7 | G5, G6, G8, plan-wide exclusions |
| `16842FL0070120-01` | BlueOptions Gold 1505 | Marketplace | 2023 | 45 | 49 | 91.8 | G5, G6, G8, plan-wide exclusions |
| `68398FL0030058-01` | UHC Bronze Essential ($0 Virtual Urgent Care) | Marketplace | 2026 | 44 | 47 | 93.6 | G5, G6, G8 |
| `40220TX0080024-01` | UHC Gold Standard | Marketplace | 2026 | 44 | 47 | 93.6 | G5, G6, G8 |

BlueOptions Gold 1505 is read from the plan year 2023 files and is in the table as an example of the format, not as MVP data; the MVP's Marketplace year is 2026.

The 5 Medicare Advantage examples are under the proposed 90 percent today. The number is a target, not a claim. Every Medicare Advantage miss is a known gap, the same 6 items on every plan. A Medicare Advantage plan has 43 applicable items, or 39 for an HMO, which has no out-of-network cost, deductible, maximum or combined amounts. A Marketplace plan has 47, 1 more when the drug deductible is separate and 2 more when the plan has a second in-network tier. Every Marketplace plan misses G5, G6 and G8, and 3 plans also miss the plan-wide exclusions, because their `PlanLevelExclusions` cell is blank in the Plan Attributes PUF. G7 touches only the plan key, which is not counted.

### Accuracy (proposal for the workgroup to set)

On a checked sample of plans, how many values agree with the carrier's own plan document: the Summary of Benefits for a Medicare Advantage plan, the Summary of Benefits and Coverage for a Marketplace plan. This is check 1b in section 5 of the GA draft, "CMS filing agrees with the plan's own documents".

The proposed threshold is 0 contradictions on the checked sample, with every reading documented, because a contradiction means the member could get a different answer from the plan than from the app. A contradiction is a defect to fix in the importer or a correction to report, and it is never corrected silently. The GA draft's check 1a, "Faithful conversion", already asks for 100 percent; this is the number for check 1b.

The CMS file is the source and the carrier document is the check. When they disagree, the CMS file is what the MVP serves, and the contradiction is reported.

For each checked plan, an expectations file lists the values the carrier document prints, in the Benefit Plan Standard repository's [`docs/specs/pbp-sob-checks/`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/tree/main/docs/specs/pbp-sob-checks) for Medicare Advantage and [`docs/specs/puf-sbc-checks/`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/tree/main/docs/specs/puf-sbc-checks) for Marketplace. Each check gives the page, the printed text, the value as JSON and a JSON pointer into the plan's Benefit Plan Standard document. Where the importer reads the CMS file differently from the print on purpose, the check also gives the reading the document should hold and a note with the cells and the importer spec section that explain it. The Benefit Plan Standard repository's [`scripts/pbp-sob-check.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/pbp-sob-check.js) compares the document with the expectations file and gives each value 1 of 3 outcomes. MATCH means the document holds the printed value, READING means it holds the documented reading, and DIFFERENCE means it holds neither, which is a contradiction. The script exits 1 on any contradiction, and it reads a Marketplace document the same way as a Medicare Advantage one. Anyone can rerun the checks from the repository, because the example documents and the expectations files are committed:

```sh
node scripts/pbp-sob-check.js examples/aetna-medicare-aetna-medicare-select-extra.pbp.json docs/specs/pbp-sob-checks/H1609-028-000.json
node scripts/pbp-sob-check.js examples/unitedhealthcare-aarp-medicare-advantage-from-uhc-fl-0021.pbp.json docs/specs/pbp-sob-checks/H2406-013-000.json
node scripts/pbp-sob-check.js examples/unitedhealthcare-uhc-bronze-essential.puf.json docs/specs/puf-sbc-checks/68398FL0030058-01.json
```

The carrier PDFs are not in the repository (`data/` is git-ignored). Each expectations file names its document by the carrier's document ID and gives the page of every value, so a reader can check the printed values against the carrier's own copy. The Marketplace file also records the address it was downloaded from and the SHA-256 hash of the copy checked.

The first results, run on October 20, 2026:

| Plan | Carrier document ID | Checks | Match | Reading | Contradiction |
|---|---|---|---|---|---|
| `H1609-028-000`, Aetna Medicare Select Extra (HMO-POS) | `Y0001_H1609_028_HP32_SB2027_M` | 59 | 43 | 16 | 0 |
| `H2406-013-000`, AARP Medicare Advantage from UHC FL-0021 (PPO) | `Y0066_SB_H2406_013_000_2027_M` | 78 | 68 | 10 | 0 |
| Medicare Advantage | | 137 | 111 | 26 | 0 |
| `68398FL0030058-01`, UHC Bronze Essential ($0 Virtual Urgent Care) | `FL0055 EXFL26IF0275669_000` | 49 | 38 | 11 | 0 |
| Both programs | | 186 | 149 | 37 | 0 |

Across the 2 Medicare Advantage plans, the 137 values gave 0 contradictions and 26 documented readings. The Medicare Advantage readings are of 7 kinds, with the PBP importer spec section that sets each:

1. **Not Covered cells with no POS row** (8, all Aetna). The Summary of Benefits prints "Not Covered" in its out-of-network column for a category that no `pbp_Section_C_POS.txt` group lists, and the importer writes no POS row for such a category, so the document says nothing about it outside the network (section 5.4, question O1). These are primary care, the diagnostic and routine hearing exams, hearing aids, individual mental health sessions, dental, eyeglasses and fitness.
2. **Priced once, written in network only** (4, 2 on each plan). The file prices emergency and urgent care once, with no network, and the document prints the amount in both columns; the importer writes it on the in-network tier with a note (decision 5, section 7.13).
3. **A range where the document prints 1 amount** (4, 2 on each plan). The file gives a minimum and a maximum copay and the document prints 1 amount, for the specialist and outpatient hospital (Aetna) and the specialist and individual mental health sessions (UHC). The importer writes the range (section 5.5). UHC's urgent care, counted under kind 2, is also a range.
4. **Authorization filed for the whole category** (4, 3 UHC and 1 Aetna). The file answers authorization once for a category that covers more than 1 benefit (section 7.10). The UHC document marks only the Medicare-covered hearing exam, eye exam and foot exams, while the file's answer covers the routine ones too. On Aetna it goes the other way: the document's sentence covers all dental services, and the file requires no authorization for cleanings.
5. **A value the file does not state** (3, 2 Aetna and 1 UHC). The 100 days of a skilled nursing facility stay, on both plans, are in no column of `pbp_b2_snf.txt`, and Aetna's additional inpatient days are filed with 0 intervals, so the file gives no day range and no amount for them.
6. **The combined maximum** (2, 1 on each plan). The file states the out-of-network maximum as a combined in-network and out-of-network amount, which has no slot in the schema, so it is quoted in `source_references` (section 7.1).
7. **A basis the document does not print** (1, UHC). The file prices observation per day, and the document prints "$550 copay".

The first Marketplace check compares UHC Bronze Essential, `68398FL0030058-01`, with the Summary of Benefits and Coverage its Plan Attributes row links, and its 49 values gave 0 contradictions and 11 documented readings. The checks cover the deductibles and out-of-pocket limits, the 12 core services in both columns, home health and skilled nursing care with their limits, preventive services, and whether the plan covers each of the 10 extra benefits on the Marketplace list. The 11 readings are of 1 kind, Not Covered out of network with 100 percent in the file. For 11 services the SBC prints "Not Covered" in its out-of-network column, while the file gives the benefit `IsCovered` "Covered" and `CoinsOutofNet` "100.00%". `IsCovered` applies to the whole benefit, so the importer writes the out-of-network row as covered, with coinsurance at rate 1 (Marketplace importer spec sections 5.4 and 7.4).

### Plan match (proposal for the workgroup to set)

Of a set of test plan keys, how many resolve to exactly 1 plan. A key that resolves to no plan, or to more than 1, fails.

The proposed threshold is 100 percent of a published test set, because an answer read from the wrong plan's document is wrong in every value. The test set is the 10 example keys, plus the 266 contract and plan pairs that have more than 1 segment in the contract year 2027 files (Identifying the plan). Each pair is resolved with each county its segments serve, and it passes when every county picks exactly 1 segment.

### From SHOULD to SHALL at GA (proposal for the workgroup to set)

An item moves from SHOULD to SHALL at GA when, in each program that lists it, it is populated in at least 90 percent of documents for 2 consecutive CMS releases, and its crosswalk verdict is not "not covered, gap".

## Status and version

Version 0.2, a draft for the workgroup, dated October 20, 2026. Version 0.1 was written October 17, 2026, and updated October 18, 2026.

Version 0.2 adds these to version 0.1:

- The file contract section is now Retrieval and the file contract, with a new subsection, Source, date and refresh, where the GA draft's source-and-date and refresh checks land. It sets what every document and answer carries and says what each importer stamps today. It also proposes a refresh cadence.
- A new section, What a pledgee publishes, is the minimum contract.
- A new section, Worked example, walks a primary care question through 1 plan in each program.
- Conformance has a proposed number for each measure. Completeness is counted on the 10 examples by the new `scripts/rtb-completeness.js`. Accuracy has its method and first results as the GA draft's accuracy check 1b, 186 values across 3 plans with 0 contradictions, including the first Marketplace check. Plan match has its test set, and the rule for moving SHOULD items to SHALL at GA is proposed.
- Follow-ups is now 1 section, with follow-ups for the importers and the published files beside those for the converter spec.
- What comes back now says that a Marketplace row that is not covered quotes no cell.

It covers the PBP files for contract year 2027 and the Marketplace PUFs for plan year 2026. Medicare Advantage documents are written in schema 1.2.0 and Marketplace documents in schema 1.1.0. The canonical benefit vocabulary is version 1.2.0, with 117 keys. The PBP crosswalk has 40 rows, 33 with a canonical key, and the Marketplace crosswalk maps 84 of the 273 benefit names in the plan year 2026 file.

The crosswalk to the SBC InsurancePlan profile, [`carin-crosswalk.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/carin-crosswalk.md), has 106 rows, 1 for each row of the dictionary. Each row has a verdict for each program it applies to, so the counts are per program:

| | Medicare Advantage | Marketplace |
|---|---|---|
| Rows that apply | 67 | 71 |
| Aligned | 19 | 20 |
| Different | 41 | 47 |
| Not covered | 7 | 4 |
| Not covered, no element | 1 | 0 |
| Not covered, gap | 6 | 4 |

Every extra benefit in the MVP reaches the Bundle as identity only, plus, on Marketplace Bundles, an entry in the CARIN excluded-services extension when the plan does not cover it on any tier; that is the strongest reason the MVP format is the Benefit Plan Standard document, with the FHIR Bundle as the Part B output. The profile is at ballot, and nothing in the MVP's SHALL list depends on the crosswalk. To regenerate it, run `node scripts/build-rtb-crosswalk.js`; `--check` exits 1 if the file on disk differs, and the generator stops, and names the item, when a verdict is not the one the converter spec and `fhir/carin-sbc-crosswalk.json` give.

## Follow-ups

These were found while writing this specification. None is made in this version; each is work on the file or the spec it names.

### For the converter spec

The crosswalk found 2 plan types that the converter spec, [`insuranceplan-converter.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/insuranceplan-converter.md) section 6.1, does not name. For both, the crosswalk reads its verdict from another file, and the generator checks that file.

- **HMO_POS.** The converter writes an HMO-POS plan's `plan.type` as text only, `{"text": "HMO_POS"}`, because `sbc-plan-type` has no code for it. Section 6.1 names HMO, PPO, POS, EPO and OAP. The contract year 2027 files have 1,273 HMO-POS plans (converter spec section 6.3). The verdict, different, is read from the published Aetna Medicare Select Extra Bundle, [`examples/fhir/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/examples/fhir/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json).
- **INDEMNITY.** The converter codes a Marketplace indemnity plan from `sbc-plan-type`, and the Benefit Plan Standard repository's [`fhir-alignment.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/fhir-alignment.md) section 2 lists the code, but section 6.1 does not name it, and no example Bundle has an indemnity plan. The verdict, aligned, is read from the alignment guide.

### For the importers and the published files

- **The SBC link and plain clients.** On October 20, 2026, the SBC address that the Plan Attributes PUF gives for `68398FL0030058-01`, `https://www.uhc.com/ifp/sbc.68398FL0030058-01.en.2026.pdf`, answered a plain request (curl with its default headers) with an HTTP 403 from the carrier's content delivery network, and the plan's brochure address did the same. With a browser User-Agent header, the SBC address redirects to the same path without `.pdf` and returns the 12-page PDF. An app that follows the link from a server can get the 403, so the retrieval rules may need to say how a pledgee checks that a link answers.
- **Marketplace hashes.** The Marketplace importer could quote the download record's SHA-256 hashes in the first excerpt, so that a document carries its own release identifier until G6 closes.
- **Marketplace rows that are not covered.** A Marketplace tier row that is not covered quotes no cell, because the importer does not quote `IsCovered`; 18 of the 104 tier rows of `68398FL0030058-01` are such rows. Quoting it would put a CMS cell behind every value.
- **Out-of-network coverage on Medicare Advantage HMOs.** An HMO document says that the plan pays nothing outside its network only by having no `OUT` or `POS` tier. It does not quote `pbp_c_oon_yn` or `pbp_c_pos_yn`, the cells that say so.
- **The plan key in the index.** An entry of `fhir/index.json` has no plan key, so an app that starts from a plan key has to read each Bundle to find the plan. An entry could carry the key.
- **The check script's name.** `scripts/pbp-sob-check.js` and its header name the PBP importer only, and the PBP importer spec section 13 describes it. It ran the Marketplace check unchanged, so its header and a Marketplace importer spec section could say so.
