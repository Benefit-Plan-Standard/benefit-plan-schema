# Release checklist: the Benefit Plan Standard 1.2.0

**Written:** November 11, 2026, for the release on November 13, 2026. **Run by:** the maintainer, in order, in 1 PowerShell window. Stop at the first step that does not print what it should.

The release text gives the date 2026-11-13 in the schema's root description, `README.md`, `docs/changelog.md`, `docs/roadmap.md` and the site's pages. Run this on that day; on another day, stop, because that date would be wrong.

What is merged: the `release-1.2.0` branch of each repository.

| Repository | `release-1.2.0` | `main` before the release |
|---|---|---|
| `benefit-plan-schema` | the commit that adds this checklist, on top of `22b33d7` | `18eea39`, tagged `v1.2.0-draft.9` |
| `benefit-plan-docs` | the commit that corrects the v1.0.0 release date, on top of `bbae613` | `ad25158` |

A file cannot name the commit that adds it, and the site's commit is made with it, so step 0 checks each branch by what its last commit changed: the schema branch is the commit that last changed this file, with `22b33d7` as its parent, and the site branch is the commit that last changed `docs/release-notes.md`, with `bbae613` as its parent.

## 0. Preflight (read-only)

Start in the folder that holds the 2 checkouts, `benefit-plan-schema` and `benefit-plan-docs`. The block sets their paths for the steps below, then prints PASS or FAIL for each check. Every line must say PASS.

```powershell
$SchemaRepo = (Resolve-Path '.\benefit-plan-schema').Path
$DocsRepo = (Resolve-Path '.\benefit-plan-docs').Path
git -C $SchemaRepo fetch -q origin
git -C $DocsRepo fetch -q origin
$schemaHead = git -C $SchemaRepo rev-parse origin/release-1.2.0
$checklistCommit = git -C $SchemaRepo log -1 --format=%H origin/release-1.2.0 -- docs/specs/partd-formulary/release-1.2.0-checklist.md
$siteHead = git -C $DocsRepo rev-parse origin/release-1.2.0
$siteDateCommit = git -C $DocsRepo log -1 --format=%H origin/release-1.2.0 -- docs/release-notes.md
$served = @(
  @('schema/v1.2.0/benefit-plan.schema.json', 'static/schema/v1.2.0/benefit-plan.schema.json'),
  @('schema/v1.2.0/formulary.schema.json', 'static/schema/v1.2.0/formulary.schema.json'),
  @('modules/pharmacy/v0.2.3/pharmacy.schema.json', 'static/modules/pharmacy/v0.2.3/pharmacy.schema.json'),
  @('vocabularies/categories.json', 'static/vocabularies/v1.2.0/categories.json'))
$checks = @(
  @('schema release-1.2.0 is the commit that adds this checklist', ($schemaHead -eq $checklistCommit)),
  @('schema release-1.2.0 sits on 22b33d7', (git -C $SchemaRepo rev-parse origin/release-1.2.0~1).StartsWith('22b33d7')),
  @('schema main is 18eea39', (git -C $SchemaRepo rev-parse origin/main).StartsWith('18eea39')),
  @('site release-1.2.0 is the commit that corrects the v1.0.0 date', ($siteHead -eq $siteDateCommit)),
  @('site release-1.2.0 sits on bbae613', (git -C $DocsRepo rev-parse origin/release-1.2.0~1).StartsWith('bbae613')),
  @('site main is ad25158', (git -C $DocsRepo rev-parse origin/main).StartsWith('ad25158')),
  @('schema checkout has no uncommitted file', (@(git -C $SchemaRepo status --porcelain).Count -eq 0)),
  @('site checkout has no uncommitted file', (@(git -C $DocsRepo status --porcelain).Count -eq 0)),
  @('GitHub Latest is still v1.1.0', ((gh api repos/Benefit-Plan-Standard/benefit-plan-schema/releases/latest --jq .tag_name) -eq 'v1.1.0')))
foreach ($f in $served) {
  $a = git -C $SchemaRepo rev-parse ('origin/release-1.2.0:' + $f[0])
  $b = git -C $DocsRepo rev-parse ('origin/release-1.2.0:' + $f[1])
  $checks += , @(('site serves ' + $f[0] + ' byte for byte'), ($a -eq $b))
}
foreach ($c in $checks) { Write-Output ('{0}  {1}' -f $(if ($c[1]) { 'PASS' } else { 'FAIL' }), $c[0]) }
Write-Output ('schema release head: ' + $schemaHead.Substring(0, 7))
Write-Output ('site release head: ' + $siteHead.Substring(0, 7))
```

