#!/usr/bin/env node
// Stop 0 profile of the CMS monthly Part D formulary public use file, release
// 2027_20261008, against the CY 2027 PBP tiers. Evidence for ../stop-0.md; not the importer.
// usage: node docs/specs/partd-formulary/profile/profile-puf.js \
//   data/partd-formulary/2027_20261008/txt data/pbp/2027 > docs/specs/partd-formulary/profile/profile.json
'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const [, , TXT, PBP] = process.argv;
const F = {
  plan: 'plan information  20261031.txt',
  basic: 'basic drugs formulary file  20261031.txt',
  excl: 'excluded drugs formulary file  20261031.txt',
  cost: 'beneficiary cost file  20261031.txt',
  insulin: 'insulin beneficiary cost file  20261031.txt',
  ibc: 'Indication Based Coverage Formulary File  20261031.txt',
  geo: 'geographic locator file 20261031.txt',
};

async function each(file, sep, fn) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'latin1' }), crlfDelay: Infinity });
  let header = null; let n = 0; let crlf = 0; const widths = {};
  for await (const raw of rl) {
    const line = raw;
    if (header === null) { header = line.split(sep); continue; }
    if (line === '') continue;
    const cells = line.split(sep);
    if (cells.length !== header.length) { widths[cells.length] = (widths[cells.length] || 0) + 1; }
    const r = {}; header.forEach((h, i) => { r[h] = cells[i]; });
    n++; fn(r, n);
  }
  return { header, rows: n, badWidths: widths };
}
const inc = (o, k, by = 1) => { o[k] = (o[k] || 0) + by; };
const stats = (arr) => { if (!arr.length) return null; const s = [...arr].sort((a, b) => a - b); return { n: s.length, min: s[0], median: s[Math.floor(s.length / 2)], max: s[s.length - 1], sum: s.reduce((a, b) => a + b, 0) }; };
const top = (o, k = 25) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, k));

