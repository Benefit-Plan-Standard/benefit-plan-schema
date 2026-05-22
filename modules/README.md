# Modules

The **modules** directory holds extensions to the core Benefit Plan Standard schema. Each subdirectory contains a JSON schema fragment, example data, and documentation for a specific domain.

Modules are versioned independently of the core schema. A module at `v0.x.x` is a **draft** published for community review and not yet normative. When a module reaches `v1.0.0`, its additions become part of the core schema (typically in the next BPS minor release).

## Available modules

| Module | Status | Path |
|--------|--------|------|
| **Pharmacy** | Draft (v0.1.0) — under review | [`pharmacy/`](./pharmacy/) |
| Behavioral Health | Planned | — |
| Dental / Vision | Planned | — |
| Supplemental Benefits | Planned | — |

## Module pattern

A module typically uses BPS v1.1.0's `benefit_type` discriminator on `benefits[]` items to indicate the domain (`pharmacy`, `dental`, `vision`, `behavioral_health`, `maternity`). When a benefit has domain-specific structure that doesn't fit the core benefit shape (e.g., pharmacy formulary tiers, Medicare Part D coverage stages), the module also introduces an optional **top-level object** carrying the structural definitions, with extension fields on `benefits[]` items referencing into it.

Both additions are backward-compatible: a plan that doesn't use a module simply omits it.

## Proposing a module

1. Open a discussion in [`benefit-plan-docs`](https://github.com/Benefit-Plan-Standard/benefit-plan-docs/discussions) describing the use case, the gap in the core schema, and a sketch of the proposed additions.
2. Once there's consensus on the shape, open a PR adding `modules/<your-module>/v0.1.0/` with:
   - `<module>.schema.json` — the schema fragment
   - `README.md` — design rationale, open questions, worked-example pointer
   - `examples/` — one or more worked examples
3. Iterate based on review. When the module stabilizes, propose merging it into the core schema as part of the next BPS minor release.

See [`pharmacy/`](./pharmacy/) for a reference implementation of this pattern.

## Governance

Module proposals follow the same governance as core-schema changes — see [`docs/governance.md`](../docs/governance.md). Carriers, PBMs, brokers, TPAs, and adopters running real workloads are especially encouraged to weigh in.
