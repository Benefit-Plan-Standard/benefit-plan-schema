# Benefit Plan Standard Schema

This repository contains the canonical JSON schema and supporting assets for the **Benefit Plan Standard**.  
The schema defines a carrier‑agnostic representation of health insurance benefit plans, enabling normalization and interoperability across carriers, products, and plan types.

## Contents

- **schema/** – Machine‑readable JSON schema files, versioned by release.  
- **examples/** – Example plan documents normalized into the schema format for reference.  
- **modules/** – Reserved for future schema extensions (e.g. pharmacy, dental, vision, behavioral health).  
- **docs/** – Supporting documentation, including the changelog, roadmap, and governance materials.

## Usage

The schema under `schema/v1.0.0/benefit-plan.schema.json` follows the [JSON Schema Draft 2020‑12](https://json-schema.org/draft/2020-12/schema) specification.  
It describes the required fields and structure for normalized benefit plan data.  
Consumers should validate plan JSON documents against this schema to ensure compliance with the standard.

## Contributing

Contributions are welcome!  Please see `docs/governance.md` for information about the project’s governance model and how to participate in the evolution of the standard.
