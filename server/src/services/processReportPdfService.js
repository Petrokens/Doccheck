const PDFDocument = require('pdfkit');

const INK = '#000000';
const PAPER = '#FFFFFF';
const RULE = '#222222';
const MUTED_FILL = '#EFEFEF';
const ZEBRA = '#F7F7F7';

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
  if (/^(field|metric|item|attribute|parameter|label|component)$/.test(h)) return 'label';
  if (/^(details?|value|count|result|weight|weighted\s*score)$/.test(h)) return 'value';
  if (/\bid\b|ref\.?|check\s*no|item\s*no|question\s*id|rule\s*id/.test(h)) return 'id';
  if (/severity|priority|category|class/.test(h)) return 'severity';
  if (/^status$|result|verdict/.test(h)) return 'status';
  if (/^score$|pts|points|score\s*\(%\)/.test(h)) return 'score';
  if (/^tag$|system|discipline/.test(h)) return 'tag';
  if (/remark|finding|comment|observation|note|impact|action|owner/.test(h)) return 'remarks';
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
  // Summary / scoring grids should not get an auto S.No column.
  if (header.some((h) => /component|weight|weighted|metric/i.test(String(h)))) return false;
  const kinds = header.map(columnKind);
  const hasId = kinds.includes('id');
  const hasBody = kinds.some((k) => ['description', 'remarks', 'status', 'severity'].includes(k));
  return hasId && hasBody;
}

function isRedundantScoreTable(header, rows) {
  if (!isKeyValueTable(header) || rows.length !== 1) return false;
  const label = String(rows[0][0] || '').toLowerCase();
  const value = String(rows[0][1] || '');
  return /final\s*qc\s*score/.test(label) && /\d+(\.\d+)?%?/.test(value);
}