(async () => {
  const out = {};
  // ---------- Plan Information
  const plans = new Map(); // key C-P-S -> {fid set, prem set, ded set, snp, sup, name}
  const pi = { contractType: {}, suppressedRows: {}, snp: {}, blankFid: 0 };
  const piMeta = await each(path.join(TXT, F.plan), '|', (r) => {
    const k = `${r.CONTRACT_ID}-${r.PLAN_ID}-${r.SEGMENT_ID}`;
    let p = plans.get(k);
    if (!p) { p = { fid: new Set(), prem: new Set(), ded: new Set(), snp: new Set(), sup: new Set(), name: new Set(), cname: new Set(), rows: 0, state: new Set(), pdpRegion: new Set(), maRegion: new Set() }; plans.set(k, p); }
    p.rows++; p.fid.add(r.FORMULARY_ID); p.prem.add(r.PREMIUM); p.ded.add(r.DEDUCTIBLE); p.snp.add(r.SNP); p.sup.add(r.PLAN_SUPPRESSED_YN); p.name.add(r.PLAN_NAME); p.cname.add(r.CONTRACT_NAME);
    p.state.add(r.STATE); p.pdpRegion.add(r.PDP_REGION_CODE); p.maRegion.add(r.MA_REGION_CODE);
    inc(pi.suppressedRows, r.PLAN_SUPPRESSED_YN);
    if (!r.FORMULARY_ID || !r.FORMULARY_ID.trim()) pi.blankFid++;
  });
  const fidPlans = new Map(); const supPlans = []; const multi = { fid: 0, prem: 0, ded: 0, snp: 0, sup: 0, name: 0 };
  const byType = {}; const snpPlans = {}; const premFormat = {}; const dedVals = {};
  for (const [k, p] of plans) {
    inc(byType, k[0]);
    for (const f of ['fid', 'prem', 'ded', 'snp', 'sup', 'name']) if (p[f].size > 1) multi[f]++;
    const sup = [...p.sup].join();
    if (sup.includes('Y')) { supPlans.push(k); continue; }
    inc(snpPlans, [...p.snp].join());
    for (const v of p.prem) inc(premFormat, /^\d+\.\d\d$/.test(v) ? 'n.nn' : `other:${v}`);
    for (const v of p.ded) inc(dedVals, v);
    for (const f of p.fid) { if (!fidPlans.has(f)) fidPlans.set(f, []); fidPlans.get(f).push(k); }
  }
  // segments of one contract-plan with different formulary ids
  const cp = new Map();
  for (const [k, p] of plans) { const c = k.slice(0, 9); if (!cp.has(c)) cp.set(c, new Set()); for (const f of p.fid) cp.get(c).add(f); }
  let cpMultiSeg = 0; let cpMultiFid = 0; const segCount = new Map();
  for (const k of plans.keys()) { const c = k.slice(0, 9); segCount.set(c, (segCount.get(c) || 0) + 1); }
  for (const [c, s] of cp) { if (segCount.get(c) > 1) { cpMultiSeg++; if (s.size > 1) cpMultiFid++; } }
  out.planInformation = {
    header: piMeta.header, rows: piMeta.rows, badWidths: piMeta.badWidths,
    distinctPlans: plans.size, plansByContractType: byType, suppressedRows: pi.suppressedRows,
    suppressedPlans: supPlans.length, suppressedPlanSample: supPlans.slice(0, 10), blankFormularyIdRows: pi.blankFid,
    plansWithMoreThanOneValueAcrossRows: multi, snpOfUnsuppressedPlans: snpPlans, premiumFormat: premFormat, deductibleValuesTop: top(dedVals, 15),
    distinctFormularyIdsUnsuppressed: fidPlans.size,
    plansPerFormulary: stats([...fidPlans.values()].map((a) => a.length)),
    formulariesUsedByOnePlan: [...fidPlans.values()].filter((a) => a.length === 1).length,
    contractPlansWithSeveralSegments: cpMultiSeg, ofThoseWithDifferentFormularyIds: cpMultiFid,
  };

  // ---------- Basic Drugs Formulary
  const bf = new Map(); // fid -> {versions set, years set, rows, rx map rxcui -> [sig], ndcs set, maxTier, tiers set, pa, st, ql, sel}
  const b = { tier: {}, qlYN: {}, paYN: {}, stYN: {}, selYN: {}, year: {}, qlAmtShape: {}, qlDays: {}, qlAmtWhenN: {}, rxLen: {}, ndcLen: {}, versionsTop: {} };
  const rxAll = new Set(); const ndcAll = new Set(); const ndcToRx = new Map(); let ndcMultiRx = 0;
  const basicMeta = await each(path.join(TXT, F.basic), '|', (r) => {
    let f = bf.get(r.FORMULARY_ID);
    if (!f) { f = { versions: new Set(), years: new Set(), rows: 0, rx: new Map(), ndc: new Set(), tiers: new Set(), pa: 0, st: 0, ql: 0, sel: 0, dupNdc: 0 }; bf.set(r.FORMULARY_ID, f); }
    f.rows++; f.versions.add(r.FORMULARY_VERSION); f.years.add(r.CONTRACT_YEAR);
    inc(b.tier, r.TIER_LEVEL_VALUE); inc(b.qlYN, r.QUANTITY_LIMIT_YN); inc(b.paYN, r.PRIOR_AUTHORIZATION_YN); inc(b.stYN, r.STEP_THERAPY_YN); inc(b.selYN, r.SELECTED_DRUG_YN); inc(b.year, r.CONTRACT_YEAR);
    inc(b.rxLen, (r.RXCUI || '').trim().length); inc(b.ndcLen, (r.NDC || '').trim().length);
    const a = (r.QUANTITY_LIMIT_AMOUNT || '').trim(); const d = (r.QUANTITY_LIMIT_DAYS || '').trim();
    if (r.QUANTITY_LIMIT_YN === 'Y') { inc(b.qlAmtShape, a === '' ? 'blank' : /^\d+$/.test(a) ? 'integer' : /^\d*\.\d+$/.test(a) ? 'decimal' : `other:${a}`); inc(b.qlDays, d === '' ? 'blank' : d); }
    else inc(b.qlAmtWhenN, `${a === '' ? 'blank' : 'filled'}/${d === '' ? 'blank' : 'filled'}`);
    f.tiers.add(r.TIER_LEVEL_VALUE);
    if (r.PRIOR_AUTHORIZATION_YN === 'Y') f.pa++; if (r.STEP_THERAPY_YN === 'Y') f.st++; if (r.QUANTITY_LIMIT_YN === 'Y') f.ql++; if (r.SELECTED_DRUG_YN === 'Y') f.sel++;
    const sig = [r.TIER_LEVEL_VALUE, r.QUANTITY_LIMIT_YN, a, d, r.PRIOR_AUTHORIZATION_YN, r.STEP_THERAPY_YN, r.SELECTED_DRUG_YN].join('|');
    if (!f.rx.has(r.RXCUI)) f.rx.set(r.RXCUI, []);
    f.rx.get(r.RXCUI).push({ ndc: r.NDC, sig });
    if (f.ndc.has(r.NDC)) f.dupNdc++; f.ndc.add(r.NDC);
    rxAll.add(r.RXCUI); ndcAll.add(r.NDC);
    const prev = ndcToRx.get(r.NDC); if (prev === undefined) ndcToRx.set(r.NDC, r.RXCUI); else if (prev !== r.RXCUI) ndcMultiRx++;
  });
  let rxMultiRow = 0; let rxMultiRowDiffer = 0; let rxPairs = 0; const differExamples = []; const differWhat = {};
  for (const [fid, f] of bf) {
    for (const [rx, list] of f.rx) {
      rxPairs++;
      if (list.length > 1) {
        rxMultiRow++;
        const sigs = new Set(list.map((x) => x.sig));
        if (sigs.size > 1) {
          rxMultiRowDiffer++;
          const parts = [...sigs].map((s) => s.split('|'));
          const names = ['tier', 'ql_yn', 'ql_amt', 'ql_days', 'pa', 'st', 'sel'];
          names.forEach((nm, i) => { if (new Set(parts.map((p) => p[i])).size > 1) inc(differWhat, nm); });
          if (differExamples.length < 8) differExamples.push({ fid, rx, rows: list });
        }
      }
    }
  }
  const unsupFids = new Set(fidPlans.keys());
  out.basicDrugsFormulary = {
    header: basicMeta.header, rows: basicMeta.rows, badWidths: basicMeta.badWidths,
    distinctFormularyIds: bf.size, contractYear: b.year,
    formulariesWithMoreThanOneVersion: [...bf.values()].filter((f) => f.versions.size > 1).length,
    versionValuesTop: top([...bf.values()].reduce((o, f) => { for (const v of f.versions) inc(o, v); return o; }, {}), 12),
    rowsPerFormulary: stats([...bf.values()].map((f) => f.rows)),
    rxcuisPerFormulary: stats([...bf.values()].map((f) => f.rx.size)),
    distinctRxcui: rxAll.size, distinctNdc: ndcAll.size, ndcRowsMappingToADifferentRxcuiThanFirstSeen: ndcMultiRx,
    formularyRxcuiPairs: rxPairs, pairsWithMoreThanOneRow: rxMultiRow, pairsWhoseRowsDisagree: rxMultiRowDiffer, disagreeingFields: differWhat, disagreeExamples: differExamples,
    duplicateNdcWithinFormulary: [...bf.values()].reduce((a, f) => a + f.dupNdc, 0),
    tierLevelValue: b.tier, quantityLimitYN: b.qlYN, priorAuthorizationYN: b.paYN, stepTherapyYN: b.stYN, selectedDrugYN: b.selYN,
    qlAmountShapeWhenY: b.qlAmtShape, qlDaysWhenY: top(b.qlDays, 20), qlAmountDaysWhenNotY: b.qlAmtWhenN, rxcuiLength: b.rxLen, ndcLength: b.ndcLen,
    formulariesInBasicNotInPlanInfoUnsuppressed: [...bf.keys()].filter((f) => !unsupFids.has(f)),
    formulariesInPlanInfoNotInBasic: [...unsupFids].filter((f) => !bf.has(f)),
    perFormularyCounts: [...bf.entries()].map(([fid, f]) => ({ fid, version: [...f.versions].join(), plans: (fidPlans.get(fid) || []).length, rows: f.rows, rxcuis: f.rx.size, pa: f.pa, st: f.st, ql: f.ql, selected: f.sel, tiers: [...f.tiers].sort().join(',') })),
  };

  // ---------- Excluded Drugs
  const ex = new Map(); const e = { tier: {}, qlYN: {}, paYN: {}, stYN: {}, capYN: {}, qlAmt: {} }; let exDup = 0;
  const exMeta = await each(path.join(TXT, F.excl), '|', (r) => {
    const k = `${r.CONTRACT_ID}-${r.PLAN_ID}`; if (!ex.has(k)) ex.set(k, new Set());
    if (ex.get(k).has(r.RXCUI)) exDup++; ex.get(k).add(r.RXCUI);
    inc(e.tier, r.TIER); inc(e.qlYN, r.QUANTITY_LIMIT_YN); inc(e.paYN, r.PRIOR_AUTH_YN); inc(e.stYN, r.STEP_THERAPY_YN); inc(e.capYN, r.CAPPED_BENEFIT_YN);
    inc(e.qlAmt, `${(r.QUANTITY_LIMIT_AMOUNT || '').trim() === '' ? 'blank' : 'filled'}/${(r.QUANTITY_LIMIT_DAYS || '').trim() === '' ? 'blank' : 'filled'} when ${r.QUANTITY_LIMIT_YN}`);
  });
  const cpSegs = new Map(); for (const k of plans.keys()) { const c = k.slice(0, 9); if (!cpSegs.has(c)) cpSegs.set(c, []); cpSegs.get(c).push(k); }
  out.excludedDrugs = {
    header: exMeta.header, rows: exMeta.rows, badWidths: exMeta.badWidths, contractPlans: ex.size, duplicateRxcuiWithinPlan: exDup,
    rxcuisPerPlan: stats([...ex.values()].map((s) => s.size)),
    contractPlansNotInPlanInfo: [...ex.keys()].filter((k) => !cpSegs.has(k)),
    contractPlansWithSeveralSegments: [...ex.keys()].filter((k) => (cpSegs.get(k) || []).length > 1).length,
    tier: e.tier, quantityLimitYN: e.qlYN, priorAuthYN: e.paYN, stepTherapyYN: e.stYN, cappedBenefitYN: e.capYN, qlAmountDays: e.qlAmt,
  };

  // ---------- Beneficiary Cost
  const bc = new Map(); const c = { level: {}, tier: {}, days: {}, typePref: {}, typeNonpref: {}, typeMailPref: {}, typeMailNonpref: {}, spec: {}, ded: {}, minFilled: 0, maxFilled: 0 };
  const costMeta = await each(path.join(TXT, F.cost), '|', (r) => {
    const k = `${r.CONTRACT_ID}-${r.PLAN_ID}-${r.SEGMENT_ID}`; if (!bc.has(k)) bc.set(k, { tiers: new Set(), spec: new Set(), ded: new Set(), levels: new Set(), days: new Set() });
    const p = bc.get(k); p.tiers.add(r.TIER); p.levels.add(r.COVERAGE_LEVEL); p.days.add(r.DAYS_SUPPLY); if (r.TIER_SPECIALTY_YN === 'Y') p.spec.add(r.TIER); if (r.DED_APPLIES_YN === 'Y') p.ded.add(r.TIER);
    inc(c.level, r.COVERAGE_LEVEL); inc(c.tier, r.TIER); inc(c.days, r.DAYS_SUPPLY); inc(c.typePref, r.COST_TYPE_PREF); inc(c.typeNonpref, r.COST_TYPE_NONPREF); inc(c.typeMailPref, r.COST_TYPE_MAIL_PREF); inc(c.typeMailNonpref, r.COST_TYPE_MAIL_NONPREF);
    inc(c.spec, r.TIER_SPECIALTY_YN); inc(c.ded, r.DED_APPLIES_YN);
    for (const ch of ['PREF', 'NONPREF', 'MAIL_PREF', 'MAIL_NONPREF']) { const mn = (r[`COST_MIN_AMT_${ch}`] || '').trim(); const mx = (r[`COST_MAX_AMT_${ch}`] || '').trim(); if (mn !== '' && Number(mn) !== 0) c.minFilled++; if (mx !== '' && Number(mx) !== 0) c.maxFilled++; }
  });
  out.beneficiaryCost = {
    header: costMeta.header, rows: costMeta.rows, badWidths: costMeta.badWidths, plans: bc.size, coverageLevel: c.level, tier: c.tier, daysSupply: c.days,
    costTypePref: c.typePref, costTypeNonpref: c.typeNonpref, costTypeMailPref: c.typeMailPref, costTypeMailNonpref: c.typeMailNonpref,
    tierSpecialtyYN: c.spec, dedAppliesYN: c.ded, nonZeroMinCells: c.minFilled, nonZeroMaxCells: c.maxFilled,
    unsuppressedPlansMissingFromCost: [...plans.keys()].filter((k) => !supPlans.includes(k) && !bc.has(k)).length,
    costPlansNotInPlanInfo: [...bc.keys()].filter((k) => !plans.has(k)).length,
  };

  // ---------- Indication Based Coverage, Insulin, Geo (counts only)
  const ibcPlans = new Set(); const ibcRx = new Set(); const ibcDis = {}; const ibcPairs = [];
  const ibcMeta = await each(path.join(TXT, F.ibc), '|', (r) => { ibcPlans.add(`${r.CONTRACT_ID}-${r.PLAN_ID}`); ibcRx.add(r.RXCUI); inc(ibcDis, r.DISEASE); ibcPairs.push(r); });
  // is the IBC rxcui on the plan's basic formulary?
  let ibcOnFormulary = 0; let ibcNotOnFormulary = 0;
  for (const r of ibcPairs) {
    const segs = cpSegs.get(`${r.CONTRACT_ID}-${r.PLAN_ID}`) || [];
    const fids = new Set(); for (const s of segs) for (const f of plans.get(s).fid) fids.add(f);
    if ([...fids].some((f) => bf.has(f) && bf.get(f).rx.has(r.RXCUI))) ibcOnFormulary++; else ibcNotOnFormulary++;
  }
  out.indicationBasedCoverage = { header: ibcMeta.header, rows: ibcMeta.rows, contractPlans: ibcPlans.size, rxcuis: ibcRx.size, diseases: Object.keys(ibcDis).length, diseasesTop: top(ibcDis, 10), rowsWhoseRxcuiIsOnThePlansBasicFormulary: ibcOnFormulary, rowsNot: ibcNotOnFormulary };
  const insPlans = new Set();
  const insMeta = await each(path.join(TXT, F.insulin), '|', (r) => { insPlans.add(`${r.CONTRACT_ID}-${r.PLAN_ID}-${r.SEGMENT_ID}`); });
  out.insulinBeneficiaryCost = { header: insMeta.header, rows: insMeta.rows, plans: insPlans.size };
  const geoMeta = await each(path.join(TXT, F.geo), '|', () => {});
  out.geographicLocator = { header: geoMeta.header, rows: geoMeta.rows };

  // ---------- PBP 2027 tier agreement
  const pbpTiers = new Map();
  await each(path.join(PBP, 'pbp_mrx_tier.txt'), '\t', (r) => { const k = `${r.pbp_a_hnumber}-${r.pbp_a_plan_identifier}-${String(r.segment_id).padStart(3, '0')}`; if (!pbpTiers.has(k)) pbpTiers.set(k, new Set()); pbpTiers.get(k).add(r.mrx_tier_id); });
  const agree = { plansCompared: 0, formularyTiersSubsetOfPbpTiers: 0, notSubset: 0, costTiersEqualPbpTiers: 0, costTiersDiffer: 0, notInPbp: 0, notSubsetExamples: [], costDifferExamples: [] };
  for (const [k, p] of plans) {
    if (supPlans.includes(k)) continue;
    const pt = pbpTiers.get(k);
    if (!pt) { agree.notInPbp++; continue; }
    agree.plansCompared++;
    const fid = [...p.fid][0]; const ft = bf.has(fid) ? [...bf.get(fid).tiers] : [];
    const ptN = new Set([...pt].map((x) => String(Number(x))));
    if (ft.every((t) => ptN.has(String(Number(t))))) agree.formularyTiersSubsetOfPbpTiers++; else { agree.notSubset++; if (agree.notSubsetExamples.length < 10) agree.notSubsetExamples.push({ plan: k, fid, formularyTiers: ft.sort().join(','), pbpTiers: [...ptN].sort().join(',') }); }
    const ct = bc.has(k) ? [...bc.get(k).tiers].map((x) => String(Number(x))).sort().join(',') : '';
    if (ct === [...ptN].sort().join(',')) agree.costTiersEqualPbpTiers++; else { agree.costTiersDiffer++; if (agree.costDifferExamples.length < 10) agree.costDifferExamples.push({ plan: k, costTiers: ct, pbpTiers: [...ptN].sort().join(',') }); }
  }
  agree.pbpPlansWithTiers = pbpTiers.size;
  agree.notInPbpExamples = [...plans.keys()].filter((k) => !supPlans.includes(k) && !pbpTiers.has(k)).slice(0, 15);
  out.tierAgreementWithPbp2027 = agree;

  // ---------- candidate example plans
  const want = ['H2406-013-000', 'H1036-068-000', 'H1609-028-000', 'H5425-140-000', 'H5533-019-000', 'S5921-383-000', 'S4802-146-000', 'S5884-105-000'];
  out.candidates = want.map((k) => {
    const p = plans.get(k); if (!p) return { plan: k, inPlanInfo: false };
    const fid = [...p.fid][0]; const f = bf.get(fid);
    const exk = k.slice(0, 9);
    return { plan: k, name: [...p.name][0], suppressed: [...p.sup].join(), formularyId: fid, formularyVersion: f ? [...f.versions].join() : null, plansSharingFormulary: (fidPlans.get(fid) || []).length,
      rows: f ? f.rows : 0, rxcuis: f ? f.rx.size : 0, pa: f ? f.pa : 0, st: f ? f.st : 0, ql: f ? f.ql : 0, selected: f ? f.sel : 0, formularyTiers: f ? [...f.tiers].sort().join(',') : '',
      pbpTiers: pbpTiers.has(k) ? [...pbpTiers.get(k)].sort().join(',') : null, costTiers: bc.has(k) ? [...bc.get(k).tiers].sort().join(',') : null, costSpecialtyTiers: bc.has(k) ? [...bc.get(k).spec].join(',') : null,
      excludedDrugs: ex.has(exk) ? ex.get(exk).size : 0, ibcRows: ibcPairs.filter((r) => `${r.CONTRACT_ID}-${r.PLAN_ID}` === exk).length, premium: [...p.prem].join(), deductible: [...p.ded].join(), snp: [...p.snp].join() };
  });
  // a plan with excluded drugs and IBC rows, for the example choice
  out.excludedDrugPlansSample = [...ex.entries()].slice(0, 5).map(([k, s]) => ({ contractPlan: k, rxcuis: s.size, segments: (cpSegs.get(k) || []).join(' ') }));
  out.ibcPlansList = [...ibcPlans];
  process.stdout.write(JSON.stringify(out, null, 1));
})().catch((e) => { console.error(e); process.exit(1); });
