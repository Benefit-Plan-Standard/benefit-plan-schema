# Medical MVP technical specification

This folder holds the technical specification for the medical MVP of the CMS Health Tech Ecosystem Real-Time Benefits workgroup. It is written for the Benefit Plan Standard, an open JSON format for health plan benefits published under the MIT license, and for the 2 Benefit Plan Standard importers that read CMS public files. The SHALL and SHOULD assignments follow the workgroup's medical MVP scope (Monica Chopra's pledge proposal, October 2026).

The folder has 3 files, and the generator sits with the repository's other scripts:

| File | What it is |
|---|---|
| `README.md` | This document: purpose, scope, how a plan is identified, the file contract, how to read the dictionary, the known gaps, the conformance outline and the status. |
| [`data-dictionary.md`](data-dictionary.md) | Every item in scope, where it is in a Benefit Plan Standard document, and where each importer reads it in the CMS files. Generated; do not edit it. |
| [`shall-should.json`](shall-should.json) | The SHALL and SHOULD assignments, 1 entry per item, with the field paths, the CMS columns and the known gaps. The dictionary is generated from it. |
| [`scripts/build-rtb-dictionary.js`](../../../scripts/build-rtb-dictionary.js) | The generator. It reads `shall-should.json`, the 2 importer crosswalks and the canonical benefit vocabulary, and writes `data-dictionary.md`. |

## Purpose

The medical MVP answers questions about plan design. The workgroup's 4 use cases ask what the plan covers and what the member pays (use case 1), whether the cost changes with where the member goes (use case 2), whether a service has a limit (use case 3), and whether the plan covers an extra benefit such as hearing aids (use case 4). CMS already publishes these answers for Medicare Advantage and Marketplace plans. This specification says which items a pledgee makes available to the member, where each item is in the CMS files, and where it is in a Benefit Plan Standard document, so an app can ask the same question the same way for either program.

Medical is a plan-level document, not a priced transaction. There is no request and response for one service. An app identifies the plan, gets the plan's document, and reads the answer from it.

## Scope

### Programs and data

| Program | CMS files | Year | Importer |
|---|---|---|---|
| Medicare Advantage | Plan Benefit Package (PBP) Benefits, release "PBP Benefits-2027" | Contract year 2027 | [`scripts/from-pbp.js`](../../../scripts/from-pbp.js), spec [`pbp-importer.md`](../pbp-importer.md) |
| Marketplace | Health Insurance Exchange public use files (PUFs): the Plan Attributes PUF and the Benefits and Cost Sharing PUF | Plan year 2026 | [`scripts/from-marketplace-puf.js`](../../../scripts/from-marketplace-puf.js), spec [`marketplace-puf-importer.md`](../marketplace-puf-importer.md) |

The Medicare Advantage importer takes HMO, HMO-POS, local PPO and regional PPO plans and refuses other plan types. The Marketplace files cover plans sold through HealthCare.gov, in 30 states for plan year 2026; states that run their own exchange publish elsewhere. The 2 programs use different years in the same MVP, which is why every answer carries its plan year and the date of the CMS data.

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

Use case 3, limits on a service, has no SHALL in the MVP: a known gap, to revisit for GA. Limits on the 10 extra benefits are SHOULD.

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

## The file contract

This is a file contract, not an API. It describes documents an app retrieves, not endpoints, and there is no hosted service.

### What comes back

For each plan, 2 files:

1. The Benefit Plan Standard JSON document for the plan. The importer checks it against the schema before writing it: schema 1.2.0 for Medicare Advantage, 1.1.0 for Marketplace. An import that fails writes nothing.
2. The SBC InsurancePlan Bundle (SBC stands for Summary of Benefits and Coverage) that [`scripts/to-insuranceplan.js`](../../../scripts/to-insuranceplan.js) produces from that document: a FHIR R4 collection Bundle holding 1 InsurancePlan and the Organization it references, in the SBC InsurancePlan profile of the CARIN Digital Insurance Card IG (`hl7.fhir.us.insurance-card#2.0.0-ballot`, a ballot draft). For a Marketplace document, `--excluded-services` also writes the CARIN Digital Insurance Card IG's excluded-services extension, derived from the plan's coverage flags. The converter spec is [`insuranceplan-converter.md`](../insuranceplan-converter.md).

The documents quote the CMS cells they were read from. Each tier row of a benefit quotes its cells in `notes`, and a value with no field is quoted in `source_references`.

The crosswalk to the SBC InsurancePlan profile in the CARIN Digital Insurance Card IG is a Part B item in the workgroup's GA draft (the profile is at ballot), not a GA ask; the crosswalk document that follows in this folder exists so a pledgee can produce that Bundle when the profile publishes.

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

On the files used for the examples, these 4 commands write documents and Bundles byte-identical to the 2 examples below.