function columnWidthsFor(header, usable) {
  const kinds = header.map(columnKind);
  if (header.length === 2 && isKeyValueTable(header)) {
    return [usable * 0.34, usable * 0.66];
  }
  const weights = kinds.map((kind) => {
    switch (kind) {
      case 'sno':
        return 0.42;
      case 'id':
        return 0.9;
      case 'label':
        return 1.4;
      case 'value':
        return 1.7;
      case 'severity':
      case 'status':
      case 'score':
      case 'tag':
        return 0.82;
      case 'description':
        return 2.55;
      case 'remarks':
        return 2.15;
      default:
        return 1.25;
    }
  });
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const widths = weights.map((w) => (usable * w) / sum);
  const used = widths.slice(0, -1).reduce((a, b) => a + b, 0);
  widths[widths.length - 1] = Math.max(22, usable - used);
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

function parseBoldLabelLine(line) {
  const m = String(line || '').trim().match(/^\*\*([^*]+):\*\*\s*(.*)$/);
  if (!m) return null;
  return { label: m[1].trim(), value: plainMultiline(m[2] || '') };
}

function shouldSkipMarkdownLine(line, index) {
  const t = String(line || '').trim();
  if (!t) return false;
  if (/^#+\s*DOCCHECK QA\/QC Report\s*$/i.test(t)) return true;
  if (index < 50) {
    if (/^#+\s*(PETROLENS|PETROLENZ|DOCCHECK)/i.test(t)) return true;
    if (/^#+\s*WITH INTEGRATED/i.test(t)) return true;
    if (/^#+\s*RULE-BASED ENGINEERING/i.test(t)) return true;
    if (/^#+\s*LIBRARY\s*$/i.test(t)) return true;
    if (/^#+\s*.+QA\/QC Report\s*$/i.test(t)) return true;
    if (/4000-?RULE|4,?000\+?\s*Rules/i.test(t) && index < 10) return true;
    if (/^\*\*Document type:\*\*/i.test(t)) return true;
    if (/^\*\*Main document/i.test(t)) return true;
    if (/^\*\*Support document/i.test(t)) return true;
    if (/^\*\*Generated at:\*\*/i.test(t)) return true;
    if (/^\d+\.\s+.+\.(pdf|docx|png|jpg|jpeg|tif|tiff)\s*$/i.test(t)) return true;
    if (/^Not provided$/i.test(t)) return true;
  }
  return false;
}

/** Drop SECTION 1 body — cover block already carries document control fields. */
function stripRedundantSectionOne(lines) {
  const out = [];
  let skipping = false;
  for (const line of lines) {
    const t = String(line || '').trim();
    if (/^#{1,3}\s*(?:SECTION\s*)?1\b/i.test(t) && !/^#{1,3}\s*1\.\d/.test(t)) {
      skipping = true;
      continue;
    }
    if (skipping) {
      if (/^#{1,3}\s*(?:SECTION\s*)?\d{1,2}\b/i.test(t) && !/^#{1,3}\s*\d+\.\d/.test(t)) {
        skipping = false;
        out.push(line);
      }
      continue;
    }
    out.push(line);
  }
  return out;
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
  return stripRedundantSectionOne(out);
}

function isMajorSection(line) {
  return /^#{1,3}\s*(?:SECTION\s*)?\d{1,2}\b/i.test(String(line || '').trim())
    && !/^#{1,3}\s*\d+\.\d/.test(String(line || '').trim());
}

function formatSectionTitle(line) {
  const raw = plainLine(line);
  const m = raw.match(/^(?:SECTION\s*)?(\d{1,2})\s*[:.\-–—]\s*(.+)$/i);
  if (m) return { num: m[1], title: m[2].trim() };
  return { num: null, title: raw };
}

function streamProcessReportPdf(res, report) {
  const title = report.report_title || 'DOCCHECK QA/QC Report';
  const filename = String(title).replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 80) || 'qaqc-report';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}.pdf"`);

  const margin = 44;
  const footerReserve = 42;
  const headerBand = 34;
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: margin, left: margin, right: margin, bottom: footerReserve },
    bufferPages: true,
    autoFirstPage: true,
  });
  doc.pipe(res);

  const pageLeft = margin;
  const pageRight = doc.page.width - margin;
  const usable = pageRight - pageLeft;
  const contentBottom = () => doc.page.height - footerReserve;
  let justDrewScore = false;

  const resetX = () => {
    doc.x = pageLeft;
  };

  const withSafeWrite = (fn) => {
    const prev = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    try {
      fn();
    } finally {
      doc.page.margins.bottom = prev;
    }
  };

  const drawHeaderBand = () => {
    doc.save();
    withSafeWrite(() => {
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(8)
        .text('DOCCHECK AI', pageLeft, 12, { width: usable * 0.5, lineBreak: false });
      doc.font('Helvetica').fontSize(7)
        .text('QA / QC REPORT', pageLeft + usable * 0.4, 12, {
          width: usable * 0.6,
          align: 'right',
          lineBreak: false,
        });
    });
    doc.strokeColor(RULE).lineWidth(1)
      .moveTo(pageLeft, headerBand - 4)
      .lineTo(pageRight, headerBand - 4)
      .stroke();
    doc.restore();
    doc.y = headerBand + 4;
    resetX();
    doc.fillColor(INK);
  };

  const newPage = () => {
    doc.addPage({
      size: 'A4',
      margins: { top: margin, left: margin, right: margin, bottom: footerReserve },
    });
    drawHeaderBand();
  };

  const ensureSpace = (needed) => {
    const need = Math.max(0, Number(needed) || 0);
    if (need > 0 && doc.y + need > contentBottom() - 0.5) newPage();
    resetX();
  };

  const drawRule = (weight = 0.7, gapAfter = 6) => {
    ensureSpace(3 + gapAfter);
    doc.strokeColor(RULE).lineWidth(weight)
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
      italic = false,
      width = usable,
      lineGap = 1.15,
      align = 'left',
    } = opts;
    const value = String(text || '');
    const font = bold ? 'Helvetica-Bold' : italic ? 'Helvetica-Oblique' : 'Helvetica';
    doc.fillColor(INK).font(font).fontSize(size);
    const h = doc.heightOfString(value, { width, lineGap });
    ensureSpace(h + 2);
    withSafeWrite(() => {
      doc.text(value, x, doc.y, {
        width,
        lineGap,
        align,
        continued: false,
        height: Math.max(h + 1, size + 2),
      });
    });
    resetX();
    return h;
  };

  const writeControlBlock = (rows) => {
    const labelW = Math.round(usable * 0.28);
    const valueW = usable - labelW;
    const heights = rows.map(([label, value]) => {
      const lh = doc.font('Helvetica-Bold').fontSize(8)
        .heightOfString(label, { width: labelW - 12, lineGap: 0.4 });
      const vh = doc.font('Helvetica').fontSize(8.5)
        .heightOfString(String(value || '—'), { width: valueW - 12, lineGap: 0.4 });
      return Math.max(18, lh + 8, vh + 8);
    });
    ensureSpace(heights.reduce((a, b) => a + b, 0) + 2);
    let y = doc.y;
    rows.forEach(([label, value], idx) => {
      const h = heights[idx];
      doc.save();
      if (idx % 2 === 1) doc.rect(pageLeft, y, usable, h).fill(ZEBRA);
      else doc.rect(pageLeft, y, usable, h).fill(PAPER);
      doc.strokeColor(RULE).lineWidth(0.5).rect(pageLeft, y, usable, h).stroke();
      doc.moveTo(pageLeft + labelW, y).lineTo(pageLeft + labelW, y + h).stroke();
      doc.restore();
      withSafeWrite(() => {
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(8)
          .text(label, pageLeft + 6, y + 4, { width: labelW - 12, lineGap: 0.4 });
        doc.font('Helvetica').fontSize(8.5)
          .text(String(value || '—'), pageLeft + labelW + 6, y + 4, {
            width: valueW - 12,
            lineGap: 0.4,
          });
      });
      y += h;
    });
    doc.y = y + 10;
    resetX();
  };

  const writeKvRows = (pairs) => {
    writeControlBlock(pairs);
  };

  const drawStatusBadge = (text, x, y, maxW, maxH) => {
    const label = String(text || '—').trim() || '—';
    doc.font('Helvetica-Bold').fontSize(6.5);
    const tw = Math.min(maxW - 4, Math.max(doc.widthOfString(label) + 8, 28));
    const th = Math.min(maxH - 2, 11);
    const bx = x + Math.max(0, (maxW - tw) / 2);
    const by = y + Math.max(0, (maxH - th) / 2 - 1);
    doc.save();
    doc.roundedRect(bx, by, tw, th, 1.5).fill(PAPER);
    doc.roundedRect(bx, by, tw, th, 1.5).strokeColor(INK).lineWidth(0.85).stroke();
    doc.restore();
    withSafeWrite(() => {
      doc.fillColor(INK).font('Helvetica-Bold').fontSize(6.5)
        .text(label, bx, by + 2, { width: tw, align: 'center', lineBreak: false });
    });
  };

  const paintTable = (headerIn, rowsIn) => {
    let header = headerIn;
    let rows = rowsIn.map((r) => normalizeRow(r, Math.max(headerIn.length, 1)));
    ({ header, rows } = withSerialColumn(header, rows));
    rows = rows.map((r) => normalizeRow(r, header.length));
    if (justDrewScore && isRedundantScoreTable(header, rows)) {
      justDrewScore = false;
      return;
    }
    justDrewScore = false;

    const kinds = header.map(columnKind);
    const colWidths = columnWidthsFor(header, usable);
    const keyValue = isKeyValueTable(header);

    const measureRow = (cells, headerRow) => {
      doc.font(headerRow ? 'Helvetica-Bold' : 'Helvetica').fontSize(headerRow ? 7.5 : 8);
      const heights = cells.map((cell, idx) => {
        const kind = kinds[idx];
        if (!headerRow && (kind === 'status' || kind === 'severity')) return 16;
        const h = doc.heightOfString(String(cell || '—'), {
          width: Math.max(colWidths[idx] - 8, 12),
          lineGap: 0.55,
        });
        return Math.max(h + 7, headerRow ? 15 : 14);
      });
      return Math.max(headerRow ? 15 : 14, ...heights);
    };

    const paintRow = (cells, headerRow = false, zebra = false) => {
      const naturalH = measureRow(cells, headerRow);
      const minUseful = headerRow ? naturalH : Math.min(Math.max(naturalH, 16), 24);
      if (doc.y + minUseful > contentBottom() - 0.5) {
        newPage();
        if (!headerRow) paintRow(header, true, false);
      }
      const available = contentBottom() - doc.y;
      if (!headerRow && naturalH > available + 0.5 && available < 36) {
        newPage();
        paintRow(header, true, false);
      }
      const room = contentBottom() - doc.y;
      const maxH = naturalH > room ? Math.max(room, 14) : naturalH;
      const y = doc.y;
      let x = pageLeft;

      cells.forEach((cell, idx) => {
        const w = colWidths[idx];
        const kind = kinds[idx];
        doc.save();
        if (headerRow) doc.rect(x, y, w, maxH).fill(MUTED_FILL);
        else if (zebra && !keyValue) doc.rect(x, y, w, maxH).fill(ZEBRA);
        else doc.rect(x, y, w, maxH).fill(PAPER);
        doc.restore();
        doc.rect(x, y, w, maxH).strokeColor(RULE).lineWidth(0.45).stroke();

        if (!headerRow && (kind === 'status' || kind === 'severity')) {
          drawStatusBadge(cell, x + 2, y + 1, w - 4, maxH - 2);
        } else {
          const align = ['sno', 'score', 'tag'].includes(kind) ? 'center' : 'left';
          const useBold = headerRow || kind === 'sno' || kind === 'id' || kind === 'label'
            || (keyValue && idx === 0);
          withSafeWrite(() => {
            doc.fillColor(INK)
              .font(useBold ? 'Helvetica-Bold' : 'Helvetica')
              .fontSize(headerRow ? 7.5 : 8)
              .text(String(cell || '—'), x + 4, y + 3.5, {
                width: w - 8,
                height: maxH - 5,
                align,
                lineGap: 0.55,
                ellipsis: maxH < naturalH - 0.5,
              });
          });
        }
        x += w;
      });
      doc.y = y + maxH;
      resetX();
    };

    const headerH = measureRow(header, true);
    const firstH = rows[0] ? Math.min(measureRow(rows[0], false), 30) : 0;
    ensureSpace(headerH + firstH + 2);
    paintRow(header, true, false);
    rows.forEach((row, idx) => paintRow(row, false, idx % 2 === 1));
    doc.y += 8;
    resetX();
  };

  const writeScoreCallout = (scoreText) => {
    const value = plainLine(scoreText);
    ensureSpace(36);
    const y = doc.y;
    const boxH = 30;
    doc.save();
    doc.rect(pageLeft, y, usable, boxH).fill(MUTED_FILL).strokeColor(INK).lineWidth(1).stroke();
    doc.rect(pageLeft, y, 3.5, boxH).fill(INK);
    doc.restore();
    withSafeWrite(() => {
      doc.fillColor(INK).font('Helvetica').fontSize(7)
        .text('FINAL QC SCORE', pageLeft + 12, y + 5, { width: usable - 24, lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(14)
        .text(value, pageLeft + 12, y + 14, { width: usable - 24, lineBreak: false });
    });
    doc.y = y + boxH + 8;
    justDrewScore = true;
    resetX();
  };

  const writeSectionHeading = (line) => {
    const level = (line.match(/^#+/) || ['#'])[0].length;
    const major = isMajorSection(line);
    const { num, title } = formatSectionTitle(line);
    // Keep heading with following body (avoids orphan headers / near-empty pages).
    const keepWith = major ? 56 : 36;
    const padBefore = major ? 10 : 6;

    if (major) {
      const heading = num ? `${num}.  ${title.toUpperCase()}` : title.toUpperCase();
      doc.font('Helvetica-Bold').fontSize(9.5);
      const textH = doc.heightOfString(heading, { width: usable, lineGap: 1 });
      ensureSpace(padBefore + textH + 10 + keepWith);
      doc.y += padBefore;
      writeText(heading, { size: 9.5, bold: true });
      doc.y += 1;
      drawRule(1.1, 3);
      drawRule(0.35, 7);
      return;
    }

    const size = level <= 2 ? 9 : 8.5;
    const heading = plainLine(line);
    doc.font('Helvetica-Bold').fontSize(size);
    const textH = doc.heightOfString(heading, { width: usable, lineGap: 1 });
    ensureSpace(padBefore + textH + 8 + keepWith);
    doc.y += padBefore;
    writeText(heading, { size, bold: true });
    if (level <= 2) drawRule(0.55, 6);
    else doc.y += 3;
  };

  // —— Document cover / control ——
  drawHeaderBand();
  writeText('DOCCHECK QA/QC REPORT', { size: 14, bold: true });
  doc.y += 1;
  writeText('Engineering document quality assurance & control', { size: 8, italic: true });
  doc.y += 8;
  drawRule(1, 8);

  writeControlBlock([
    ['Document type', report.document_type || 'N/A'],
    ['Main document', report.main_document_name || 'N/A'],
    ['Support document', report.support_document_name || 'Not provided'],
    ['Report ID', report.id || 'N/A'],
    ['Generated', report.created_at
      ? new Date(report.created_at).toUTCString().replace('GMT', 'UTC')
      : new Date().toUTCString().replace('GMT', 'UTC')],
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
      ensureSpace(h + 12);
      const y = doc.y;
      doc.save().rect(pageLeft, y, usable, h + 8).fill(ZEBRA).strokeColor(RULE).lineWidth(0.45).stroke().restore();
      withSafeWrite(() => {
        doc.fillColor(INK).font('Courier').fontSize(7.5)
          .text(body, pageLeft + 6, y + 4, { width: usable - 12, lineGap: 1, height: h + 2 });
      });
      doc.y = y + h + 12;
      resetX();
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      writeSectionHeading(line);
      i += 1;
      continue;
    }

    if (parseBoldLabelLine(line)) {
      const pairs = [];
      while (i < lines.length && parseBoldLabelLine(lines[i])) {
        const parsed = parseBoldLabelLine(lines[i]);
        pairs.push([parsed.label, parsed.value || '—']);
        i += 1;
      }
      writeKvRows(pairs);
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const bullets = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        bullets.push(plainMultiline(lines[i].replace(/^\s*[-*]\s+/, '')));
        i += 1;
      }
      for (const bullet of bullets) {
        writeText(`•  ${bullet}`, { size: 8.5, lineGap: 1.2, x: pageLeft + 2, width: usable - 2 });
        doc.y += 1;
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
        writeText(`${idx + 1}.  ${item}`, { size: 8.5, lineGap: 1.2, x: pageLeft + 2, width: usable - 2 });
        doc.y += 1;
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
      const body = quotes.join(' ');
      doc.font('Helvetica-Oblique').fontSize(8.5);
      const h = doc.heightOfString(body, { width: usable - 16, lineGap: 1.15 });
      ensureSpace(h + 10);
      const y = doc.y;
      doc.save();
      doc.rect(pageLeft, y, 2, h + 4).fill(INK);
      doc.restore();
      withSafeWrite(() => {
        doc.fillColor(INK).font('Helvetica-Oblique').fontSize(8.5)
          .text(body, pageLeft + 8, y + 2, { width: usable - 16, lineGap: 1.15, height: h + 2 });
      });
      doc.y = y + h + 10;
      resetX();
      continue;
    }

    if (/^\s*---+\s*$/.test(line)) {
      drawRule(0.55, 7);
      i += 1;
      continue;
    }

    if (/^\*\*\d+(\.\d+)?%\*\*$/.test(line.trim()) || /^\d+(\.\d+)?%$/.test(line.trim())) {
      writeScoreCallout(line);
      i += 1;
      continue;
    }

    if (line.trim()) {
      writeText(plainMultiline(line), { size: 8.5 });
      doc.y += 2;
      resetX();
      i += 1;
      continue;
    }

    if (doc.y + 14 < contentBottom()) doc.y += 3;
    resetX();
    i += 1;
  }

  const range = doc.bufferedPageRange();
  for (let p = 0; p < range.count; p += 1) {
    doc.switchToPage(range.start + p);
    withSafeWrite(() => {
      doc.save();
      const fy = doc.page.height - 28;
      doc.strokeColor(RULE).lineWidth(0.55)
        .moveTo(pageLeft, fy - 7)
        .lineTo(pageRight, fy - 7)
        .stroke();
      doc.font('Helvetica').fontSize(7).fillColor(INK);
      doc.text('DocCheck AI  ·  Confidential', pageLeft, fy, {
        width: usable * 0.58,
        align: 'left',
        lineBreak: false,
      });
      doc.text(`Page ${p + 1} of ${range.count}`, pageLeft + usable * 0.42, fy, {
        width: usable * 0.58,
        align: 'right',
        lineBreak: false,
      });
      doc.restore();
    });
  }

  doc.end();
}

module.exports = { streamProcessReportPdf };
