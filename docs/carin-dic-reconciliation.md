# BPS ↔ CARIN Digital Insurance Card Reconciliation

**Status:** Draft (accompanies the BPS v1.2.0 draft schema)
**Last updated:** 2026-07-02
**Scope:** The three `InsurancePlan` changes merged into the HL7 CARIN Digital Insurance Card IG (SBC InsurancePlan profile) on June 25, 2026, and how each is expressed in, and mapped to, the Benefit Plan Standard core schema.

---

## 1. Origin

In June 2026 three changes to the CARIN Digital Insurance Card IG's SBC `InsurancePlan` profile were proposed from Benefit Plan Standard implementation experience, endorsed by the CARIN working group, and merged into `HL7:master` (PR #59, June 25, 2026), targeting the September 2026 ballot (STU 2.0.0). Each has an upstream FHIR R6 core tracker:

| # | CARIN IG ticket | FHIR R6 core ticket | Change |
|---|---|---|---|
| 1 | FHIR-57525 | FHIR-57503 | Multi-tier cost sharing: multiple cost entries on one benefit, tagged by designation (e.g. Value Choice, Standard) or modality / site of service (e.g. Virtual), with an optional link to the provider set a designation applies to (`CostAppliesToNetwork` extension) |
| 2 | FHIR-57526 | FHIR-57504 | Per-cost-entry deductible applicability (`DeductibleApplies` boolean extension) |
| 3 | FHIR-57527 | FHIR-57505 | Structured benefit limitation (`BenefitLimitation` complex extension: `limitText` / `limitType` / `limitValue` / `limitPeriod`) |

This document reconciles those changes back into BPS core: where BPS already expresses the concept, it records the field-by-field mapping; where BPS did not, it records the additive v1.2.0 amendment that closes the gap. It extends, and should be read alongside, [`fhir-alignment.md`](fhir-alignment.md).

---

## 2. Reconciliation summary

| Change | Did BPS v1.1.0 already express it? | Reconciliation |
|---|---|---|
| 1. Multi-tier cost sharing | **Partially.** Multiple cost points per benefit are representable by keying `network_cost_shares[]` entries to distinct `network_tiers[]` entries. But v1.1.0 could not distinguish an actual provider network from a cost designation or a modality, could not say which network a designation lives within, and had no provider-set linkage. | **Additive amendment (v1.2.0 draft):** `tier_class`, `parent_tier_id`, and `provider_set` on `network_tiers[]` items. Plus the mapping in §3.1. |
| 2. Deductible applicability | **Yes.** `benefits[].network_cost_shares[].cost_shares[].applies_to_deductible` (boolean, default false) has been in core since v1.0.0. | **Mapping note only** (§3.2). No schema change. |
| 3. Structured benefit limitation | **Yes, for the structured part.** `benefits[].limits[]` already carries `type` + `value` + `period`, which is exactly `limitType` / `limitValue` / `limitPeriod`. BPS had no per-limit verbatim text to carry `limitText`. | **Mapping note (§3.3) plus one additive field (v1.2.0 draft):** `limits[].raw_text` for the verbatim limitation text. The `period` description now recommends values that distinguish plan year from calendar year. |

---

## 3. Field-by-field mappings

Target elements are on the CARIN SBC `InsurancePlan` profile (FHIR R4 base). Extension names are as merged in PR #59.

### 3.1 Change 1: multi-tier cost sharing (FHIR-57525)

