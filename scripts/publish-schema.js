#!/usr/bin/env node
/**
 * Copies every published JSON Schema and vocabulary into a static-site folder at the path its
 * identifier names, so each file is served at its own address.
 *
 * Usage (from the repo root, with benefit-plan-docs checked out beside this repo):
 *   node scripts/publish-schema.js ../benefit-plan-docs/static
 *
 * Sources and the field that names each file's address:
 *   schema/**\/*.schema.json    $id
 *   modules/**\/*.schema.json   $id
 *   vocabularies/*.json         vocabulary_id
 * Target: <target-folder>/<path of the identifier>, for example
 *   https://benefitplanstandard.org/schema/v1.2.0/benefit-plan.schema.json
 *   -> <target-folder>/schema/v1.2.0/benefit-plan.schema.json
 *
 * A file without its identifier, or with an identifier outside the site origin, stops the run before
 * anything is written. Files are copied unchanged apart from line endings. Output is deterministic.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..');
const SOURCES = [
  { dir: 'schema', suffix: '.schema.json', key: '$id' },
  { dir: 'modules', suffix: '.schema.json', key: '$id' },
  { dir: 'vocabularies', suffix: '.json', key: 'vocabulary_id' },
];
const ORIGIN = 'https://benefitplanstandard.org/';

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function copyText(from, to) {
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, fs.readFileSync(from, 'utf8').replace(/\r\n/g, '\n'));
}

function files(dir, suffix) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) out.push(...files(p, suffix));
    else if (ent.name.endsWith(suffix)) out.push(p);
  }
  return out;
}

function sitePath(file, key) {
  const id = readJson(file)[key];
  const rel = path.relative(REPO_ROOT, file).replace(/\\/g, '/');
  if (typeof id !== 'string') throw new Error(rel + ': no ' + key);
  if (!id.startsWith(ORIGIN)) throw new Error(rel + ': ' + key + ' ' + id + ' does not start with ' + ORIGIN);
  const url = new URL(id);
  if (url.search || url.hash) throw new Error(rel + ': ' + key + ' ' + id + ' carries a query or fragment');
  const out = url.pathname.slice(1);
  if (!out || out.endsWith('/') || out.split('/').includes('..')) throw new Error(rel + ': ' + key + ' ' + id + ' does not name a file');
  return { rel, key, id, out };
}

function main(argv) {
  if (argv.length !== 1) {
    console.error('usage: node scripts/publish-schema.js <target-folder>   e.g. ../benefit-plan-docs/static');
    return 1;
  }
  const target = path.resolve(argv[0]);

  let plan;
  try {
    plan = SOURCES.flatMap((s) => files(path.join(REPO_ROOT, s.dir), s.suffix).sort().map((f) => ({ from: f, ...sitePath(f, s.key) })));
  } catch (err) {
    console.error('publish-schema: ' + err.message);
    return 1;
  }
  const seen = new Map();
  for (const p of plan) {
    if (seen.has(p.out)) {
      console.error('publish-schema: ' + p.rel + ' and ' + seen.get(p.out) + ' share the path ' + p.out);
      return 1;
    }
    seen.set(p.out, p.rel);
  }

  for (const p of plan) {
    copyText(p.from, path.join(target, p.out));
    console.log('wrote ' + p.out + '   (' + p.key + ' ' + p.id + ')');
  }
  console.log('wrote ' + plan.length + ' files');
  return 0;
}

if (require.main === module) process.exit(main(process.argv.slice(2)));
