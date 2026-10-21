#!/usr/bin/env node
/**
 * Writes the Word copies of the 3 medical MVP specification documents in
 * docs/specs/rtb-medical-mvp (README.md, data-dictionary.md, carin-crosswalk.md).
 *
 * Usage:
 *   npm install docx        (once; docx is not a repository dependency)
 *   node scripts/build-rtb-docx.js
 *
 * Output: dist/rtb-medical-mvp-specification-<version>.docx,
 *         dist/rtb-medical-mvp-data-dictionary-<version>.docx,
 *         dist/rtb-medical-mvp-carin-crosswalk-<version>.docx
 * The version and date come from each document's preface ("version 0.3, dated
 * October 21, 2026"). The Word copy carries the same content as the Markdown;
 * the Markdown in the repository is the source. dist/ is git-ignored.
 *
 * This script reads the Markdown subset these 3 documents use: headings,
 * paragraphs, bullet and numbered lists, fenced code, pipe tables, and inline
 * code, bold, italics and links. Pages are US Letter landscape with a footer
 * that names the document, its version and date, and the page number.
 */
'use strict';
const fs = require('fs');
const path = require('path');
let D;
try { D = require('docx'); } catch (e) { console.error('The docx package is not installed. Run: npm install docx'); process.exit(2); }
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType,
  AlignmentType, HeadingLevel, Footer, PageNumber, PageOrientation, ExternalHyperlink, BorderStyle,
  LevelFormat, TableLayoutType, VerticalAlign } = D;

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'docs', 'specs', 'rtb-medical-mvp');
const OUT_DIR = path.join(ROOT, 'dist');
const DOCS = [
  { file: 'README.md', out: 'rtb-medical-mvp-specification', title: 'Medical MVP technical specification' },
  { file: 'data-dictionary.md', out: 'rtb-medical-mvp-data-dictionary', title: 'Medical MVP data dictionary' },
  { file: 'carin-crosswalk.md', out: 'rtb-medical-mvp-carin-crosswalk', title: 'Medical MVP crosswalk to the SBC InsurancePlan profile' },
];
function absUrl(link) { return link; } // the 3 documents carry absolute links already

// Page geometry: US Letter landscape, 0.6" side margins, 0.7" top/bottom.
const PAGE_W = 15840, PAGE_H = 12240, M_SIDE = 864, M_TB = 1008;
const USABLE = PAGE_W - 2 * M_SIDE; // 14112 DXA
const BODY = { font: 'Calibri', size: 20 };      // 10 pt
const MONO = { font: 'Consolas', size: 18 };     // 9 pt
const TBL = 17;                                   // 8.5 pt in tables
const TBL_MONO = 16;

function build(md, outFile, footerTitle) {
// ---------- inline parsing ----------
function inlines(text, opts = {}) {
  // tokens: `code`, **bold**, *italic*, [text](url)
  const runs = [];
  const re = /(`[^`]+`)|(\*\*[^*]+\*\*)|(\*[^*]+\*)|(\[[^\]]+\]\([^)\s]+\))/g;
  let last = 0, m;
  const size = opts.size || BODY.size;
  const push = (t, extra = {}) => { if (t) runs.push(new TextRun({ text: t, font: BODY.font, size, ...extra })); };
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith('`')) runs.push(new TextRun({ text: tok.slice(1, -1), font: MONO.font, size: opts.mono || MONO.size }));
    else if (tok.startsWith('**')) push(tok.slice(2, -2), { bold: true });
    else if (tok.startsWith('*')) push(tok.slice(1, -1), { italics: true });
    else {
      const mm = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(tok);
      const url = absUrl(mm[2]);
      const label = mm[1];
      const inner = /^`.*`$/.test(label)
        ? new TextRun({ text: label.slice(1, -1), font: MONO.font, size: opts.mono || MONO.size, style: 'Hyperlink' })
        : new TextRun({ text: label, font: BODY.font, size, style: 'Hyperlink' });
      runs.push(new ExternalHyperlink({ children: [inner], link: url }));
    }
    last = m.index + tok.length;
  }
  push(text.slice(last));
  return runs;
}

