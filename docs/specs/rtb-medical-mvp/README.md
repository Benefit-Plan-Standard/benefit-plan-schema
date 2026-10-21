# Medical MVP technical specification

Diego Orofino, the Benefit Plan Standard, dorofino@benefitplanstandard.org. A draft for the workgroup, not a workgroup decision.

The [Benefit Plan Standard](https://benefitplanstandard.org) is an open JSON format for health plan benefits, published under the MIT license. Its schema, the importers that read CMS public files, the converter to FHIR and the example plans live in [one repository](https://github.com/Benefit-Plan-Standard/benefit-plan-schema). This document is the technical specification, version 0.3.1, dated October 21, 2026, 1 of 3 documents that make up the medical MVP technical specification for the CMS Health Tech Ecosystem Real-Time Benefits workgroup. The other 2 are the [data dictionary](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/data-dictionary.md) and the [crosswalk to the SBC InsurancePlan profile](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/carin-crosswalk.md). All 3 are in the [repository folder](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/tree/main/docs/specs/rtb-medical-mvp), and the files they name are in the [repository](https://github.com/Benefit-Plan-Standard/benefit-plan-schema). This document is published as `README.md` in that folder; a Word copy with the same content is sent with the specification and is not in the repository.

The 3 documents use these terms. RTB is the CMS Health Tech Ecosystem Real-Time Benefits workgroup. The MVP, minimum viable product, is the workgroup's first scope, and a pledgee is an organization that committed to the workgroup, in Monica Chopra's pledge proposal, to publish MVP data for its plans. GA, general availability, is the scope after the MVP, which the workgroup's GA draft describes (see What comes back). The other terms are these:

- **HL7 and FHIR R4.** HL7 (Health Level Seven International) is the standards body that publishes FHIR, Fast Healthcare Interoperability Resources. R4 is FHIR release 4, version 4.0.1, the version of the Bundles.
- **The CARIN Alliance and the CARIN Digital Insurance Card implementation guide.** The CARIN Alliance is a group of health care organizations that develops FHIR implementation guides through HL7. Its Digital Insurance Card implementation guide, package `hl7.fhir.us.insurance-card`, holds the SBC InsurancePlan profile the Bundles follow.
- **STU2.** Standard for Trial Use, release 2, the next release of the CARIN Digital Insurance Card implementation guide. Package `hl7.fhir.us.insurance-card#2.0.0-ballot` is the STU2 ballot.
- **Ajv.** The JSON Schema validator the 2 importers use to check a document against the Benefit Plan Standard schema before writing it.
- **MOOP.** Maximum out of pocket, the Marketplace files' name for the out-of-pocket maximum.
- **TEHB, MEHB and DEHB.** The prefixes of the Plan Attributes PUF's deductible and maximum columns. EHB stands for essential health benefits; TEHB columns count medical and drug costs together, MEHB columns medical costs and DEHB columns drug costs.
- **SSA county code and FIPS code.** 2 different 5-digit state and county codes. The PBP files use the Social Security Administration (SSA) code. The Federal Information Processing Standards (FIPS) code is the one the Census Bureau assigns. Only 36 of the 3,262 county codes in the contract year 2027 files are also FIPS codes (Medicare Advantage importer spec section 4.5). The segment tool, [`scripts/pbp-segment.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/pbp-segment.js), gives a Medicare Advantage plan's segment from the SSA code, or from the county's name and state, read from a pledgee's `service-areas.json` or from the PBP files (see Identifying the plan).
- **Section A, Section C and Section D.** 3 of the tab-delimited PBP files. Section A is `pbp_Section_A.txt`, with the plan's name, type, organization, phone numbers and web addresses. Section C is `pbp_Section_C.txt`, with whether the plan has an out-of-network or point-of-service option, and its groups of out-of-network and point-of-service costs are in `pbp_Section_C_OON.txt` and `pbp_Section_C_POS.txt`. Section D is `pbp_Section_D.txt`, with the premium, the deductibles and the out-of-pocket maximums.
- **PBP benefit category.** The number and letter the PBP files give a service, such as 7a, Primary Care Physician Services, in `pbp_b7_health_prof.txt`, and 14a, Medicare-covered Zero Dollar Preventive Services, in `pbp_b14_preventive.txt`. The columns of a category start with its code, such as `pbp_b7a_copay_yn`.
- **Tier row.** 1 entry of a benefit's `network_cost_shares` in a Benefit Plan Standard document: whether the benefit is covered in 1 network tier, such as `IN` or `OUT`, and what the member pays there.
- **Accumulator and slot.** An accumulator is an amount the member's costs count toward, such as a deductible or an out-of-pocket maximum. A slot is 1 field of a document's `accumulators`, such as `accumulators.individual_deductible`, with its amount and the `network_tier` it applies to. "No slot is written" means the field is absent.
- **Excerpt.** 1 entry of a document's `source_references`, whose `excerpt` quotes CMS cells or text. The first excerpt names the CMS files, their release and the download dates.

The specification is 5 files in the repository folder, and 6 scripts that sit with the Benefit Plan Standard repository's other scripts:

| File | What it is |
|---|---|
| [`README.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/README.md) | This document, with the terms it uses, the purpose, scope, how a plan is identified, retrieval and the file contract, what a pledgee publishes, how to read the dictionary, the gaps closed on October 20, 2026, a worked example, conformance with its proposed numbers, the status, the changes in 0.2.1, 0.3 and 0.3.1, the questions for the workgroup and the follow-ups. |
| [`data-dictionary.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/data-dictionary.md) | Every item in scope, where it is in a Benefit Plan Standard document, and where each importer reads it in the CMS files. Generated; do not edit it. |
| [`shall-should.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/shall-should.json) | The SHALL and SHOULD assignments, 1 entry per item, with the field paths and the CMS columns, and the record of the gaps, each with the date it was closed and how. The dictionary and the crosswalk are generated from it. |
| [`carin-crosswalk.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/carin-crosswalk.md) | Every row of the dictionary mapped to the SBC InsurancePlan profile of the CARIN Digital Insurance Card implementation guide (SBC stands for Summary of Benefits and Coverage), with where the value lands in the Bundle and 1 of 3 verdicts. Generated; do not edit it. |
| [`carin-mapping.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/carin-mapping.json) | For each item and program, the SBC InsurancePlan profile element, the verdict, the note and the Benefit Plan Standard converter spec sections the verdict is read from. The crosswalk is generated from it. |
| [`scripts/build-rtb-dictionary.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/build-rtb-dictionary.js) | The dictionary generator. It reads `shall-should.json`, the 2 importer crosswalks and the canonical benefit vocabulary, and writes [`data-dictionary.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/data-dictionary.md). |
| [`scripts/build-rtb-crosswalk.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/build-rtb-crosswalk.js) | The crosswalk generator. It reads `shall-should.json`, `carin-mapping.json` and the Benefit Plan Standard repository's [`fhir/carin-sbc-crosswalk.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/fhir/carin-sbc-crosswalk.json), takes the item names and field paths from the dictionary generator, and writes [`carin-crosswalk.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/carin-crosswalk.md). |
| [`scripts/rtb-completeness.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/rtb-completeness.js) | The completeness count. It reads `shall-should.json` and 1 or more documents, and prints for each plan how many of the SHALL items that apply to it the document populates (see Conformance). |
| [`scripts/pbp-segment.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/pbp-segment.js) | The segment tool, the county to segment lookup for Medicare Advantage. It reads a pledgee's `service-areas.json` (`--service-areas`) or `PlanArea.txt` of the PBP files, with the Medicare Advantage importer's reader, and prints the segment and the plan key for a contract, a plan and a county, given as an SSA county code or as the county's name and state. `--all-pairs` runs the plan match check (see Identifying the plan and Plan match). |
| [`scripts/publish-fhir.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/publish-fhir.js) | The index writer, run as `scripts/publish-fhir.js --pledgee`. It reads a pledgee's release folders and writes the index and, in every Medicare Advantage release folder, `service-areas.json` (see What a pledgee publishes). Without `--pledgee`, the same script copies the Benefit Plan Standard repository's example Bundles to the site. |
| [`scripts/build-rtb-docx.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/build-rtb-docx.js) | Writes the Word copies of the 3 documents. Run `npm install docx` once, then `node scripts/build-rtb-docx.js`; it writes `rtb-medical-mvp-specification-<version>.docx`, `-data-dictionary-` and `-carin-crosswalk-` into `dist/`, which is git-ignored, so the Word copies are not in the repository; they are sent with the specification. The Markdown is the source, and a Word copy carries the same content. |

## Purpose

The medical MVP answers questions about plan design. The workgroup's 4 use cases ask what the plan covers and what the member pays (use case 1), whether the cost changes with where the member goes (use case 2), whether a service has a limit (use case 3), and whether the plan covers an extra benefit such as hearing aids (use case 4). CMS already publishes these answers for Medicare Advantage and Marketplace plans. This specification says which items a pledgee makes available to the member and where each item is, both in the CMS files and in a Benefit Plan Standard document, so an app can ask the same question the same way for either program.

Medical is a plan-level document, not a priced transaction. There is no request and response for 1 service. An app identifies the plan and reads the answer from the plan's document.

## Scope

### Programs and data

| Program | CMS files | Year | Importer |
|---|---|---|---|
| Medicare Advantage | Plan Benefit Package (PBP) Benefits, release "PBP Benefits-2027" | Contract year 2027 | [`scripts/from-pbp.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/from-pbp.js), spec [`pbp-importer.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/pbp-importer.md), in the Benefit Plan Standard repository |
| Marketplace | Health Insurance Exchange public use files (PUFs): the Plan Attributes PUF, the Benefits and Cost Sharing PUF and the Network PUF | Plan year 2026 | [`scripts/from-marketplace-puf.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/from-marketplace-puf.js), spec [`marketplace-puf-importer.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/marketplace-puf-importer.md), in the Benefit Plan Standard repository |

The Medicare Advantage importer takes HMO, HMO-POS, local PPO and regional PPO plans and refuses other plan types. The Marketplace files cover plans sold through HealthCare.gov, in 30 states for plan year 2026, the number of distinct `StateCode` values in the plan year 2026 Plan Attributes PUF; states that run their own exchange publish elsewhere. The 2 programs use different years in the same scope, each in its own release folder, which is why every answer carries its plan year and the date of the CMS data. The SHALL and SHOULD assignments follow the workgroup's medical MVP scope (Monica Chopra's pledge proposal, October 2026).

Both importers write their documents in Benefit Plan Standard schema 1.2.0, for both programs. Benefit Plan Standard schema 1.2.0 is a draft under the Benefit Plan Standard release rule (see [`docs/governance.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/governance.md#releases), Releases): it becomes final after 2 independent adopters implement and validate it, and the workgroup's MVP is where that happens.

### What a pledgee makes available

These items are SHALL in both programs:

- the plan year and the date of the CMS data, on every answer;
- the plan-level fields that apply to the member's plan;
- the in-network cost of 16 services, named below;
- whether the plan covers each of 10 extra benefits.

For a Medicare Advantage release, the pledgee's `service-areas.json` is SHALL too: without it an app cannot find the plan key from the member's county (see Identifying the plan and What a pledgee publishes).

The 16 services are the services that [`shall-should.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/shall-should.json) labels SHALL for each program. In Medicare Advantage they are primary care visit (`primary_care`), specialist visit (`specialist`), urgent care (`urgent_care`), emergency room (`emergency_room`), inpatient hospital stay (`inpatient_hospital`), outpatient hospital services (`outpatient_surgery`), outpatient surgery center (`outpatient_surgery_facility`), lab tests (`diagnostic_lab`), diagnostic radiology (for example MRI or CT) (`imaging_advanced`), physical therapy and speech therapy (`physical_and_speech_therapy`), mental health visit (individual session) (`mental_health_office_visit`), ambulance (ground) (`ambulance`), hospital observation (`observation_care`), skilled nursing facility (`skilled_nursing_facility`), home health (`home_health_care`) and preventive services (`preventive_care`). In Marketplace they are primary care visit (`primary_care`), specialist visit (`specialist`), urgent care (`urgent_care`), emergency room (`emergency_room`), inpatient hospital stay (`inpatient_hospital`), outpatient surgery center or facility (`outpatient_surgery_facility`), outpatient surgery, doctor's fee (`outpatient_surgery_professional`), lab tests (`diagnostic_lab`), imaging (CT, PET, MRI) (`imaging_advanced`), physical therapy and occupational therapy (`physical_and_occupational_therapy`), mental health visit (outpatient) (`mental_health_outpatient`), ambulance (`ambulance`), nurse or physician assistant visit (`other_practitioner_office_visit`), skilled nursing facility (`skilled_nursing_facility`), home health (`home_health_care`) and preventive services (`preventive_care`). For preventive services, $0 in network is the Medicare Advantage reading, from the plan's attestation in category 14a. In Marketplace the item is the tier 1 cost the file gives, read like any other service.

These use case 2 network items are SHALL too, where they apply to the member's plan:

- in-network against out-of-network cost;
- the out-of-network deductible and out-of-pocket maximum;
- combined in- and out-of-network amounts;
- the provider directory link;
- the point-of-service cost, Medicare Advantage HMO-POS plans only;
- the cost in a second in-network tier, Marketplace plans that have one only.

These items are SHOULD:

- the cost, conditions and limits of the 10 extra benefits;
- telehealth, in Medicare Advantage;
- the employer group plan flag, in Medicare Advantage.

Use case 3, limits on a service, has no SHALL in the MVP. This is a known gap, to revisit for GA. Limits on the 10 extra benefits are SHOULD.

The 2 programs file different services, so the lists differ where the files do:

| | Medicare Advantage | Marketplace |
|---|---|---|
| Outpatient care | Outpatient hospital services (`outpatient_surgery`) and outpatient surgery center (`outpatient_surgery_facility`) | Facility fee (`outpatient_surgery_facility`) and doctor's fee (`outpatient_surgery_professional`) |
| Therapy | Physical therapy and speech therapy, priced together (`physical_and_speech_therapy`) | Physical therapy and occupational therapy (`physical_and_occupational_therapy`) |
| Mental health | Individual session (`mental_health_office_visit`) | Outpatient services (`mental_health_outpatient`) |
| Third extra care setting: each program's 1 SHALL service with no counterpart on the other program's list | Hospital observation (`observation_care`) | Nurse or physician assistant visit (`other_practitioner_office_visit`) |
| Extra benefits | Hearing aids, routine eye exam, dental cleanings, fillings, eyeglasses, over-the-counter allowance, fitness, rides to medical appointments, meals, routine hearing exam | Hearing aids, routine eye exam, routine, basic and major adult dental care, chiropractic care, acupuncture, routine foot care, infertility treatment, weight loss surgery |

### Not in scope

The MVP does not answer questions that need the member's own numbers, such as visits used or deductible met, or a price for a specific service from a specific provider. Neither program's public files say which providers are in a plan's network. The Marketplace monthly premium depends on the member's age and area and is not in the 3 files the Marketplace importer reads.

## Identifying the plan

This specification starts from the plan key. How an app learns which plan the member is on, whether from the member, an insurance card or a connection to the payer, is outside it.

### Medicare Advantage

A plan is a contract, a plan and a segment, which the PBP files call `bid_id`. The Medicare Advantage importer writes the key as `H1609-028-000`: the 5-character contract, the 3-digit plan and the segment padded to 3 digits. The PBP files' own `bid_id` column writes the same key as `H1609_028_0`. The 2 forms are the same key. The document carries the key in `plan_identifiers`, with system `cms_contract_plan_segment`, and quotes the file's `bid_id` value in `source_references`.

An eligibility response from the HIPAA Eligibility Transaction System (HETS 271) gives the contract and the plan but not the segment. In the contract year 2027 files, 266 contract and plan pairs have more than 1 segment, and in every one the segments serve different counties, so the member's county picks the segment (Medicare Advantage importer spec section 4.1). The CMS files key counties by SSA county code, and the PBP files that hold them are the pledgee's, not the app's. The Medicare Advantage importer takes a full plan key and does not resolve a county. An app has the HETS 271 and the member's address, and finds the plan key in 4 steps from the pledgee's `service-areas.json`, which every Medicare Advantage release folder holds (see Service areas):

1. The HETS 271 gives the contract and the plan, for example `H1609` and `028`.
2. The member's address gives the county and the state, for example Duval County, Florida.
3. The app looks the county's name and state up in the pledgee's `service-areas.json`, among the plan keys of that contract and plan. Each plan key lists the counties it serves with their SSA county code, name and state, so the name gives the SSA code: Duval, FL is 10150. A FIPS code is not an SSA code (Medicare Advantage importer spec section 4.5): Duval's FIPS code, 12031, is in no county of the file. A name with 2 SSA codes, such as Los Angeles, CA (05200 and 05210), is looked up under both.
4. The plan key that lists the county is the member's plan key, `H1609-028-000`: its segment is the 1 segment of the contract and plan that serves the county.

The segment tool, [`scripts/pbp-segment.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/pbp-segment.js) in the Benefit Plan Standard repository, does steps 3 and 4, and so does a 20-line lookup in any language, since the file is plain JSON. After the commands under How to get them and the index writer (see The index),

```sh
node scripts/pbp-segment.js --service-areas published/PBP-Benefits-2027/service-areas.json --year 2027 --contract H1609 --plan 028 --county-name "Duval, FL"
```

prints

```text
county 10150 Duval FL, partial_flag "", eghp_flag "0"
segment 000
plan key H1609-028-000
```

An app that has the PBP files can run the segment tool against them directly, without `--service-areas`, and gets the same answer: the segment tool then reads `PlanArea.txt` from `data/pbp/<year>/`, the folder the Medicare Advantage importer reads, or from the folder `--data` names. `--data test/fixtures/pbp-segment` tries the segment tool without the full download: that folder of the Benefit Plan Standard repository holds the `PlanArea.txt` and `PlanRegionArea.txt` rows of 6 plan keys, `H1609-028-000` among them, and `node scripts/pbp-segment.js --data test/fixtures/pbp-segment --year 2027 --contract H1609 --plan 028 --county-name "Duval, FL"` prints the same 3 lines.

`--county 10150` gives the same answer from the SSA code. When no segment of the plan serves the county, the segment tool prints `no segment serves county` and the county, and exits 1. When more than 1 segment serves it, which no county does in the contract year 2027 files (see Plan match), the segment tool lists the segments and exits 2. It quotes each county's `partial_flag` and `eghp_flag` as the file gives them, as the Medicare Advantage importer does.

Regional PPOs have regions, not counties. `PlanRegionArea.txt` gives a regional PPO's region by code and name, such as region 09, "Florida", and has no county or state column, so `service-areas.json` carries the region as the file gives it and no list of states. In the contract year 2027 file, each of the 73 regional PPO contract and plan pairs has exactly 1 segment and 1 region, so for a regional PPO the contract and the plan give the plan key, with no county and no state. For a regional PPO, the segment tool with `--service-areas` says that the plan has regions and no counties and names its segment, plan key and region; read from `PlanArea.txt`, it says that the file has no rows for the plan and that a regional plan's service area is in `PlanRegionArea.txt`. Both exit 1, because the segment tool resolves no county.

An app does this once per member and caches the plan key.

### Marketplace

A plan is a plan variant: the 14-character HIOS plan id, assigned by CMS's Health Insurance Oversight System, and a 2-digit variant, for example `68398FL0030058-01`. The files call this `PlanId`. The variant matters, because the cost-sharing reduction variants of 1 plan have different costs. The Marketplace importer also takes the 14-character id alone, the `StandardComponentId`, and resolves it in 1 of 3 ways (Marketplace importer spec section 5.1): to its `-01` variant when the Plan Attributes PUF has one, which in the files read is the on-exchange variant without cost-sharing reductions; to its only variant when it has 1 and no `-01`; and when it has several variants and no `-01`, the Marketplace importer stops, lists them, and needs the full plan id.

The document carries the key in `plan_identifiers`, with system `hios_plan_id`, and the 14-character id alone with system `hios_id`, for example `68398FL0030058`. The first `source_references` excerpt quotes the file's `PlanId` and `StandardComponentId` values.

## Retrieval and the file contract

This is a file contract, not an API. It describes documents an app retrieves, not endpoints, and there is no hosted service.

### What comes back

For each plan, the document and, where the pledgee publishes it, the Bundle:

1. The Benefit Plan Standard JSON document for the plan. The 2 importers check it against the Benefit Plan Standard schema 1.2.0 before writing it. An import that fails writes nothing.
2. The SBC InsurancePlan Bundle that the Benefit Plan Standard converter, [`scripts/to-insuranceplan.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/to-insuranceplan.js) in the Benefit Plan Standard repository, produces from that document: a FHIR R4 collection Bundle holding 1 InsurancePlan and the Organization it references, in the SBC InsurancePlan profile of the CARIN Digital Insurance Card implementation guide (`hl7.fhir.us.insurance-card#2.0.0-ballot`, a ballot draft). For a Marketplace document, `--excluded-services` also writes the excluded-services extension of the CARIN Digital Insurance Card implementation guide, derived from the plan's coverage flags. The Benefit Plan Standard converter spec is [`insuranceplan-converter.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/insuranceplan-converter.md), in the Benefit Plan Standard repository.

The Benefit Plan Standard document is SHALL. The SBC InsurancePlan Bundle is SHOULD until the SBC InsurancePlan profile publishes, because the profile is at ballot, and the index carries `bundle` null for a plan whose Bundle the pledgee does not publish.

The documents quote the CMS cells they were read from. Each tier row of a benefit quotes its cells in `notes`, except a Marketplace row that is not covered (see Follow-ups). `source_references` quotes a value with no field, and the cells behind the premium, the Part B premium reduction, the contacts and the provider directory link.

The crosswalk to the SBC InsurancePlan profile in the CARIN Digital Insurance Card implementation guide, [`carin-crosswalk.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/carin-crosswalk.md), is a Part B item of the workgroup's GA draft, "RTB Medical. What payers would be asked to supply for GA" (Monica Chopra, October 2026, a draft for discussion, not a workgroup decision), and Part B there means the draft's second part, not Medicare Part B. The SBC InsurancePlan profile is at ballot. The crosswalk exists so a pledgee can produce that Bundle when the SBC InsurancePlan profile publishes, and nothing in the MVP SHALL list depends on the Bundle.

### How to get them

Run the 2 importers on the CMS files, or read the published examples.

The 2 importers need Node.js 18 or later and a local copy of Ajv for the Benefit Plan Standard schema check:

```sh
git clone https://github.com/Benefit-Plan-Standard/benefit-plan-schema.git
cd benefit-plan-schema
npm install ajv ajv-formats
```

Each import reads the download record, `download.json` in the year folder of the CMS files, and writes the release and the download dates it gives into the document's first `source_references` excerpt. The download record is the one path for both programs. The download records of the examples are not in the repository, because `data/` is git-ignored, so this section is where their content lives: the commands below write the fields the 2 importers read, with the examples' values, and a reader who copies the commands on the same CMS files gets the examples byte for byte. The examples' records also hold the download addresses and the SHA-256 hash of each file, which neither importer reads. A reader who writes the date of their own download gets documents and Bundles that differ from the examples only in those dates.

The commands write each plan's document and Bundle into the folder of its release, under `published/`. The folder names follow the release rule under Source, date and refresh: a release folder is named by the release as the document's first excerpt gives it, made file-safe, which for Medicare Advantage is the release label, `PBP Benefits-2027`, written `PBP-Benefits-2027`, and for Marketplace is `marketplace-puf-<plan year>-<download date of the Plan Attributes PUF>`, here `marketplace-puf-2026-2026-10-05`. A reader who writes another Marketplace download date names the folder by that date.

For Medicare Advantage, `release_label` is required: a document written without it carries the release "(not recorded)", and the index writer refuses it. The Medicare Advantage examples were written with the release label "PBP Benefits-2027" and the download date their first `source_references` excerpt gives, 2026-10-06.

```sh
mkdir -p data/pbp/2027 && cd data/pbp/2027
curl -L -O https://www.cms.gov/files/zip/pbp-benefits-2027.zip
unzip pbp-benefits-2027.zip
echo '{"downloaded": "2026-10-06", "release_label": "PBP Benefits-2027"}' > download.json
cd ../../..
mkdir -p published/PBP-Benefits-2027
node scripts/from-pbp.js --year 2027 --plan H1609-028-000 --out published/PBP-Benefits-2027/H1609-028-000.json
node scripts/to-insuranceplan.js published/PBP-Benefits-2027/H1609-028-000.json -o published/PBP-Benefits-2027/H1609-028-000.bundle.json
```

For Marketplace, the Marketplace importer reads 3 files: the Plan Attributes PUF, the Benefits and Cost Sharing PUF and the Network PUF, which gives the provider directory link. In the download record, `downloaded` is the download date of the 3 files, and `downloaded_files` gives the Network PUF its own date, by zip name, when it was downloaded on another day. The Marketplace examples were written with the dates their first `source_references` excerpt gives, 2026-10-05 for the Plan Attributes PUF and the Benefits and Cost Sharing PUF and 2026-10-20 for the Network PUF; the excerpt names 1 date for the 3 files when they share it.

```sh
mkdir -p data/puf/2026 && cd data/puf/2026
curl -O https://download.cms.gov/marketplace-puf/2026/plan-attributes-puf.zip
curl -O https://download.cms.gov/marketplace-puf/2026/benefits-and-cost-sharing-puf.zip
curl -O https://download.cms.gov/marketplace-puf/2026/network-puf.zip
unzip plan-attributes-puf.zip && unzip benefits-and-cost-sharing-puf.zip && unzip network-puf.zip
echo '{"downloaded": "2026-10-05", "downloaded_files": {"network-puf.zip": "2026-10-20"}}' > download.json
cd ../../..
mkdir -p published/marketplace-puf-2026-2026-10-05
node scripts/from-marketplace-puf.js --year 2026 --plan 68398FL0030058-01 --out published/marketplace-puf-2026-2026-10-05/68398FL0030058-01.json
node scripts/to-insuranceplan.js --excluded-services published/marketplace-puf-2026-2026-10-05/68398FL0030058-01.json -o published/marketplace-puf-2026-2026-10-05/68398FL0030058-01.bundle.json
```

The layout these commands write is under What a pledgee publishes. On the files used for the examples, the 4 `node` commands write documents and Bundles byte-identical to the 2 examples below, in the Benefit Plan Standard repository.

| Plan key | Plan | Document | Bundle |
|---|---|---|---|
| `H1609-028-000` | Aetna Medicare Select Extra (HMO-POS), Medicare Advantage | [`examples/aetna-medicare-aetna-medicare-select-extra.pbp.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/examples/aetna-medicare-aetna-medicare-select-extra.pbp.json) | [`examples/fhir/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/examples/fhir/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json), also [published on the site](https://benefitplanstandard.org/fhir/InsurancePlan/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json) |
| `68398FL0030058-01` | UHC Bronze Essential, Marketplace | [`examples/unitedhealthcare-uhc-bronze-essential.puf.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/examples/unitedhealthcare-uhc-bronze-essential.puf.json) | [`examples/fhir-puf/unitedhealthcare-uhc-bronze-essential.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/examples/fhir-puf/unitedhealthcare-uhc-bronze-essential.json), in the repository only |

The Benefit Plan Standard repository has 5 examples for each program: [`examples/*.pbp.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/tree/main/examples) with their Bundles in [`examples/fhir/`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/tree/main/examples/fhir), and [`examples/*.puf.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/tree/main/examples) with their Bundles in [`examples/fhir-puf/`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/tree/main/examples/fhir-puf). The [site's index](https://benefitplanstandard.org/fhir/index.json) lists 15 Bundles: the 5 Medicare Advantage Bundles imported from the CMS PBP files, and 2 Medicare Advantage Bundles and 8 commercial Bundles read from carrier Summaries of Benefits and SBC PDFs. The Marketplace Bundles are not on the site.

### Source, date and refresh

Section 5 of the GA draft, "MVP accuracy and QA", asks that every answer carry its source and date (its check 2, "Source and date on every answer") and that the data be refreshed with each CMS release (its check 6, "Refresh with each CMS release"). This section is where both land.

Every document a pledgee publishes, and every answer an app builds from it, SHALL carry:

- the plan year;
- the CMS files and their release: for Medicare Advantage the release label, `PBP Benefits-2027`; for Marketplace the Plan Attributes PUF, the Benefits and Cost Sharing PUF and the Network PUF for plan year 2026, by file name and download address, each with its `ImportDate`, and the release, which is the download date of the Plan Attributes PUF;
- the date the files were downloaded;
- the web addresses the CMS files give for the plan, quoted in `source_references` as the 2 importers quote them: for Marketplace the Summary of Benefits and Coverage, brochure and drug list addresses of the Plan Attributes PUF, and for Medicare Advantage the website, provider directory, drug list and pharmacy directory addresses of Section A.

The 2 importers write all 4 into every document. What they can write differs by program, because the CMS files differ.

**Medicare Advantage.** The Medicare Advantage importer writes the plan year in `plan_year`, and the release label, the download address and the download date in the first `source_references` excerpt, which for `H1609-028-000` begins `CMS Plan Benefit Package (PBP) Benefits, contract year 2027, release "PBP Benefits-2027" (https://www.cms.gov/files/zip/pbp-benefits-2027.zip), downloaded 2026-10-06.` It reads the label and the date from the download record, `data/pbp/<year>/download.json`. The download record used for the examples also holds the SHA-256 hash of the zip and of each file in it; the Medicare Advantage importer does not copy the hashes into the document.

**Marketplace.** The Marketplace importer writes the plan year in `plan_year`, and in the first excerpt the 3 file names, their download addresses, their download dates and each file's `ImportDate` as the file writes it. For `68398FL0030058-01` the excerpt gives `ImportDate` "10/15/2025" from the Plan Attributes PUF and "2025-10-15" from the Benefits and Cost Sharing PUF and the Network PUF, October 15, 2025 in all 3; the examples' Network PUF was downloaded on 2026-10-20 and their Plan Attributes PUF and Benefits and Cost Sharing PUF on 2026-10-05. The Marketplace importer reads the dates from the download record, `data/puf/<year>/download.json`, which for the examples also holds the 3 addresses and the SHA-256 hash of each file, and has no release label. The Marketplace files have no release name, so the release of a Marketplace document is the download date of its Plan Attributes PUF, which also names the release folder (see below). Each file's `ImportDate` is carried in the document and is not the release; the hashes stay in the download record.

For the web addresses, the Plan Attributes PUF gives 3 for each plan: the Summary of Benefits and Coverage (`URLForSummaryofBenefitsCoverage`), the brochure (`PlanBrochure`) and the drug list (`FormularyURL`). The Marketplace importer quotes each one that is filled in `source_references`, and writes "(blank)" for a blank Summary of Benefits and Coverage address. The PBP files give no address for the plan's Summary of Benefits. Section A gives the plan's website, provider directory, drug list and pharmacy directory (`pbp_a_org_website`, `pbp_a_phys_web_addr`, `pbp_a_formulary_web_addr`, `pbp_a_pharmacy_website`), and the Medicare Advantage importer quotes each one that is filled, and says so when the website or the provider directory cell is blank; it also writes the website to `contacts.website` and the directory to `network_tiers[].provider_directory_url` when the address is a URI with its scheme. Benefit Plan Standard schema 1.2.0 has no field that says the CMS files give no address, so neither importer writes one. For a Medicare Advantage plan, the link to the plan's documents is the link to its page on Medicare Plan Finder, which is SHOULD.

A Medicare Advantage answer SHOULD carry the link to the plan's page on Medicare Plan Finder, which follows this pattern:

```text
https://www.medicare.gov/plan-compare/#/plan-details/{year}-{contract}-{plan}-{segment}?year={year}&lang=en
```

The plan keeps its 3 digits and the segment is written as an unpadded integer (000 becomes 0), as in the file's `bid_id`: for contract year 2027, `H1609-028-000` is `2027-H1609-028-0` and `H2406-013-000` is `2027-H2406-013-0`. On October 21, 2026 both links opened to the right plan in a browser, with the premium, the deductible, the costs and a Plan Documents tab. The link is the plan's page on Medicare Plan Finder, not the Summary of Benefits: the Plan Documents tab carries the Summary of Benefits only when the plan supplied it, and on October 21, 2026 the H2406-013 page said the plan had not. Benefit Plan Standard schema 1.2.0 has no field for this link (`contacts.website` is the plan's own website), so the Medicare Advantage importer writes nothing, and the pledgee builds the link from the plan key.

A pledgee SHALL rerun the 2 importers on every new or corrected CMS release, publish 1 document version per release, and retire a plan year's documents when the plan year ends, so that no app serves a past year as current. A CMS update that keeps the release label within a year, as a quarterly update of the PBP Benefits file can, has the same folder name as the release before it, so for Medicare Advantage 1 version per release is today 1 version per release label; Question 2 asks the workgroup about this layout. The index writer refuses a release folder that holds documents of 2 download dates, so today a pledgee that publishes such an update replaces the earlier documents in that folder.

Each release has its own folder, `<root>/<release>/`, which holds the document of each plan, its Bundle where the pledgee publishes it, and for Medicare Advantage `service-areas.json` (see What a pledgee publishes). The release and the folder name are these, each run of characters other than letters, digits, `.`, `_` and `-` written as 1 `-`:

- Medicare Advantage: the release is the release label, and the folder name is derived from the document's first `source_references` excerpt, the label it gives made file-safe, so `PBP Benefits-2027` is the folder `PBP-Benefits-2027`.
- Marketplace: the Marketplace files have no release name, so the release is the download date of the Plan Attributes PUF, and the index writer constructs the folder name from the plan year and that date in the first excerpt, `marketplace-puf-<plan year>-<download date>`, such as `marketplace-puf-2026-2026-10-05`.

The index, `<root>/index.json`, lists the documents of every release, newest release first, and each entry carries its `release`, its `data_date`, which is the download date, and the paths of its files, which include the release folder. Newest release first is the index writer's order: the releases by `data_date`, newest first, and releases of 1 date by folder name, across both programs. The releases of the 2 programs interleave, so an app filters the entries by `program` first, and the first entry of a program is of that program's newest release. Older releases stay until the pledgee retires them. A document's own first `source_references` excerpt still names its release, so a file found by other means is still identifiable. The PBP Readme in the zip, `Readme_PBP_Benefits_2027.txt`, says: "The PBP Benefits file is updated quarterly." The proposed cadence for the MVP is within 7 days of a CMS release (proposal for the workgroup to set).

Of these, the 2 importers do 3 things today: every document they write carries its download dates, every Medicare Advantage document carries its release label, and every Marketplace document carries the download date of its Plan Attributes PUF, which is its release, and each file's `ImportDate`. The index writer, `scripts/publish-fhir.js --pledgee`, writes the index and stops when a document is not in the folder of its release (see The index for every condition it stops on). The version per release and the retirement at the end of the plan year are rules for the pledgee, and nothing in the repository retires a release. The 2 importers read 1 release of the CMS files per year folder (`data/pbp/2027/`, `data/puf/2026/`), so 2 releases of the CMS files of 1 year cannot sit side by side there, and a pledgee keeps the earlier release's CMS files elsewhere to compare them (section 12 of each importer spec). The published documents of 2 releases sit side by side in their release folders.

## What a pledgee publishes

This is the minimum contract, what a pledgee publishes for each plan and what a reader may assume. It describes what the 2 importers, the Benefit Plan Standard converter ([`scripts/to-insuranceplan.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/to-insuranceplan.js)) and the index writer ([`scripts/publish-fhir.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/publish-fhir.js) with `--pledgee`) produce today.

### The files of each plan

For each plan, a pledgee publishes the files under What comes back, the document and, where the pledgee publishes it, the Bundle, named by plan key:

- `<plan key>.json`, the Benefit Plan Standard document, SHALL;
- `<plan key>.bundle.json`, the SBC InsurancePlan Bundle made from it, SHOULD.

The Benefit Plan Standard document is SHALL. The SBC InsurancePlan Bundle is SHOULD until the SBC InsurancePlan profile publishes, because the profile is at ballot, and the index carries `bundle` null for a plan whose Bundle the pledgee does not publish.

The document and the Bundle sit in the folder of their CMS release, `<root>/<release>/` (see Source, date and refresh), and an index at the root lists them. Each Medicare Advantage release folder also holds `service-areas.json`, which is SHALL for a Medicare Advantage release: without it an app cannot find the plan key from the member's county (see Identifying the plan and Service areas). The 2 importers and the Benefit Plan Standard converter write the file names they are given (`--out`, `-o`), and the commands under How to get them, followed by the index writer (see The index), write this layout for the 2 examples:

```text
published/
  index.json
  PBP-Benefits-2027/
    H1609-028-000.json
    H1609-028-000.bundle.json
    service-areas.json
  marketplace-puf-2026-2026-10-05/
    68398FL0030058-01.json
    68398FL0030058-01.bundle.json
```

### The index

The index is 1 JSON file, `<root>/index.json`, with 1 entry per document. The index writer, [`scripts/publish-fhir.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/publish-fhir.js) with `--pledgee`, writes it, and `service-areas.json` in every Medicare Advantage release folder:

```sh
node scripts/publish-fhir.js --pledgee published
```

After the commands under How to get them, it prints

```text
wrote published/PBP-Benefits-2027/service-areas.json (1 plan key, 11 counties, 0 regions)
wrote published/index.json (2 documents, 2 releases)
```

The index writer reads every `<plan key>.json` in the release folders, and the `<plan key>.bundle.json` beside it when there is one, and changes no document or Bundle. For `service-areas.json` it reads `PlanArea.txt` and `PlanRegionArea.txt` from `data/pbp/<contract year>/`, the folder the Medicare Advantage importer reads, or from `<dir>/<contract year>/` with `--data <dir>`. The index writer stops, names the file, and writes no index and no `service-areas.json` when:

1. the root is not a folder, or holds release folders and also a document or a Bundle outside them;
2. a release folder holds no document;
3. a Bundle has no document beside it, or is not a Bundle that holds an InsurancePlan;
4. a document's first `source_references` excerpt does not name the PBP files or the Marketplace PUFs with the year, the release and the download date as the 2 importers write them, or gives the release label "(not recorded)";
5. a document has no plan key in `plan_identifiers`, or is not named by its plan key;
6. a document is not in the folder of its release;
7. a release folder holds documents of 2 download dates, or of 2 years;
8. for a Medicare Advantage release folder, `PlanArea.txt` or `PlanRegionArea.txt` is absent, their `download.json` does not give the folder's release label and download date, or a plan key of the folder is on no row of either file: the index writer says that `service-areas.json` cannot be written, and writes no partial one.

A root with documents and no release folders is read as 1 release with no name: the index writer says so, each entry's `release` is null, and no `service-areas.json` is written, so each entry's `service_areas` is null.

The index opens with the header fields of the site's index, `description`, `profile`, `package`, `profile_status`, `fhir_version`, `bps_repository` and `converter_spec`, and lists the entries in `plans`, newest release first (see Source, date and refresh) and by plan key within a release. An entry has these fields, in this order:

| Field | What it holds |
|---|---|
| `id` | The plan key, from `plan_identifiers`. |
| `plan_name` | The document's `plan_name`. |
| `carrier` | The document's `carrier`. |
| `plan_type` | The document's `plan_type`. |
| `plan_year` | The document's `plan_year`. |
| `program` | "Medicare Advantage" or "Marketplace", from the first `source_references` excerpt, decided as `scripts/rtb-completeness.js` decides it (see Completeness). |
| `bps_schema_version` | The document's `schema_version`. |
| `document` | The document's path from the root, `<release>/<plan key>.json`. |
| `bundle` | The Bundle's path from the root, `<release>/<plan key>.bundle.json`, or null when the release folder has no Bundle for the plan. |
| `service_areas` | For a Medicare Advantage entry, the path of the release folder's `service-areas.json` from the root, `<release>/service-areas.json`; null for a Marketplace entry, and null when the root has no release folders. |
| `release` | The name of the release folder, or null when the root has no release folders. |
| `data_date` | The download date of the release, from the first excerpt: for Marketplace, the date of the Plan Attributes PUF, which is the release. |
| `benefits_placed` | The number of benefits the Bundle places in `coverage.benefit`, or null with no Bundle. |
| `benefits_unmapped` | The number of benefits the Bundle lists in `bps-unmapped-benefit` extensions, or null with no Bundle. |
| `label` | What the document was read from, such as "Medicare Advantage, imported from the CMS PBP Benefits files for contract year 2027." |

The site's own index, [`fhir/index.json`](https://benefitplanstandard.org/fhir/index.json), names its files by slug, such as `aetna-medicare-select-extra-hmo-pos-h1609-028-000.json`, because the site publishes the Benefit Plan Standard repository's examples, not a pledgee's files.

### Service areas

`<release>/service-areas.json` is 1 JSON file in every Medicare Advantage release folder, with 1 entry per plan key in the folder. The pledgee has the PBP files and an app does not, so the index writer writes the file from `PlanArea.txt` and `PlanRegionArea.txt` of the folder's release, and quotes each value as the file gives it, as the Medicare Advantage importer quotes cells. When the PBP files are absent, the index writer says that the file cannot be written and writes nothing. `service-areas.json` is SHALL for a Medicare Advantage release: without it an app cannot find the plan key from the member's county (see Identifying the plan).

`service-areas.json` opens with `description`, `release`, `contract_year` and `data_date`, and lists the plan keys in `plans`, by plan key. `release` and `data_date` are those of the index entries, and `contract_year` is the contract year of the release. A plan in `service-areas.json` has these fields, in this order:

| Field | What it holds |
|---|---|
| `plan_key` | The plan key, as in the index entry's `id`, such as `H1609-028-000`. |
| `contract` | The 5-character contract, such as `H1609`. |
| `plan` | The 3-digit plan, such as `028`. |
| `segment` | The segment, padded to 3 digits as in the plan key, such as `000`. |
| `counties` | The counties the plan key serves, from its `PlanArea.txt` rows, by SSA county code; empty for a regional PPO. |
| `regions` | The regions of a regional PPO, from its `PlanRegionArea.txt` rows, by region code; empty for a local plan. |

A county has `ssa_county_code`, `county`, `state`, `partial_flag` and `eghp_flag`, from the `PlanArea.txt` columns `county_code`, `county`, `stcd`, `partial_flag` and `eghp_flag`, and a region has `region_code`, `region` and `region_type`, from the `PlanRegionArea.txt` columns `ma_or_pdp_region_code`, `region` and `region_type`. For the worked example, the entry of `H1609-028-000` lists 11 counties in Florida, among them `{"ssa_county_code": "10150", "county": "Duval", "state": "FL", "partial_flag": "", "eghp_flag": "0"}`.

### What counts

A document counts toward completeness and toward inclusion in the index when it carries all 6 of these:

1. It passes Benefit Plan Standard schema 1.2.0. The 2 importers check this before writing, and an import that fails writes nothing.
2. The plan key, in `plan_identifiers`: system `cms_contract_plan_segment` for Medicare Advantage, `hios_plan_id` for Marketplace.
3. The plan year, in `plan_year`.
4. The release, in the first excerpt. For Medicare Advantage this is the release label. For Marketplace it is the download date of the Plan Attributes PUF; the 3 file names and addresses and each file's `ImportDate` are in the first excerpt too, and are not the release.
5. The download dates, in the first excerpt.
6. The CMS cells behind its values. Every tier row with a cost share quotes its cells in `notes`, and a value with no field is quoted in `source_references`. A Medicare Advantage row that is not covered quotes the cell that says so. A Marketplace row that is not covered carries `covered` false under a benefit whose `raw_label` is the file's exact `BenefitName`, and quotes no cell, because the Marketplace importer does not quote `IsCovered` today (see Follow-ups); a Marketplace document with such rows counts.

A Medicare Advantage release counts when its folder also holds `service-areas.json`, which is SHALL.

A reader may assume nothing beyond the pledgee's published files: the document of each plan and, where the pledgee publishes it, the Bundle, the index and, in each Medicare Advantage release folder, `service-areas.json`. There is no hosted service and no request for 1 service. An app retrieves the plan's document or its Bundle and reads the answer from it, and a benefit missing from a document is not an answer that the plan does not cover it (see Reading the data dictionary).

## Reading the data dictionary

[`data-dictionary.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/data-dictionary.md) has 106 rows in 5 sections: the plan key, plan year and date of the data; plan-level fields; network items; services with a cost; and the extra benefits. Each extra benefit has 3 rows, for whether it is covered (SHALL), its cost and conditions (SHOULD), and its limits (SHOULD).

| Column | What it holds |
|---|---|
| Item | The workgroup's name for the service or benefit, with the canonical key from the Benefit Plan Standard repository's [`vocabularies/canonical-benefits.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/vocabularies/canonical-benefits.json) beside it. Where the 2 programs name an item differently, both names are shown. Plan-level items carry short names given in this specification. |
| Field path | Where the value is in the document. `benefits[canonical_key=primary_care]` is the item of `benefits` whose `canonical_key` is `primary_care`; `[]` means every item and `[0]` the first. |
| Meaning | What the item is, in 1 sentence. |
| Medicare Advantage, Marketplace | The label for that program, then where the Medicare Advantage importer or the Marketplace importer reads the item: the CMS file and its columns, the PBP category, or the exact Marketplace BenefitName. |
| Note | How the 2 importers read the columns, anything not in the CMS file, and the full text of any open gap that touches the row. |

The labels are SHALL, SHOULD and KEY. KEY marks the plan key, which an app uses to find the document and does not show the member. "Not on the Medicare Advantage list" or "Not on the Marketplace list" means the scope does not ask for the item in that program; where a crosswalk still maps the key, the cell names the rows.

"Not in the CMS file" and a gap are different things. "Not in the CMS file" means the files the Medicare Advantage importer or the Marketplace importer reads cannot carry the item for that program, so there is nothing for an importer to fix; the note says what that importer writes instead. Medicare Advantage coverage dates are an example: no PBP file has a date column. A gap means the scope asks for something the CMS file has, but 1 of the 2 importers or the Benefit Plan Standard schema does not carry it. No gap is open in this version: the 8 that version 0.1 listed were closed on October 20, 2026, and the next section says how.

"Quoted verbatim in `source_references`" means the CMS file has the value and the Benefit Plan Standard schema has no field for it, so the 2 importers copy the column and its value into a `source_references` excerpt. The Marketplace drug deductible is the 1 exception: Benefit Plan Standard schema 1.2.0 has `pharmacy.deductible`, which the Marketplace importer does not write yet, and its cell says so (see Follow-ups). "(not read)" marks a column that is in the CMS file but that the Medicare Advantage importer or the Marketplace importer does not read today.

The 4 states differ by what the CMS file holds: not in the CMS file means no column exists; not read means the column exists and the Medicare Advantage importer or the Marketplace importer does not read it today, which happens on the SHOULD telehealth row and, on the SHALL member services row, for a phone number the item does not need; quoted means the column is read and its value is held in `source_references`, because the Benefit Plan Standard schema has no field for it; and a gap was a SHALL item that 1 of the 2 importers or the Benefit Plan Standard schema did not carry, and all 8 gaps were closed on October 20, 2026.

Both importers write the same tier ids, `IN`, `IN2`, `OUT` and `POS` where the plan has them, in `tier_id` and in an accumulator's `network_tier`, and the dictionary's field paths select tiers by them, as in `network_cost_shares[tier_id=IN]`. An accumulator's `network_tier` can also be null, which means the slot does not apply to 1 tier: the Medicare Advantage importer writes null for a PPO's annual deductible whose scope names both in-network and out-of-network services (48 plans in the contract year 2027 files, Medicare Advantage importer spec section 4.3), which is why the dictionary's Deductible row says IN, null or OUT.

A missing benefit is never the answer that the plan does not cover the benefit: that answer is a benefit written with `covered` false on every tier. A benefit missing from a document means the CMS files hold no answer for it, with 1 exception. For Medicare Advantage hearing aids and eyeglasses, a missing benefit can also mean the plan answers the category with Yes and offers only other types in it, such as other hearing aids than prescription hearing aids of all types, or other eyewear than eyeglasses with lenses and frames; the Medicare Advantage importer then writes nothing for the benefit (see the covered-or-not rows of `hearing_aids` and `eyeglasses` in the data dictionary). For Medicare Advantage dental cleanings and fillings, `covered` false can also mean the plan filed no dental entry, and the row's notes say so.

To regenerate the dictionary, run `node scripts/build-rtb-dictionary.js`; `--check` exits 1 if the file on disk differs. The generator stops, and names the item, when a SHALL item has no canonical key or no crosswalk row and `shall-should.json` records no open gap for it, when an item refers to a closed gap, when a field path is not in the Benefit Plan Standard schema version the program's documents follow, or when a column named as read for Medicare Advantage is in neither the Medicare Advantage importer nor its example documents, and likewise for Marketplace.

## Gaps closed on October 20, 2026

Version 0.1 listed 8 things the scope asks for that the 2 importers did not carry. All 8 were closed on October 20, 2026, by work on the 2 importers, 1 key in the canonical benefit vocabulary (version 1.3.0) and 2 optional fields in the Benefit Plan Standard schema 1.2.0 draft, `contacts` and `network_tiers[].provider_directory_url`; none is a change to the scope. No dictionary row carries a gap now.

- **G1.** Physical therapy and speech therapy priced together (category 7i) has the key `physical_and_speech_therapy`.
- **G2.** The Medicare Advantage importer reads preventive services (category 14a): a $0 copay in network on the plan's attestation, `pbp_b14a_mc_prevent_attest`, and the out-of-network and point-of-service cost from the Section C groups that list 14a.
- **G3.** The Medicare Advantage importer writes `premium` and `part_b_premium_reduction` from Section D; a blank premium (1,362 of the 6,872 plans) and a reduction answered No write nothing.
- **G4.** The Medicare Advantage importer writes `contacts.member_services_phone` on every plan, and `contacts.website` when Section A gives a URI with its scheme (457 plans); an address without one is quoted.
- **G5.** Both importers write `network_tiers[].provider_directory_url` on the in-network tier: the Medicare Advantage importer from Section A when the address is a URI with its scheme (1,585 plans), and the Marketplace importer from the Network PUF, now its third file (every one of the 20,670 medical plan variants of plan year 2026).
- **G6.** The Marketplace importer quotes each file's `ImportDate` in the first `source_references` excerpt, beside the download dates.
- **G7.** Marketplace documents are written in Benefit Plan Standard schema 1.2.0, with `plan_identifiers`.
- **G8.** The Marketplace importer quotes the descriptions of coverage outside the service area and outside the country when they are filled.

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
| Outside the network | No `POS` row, because no `pbp_Section_C_POS.txt` group lists 7a. The Summary of Benefits prints "Not Covered" (see Accuracy, reading kind 1). | `network_cost_shares[tier_id=OUT]`, coinsurance at rate 1, from `CoinsOutofNet "100.00%"` |
| Prior authorization | `conditions` is empty. `pbp_b7_health_prof.txt` has no authorization or referral column for 7a (categories 7b to 7k have `_auth_yn` and `_refer_yn`), so the file does not say. | Not in the CMS file. The plan-level referral answer is quoted in `source_references`: `IsReferralRequiredForSpecialist "Yes"`, `SpecialistRequiringReferral "All, except OBGYN and as state mandated."` |
| Other conditions | None | 1 explanation in `conditions`, "Cost sharing for Virtual Primary Care matches in-person office visit." |
| Bundle element | `InsurancePlan.plan[0].specificCost[0]`, category `primary-care-visit`, with a `copay` cost, `in-network`, value 0 USD, `deductible-applies` false, and an `out-of-network` cost typed "Not stated in the BPS document", whose value carries the `data-absent-reason` `unknown` | `InsurancePlan.plan[0].specificCost[18]`, category `primary-care-visit`, with a `copaypct` cost, `in-network`, value 0 percent, `deductible-applies` true, and an `out-of-network` cost of 100 percent |
| Plan year and as-of date | 2027, release `PBP Benefits-2027`, downloaded 2026-10-06 | 2026, the 3 PUFs for plan year 2026, each with `ImportDate` October 15, 2025, downloaded 2026-10-05 (the Network PUF 2026-10-20) |

In both documents the plan year is in `plan_year`, and the release and the download date are in the first `source_references` excerpt. In both Bundles they are in the `planYear` part of the `bps-plan-metadata` extension and in the first `bps-source-reference` extension.

For the Aetna plan, an app answers that a primary care visit costs $0 in network with no deductible, for plan year 2027, from release PBP Benefits-2027 downloaded October 6, 2026. The CMS file does not say whether the visit needs prior authorization, and it gives no point-of-service cost for the visit.

For the UHC plan, an app answers that the file says "No Charge after deductible" in network, with a $10,600 deductible, and 100 percent out of network, for plan year 2026, from the files downloaded October 5, 2026. Whether the visit needs prior authorization is not in the CMS file. The plan's referral answer, which is about specialists, travels with the document.

## Conformance

Everything in this section is a proposal for the workgroup to set. Each of the 3 measures has a starting number with its reason, and the last subsection proposes a rule for moving SHOULD items to SHALL at GA. The workgroup sets the numbers and can change any of them.

### Completeness (proposal for the workgroup to set)

Of the SHALL items in scope that apply to a plan, how many the plan's document populates. It is counted per plan, for each program.

The proposed threshold is 90 percent for each plan. All 10 examples meet it: the 5 Medicare Advantage examples populate every applicable item, and the 5 Marketplace examples 97.9 to 100.0 percent.

[`scripts/rtb-completeness.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/rtb-completeness.js) does the count, and its header states each rule. It counts every item labelled SHALL for the plan's program and the covered-or-not aspect of each extra benefit on the program's list; KEY and SHOULD items are not counted. A few items apply only to some plans: the out-of-network and point-of-service items to plans with that option, the separate drug deductible to Marketplace plans that keep one, and the second-tier items to Marketplace plans with a second in-network tier. An item with an open gap counts as a miss even where the document carries part of it, so every gap shows in the number; none is open since October 20, 2026. Any other item is populated when the document holds its answer in 1 of these 4 ways:

- the field holds a value;
- the CMS cell is quoted in `source_references`, because the Benefit Plan Standard schema has no field for it;
- the CMS cell is quoted, because the plan files no value, such as a deductible of "Not Applicable";
- the address is quoted instead of written, because it is not a URI.

A blank cell is not an answer.

With no arguments, `scripts/rtb-completeness.js` reads the 10 examples. It decides a document's program from the first `source_references` excerpt, which begins "CMS Plan Benefit Package (PBP) Benefits" for Medicare Advantage and "CMS Health Insurance Exchange Public Use Files" for Marketplace. It finds a service or an extra benefit by `benefit_id` in Medicare Advantage and by `raw_label`, the exact `BenefitName`, in Marketplace. A pledgee that writes documents by other means than the 2 importers must keep those strings: without the opening words the count stops on the document, and without the benefit strings it misses the document's services and extra benefits.

Run on the 10 examples, `node scripts/rtb-completeness.js --misses` prints 1 line per document, in file-name order, with the columns Document, Plan key, Program, Plan year, Populated, Applicable and Percent, and under a document each item it misses, as `miss <item> (<why>)`:

```text
Document                                                               Plan key           Program             Plan year  Populated  Applicable  Percent
aetna-medicare-aetna-medicare-select-extra.pbp.json                    H1609-028-000      Medicare Advantage  2027       43         43          100.0
avmed-avmed-entrust-gold-125.puf.json                                  19898FL0340001-01  Marketplace         2026       48         49          98.0
    miss plan_exclusions (not in the document)
blue-cross-and-blue-shield-of-louisiana-blue-max-copay-50-50.puf.json  97176LA0340010-01  Marketplace         2026       47         48          97.9
    miss plan_exclusions (not in the document)
florida-blue-blueoptions-gold-1505.puf.json                            16842FL0070120-01  Marketplace         2023       48         49          98.0
    miss plan_exclusions (not in the document)
humana-humana-gold-plus-h1036-068.pbp.json                             H1036-068-000      Medicare Advantage  2027       39         39          100.0
scan-health-plan-scan-costco-medicare-advantage.pbp.json               H5425-140-000      Medicare Advantage  2027       39         39          100.0
unitedhealthcare-aarp-medicare-advantage-from-uhc-fl-0021.pbp.json     H2406-013-000      Medicare Advantage  2027       43         43          100.0
unitedhealthcare-uhc-bronze-essential.puf.json                         68398FL0030058-01  Marketplace         2026       47         47          100.0
unitedhealthcare-uhc-gold-standard.puf.json                            40220TX0080024-01  Marketplace         2026       47         47          100.0
upmc-for-life-upmc-for-life-ppo-rx-choice.pbp.json                     H5533-019-000      Medicare Advantage  2027       43         43          100.0
```

`florida-blue-blueoptions-gold-1505.puf.json`, BlueOptions Gold 1505, is read from the plan year 2023 files and is in the output as an example of the format, not as MVP data; the MVP's Marketplace year is 2026.

Every example is over the proposed 90 percent. The number is a target, not a claim. A Medicare Advantage plan has 43 applicable items, or 39 for an HMO, which has no out-of-network cost, deductible, maximum or combined amounts, and all 5 Medicare Advantage examples populate every one. On 3 of them, Aetna, AARP and SCAN, the website and the provider directory address have no scheme, so they are quoted, not written, and count as populated the way any quoted cell does (see Follow-ups). A Marketplace plan has 47 applicable items, 1 more when the drug deductible is separate and 2 more when the plan has a second in-network tier. The only Marketplace misses are the plan-wide exclusions, `plan_exclusions`, of 3 plans, whose `PlanLevelExclusions` cell is blank in the Plan Attributes PUF. The plan key is a KEY item and is not counted.

### Accuracy (proposal for the workgroup to set)

On a checked sample of plans, how many values agree with the carrier's own PDF for the plan: the Summary of Benefits for a Medicare Advantage plan, the Summary of Benefits and Coverage for a Marketplace plan. This is check 1b in section 5 of the GA draft, "CMS filing agrees with the plan's own documents".

The proposed threshold is 0 contradictions on the checked sample, with every reading documented, because a contradiction means the member could get a different answer from the plan than from the app. A contradiction is a defect to fix in 1 of the 2 importers or a correction to report, and it is never corrected silently. The GA draft's check 1a, "Faithful conversion", already asks for 100 percent; this is the number for check 1b.

The CMS file is the source and the carrier PDF is the check. When they disagree, the CMS file is what the MVP serves, and the contradiction is reported.

For each checked plan, an expectations file lists the values the carrier PDF prints, in the Benefit Plan Standard repository's [`docs/specs/pbp-sob-checks/`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/tree/main/docs/specs/pbp-sob-checks) for Medicare Advantage and [`docs/specs/puf-sbc-checks/`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/tree/main/docs/specs/puf-sbc-checks) for Marketplace. Each check gives the page, the printed text, the value as JSON and a JSON pointer into the plan's Benefit Plan Standard document. Where the Medicare Advantage importer or the Marketplace importer reads the CMS file differently from the print on purpose, the check also gives the reading the document should hold and a note with the cells and the section of that importer's spec that explain it. The Benefit Plan Standard repository's [`scripts/pbp-sob-check.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/pbp-sob-check.js) compares the document with the expectations file and gives each value 1 of 3 outcomes. MATCH means the document holds the printed value, READING means it holds the documented reading, and DIFFERENCE means it holds neither, which is a contradiction. The script exits 1 on any contradiction, and it reads a Marketplace document the same way as a Medicare Advantage one. Anyone can rerun the checks from the repository, because the example documents and the expectations files are committed:

```sh
node scripts/pbp-sob-check.js examples/aetna-medicare-aetna-medicare-select-extra.pbp.json docs/specs/pbp-sob-checks/H1609-028-000.json
node scripts/pbp-sob-check.js examples/unitedhealthcare-aarp-medicare-advantage-from-uhc-fl-0021.pbp.json docs/specs/pbp-sob-checks/H2406-013-000.json
node scripts/pbp-sob-check.js examples/unitedhealthcare-uhc-bronze-essential.puf.json docs/specs/puf-sbc-checks/68398FL0030058-01.json
```

The carrier PDFs are not in the repository (`data/` is git-ignored). Each expectations file names its PDF by the carrier's document ID and gives the page of every value, so a reader can check the printed values against the carrier's own copy. The Marketplace file also records the address it was downloaded from and the SHA-256 hash of the copy checked.

The results, run on October 20, 2026 after the gaps closed, with checks added for the new values the carrier PDFs print:

| Plan | Carrier document ID | Checks | Match | Reading | Contradiction |
|---|---|---|---|---|---|
| `H1609-028-000`, Aetna Medicare Select Extra (HMO-POS) | `Y0001_H1609_028_HP32_SB2027_M` | 65 | 47 | 16 | 2 |
| `H2406-013-000`, AARP Medicare Advantage from UHC FL-0021 (PPO) | `Y0066_SB_H2406_013_000_2027_M` | 83 | 71 | 12 | 0 |
| Medicare Advantage | | 148 | 118 | 28 | 2 |
| `68398FL0030058-01`, UHC Bronze Essential ($0 Virtual Urgent Care) | `FL0055 EXFL26IF0275669_000` | 50 | 39 | 11 | 0 |
| Both programs | | 198 | 157 | 39 | 2 |

Across the 2 Medicare Advantage plans, the 148 values gave 2 contradictions, both on links, and 28 documented readings. The 11 checks added on October 20, 2026 cover the monthly premium and preventive care in and out of network on both plans, the member services phone on Aetna, and the website and the provider directory link on both. The Medicare Advantage readings are of 8 kinds, with the Medicare Advantage importer spec section that sets each:

1. **Not Covered cells with no POS row** (8, all Aetna). The Summary of Benefits prints "Not Covered" in its out-of-network column for a category that no `pbp_Section_C_POS.txt` group lists, and the Medicare Advantage importer writes no POS row for such a category (section 5.4), so the document says nothing about it outside the network (section 7.14, question O1). These are primary care, the diagnostic and routine hearing exams, hearing aids, individual mental health sessions, dental, eyeglasses and fitness.
2. **Priced once, written in network only** (4, 2 on each plan). The file prices emergency and urgent care once, with no network, and the Summary of Benefits prints the amount in both columns; the Medicare Advantage importer writes it on the in-network tier with a note (decision 5, section 7.13).
3. **A range where the Summary of Benefits prints 1 amount** (4, 2 on each plan). The file gives a minimum and a maximum copay and the Summary of Benefits prints 1 amount, for the specialist and outpatient hospital (Aetna) and the specialist and individual mental health sessions (UHC). The Medicare Advantage importer writes the range (section 5.5). UHC's urgent care, counted under kind 2, is also a range.
4. **Authorization filed for the whole category** (4, 3 UHC and 1 Aetna). The file answers authorization once for a category that covers more than 1 benefit (section 7.10). The UHC Summary of Benefits marks only the Medicare-covered hearing exam, eye exam and foot exams, while the file's answer covers the routine ones too. On Aetna it goes the other way: the Summary of Benefits' sentence covers all dental services, and the file requires no authorization for cleanings.
5. **A value the file does not state** (3, 2 Aetna and 1 UHC). The 100 days of a skilled nursing facility stay, on both plans, are in no column of `pbp_b2_snf.txt`, and Aetna's additional inpatient days are filed with 0 intervals, so the file gives no day range and no amount for them.
6. **The combined maximum** (2, 1 on each plan). The file states the out-of-network maximum as a combined in-network and out-of-network amount, which has no slot in the Benefit Plan Standard schema 1.2.0, so it is quoted in `source_references` (section 7.1).
7. **A basis the Summary of Benefits does not print** (1, UHC). The file prices observation per day, and the Summary of Benefits prints "$550 copay".
8. **An address with no scheme** (2, UHC). The file's website and provider directory address are the printed `AARPMedicarePlans.com`, but with no scheme they are not URIs, so the Medicare Advantage importer quotes them and writes no field (section 4.1).

The 2 contradictions are on links, not cost shares, and both are Aetna's. The Summary of Benefits prints `AetnaMedicare.com` as the plan's website (page 1) and `AetnaMedicare.com/H1609-028` for its provider directories (page 2); the file gives `pbp_a_org_website` "www.aetna.com/medicare" and `pbp_a_phys_web_addr` "www.aetnamedicare.com/findprovider". The checks compare addresses with the scheme, a leading "www." and the case of the host ignored, and these 2 still differ in host or path. On October 20, 2026 all 4 addresses resolved, opened with `https://` in front because none has a scheme: both websites land on `www.aetna.com/medicare.html`, the printed directory address on the plan's page and the filed one on the provider search. The filed addresses have no scheme, so the document quotes them and holds neither in a field. The filing and the Summary of Benefits disagree, the MVP serves the filing, and the 2 are reported here as any contradiction is. The checked sample meets the proposed 0 on cost shares and misses it by these 2 links, and `scripts/pbp-sob-check.js` exits 1 on the Aetna file because of them.

The AARP Summary of Benefits prints no member services number, only a number for people who want to join, 1-844-723-6473, which is in neither of the file's 2 phone columns (the file's number for people who want to join is "(800)555-5757"), so the phone is not checked on that plan.

The first Marketplace check compares UHC Bronze Essential, `68398FL0030058-01`, with the Summary of Benefits and Coverage its Plan Attributes row links, and its 50 values gave 0 contradictions and 11 documented readings. The checks cover the deductibles and out-of-pocket limits, the 12 core services in both columns, home health and skilled nursing care with their limits, preventive services, whether the plan covers each of the 10 extra benefits on the Marketplace list, and since October 20, 2026 the provider directory link, which matches the Network PUF's `NetworkURL`. The 11 readings are of 1 kind, Not Covered out of network with 100 percent in the file. For 11 services the SBC prints "Not Covered" in its out-of-network column, while the file gives the benefit `IsCovered` "Covered" and `CoinsOutofNet` "100.00%". `IsCovered` applies to the whole benefit, so the Marketplace importer writes the out-of-network row as covered, with coinsurance at rate 1 (Marketplace importer spec sections 5.4 and 7.4).

### Plan match (proposal for the workgroup to set)

Of a set of test plan keys, how many resolve to exactly 1 plan. A key that resolves to no plan, or to more than 1, fails.

The proposed threshold is 100 percent of a published test set, because an answer read from the wrong plan's document is wrong in every value.

For Medicare Advantage, the proposed test runs over the pledgee's `service-areas.json`: every county of every plan key resolves to exactly 1 segment of its contract and plan. The segment tool runs it on a pledgee's file, over every county of every contract and plan pair in the file with more than 1 segment:

```sh
node scripts/pbp-segment.js --service-areas published/PBP-Benefits-2027/service-areas.json --year 2027 --all-pairs
```

For the Benefit Plan Standard repository, the segment tool runs the same test with `--all-pairs` over the full `PlanArea.txt`, on every county of every one of the 266 contract and plan pairs that have more than 1 segment in the contract year 2027 files (see Identifying the plan):

```sh
node scripts/pbp-segment.js --year 2027 --all-pairs
```

Run on October 21, 2026, on the contract year 2027 files, it gives:

```text
contract year 2027: 6,813 contract and plan pairs in PlanArea.txt, 266 with more than 1 segment
12,640 pair and county checks: 12,640 pick exactly 1 segment, 0 pick more than 1
```

All 266 pairs pass: each of the 12,640 pair and county checks picks exactly 1 segment. A plan is a segment, and 1 contract and plan pair may have several: the 6,813 pairs are those of every plan type in `PlanArea.txt`, which holds 7,294 plan keys, and the 6,872 plans of the 4 MVP plan types this specification counts elsewhere are 6,391 pairs, 6,318 of them in `PlanArea.txt` and the 73 regional PPOs in `PlanRegionArea.txt`.

For Marketplace, the plan key is the HIOS plan id with its variant, the `PlanId`, and the test is that it is on exactly 1 row of the Plan Attributes PUF. The Marketplace importer stops on a plan key that is on no row or on more than 1.

### From SHOULD to SHALL at GA (proposal for the workgroup to set)

An item moves from SHOULD to SHALL at GA when, in each program that lists it, it is populated in at least 90 percent of documents for 2 consecutive CMS releases, and its crosswalk verdict is not "not covered, gap".

## Status and version

Version 0.3.1, a draft for the workgroup, dated October 21, 2026. Versions 0.3 and 0.2.1 were dated October 21, 2026, and version 0.2 October 20, 2026. Version 0.1 was written October 17, 2026, and updated October 18, 2026.

Version 0.2 adds these to version 0.1:

- The file contract section is now Retrieval and the file contract, with a new subsection, Source, date and refresh, where the GA draft's source-and-date and refresh checks land. It sets what every document and answer carries and says what each importer stamps today. It also proposes a refresh cadence.
- A new section, What a pledgee publishes, is the minimum contract.
- A new section, Worked example, walks a primary care question through 1 plan in each program.
- Conformance has a proposed number for each measure. Completeness is counted on the 10 examples by the new `scripts/rtb-completeness.js`. Accuracy has its method and results as the GA draft's accuracy check 1b, 198 values across 3 plans with 2 contradictions, both on links and none on a cost share, including the first Marketplace check. Plan match has its test set, and the rule for moving SHOULD items to SHALL at GA is proposed.
- The 8 known gaps were closed on October 20, 2026 (see Gaps closed on October 20, 2026). Both importers write Benefit Plan Standard schema 1.2.0, whose draft has 2 new optional fields, `contacts` and `network_tiers[].provider_directory_url`; the Marketplace importer reads the Network PUF as its third file; and the canonical benefit vocabulary has 1 more key.
- Follow-ups is now 1 section, with follow-ups for the 2 importers and the published files beside those for the Benefit Plan Standard converter spec.
- What comes back now says that a Marketplace row that is not covered quotes no cell.

It covers the PBP files for contract year 2027 and the Marketplace PUFs for plan year 2026. The documents of both programs are written in Benefit Plan Standard schema 1.2.0, a draft (see Scope). The canonical benefit vocabulary is version 1.3.0, with 118 keys. The PBP crosswalk has 41 rows, 35 with a canonical key, and the Marketplace crosswalk maps 84 of the 273 benefit names in the plan year 2026 file.

The crosswalk to the SBC InsurancePlan profile, [`carin-crosswalk.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/carin-crosswalk.md), has 106 rows, 1 for each row of the dictionary. Each row has a verdict for each program it applies to, so the counts are per program. A not covered verdict is either no element or gap, so the 4 verdict rows add up to the rows that apply:

| | Medicare Advantage | Marketplace |
|---|---|---|
| Rows that apply | 67 | 71 |
| Aligned | 20 | 21 |
| Different | 46 | 50 |
| Not covered, no element | 1 | 0 |
| Not covered, gap | 0 | 0 |

Every extra benefit in the MVP reaches the Bundle as identity only, plus, on Marketplace Bundles, an entry in the CARIN excluded-services extension when the plan does not cover it on any tier; that is the strongest reason the MVP format is the Benefit Plan Standard document, with the FHIR Bundle as the Part B output. The SBC InsurancePlan profile is at ballot, and nothing in the MVP's SHALL list depends on the crosswalk. To regenerate it, run `node scripts/build-rtb-crosswalk.js`; `--check` exits 1 if the file on disk differs, and the generator stops, and names the item, when a verdict is not the one the Benefit Plan Standard converter spec and `fhir/carin-sbc-crosswalk.json` give.

## Changes

The changes since version 0.2 are listed by version, 0.2.1 first. Version 0.3 settles the 4 items that version 0.2.1 left open, how a county picks a segment, how a pledgee names files and writes an index, how 2 releases of a plan's document sit side by side, and the Medicare Plan Finder link, and removes 1 difference between the 2 importers, the spelling of the network tiers in an accumulator's `network_tier`. Version 0.3.1 lets an app find the plan key from what a pledgee publishes, makes the Bundle SHOULD, and corrects the text after a second reading by an implementer new to the specification. A bullet that a later version reversed ends with the version that superseded it.

### In 0.2.1

- A paragraph and list before Purpose define the terms the 3 documents use.
- The 16 SHALL services are named, with their canonical keys, for each program, in place of "the 12 core services".
- Preventive services at $0 in network is stated as the Medicare Advantage reading; for Marketplace the item is the tier 1 cost, here and in the dictionary row.
- The use case 2 network items are 1 bullet each.
- Identifying the plan and Plan match say that resolving an address or FIPS code to an SSA county code and a segment is the pledgee's or the app's step, for version 0.3. (superseded in 0.3)
- The Part B paragraph is 3 sentences and says that Part B is the GA draft's second part, here and in the crosswalk.
- How to get them gives the examples' download dates and how the Network PUF gets its own date.
- The site index is described as 5 Medicare Advantage Bundles from the PBP files and 2 Medicare Advantage and 8 commercial Bundles read from carrier PDFs, and "document" is kept for Benefit Plan Standard JSON.
- The Medicare Plan Finder link is a SHOULD rule with no "or", and its address pattern is a version 0.3 item. (superseded in 0.3)
- The version per release says that this version sets no file name or index field for the release. (superseded in 0.3)
- What a pledgee publishes says that the site's index is the pattern for entry fields, not file names, and lists the `label` field. (superseded in 0.3)
- The sixth thing a document carries states the Marketplace not-covered rows and that they count, and the completeness rule's 4 ways are a list.
- What a reader may assume names the pledgee's 2 published files. (superseded in 0.3.1)
- Plan-level items carry short names given in this specification.
- The plan key label is spelled KEY in all 3 documents.
- Reading the data dictionary tells the 4 states apart in 1 sentence.
- Accuracy reading kind 1 cites section 7.14 for question O1 and section 5.4 for the tier-row rule.
- Reading the data dictionary states the network tier spellings of the 2 importers as a known difference. (superseded in 0.3)
- Completeness says what `scripts/rtb-completeness.js` reads with no arguments and which strings it relies on.
- The dictionary notes on the 4 extra benefits whose covered test differs from the scope's say which test a pledgee follows for the MVP.
- The crosswalk summary table drops the "Not covered" total, so its 4 verdict rows add up to the rows that apply, here and in the crosswalk.
- The dictionary says that documents of both programs follow Benefit Plan Standard schema 1.2.0.
- The dictionary's Plan key row lists `cms_contract_id` and `cms_pbp_id` beside `cms_contract_plan_segment`, and the crosswalk's row names them.
- The `scripts/rtb-completeness.js` header cites the section Gaps closed on October 20, 2026.
- Parenthetical references to a section by name begin with "see".
- Every mention of the Benefit Plan Standard schema and the Benefit Plan Standard converter in the 3 documents gives the full name.

### In 0.3

- Identifying the plan gives the 4 steps from the HETS 271 to the plan key. The new `scripts/pbp-segment.js` gives a Medicare Advantage plan's segment and plan key from an SSA county code, or from the county's name and state; the terms and the file table name it. (superseded in 0.3.1)
- Plan match runs `scripts/pbp-segment.js --all-pairs` over every county of the 266 contract and plan pairs with more than 1 segment, and each of the 12,640 pair and county checks picks exactly 1 segment.
- What a pledgee publishes names the 2 files of each plan by plan key, puts them in the folder of their CMS release, and describes the index that `scripts/publish-fhir.js --pledgee` writes, field by field. The site's own index keeps its slugs, because the site publishes the Benefit Plan Standard repository's examples. (superseded in 0.3.1)
- Source, date and refresh sets 1 folder per CMS release, named by the release, `PBP-Benefits-2027` for Medicare Advantage and `marketplace-puf-<plan year>-<download date>` for Marketplace, with the release and the download date in every index entry, newest release first. How to get them writes the 2 examples into that layout; the documents and Bundles it writes are unchanged.
- Source, date and refresh gives the Medicare Plan Finder address pattern, checked on 2 plans on October 21, 2026, for the SHOULD link. Benefit Plan Standard schema 1.2.0 has no field for it, so the pledgee builds the link from the plan key and the Medicare Advantage importer writes nothing.
- The Marketplace importer writes each accumulator's `network_tier` as `IN` or `OUT`, the tier ids, as the Medicare Advantage importer does, and the Benefit Plan Standard schema 1.2.0 draft describes `network_tier` as the `tier_id` of a tier in `network_tiers`. Reading the data dictionary says that both importers write the same tier ids. The 5 Marketplace examples and their Bundles were regenerated with that change only; the completeness and accuracy numbers are unchanged.
- A new section, Questions for the workgroup, asks 2 questions: the covered test for 4 extra benefits, and the release layout.

### In 0.3.1

- The index writer, `scripts/publish-fhir.js --pledgee`, writes `service-areas.json` in every Medicare Advantage release folder, from `PlanArea.txt` and `PlanRegionArea.txt` of the folder's release, with `--data` for the folder of the PBP files; it writes nothing when those files are absent or are another release. The index entry gains `service_areas`. A new subsection of What a pledgee publishes, Service areas, lists the fields of the file, and the test of the index writer checks the list against the fields the index writer writes.
- `service-areas.json` is SHALL for a Medicare Advantage release, in What a pledgee makes available, The files of each plan, Service areas and What counts.
- The segment tool, `scripts/pbp-segment.js`, takes `--service-areas <file>` and gives the same answer and exit code from a pledgee's `service-areas.json` as from `PlanArea.txt`; `--all-pairs` runs over either. Its fixture adds the regional PPO `R0759-001-000` and the rows of `PlanRegionArea.txt`.
- Identifying the plan gives 4 steps an app can follow from the HETS 271, the member's address and the pledgee's `service-areas.json`, says that an app with the PBP files gets the same answer from them, shows `--data test/fixtures/pbp-segment` to try the segment tool without the full download, and says that each of the 73 regional PPO contract and plan pairs of contract year 2027 has 1 segment.
- Plan match runs the proposed test over the pledgee's `service-areas.json`, keeps the 12,640 checks over the full `PlanArea.txt`, explains the 6,813 pairs beside the 6,872 plans, drops the 10 example keys, and states the Marketplace test.
- The Benefit Plan Standard document is SHALL and the SBC InsurancePlan Bundle SHOULD until the SBC InsurancePlan profile publishes, under What comes back and under The files of each plan, a new title for that subsection.
- How to get them writes each download record in its command block, with the examples' values, says that `release_label` is required for Medicare Advantage, gives the release rule for the folder names before the commands, and no longer offers `--downloaded`.
- A Marketplace release is the download date of the Plan Attributes PUF, in every sentence that defines it; the folder name is derived from the first excerpt for Medicare Advantage and constructed by the index writer for Marketplace; newest release first is the index writer's order; and the version per release says what the index writer does today with a release label that a CMS update keeps.
- The fourth SHALL item of Source, date and refresh asks for the web addresses the 2 importers quote, not a statement.
- Completeness shows the output of `scripts/rtb-completeness.js --misses` as it is printed, and The index lists every condition the index writer stops on.
- The terms add Section A, C and D, the PBP benefit category, the tier row, the accumulator and slot, and the excerpt; the file table has 6 scripts, with the index writer; the Word copies are sent with the specification and are not in the repository; the `-01` variant rule has its 3 branches; and the 30 states and the quarterly update are sourced.
- The data dictionary and the crosswalk open with a sentence that points to these terms, the crosswalk defines STU2 where it first uses it, and the dictionary's Deductible row names the Medicare Advantage importer spec and says what a null `network_tier` means.

## Questions for the workgroup

This version does not settle these 2. Each is for the workgroup to answer.

1. **The covered test for 4 extra benefits.** For hearing aids, eyeglasses, the routine eye exam and the routine hearing exam in Medicare Advantage, the Medicare Advantage importer's test for "covered" and the scope's test differ. The scope counts each benefit as covered when 1 column says so: `pbp_b18b_bendesc_yn` is 1 for hearing aids, and `pbp_b17b_bendesc_amo_egs`, `pbp_b17a_bendesc_amo_rex` and `pbp_b18a_bendesc_amo_rht` are filled for the other 3. The Medicare Advantage importer also reads the benefit's position in the category's `_bendesc_ehc` column, so a plan that offers only other types in the category is not written as covered. The 4 rows are the covered-or-not rows of `hearing_aids`, `eyeglasses`, `routine_eye_exam` and `hearing_exam` in [section 5 of the data dictionary](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/rtb-medical-mvp/data-dictionary.md#5-the-extra-benefits), The extra benefits: each row gives the Medicare Advantage importer's test in its Medicare Advantage column and the scope's test in its note. For the MVP a pledgee follows the Medicare Advantage importer's test, because the published documents hold it. Which test should pledgees follow?
2. **The release layout.** Is the layout under Source, date and refresh acceptable to pledgees: a folder per CMS release, named by the release, with `service-areas.json` in each Medicare Advantage release folder, and an index at the root that lists every release, newest first? Apps will depend on the folder names, the file names, the index fields and the fields of `service-areas.json` once pledgees publish, so a change after the MVP would break them. The PBP Readme says "The PBP Benefits file is updated quarterly.", and the contract year 2027 release label, `PBP Benefits-2027`, names the year only, so an update that kept the label would have the same folder name as the release before it, and the index writer today refuses a release folder with 2 download dates.

## Follow-ups

These were found while writing this specification. None is made in this version; each is work on the file or the specification it names.

### For the Benefit Plan Standard converter spec

The crosswalk found 2 plan types that the Benefit Plan Standard converter spec, [`insuranceplan-converter.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/specs/insuranceplan-converter.md) section 6.1, does not name. For both, the crosswalk reads its verdict from another file, and the generator checks that file.

- **HMO_POS.** The Benefit Plan Standard converter ([`scripts/to-insuranceplan.js`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/scripts/to-insuranceplan.js)) writes an HMO-POS plan's `plan.type` as text only, `{"text": "HMO_POS"}`, because `sbc-plan-type` has no code for it. Section 6.1 names HMO, PPO, POS, EPO and OAP. The contract year 2027 files have 1,273 HMO-POS plans (converter spec section 6.3). The verdict, different, is read from the published Aetna Medicare Select Extra Bundle, [`examples/fhir/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/examples/fhir/aetna-medicare-select-extra-hmo-pos-h1609-028-000.json).
- **INDEMNITY.** The Benefit Plan Standard converter codes a Marketplace indemnity plan from `sbc-plan-type`, and the Benefit Plan Standard repository's [`fhir-alignment.md`](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/main/docs/fhir-alignment.md) section 2 lists the code, but section 6.1 does not name it, and no example Bundle has an indemnity plan. The verdict, aligned, is read from the alignment guide.
- **Pending change requests.** 4 change requests to the CARIN Digital Insurance Card implementation guide were filed in HL7 Jira on October 12, 2026, and all 4 are pending: [FHIR-59603](https://jira.hl7.org/browse/FHIR-59603), a general home health code in `sbc-benefit-category`; [FHIR-59604](https://jira.hl7.org/browse/FHIR-59604), a binding for `cost.type` with a not-covered code, and what the second `cost` entry is for; [FHIR-59605](https://jira.hl7.org/browse/FHIR-59605), an HMO-POS code in `sbc-plan-type` and a hospital tier code in `cost-tier`; and [FHIR-59606](https://jira.hl7.org/browse/FHIR-59606), hearing aids and a hearing exam in `sbc-benefit-category`. If merged, and once the Benefit Plan Standard converter writes the new codes, 3 of them would move crosswalk rows from different to aligned: FHIR-59603 the home health row (`home_health_care`), in both programs; FHIR-59605 the plan type row (`plan_type`), in Medicare Advantage; and FHIR-59606 the 3 hearing aids rows (`hearing_aids`), in both programs, and the 3 routine hearing exam rows (`hearing_exam`), in Medicare Advantage. FHIR-59604 would move none, because no verdict rests on `cost.type`, the not-covered value or the second `cost` entry. The hospital tier code in FHIR-59605 would move none either: the 2 rows it touches, the inpatient hospital stay and skilled nursing facility rows in Medicare Advantage, are already aligned. Each of the 8 rows that would move names its change request in its note.
- **Contacts and the provider directory link.** The Benefit Plan Standard schema 1.2.0 draft's `contacts` and `network_tiers[].provider_directory_url` are in the documents but not in the Bundles: the Benefit Plan Standard converter writes `contact` with data-absent-reason unknown and no telecom (converter spec section 5) and no provider-network Organization (section 4.1), so the member services and provider directory rows are different, carried as quoted text. Mapping them, for example to `contact.telecom` and to a network Organization with a `telecom` of system `url`, is work on the Benefit Plan Standard converter.

### For the 2 importers and the published files

- **The SBC link and plain clients.** On October 20, 2026, the SBC address that the Plan Attributes PUF gives for `68398FL0030058-01`, `https://www.uhc.com/ifp/sbc.68398FL0030058-01.en.2026.pdf`, answered a plain request (curl with its default headers) with an HTTP 403 from the carrier's content delivery network, and the plan's brochure address did the same. With a browser User-Agent header, the SBC address redirects to the same path without `.pdf` and returns the 12-page PDF. An app that follows the link from a server can get the 403, so the retrieval rules may need to say how a pledgee checks that a link answers.
- **Web addresses with no scheme.** In the contract year 2027 files, 6,415 of the 6,872 `pbp_a_org_website` cells and 5,160 of the `pbp_a_phys_web_addr` cells give an address with no scheme, such as "www.aetna.com/medicare". The Benefit Plan Standard schema fields are URIs, so the Medicare Advantage importer quotes those addresses and writes no field; it adds no scheme it would have to guess. The workgroup could ask pledgees to publish the address with its scheme, or CMS to file it so.
- **Marketplace drug deductible.** Marketplace documents follow Benefit Plan Standard schema 1.2.0 since October 20, 2026, and its `pharmacy.deductible` could hold a separate drug deductible (the DEHB columns when `MedicalDrugDeductiblesIntegrated` is No). The Marketplace importer still quotes those cells and writes no field.
- **Marketplace rows that are not covered.** A Marketplace tier row that is not covered quotes no cell, because the Marketplace importer does not quote `IsCovered`; 18 of the 104 tier rows of `68398FL0030058-01` are such rows. Quoting it would put a CMS cell behind every value.
- **Out-of-network coverage on Medicare Advantage HMOs.** An HMO document says that the plan pays nothing outside its network only by having no `OUT` or `POS` tier. It does not quote `pbp_c_oon_yn` or `pbp_c_pos_yn`, the cells that say so.
- **The plan key in the site's index.** An entry of the site's `fhir/index.json` has no plan key, so an app that starts from a plan key has to read each Bundle to find the plan. A pledgee's index carries the key in `id` (see What a pledgee publishes); the site's entries could carry it too.
- **The check script's name.** `scripts/pbp-sob-check.js` and its header name the Medicare Advantage importer only, and section 13 of the Medicare Advantage importer spec describes it. It ran the Marketplace check unchanged, so its header and a Marketplace importer spec section could say so.
