# Release checklist: the Benefit Plan Standard 1.2.1

**Written:** November 26, 2026. **Run by:** the maintainer, in order, in 1 PowerShell window, on any day after #10 (`61ad6ea`, the Summaries of Benefits cited without their addresses) is merged. Stop at the first step that does not print what it should.

1.2.1 is a patch of the tools and of 1 vocabulary: the Medicare Advantage importer's zero-dollar D-SNPs, in-network deductible scopes and point-of-service maximum (#9), and `vocabularies/categories.json` 1.3.0. The schema is v1.2.0's, unchanged. The release text says "unreleased" where the date goes; step 1 writes the day it is run, so the release can run on any day.

What is merged: the `release-1.2.1` branch of each repository.

| Repository | `release-1.2.1` | `main` before the release |
|---|---|---|
| `benefit-plan-schema` | the commit that adds this checklist, on top of `68c38ee` (the commit check's merge, after #9's merge `d4684b9`) | `68c38ee` with #10 merged |
| `benefit-plan-docs` | the commit that adds the 1.2.1 release notes, on top of `9cb0d4e` | `9cb0d4e` |

What the release branches change:

- **Schema:**
  - `docs/changelog.md`: 1.2.1's documentation entry and what is not in the release.
  - `README.md`: the current version.
  - `docs/roadmap.md`: 1.2.1 under Delivered, and the "Up to $X" item moves to a v1.2.2 list.
  - This checklist.
- **Site:**
  - `static/vocabularies/v1.3.0/categories.json`, byte for byte the schema repository's `vocabularies/categories.json`.
  - The 1.2.1 release notes and changelog entry.
  - The home page's latest release.
  - The validation page's category count.

## Before the tag: the maintainer's 4 items

Written November 25, 2026. The tag (step 3) waits for all 4; each is checked in step 0 or step 6.

1. **The site serves `vocabularies/v1.3.0/categories.json`.** On November 25, 2026 that address returned 404, and `vocabularies/v1.2.0/categories.json` returned 200. Step 0 checks that the site's release branch holds the file, byte for byte; step 6, check 5, that the site serves it after the deploy.
2. **#10 is merged:** Humana R0110-001 and HealthSpring H7849-002 cited by title, SHA-256 and page, with no address. Step 0, "schema main has #10".
3. **The roadmap's "Up to $X" item is on the v1.2.2 list,** not the v1.2.1 one. Step 0, "roadmap: the "Up to $X" item is on the v1.2.2 list only".
4. **The release notes say, in 1 line,** that the schema is unchanged, that the importer's output changes on 1,404 documents, and why the 2-adopter rule is met: in the site's release notes and in the changelog's 1.2.1 entry, which is the GitHub Release's body (step 4). Step 0, "the 1,404 documents and 2 adopters line".

## 0. Preflight (read-only)

Start in the folder that holds the 2 checkouts, `benefit-plan-schema` and `benefit-plan-docs`. The block sets their paths and the release date for the steps below, then prints PASS or FAIL for each check. Every line must say PASS. Step 0 checks the branches as they are before step 1; once step 1 has dated them, its first and fourth checks no longer hold, so run it again only from a fresh window and before step 1. The first line reads git's output as UTF-8, so the en dash of the changelog headings is read as written.

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$SchemaRepo = (Resolve-Path '.\benefit-plan-schema').Path
$DocsRepo = (Resolve-Path '.\benefit-plan-docs').Path
git -C $SchemaRepo fetch -q origin --tags
git -C $DocsRepo fetch -q origin
$et = [System.TimeZoneInfo]::ConvertTimeBySystemTimeZoneId([DateTime]::UtcNow, 'Eastern Standard Time')
$inv = [System.Globalization.CultureInfo]::InvariantCulture
$ReleaseIso = $et.ToString('yyyy-MM-dd', $inv)
$ReleaseLong = $et.ToString('MMMM d, yyyy', $inv)
$ReleaseMonth = $et.ToString('MMMM yyyy', $inv)
$Dated = @(
  @($SchemaRepo, 'docs/changelog.md', '## [1.2.1] – unreleased:', "## [1.2.1] – ${ReleaseIso}:"),
  @($SchemaRepo, 'README.md', 'Current version: **v1.2.1** (unreleased)', "Current version: **v1.2.1** (released on $ReleaseIso)"),
  @($SchemaRepo, 'docs/roadmap.md', '### v1.2.1 (unreleased)', "### v1.2.1 ($ReleaseIso)"),
  @($DocsRepo, 'docs/release-notes.md', '**Release Date:** unreleased', "**Release Date:** $ReleaseLong"),
  @($DocsRepo, 'docs/changelog.md', '## [1.2.1] – unreleased:', "## [1.2.1] – ${ReleaseIso}:"),
  @($DocsRepo, 'src/pages/index.js', 'v1.2.1</Link>&nbsp;(unreleased)', "v1.2.1</Link>&nbsp;($ReleaseMonth)"))
