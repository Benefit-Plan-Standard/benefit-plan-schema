# PBP test fixtures

Rows cut from the CMS CY 2027 Plan Benefit Package (PBP) Benefits files for 5 plans, so that `scripts/from-pbp.test.js` runs without the full download (the full files are not in the repository; `data/` is git-ignored).

## What is here

`2027/` holds the 18 files that `scripts/from-pbp.js` reads, under the CMS file names. Each has the original header line and the records of the 5 plans below, copied byte for byte (257 records, 135 KB). `2027/download.json` records the release label (`PBP Benefits-2027`), the download date (2026-10-06), the source URL, the 5 plans and the record count per file.

The 5 plans, which are also the importer's golden plans (`examples/*.pbp.json`):

| Plan id | Plan |
|---|---|
| `H2406-013-000` | AARP Medicare Advantage from UHC FL-0021 (PPO) |
| `H1036-068-000` | Humana Gold Plus H1036-068 (HMO) |
| `H1609-028-000` | Aetna Medicare Select Extra (HMO-POS) |
| `H5533-019-000` | UPMC for Life PPO Rx Choice (PPO) |
| `H5425-140-000` | SCAN Costco Medicare Advantage (HMO) |

## Regenerate

Needs the full files, unzipped, in `data/pbp/2027/` with a `download.json` that records the download date (the importer spec, section 11, gives the steps). From the repository root:

```
node scripts/from-pbp.js --write-fixtures
```

Use `--data <dir>` for full files kept somewhere else. The command overwrites the files in this folder. Regenerate only when the golden plans change or a new release is imported (importer spec, section 12), then regenerate the golden files with `--write-golden` and run `node --test scripts/from-pbp.test.js`.

## Why Windows-1252 with CRLF, and `.gitattributes`

CMS publishes the PBP files as Windows-1252 text with CRLF record ends. The importer reads them that way (`TextDecoder('windows-1252')`, records split at CRLF) and treats a bare CR or LF inside a record as an error. The fixtures keep the original bytes so the test exercises the same reader on the same format as the full files, and so a fixture row can be compared with the source file.

The repository default is `* text=auto eol=lf`, which would convert the line endings on checkout or commit and break the CRLF the reader requires. `.gitattributes` therefore marks `test/fixtures/pbp/**/*.txt` as `-text`, so git stores and checks out the bytes unchanged. Do not edit these files by hand or open and re-save them in an editor that changes line endings or encoding. The rows of the 5 plans currently hold only ASCII characters, so the encoding matters for the format rather than for these particular bytes; the line endings matter for every record.
