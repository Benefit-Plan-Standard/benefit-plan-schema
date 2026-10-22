# PBP segment fixtures

Cuts of the CMS CY 2027 Plan Benefit Package (PBP) service area files, so that `scripts/pbp-segment.test.js` runs without the full download (the full files are not in the repository; `data/` is git-ignored).

## What is here

`2027/PlanArea.txt` and `2027/PlanRegionArea.txt` hold the original header line and the service area records of the 5 golden plans (`examples/*.pbp.json`), copied byte for byte. `2027/download.json` records the release label (`PBP Benefits-2027`) and the download date (2026-10-06).

`scripts/pbp-segment.js` reads these files, or a pledgee's `service-areas.json`, to give a Medicare Advantage plan's segment and plan key for a contract, a plan and a county (an SSA county code, or the county's name and state). The medical MVP technical specification, `docs/specs/rtb-medical-mvp/README.md`, describes the lookup under Identifying the plan.

## Line endings and encoding

CMS publishes these files as Windows-1252 text with CRLF record ends, and the reader requires them. `.gitattributes` marks `test/fixtures/pbp-segment/**/*.txt` as `-text`, so git stores and checks out the bytes unchanged; the same rule covers `test/fixtures/pbp/`. Do not open and re-save these files in an editor that changes line endings or encoding. A fixture committed with LF endings makes the test fail in a fresh clone; that happened once, on 2026-10-21, and the `.gitattributes` rule is the fix.