$schemaHead = git -C $SchemaRepo rev-parse origin/release-1.2.1
$checklistCommit = git -C $SchemaRepo log -1 --format=%H origin/release-1.2.1 -- docs/specs/release-1.2.1-checklist.md
$siteHead = git -C $DocsRepo rev-parse origin/release-1.2.1
$siteNotesCommit = git -C $DocsRepo log -1 --format=%H origin/release-1.2.1 -- docs/release-notes.md
git -C $SchemaRepo merge-base --is-ancestor 61ad6ea5ee5c8874190896d1ed786ad26d4ab3c8 origin/main
$tenMerged = ($LASTEXITCODE -eq 0)
git -C $SchemaRepo diff --quiet 2516632d3ff1335bd9880b901e3684d806b0d1dd origin/release-1.2.1 -- scripts fhir vocabularies schema modules
$importerSame = ($LASTEXITCODE -eq 0)
git -C $SchemaRepo diff --quiet 2516632d3ff1335bd9880b901e3684d806b0d1dd origin/main -- scripts fhir vocabularies schema modules
$importerSameMain = ($LASTEXITCODE -eq 0)
$checks = @(
  @('schema release-1.2.1 is the commit that adds this checklist', ($schemaHead -eq $checklistCommit)),
  @('schema release-1.2.1 sits on 68c38ee', (git -C $SchemaRepo rev-parse origin/release-1.2.1~1).StartsWith('68c38ee')),
  @('schema main has #10 (61ad6ea)', $tenMerged),
  @('site release-1.2.1 is the commit that adds the 1.2.1 release notes', ($siteHead -eq $siteNotesCommit)),
  @('site release-1.2.1 sits on 9cb0d4e', (git -C $DocsRepo rev-parse origin/release-1.2.1~1).StartsWith('9cb0d4e')),
  @('site main is 9cb0d4e', (git -C $DocsRepo rev-parse origin/main).StartsWith('9cb0d4e')),
  @('schema checkout has no uncommitted file', (@(git -C $SchemaRepo status --porcelain).Count -eq 0)),
  @('site checkout has no uncommitted file', (@(git -C $DocsRepo status --porcelain).Count -eq 0)),
  @('schema checkout commits as dorofino@benefitplanstandard.org', ((git -C $SchemaRepo config user.email) -eq 'dorofino@benefitplanstandard.org')),
  @('site checkout commits as dorofino@benefitplanstandard.org', ((git -C $DocsRepo config user.email) -eq 'dorofino@benefitplanstandard.org')),
  @('GitHub Latest is still v1.2.0', ((gh api repos/Benefit-Plan-Standard/benefit-plan-schema/releases/latest --jq .tag_name) -eq 'v1.2.0')),
  @('no v1.2.1 tag yet', (@(git -C $SchemaRepo ls-remote --tags origin v1.2.1).Count -eq 0)),
  @('the importer on release-1.2.1 is 2516632 (#9) unchanged', $importerSame),
  @('the importer on main is 2516632 (#9) unchanged', $importerSameMain),
  @('site v1.3.0 categories.json is the schema release branch file, byte for byte',
    ((git -C $DocsRepo rev-parse 'origin/release-1.2.1:static/vocabularies/v1.3.0/categories.json') -eq (git -C $SchemaRepo rev-parse 'origin/release-1.2.1:vocabularies/categories.json'))),
  @('site v1.2.0 categories.json is still the v1.2.0 tag file, byte for byte',
    ((git -C $DocsRepo rev-parse 'origin/release-1.2.1:static/vocabularies/v1.2.0/categories.json') -eq (git -C $SchemaRepo rev-parse 'v1.2.0:vocabularies/categories.json'))),
  @('roadmap: the "Up to $X" item is on the v1.2.2 list only',
    (& { $r = git -C $SchemaRepo show 'origin/release-1.2.1:docs/roadmap.md' | Out-String; $i = $r.IndexOf('### v1.2.2 list'); $j = $r.IndexOf('"Up to $X" with no floor'); ($i -ge 0) -and ($j -gt $i) -and (([regex]::Matches($r, [regex]::Escape('"Up to $X" with no floor'))).Count -eq 1) })),
  @('the 1,404 documents and 2 adopters line, in the site release notes and the changelog',
    (& { $l = 'changes on 1,404 of its 7,195 documents'; $a = 'adopters (`docs/governance.md`, Releases) are met'; ((git -C $DocsRepo show 'origin/release-1.2.1:docs/release-notes.md' | Out-String).Contains($l)) -and ((git -C $SchemaRepo show 'origin/release-1.2.1:docs/changelog.md' | Out-String).Contains($l)) -and ((git -C $SchemaRepo show 'origin/release-1.2.1:docs/changelog.md' | Out-String).Contains($a)) })))
