# Modules

The **modules** directory holds extensions to the core Benefit Plan Standard schema.  
Each subdirectory holds a JSON schema fragment, example data, and documentation related to a particular domain, such as pharmacy, behavioral health, dental, or vision coverage.

## Current modules

| Module | Status | Latest | Description |
|---|---|---|---|
| [`pharmacy/`](./pharmacy/v0.2.1/) | **Draft — community review** | v0.2.1 | Pharmacy benefit structure (formulary tiers, pharmacy networks, Part D coverage stages, Rx accumulators) plus a drug-level formulary layer with indication-dependent coverage (`coverage_exceptions[]`). Targets BPS v1.2.0. |

To propose a new module, please consult the roadmap and governance documents and open a discussion in the repository.
