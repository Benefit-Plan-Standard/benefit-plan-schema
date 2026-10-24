# Changelog

All notable changes to the **Benefit Plan Standard Schema** will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Medical MVP technical specification, drafts of October 20 to 24, 2026

From version 0.3.3, dated October 21, 2026, the 3 documents of `docs/specs/rtb-medical-mvp/` state the present only: what the 2 importers read, what the documents carry, the numbers and how to rerun them. The README no longer has a Changes section or the section "Gaps closed on October 20, 2026", and its Status and version section is 1 paragraph that points here. What the README said about its drafts, from version 0.1 to version 0.3.2, is kept below as the README gave it in version 0.3.2. `scripts/build-rtb-dictionary.js` and `scripts/build-rtb-crosswalk.js` print no gap id and no closed gap; an open gap prints in the row as a plain sentence, "The <program> importer does not read <columns> today", and the checks are unchanged. A Changes section returns to the README from the first circulated version on, starting at 0.3.3.

### In 0.3.5, October 24, 2026

Version 0.3.5 adds 2 proposals to the Conformance section of the README. Both come from the workgroup's breakout of October 22, 2026, where a payer in the workgroup asked that an app say beside MVP values that they are not the payer's, so that members do not call a payer about values the payer did not serve, and the breakout agreed it.

- A new subsection, What an app shows beside the data, proposes a SHALL on an app that displays values from a pledgee's MVP files: on the same screen as the values, a statement that the information does not come from the member's insurance company, the plan year and the as-of date of the release, a direction to check with the plan for the member's own coverage and cost, and that a service not listed may still be covered. The specification sets the 4 parts, not the sentence, and gives 1 example wording. The plan year and the as-of date are those the file contract already carries, under Source, date and refresh.
- A new subsection, Plan identity at GA, says that at GA the plan identifier of a member who has signed in with the payer comes from the payer's coverage record, and the payer supplies the plan's SBC InsurancePlan Bundle; the resolution paths under Identifying the plan are the case where no payer gives the app a coverage record, and the 2 are 1 design.
- The terms define payer, and the opening of Conformance names the 2 new subsections.
- The preface of the 3 documents, which `scripts/build-rtb-dictionary.js` writes, gives version 0.3.5, dated October 24, 2026. Nothing else in the data dictionary or the crosswalk changed, `shall-should.json` has no new item, and the counts are unchanged.

### Status and version, as of 0.3.2

Version 0.3.2, a draft for the workgroup, dated October 21, 2026. Versions 0.3.1, 0.3 and 0.2.1 were dated October 21, 2026, and version 0.2 October 20, 2026. Version 0.1 was written October 17, 2026, and updated October 18, 2026.

Version 0.2 adds these to version 0.1:

- The file contract section is now Retrieval and the file contract, with a new subsection, Source, date and refresh, where the GA draft's source-and-date and refresh checks land. It sets what every document and answer carries and says what each importer stamps today. It also proposes a refresh cadence.
- A new section, What a pledgee publishes, is the minimum contract.
- A new section, Worked example, walks a primary care question through 1 plan in each program.
- Conformance has a proposed number for each measure. Completeness is counted on the 10 examples by the new `scripts/rtb-completeness.js`. Accuracy has its method and results as the GA draft's accuracy check 1b, 198 values across 3 plans with 2 contradictions, both on links and none on a cost share, including the first Marketplace check. Plan match has its test set, and the rule for moving SHOULD items to SHALL at GA is proposed.
- The 8 known gaps were closed on October 20, 2026 (see Gaps closed on October 20, 2026). Both importers write Benefit Plan Standard schema 1.2.0, whose draft has 2 new optional fields, `contacts` and `network_tiers[].provider_directory_url`; the Marketplace importer reads the Network PUF as its third file; and the canonical benefit vocabulary has 1 more key.
- Follow-ups is now 1 section, with follow-ups for the 2 importers and the published files beside those for the Benefit Plan Standard converter spec.
- What comes back now says that a Marketplace row that is not covered quotes no cell.

### Gaps closed on October 20, 2026, as of 0.3.2

Version 0.1 listed 8 things the scope asks for that the 2 importers did not carry. All 8 were closed on October 20, 2026, by work on the 2 importers, 1 key in the canonical benefit vocabulary (version 1.3.0) and 2 optional fields in the Benefit Plan Standard schema 1.2.0 draft, `contacts` and `network_tiers[].provider_directory_url`; none is a change to the scope. No dictionary row carries a gap now.

- **G1.** Physical therapy and speech therapy priced together (category 7i) has the key `physical_and_speech_therapy`.
- **G2.** The Medicare Advantage importer reads preventive services (category 14a): a $0 copay in network on the plan's attestation, `pbp_b14a_mc_prevent_attest`, and the out-of-network and point-of-service cost from the Section C groups that list 14a.
- **G3.** The Medicare Advantage importer writes `premium` and `part_b_premium_reduction` from Section D; a blank premium (1,362 of the 6,872 plans) and a reduction answered No write nothing.
- **G4.** The Medicare Advantage importer writes `contacts.member_services_phone` on every plan, and `contacts.website` when Section A gives a URI with its scheme (457 plans); an address without one is quoted.
- **G5.** Both importers write `network_tiers[].provider_directory_url` on the in-network tier: the Medicare Advantage importer from Section A when the address is a URI with its scheme (1,585 plans), and the Marketplace importer from the Network PUF, now its third file (every one of the 20,670 medical plan variants of plan year 2026).
- **G6.** The Marketplace importer quotes each file's `ImportDate` in the first `source_references` excerpt, beside the download dates.
- **G7.** Marketplace documents are written in Benefit Plan Standard schema 1.2.0, with `plan_identifiers`.
- **G8.** The Marketplace importer quotes the descriptions of coverage outside the service area and outside the country when they are filled.

### Changes

The changes since version 0.2 are listed by version, 0.2.1 first. Version 0.3 settles the 4 items that version 0.2.1 left open, how a county picks a segment, how a pledgee names files and writes an index, how 2 releases of a plan's document sit side by side, and the Medicare Plan Finder link, and removes 1 difference between the 2 importers, the spelling of the network tiers in an accumulator's `network_tier`. Version 0.3.1 lets an app find the plan key from what a pledgee publishes, makes the Bundle SHOULD, and corrects the text after a second reading by an implementer new to the specification. Version 0.3.2 answers the questions of a third reading, by an app engineer, such as which release an app serves and how the segment tool and an app recognize a regional PPO, and asks the workgroup how an app finds a pledgee's files. A bullet that a later version reversed ends with the version that superseded it.

#### In 0.2.1

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

#### In 0.3

- Identifying the plan gives the 4 steps from the HETS 271 to the plan key. The new `scripts/pbp-segment.js` gives a Medicare Advantage plan's segment and plan key from an SSA county code, or from the county's name and state; the terms and the file table name it. (superseded in 0.3.1)
- Plan match runs `scripts/pbp-segment.js --all-pairs` over every county of the 266 contract and plan pairs with more than 1 segment, and each of the 12,640 pair and county checks picks exactly 1 segment.
- What a pledgee publishes names the 2 files of each plan by plan key, puts them in the folder of their CMS release, and describes the index that `scripts/publish-fhir.js --pledgee` writes, field by field. The site's own index keeps its slugs, because the site publishes the Benefit Plan Standard repository's examples. (superseded in 0.3.1)
- Source, date and refresh sets 1 folder per CMS release, named by the release, `PBP-Benefits-2027` for Medicare Advantage and `marketplace-puf-<plan year>-<download date>` for Marketplace, with the release and the download date in every index entry, newest release first. How to get them writes the 2 examples into that layout; the documents and Bundles it writes are unchanged.
- Source, date and refresh gives the Medicare Plan Finder address pattern, checked on 2 plans on October 21, 2026, for the SHOULD link. Benefit Plan Standard schema 1.2.0 has no field for it, so the pledgee builds the link from the plan key and the Medicare Advantage importer writes nothing.
- The Marketplace importer writes each accumulator's `network_tier` as `IN` or `OUT`, the tier ids, as the Medicare Advantage importer does, and the Benefit Plan Standard schema 1.2.0 draft describes `network_tier` as the `tier_id` of a tier in `network_tiers`. Reading the data dictionary says that both importers write the same tier ids. The 5 Marketplace examples and their Bundles were regenerated with that change only; the completeness and accuracy numbers are unchanged.
- A new section, Questions for the workgroup, asks 2 questions: the covered test for 4 extra benefits, and the release layout.

#### In 0.3.1

