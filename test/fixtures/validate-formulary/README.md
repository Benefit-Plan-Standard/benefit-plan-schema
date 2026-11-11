# Fixtures for the formulary list (v1.2.0 draft 9)

Documents for `scripts/validate.test.js` that use `schema/v1.2.0/formulary.schema.json`, the drug list written once for the plans that share it. They sit apart from `../validate/`, whose documents are plans.

| File | What it shows |
|---|---|
| `formulary-list.json` | Passes: 2 items in the shape the Part D formulary importer writes from the CMS Basic Drugs Formulary file, with no drug name, quantity limits with no unit, and each row quoted. The values are 2 rows of formulary 00027000 in the contract year 2027 file `2027_20261008.zip`; the list is a cut, not the whole formulary. |
| `formulary-list-item-without-tier.json` | Fails: an item with no `formulary_tier_id`. |