// ---------- block parsing ----------
const lines = md.split(/\r?\n/);
const blocks = [];
let i = 0;
while (i < lines.length) {
  const L = lines[i];
  if (/^\s*$/.test(L)) { i++; continue; }
  if (/^```/.test(L)) { const buf = []; i++; while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]); i++; blocks.push({ t: 'code', lines: buf }); continue; }
  const h = /^(#{1,4})\s+(.*)$/.exec(L);
  if (h) { blocks.push({ t: 'h', level: h[1].length, text: h[2] }); i++; continue; }
  if (/^\|/.test(L)) {
    const rows = [];
    while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
    const cells = r => r.replace(/^\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim());
    const header = cells(rows[0]);
    const body = rows.slice(2).map(cells);
    blocks.push({ t: 'table', header, body });
    continue;
  }
  if (/^- /.test(L) || /^\* /.test(L)) {
    const items = [];
    while (i < lines.length && (/^[-*] /.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
      if (/^[-*] /.test(lines[i])) items.push(lines[i].replace(/^[-*] /, ''));
      else items[items.length - 1] += ' ' + lines[i].trim();
      i++;
    }
    blocks.push({ t: 'ul', items }); continue;
  }
  if (/^\d+\. /.test(L)) {
    const items = [];
    while (i < lines.length && (/^\d+\. /.test(lines[i]) || /^\s{2,}\S/.test(lines[i]))) {
      if (/^\d+\. /.test(lines[i])) items.push(lines[i].replace(/^\d+\. /, ''));
      else items[items.length - 1] += ' ' + lines[i].trim();
      i++;
    }
    blocks.push({ t: 'ol', items }); continue;
  }
  // paragraph: gather until blank or block start
  const buf = [L]; i++;
  while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#|\||```|- |\* |\d+\. )/.test(lines[i])) buf.push(lines[i++]);
  blocks.push({ t: 'p', text: buf.join(' ') });
}

// ---------- table widths ----------
function colWidths(header, body) {
  const n = header.length;
  const lens = header.map((h, c) => Math.max(h.replace(/[`*]/g, '').length, ...body.map(r => (r[c] || '').replace(/[`*]/g, '').length)));
  // weight: short columns stay narrow, long ones share the rest; cap the influence of very long cells
  const w = lens.map(l => Math.min(Math.max(l, 6), 70));
  const sum = w.reduce((a, b) => a + b, 0);
  let widths = w.map(x => Math.round(USABLE * x / sum));
  // minimum 1.0" for any column that has real text
  const MIN = 1300;
  let deficit = 0;
  widths = widths.map(x => { if (x < MIN) { deficit += MIN - x; return MIN; } return x; });
  if (deficit > 0) {
    const big = widths.map((x, k) => [x, k]).filter(([x]) => x > MIN).sort((a, b) => b[0] - a[0]);
    const pool = big.reduce((a, [x]) => a + x, 0);
    big.forEach(([x, k]) => { widths[k] = Math.round(x - deficit * x / pool); });
  }
  const diff = USABLE - widths.reduce((a, b) => a + b, 0);
  widths[widths.indexOf(Math.max(...widths))] += diff;
  return widths;
}

const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const borders = { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border };

function cellParas(text, isHeader) {
  // allow a cell to hold "A. B" sentences; split on "<br>" if present
  const parts = text.split(/<br\s*\/?>/i);
  return parts.map(p => new Paragraph({
    spacing: { before: 20, after: 20 },
    children: inlines(p, { size: TBL, mono: TBL_MONO }).map(r => r),
  })).map(p => p);
}