The CARIN encoding puts the tier on the cost entry: `plan.specificCost.benefit.cost.qualifiers` is extensibly bound to the new Cost Tier value set (`value-choice` / `standard` / `virtual`), and a designation tier may carry the `CostAppliesToNetwork` extension (a Reference to one of the plan's network Organizations).

The BPS encoding puts the tier in the plan-level tier list and keys cost shares to it. The decision rule is the same one adopted in the IG discussion: **is this a distinct provider network the member accesses, or a cost-sharing designation within a single network?**

| BPS (v1.2.0 draft) | CARIN SBC InsurancePlan | Notes |
|---|---|---|
| `network_tiers[].tier_id` (tier_class `network`) | `cost.applicability` code, and/or `InsurancePlan.network` / `coverage.network` Organization reference | Unchanged v1.1.0 behavior. In/out-of-network stays in `applicability`. |
| `network_tiers[].tier_class` = `cost_designation` | `cost.qualifiers` coding from the Cost Tier value set (e.g. `value-choice`, `standard`) | The BPS tier_id maps to the qualifier code. Adopter-specific designations map to adopter codes (the IG binding is extensible). |
| `network_tiers[].tier_class` = `modality` | `cost.qualifiers` coding (e.g. `virtual`) | A modality is a delivery channel, not a provider set; it takes no provider-set link. |
| `network_tiers[].parent_tier_id` | `cost.applicability` of the cost entry carrying the qualifier | The designation's parent network supplies the applicability (typically `in-network`). |
| `network_tiers[].provider_set.name` / `.description` | `CostAppliesToNetwork` extension `valueReference.display` | Human-readable name of the qualifying provider set. |
| `network_tiers[].provider_set.reference` | `CostAppliesToNetwork` extension `valueReference.reference` (Organization) | Machine-readable join to a provider directory (DaVinci PDex Plan-Net models a network as an Organization with provider affiliations). |
| One `network_cost_shares[]` entry keyed to each designation/modality tier | One `cost[]` entry per qualifier on the same `specificCost.benefit` | Both sides keep the cost variation attached to the single benefit rather than multiplying plans or networks. |

Worked example (public Florida Blue BlueCare HMO SBC, specialist visit, one in-network column with three prices):

```jsonc
"network_tiers": [
  { "tier_id": "IN",           "name": "In Network",  "tier_class": "network" },
  { "tier_id": "VALUE_CHOICE", "name": "Value Choice", "tier_class": "cost_designation",
    "parent_tier_id": "IN",
    "provider_set": { "name": "Value Choice providers",
                      "description": "In-network providers the carrier designates for the Value Choice rate",
                      "reference": null } },
  { "tier_id": "VIRTUAL",      "name": "Virtual",      "tier_class": "modality",
    "parent_tier_id": "IN" }
],
...
"network_cost_shares": [
  { "tier_id": "VALUE_CHOICE", "covered": true,
    "cost_shares": [{ "type": "copay", "sequence": 1, "amount": 20, "basis": "per_visit", "applies_to_deductible": false }] },
  { "tier_id": "IN", "covered": true,
    "cost_shares": [{ "type": "copay", "sequence": 1, "amount": 45, "basis": "per_visit", "applies_to_deductible": false }] },
  { "tier_id": "VIRTUAL", "covered": true,
    "cost_shares": [{ "type": "copay", "sequence": 1, "amount": 45, "basis": "per_visit", "applies_to_deductible": false }] }
]
```

This projects to three `cost[]` entries on one CARIN `specificCost.benefit`, qualified `value-choice` / `standard` / `virtual`, the first carrying `CostAppliesToNetwork`.

### 3.2 Change 2: deductible applicability (FHIR-57526)

| BPS (since v1.0.0) | CARIN SBC InsurancePlan | Notes |
|---|---|---|
| `cost_shares[].applies_to_deductible` (boolean, default false) | `DeductibleApplies` boolean extension on `plan.specificCost.benefit.cost` | Granularity matches: a BPS cost-share step and a FHIR `cost[]` entry are both one (type, amount) pair on one benefit and tier, so the flag maps one-to-one. |
| `cost_shares[].applies_to_moop` (boolean, default true) | No CARIN counterpart yet | BPS is a superset here. Candidate for a future IG proposal; see §5. |

No schema change. BPS was the source of this concept (the SBC "deductible applies?" column), and the merged extension matches the existing BPS semantics, including that the flag can vary per designation tier on the same benefit (e.g. No Charge with deductible waived on the Value Choice rate, copay after deductible on the Standard rate).

### 3.3 Change 3: structured benefit limitation (FHIR-57527)

The merged `BenefitLimitation` complex extension carries `limitText` (string), `limitType` (CodeableConcept, bound to visits / days / dollars), `limitValue` (Quantity), and `limitPeriod` (CodeableConcept, bound to plan-year / calendar-year / benefit-period / lifetime).

| BPS | CARIN SBC InsurancePlan | Notes |
|---|---|---|
| `limits[].type` (e.g. `visits`, `days`, `dollars`) | `BenefitLimitation.limitType` | Direct: `visits` ↔ `visits`, `days` ↔ `days`, `dollars` ↔ `dollars`. |
| `limits[].value` (number) | `BenefitLimitation.limitValue.value` | Set the Quantity `unit` from the type. |
| `limits[].period` | `BenefitLimitation.limitPeriod` | `per_plan_year` ↔ `plan-year`, `per_calendar_year` ↔ `calendar-year`, `per_benefit_period` / `per_episode` ↔ `benefit-period`, `per_lifetime` ↔ `lifetime`. The legacy BPS value `per_year` is ambiguous between plan year and calendar year; prefer the specific values when the source document distinguishes them (v1.2.0 updates the recommended values accordingly). |
| `limits[].raw_text` (new in v1.2.0 draft) | `BenefitLimitation.limitText` | Verbatim limitation text as displayed in the source document. Before v1.2.0 the closest home was the benefit-level `raw_label` or cost-share `notes`, neither of which is per-limit. |

BPS has typed limits since v1.0.0; the IG change brings the CARIN profile up to the same structure. The only BPS addition is the verbatim-text companion, which preserves the display fidelity the SBC requires.

---

## 4. The v1.2.0 draft amendment (additive, backward-compatible)

New optional fields in `schema/v1.2.0/benefit-plan.schema.json`, relative to v1.1.0:

1. `network_tiers[].tier_class` (string, nullable, default `network`; recommended values `network` / `cost_designation` / `modality`, not enum-enforced).
2. `network_tiers[].parent_tier_id` (string, nullable).
3. `network_tiers[].provider_set` (object, nullable: required `name`, optional `description`, `reference`).
4. `benefits[].limits[].raw_text` (string, nullable).
5. Description-only: `limits[].period` recommended values now `per_plan_year`, `per_calendar_year`, `per_benefit_period`, `per_lifetime` (legacy `per_year`, `per_episode` remain valid).

Backward compatibility, per the v1.x governance rules:

- All v1.1.0 required fields remain required; no types change; all additions are optional.
- A document valid against v1.1.0 is valid against v1.2.0 unchanged (verified against all seven carrier examples; see the changelog entry).
- Absent `tier_class` means `network`, so existing tier lists keep their meaning.

---

## 5. Open items

- **Limit scope.** Neither the merged IG change nor BPS types the population scope of a limit (individual vs family) or its network scope (whether a visit limit counts in-network only). Revisit if real documents demand it.
- **`applies_to_moop`.** BPS tracks out-of-pocket-maximum applicability per cost-share step; the IG has no counterpart. Candidate for a future CARIN proposal.
- **Tier vocabulary.** The IG's Cost Tier code system starts with `value-choice` / `standard` / `virtual`. If adopters accumulate more designations, a `vocabularies/tier-classes.json` (and/or recommended tier codes) file may be worth adding on the BPS side.
- **Ballot dependency.** The IG changes are merged to master and cleared for the September 2026 ballot but are not yet balloted content. If ballot reconciliation reshapes the extensions, refresh §3 to match before finalizing v1.2.0.

---

## 6. References

- CARIN Digital Insurance Card IG (CI build): https://build.fhir.org/ig/HL7/carin-digital-insurance-card/
- HL7 JIRA tickets: FHIR-57525, FHIR-57526, FHIR-57527 (IG) and FHIR-57503, FHIR-57504, FHIR-57505 (R6 core)
- BPS ↔ FHIR R4 alignment guide: [`fhir-alignment.md`](fhir-alignment.md)
- BPS v1.2.0 draft schema: [`../schema/v1.2.0/benefit-plan.schema.json`](../schema/v1.2.0/benefit-plan.schema.json)
- DaVinci PDex Plan Net IG (provider-set / network modeling): https://hl7.org/fhir/us/davinci-pdex-plan-net/
