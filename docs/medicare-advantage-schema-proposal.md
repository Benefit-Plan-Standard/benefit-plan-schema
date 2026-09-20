# Medicare Advantage field proposal for the v1.2.0 draft

**Status:** The v1.2.0 draft schema on this branch carries the 12 shipping fields as of September 20, 2026, pending review.
**Written:** September 20, 2026
**Inputs:** `docs/medicare-advantage-notes.md` (branch `medicare-advantage-ground-truth`, sections 2 and 3), the v1.2.0 draft schema, the pharmacy module v0.2.1, and `docs/carin-dic-reconciliation.md` section 5.

This document turns the 14 gaps recorded in the Medicare Advantage notes into concrete schema fragments for `schema/v1.2.0/benefit-plan.schema.json`. Twelve ship: ten are settled below (G1, G2, G3, G5, G6, G7, G9, G10, G11, G14), and two (G4, G8) are presented as side-by-side designs with one recommendation each. G12 (riders) and G13 (population-specific cost sharing) are deferred and appear here only for the record.

Evidence citations are taken from the notes. "SCAN" is the SCAN Classic (HMO) column of the SCAN Summary of Benefits for Los Angeles County (2026, 20 pages, PDF page positions since the pages are unnumbered). "Humana" is the Humana Gold Plus H1036-025 (HMO) Summary of Benefits (2026, 24 pages, printed page numbers match the PDF).

Conventions, per the decisions already made:

- Every new field is optional, and nullable where it is a scalar or object.
- `additionalProperties: false` stays on every object that has it today. Adding a property to such an object only permits the new key; documents that omit it are unaffected.
- Backward compatibility claims below all reduce to the same argument: the field is new and optional, no existing field changes type or requiredness, and a v1.1.0 document does not carry the field, so it validates against v1.2.0 unchanged. Where a proposal has any subtlety beyond that, the entry says so.

---

## G1. Regulator plan identifiers

**Summary (notes §3):** The CMS contract and plan number is the plan's real identity, but `plan_id` is a readable slug and there is no field for regulator-assigned identifiers. SCAN's document does not even print its own contract and plan number, so the value can come from outside the document and the record should say from where.

**Location:** top level, new property `plan_identifiers`.

**Type:** array of objects, optional. Items: `system` (string, required), `value` (string, required), `source` (string, nullable, optional). Recommended `system` values, not enum-enforced: `cms_contract_plan_segment`, `cms_contract_id`, `cms_pbp_id`, `hios_id`.

**Schema fragment:**

```json
"plan_identifiers": {
  "type": "array",
  "description": "Regulator-assigned identifiers for this plan (closes gap G1 of the Medicare Advantage notes). Each entry names the identifier system and the value. Recommended system values: 'cms_contract_plan_segment' (e.g. 'H1036-025-000'), 'cms_contract_id' (e.g. 'H1036'), 'cms_pbp_id' (e.g. '025'), 'hios_id' (14-character marketplace plan id). Not enforced as enum to allow adopter extension. Distinct from plan_id, which remains a document-local readable slug.",
  "items": {
    "type": "object",
    "properties": {
      "system": {
        "type": "string",
        "description": "Identifier system this value belongs to. See the recommended values on plan_identifiers."
      },
      "value": {
        "type": "string",
        "description": "The identifier value, as assigned by the system."
      },
      "source": {
        "type": ["string", "null"],
        "description": "Where the value came from when the plan's own document does not print it (e.g. a public CMS plan listing). Null or absent when the value is printed in the source document. Motivated by the SCAN Summary of Benefits, which prints no contract and plan number for either of its plans."
      }
    },
    "required": ["system", "value"],
    "additionalProperties": false
  }
}
```

**Evidence:** Humana prints the contract and plan number in the title (H1036-025, page 1) and in every page header (H1036025000). SCAN prints no contract and plan number for either plan; the only identifier on the document is `26C-SBH5425006065` at the bottom of page 1, and the mapping of SCAN Classic to H5425-006-0 comes from public CMS-derived plan listings outside the PDF, which is exactly what the `source` field records.

**Backward compatibility:** new optional top-level property; the top-level object's `additionalProperties: false` gains one allowed key. v1.1.0 documents omit it and validate unchanged.

