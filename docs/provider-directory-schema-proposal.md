# Provider directory field proposal

**Status:** Proposed, not in any schema version. Adding a field is a schema change and needs the maintainer's decision; nothing in `schema/`, the importers or the converter reads or writes this field yet.
**Written:** October 13, 2026
**Inputs:** `schema/v1.2.0/benefit-plan.schema.json` (draft), the [CMS Network PUF data dictionary for plan year 2026](https://www.cms.gov/files/document/network-datadictionary-py26.pdf) (read 2026-10-13), the Plan Attributes PUF's `NetworkId` column as the Marketplace importer already records it, and the SBC source documents in `examples/sources/`.

A plan's provider directory is where a member finds the providers its network tier applies to. BPS has no field for it. This document proposes one, in the same form as `medicare-advantage-schema-proposal.md`: location, type, cardinality, schema fragment, evidence and backward compatibility.

---

## What the schema has today

- **v1.1.0:** no URL field anywhere.
- **v1.2.0 draft:** no plan-level or network-level URL field. The only reference to a directory is `network_tiers[].provider_set.reference`, and it does not fit:
  - `provider_set` is defined for `cost_designation` tiers ("the set of providers the designation applies to"), not for the network a member accesses;
  - `reference` is "a provider-directory entity, e.g. a FHIR (DaVinci PDex Plan-Net) Organization URL or identifier", a machine reference to one entity, not the address of the directory people search;
  - the Marketplace importer writes v1.1.0 documents, which have no `provider_set`.

Writing the directory address into `provider_set.reference` would state that a cost designation exists where none does, so it is not used.

## Proposal: `network_tiers[].provider_network`

**Location:** each item of `network_tiers`, new property `provider_network`.

**Type:** object or null, optional. Properties, all optional and nullable: `name` (string), `network_id` (string), `provider_directory_url` (string), `source` (string). `additionalProperties: false`.

**Cardinality:** 0..1 per tier, written only on tiers whose `tier_class` is `network` (or absent). A plan has 0 to as many as it has network tiers. A tier the source does not tie to a network (for example `OUT`, or a Marketplace tier 2 when the public file names 1 network per plan) has none; the field is never copied from one tier to another.

**Schema fragment** (inside `network_tiers.items.properties`):

```json
"provider_network": {
  "type": ["object", "null"],
  "description": "For 'network' tiers: the provider network the member accesses through this tier, and where its provider directory is. Absent or null when the source does not name the network. Not for cost_designation tiers, whose provider subset is provider_set.",
  "properties": {
    "name": {
      "type": ["string", "null"],
      "description": "The network's name as the source prints it (e.g. the Marketplace Network PUF NetworkName)."
    },
    "network_id": {
      "type": ["string", "null"],
      "description": "The network identifier the source assigns (e.g. the Marketplace NetworkId 'FLN001'). Unique only within the assigning issuer, state and plan year; it is not a global key."
    },
    "provider_directory_url": {
      "type": ["string", "null"],
      "description": "The address of the network's provider directory, verbatim as the source gives it. Not format-checked: the Network PUF types NetworkURL as free text, and SBCs print bare host names."
    },
    "source": {
      "type": ["string", "null"],
      "description": "Where the values came from when the plan's own document does not print them (e.g. 'CMS Network PUF, plan year 2026'). Null or absent when the document prints them."
    }
  },
  "additionalProperties": false
}
```

**Evidence:**

- **Marketplace public files.** The Network PUF data dictionary (PY2026) defines `NetworkURL` as "The URL of the network's provider directory", Data Type Text, Allowable Values Free Text, from the Marketplace Plan Management System for the 2024 through 2026 datasets. Each Network PUF record is "an issuer's provider network", keyed by `BusinessYear`, `StateCode`, `IssuerId` and `NetworkId`, with `NetworkName`. The Plan Attributes PUF gives each plan variant 1 `NetworkId`, which the importer already carries as text in `source_references` (importer spec 4.4). For the 5 Marketplace golden plans: AvMed `FLN001`, Louisiana `LAN001`, Florida Blue `FLN001`, UHC Bronze `FLN011`, UHC Gold `TXN011`. AvMed and Florida Blue share `FLN001` but are different issuers, which is why the description says the identifier is not a global key and why a join to the Network PUF needs the issuer, state and year as well.
- **SBC documents.** The SBC row "Will you pay less if you use a network provider?" names where to find the list of network providers. The Florida Blue BlueOptions 505 SBC prints `https://providersearch.floridablue.com/providersearch/pub/index.htm` (page 1); the GatorCare Prime SBC prints `Gatorcare.org` (page 1), a host name without a scheme.
- **FHIR.** In the SBC InsurancePlan profile (`hl7.fhir.us.insurance-card#2.0.0-ballot`), `InsurancePlan.plan.network` and `InsurancePlan.coverage.network` are 0..*, Reference(Organization), mustSupport. A network Organization holding `name` and a `telecom` of system `url` would carry these values. The converter emits no network Organizations today (converter spec 4.1).

**Why network-level and not plan-level:** the directory belongs to the network, not to the plan. Many plans share 1 network (the Network PUF lists networks, not plans), and a plan with more than 1 network tier may reach more than 1 network. A top-level `provider_directory_url` would have to pick one. The network-level object also keeps the name and identifier with the address, so a reader can tell which network a URL is for.

**Backward compatibility:** new optional property on `network_tiers` items, whose `additionalProperties: false` gains 1 allowed key. Documents that omit it validate unchanged. It would ship in the v1.2.0 draft or a later minor version; v1.1.0 documents cannot carry it.

## What would follow if accepted

Not done here, and each is its own change:

1. **Schema.** Add the fragment to the chosen version; regenerate the published schema and the docs.
2. **Marketplace importer.** Bring the Network PUF into scope (importer spec section 2 excludes it today): download `https://download.cms.gov/marketplace-puf/<year>/network-puf.zip`, join on `BusinessYear`, `StateCode`, `IssuerId` and `NetworkId`, and write `provider_network` on the `IN` tier only, with `source` naming the file. The importer writes v1.1.0 today, so its documents would move to the version that has the field. A plan whose `NetworkId` has no Network PUF row gets no `provider_network`; nothing is guessed.
3. **Converter.** Map `provider_network` to a network `Organization` referenced from `plan.network`, with `name` and a `telecom` of system `url`; specify it in `docs/specs/insuranceplan-converter.md` section 4.1, which today says the converter emits no provider-network Organizations.