- The index writer, `scripts/publish-fhir.js --pledgee`, writes `service-areas.json` in every Medicare Advantage release folder, from `PlanArea.txt` and `PlanRegionArea.txt` of the folder's release, with `--data` for the folder of the PBP files; it writes nothing when those files are absent or are another release. The index entry gains `service_areas`. A new subsection of What a pledgee publishes, Service areas, lists the fields of the file, and the test of the index writer checks the list against the fields the index writer writes.
- `service-areas.json` is SHALL for a Medicare Advantage release, in What a pledgee makes available, The files of each plan, Service areas and What counts.
- The segment tool, `scripts/pbp-segment.js`, takes `--service-areas <file>` and gives the same answer and exit code from a pledgee's `service-areas.json` as from `PlanArea.txt`; `--all-pairs` runs over either. Its fixture adds the regional PPO `R0759-001-000` and the rows of `PlanRegionArea.txt`.
- Identifying the plan gives 4 steps an app can follow from the HETS 271, the member's address and the pledgee's `service-areas.json`, says that an app with the PBP files gets the same answer from them, shows `--data test/fixtures/pbp-segment` to try the segment tool without the full download, and says that each of the 73 regional PPO contract and plan pairs of contract year 2027 has 1 segment.
- Plan match runs the proposed test over the pledgee's `service-areas.json`, keeps the 12,640 checks over the full `PlanArea.txt`, explains the 6,813 pairs beside the 6,872 plans, drops the 10 example keys, and states the Marketplace test.
- The Benefit Plan Standard document is SHALL and the SBC InsurancePlan Bundle SHOULD until the SBC InsurancePlan profile publishes, under What comes back and under The files of each plan, a new title for that subsection.
- How to get them writes each download record in its command block, with the examples' values, says that `release_label` is required for Medicare Advantage, gives the release rule for the folder names before the commands, and no longer shows `--downloaded`, which both importers still accept, because a Medicare Advantage document written with it alone carries no release label.
- A Marketplace release is the download date of the Plan Attributes PUF, in every sentence that defines it; the folder name is derived from the first excerpt for Medicare Advantage and constructed by the index writer for Marketplace; newest release first is the index writer's order; and the version per release says what the index writer does today with a release label that a CMS update keeps.
- The fourth SHALL item of Source, date and refresh asks for the web addresses the 2 importers quote, not a statement.
- Completeness shows the output of `scripts/rtb-completeness.js --misses` as it is printed, and The index lists 8 conditions the index writer stops on.
- The terms add Section A, C and D, the PBP benefit category, the tier row, the accumulator and slot, and the excerpt; the file table has 6 scripts, with the index writer; the Word copies are sent with the specification and are not in the repository; the `-01` variant rule has its 3 branches; and the 30 states and the quarterly update are sourced.
- The data dictionary and the crosswalk open with a sentence that points to these terms, the crosswalk defines STU2 where it first uses it, and the dictionary's Deductible row names the Medicare Advantage importer spec and says what a null `network_tier` means.

#### In 0.3.2

- The segment tool, `scripts/pbp-segment.js`, answers a contract and plan with no counties before it looks up the county, so with `--service-areas` a regional PPO gets the regional answer whether the county is given with `--county` or with `--county-name`; a new test checks both on a `service-areas.json` that holds only `R0759-001-000`. Identifying the plan says so, and says that an app recognizes a regional PPO by `counties` empty and `regions` filled.
- An app picks the release by filtering the index by `program`, then by `plan_year` equal to the year of the date of service, and takes the first entry of that year, because from October to December a pledgee may hold 2 contract years side by side; this is in step 3 of Identifying the plan, under The index, and beside the retirement rule and the definition of newest release first under Source, date and refresh.
- Step 3 takes the path of `service-areas.json` from the `service_areas` field of the chosen entry, and that field's row in the index table points at Identifying the plan.
- Identifying the plan says that deriving the plan key is inside the specification and how the app obtained the HETS 271, the address or the HIOS plan id is outside it.
- The Marketplace identifier systems are told apart from the prose: `hios_plan_id` holds the 14-character id with its variant and `hios_id` the 14-character id alone, and the 3 branches of the `-01` rule are the app's rule too.
- Reading the data dictionary gives the 4 `conditions[].type` values the 2 importers write, with the AARP example's authorization condition.
- A benefit missing from a document has 2 exceptions, hearing aids and eyeglasses, and What a pledgee makes available says how an app reads them under the SHALL on the 10 extra benefits.
- What counts is the pledgee's rule for what it publishes; the index writer enforces only the plan key, the release and the download date, and validates no document.
- Source, date and refresh says that an answer carries its source and date as provenance, given on request or on a details view; how each importer writes a blank web address, so that the 2 importers write all 4 items into every document; and that the file-safe rule is the Medicare Advantage branch of the release rule and removes a `-` at the start or the end. How to get them gives both branches of the rule, and calls the download record the one mechanism it uses.
- The index lists the 4 other conditions the index writer stops on: a `segment_id` that is not 1 to 3 digits, a missing column, a row of another contract year, and a file that is not valid JSON, whose message does not name the file.
- A third question for the workgroup asks how an app finds a pledgee's root.
- The 0.3.1 bullet on `--downloaded` says that both importers still accept it.

## Medicare Advantage PBP importer: the Part D sections and stand-alone Part D plans (2026-10-24)

No schema change: the importer writes the `pharmacy` object, the pharmacy module's benefit fields and `moop_ref` of the 1.2.0 draft 6. The mapping, its decisions and its tests are `docs/specs/pbp-part-d-mapping.md`, written in session 1 and built in session 2 the same day.

### Added

- `scripts/from-pbp.js` reads `pbp_mrx.txt`, `pbp_mrx_tier.txt` and `pbp_mrx_p.txt` (24 files read, was 21). A Medicare Advantage plan with drug coverage (`mrx_drug_ben_yn` "1") gets a `pharmacy` object, with the deductible and the tiers it applies to, the out-of-pocket threshold, the coverage stages `DEDUCTIBLE`, `INITIAL` and `CATASTROPHIC`, the formulary tiers and the pharmacy networks, and its Part D benefits after the medical ones, whose indexes do not move: 1 initial coverage benefit per tier, pharmacy network and chosen day supply, and 1 catastrophic benefit per tier. Each step carries `basis` `per_prescription`, `applies_to_deductible` with `deductible_ref` `pharmacy`, and `applies_to_moop` with `moop_ref` `pharmacy`. A plan answering "2", or an employer plan with no Part D design, gets 1 source reference that quotes the answer.
- Stand-alone Medicare Prescription Drug Plans (type 29) are imported: `plan_type` `PDP`, `market` `medicare_part_d`, 1 `IN` tier, no accumulators, service area or premium (the Part D regions and a "no PBP file holds the premium" entry are in `source_references`), and `contacts.member_services_phone` from Section A's `pbp_a_pd_curmbr_phone` ("Customer Service Contact Phone Number for Current Part D Medicare Beneficiaries"), quoted in the contacts entry as the Medicare Advantage phone is, filled on all 323 PDPs built; a PDP leaves `pbp_a_curmbr_phone` blank. Type 30 and the 283 employer PDPs with no Part D design are refused, each with a message that says why.
- 2 values no PBP column states are constants in `PART_D_PARAMETERS`, with their sources: the contract year 2027 out-of-pocket threshold, 2,400 USD (CMS, CY 2027 Rate Announcement, Attachment V, Table V-2, page 95, and Table V-6, page 99), and the $0 cost sharing for a covered Part D drug after it (42 CFR 423.104(d)(5)(i), eCFR of 2026-10-01). The file's post-threshold amount, which on 1,105 rows is the cost sharing of drugs excluded from Part D, is quoted and named in the step's notes, never written as the step's amount (Question Q6).
- The Actuarially Equivalent Standard and Defined Standard benefit types, for which the file leaves the deductible answers blank, get the deductible on every tier, confirmed on the 2027 Summary of Benefits of S5884-105-000, Humana Basic Rx Plan (PDP) (page 4; Question Q3; the PDF is saved in `data/pbp/2027/sob/` and is not in git).
- 2 golden plans, the PDPs S5921-383-000 AARP Medicare Rx Preferred from UHC (`examples/unitedhealthcare-aarp-medicare-rx-preferred-from-uhc.pbp.json`) and S4802-146-000 Wellcare Value Script (`examples/wellcare-wellcare-value-script.pbp.json`). `test/fixtures/pbp/2027/` re-cut: 24 files, 355 records for 7 plans.
- `vocabularies/canonical-benefits.json` version 1.4.0 (was 1.3.0; `vocabulary_id` under `/vocabularies/v1.4.0/`), 124 entries (was 118): `nonpreferred_drugs`, `select_care_drugs`, `injectable_drugs`, `vaccine_drugs`, `supplemental_drugs` and `select_diabetic_drugs` (`pharmacy`), for the CMS Part D tier labels. `fhir/definitions/CodeSystem-canonical-benefits.json` rebuilt (version 1.4.0, 124 concepts). `vocabularies/markets.json` version 1.2.0 (was 1.1.0; `vocabulary_id` under `/vocabularies/v1.2.0/`), 13 codes (was 12): `medicare_part_d`, the stand-alone Medicare Part D prescription drug plan.
- Tests: 30 Part D tests (the PDP phone among them) and the Summary of Benefits checks of H1036-068-000 (46 checks: 45 MATCH, 1 READING) and S5921-383-000 (43 checks: 40 MATCH, 3 READING), 0 differences, in `scripts/from-pbp.test.js` (69, was 34); the canonical keys test checks vocabulary 1.4.0 and the CodeSystem, the PDP document test checks `markets.json` 1.2.0, and the gap G1 test no longer pins the canonical vocabulary's version; 1 converter test in `scripts/to-insuranceplan.test.js` (70, was 69). `node --test scripts/*.test.js`: 206 tests, was 170.

### Changed