**Divergence to record for the pharmacy module's next release:** the pharmacy module v0.2.1 carries `formulary_reference.source_plan_identifiers` as an object with fixed keys (`hios_id`, `cms_contract_id`, `cms_pbp_id`), and its README says a future minor release may graduate these to core. Core now takes the array form instead. The module is not changed in this task; its next release should either reference the core array or document the mapping (each fixed key becomes one `{system, value}` entry). The same direction holds for G4 design (a): core's `pharmacy` object is inlined from the module as a strict subset (identical shapes for `deductible`, `out_of_pocket_max` and `coverage_stages`; the null-type wrappers in an earlier draft of this proposal were removed so that the module accepts everything core accepts), and the module's next release must continue to accept core's `pharmacy` shape.

---

## G2. Service area

**Summary (notes §3):** Medicare Advantage plans are sold by county, and both documents state their service area, but the standard has no field for it. Today it is quoted in `source_references` only.

**Location:** top level, new property `service_area`.

**Type:** object, nullable, optional. Properties: `state` (string, nullable), `counties` (array of `{name (string, required), fips (string, nullable)}`). Neither document prints FIPS codes, so the examples would carry names only.

**Schema fragment:**

```json
"service_area": {
  "type": ["object", "null"],
  "description": "Geographic service area the plan is sold in (closes gap G2 of the Medicare Advantage notes). Medicare Advantage plans are sold by county. Carry the counties as printed; fips is available when a machine-readable county code is known, but neither source document prints one.",
  "properties": {
    "state": {
      "type": ["string", "null"],
      "description": "Two-letter USPS state code (e.g. 'CA', 'FL')."
    },
    "counties": {
      "type": "array",
      "description": "Counties in the service area.",
      "items": {
        "type": "object",
        "properties": {
          "name": {
            "type": "string",
            "description": "County name as printed (e.g. 'Los Angeles')."
          },
          "fips": {
            "type": ["string", "null"],
            "description": "Five-digit county FIPS code, when known. Null when the source document does not print one."
          }
        },
        "required": ["name"],
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

**Evidence:** SCAN page 1 ("Los Angeles County") and page 17 ("live in the plan service area (Los Angeles County, California)"). Humana page 1 ("Our service area includes the following county/counties in Florida: Hernando, Hillsborough, Pasco, Pinellas.").

**Backward compatibility:** new optional top-level property, standard argument.

---

## G3. Premium

**Summary (notes §3):** The Summary of Benefits leads with the monthly premium; the SBC never carries one, so the standard has never had a field for it. Humana also prints a Part B premium reduction.

**Location:** top level, new properties `premium` and `part_b_premium_reduction`.

**Type:** `premium` is an object, nullable, optional: `amount` (number, required), `currency` (string, default "USD"), `period` (string, nullable, e.g. `per_month`), `notes` (string, nullable). `part_b_premium_reduction` is an object, nullable, optional: `amount` (number, nullable), `period` (string, nullable), `notes` (string, nullable). `amount` is nullable there because Humana prints a qualified value ("by up to $3"), and per the examples' rule that nothing is computed, a qualified value stays in `notes` with `amount` null; a plan that prints a flat reduction would set `amount`.

**Schema fragment:**

```json
"premium": {
  "type": ["object", "null"],
  "description": "The plan premium (closes gap G3 of the Medicare Advantage notes). The CMS Summary of Benefits leads with the monthly premium; the ACA SBC leaves the premium out, which is why the field did not exist before v1.2.0. For Medicare Advantage this is the plan premium and does not include the Medicare Part B premium.",
  "properties": {
    "amount": {
      "type": "number",
      "description": "Premium amount."
    },
    "currency": {
      "type": "string",
      "default": "USD",
      "description": "ISO 4217 currency code."
    },
    "period": {
      "type": ["string", "null"],
      "description": "Billing period (e.g. 'per_month')."
    },
    "notes": {
      "type": ["string", "null"],
      "description": "Free-text qualifier (e.g. 'You must continue to pay your Medicare Part B premium.')."
    }
  },
  "required": ["amount"],
  "additionalProperties": false
},
"part_b_premium_reduction": {
  "type": ["object", "null"],
  "description": "Medicare Part B premium reduction offered by the plan, when printed (part of gap G3). When the document prints a qualified value (e.g. Humana's 'by up to $3'), leave amount null and quote the qualifier in notes; set amount only when the document prints a flat reduction.",
  "properties": {
    "amount": {
      "type": ["number", "null"],
      "description": "Flat reduction amount, when the document prints one. Null when the printed value is qualified."
    },
    "period": {
      "type": ["string", "null"],
      "description": "Period the reduction applies per (e.g. 'per_month')."
    },
    "notes": {
      "type": ["string", "null"],
      "description": "Verbatim qualifier from the document."
    }
  },
  "additionalProperties": false
}
```

**Evidence:** SCAN page 3 (Monthly Health Plan Premium, SCAN Classic $0, with "You must continue to pay your Medicare Part B premium"). Humana page 4 ($0 premium, and the Part B premium reduction "by up to $3").

**Backward compatibility:** two new optional top-level properties, standard argument.

---

## G4. A second set of accumulators (design first, two options)

**Summary (notes §3):** Core has one individual deductible and one individual out-of-pocket maximum per network. A Medicare Advantage plan with drug coverage needs two sets, one medical and one Part D, and the Part D deductible has to name the drug tiers it covers. The Part D out-of-pocket threshold ($2,100 in both plans, after which the member pays $0) also has no slot.

**Evidence (shared by both designs):** SCAN page 3 ("No deductible for medical", maximum out-of-pocket $199 that "does not include prescription drugs"), SCAN page 8 ("You pay the full cost of your Tier 3 through Tier 5 drugs until you have paid $250"), SCAN page 9 (catastrophic stage after $2,100). Humana page 4 ("$0 deductible for Tier 1, Tier 2 and Tier 3", "$615 deductible for Tier 4 and Tier 5", repeated on page 10), Humana page 11 ($2,100 threshold).

### Design (a): wire the pharmacy module's accumulator objects into core

Add an optional top-level `pharmacy` object to core carrying three properties inlined from the pharmacy module v0.2.1: `deductible` (with `applies_to_tiers`), `out_of_pocket_max`, and `coverage_stages`. The shapes are copied, not `$ref`ed across files, so core stays self-contained and does not couple its release to the draft module file.

**Schema fragment (top level, plus one `$defs` entry):**

```json
"pharmacy": {
  "type": "object",
  "description": "Pharmacy-specific accumulators and coverage stages (closes gap G4 of the Medicare Advantage notes). Shapes are inlined from the pharmacy module v0.2.1, of which this is a subset; the module's formulary and network layers are not yet wired into core. A Medicare Advantage plan with drug coverage runs a Part D deductible scoped to drug tiers (e.g. SCAN: 'You pay the full cost of your Tier 3 through Tier 5 drugs until you have paid $250') and a Part D out-of-pocket threshold separate from the medical maximum, and neither fits the core accumulators object.",
  "properties": {
    "deductible": {
      "type": "object",
      "description": "Pharmacy deductible, separate from the medical deductible.",
      "properties": {
        "amount":   { "type": "number" },
        "currency": { "type": "string", "default": "USD" },
        "period":   { "type": ["string", "null"], "description": "per_calendar_year, per_plan_year" },
        "applies_to_tiers": {
          "type": "array",
          "description": "Drug tiers the deductible applies to, as the plan names them (e.g. 'Tier 3'). If omitted, applies to all tiers. When the pharmacy module is in use, these are pharmacy.formulary_tiers[].tier_id values.",
          "items": { "type": "string" }
        }
      },
      "required": ["amount"],
      "additionalProperties": false
    },
    "out_of_pocket_max": {
      "type": "object",
      "description": "Pharmacy out-of-pocket maximum or threshold, separate from the medical maximum (e.g. the Part D $2,100 annual out-of-pocket threshold, after which the member pays $0).",
      "properties": {
        "amount":   { "type": "number" },
        "currency": { "type": "string", "default": "USD" },
        "period":   { "type": ["string", "null"] }
      },
      "required": ["amount"],
      "additionalProperties": false
    },
    "coverage_stages": {
      "type": "array",
      "description": "Coverage stages, primarily for Medicare Part D plans. Post-2025 (IRA redesign): Deductible, Initial Coverage, Catastrophic Coverage.",
      "items": {
        "type": "object",
        "properties": {
          "stage_id":   { "type": "string", "description": "Plan-defined identifier. Medicare Part D canonical values (post-2025 redesign): 'DEDUCTIBLE', 'INITIAL', 'CATASTROPHIC'." },
          "name":       { "type": "string" },
          "stage_type": { "type": "string", "description": "Recommended values: 'deductible', 'initial', 'catastrophic'." },
          "applies_before_total_drug_cost":     { "type": ["number", "null"] },
          "applies_after_total_out_of_pocket":  { "type": ["number", "null"] }
        },
        "required": ["stage_id", "name"],
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

**A v1.1.0 document under (a):** unchanged. It has no `pharmacy` key and every field it does have keeps its exact v1.1.0 type.

**The SCAN Part D deductible under (a):**

```json
"pharmacy": {
  "deductible": {
    "amount": 250,
    "period": "per_calendar_year",
    "applies_to_tiers": ["Tier 3", "Tier 4", "Tier 5"]
  },
  "out_of_pocket_max": {
    "amount": 2100,
    "period": "per_calendar_year"
  }
}
```

**Cost for a reader that only knows v1.1.0:** it sees one unknown top-level key and ignores it. It misses the Part D accumulators entirely (it reads the plan as having only the medical set), but it misreads nothing: `accumulators` and every field inside it keep their v1.1.0 shape.

**Known limitation:** core's `pharmacy` object would carry only these three properties with `additionalProperties: false`, so a document using the module's other layers (formulary_tiers, formulary_items, pharmacy_networks) still fails core validation, exactly as it does today. Full module wiring stays a later, additive step, as the module README already plans.

### Design (b): each accumulator slot accepts a list

Keep the `pharmacy` object out of core. Instead, let each of the eight accumulator slots be either the existing single object (v1.1.0 form) or an array of them, and add an optional `formulary_tiers` array to the two accumulator `$defs`. The Part D deductible becomes a second entry in `individual_deductible` with `applies_to: "pharmacy"`.

**Schema fragment (per slot, and one addition to each `$defs` accumulator):**

```json
"individual_deductible": {
  "oneOf": [
    { "$ref": "#/$defs/deductible_accumulator" },
    {
      "type": "array",
      "minItems": 1,
      "items": { "$ref": "#/$defs/deductible_accumulator" },
      "description": "List form (v1.2.0, gap G4): one entry per coverage line, distinguished by applies_to."
    }
  ]
}
```

plus, on `$defs/deductible_accumulator` (and analogously on `$defs/oop_max_accumulator`):

```json
"formulary_tiers": {
  "type": ["array", "null"],
  "description": "For a pharmacy deductible: the drug tiers it applies to, as the plan names them (gap G4). Absent means all tiers.",
  "items": { "type": "string" }
}
```

**A v1.1.0 document under (b):** unchanged. The single-object form remains valid through the first `oneOf` branch.

**The SCAN Part D deductible under (b):**

```json
"accumulators": {
  "individual_deductible": [
    { "amount": 0, "applies_to": "medical" },
    { "amount": 250, "applies_to": "pharmacy", "formulary_tiers": ["Tier 3", "Tier 4", "Tier 5"] }
  ],
  "individual_oop_max": [
    { "amount": 199, "applies_to": "medical", "network_tier": "in-network" },
    { "amount": 2100, "applies_to": "pharmacy" }
  ]
}
```

**Cost for a reader that only knows v1.1.0:** a field it already parses changes shape. Code that reads `accumulators.individual_deductible.amount` gets undefined or crashes when the document uses the list form, on the most financially significant fields in the schema. Even a repaired reader must filter every slot by `applies_to` to answer "what is the deductible." Design (b) also has no home for the Part D coverage stages.

### Naming the deductible a cost share applies to

Under either design, `cost_shares[].applies_to_deductible` is a bare boolean and cannot say which deductible it means. Add a companion:

```json
"deductible_ref": {
  "type": ["string", "null"],
  "description": "Which deductible applies_to_deductible refers to, when the plan has more than one (gap G4). Recommended values: 'medical', 'pharmacy'. Under the list-form accumulators this matches the entry's applies_to value. Absent or null means the plan's medical deductible, which is the pre-v1.2.0 reading.",
  "default": null
}
```

This lets the Part D tier rows say `"applies_to_deductible": true, "deductible_ref": "pharmacy"` (SCAN Tiers 3 to 5, Humana Tiers 4 and 5) without implying the medical deductible.

### Recommendation

**Design (a),** because it only adds a key that v1.1.0 readers safely ignore, while design (b) changes the runtime shape of fields v1.1.0 readers already parse, and (a) additionally carries the Part D coverage stages and stays aligned with the module the Part D grid will eventually live in.

---

## G5. Day ranges on a cost share

**Summary (notes §3):** Humana's copay changes with the day of the stay ("$50 copay per day for days 1-6", "$0 copay per day for days 7-90"). Today the range sits in `notes`, so a reader has to parse "Days 1-6" to price day 10.

**Location:** `benefits[].network_cost_shares[].cost_shares[]` items, new property `unit_range`.

**Type:** object, nullable, optional: `from` (integer, required), `to` (integer, nullable; null means open-ended). Per the decision on the carve: `unit_range` carries only the bounds, and the unit stays in the existing `basis` field (e.g. `per_day`), so the two fields cannot disagree about the unit.

**Schema fragment:**

```json
"unit_range": {
  "type": ["object", "null"],
  "description": "The span of units this cost-share step applies to, when the amount changes with the unit count (closes gap G5 of the Medicare Advantage notes; e.g. Humana inpatient: '$50 copay per day for days 1-6' then '$0 copay per day for days 7-90'). The unit itself stays in basis (e.g. 'per_day'); this object carries only the bounds. Use one cost_shares step per range.",
  "properties": {
    "from": {
      "type": "integer",
      "description": "First unit the step applies to (inclusive)."
    },
    "to": {
      "type": ["integer", "null"],
      "description": "Last unit the step applies to (inclusive). Null when the document leaves the range open-ended."
    }
  },
  "required": ["from"],
  "additionalProperties": false
}
```

**Evidence:** Humana page 4 (inpatient, days 1-6 and days 7-90), Humana page 9 (skilled nursing, days 1-20 at $0 and days 21-100 at $160). SCAN prints one amount per row and would not use the field.

**Backward compatibility:** new optional property on cost-share items, standard argument.

---

## G6. Caps and ranges on a cost share

**Summary (notes §3):** For caps such as "25% up to $35" and "no more than $35 for a one-month supply," and for ranges such as "$0-$5" and "$0-20%," no number can go where the document prints one, so the value stays in `notes` today.

**Location:** `benefits[].network_cost_shares[].cost_shares[]` items, six new properties: `max_amount`, `max_basis` (caps) and `amount_min`, `amount_max`, `rate_min`, `rate_max` (ranges).

**Type:** `max_amount` number nullable; `max_basis` string nullable; `amount_min` and `amount_max` number nullable; `rate_min` and `rate_max` number nullable (0.0 to 1.0, same convention as `rate`). All optional, no defaults.

**Schema fragment:**

```json
"max_amount": {
  "type": ["number", "null"],
  "description": "Dollar cap on this cost-share step (closes gap G6 of the Medicare Advantage notes; e.g. Humana insulin '25% up to $35', SCAN Part B insulin 'No more than $35 for a one-month supply'). Pairs with rate or amount: the member pays the rate or amount, but never more than max_amount per max_basis."
},
"max_basis": {
  "type": ["string", "null"],
  "description": "Unit the cap applies per (e.g. 'per_prescription', 'per_one_month_supply'). Only meaningful when max_amount is set."
},
"amount_min": {
  "type": ["number", "null"],
  "description": "Lower bound of a dollar range, when the document prints a range instead of a single amount (gap G6; e.g. SCAN restorative dental 'In-network only: $8-$395'). Use with amount_max and leave amount null."
},
"amount_max": {
  "type": ["number", "null"],
  "description": "Upper bound of a dollar range. See amount_min."
},
"rate_min": {
  "type": ["number", "null"],
  "description": "Lower bound of a coinsurance-rate range (0.0-1.0), when the document prints a range (gap G6; e.g. SCAN Part B drugs '$0-20% of the Medicare-approved amount'). Use with rate_max and leave rate null."
},
"rate_max": {
  "type": ["number", "null"],
  "description": "Upper bound of a coinsurance-rate range (0.0-1.0). See rate_min."
}
```

**Evidence:** caps: SCAN page 7 ("No more than $35 for a one-month supply" of Part B insulin), Humana page 9 (each insulin product capped at $35 for a one-month supply), Humana page 11 (insulin grid cells pairing a coinsurance with a cap, "25% up to $35"). Ranges: SCAN page 7 ("$0-20% of the Medicare-approved amount" for Part B drugs), SCAN page 5 (comprehensive dental priced as ranges, "In-network only: $8-$395" for restorative services).

**Kaiser note, per the brief:** the Kaiser SBC example has the same cap problem. Its specialty tier is "20% coinsurance up to $250 / prescription," and the cap was left out (the example's own excerpt records that the pipeline "records the coinsurance and omits rather than misstates the cap"). With G6 it could carry `rate: 0.20, max_amount: 250, max_basis: "per_prescription"`. The Kaiser example is not edited in this task.

**Backward compatibility:** six new optional properties on cost-share items, standard argument. Semantics of the existing `amount` and `rate` are untouched; the new fields are only populated where the document prints a cap or a range, cases that today carry null and a note.

---

## G7. Coverage basis

**Summary (notes §3):** The main Medicare Advantage axis is whether Medicare pays for the benefit or the plan adds it as a supplemental benefit. `benefit_type` describes the domain (medical, dental, pharmacy), not which program pays, so today the verbatim `raw_label` is the only carrier of this distinction.

**Location:** `benefits[]` items, new property `coverage_basis`.

**Type:** string, nullable, optional, no default (absent means unspecified). Recommended values, not enum-enforced: `medicare_covered`, `supplemental_mandatory`, `supplemental_optional`.

**Schema fragment:**

```json
"coverage_basis": {
  "type": ["string", "null"],
  "description": "Which program pays for this benefit (closes gap G7 of the Medicare Advantage notes). Recommended values: 'medicare_covered' (a Medicare-covered service), 'supplemental_mandatory' (a plan-added benefit every member gets, e.g. Humana's 'Mandatory supplemental ... benefit' rows), 'supplemental_optional' (a plan-added benefit the member buys separately). Not enforced as enum to allow adopter extension. Orthogonal to benefit_type, which describes the service domain (medical, dental, hearing), not the paying program. Absent or null means the document does not make the distinction, which is the pre-v1.2.0 reading."
}
```

**Evidence:** both documents split each benefit area into a Medicare-covered row and a supplemental row. SCAN labels the supplemental rows "Non-Medicare-covered (routine)" and names its routine dental option "Dental Plan CAC73" (page 5). Humana labels them "Mandatory supplemental ... benefit" with codes HER692, DENF33 and VIS848 (pages 7 and 8). SCAN's optional dental PPO at $55 a month (page 16) motivates the `supplemental_optional` value, though that plan add-on itself is deferred with G12 and stays out of the examples.

**Note on `non_clinical`:** the stopgap `benefit_type` value for transportation, meals, OTC and similar services stays as proposed. Neither document suggests a better term: SCAN and Humana group these rows under headings naming the individual services, and CMS materials group them as supplemental benefits generally, which G7 now captures on its own axis. The vocabulary entry ships in Step 3 as planned.

**Backward compatibility:** new optional property on benefit items, standard argument.

---

## G8. "Not stated" for maximum out-of-pocket treatment (design first, two options)

**Summary (notes §3):** `applies_to_moop` is a boolean defaulting to true, so a row where the document is silent reads as counting toward the maximum. SCAN's Part B drug rows are one such case: page 3 excludes "prescription drugs" from the maximum without saying whether that includes Part B drugs. The verification record explicitly reset those rows to "not stated" after a review found the earlier reading unsupported.

Both fixes leave every existing field in place; they differ in which field carries "not stated."

### Fix (i): allow null on `applies_to_moop`

**Schema fragment (replacing the current definition on cost-share items):**

```json
"applies_to_moop": {
  "type": ["boolean", "null"],
  "default": true,
  "description": "Whether this cost-share step counts toward the maximum out-of-pocket. Null (v1.2.0, gap G8) means the source document does not state the treatment; distinct from false, which asserts the document excludes it."
}
```

**A v1.1.0 document under (i):** unchanged; every existing value is a boolean and booleans remain valid.

**The SCAN Part B drug rows under (i):** each cost-share step carries `"applies_to_moop": null`.

**What a v1.1.0 consumer gets wrong under (i):** null is falsy in most languages, so a v1.1.0 consumer reads "does not count toward the maximum" where the truth is "not stated." That is a new wrong answer: it asserts an exclusion the document never made and overstates the member's exposure. A v1.1.0 validator also rejects the document outright (type boolean), though the Medicare Advantage examples fail v1.1.0 validation anyway.

### Fix (ii): treat a null `moop_applicability` as authoritative

No type change. The benefit-level `moop_applicability` already allows null; today null has no assigned meaning. Give it one, by description only:

**Schema fragment (replacing the current description on `benefits[].moop_applicability`):**

```json
"moop_applicability": {
  "type": ["string", "null"],
  "description": "Specifies whether cost sharing for this benefit counts toward the maximum out-of-pocket (MOOP). Values may include plan_default, include, or exclude. An explicit null (v1.2.0, gap G8) means the source document does not state the treatment; consumers must treat the benefit's MOOP handling as unknown rather than applying the applies_to_moop default. An absent field keeps its pre-v1.2.0 meaning of plan_default."
}
```

**A v1.1.0 document under (ii):** unchanged; nothing about the field's type or requiredness moves. Checked against the corpus: all 234 `moop_applicability` values across the eight public examples are the string `"plan_default"`, never null, so no existing document is re-read.

**The SCAN Part B drug rows under (ii):** `"moop_applicability": null` on the benefit, `applies_to_moop` omitted from the cost-share steps, which is exactly what both Medicare Advantage examples already do.

**What a v1.1.0 consumer gets wrong under (ii):** it applies the `applies_to_moop` default and reads "counts toward the maximum" where the truth is "not stated." That is wrong, but it is the same reading v1.1.0 gives every document today, so nothing gets newer-wrong; the document also still validates against v1.1.0's types.

### Recommendation

**Fix (ii),** because it is a description-only change that matches what the verified examples already do and leaves a v1.1.0 consumer no worse than it is today, while fix (i) changes the type of a v1.0.0-era field and creates a null that old consumers misread as an exclusion the document never stated.

---

## G9. Allowance carryover

**Summary (notes §3):** Both plans give a $150 quarterly over-the-counter allowance, but the carryover rules differ (SCAN's unused balance carries to the next quarter but not the next year; Humana's expires at the end of the quarter). Today the difference is text in `notes`.

**Location:** `benefits[].limits[]` items, new property `carryover`.

**Type:** string, nullable, optional, no default. Recommended values, not enum-enforced: `none`, `next_period`, `within_year`.

**Schema fragment:**

```json
"carryover": {
  "type": ["string", "null"],
  "description": "What happens to the unused balance of an allowance-style limit at the end of its period (closes gap G9 of the Medicare Advantage notes). Recommended values: 'none' (expires, e.g. Humana's over-the-counter allowance 'expires at the end of the quarter'), 'next_period' (carries into the next period), 'within_year' (carries between periods within the year but not across years, e.g. SCAN's over-the-counter allowance). Not enforced as enum. Only meaningful on dollar allowances; absent or null means the document does not state a carryover rule."
}
```

**Evidence:** SCAN page 13 (over-the-counter allowance carries over to the next quarter but not the next year), Humana page 14 (allowance "expires at the end of the quarter").

**Backward compatibility:** new optional property on limit items, standard argument.

---

## G10. Either/or options

**Summary (notes §3):** Humana eyewear is a $300 allowance "or 2 pairs of select eyeglasses per year at no cost." Today that is two benefits with the "or" in `notes`, so a program adding up benefits counts both.

**Location:** `benefits[]` items, new property `alternative_group`.

**Type:** string, nullable, optional. A shared opaque id: benefits carrying the same `alternative_group` value are alternatives the member chooses between.

**Schema fragment:**

```json
"alternative_group": {
  "type": ["string", "null"],
  "description": "Shared identifier for benefits the member chooses between (closes gap G10 of the Medicare Advantage notes; e.g. Humana eyewear is a $300 allowance 'or 2 pairs of select eyeglasses per year at no cost', modeled as two benefits carrying the same alternative_group). A consumer that sums benefits must count at most one benefit per group. Absent or null means the benefit is not part of an either/or choice."
}
```

**Evidence:** Humana page 8 (eyewear allowance or two pairs of select eyeglasses).

**Backward compatibility:** new optional property on benefit items, standard argument.

---

## G11. Limit scope, shared limits, and the 12-month period

**Summary (notes §3):** Limits need a scope (per ear, per trip) and a way to share one count across benefits. Without them, a program that adds up the SCAN hearing aid limits counts 4 aids where the page allows 2. This extends the open item in `carin-dic-reconciliation.md` section 5, which already records that neither BPS nor the merged CARIN change types the population or network scope of a limit.

**Location:** `benefits[].limits[]` items, two new properties: `scope` and `shared_limit_id`. Plus one description-only edit to the existing `limits[].period`.

**Type:** `scope` string nullable, optional (recommended examples: `per_ear`, `per_trip`, `per_admission`; free string, since the documents also use per-person and per-stay shapes). `shared_limit_id` string nullable, optional; limits carrying the same id are one count. Per the decision on the carve: `scope` is the entity the limit counts against, distinct from `type`, which stays the unit being counted (visits, days, aids, trips).

**Schema fragment:**

```json
"scope": {
  "type": ["string", "null"],
  "description": "The entity this limit counts against (closes gap G11 of the Medicare Advantage notes; e.g. 'per_ear' for Humana's hearing aid limit of 1 per ear, 'per_trip', 'per_admission'). Distinct from type, which is the unit being counted (visits, days, aids). Absent or null means the limit counts against the member over the period, which is the pre-v1.2.0 reading."
},
"shared_limit_id": {
  "type": ["string", "null"],
  "description": "Shared identifier for one limit counted across several benefits (gap G11; e.g. SCAN routine acupuncture and routine chiropractic share 'up to 30 visits per year combined'). Limits carrying the same shared_limit_id on different benefits are a single count, not one count each; a consumer that sums limits must count each shared_limit_id once. Extends the limit-scope open item in docs/carin-dic-reconciliation.md section 5."
}
```

**Description-only edit to `limits[].period`:** add `per_12_months` to the recommended values (SCAN uses "every 12 months" for exams and hearing aids, which is a rolling window rather than a calendar or plan year). The changelog lists this under G11.

**Evidence:** SCAN pages 12 and 13 (routine acupuncture and routine chiropractic share "up to 30 visits per year combined"), SCAN page 4 ("up to 2 hearing aids every 12 months" under a row that prices both grades), Humana page 7 (hearing aid limit is 1 per ear, per the notes' verification record).

**Backward compatibility:** two new optional properties on limit items plus a description edit, standard argument.

---

## G14. A citation on each benefit

**Summary (notes §3):** `benefits[]` does not allow a citation field, so every example keeps its citations in the plan-level `source_references` and the link to a benefit is positional. That matters more for a 70-row Summary of Benefits than for a 30-row SBC.

**Location:** `benefits[]` items, new property `source_references`, with the same item shape as the plan-level `source_references`.

**Type:** array of objects, optional. Items: `page_number` (integer), `page_range` (string), `excerpt` (string), all optional, `additionalProperties: false`, exactly as at plan level.

**Schema fragment:** factor the item shape into `$defs` and reference it from both places, so the shape cannot drift:

```json
"source_reference": {
  "type": "object",
  "description": "A citation back to the source document: a page and an excerpt.",
  "properties": {
    "page_number": { "type": "integer" },
    "page_range":  { "type": "string" },
    "excerpt":     { "type": "string" }
  },
  "additionalProperties": false
}
```

with the plan-level `source_references.items` becoming `{ "$ref": "#/$defs/source_reference" }` (validation-identical to today's inline definition) and, on `benefits[]` items:

```json
"source_references": {
  "type": "array",
  "description": "Citations back to the source document for this benefit (closes gap G14 of the Medicare Advantage notes). Same shape as the plan-level source_references; use this to bind an excerpt to the benefit it evidences instead of relying on the plan-level list's ordering. Motivated by the CMS Summary of Benefits documents, whose 70-plus benefit rows make a positional link fragile.",
  "items": { "$ref": "#/$defs/source_reference" }
}
```

If zero edits to the existing plan-level lines are preferred, an inline copy of the item shape at the benefit level validates identically; the `$defs` factor is recommended only to keep one definition.

**Evidence:** notes section 4 (every benefit has at least one excerpt in the plan-level `source_references`, in benefit order, for 71 SCAN and 72 Humana benefits; the binding is positional convention only).

**Backward compatibility:** new optional property on benefit items; the plan-level refactor is semantically identical to the current inline definition, so no document's validation result changes.

---

## Deferred, for the record

- **G12 (optional supplemental packages, riders).** Not in this change. SCAN's dental PPO at $55 a month (page 16) stays out of the schema and the examples.
- **G13 (population-specific cost sharing, Extra Help).** Not in this change.

Both get a "Deferred" line in the changelog and a "Deferred" paragraph in the notes in Step 4.

---

## Vocabulary check: `market`

Both examples use `"market": "medicare_advantage"`. That code is already in `vocabularies/markets.json` (entry: "Medicare Part C plan."), so no vocabulary change is needed for `market`. The category and benefit-type additions listed in the handoff's decisions ship in Step 3.
