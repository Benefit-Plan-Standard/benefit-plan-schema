# 📦 Benefit Plan Standard — JSON Schema
Official JSON Schema for the **Benefit Plan Standard**, a unified, vendor-neutral data model for representing U.S. health insurance benefit plans.

<p align="left">
  <a href="https://benefitplanstandard.org">
    <img src="https://img.shields.io/badge/Documentation-Live-blue?style=for-the-badge" />
  </a>
  <img src="https://img.shields.io/badge/Schema-v1.0.0-green?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Status-Stable-blueviolet?style=for-the-badge" />
  <img src="https://img.shields.io/github/license/Benefit-Plan-Standard/benefit-plan-schema?style=for-the-badge" />
</p>

---

## 🔎 Quick Links

- Documentation: [https://benefitplanstandard.org](https://benefitplanstandard.org)
- Canonical schema: `schema/v1.0.0/benefit-plan.schema.json`
- Examples: `examples/`
- Modules overview: `modules/README.md`
- Governance: `docs/governance.md`
- Roadmap: `docs/roadmap.md`

---

## 📘 Overview

The **Benefit Plan Standard (BPS)** defines a machine-readable format for normalizing medical benefit plans across U.S. carriers, including:

- Blue Cross Blue Shield  
- Aetna  
- Cigna  
- UnitedHealthcare  
- Humana  
- SCAN  
- GatorCare  
- And additional carriers coming soon…

This repository contains:

- The **canonical JSON Schema (v1.0.0)**  
- Example normalized plans  
- Module definitions (pharmacy, behavioral health, dental/vision, etc.)  
- Roadmap and governance documentation  

All public documentation is hosted at:

👉 **[benefitplanstandard.org](https://benefitplanstandard.org)**

---

## 🧩 Repository Structure

```text
schema/
  └── v1.0.0/
        benefit-plan.schema.json   # Canonical schema
docs/
  ├── governance.md
  ├── roadmap.md
examples/
  ├── aetna_example.json
  ├── bluecross_example.json
  ├── cigna_example.json
  ├── gatorcare_example.json
  ├── humana_example.json
  ├── scan_example.json
  └── united_example.json
modules/
  └── README.md  # Module system overview
```

## 📐 JSON Schema Versioning

The schema uses semantic versioning:

- MAJOR → Breaking changes
- MINOR → Backward-compatible additions
- PATCH → Fixes & clarifications

Current version: v1.0.0

All schemas are validated using:

- JSON Schema Draft 2020–12
- Standard tooling (AJV, JSON Schema Validator, etc.)

Note: Draft 2020–12 is supported by Ajv v8+. Ensure your plan JSON includes a `$schema` declaration or that your validator is configured with the canonical schema.

---

## 📄 Example Plans

Real-world examples normalized to the BPS schema can be found at:

```text
/examples
```

These examples help carriers, TPAs, brokers, and integrators understand how real benefit plans map to the canonical structure.

---

## 🤝 Validation Rules

Validation covers:

✔ Schema-level validation

- Types
- Required fields
- Enum enforcement
- Structure compliance

✔ Business rules

- Deductible ≥ 0
- OOP max ≥ deductible
- Coinsurance within valid range
- Required accumulators present

✔ Cross-section consistency

- Summary vs detailed tables
- SBC vs EOC values
- Network tier mapping

Full validation logic is defined here:
👉 See the Validation Framework in the docs repo.

If you need business-rule validation beyond structural schema checks (e.g., deductible and OOP relationships), refer to the Validation Framework for rule sets and scripts.

## 🔌 Usage

Validate a plan JSON

```powershell
# Install Ajv CLI (requires Node.js)
npm install -g ajv-cli

# Validate a plan against the canonical schema (PowerShell / pwsh)
ajv validate `
  -s schema/v1.0.0/benefit-plan.schema.json `
  -d myplan.json `
  --strict=false
```

Programmatic validation (Node)

```javascript
// Ajv v8+ recommended for Draft 2020-12
import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "node:fs";
import schema from "./schema/v1.0.0/benefit-plan.schema.json" assert { type: "json" };

const ajv = new Ajv({ strict: false });
addFormats(ajv);

const validate = ajv.compile(schema);
const plan = JSON.parse(fs.readFileSync("myplan.json", "utf8"));

const valid = validate(plan);
if (!valid) {
  console.error("Validation errors:", validate.errors);
  process.exitCode = 1;
} else {
  console.log("Plan is valid against BPS v1.0.0");
}
```

Tip: For CommonJS, use `const Ajv = require('ajv')` and `require('./schema/v1.0.0/benefit-plan.schema.json')`.

## 🤝 Contributing

We welcome contributions!

Please read:

- CONTRIBUTING.md
- CODE_OF_CONDUCT.md

Issues and proposals should reference the governance model and include example payloads when applicable.

Schema changes follow the governance model established by the Benefit Plan Standard.

---

## 📄 License

MIT License — open for commercial and academic use.

---

## 🏛 Maintained By

Benefit Plan Standard Organization

[https://benefitplanstandard.org](https://benefitplanstandard.org)