- `scripts/to-insuranceplan.js` lists every benefit with a `coverage_stage_id` in `bps-unmapped-benefit`, whatever its key, keeps the `pharmacy.deductible` and `pharmacy.out_of_pocket_max` `generalCost` entries, and refuses a document whose `plan_type` is `PDP` (the SBC InsurancePlan profile describes a medical plan); `pbpExampleFiles()` leaves the PDPs out, and the narrative counts the Part D benefits apart (converter spec section 8.4). The pharmacy module example `humana_part_d_example.json`, a PDP, is refused too, and the converter test of draft 6 now converts only the module's commercial example.
- The 5 Medicare Advantage golden documents gain their Part D benefits (H2406-013 33, H1036-068 42, H1609-028, H5533-019 and H5425-140 67 each) and their Part D source references; the first source reference lists the 24 files read. Their 5 Bundles in `examples/fhir/` are regenerated and re-pinned: 16 benefits placed, as before, and 55 to 89 listed as unmapped; HL7 validator, eighth run in `examples/fhir/VALIDATION.md`: 0 errors, the same 17 warnings. The 10 Bundles read from plan documents are byte-identical. The site copies in `benefit-plan-docs/static/fhir/` are republished from them, with the CodeSystem 1.4.0, and the 2 vocabularies are served at `/vocabularies/v1.4.0/canonical-benefits.json` and `/vocabularies/v1.2.0/markets.json`, beside the unchanged v1.3.0 and v1.1.0 files.
- Over the contract year 2027 file: 6,872 Medicare Advantage plans and 323 PDPs built, 0 errors, 0 schema failures; 235,324 and 16,304 Part D benefits; the member services phone on all 6,872 and all 323; 1 Part D warning (H4045-001-000, a deductible-stage cost share with no field).
- `scripts/rtb-completeness.js` leaves the 2 PDP golden files out of its default list; the completeness of the 10 examples is unchanged. `scripts/publish-fhir.test.js`: the Aetna Bundle's unmapped count is 89. `docs/specs/rtb-medical-mvp/data-dictionary.md` regenerated (vocabulary version 1.4.0, 124 keys), and the README's sentence on the vocabulary says the same; the specification's version is unchanged.
- `docs/specs/pbp-part-d-mapping.md`: status built, section 20 (results and the corrections made while building, each with its reason), and the profile's benefit listings regenerated so the catastrophic rows read $0. The 2 Summary of Benefits check files state that they run on the golden files.
- Docs: `docs/specs/pbp-importer.md` (sections 1, 3, 4.4, 10, 11, 13 and a new section 14 that points at the mapping), `docs/specs/insuranceplan-converter.md` (section 8.4, the lossy table with the `moop_ref` follow-up, sections 3, 6.5, 12 and 13), `README.md`, `examples/README.md`, `examples/fhir/README.md`, `test/fixtures/pbp/README.md`, `vocabularies/README.md`.

## [1.2.0] – DRAFT (2026-10-24), draft 6: the pharmacy module v0.2.1 in core, `moop_ref`, and the first adopter on record

The 1.2.0 schema stays a draft under the release rule in `docs/governance.md` (Releases); each published draft is a git tag, and this one is `v1.2.0-draft.6`. Every addition is optional and no existing field changes type or meaning: the 20 documents in `examples/` validate against draft 6 unchanged, and the 15 Bundles in `examples/fhir/` and the 5 in `examples/fhir-puf/` are byte-identical. The module schema file, `modules/pharmacy/v0.2.1/pharmacy.schema.json`, is unchanged, and the medical MVP specification 0.3.5 is unchanged, with both of its `--check` scripts passing.

### Added

- `schema/v1.2.0/benefit-plan.schema.json` (draft): the pharmacy module v0.2.1 wired into core, by copy and not by a `$ref` to a second file, so a validator needs only the core file. `pharmacy` gains `formulary_tiers` (array of `$defs/formulary_tier`), `pharmacy_networks` (array of `$defs/pharmacy_network`), `formulary_items` (array of `$defs/formulary_item`), `formulary_reference` (`$defs/formulary_reference`) and `mail_order_supply_multiplier` (number), so it has every property of the module's `pharmacy` object and validates as it does. `$defs` gains `formulary_tier`, `pharmacy_network`, `coverage_stage`, `quantity_limit_detail`, `formulary_item`, `coverage_exception`, `formulary_alternative` and `formulary_reference`, copied unchanged from the module. `benefits[]` items gain the module's benefit extension fields, for `benefit_type: "pharmacy"`: `formulary_tier_id`, `pharmacy_network_id` and `coverage_stage_id` (string), `day_supply` (integer), `drug_examples` (array of string), `step_therapy_required` (boolean or null) and `quantity_limit` (`$defs/quantity_limit_detail`). `source_plan_identifiers` stays inside `formulary_reference`, because it names the plan the formulary file was read for, which can differ from the document's own `plan_identifiers`.
- `cost_shares[].moop_ref` (string or null, default null): which out-of-pocket maximum `applies_to_moop` refers to when the plan has more than one, with the recommended values `medical` (the out-of-pocket maximums in `accumulators`) and `pharmacy` (`pharmacy.out_of_pocket_max`, the Part D threshold); absent or null means the plan's medical maximum, the reading before draft 6. It mirrors `deductible_ref`, `applies_to_moop` is unchanged, and the gap was found by RxCare on October 23, 2026.
- `scripts/validate.js` warns, and never fails, when a benefit extension field is on a benefit whose `benefit_type` is not `pharmacy`, and when a `formulary_tier_id`, `pharmacy_network_id` or `coverage_stage_id` names an id that the document's `pharmacy` object does not define. `test/fixtures/validate/` holds 1 document for each warning, and `scripts/validate.test.js` has 4 tests.
- `scripts/schema.test.js`, 4 tests (7 in all): the 8 copied shapes are deep-equal to the module's; core `pharmacy` and the benefit extension fields validate as the module's; `moop_ref` behaves as `deductible_ref`, an unknown string accepted and a number rejected; and the 2 module examples validate against core and against the module. `scripts/to-insuranceplan.test.js`, 1 test (69 in all): the 2 module examples convert, and the module fields and `moop_ref` change nothing in the Bundle, because the SBC InsurancePlan profile has no formulary. `node --test scripts/*.test.js`: 170 tests, was 161.
- `ADOPTERS.md`: what an adopter is under the release rule, how to be listed, and the first entry, RxCare, which adopted the 1.2.0 draft at draft 5 with the pharmacy module v0.2.1. `docs/governance.md` (Releases) points to it.

### Changed

- `schema/v1.2.0/benefit-plan.schema.json` (draft): `pharmacy.coverage_stages` items refer to `$defs/coverage_stage`, the module's shape. The inline item it replaces validated the same way; the item descriptions are now the module's wording. The `pharmacy` description no longer says that the module's other layers are not wired into core, and the root description names draft 6.
- `modules/pharmacy/v0.2.1/examples/`: both examples drop their top-level `_comment`, which core's root does not admit, and give `schema_version` 1.2.0; the module README now says what the comments said. `humana_part_d_example.json`, a standalone prescription drug plan with no medical maximum, moves its $2,100 cap from `accumulators.individual_oop_max` to `pharmacy.out_of_pocket_max`, and its 6 cost shares carry `moop_ref: "pharmacy"`. `formulary_indication_example.json` is a commercial plan with 1 maximum and has no Part D cost share, so it carries no `moop_ref`.
- `modules/pharmacy/v0.2.1/README.md`: Core integration says what draft 6 wired in and closes the `source_plan_identifiers` question, What this module is NOT no longer says it is not wired into core, and How to validate adds the check against core.
- `README.md`: draft 6, `ADOPTERS.md` in the links and the tree, the validator's pharmacy warnings, and the new fixture folder.
- This changelog: the entries of 2026-10-20 and 2026-10-21 said that the 1.2.0 schema is not tagged. Each published draft is a git tag, `v1.2.0-draft.1` of 2026-09-20 and `v1.2.0-draft.2` to `v1.2.0-draft.5` of 2026-10-21, and those 2 sentences now say so.

## [1.2.0] – DRAFT (2026-10-21), medical MVP specification 0.3; accumulator network tiers as tier ids

The 1.2.0 schema stays a draft under the release rule in `docs/governance.md` (Releases); each published draft is a git tag (`v1.2.0-draft.N`).

### Added

- `scripts/pbp-segment.js`: county to segment for a Medicare Advantage plan. From a contract, a plan and an SSA county code (`--county 10150`) or a county name and state (`--county-name "Duval, FL"`), it reads `PlanArea.txt` with the Medicare Advantage importer's reader and prints the segment and the full plan key; it exits 1 when no segment serves the county and 2 when more than 1 does. `--all-pairs` resolves every county of every contract and plan pair with more than 1 segment: in contract year 2027, 266 pairs and 12,640 pair and county checks, each picking exactly 1 segment. `scripts/pbp-segment.test.js` (9 tests) runs on `test/fixtures/pbp-segment/2027/`, 24 `PlanArea.txt` rows cut by `--write-fixtures`.
- `scripts/publish-fhir.js --pledgee <root>`: writes `<root>/index.json` for a pledgee's documents and Bundles, filed as `<root>/<release>/<plan key>.json` and `<plan key>.bundle.json`, with the site index's header fields and 1 entry per document (`id` the plan key, `program`, `document`, `bundle`, `release`, `data_date`, the Bundle's counts and `label`), newest release first. The site mode is unchanged. `scripts/publish-fhir.test.js` (6 tests) includes a check that the README lists the fields the script writes.

### Changed

- `schema/v1.2.0/benefit-plan.schema.json` (draft): the 2 `network_tier` descriptions, on the deductible and the out-of-pocket maximum accumulators, say the value is the `tier_id` of a tier in `network_tiers` (`IN`, `OUT`, `POS` or another tier_id the document defines). The type is unchanged.
- `scripts/from-marketplace-puf.js`, the Marketplace importer, writes each accumulator's `network_tier` as `IN` or `OUT` (was `in-network` and `out-of-network`), as the Medicare Advantage importer, `scripts/from-pbp.js`, does. The 5 `examples/*.puf.json` and their Bundles in `examples/fhir-puf/` are regenerated with the download dates they carried; the tier spelling is the only difference (in the Bundles, the accumulator's `type.text`, `comment` and `bps-accumulator` `networkTier`). HL7 validator, seventh run in `examples/fhir/VALIDATION.md`: 0 errors, with the warnings and information messages of the sixth run. Completeness and the 3 accuracy checks are unchanged. Marketplace importer spec section 4.3 updated; 5 tests check the tier ids on the Marketplace examples.
- `scripts/from-pbp.js` exports `cutFile`, and `scripts/rtb-completeness.js` exports `programOf`, `planKey` and `PROGRAM_NAME`, which the 2 new scripts reuse.
- `docs/specs/rtb-medical-mvp/`: the README is version 0.3, dated October 21, 2026. It gives county to segment in 4 steps, the plan match check and its result, the pledgee's file names, release folders and index, the Medicare Plan Finder address pattern for the SHOULD link (the Medicare Advantage importer writes nothing; the pledgee builds the link from the plan key), and 1 sentence saying both importers write the same tier ids. "Changes in 0.3" lists the 0.2.1 and 0.3 rounds, and a new section asks the workgroup 2 questions. `data-dictionary.md` and `carin-crosswalk.md` are regenerated; only their version changed.

