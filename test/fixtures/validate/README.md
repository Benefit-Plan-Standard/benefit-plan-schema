# Validator fixtures

Documents for `scripts/validate.test.js`: 1 for each pharmacy warning that `scripts/validate.js` prints since the Benefit Plan Standard 1.2.0 draft 6, and 1 that carries the fields of draft 7. All 3 are valid against `schema/v1.2.0/benefit-plan.schema.json`, so the validator passes them and exits 0; the warnings are advisory.

- `pharmacy-field-on-medical-benefit.json`: a benefit with no `benefit_type`, so `medical` by default, carries `day_supply`, a field of the pharmacy module benefit extension. 1 warning.
- `pharmacy-unknown-ids.json`: the second pharmacy benefit names a `formulary_tier_id`, a `pharmacy_network_id` and a `coverage_stage_id` that the document's `pharmacy` object does not define. 3 warnings. The first benefit names ids the object defines and gets none.
- `draft-7-fields.json`: `pharmacy.deductible.family_amount`, `cost_shares[].min_amount` and `min_basis`, `network_cost_shares[].covered_under` and `not_covered_reason`, and `source_references[].document` at plan level and on a benefit. No warning.

The plans are made up for the test and are no carrier's.
