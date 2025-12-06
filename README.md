# 📦 Benefit Plan Standard — JSON Schema  
The canonical, vendor-neutral JSON Schema for representing U.S. health insurance benefit plans in a consistent, machine-readable format.

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

- Documentation: https://benefitplanstandard.org  
- Canonical schema file: `schema/v1.0.0/benefit-plan.schema.json`  
- Example plans: `examples/`  
- Modules: `modules/README.md`  
- Governance: `docs/governance.md`  
- Roadmap: `docs/roadmap.md`  

---

## 📘 Overview

The **Benefit Plan Standard (BPS)** defines a normalized, machine-readable structure for health insurance plan benefits across U.S. carriers.  
It is designed to support:

- Interoperability  
- Regulatory and transparency initiatives  
- Analytics and automation  
- Standardized terminology  
- Consistent cross-carrier comparison  

This repository contains:

- The **canonical JSON Schema (v1.0.0)**  
- Example normalized plans  
- Module definitions (pharmacy, behavioral health, dental/vision, etc.)  
- Governance guidelines and roadmap  

For complete documentation, visit:  
👉 https://benefitplanstandard.org

---

## 📁 Repository Structure

```text
schema/
  └── v1.0.0/
        benefit-plan.schema.json
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
  └── README.md
```

---

## 📐 Versioning Policy

The schema follows **semantic versioning**:

- **MAJOR** → Breaking changes  
- **MINOR** → Backward-compatible additions  
- **PATCH** → Fixes & clarifications  

Current version: **v1.0.0**

Validation uses:

- **JSON Schema Draft 2020-12**  
- Ajv v8+ or any compatible implementation  

Include `$schema` or configure your validator to load this canonical schema.

---

## 📄 Example Plans

Example normalized files are provided in:

```
/examples
```

These examples demonstrate how real-world SBC/EOC plan structures map into the standardized model.

---

## 🧪 Schema-Level Validation

The schema enforces:

### ✔ Structural requirements
- Required fields  
- Field types  
- Object/array structure  
- Enum values  
- Format constraints (e.g., dates)

### ✔ Core benefit model consistency
- Valid network tier references  
- Required accumulator fields  
- Proper use of cost-share fields (copay, coinsurance, etc.)  

### ✔ Allowed field formats  
- Monetary values  
- Percentages  
- Identifiers  
- Metadata fields  

---

### ⚠️ What This Repository Does *Not* Provide

To remain vendor-neutral, this repository **does not** include:

- PDF/SBC/EOC ingestion logic  
- AI extraction or OCR models  
- Semantic or interpretation-based validation  
- Proprietary business-rule engines  
- Cross-document reconciliation logic  

These are implementation-specific choices that depend on downstream systems.  
This repository strictly defines the **open schema**, not ingestion behavior.

---

## 🔌 Usage

### Validate a plan file using Ajv CLI

```bash
npm install -g ajv-cli

ajv validate \
  -s schema/v1.0.0/benefit-plan.schema.json \
  -d myplan.json \
  --strict=false
```

### Programmatic validation (Node.js)

```javascript
import Ajv from "ajv";
import addFormats from "ajv-formats";
import fs from "fs";
import schema from "./schema/v1.0.0/benefit-plan.schema.json" assert { type: "json" };

const ajv = new Ajv({ strict: false });
addFormats(ajv);

const validate = ajv.compile(schema);
const plan = JSON.parse(fs.readFileSync("myplan.json", "utf8"));

if (!validate(plan)) {
  console.error(validate.errors);
} else {
  console.log("Valid according to Benefit Plan Standard v1.0.0");
}
```

---

## 🤝 Contributing

We welcome contributions from the community.

Please read:

- `CONTRIBUTING.md`  
- `CODE_OF_CONDUCT.md`  

Schema updates must follow the governance model and include example payloads where relevant.

Issues:  
https://github.com/Benefit-Plan-Standard/benefit-plan-schema/issues

Discussions:  
https://github.com/Benefit-Plan-Standard/benefit-plan-docs/discussions

---

## 📄 License

MIT License — open for academic, commercial, and regulatory use.

---

## 🏛 Maintained By

**Benefit Plan Standard Organization**  
https://benefitplanstandard.org