Note the 2 printed heads: steps 1 and 2 print the schema head again, and step 4 the site head.

## 1. Merge `release-1.2.0` into `main` in the schema repository

Fast-forward only: if `main` has moved, the merge fails and nothing changes. The last line prints the schema release head from step 0.

```powershell
Set-Location $SchemaRepo
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
git fetch origin
git switch main
git merge --ff-only origin/main
git merge --ff-only origin/release-1.2.0
git push origin main
git log --oneline -1
```

## 2. The `v1.2.0` tag

A lightweight tag, as `v1.1.0` and the 9 draft tags are. `rev-parse` prints the schema release head from step 0.

```powershell
Set-Location $SchemaRepo
git tag v1.2.0 main
git rev-parse --short v1.2.0
git push origin v1.2.0
```

## 3. The GitHub Release for `v1.2.0`, marked Latest

The body is the release entry of `docs/changelog.md` at the tag, from the line after its heading to the line before the first draft entry. One sentence, which points to "the entries below" in the changelog, becomes a link to the changelog. `--verify-tag` stops if the tag is not on GitHub; `--latest` takes Latest from `v1.1.0`; the release is published, not saved as a draft. `Get-Content` shows the first lines of the body, which start "The Benefit Plan Standard 1.2.0 is final."

```powershell
Set-Location $SchemaRepo
$lines = Get-Content docs\changelog.md -Encoding UTF8
$start = ($lines | Select-String -Pattern '^## \[1\.2\.0\] . 2026-11-13: release$' | Select-Object -First 1).LineNumber
$end = ($lines | Select-String -Pattern '^## \[1\.2\.0\] . DRAFT' | Select-Object -First 1).LineNumber
$body = ($lines[$start..($end - 2)] -join "`n").Trim()
$body = $body -replace 'The entries below this one record each draft as it was published\.', 'Each draft is recorded in the [changelog](https://github.com/Benefit-Plan-Standard/benefit-plan-schema/blob/v1.2.0/docs/changelog.md).'
$notes = Join-Path $env:TEMP 'bps-1.2.0-release-notes.md'
[System.IO.File]::WriteAllText($notes, $body + "`n", (New-Object System.Text.UTF8Encoding $false))
Get-Content $notes -TotalCount 3
gh release create v1.2.0 -R Benefit-Plan-Standard/benefit-plan-schema --verify-tag --latest --title "v1.2.0: CARIN Alignment, Medicare Advantage and Medicare Part D" --notes-file $notes
```

## 4. Merge `release-1.2.0` into `main` in the docs repository, which deploys the site

The site's workflow, `.github/workflows/deploy.yml`, builds and deploys on every push to `main`; its crosswalk step regenerates `docs/specification/crosswalk.mdx`, and the generated page is the committed one. The log line prints the site release head from step 0; `gh run watch` waits for the deploy and fails if it fails.

```powershell
Set-Location $DocsRepo
Remove-Item .git\index.lock -ErrorAction SilentlyContinue
git fetch origin
git switch main
git merge --ff-only origin/main
git merge --ff-only origin/release-1.2.0
git push origin main
git log --oneline -1
Start-Sleep -Seconds 15
$run = gh run list -R Benefit-Plan-Standard/benefit-plan-docs --workflow deploy.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch $run -R Benefit-Plan-Standard/benefit-plan-docs --exit-status
```

## 5. The checks that prove it is done

Each line prints PASS or FAIL. GitHub Pages can serve the previous pages for up to about 10 minutes after the deploy, so a FAIL on 3 to 6 is run again before it counts. Checks 4 and 6 download the served schema files and compare their git blob ids with the tagged files, byte for byte.

```powershell
$latest = gh api repos/Benefit-Plan-Standard/benefit-plan-schema/releases/latest --jq .tag_name
$badge = [bool](gh api 'repos/Benefit-Plan-Standard/benefit-plan-schema/contents/README.md?ref=main' -H 'Accept: application/vnd.github.raw' | Select-String -SimpleMatch 'badge/Schema-v1.2.0-green')
$homeHtml = (Invoke-WebRequest -Uri 'https://benefitplanstandard.org/' -UseBasicParsing).Content
$homeOk = $homeHtml -match 'Latest release:\s*<a href="/docs/release-notes">v1\.2\.0</a>'
$tmpCore = Join-Path $env:TEMP 'bps-served-benefit-plan.schema.json'
$tmpList = Join-Path $env:TEMP 'bps-served-formulary.schema.json'
Invoke-WebRequest -Uri 'https://benefitplanstandard.org/schema/v1.2.0/benefit-plan.schema.json' -OutFile $tmpCore -UseBasicParsing
Invoke-WebRequest -Uri 'https://benefitplanstandard.org/schema/v1.2.0/formulary.schema.json' -OutFile $tmpList -UseBasicParsing
$coreOk = (git -C $SchemaRepo hash-object --no-filters $tmpCore) -eq (git -C $SchemaRepo rev-parse 'v1.2.0:schema/v1.2.0/benefit-plan.schema.json')
$listOk = (git -C $SchemaRepo hash-object --no-filters $tmpList) -eq (git -C $SchemaRepo rev-parse 'v1.2.0:schema/v1.2.0/formulary.schema.json')
$page = Invoke-WebRequest -Uri 'https://benefitplanstandard.org/docs/specification/medicare-part-d-formulary' -UseBasicParsing
$pageOk = ($page.StatusCode -eq 200) -and ($page.Content -match 'CMS Medicare Part D formulary files to the Benefit Plan Standard')
foreach ($c in @(
  @('1 Releases: v1.2.0 is Latest', ($latest -eq 'v1.2.0')),
  @('2 README badge reads v1.2.0 on main', $badge),
  @('3 Home page: latest release v1.2.0', $homeOk),
  @('4 The site serves the tagged 1.2.0 schema, byte for byte', $coreOk),
  @('5 The Part D formulary importer page loads', $pageOk),
  @('6 The site serves the tagged formulary list schema, byte for byte', $listOk))) {
  Write-Output ('{0}  {1}' -f $(if ($c[1]) { 'PASS' } else { 'FAIL' }), $c[0])
}
```

Check 1 can also be seen in the repository's Releases box.

## What still says "draft" after these steps

Reviewed on November 11, 2026.

**Known gaps, listed in the 1.2.0 release notes, for after the release:**

- The medical MVP technical specification: `docs/specs/rtb-medical-mvp/README.md` line 56 ("Benefit Plan Standard schema 1.2.0 is a draft under the Benefit Plan Standard release rule") and the site page that follows it, `docs/specification/medical-mvp.md` line 18. The specification changes only in a new version of its own.
- The site's `docs/specification/field-definitions.md` lists the v1.1.0 fields only.
- The site's generated crosswalk table says "tier_class drafted for v1.2" (`docs/specification/crosswalk.mdx` line 174, from `medical-crosswalk-data.json`).

**Left as they are:**

- `docs/fhir-alignment.md` lines 3 and 450: the guide's own status, "Draft (BPS v1.1.0, with the CARIN SBC InsurancePlan mapping)".
- The pharmacy module's own status, "Draft", in `modules/README.md`, the module READMEs, the served module schemas, the site's crosswalk and `README.md`: the module has its own 0.x version, and its shapes are in core 1.2.0.
- `"status": "draft"` on the 9 `bps-*` StructureDefinitions and the canonical benefits CodeSystem under `/fhir/` (set by `scripts/build-fhir-definitions.js`), and the site's FHIR page saying so: they extend a CARIN profile that is still ballot-stage.
- The status lines of `docs/specs/pbp-importer.md` and `docs/specs/marketplace-puf-importer.md`, which are the specifications' own.

**About something else:** the CARIN SBC InsurancePlan profile, "draft and experimental" in its ballot package; the workgroup's "GA draft"; the medical MVP specification's own status, "a draft for the workgroup".

**History, by design:** the dated draft entries of both changelogs, below the release entry; "since draft N" in the schema's field descriptions; `ADOPTERS.md` ("at draft 5", "at draft 6"); the lists of draft tags in the release notes and the roadmaps; and the GitHub Releases list, where drafts 1, 4, 5, 6, 7 and 8 stay as pre-releases and drafts 2, 3 and 9 are tags with no release.

## After the release

Optional, later: delete the 2 `release-1.2.0` branches.