foreach ($d in $Dated) {
  $repo = $d[0]; $text = git -C $repo show ('origin/release-1.2.1:' + $d[1]) | Out-String
  $n = ([regex]::Matches($text, [regex]::Escape($d[2]))).Count
  $checks += , @(('{0} says "{1}" once' -f $d[1], $d[2]), ($n -eq 1))
}
foreach ($c in $checks) { Write-Output ('{0}  {1}' -f $(if ($c[1]) { 'PASS' } else { 'FAIL' }), $c[0]) }
Write-Output ('release date: ' + $ReleaseIso + ' (' + $ReleaseLong + ')')
```

The date printed is the date the release text gets. If the run will not finish today, stop here and start again on the day it will.

## 1. Date the release branches

Each file has its "unreleased" text once (step 0); this replaces it with the date, commits it on the release branch and pushes the branch. `git diff` shows the lines before the commit: 3 in the schema repository and 3 on the site.

```powershell
function Set-ReleaseDate([string]$Repo, [string]$File, [string]$Old, [string]$New) {
  $path = Join-Path $Repo $File
  $text = [System.IO.File]::ReadAllText($path)
  $n = ([regex]::Matches($text, [regex]::Escape($Old))).Count
  if ($n -ne 1) { throw "$File holds '$Old' $n times, not once" }
  [System.IO.File]::WriteAllText($path, $text.Replace($Old, $New), (New-Object System.Text.UTF8Encoding $false))
}
foreach ($repo in @($SchemaRepo, $DocsRepo)) {
  Set-Location $repo
  Remove-Item .git\index.lock -ErrorAction SilentlyContinue
  git switch -C release-1.2.1 origin/release-1.2.1
  foreach ($d in $Dated) { if ($d[0] -eq $repo) { Set-ReleaseDate $repo $d[1] $d[2] $d[3] } }
  git diff --unified=0 | Select-String '^[-+][^-+]'
  git commit -a -m "The Benefit Plan Standard 1.2.1 release date, $ReleaseIso"
  git push origin release-1.2.1
}
```

## 2. Merge `release-1.2.1` into `main` in the schema repository, by pull request

`main` takes changes only by pull request, with the check `commits` passing: each commit's author and committer address is dorofino@benefitplanstandard.org (step 0 checks both checkouts), and no message has a co-author line. Force pushes to `main` are refused. `main` holds #10's merge, which the release branch does not, so the merge is a merge commit; the 2 change different files. `gh pr checks --watch` waits for the check and stops if it fails; the last line prints the merge.

```powershell
Set-Location $SchemaRepo
$pr = gh pr create -R Benefit-Plan-Standard/benefit-plan-schema --base main --head release-1.2.1 --title "The Benefit Plan Standard 1.2.1, $ReleaseIso" --body "The 1.2.1 release branch, merged by step 2 of docs/specs/release-1.2.1-checklist.md."
$pr
Start-Sleep -Seconds 15
gh pr checks $pr -R Benefit-Plan-Standard/benefit-plan-schema --watch --fail-fast
gh pr merge $pr -R Benefit-Plan-Standard/benefit-plan-schema --merge --subject "Merge release-1.2.1: the Benefit Plan Standard 1.2.1, $ReleaseIso"
git fetch origin
git switch main
git merge --ff-only origin/main
git log --oneline -1
```

## 3. The `v1.2.1` tag

A lightweight tag on the merge, as `v1.2.0` is.

```powershell
Set-Location $SchemaRepo
git tag v1.2.1 main
git rev-parse --short v1.2.1
git push origin v1.2.1
```

## 4. The GitHub Release for `v1.2.1`, marked Latest

The body is the 1.2.1 entry of `docs/changelog.md` at the tag, from the line after its heading to the line before the 1.2.0 release entry. `--verify-tag` stops if the tag is not on GitHub; `--latest` takes Latest from `v1.2.0`. `Get-Content` shows the first line of the body, which starts "A patch to the tools, not the schema".

```powershell
Set-Location $SchemaRepo
$lines = Get-Content docs\changelog.md -Encoding UTF8
$start = ($lines | Select-String -Pattern ('^## \[1\.2\.1\] . ' + [regex]::Escape($ReleaseIso) + ': ') | Select-Object -First 1).LineNumber
$end = ($lines | Select-String -Pattern '^## \[1\.2\.0\] . 2026-11-13: release$' | Select-Object -First 1).LineNumber
$body = ($lines[$start..($end - 2)] -join "`n").Trim()
$notes = Join-Path $env:TEMP 'bps-1.2.1-release-notes.md'
[System.IO.File]::WriteAllText($notes, $body + "`n", (New-Object System.Text.UTF8Encoding $false))
Get-Content $notes -TotalCount 1
gh release create v1.2.1 -R Benefit-Plan-Standard/benefit-plan-schema --verify-tag --latest --title "v1.2.1: the Medicare Advantage importer's zero-dollar D-SNPs, deductible scopes and point-of-service maximum" --notes-file $notes
```

## 5. Merge `release-1.2.1` into `main` in the docs repository, which deploys the site

Fast-forward only: the site's `main` is `9cb0d4e`, the release branch's base. The site's workflow, `.github/workflows/deploy.yml`, builds and deploys on every push to `main`. `gh run watch` waits for the deploy and fails if it fails.

```powershell
Set-Location $DocsRepo
git fetch origin
git switch main
git merge --ff-only origin/main
git merge --ff-only origin/release-1.2.1
git push origin main
git log --oneline -1
Start-Sleep -Seconds 15
$run = gh run list -R Benefit-Plan-Standard/benefit-plan-docs --workflow deploy.yml --branch main --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch $run -R Benefit-Plan-Standard/benefit-plan-docs --exit-status
```

## 6. The checks that prove it is done

Each line prints PASS or FAIL.

- GitHub Pages can serve the previous pages for up to about 10 minutes after the deploy, so a FAIL on checks 5 to 9 is run again before it counts.
- Checks 5 to 7 download the served files and compare their git blob ids with the tagged files, byte for byte.
- Check 3 is for an adopter that built documents with #9's importer: those documents are the documents of `v1.2.1`. The importer reads only `scripts`, `fhir`, `vocabularies`, `schema` and `modules`, and its output is deterministic (`docs/specs/pbp-importer.md` section 10).

```powershell
Set-Location $SchemaRepo
git fetch -q origin --tags
$latest = gh api repos/Benefit-Plan-Standard/benefit-plan-schema/releases/latest --jq .tag_name
git diff --quiet 2516632d3ff1335bd9880b901e3684d806b0d1dd v1.2.1 -- scripts fhir vocabularies schema modules
$importerOk = ($LASTEXITCODE -eq 0)
$readme = [bool](gh api 'repos/Benefit-Plan-Standard/benefit-plan-schema/contents/README.md?ref=main' -H 'Accept: application/vnd.github.raw' | Select-String -SimpleMatch "Current version: **v1.2.1** (released on $ReleaseIso)")
function Test-Served([string]$Url, [string]$Spec) {
  $tmp = Join-Path $env:TEMP ('bps-served-' + [System.IO.Path]::GetFileName($Url))
  Invoke-WebRequest -Uri $Url -OutFile $tmp -UseBasicParsing
  (git -C $SchemaRepo hash-object --no-filters $tmp) -eq (git -C $SchemaRepo rev-parse $Spec)
}
$vocab13 = Test-Served 'https://benefitplanstandard.org/vocabularies/v1.3.0/categories.json' 'v1.2.1:vocabularies/categories.json'
$vocab12 = Test-Served 'https://benefitplanstandard.org/vocabularies/v1.2.0/categories.json' 'v1.2.0:vocabularies/categories.json'
$schema = Test-Served 'https://benefitplanstandard.org/schema/v1.2.0/benefit-plan.schema.json' 'v1.2.1:schema/v1.2.0/benefit-plan.schema.json'
$homeHtml = (Invoke-WebRequest -Uri 'https://benefitplanstandard.org/' -UseBasicParsing).Content
$homeOk = $homeHtml -match 'Latest release:\s*<a href="/docs/release-notes">v1\.2\.1</a>'
$notesHtml = (Invoke-WebRequest -Uri 'https://benefitplanstandard.org/docs/release-notes' -UseBasicParsing).Content
$notesOk = ($notesHtml -match 'v1\.2\.1: the Medicare Advantage importer') -and $notesHtml.Contains($ReleaseLong)
foreach ($c in @(
  @('1 Releases: v1.2.1 is Latest', ($latest -eq 'v1.2.1')),
  @('2 The v1.2.1 tag is main', ((git rev-parse 'v1.2.1^{commit}') -eq (git rev-parse origin/main))),
  @('3 The importer at v1.2.1 is #9''s (2516632), unchanged', $importerOk),
  @('4 README on main: current version v1.2.1, released on the release date', $readme),
  @('5 The site serves categories 1.3.0 at its address, byte for byte', $vocab13),
  @('6 The site still serves categories 1.2.0 at its address, byte for byte', $vocab12),
  @('7 The site still serves the v1.2.0 schema, byte for byte', $schema),
  @('8 Home page: latest release v1.2.1', $homeOk),
  @('9 Release notes: the v1.2.1 section with its date', $notesOk))) {
  Write-Output ('{0}  {1}' -f $(if ($c[1]) { 'PASS' } else { 'FAIL' }), $c[0])
}
```

## What still says v1.2.0 after these steps, by design

The schema version: the README badge (`Schema-v1.2.0`), `schema/v1.2.0/`, `"schema_version": "1.2.0"` in every document the importers write, and the site's pages that name the schema file. 1.2.1 changes no schema, so these stay. The vocabularies other than categories keep their own versions (canonical benefits 1.4.0, markets 1.2.0, benefit types and plan types 1.1.0).

## After the release

Optional, later: delete the 2 `release-1.2.1` branches.