| Plan key | Plan | Document | Bundle |
|---|---|---|---|
| `H1609-028-000` | Aetna Medicare Select Extra (HMO-POS), Medicare Advantage | [`examples/aetna-medicare-aetna-medicare-select-extra.pbp.json`](../../../examples/aetna-medicare-aetna-medicare-select-extra.pbp.json) | [`examples/fhir/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json`](../../../examples/fhir/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json), also [published on the site](https://benefitplanstandard.org/fhir/InsurancePlan/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json) |
| `68398FL0030058-01` | UHC Bronze Essential, Marketplace | [`examples/unitedhealthcare-uhc-bronze-essential.puf.json`](../../../examples/unitedhealthcare-uhc-bronze-essential.puf.json) | [`examples/fhir-puf/unitedhealthcare-uhc-bronze-essential.json`](../../../examples/fhir-puf/unitedhealthcare-uhc-bronze-essential.json), in the repository only |

The repository has 5 examples for each program: `examples/*.pbp.json` with their Bundles in `examples/fhir/`, and `examples/*.puf.json` with their Bundles in `examples/fhir-puf/`. The [site's index](https://benefitplanstandard.org/fhir/index.json) lists 15 Bundles: the 5 Medicare Advantage Bundles and 10 read from plan documents. The Marketplace Bundles are not on the site.

## Reading the data dictionary

[`data-dictionary.md`](data-dictionary.md) has 106 rows in 5 sections: the plan key, plan year and date of the data; plan-level fields; network items; services with a cost; and the extra benefits. Each extra benefit has 3 rows, for whether it is covered (SHALL), its cost and conditions (SHOULD), and its limits (SHOULD).

| Column | What it holds |
|---|---|
| Item | The workgroup's name for the service or benefit, with the canonical key from [`vocabularies/canonical-benefits.json`](../../../vocabularies/canonical-benefits.json) beside it. Where the 2 programs name an item differently, both names are shown. Plan-level items carry short names of ours. |
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
- **G5.** The schema has no field for the provider directory link. The Medicare Advantage importer quotes the address in `source_references`; the Marketplace importer does not read the Network PUF, where the address is. The proposed field is `network_tiers[].provider_network`, in [`provider-directory-schema-proposal.md`](../../provider-directory-schema-proposal.md).
- **G6.** The Marketplace importer does not carry the files' `ImportDate`. It records the date the files were downloaded instead.
- **G7.** Marketplace documents are written in schema 1.1.0, which has no `plan_identifiers`, so the plan key is only text in the first `source_references` excerpt.
- **G8.** The Marketplace importer quotes whether the plan covers care outside its service area or outside the country, but does not read the 2 columns that describe that coverage, so no field is written for them.

## Conformance

Everything in this section is a proposal for the workgroup to set. It names 3 measures and what each one measures. The numbers follow in a later version.

### Completeness (proposal for the workgroup to set)

Of the SHALL items in scope that apply to a plan, how many the plan's document populates. It is counted per plan, for each program. The known gaps lower it today; a Medicare Advantage document has no preventive services benefit, for example (G2).

### Accuracy (proposal for the workgroup to set)

On a checked sample of plans, how many values agree with the carrier's own plan document: the Summary of Benefits for a Medicare Advantage plan, the Summary of Benefits and Coverage for a Marketplace plan. Each value checked has 1 of 3 outcomes. It matches, it contradicts the carrier document, or the carrier document has no such field. Contradictions are the number that matters.

The CMS file is the source and the carrier document is the check. When they disagree, the CMS file is what the MVP serves, and the contradiction is reported, not silently corrected.

The checks of 2 Medicare Advantage plans against their Summary of Benefits are in [`docs/specs/pbp-sob-checks/`](../pbp-sob-checks/); their results come in a later version.

### Plan match (proposal for the workgroup to set)

Of a set of test plan keys, how many resolve to exactly 1 plan. A key that resolves to no plan, or to more than 1, fails.

### From SHOULD to SHALL at GA (proposal for the workgroup to set)

A rule for moving SHOULD items to SHALL at GA will be proposed in a later version of this document.

## Status and version

Version 0.1, a draft for the workgroup, written October 17, 2026.

It covers the PBP files for contract year 2027 and the Marketplace PUFs for plan year 2026. Medicare Advantage documents are written in schema 1.2.0 and Marketplace documents in schema 1.1.0. The canonical benefit vocabulary is version 1.2.0, with 117 keys. The PBP crosswalk has 40 rows, 33 with a canonical key, and the Marketplace crosswalk maps 84 of the 273 benefit names in the plan year 2026 file.

Later versions add the field-by-field crosswalk to the SBC InsurancePlan profile, a worked example, the minimum contract and the conformance numbers.
