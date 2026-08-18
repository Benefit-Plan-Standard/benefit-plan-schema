#!/usr/bin/env node
/**
 * Benefit Plan Standard — two-layer plan validator
 *
 * Layer 1 (normative):     JSON Schema validation against the BPS schema.
 *                          Structure, required fields, types. Pass or fail.
 * Layer 2 (advisory):      Vocabulary conformance against the published
 *                          vocabularies (categories, canonical benefit keys,
 *                          markets, plan types). Warnings only, because the
 *                          vocabularies are non-normative and extensible.
 *
 * Usage:
 *   npm install ajv ajv-formats        (one time)
 *   node scripts/validate.js examples/aetna_example.json
 *   node scripts/validate.js --schema schema/v1.2.0/benefit-plan.schema.json plan.json
 *   node scripts/validate.js --no-vocab plan.json          (layer 1 only)
 *   node scripts/validate.js --strict-vocab plan.json      (warnings also fail)
 *
 * Exit codes: 0 = schema-valid (vocabulary warnings allowed unless --strict-vocab),
 *             1 = schema-invalid or file/usage error.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const DEFAULT_SCHEMA = path.join(REPO_ROOT, 'schema', 'v1.1.0', 'benefit-plan.schema.json');
const VOCAB_DIR = path.join(REPO_ROOT, 'vocabularies');

function readJson(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`error: cannot read ${p}: ${e.message}`);
    process.exit(1);
  }
}

// ---- arguments -------------------------------------------------------------
const args = process.argv.slice(2);
let schemaPath = DEFAULT_SCHEMA;
let checkVocab = true;
let strictVocab = false;
const files = [];

for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--schema') schemaPath = path.resolve(args[++i]);
  else if (a === '--no-vocab') checkVocab = false;
  else if (a === '--strict-vocab') strictVocab = true;
  else if (a === '--help' || a === '-h') {
    console.log('usage: node scripts/validate.js [--schema <schema.json>] [--no-vocab] [--strict-vocab] <plan.json> [more plans...]');
    process.exit(0);
  } else files.push(path.resolve(a));
}

if (files.length === 0) {
  console.error('error: no plan file given. usage: node scripts/validate.js <plan.json>');
  process.exit(1);
}

// ---- layer 1: schema -------------------------------------------------------
let Ajv2020;
try {
  Ajv2020 = require('ajv/dist/2020');
} catch (e) {
  console.error('error: ajv is not installed. Run: npm install ajv ajv-formats');
  process.exit(1);
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
try {
  require('ajv-formats')(ajv);
} catch (e) {
  /* ajv-formats is optional; date fields simply go unchecked without it */
}

const schema = readJson(schemaPath);
const validate = ajv.compile(schema);

// ---- layer 2: vocabularies -------------------------------------------------
function loadVocab() {
  const v = {};
  const read = (f) => (fs.existsSync(path.join(VOCAB_DIR, f)) ? readJson(path.join(VOCAB_DIR, f)) : null);
  const cats = read('categories.json');
  const canon = read('canonical-benefits.json');
  const markets = read('markets.json');
  const planTypes = read('plan-types.json');
  v.categories = new Set(((cats && cats.categories) || []).map((c) => c.code));
  v.canonicalKeys = new Set(((canon && canon.benefits) || []).map((b) => b.canonical_key));
  v.markets = new Set(((markets && markets.markets) || []).map((m) => m.code));
  v.planTypes = new Set(((planTypes && planTypes.plan_types) || []).map((p) => p.code));
  return v;
}

function vocabWarnings(plan, v) {
  const warns = [];
  if (plan.market && v.markets.size && !v.markets.has(plan.market))
    warns.push(`market "${plan.market}" is not in vocabularies/markets.json`);
  if (plan.plan_type && v.planTypes.size && !v.planTypes.has(plan.plan_type))
    warns.push(`plan_type "${plan.plan_type}" is not in vocabularies/plan-types.json`);
  (plan.benefits || []).forEach((b, i) => {
    if (b.category && v.categories.size && !v.categories.has(b.category))
      warns.push(`benefits[${i}].category "${b.category}" is not in vocabularies/categories.json`);
    if (b.canonical_key && v.canonicalKeys.size && !v.canonicalKeys.has(b.canonical_key))
      warns.push(`benefits[${i}].canonical_key "${b.canonical_key}" is not in vocabularies/canonical-benefits.json`);
  });
  return warns;
}

// ---- run -------------------------------------------------------------------
const vocab = checkVocab ? loadVocab() : null;
let anySchemaFailure = false;
let anyVocabWarning = false;

for (const file of files) {
  const plan = readJson(file);
  const rel = path.relative(process.cwd(), file);
  const ok = validate(plan);

  if (ok) {
    console.log(`PASS  ${rel} — valid against ${path.relative(REPO_ROOT, schemaPath)}`);
  } else {
    anySchemaFailure = true;
    console.log(`FAIL  ${rel} — ${validate.errors.length} schema error(s):`);
    for (const e of validate.errors) {
      console.log(`      ${e.instancePath || '(root)'}  ${e.message}`);
    }
  }

  if (vocab) {
    const warns = vocabWarnings(plan, vocab);
    if (warns.length) {
      anyVocabWarning = true;
      for (const w of warns) console.log(`      vocab-warning: ${w}`);
    } else if (ok) {
      console.log(`      vocabulary: all category/canonical_key/market/plan_type values are canonical`);
    }
  }
}

process.exit(anySchemaFailure || (strictVocab && anyVocabWarning) ? 1 : 0);