## [1.2.0] – DRAFT (2026-10-20), contacts and the provider directory link; the medical MVP gaps G1 to G8 closed

The 1.2.0 schema stays a draft under the release rule in `docs/governance.md` (Releases); each published draft is a git tag (`v1.2.0-draft.N`).

### Added

- `schema/v1.2.0/benefit-plan.schema.json` (draft), 2 optional fields; nothing removed or renamed. `contacts`, an object with `member_services_phone` (string) and `website` (string, format `uri`), both optional and no other key. `network_tiers[].provider_directory_url` (string, format `uri`): a link a member can open to the plan's provider directory for this tier. An address with no scheme is not a URI; it is quoted in `source_references` and not written. Before the examples were regenerated, all 20 documents in `examples/` validated against their own schema version and against the new draft.
- `vocabularies/canonical-benefits.json` version 1.3.0 (was 1.2.0; `vocabulary_id` under `/vocabularies/v1.3.0/`), 118 entries: `physical_and_speech_therapy` (`rehabilitation`), physical therapy and speech-language pathology priced together, as in the Plan Benefit Package category 7i. `fhir/definitions/CodeSystem-canonical-benefits.json` rebuilt (118 concepts).
- `scripts/schema.test.js`: every document in `examples/` against its own schema version and v1.2.0, and the shape of the 2 new fields (3 tests).

### Changed

- `scripts/from-pbp.js` and `fhir/pbp-crosswalk.json` (41 rows, 35 with a canonical key; was 40 and 33). 7i is keyed `physical_and_speech_therapy` (gap G1). 14a is read into a `preventive_care` benefit, `PREVENTIVE_SERVICES`: a $0 copay in network, not subject to the deductible, on the plan's attestation `pbp_b14a_mc_prevent_attest` (1 on all 6,872 plans), and out of network and at the point of service from the Section C groups that list 14a (gap G2). `premium` from `pbp_d_mplusc_premium` and `part_b_premium_reduction` from `pbp_d_mco_pay_reduct_yn` and `_amt`, with no period, since no file states one; a blank premium or a reduction answered No writes nothing (gap G3). `contacts.member_services_phone` from `pbp_a_curmbr_phone`, `contacts.website` from `pbp_a_org_website` and the in-network tier's `provider_directory_url` from `pbp_a_phys_web_addr`, an address written only when it is a URI with its scheme (gaps G4 and G5). Every new value quotes its cells in `source_references` or in the tier's notes. Over the contract year 2027 file: 6,872 plans, 0 errors, 0 schema failures; premium on 5,510, Part B reduction on 1,412, phone on 6,872, website on 457, directory link on 1,585.
- `scripts/from-marketplace-puf.js` writes schema 1.2.0 (was 1.1.0), with `plan_identifiers` `hios_plan_id` and `hios_id` (gap G7). It reads a third file, the Network PUF, now required, and writes its `NetworkURL` as the in-network tier's `provider_directory_url`, on the row whose `BusinessYear`, `StateCode`, `IssuerId`, `NetworkId` and `MarketCoverage` are the plan's (gap G5; every one of the 20,670 medical plan variants of plan year 2026 has its row). The first excerpt quotes each file's `ImportDate` beside the download dates (gap G6), and `download.json` can give 1 file its own date (`downloaded_files`). `OutOfServiceAreaCoverageDescription` and `OutOfCountryCoverageDescription` are quoted when filled (gap G8).
- The 10 public-file examples and their Bundles are regenerated: the 5 `examples/*.pbp.json` (38 of 41 rows each) with the 5 PBP Bundles in `examples/fhir/` (16 placed, 22 listed; hashes re-pinned in `scripts/to-insuranceplan.test.js`), and the 5 `examples/*.puf.json` with their Bundles in `examples/fhir-puf/`. The 10 Bundles read from plan documents are byte-identical. HL7 validator, sixth run in `examples/fhir/VALIDATION.md`: the 10 changed Bundles pass with 0 errors; 1 more warning on Aetna, a text-only `Point-of-service option` qualifier on the 14a row. The 5 PBP Bundles on the site are those of 2026-10-15 until it is published again.
- Accuracy checks: `H1609-028-000.json` 65 checks, 47 match, 16 readings, 2 contradictions; `H2406-013-000.json` 83, 71, 12, 0; `68398FL0030058-01.json` 50, 39, 11, 0. The new checks cover the premium, preventive care, the member services phone, the website and the provider directory link. The 2 contradictions are on links, not cost shares: the Aetna Summary of Benefits prints `AetnaMedicare.com` and `AetnaMedicare.com/H1609-028`, the file gives "www.aetna.com/medicare" and "www.aetnamedicare.com/findprovider", and all 4 addresses resolved on 2026-10-20.
- `docs/specs/rtb-medical-mvp/`: the README, still version 0.2 dated October 20, 2026, has "Gaps closed on October 20, 2026" in place of the known gaps; both programs in schema 1.2.0, a draft final after 2 independent adopters implement and validate it; completeness 100.0 percent on the 5 Medicare Advantage examples and 97.9 to 100.0 on the 5 Marketplace examples; the accuracy results above; the Network PUF in the commands. `shall-should.json` records each gap with its closing date and how it closed, and no item refers to a gap. `carin-mapping.json` gives the 10 rows that were "not covered, gap" their verdicts: Medicare Advantage 20 aligned, 46 different, 1 not covered; Marketplace 21 aligned, 50 different, 0 not covered. `data-dictionary.md` and `carin-crosswalk.md` regenerated. `scripts/build-rtb-dictionary.js` prints closed gaps as such and marks a quoted value whose field the importer does not write yet (the Marketplace drug deductible, `pharmacy.deductible`); `scripts/rtb-completeness.js` reads the Marketplace key from `plan_identifiers`.
- Docs: both importer specs (the Marketplace importer spec gains section 4.5, the provider directory link), the converter spec's `contact` row (BPS now has `contacts`, which the converter does not map yet), `README.md`, `examples/README.md`, `examples/fhir/README.md`, `examples/fhir-puf/README.md`, `vocabularies/README.md`, and the status of `docs/provider-directory-schema-proposal.md` (superseded by `provider_directory_url`).

## [1.2.0] – DRAFT (2026-10-20), medical MVP specification 0.2 and the first Marketplace check

### Added

- `scripts/rtb-completeness.js`: the completeness count of the medical MVP. It reads `docs/specs/rtb-medical-mvp/shall-should.json` and 1 or more documents written by the public-file importers, and prints for each plan how many of the SHALL items that apply to it the document populates; `--misses` lists each miss and why. An item with a known gap (G1 to G8) counts as a miss. On the 10 examples: the 5 Medicare Advantage plans 84.6 to 86.0 percent, every miss a known gap; the 5 Marketplace plans 91.7 to 93.6 percent. The same output on every run.
- `docs/specs/puf-sbc-checks/68398FL0030058-01.json`: the first Marketplace accuracy check, UHC Bronze Essential against the Summary of Benefits and Coverage that its Plan Attributes PUF row links (document `FL0055 EXFL26IF0275669_000`, retrieved 2026-10-20, SHA-256 recorded). 49 checks run by `scripts/pbp-sob-check.js`, unchanged: 38 match, 11 readings, 0 contradictions. The 11 readings are 1 kind: the SBC prints "Not Covered" out of network where the file gives the benefit `IsCovered` "Covered" and `CoinsOutofNet` "100.00%" (Marketplace importer spec sections 5.4 and 7.4).

### Changed

- `docs/specs/rtb-medical-mvp/README.md`: version 0.2, dated October 20, 2026. "The file contract" is now "Retrieval and the file contract", with a subsection "Source, date and refresh (GA draft checks 2 and 6)": what every document and answer carries, what each importer stamps today (Medicare Advantage the download date and the release label; Marketplace the download date and the file addresses, with `ImportDate` not carried, gap G6), the link to the plan's official documents, and the refresh rules with a proposed cadence of 7 days after a CMS release. New sections "What a pledgee publishes" (the minimum contract) and "Worked example" (a primary care visit for `H1609-028-000` and `68398FL0030058-01`). Conformance has a proposed number for each measure, each labelled a proposal for the workgroup to set: completeness 90 percent per plan, with the 10 example figures; accuracy 0 contradictions, as GA draft check 1b, with the method and the results for 3 plans (186 values, 0 contradictions, 37 documented readings, the 7 Medicare Advantage reading kinds named); plan match 100 percent of a published test set; and a rule for moving SHOULD items to SHALL at GA. "Follow-ups" now has 6 items for the importers and the published files beside the 2 for the converter spec. No change to the schema, the vocabulary, the crosswalks, the importers, the converter or the examples.

## [1.2.0] – DRAFT (2026-10-18), medical MVP crosswalk to the SBC InsurancePlan profile

### Added

- `docs/specs/rtb-medical-mvp/carin-crosswalk.md`: the field-by-field crosswalk from the 106 rows of the medical MVP data dictionary to the SBC InsurancePlan profile of the CARIN Digital Insurance Card implementation guide (`hl7.fhir.us.insurance-card#2.0.0-ballot`), with 1 of 3 verdicts per program: aligned, different or not covered. Medicare Advantage, 67 rows: 19 aligned, 41 different, 7 not covered (1 no element, 6 gaps). Marketplace, 71 rows: 20 aligned, 47 different, 4 not covered (4 gaps). Generated by the new `scripts/build-rtb-crosswalk.js` from `shall-should.json`, the new `carin-mapping.json` and `fhir/carin-sbc-crosswalk.json`; the same bytes on every run, with a `--check` mode. The generator stops, and names the item, when a cited passage is not in the converter spec section it cites or a verdict is not the one the SBC crosswalk gives.