function makeTable(b) {
  const widths = colWidths(b.header, b.body);
  const mk = (cells, isHeader) => new TableRow({
    tableHeader: isHeader,
    cantSplit: false,
    children: cells.map((c, k) => new TableCell({
      width: { size: widths[k], type: WidthType.DXA },
      shading: isHeader ? { type: ShadingType.CLEAR, fill: 'E7EEF5', color: 'auto' } : undefined,
      margins: { top: 40, bottom: 40, left: 80, right: 80 },
      verticalAlign: VerticalAlign.TOP,
      children: isHeader
        ? [new Paragraph({ spacing: { before: 20, after: 20 }, children: [new TextRun({ text: c.replace(/[`*]/g, ''), bold: true, font: BODY.font, size: TBL })] })]
        : cellParas(c, false),
    })),
  });
  const rows = [mk(b.header, true), ...b.body.map(r => mk(b.header.map((_, k) => r[k] || ''), false))];
  return [new Table({ layout: TableLayoutType.FIXED, width: { size: USABLE, type: WidthType.DXA }, columnWidths: widths, borders, rows }),
          new Paragraph({ spacing: { before: 0, after: 120 }, children: [] })];
}

const numberingConfigs = [{ reference: 'bullets', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 300 } } } }] }];
const children = [];
let firstH1 = true;
for (const b of blocks) {
  if (b.t === 'h') {
    if (b.level === 1 && firstH1) { children.push(new Paragraph({ heading: HeadingLevel.TITLE, children: [new TextRun({ text: b.text, font: BODY.font })] })); firstH1 = false; continue; }
    const lvl = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_1, 3: HeadingLevel.HEADING_2, 4: HeadingLevel.HEADING_3 }[b.level];
    children.push(new Paragraph({ heading: lvl, children: inlines(b.text.replace(/`/g, ''), { size: b.level <= 2 ? 28 : 24 }), spacing: { before: 280, after: 100 }, keepNext: true }));
  } else if (b.t === 'p') {
    if (b.text.startsWith('Diego Orofino, the Benefit Plan Standard')) { children.push(new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: b.text, font: BODY.font, size: 18, color: '595959', italics: true })] })); continue; }
    children.push(new Paragraph({ spacing: { after: 120 }, children: inlines(b.text) }));
  } else if (b.t === 'ul') {
    b.items.forEach(it => children.push(new Paragraph({ numbering: { reference: 'bullets', level: 0 }, spacing: { after: 60 }, children: inlines(it) })));
  } else if (b.t === 'ol') {
    const ref = 'num' + children.length;
    numberingConfigs.push({ reference: ref, levels: [{ level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] });
    b.items.forEach(it => children.push(new Paragraph({ numbering: { reference: ref, level: 0 }, spacing: { after: 60 }, children: inlines(it) })));
  } else if (b.t === 'code') {
    b.lines.forEach(l => children.push(new Paragraph({ spacing: { after: 0 }, shading: { type: ShadingType.CLEAR, fill: 'F3F3F3', color: 'auto' }, indent: { left: 200 }, children: [new TextRun({ text: l || ' ', font: MONO.font, size: MONO.size })] })));
    children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
  } else if (b.t === 'table') {
    children.push(...makeTable(b));
  }
}
const footer = new Footer({
  children: [new Paragraph({
    tabStops: [{ type: D.TabStopType.RIGHT, position: USABLE }],
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF', space: 4 } },
    children: [
      new TextRun({ text: footerTitle, font: BODY.font, size: 16, color: '595959' }),
      new TextRun({ text: '\t', font: BODY.font, size: 16 }),
      new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], font: BODY.font, size: 16, color: '595959' }),
    ],
  })],
});

const doc = new Document({
  creator: 'Diego Orofino',
  title: footerTitle,
  styles: {
    default: { document: { run: { font: BODY.font, size: BODY.size } } },
    paragraphStyles: [
      { id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', run: { size: 40, bold: true, color: '1F3864', font: BODY.font }, paragraph: { spacing: { after: 240 } } },
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 28, bold: true, color: '1F3864', font: BODY.font }, paragraph: { spacing: { before: 320, after: 120 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 24, bold: true, color: '2E5597', font: BODY.font }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 21, bold: true, color: '2E5597', font: BODY.font }, paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
    characterStyles: [{ id: 'Hyperlink', name: 'Hyperlink', run: { color: '0563C1', underline: {} } }],
  },
  numbering: { config: numberingConfigs },
  sections: [{
    properties: { page: { size: { width: PAGE_H, height: PAGE_W, orientation: PageOrientation.LANDSCAPE }, margin: { top: M_TB, bottom: M_TB, left: M_SIDE, right: M_SIDE } } },
    footers: { default: footer },
    children,
  }],
});
return Packer.toBuffer(doc).then(buf => { fs.writeFileSync(outFile, buf); console.log('wrote', path.relative(ROOT, outFile), blocks.filter(b => b.t === 'table').length, 'tables'); });

}

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const d of DOCS) {
    const md = fs.readFileSync(path.join(SRC, d.file), 'utf8');
    const m = /version (\d+\.\d+(?:\.\d+)?), dated ([A-Z][a-z]+ \d{1,2}, \d{4})/.exec(md);
    if (!m) { console.error(d.file + ': no "version X, dated <date>" in the preface'); process.exit(1); }
    const footerTitle = d.title + ', version ' + m[1] + ', ' + m[2];
    await build(md, path.join(OUT_DIR, d.out + '-' + m[1] + '.docx'), footerTitle);
  }
})();
