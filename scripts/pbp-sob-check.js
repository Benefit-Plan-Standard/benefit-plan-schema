#!/usr/bin/env node
/**
 * Checks a Benefit Plan Standard document written by scripts/from-pbp.js against
 * the values its CMS Summary of Benefits prints, as listed in an expectations
 * file (docs/specs/pbp-sob-checks/<plan>.json). Spec: docs/specs/pbp-importer.md
 * section 13.
 *
 * Usage:
 *   node scripts/pbp-sob-check.js <document.json> <expectations.json>
 *
 * The expectations file is { plan, document, checks: [...] }; each check is
 *   { item, page, printed?, expected, path, expected_reading? }
 * - path: a JSON pointer (RFC 6901) into the document.
 * - expected: the printed value, as JSON. An object matches when every key it
 *   names matches (other keys are ignored); an array matches element by element
 *   and must have the same length; anything else must be equal. {"$absent": true}
 *   matches a pointer or key that resolves to nothing.
 * - expected_reading: where the importer's reading differs from the printed value
 *   on purpose (spec section 13), the value the document should hold instead.
 *
 * Each check prints MATCH (the document holds the printed value), READING (it
 * holds the expected reading, not the printed value) or DIFFERENCE (neither).
 * Exit codes: 0 = no DIFFERENCE, 1 = at least 1 DIFFERENCE, 2 = bad input.
 */

'use strict';

const fs = require('fs');

const ABSENT = Symbol('absent');

function resolvePointer(doc, pointer) {
  if (pointer === '') return doc;
  if (!pointer.startsWith('/')) throw new Error(`"${pointer}" is not a JSON pointer`);
  let v = doc;
  for (const raw of pointer.slice(1).split('/')) {
    const key = raw.replace(/~1/g, '/').replace(/~0/g, '~');
    if (v === null || typeof v !== 'object' || !Object.prototype.hasOwnProperty.call(v, key)) return ABSENT;
    v = v[key];
  }
  return v;
}

function isAbsentMarker(x) {
  return x !== null && typeof x === 'object' && !Array.isArray(x) && x.$absent === true && Object.keys(x).length === 1;
}

function matches(actual, expected) {
  if (isAbsentMarker(expected)) return actual === ABSENT;
  if (actual === ABSENT) return false;
  if (Array.isArray(expected)) {
    return Array.isArray(actual) && actual.length === expected.length && expected.every((e, i) => matches(actual[i], e));
  }
  if (expected !== null && typeof expected === 'object') {
    if (actual === null || typeof actual !== 'object' || Array.isArray(actual)) return false;
    return Object.keys(expected).every((k) => matches(Object.prototype.hasOwnProperty.call(actual, k) ? actual[k] : ABSENT, expected[k]));
  }
  return actual === expected;
}

function show(v) {
  if (v === ABSENT) return '(absent)';
  const s = JSON.stringify(v);
  return s.length > 160 ? s.slice(0, 157) + '...' : s;
}

// Returns { results: [{ status, check, actual }], counts }.
function runChecks(doc, expectations) {
  const counts = { MATCH: 0, READING: 0, DIFFERENCE: 0 };
  const results = expectations.checks.map((check) => {
    const actual = resolvePointer(doc, check.path);
    let status = 'DIFFERENCE';
    if (matches(actual, check.expected)) status = 'MATCH';
    else if ('expected_reading' in check && matches(actual, check.expected_reading)) status = 'READING';
    counts[status]++;
    return { status, check, actual };
  });
  return { results, counts };
}

function report(doc, expectations, { results, counts }) {
  const lines = [];
  const key = (doc.plan_identifiers || []).map((p) => p.value)[0] || doc.plan_id;
  lines.push(`Summary of Benefits check: ${key} ${doc.plan_name}`);
  lines.push(`Expectations: ${expectations.plan}, ${expectations.document.id} (${expectations.document.file})`);
  for (const { status, check, actual } of results) {
    const benefit = /^\/benefits\/(\d+)\//.exec(check.path);
    const bid = benefit && doc.benefits[Number(benefit[1])] ? ` [${doc.benefits[Number(benefit[1])].benefit_id}]` : '';
    lines.push(`${status.padEnd(10)} p${String(check.page).padEnd(3)} ${check.item}${bid}`);
    if (status !== 'MATCH') {
      if (check.printed) lines.push(`             text:     ${check.printed}`);
      lines.push(`             printed:  ${show(check.expected)}`);
      lines.push(`             document: ${show(actual)}  at ${check.path}`);
      if (status === 'READING' && check.note) lines.push(`             reading:  ${check.note}`);
    }
  }
  lines.push(`${results.length} checks: ${counts.MATCH} MATCH, ${counts.READING} READING, ${counts.DIFFERENCE} DIFFERENCE`);
  return lines.join('\n');
}

function main(argv) {
  if (argv.length !== 2 || argv.includes('-h') || argv.includes('--help')) {
    console.error('usage: node scripts/pbp-sob-check.js <document.json> <expectations.json>');
    return argv.includes('-h') || argv.includes('--help') ? 0 : 2;
  }
  let doc;
  let expectations;
  try {
    doc = JSON.parse(fs.readFileSync(argv[0], 'utf8'));
    expectations = JSON.parse(fs.readFileSync(argv[1], 'utf8'));
    if (!Array.isArray(expectations.checks)) throw new Error(`${argv[1]} has no "checks" list`);
  } catch (e) {
    console.error('error: ' + e.message);
    return 2;
  }
  const out = runChecks(doc, expectations);
  console.log(report(doc, expectations, out));
  return out.counts.DIFFERENCE ? 1 : 0;
}

module.exports = { resolvePointer, matches, runChecks, report, ABSENT };

if (require.main === module) process.exit(main(process.argv.slice(2)));