### Changed

- `docs/specs/rtb-medical-mvp/README.md`: still version 0.1, updated October 18, 2026. The folder's file list, a crosswalk paragraph with the counts in the status section, the crosswalk's file name in the Part B sentence, "implementation guide" spelled out, and a list of follow-ups for the converter spec (HMO_POS and INDEMNITY in `plan.type`). No change to the schema, the vocabulary, the crosswalks, the importers, the converter or the examples.

## [1.2.0] – DRAFT (2026-10-17), medical MVP specification for the Real-Time Benefits workgroup

### Added

- `docs/specs/rtb-medical-mvp/`: the medical MVP technical specification for the CMS Health Tech Ecosystem Real-Time Benefits workgroup, draft 0.1. `README.md` (purpose, scope, plan identification, the file contract, how to read the dictionary, known gaps G1 to G8, the conformance outline), `shall-should.json` (70 items with SHALL and SHOULD per program, following the workgroup's medical MVP scope) and `data-dictionary.md` (106 rows), generated by the new `scripts/build-rtb-dictionary.js` from `shall-should.json`, the 2 importer crosswalks and the canonical benefit vocabulary; the same bytes on every run, with a `--check` mode. No change to the schema, the vocabulary, the crosswalks, the importers or the examples.

## [1.2.0] – DRAFT (2026-10-15), the 5 Medicare Advantage PBP Bundles published

### Changed

- `scripts/publish-fhir.js` publishes the 5 PBP Bundles of `examples/fhir/` after the 10 read from plan documents, so `index.json` lists 15 plans. Each of the 5 entries has `bps_example` set to its `.pbp.json` file and the label "Medicare Advantage, imported from the CMS PBP benefits files for contract year 2027, validates against the v1.2.0 draft only."; the 2 Summary of Benefits entries keep their label. The 10 published Bundles are byte-identical, the output is the same from run to run, and `examples/fhir-puf/` stays unpublished.

## [1.2.0] – DRAFT (2026-10-13), Marketplace adult dental, derived excluded services, provider directory proposal

No schema change. The vocabulary version stays 1.2.0.

### Added

- `vocabularies/canonical-benefits.json`: 117 entries (was 114). 3 keys in `dental`: `dental_routine_adult`, `dental_basic_adult` and `dental_major_adult`, the adult dental classes of the CMS Marketplace Benefits and Cost Sharing PUF. Each is a class as the issuer defines it, not a single service; in the PY2026 file's text the routine rows name exams, cleanings and x-rays, the basic rows fillings and simple extractions, the major rows crowns, root canals and dentures. The Medicare Advantage rows stay on `dental_cleaning` and `dental_filling`. `fhir/definitions/CodeSystem-canonical-benefits.json` rebuilt (117 concepts).
- `scripts/to-insuranceplan.js`: option `excludedServices` (CLI `--excluded-services`) writes the CARIN `excluded-services` extension (ballot, draft) on `InsurancePlan`, derived and never typed: 1 `service` per benefit `covered` false on every tier, `serviceType.text` the vocabulary label, `description` "Derived from the plan's coverage flags in the CMS Benefits and Cost Sharing PUF, not from a printed Excluded Services section." Only for documents from the Benefits and Cost Sharing PUF; refused for any other document and with `--write-golden`. The `Not covered` cost entries are unchanged. 3 tests in `scripts/to-insuranceplan.test.js` (68, was 65). Converter spec section 10.1 says why the SBC-sourced examples do not get it.
- `docs/provider-directory-schema-proposal.md`: schema 1.2.0 has no plan-level or network-level URL field, so no provider directory link is written. The proposal is `network_tiers[].provider_network` (`name`, `network_id`, `provider_directory_url`, `source`), 0..1 per network tier; if accepted, Marketplace plans would fill it from the Network PUF's `NetworkURL`. Not in any schema version; the Network PUF stays out of the importer's scope.

### Changed

- `fhir/marketplace-puf-crosswalk.json`: Routine Dental Services (Adult) `dental_routine_adult`, Basic Dental Care - Adult `dental_basic_adult`, Major Dental Care - Adult `dental_major_adult`. 84 of 273 names mapped (was 81); 48 dental rows stay unmapped (was 51), among them the child rows.
- The 5 Marketplace examples have 52 benefits each (was 49). All 5 have the 3 adult dental rows, Not Covered, written with `covered` false on every tier. Unmapped names listed in `source_references`: 21, 23, 23, 16 and 16 for AvMed, Louisiana, Florida Blue, UHC Bronze and UHC Gold (was 24, 26, 26, 19 and 19).
- The 5 Bundles in `examples/fhir-puf/` are rewritten with `--excluded-services`: 27 benefits placed and 25 listed in `bps-unmapped-benefit` each (was 22; the adult dental keys have no SBC benefit category code), and `excluded-services` with 9, 8, 9, 9 and 9 services (AvMed, Louisiana, Florida Blue, UHC Bronze, UHC Gold). 0 errors and the same 31, 4, 30, 12 and 14 warnings; 3 more information messages each (fifth run in `examples/fhir/VALIDATION.md`).
- The 15 Bundles in `examples/fhir/` (the 10 published and the 5 Medicare Advantage Bundles) are byte-identical and validate with the same counts as before.

## [1.2.0] – DRAFT (2026-10-11), Medicare Advantage supplemental benefits and use case 2 settings

No schema change. The vocabulary version stays 1.2.0.

### Added

- `vocabularies/canonical-benefits.json`: 114 entries (was 106). 8 keys: `mental_health_office_visit` (`behavioral_health`; an individual session, narrower than `mental_health_outpatient`), `dental_cleaning` and `dental_filling` (`dental`), `eyeglasses` (`vision`), `otc_allowance`, `meals` and `fitness_benefit` (`specialty_care`) and `transportation` (`other`, beside ambulance). `fhir/definitions/CodeSystem-canonical-benefits.json` rebuilt.
- `fhir/pbp-crosswalk.json`: 10 rows, 40 in all, 33 with a key (was 30 and 23): 7e1 mental health individual sessions, 6 home health (`home_health_care`), 2 skilled nursing facility (`skilled_nursing_facility`), 16b4 dental cleaning, 16c1 dental restorative services, 17b2 eyeglasses (lenses and frames), 13b over-the-counter items, 13c meals, 10b transportation and 14c4 fitness. The 7 rows with no key are unchanged.
- `scripts/from-pbp.js`: the skilled nursing facility through the inpatient reader with its own column names (no per-stay amount, no deductible amount column, additional days at another position) and the SNF columns of Section C for out-of-network and point-of-service stays; supplemental rows offered on a yes or no answer alone (13b, 13c, 10b); 14c "which benefits" columns read as lists of codes; dental rows with no offer column, written `covered` false with a "the plan filed no entry" note when the type of benefit is blank; a transportation row whose location type picks its category code; eyewear maximums from the combined, per-type or 17a columns; `carryover` on the OTC allowance; `shared_limit_id` `PBP_16B_MAXPLAN` (fillings under the 16b maximum) and `PBP_17A_MAXPLAN` (eyeglasses under the 17a maximum, on the routine eye exam row too).
- 3 fixture files in `test/fixtures/pbp/2027/` (`pbp_b6_home_health.txt`, `pbp_b14_preventive.txt`, `pbp_b16_dental.txt`): 21 files, 272 records.

### Changed

- The 5 Medicare Advantage examples write 37 of the 40 rows each (was 27 of 30). Their 5 Bundles in `examples/fhir/` are rewritten and re-pinned: 15 benefits placed and 22 listed in `bps-unmapped-benefit` each (was 14 and 13; only the skilled nursing facility has an SBC benefit category code); 0 errors, 16 warnings (the 15 before, plus the skilled nursing facility's `Point-of-service option` qualifier on Aetna; fourth run in `examples/fhir/VALIDATION.md`). The 10 published Bundles are byte-identical.
- Summary of Benefits checks: H2406-013 78 checks (68 MATCH, 10 READING), H1609-028 59 checks (43 MATCH, 16 READING), 0 differences; the new checks cover the new rows where the documents print a value.
- `fhir/marketplace-puf-crosswalk.json`: Mental Health Office Visit `mental_health_office_visit`, Eye Glasses for Adult and Eye Glasses for Adults `eyeglasses`, Fitness Benefit - Adult `fitness_benefit`. 81 of 273 names mapped (was 77). Active & Fit stays unmapped (a branded program). None of the 5 Marketplace golden plans has these rows: their documents and Bundles are byte-identical and validate with the same counts.
- Whole-file run over the 6,872 MVP plans of contract year 2027: 0 errors, 0 schema failures, 253,928 benefits written (`docs/specs/pbp-importer.md` section 13).

## [1.2.0] – DRAFT (2026-10-09), canonical benefit keys from the CMS public files

No schema change. `canonical_key` stays an optional free string.

### Added

- `vocabularies/canonical-benefits.json` is version 1.2.0 (was 1.1.0, `vocabulary_id` now under `/vocabularies/v1.2.0/`), 106 entries (was 100). 6 keys: `hearing_aids`, `hearing_exam` and `routine_foot_care` (`specialty_care`), `routine_eye_exam` (`vision`), `other_practitioner_office_visit` (`professional_services`) and `physical_and_occupational_therapy` (`rehabilitation`). Each of the first 4 names the routine service, not a Medicare-covered diagnostic row. `physical_and_occupational_therapy` is for a source that states the 2 therapies in one row; `physical_therapy` and `occupational_therapy` are unchanged. `fhir/definitions/CodeSystem-canonical-benefits.json` is rebuilt from it by `scripts/build-fhir-definitions.js` (version 1.2.0, 106 concepts).
- 2 Marketplace examples from the PY2026 public files: `examples/unitedhealthcare-uhc-bronze-essential.puf.json` (UHC Bronze Essential ($0 Virtual Urgent Care), Florida, Bronze HMO, 68398FL0030058-01) and `examples/avmed-avmed-entrust-gold-125.puf.json` (AvMed Entrust Gold 125 (2026), Florida, Gold HMO, 19898FL0340001-01, with a second in-network tier). Their Bundles are in `examples/fhir-puf/`, not published and not in `fhir/index.json`: 0 errors, 12 and 31 warnings. Record in `examples/fhir-puf/README.md`.

### Changed

- `fhir/marketplace-puf-crosswalk.json`: Hearing Aids, Hearing Exam, Routine Eye Exam (Adult), Routine Foot Care, Other Practitioner Office Visit (Nurse, Physician Assistant) and Rehabilitative Occupational and Rehabilitative Physical Therapy have keys. 77 of 273 names mapped (was 71). Diabetic Routine Foot Care and the diabetic eye exam rows stay unmapped, as narrower.
- `fhir/pbp-crosswalk.json`: 18b1 `hearing_aids`, 18a1 `hearing_exam`, 17a1 `routine_eye_exam` and 7f_2 `routine_foot_care`. 23 of 30 rows have a key (was 19). The Medicare-covered rows 18a, 17a and 7f, the single-type hearing aid rows 18b2 to 18b4, and 7i stay carried by name (`docs/specs/pbp-importer.md` section 9.1).
- The 5 Marketplace examples have 49 benefits each (the 3 existing ones had 44). A row the plan does not cover is written with `covered` false on every tier, as before for other mapped rows. In each Bundle 27 benefits are placed in SBC benefit categories and 22 are listed in `bps-unmapped-benefit` (was 17), because none of the 6 keys has a code in the SBC InsurancePlan profile. All 5 Bundles: 0 errors.
- The 5 Medicare Advantage examples carry `canonical_key` on 4 more benefits each. Their 5 Bundles in `examples/fhir/` are rewritten by `--write-golden` and re-pinned in `scripts/to-insuranceplan.test.js`: 0 errors and the same 15 warnings (third run in `examples/fhir/VALIDATION.md`). The Summary of Benefits checks still give 0 differences (H2406-013, 61 checks; H1609-028, 33 checks). The 10 published Bundles are byte-identical.
- `scripts/from-marketplace-puf.test.js`: the synthetic plan's example of an unmapped row is now "Cochlear Implants", because "Hearing Aids" has a key.

## Medicare Advantage PBP importer (2026-10-06)

No schema change.

### Added

- `scripts/from-pbp.js`: CMS Medicare Advantage Plan Benefit Package (PBP) Benefits files in, Benefit Plan Standard v1.2.0 documents out, 1 plan per run. Plan level, network tiers (including point-of-service and hospital cost tiers), deductibles and maximums, and 30 MVP benefits mapped in `fhir/pbp-crosswalk.json` (19 with a canonical key). Every MVP plan of contract year 2027 (6,872) imports with 0 errors. Spec in `docs/specs/pbp-importer.md`, file layout in `docs/specs/pbp-record-layout-notes.md`.
- 5 examples (`examples/*.pbp.json`): AARP Medicare Advantage from UHC FL-0021 (PPO, H2406-013-000), Humana Gold Plus H1036-068 (HMO), Aetna Medicare Select Extra (HMO-POS, H1609-028-000), UPMC for Life PPO Rx Choice (PPO, H5533-019-000) and SCAN Costco Medicare Advantage (HMO, H5425-140-000). Regenerated only with `--write-golden`. `scripts/from-pbp.test.js` builds them from the plans' rows committed in `test/fixtures/pbp/2027/` and needs no download.
- 5 FHIR Bundles in `examples/fhir/`, one per example, written by `scripts/to-insuranceplan.js --write-golden`, hash-pinned in the converter test, and not published to the site. Validated on 2026-10-06 with `validator_cli.jar` 7.0.0: 0 errors on all 5, 15 warnings (14 text-only `cost.qualifiers`, 1 Aetna `plan.type` because the SBC Plan Type value set has no HMO-POS code). Record in `examples/fhir/VALIDATION.md`.
- `scripts/pbp-sob-check.js`, with `docs/specs/pbp-sob-checks/H2406-013-000.json` (61 checks) and `H1609-028-000.json` (33 checks): importer documents checked against their CMS Summary of Benefits, 0 differences.

### Changed

- `scripts/to-insuranceplan.js` maps the point-of-service network tier (`POS`) of HMO-POS plans to `out-of-network` with the text-only qualifier `Point-of-service option` (converter spec 6.3); it refused the tier before. The 10 published Bundles are byte-identical.

## [1.2.0] – DRAFT (2026-10-06), plan-type vocabulary

No schema change.

### Added

- `vocabularies/plan-types.json`: `HMO_POS` (Medicare Advantage HMO with a point-of-service option), added for the PBP importer.

## Examples: deductible flags on silent cells (2026-10-05)

No schema change. Rule: a cell silent about the deductible follows the issuer's annotation convention (false where the chart marks where the deductible applies, true where it marks only where it does not), and otherwise the SBC template footnote and the page 1 answer to "Are there services covered before you meet your deductible?" (`examples/README.md`, "Things to know"). The 4 affected FHIR Bundles are regenerated and re-validated with 0 errors (`examples/fhir/VALIDATION.md`).

### Changed

- United example: 25 deductible flags corrected; the 2 pediatric dental check-up cost shares note the separate dental deductible.
- Aetna PPO 1500 example: 4 deductible flags corrected.
- Aetna PPO 5000 example: 4 deductible flags corrected.
- GatorCare example: 2 deductible flags corrected.

## Marketplace public-file importer and a second in-network tier (2026-10-05)

No schema change.

### Added

- `scripts/from-marketplace-puf.js`: CMS Marketplace Plan Attributes and Benefits and Cost Sharing public use files in, Benefit Plan Standard v1.1.0 documents out. Crosswalk in `fhir/marketplace-puf-crosswalk.json` (71 of 273 PY2026 benefit names mapped, the rest listed unmapped), parse report in `docs/specs/marketplace-puf-parse-report.md`, spec in `docs/specs/marketplace-puf-importer.md`. 3 examples (`*.puf.json`) and their Bundles in `examples/fhir-puf/`.
- The converter maps a second in-network tier (`IN2`) to `in-network` with a cost-tier qualifier: `value-choice` when the tier is named Value Choice, otherwise the tier name as text. The 10 published Bundles are unchanged and pinned by SHA-256 in `scripts/to-insuranceplan.test.js`.

## Examples: limits and deductible flags from the source PDFs (2026-10-05)

No schema change. Each value below is read from the example's source PDF in `examples/sources/`. The 8 FHIR Bundles in `examples/fhir/` are regenerated and re-validated (`examples/fhir/VALIDATION.md`).

### Changed

- Florida Blue example: 3 limits added, 4 deductible flags corrected from the source PDF.
- Aetna PPO 1500 example: 5 limits added, 2 deductible flags corrected from the source PDF.
- Aetna PPO 5000 example: 5 limits added, 2 deductible flags corrected from the source PDF.
- Ambetter example: 4 limits added from the source PDF.
- Cigna example: 5 limits added, 3 deductible flags corrected from the source PDF.
- GatorCare example: 4 limits added from the source PDF.
- Kaiser example: 6 limits added from the source PDF.
- United example: 7 limits added from the source PDF.
- Florida Blue example: 1 limit and 10 conditions added from the source PDF (rehabilitation and inpatient rehab limit wording, drug day supply).
- Aetna PPO 1500 example: 1 deductible flag corrected, 12 conditions and 1 cost-share note added from the source PDF (preventive care exception, drug day supply, specialty maximum copay, precertification penalty).
- Aetna PPO 5000 example: 1 deductible flag corrected, 12 conditions and 1 cost-share note added from the source PDF (preventive care exception, drug day supply, specialty maximum copay, precertification penalty).
- Ambetter example: 9 deductible flags set to false (the plan has no deductible), 1 limit and 7 conditions added from the source PDF (children's glasses, drug day supply).
- Cigna example: 3 conditions added from the source PDF (drug day supply).
- GatorCare example: 2 conditions and 1 cost-share note added from the source PDF (outpatient surgery site of service, inpatient rehab limit wording).
- Kaiser example: 2 deductible flags set to false (the plan has no deductible), 5 conditions added from the source PDF (drug day supply).
- United example: 1 limit period set, 12 conditions added from the source PDF (home health, cardiac and inpatient rehab limit wording, drug day supply, maternity preauthorization).

## Tooling: CARIN SBC InsurancePlan converter (2026-09-24)

No schema change. Every BPS document validates exactly as before.

### Added

- `scripts/to-insuranceplan.js`: converts a BPS v1.1.0 or v1.2.0 document into a FHIR R4 collection `Bundle` (one `InsurancePlan` and the `Organization` it references) targeting the CARIN Digital Insurance Card SBC InsurancePlan profile. The converter is a pure function plus a CLI, with deterministic output and ids derived from `plan_id`. The profile exists only in `hl7.fhir.us.insurance-card#2.0.0-ballot` and is draft and experimental. Spec: `docs/specs/insuranceplan-converter.md`.
- `fhir/carin-sbc-crosswalk.json`: BPS `canonical_key` to SBC benefit category crosswalk used by the converter.
- `scripts/build-fhir-definitions.js` and `fhir/definitions/`: the BPS extension StructureDefinitions (`bps-source-reference`, `bps-plan-metadata`, `bps-identifier-source`, `bps-benefit`, `bps-condition`, `bps-cost-share`, `bps-accumulator`, `bps-unmapped-benefit`) and the canonical-benefits CodeSystem, all draft.
- `examples/fhir/`: the converter output for all 10 examples, validated with the HL7 FHIR validator against the ballot package with zero errors (`examples/fhir/VALIDATION.md`). The files are golden files for `scripts/to-insuranceplan.test.js`, which fails on any drift.

### Changed

- `docs/fhir-alignment.md`: the mapping table and worked example now follow FHIR R4 core and the CARIN SBC profile. Plan design goes in `plan.type` (`sbc-plan-type`) rather than `InsurancePlan.type`. Cost-share types use `coverage-copay-type`, and `cost.applicability` uses the R4 applicability code system. Benefit types carry an `sbc-benefit-category` code, with the BPS canonical key as an additional coding. Quantities carry a currency or UCUM `system`. Deductible applicability uses the `DeductibleApplies` extension. The table covers the profile's `contact` and 2-cost minimum, and moves market and source citations to extensions. The worked example is regenerated from the converter.
- `docs/carin-dic-reconciliation.md`: the whole SBC InsurancePlan profile is ballot-stage, not only the three merged changes. The doc now spells out the qualifier mapping for designation and modality tiers and updates the worked example (the `IN` row carries no qualifier). It adds notes on pharmacy `deductible_ref`, text-only limit types and periods, and the missing home health code.
- `docs/roadmap.md`: item 4 updated.

## Pharmacy module [0.2.1] – DRAFT (2026-09-04)

Additive patch to the draft pharmacy module (`modules/pharmacy/v0.2.1/`). v0.2.0 documents validate unchanged.

### Added

- `carrier_formulary_document` on `pharmacy.formulary_reference.data_sources[].source_type` — a carrier-published formulary document: medication guide, prior-authorization program list, program drug list, or pharmacy policy bulletin. Identify the document with `source_url` and `file_date`. Motivation: employer group plans have no CMS machine-readable formulary file; their drug-to-tier placement, utilization-management flags and indication rules are published only in carrier documents, and the v0.2.0 enum had no value for that origin.
- A `description` on `source_type` defining every value.

## [1.2.0] – DRAFT (2026-07-02)

Backward-compatible minor release, in draft. Existing v1.0.0 and v1.1.0 documents continue to validate against v1.2.0 unchanged. Origin: reconciliation of the three `InsurancePlan` changes merged into the HL7 CARIN Digital Insurance Card IG on June 25, 2026 (FHIR-57525 multi-tier cost sharing, FHIR-57526 deductible applicability, FHIR-57527 structured benefit limitation). Full analysis and field-by-field mapping: `docs/carin-dic-reconciliation.md`.

### Added

- **Network-tier classification** (from FHIR-57525)
  - `tier_class` (string, nullable, default `"network"`) on `network_tiers[]` items — distinguishes an actual provider network (`network`) from a cost-sharing designation within one network (`cost_designation`, e.g. a carrier's "Value Choice" rate) and from a delivery channel (`modality`, e.g. virtual care). Recommended values, not enum-enforced. Absent means `network`, the pre-v1.2.0 meaning.
  - `parent_tier_id` (string, nullable) on `network_tiers[]` items — for designation/modality tiers, the network tier they live within.
  - `provider_set` (object, nullable: `name` required; `description`, `reference` optional) on `network_tiers[]` items — the set of providers a cost designation applies to, joinable to a provider directory (e.g. a Plan-Net Organization). Maps to the CARIN `CostAppliesToNetwork` extension.
- **Limit enhancements** (from FHIR-57527)
  - `raw_text` (string, nullable) on `benefits[].limits[]` items — verbatim limitation text from the source document. Maps to the CARIN `BenefitLimitation.limitText`.
  - `limits[].period` description now recommends `per_plan_year`, `per_calendar_year`, `per_benefit_period`, `per_lifetime` (legacy `per_year`, `per_episode` remain valid), aligning with the CARIN Limit Period value set.
- **Vocabulary updates (non-normative, apply to all schema versions)**
  - `vocabularies/canonical-benefits.json`: added UnitedHealthcare's descriptor-style
    drug-tier phrasings ("Tier 1 - Your Lowest-Cost Option", "Tier 2/3 - Your
    Midrange-Cost Option", "Tier 4 - Additional High-Cost Options") to the aliases and
    `sbc_label_patterns` of `generic_drugs`, `preferred_brand_drugs`,
    `nonpreferred_brand_drugs`, and `specialty_drugs`. Found while regenerating the
    example corpus: UHC SBCs name drug tiers without the words "generic"/"brand", so
    label-driven mappers missed every prescription-drug row.
- **Documentation**
  - `docs/carin-dic-reconciliation.md` — reconciliation of the three merged CARIN Digital Insurance Card IG changes into BPS, with field-by-field mappings.

### Not changed (already covered)

- Per-cost-share deductible applicability (FHIR-57526) was already expressed by `cost_shares[].applies_to_deductible` (since v1.0.0); reconciled as a mapping note only.
- Typed limits (FHIR-57527's `limitType` / `limitValue` / `limitPeriod`) were already expressed by `limits[].type` / `value` / `period` (since v1.0.0).

### Backward compatibility

- All v1.1.0 required fields remain required in v1.2.0; no field types change; all additions are optional.
- All seven carrier examples validate unchanged against both v1.1.0 and the v1.2.0 draft.
- `additionalProperties: false` boundaries are respected.

### Schema URL

- v1.2.0 draft: `https://benefitplanstandard.org/schema/v1.2.0/benefit-plan.schema.json`
- v1.1.0 remains the current released version.

## [1.2.0] – DRAFT (2026-09-20), Medicare Advantage additions

Second additive block in the v1.2.0 draft. Every addition below is optional, so a document that validated against the draft on July 2 validates unchanged. Origin: two 2026 CMS Summary of Benefits documents read end to end on September 16, 2026, the SCAN Classic (HMO) Summary of Benefits for Los Angeles County and the Humana Gold Plus H1036-025 (HMO) Summary of Benefits, mapped construct by construct against the schema. Fourteen constructs had no home in the standard; twelve are added here. Full analysis, page evidence and verification record: `docs/medicare-advantage-notes.md`. Field-by-field proposal: `docs/medicare-advantage-schema-proposal.md`.

### Added

- **Plan identity**
  - `plan_identifiers` (array, optional) at top level, each entry carrying `system` (required), `value` (required) and `source` (string, nullable). Closes gap G1. Recommended systems: `cms_contract_plan_segment`, `cms_contract_id`, `cms_pbp_id`, `hios_id`. Motivation: Humana prints its contract and plan number in the page 1 title and in every page header, while the SCAN Summary of Benefits prints no contract and plan number for either of its plans, so that value has to come from a public CMS plan listing and `source` records where. Distinct from `plan_id`, which stays a document-local readable slug.
  - `service_area` (object, nullable: `state`, and `counties[]` of `name` and `fips`) at top level. Closes gap G2. Motivation: Medicare Advantage plans are sold by county. Humana page 1 lists Hernando, Hillsborough, Pasco and Pinellas counties in Florida, and SCAN pages 1 and 17 name Los Angeles County. Neither document prints a county FIPS code, so `fips` is nullable.
  - `premium` (object, nullable: `amount` required, plus `currency`, `period`, `notes`) and `part_b_premium_reduction` (object, nullable: `amount` nullable, plus `period`, `notes`) at top level. Closes gap G3. Motivation: the Summary of Benefits leads with the monthly premium (SCAN page 3, Humana page 4), while the ACA SBC leaves the premium out by design, which is why the standard never had a field for it. Humana page 4 also prints a Part B premium reduction as a qualified value, so `amount` is nullable there and the printed wording goes in `notes` rather than being reduced to a number.
- **Pharmacy accumulators**
  - `pharmacy` (object, optional) at top level, carrying `deductible` (with `applies_to_tiers`), `out_of_pocket_max` and `coverage_stages[]`, together with `deductible_ref` (string, nullable) on `benefits[].network_cost_shares[].cost_shares[]` items. Closes gap G4. Motivation: a Medicare Advantage plan with drug coverage runs two sets of accumulators, and core had one. The Part D deductible is scoped to drug tiers (SCAN page 8 charges the full cost of Tier 3 through Tier 5 drugs until the member has paid $250; Humana pages 4 and 10 set $615 for Tier 4 and Tier 5), and the Part D out-of-pocket threshold is separate from the medical maximum ($2,100 in both plans, SCAN page 9 and Humana page 11). `deductible_ref` says which deductible a step's `applies_to_deductible` refers to, with `medical` and `pharmacy` recommended; absent or null means the medical deductible, the pre-v1.2.0 reading. The three shapes are inlined from the draft pharmacy module v0.2.1 and are a strict subset of it, so a document valid under core's `pharmacy` is valid under the module's.
- **Cost-share enhancements**
  - `unit_range` (object, nullable: `from` required, `to` nullable) on `cost_shares[]` items. Closes gap G5. Motivation: Humana's copay changes with the day of the stay (page 4 prices inpatient days 1 to 6 at $50 per day and days 7 to 90 at $0 per day; page 9 prices skilled nursing days 1 to 20 at $0 per day and days 21 to 100 at $160 per day). Previously the range sat in `notes`, so a reader had to parse prose to price day 10. The unit itself stays in `basis`; `unit_range` carries only the bounds, so the two cannot disagree.
  - `max_amount` and `max_basis` for caps, and `amount_min`, `amount_max`, `rate_min`, `rate_max` for ranges (all nullable) on `cost_shares[]` items. Closes gap G6. Motivation: where a document prints a cap or a range, no number could go where the document puts one, so the value stayed in `notes`. Caps: SCAN page 7 caps Part B insulin furnished through durable medical equipment at $35 for a one-month supply, and Humana page 11 pairs a coinsurance with a cap in most cells of its insulin grid. Ranges: SCAN page 7 prices Part B drugs as a range of the Medicare-approved amount, and SCAN page 5 prices comprehensive dental by category as dollar ranges. The Kaiser SBC example has the same cap problem, its specialty tier reading "20% coinsurance up to $250 / prescription", and could now carry it as a `rate` with `max_amount` and `max_basis`; that example is not edited in this release.
- **Benefit-level enhancements**
  - `coverage_basis` (string, nullable) on `benefits[]` items, recommended values `medicare_covered`, `supplemental_mandatory`, `supplemental_optional`. Closes gap G7. Motivation: the main Medicare Advantage axis is which program pays for a benefit, and `benefit_type` names the service domain instead. Both documents split each benefit area into a Medicare-covered row and a supplemental one: SCAN labels its supplemental rows non-Medicare-covered or routine on pages 4 through 7, and Humana labels its mandatory supplemental benefits on pages 7 and 8 with the codes HER692, DENF33 and VIS848. SCAN's optional dental package at $55 a month (page 16) motivates the third value. Absent or null means the document does not make the distinction, the pre-v1.2.0 reading.
  - `alternative_group` (string, nullable) on `benefits[]` items. Closes gap G10. Motivation: Humana page 8 prices eyewear as a $300 allowance or, alternatively, two pairs of select eyeglasses per year at no cost. Modeled as two benefits sharing one group identifier, so a consumer that adds benefits up counts at most one per group instead of both.
  - `source_references` (array) on `benefits[]` items, with the item shape factored into `$defs/source_reference` and referenced from both the plan-level and the new benefit-level list. Closes gap G14. Motivation: with 71 and 72 benefit rows, binding an excerpt to the benefit it evidences by position in one plan-level list is fragile. The plan-level refactor is validation-identical to the previous inline definition, so no document's result changes.
  - `moop_applicability` on `benefits[]` items: an explicit null is now authoritative and means the source document does not state whether the benefit counts toward the maximum out-of-pocket, so a consumer must treat it as unknown rather than fall back to the `applies_to_moop` default. Closes gap G8. Description-only change; the field's type and the boolean `applies_to_moop` are untouched, and an absent field keeps its pre-v1.2.0 meaning of `plan_default`. Motivation: SCAN page 3 excludes prescription drugs from the maximum without saying whether Part B drugs are included, so the page 7 Part B rows are recorded as not stated rather than counted.
- **Limit enhancements**
  - `carryover` (string, nullable) on `benefits[].limits[]` items, recommended values `none`, `next_period`, `within_year`. Closes gap G9. Motivation: both plans give a $150 quarterly over-the-counter allowance and differ on what happens to the unused balance. SCAN page 13 carries it into the next quarter but not the next year, and Humana page 14 lets it expire at the end of the quarter. The difference is now data rather than prose.
  - `scope` and `shared_limit_id` (string, nullable) on `limits[]` items, plus `per_12_months` added to the recommended values of `limits[].period`. Closes gap G11 and extends the limit-scope open item in `docs/carin-dic-reconciliation.md` section 5. Motivation: `scope` is the entity a limit counts against, distinct from `type`, the unit counted, as in Humana page 7 allowing one hearing aid per ear per year. `shared_limit_id` marks one count spread across several benefits: SCAN pages 12 and 13 give routine acupuncture and routine chiropractic 30 visits per year combined, and SCAN page 4 prints a single hearing aid limit over a row that prices two grades, so without it a program that sums limits doubles them. `per_12_months` is a rolling window, which is what SCAN means by "every 12 months" on pages 4 and 6, as distinct from a calendar or plan year.
- **Vocabulary (non-normative, applies to all schema versions)**
  - `vocabularies/categories.json`: twelve category codes added for benefit areas the Summary of Benefits prices and the SBC does not (`HEARING`, `DENTAL`, `VISION`, `PART_B_DRUGS`, `PODIATRY`, `TRANSPORTATION`, `OVER_THE_COUNTER`, `MEALS`, `IN_HOME_SUPPORT`, `FITNESS`, `PERSONAL_EMERGENCY_RESPONSE`, `MEMBER_SUPPORT`), each with a one-line description.
  - `vocabularies/benefit-types.json`: new file, the recommended vocabulary for `benefits[].benefit_type`, which had none. It carries the seven values the schema field description already recommends plus `hearing` and `non_clinical`, the second a stopgap name for transportation, meals, in-home support, fitness, a personal emergency response system and member support, which neither source document groups under a collective term.
- **Examples**
  - `examples/scan_example.json` and `examples/humana_example.json`, the first two Medicare Advantage examples, with their source documents added to `examples/sources/`. Both are keyed by hand from their Summary of Benefits and verified value by value against the cited pages, and both validate against the v1.2.0 draft only.
- **Documentation**
  - `docs/medicare-advantage-notes.md`: how the two documents differ from the SBC, the fourteen gaps, how each example was built, and the verification record.

### Deferred

- **G12, optional supplemental packages (riders).** A `riders[]` array carrying a name, a premium and the benefits that apply only when a member buys the package. SCAN's optional dental package at $55 a month (page 16) is the motivating case. Not in this release, and left out of both examples on purpose.
- **G13, population-specific cost sharing.** A marker on a cost-share set for populations with different cost sharing, such as Extra Help replacing the Part D amounts for members who qualify (Humana page 12). Not in this release, and left out of both examples on purpose.

### Not changed

- `schema/v1.0.0/benefit-plan.schema.json` and `schema/v1.1.0/benefit-plan.schema.json` are untouched. Released versions are frozen.
- Every v1.0.0 and v1.1.0 document validates against v1.2.0 unchanged. Every addition above is optional, no existing field changes type or requiredness, and the `additionalProperties: false` boundaries only gain the new keys. Evidence: the eight SBC examples (`aetna`, `aetna_ppo5000`, `ambetter`, `bluecross`, `cigna`, `gatorcare`, `kaiser`, `united`) are not edited in this release and pass `scripts/validate.js` against both v1.1.0 and the v1.2.0 draft with the same result as before these additions, exit 0 for each file and one advisory vocabulary warning in total (`cigna`, `plan_type` "OAP").

## [1.1.0] – 2026-05-21

Backward-compatible minor release. Existing v1.0.0 documents continue to validate against v1.1.0 unchanged.

### Added

- **Plan identity**
  - `plan_year` (integer) at top level — useful when `effective_date` is absent or when grouping plans across years.
  - `coverage_period` object (`start_date`, `end_date`) at top level — captures the coverage window explicitly, which may differ from `effective_date` / `expiry_date`.
  - `market` (string) at top level — market segment (individual, small_group, large_group, medicare_advantage, etc.). See `vocabularies/markets.json`.
- **Accumulator enhancements**
  - 4 new out-of-network accumulator slots: `oon_individual_deductible`, `oon_family_deductible`, `oon_individual_oop_max`, `oon_family_oop_max`. Closes the v1.0.0 gap where PPO plans with separate in/out-of-network deductibles and OOP maxes could not be fully represented.
  - `period` field on every accumulator (e.g. `"per_calendar_year"`, `"per_plan_year"`).
  - `network_tier` field on every accumulator for explicit network scope.
  - `embedded` boolean for family-level accumulators (member-level embedded sub-deductibles/maxes).
  - `applies_to` field is now available on OOP max accumulators (previously only on deductibles).
- **Benefit-level enhancements**
  - `benefit_type` discriminator on `benefits[]` items — enables future modules (pharmacy, dental, vision, behavioral_health) to share the same schema with a discriminator. Default: `"medical"`.
  - `canonical_key` (string) on `benefits[]` items — machine-readable canonical identifier. See `vocabularies/canonical-benefits.json` for the recommended vocabulary of 100 canonical keys.
  - `raw_label` (string, nullable) on `benefits[]` items — optional verbatim label from the source document for traceability.
- **Cost-share enhancements**
  - `notes` field on `benefits[].network_cost_shares[].cost_shares[]` items. Fixes a known issue in the v1.0.0 SCAN example that placed `notes` here but would have failed `additionalProperties: false`.
- **Recommended vocabularies** (new top-level `vocabularies/` directory)
  - `canonical-benefits.json` — 100 canonical benefit identifiers across 13 categories.
  - `categories.json` — recommended uppercase snake_case category codes.
  - `markets.json` — recommended market codes.
  - `plan-types.json` — recommended plan-design codes.
- **Repository hygiene**
  - `LICENSE` file (MIT) added to the root.
  - `.gitattributes` to normalize line endings across platforms.
- **Documentation**
  - `docs/fhir-alignment.md` — mapping of BPS to FHIR R4 `InsurancePlan`, including the `InsurancePlan` ↔ BPS field-by-field crosswalk, gaps, and how to round-trip.

### Fixed

- `examples/scan_example.json` — removed `notes` from inside `cost_shares[]` items. The text was preserved by merging into the parent `network_cost_shares[].notes` field. (The same `notes` field is now formally defined on `cost_shares[]` in v1.1.0, so future examples may use it directly.)

### Backward compatibility

- All v1.0.0 required fields remain required in v1.1.0.
- All v1.0.0 optional fields remain present with the same types.
- All additions are optional and `additionalProperties: false` boundaries are respected.
- A document declaring `"schema_version": "1.0.0"` validates against the v1.1.0 schema without changes.

### Schema URL

- v1.1.0 canonical: `https://benefitplanstandard.org/schema/v1.1.0/benefit-plan.schema.json`
- v1.0.0 remains available at: `https://benefitplanstandard.org/schema/v1.0.0/benefit-plan.schema.json`

## [1.0.0] – 2025-11-30

### Added

- Initial release of the canonical schema (`schema/v1.0.0/benefit-plan.schema.json`).
- Base repository structure with example documents, modules directory placeholder, and governance documentation.
- Documentation stubs for changelog, roadmap, and governance.
