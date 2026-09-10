const PDFDocument = require('pdfkit');

const INK = '#000000';
const PAPER = '#FFFFFF';

function plainLine(line) {
  return String(line || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function plainMultiline(line) {
  return String(line || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s*/, '')
    .trim();
}

function splitCells(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => plainMultiline(c.trim()));
}

function isTableLine(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isDivider(line) {
  return /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*$/.test(line);
}

function columnKind(header) {
  const h = String(header || '').toLowerCase().trim();
  if (/^(s\.?\s*no|sno|sr\.?\s*no|#)$/.test(h)) return 'sno';
  if (/^(field|metric|item|attribute|parameter|label)$/.test(h)) return 'label';
  if (/^(details?|value|count|result)$/.test(h)) return 'value';
  if (/\bid\b|ref\.?|check\s*no|item\s*no/.test(h)) return 'id';
  if (/severity|priority|category|class/.test(h)) return 'severity';
  if (/^status$|result|verdict/.test(h)) return 'status';
  if (/^score$|pts|points/.test(h)) return 'score';
  if (/^tag$|system|discipline/.test(h)) return 'tag';
  if (/remark|finding|comment|observation|note/.test(h)) return 'remarks';
  if (/description|question|requirement|check\s*item|criteria/.test(h)) return 'description';
  return 'default';
}

function isKeyValueTable(header) {
  if (header.length !== 2) return false;
  const a = columnKind(header[0]);
  const b = columnKind(header[1]);
  return (a === 'label' || a === 'default') && (b === 'value' || b === 'default' || b === 'remarks');
}

function isFindingsTable(header) {
  if (header.length < 3) return false;
  return header.some((h) => ['id', 'description', 'status', 'score', 'remarks', 'severity'].includes(columnKind(h)));
}

function columnWidthsFor(header, usable) {
  const kinds = header.map(columnKind);
  if (header.length === 2 && isKeyValueTable(header)) {
    return [usable * 0.34, usable * 0.66];
  }
  const weights = kinds.map((kind) => {
    switch (kind) {
      case 'sno':
        return 0.5;
      case 'id':
        return 1.0;
      case 'label':
        return 1.2;
      case 'value':
        return 2.2;
      case 'severity':
      case 'status':
      case 'score':
      case 'tag':
        return 0.9;
      case 'description':
        return 2.5;
      case 'remarks':
        return 2.3;
      default:
        return 1.4;
    }
  });
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const widths = weights.map((w) => (usable * w) / sum);
  const used = widths.slice(0, -1).reduce((a, b) => a + b, 0);
  widths[widths.length - 1] = Math.max(24, usable - used);
  return widths;
}

function normalizeRow(cells, colCount) {
  const row = Array.isArray(cells) ? [...cells] : [];
  while (row.length < colCount) row.push('');
  return row.slice(0, colCount);
}

function withSerialColumn(header, rows) {
  if (!isFindingsTable(header)) return { header, rows };
  if (header.some((h) => columnKind(h) === 'sno')) return { header, rows };
  return {
    header: ['S.No', ...header],
    rows: rows.map((row, idx) => [String(idx + 1), ...row]),
  };
}

function shouldSkipMarkdownLine(line, index) {
  const t = String(line || '').trim();
  if (!t) return false;
  if (index < 40) {
    if (/^#+\s*(PETROLENS|PETROLENZ|DOCCHECK)/i.test(t)) return true;
    if (/^#+\s*WITH INTEGRATED/i.test(t)) return true;
    if (/^#+\s*LIBRARY\s*$/i.test(t)) return true;
    if (/^\*\*Document type:\*\*/i.test(t)) return true;
    if (/^\*\*Main document/i.test(t)) return true;
    if (/^\*\*Support document/i.test(t)) return true;
    if (/^\*\*Generated at:\*\*/i.test(t)) return true;
    if (/^\d+\.\s+.+\.(pdf|docx|png|jpg|jpeg|tif|tiff)\s*$/i.test(t)) return true;
    if (/^Not provided$/i.test(t)) return true;
  }
  return false;
}

function compactMarkdownLines(markdown) {
  const raw = String(markdown || '').split(/\r?\n/);
  const out = [];
  let blankRun = 0;
  raw.forEach((line, index) => {
    if (shouldSkipMarkdownLine(line, index)) return;
    const trimmed = line.trim();
    if (!trimmed) {
      blankRun += 1;
      if (blankRun === 1 && out.length) out.push('');
      return;
    }
    blankRun = 0;
    out.push(line);
  });
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
}

function isMajorSection(line) {
  return /^#{1,3}\s*(?:SECTION\s*)?\d{1,2}\b/i.test(String(line || '').trim())
    && !/^#{1,3}\s*\d+\.\d/.test(String(line || '').trim());
}

function streamProcessReportPdf(res, report) {
  const title = report.report_title || `${report.document_type || 'QA/QC'} Report`;
  const filename = String(title).replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 80) || 'qaqc-report';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}.pdf"`);

  const margin = 46;
  const footerReserve = 36;
  const headerBand = 42;
  const doc = new PDFDocument({ size: 'A4', margin, bufferPages: true });
  doc.pipe(res);

  const pageLeft = margin;
  const pageRight = doc.page.width - margin;
  const usable = pageRight - pageLeft;
  const contentBottom = () => doc.page.height - footerReserve;

  const resetX = () => {
    doc.x = pageLeft;
  };

  const drawHeaderBand = () => {
    doc.save();
    doc.rect(0, 0, doc.page.width, headerBand).fill(PAPER);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(9)
      .text('DOCCHECK AI', pageLeft, 12, { width: usable * 0.5, lineBreak: false });
    doc.font('Helvetica').fontSize(8)
      .text('QA/QC REPORT', pageLeft + usable * 0.5, 12, {
        width: usable * 0.5,
        align: 'right',
        lineBreak: false,
      });
    doc.strokeColor(INK).lineWidth(1.4)
      .moveTo(pageLeft, headerBand - 8)
      .lineTo(pageRight, headerBand - 8)
      .stroke();
    doc.lineWidth(0.4)
      .moveTo(pageLeft, headerBand - 5)
      .lineTo(pageRight, headerBand - 5)
      .stroke();
    doc.restore();
    doc.y = headerBand + 8;
    resetX();
    doc.fillColor(INK);
  };

  const newPage = () => {
    doc.addPage();
    drawHeaderBand();
  };

  const ensureSpace = (needed) => {
    if (doc.y + needed > contentBottom()) newPage();
    resetX();
  };

  const drawRule = (weight = 0.8, gapAfter = 8) => {
    ensureSpace(6);
    doc.strokeColor(INK).lineWidth(weight)
      .moveTo(pageLeft, doc.y)
      .lineTo(pageRight, doc.y)
      .stroke();
    doc.y += gapAfter;
    resetX();
  };

  const writeText = (text, opts = {}) => {
    const {
      x = pageLeft,
      size = 9,
      bold = false,
      color = INK,
      width = usable,
      lineGap = 1.15,
      align = 'left',
    } = opts;
    doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    const h = doc.heightOfString(String(text || ''), { width, lineGap });
    ensureSpace(h + 2);
    doc.text(String(text || ''), x, doc.y, { width, lineGap, align, continued: false });
    resetX();
    return h;
  };

  const writeMetaBlock = (pairs) => {
    const labelW = Math.round(usable * 0.28);
    const valueW = usable - labelW;
    doc.font('Helvetica-Bold').fontSize(8);
    const heights = pairs.map(([label, value]) => {
      const lh = doc.font('Helvetica-Bold').fontSize(8).heightOfString(label, { width: labelW - 10, lineGap: 0.6 });
      const vh = doc.font('Helvetica').fontSize(8).heightOfString(String(value || '—'), { width: valueW - 10, lineGap: 0.6 });
      return Math.max(16, lh + 8, vh + 8);
    });
    const totalH = heights.reduce((a, b) => a + b, 0);
    ensureSpace(totalH + 4);
    let y = doc.y;
    pairs.forEach(([label, value], idx) => {
      const h = heights[idx];
      doc.save();
      doc.rect(pageLeft, y, usable, h).fill(PAPER).strokeColor(INK).lineWidth(0.6).stroke();
      doc.rect(pageLeft, y, labelW, h).stroke();
      doc.restore();
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(8)
        .text(label, pageLeft + 5, y + 4, { width: labelW - 10, lineGap: 0.6 });
      doc.font('Helvetica').fontSize(8)
        .text(String(value || '—'), pageLeft + labelW + 5, y + 4, { width: valueW - 10, lineGap: 0.6 });
      y += h;
    });
    doc.y = y + 10;
    resetX();
  };

  const paintTable = (headerIn, rowsIn) => {
    let header = headerIn;
    let rows = rowsIn.map((r) => normalizeRow(r, Math.max(headerIn.length, 1)));
    ({ header, rows } = withSerialColumn(header, rows));
    rows = rows.map((r) => normalizeRow(r, header.length));
    const kinds = header.map(columnKind);
    const colWidths = columnWidthsFor(header, usable);

    const measureRow = (cells, headerRow) => {
      doc.font(headerRow ? 'Helvetica-Bold' : 'Helvetica').fontSize(headerRow ? 7.5 : 8);
      const heights = cells.map((cell, idx) => {
        const h = doc.heightOfString(String(cell || '—'), {
          width: Math.max(colWidths[idx] - 8, 12),
          lineGap: 0.7,
        });
        return Math.max(h + 8, 15);
      });
      return Math.max(15, ...heights);
    };

    const paintRow = (cells, headerRow = false) => {
      const naturalH = measureRow(cells, headerRow);
      const minFit = headerRow ? naturalH : Math.min(naturalH, 22);
      if (doc.y + minFit > contentBottom()) {
        newPage();
        if (!headerRow) paintRow(header, true);
      }
      const available = contentBottom() - doc.y;
      const maxH = naturalH > available ? Math.max(available, 15) : naturalH;
      const y = doc.y;
      let x = pageLeft;
      cells.forEach((cell, idx) => {
        const w = colWidths[idx];
        const kind = kinds[idx];
        if (headerRow) {
          doc.save().rect(x, y, w, maxH).fill(INK).restore();
        } else {
          doc.save().rect(x, y, w, maxH).fill(PAPER).restore();
        }
        doc.rect(x, y, w, maxH).strokeColor(INK).lineWidth(0.6).stroke();
        const align = ['sno', 'severity', 'status', 'score', 'tag'].includes(kind) ? 'center' : 'left';
        const useBold = headerRow || kind === 'sno' || kind === 'id' || kind === 'label';
        doc.fillColor(headerRow ? PAPER : INK)
          .font(useBold ? 'Helvetica-Bold' : 'Helvetica')
          .fontSize(headerRow ? 7.5 : 8)
          .text(String(cell || '—'), x + 4, y + 4, {
            width: w - 8,
            height: maxH - 6,
            align,
            lineGap: 0.7,
            ellipsis: maxH < naturalH - 0.5,
          });
        x += w;
      });
      doc.y = y + maxH;
      resetX();
    };

    const headerH = measureRow(header, true);
    const firstH = rows[0] ? Math.min(measureRow(rows[0], false), 36) : 0;
    ensureSpace(headerH + firstH + 4);
    paintRow(header, true);
    rows.forEach((row) => paintRow(row, false));
    doc.y += 8;
    resetX();
  };

  drawHeaderBand();
  writeText(title, { size: 14, bold: true });
  doc.y += 3;
  writeText('Engineering document quality assurance — print copy', { size: 8 });
  doc.y += 6;
  writeMetaBlock([
    ['Document type', report.document_type || 'N/A'],
    ['Main document', report.main_document_name || 'N/A'],
    ['Support document', report.support_document_name || 'Not provided'],
    ['Report ID', report.id || 'N/A'],
    ['Generated', report.created_at ? new Date(report.created_at).toUTCString() : new Date().toUTCString()],
  ]);

  const lines = compactMarkdownLines(report.report_markdown);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isTableLine(line) && i + 1 < lines.length && isDivider(lines[i + 1])) {
      const headerRaw = splitCells(line);
      i += 2;
      const rowsRaw = [];
      while (i < lines.length && isTableLine(lines[i]) && !isDivider(lines[i])) {
        rowsRaw.push(splitCells(lines[i]));
        i += 1;
      }
      paintTable(headerRaw, rowsRaw);
      continue;
    }

    if (/^\s*```/.test(line)) {
      const fence = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        fence.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;
      const body = fence.join('\n') || ' ';
      doc.font('Courier').fontSize(7.5);
      const h = doc.heightOfString(body, { width: usable - 12, lineGap: 1 });
      ensureSpace(h + 14);
      const y = doc.y;
      doc.save().rect(pageLeft, y, usable, h + 10).fill(PAPER).strokeColor(INK).lineWidth(0.6).stroke().restore();
      doc.fillColor(INK).font('Courier').fontSize(7.5)
        .text(body, pageLeft + 6, y + 5, { width: usable - 12, lineGap: 1 });
      doc.y = y + h + 16;
      resetX();
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      const level = (line.match(/^#+/) || ['#'])[0].length;
      const major = isMajorSection(line);
      const size = major || level === 1 ? 11 : level === 2 ? 10 : 9;
      ensureSpace(size + 32);
      doc.y += major ? 10 : level === 1 ? 8 : 5;
      writeText(major ? plainLine(line).toUpperCase() : plainLine(line), { size, bold: true });
      drawRule(major || level <= 2 ? 1 : 0.5, major ? 8 : 6);
      i += 1;
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const bullets = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        bullets.push(plainMultiline(lines[i].replace(/^\s*[-*]\s+/, '')));
        i += 1;
      }
      for (const bullet of bullets) {
        writeText(`•  ${bullet}`, { size: 9, lineGap: 1.2 });
      }
      doc.y += 3;
      resetX();
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
        items.push(plainMultiline(lines[i].replace(/^\s*\d+[.)]\s+/, '')));
        i += 1;
      }
      items.forEach((item, idx) => {
        writeText(`${idx + 1}.  ${item}`, { size: 9, lineGap: 1.2 });
      });
      doc.y += 3;
      resetX();
      continue;
    }

    if (/^\s*>\s+/.test(line)) {
      const quotes = [];
      while (i < lines.length && /^\s*>\s+/.test(lines[i])) {
        quotes.push(plainMultiline(lines[i].replace(/^\s*>\s+/, '')));
        i += 1;
      }
      writeText(quotes.join(' '), { size: 9, x: pageLeft + 12, width: usable - 12 });
      doc.y += 3;
      resetX();
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      doc.y += 2;
      drawRule(0.7, 8);
      i += 1;
      continue;
    }

    if (/^\*\*\d+(\.\d+)?%\*\*$/.test(line.trim()) || /^\d+(\.\d+)?%$/.test(line.trim())) {
      ensureSpace(28);
      writeText(plainLine(line), { size: 16, bold: true, align: 'left' });
      doc.y += 4;
      i += 1;
      continue;
    }

    if (line.trim()) {
      writeText(plainMultiline(line), { size: 9 });
      doc.y += 2;
      resetX();
      i += 1;
      continue;
    }

    doc.y += 4;
    resetX();
    i += 1;
  }

  const range = doc.bufferedPageRange();
  for (let p = 0; p < range.count; p += 1) {
    doc.switchToPage(range.start + p);
    doc.save();
    const fy = doc.page.height - 22;
    doc.strokeColor(INK).lineWidth(0.6)
      .moveTo(pageLeft, fy - 8)
      .lineTo(pageRight, fy - 8)
      .stroke();
    doc.font('Helvetica').fontSize(7.5).fillColor(INK).text(
      `DocCheck AI  ·  Confidential  ·  Page ${p + 1} of ${range.count}`,
      pageLeft,
      fy,
      { width: usable, align: 'center', lineBreak: false },
    );
    doc.restore();
  }

  doc.end();
}

module.exports = { streamProcessReportPdf };
