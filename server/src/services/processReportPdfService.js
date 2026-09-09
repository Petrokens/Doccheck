const PDFDocument = require('pdfkit');

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
  // Fix float drift so last column closes exactly at page edge
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
  // Cover page already prints these — skip duplicate preamble
  if (index < 40) {
    if (/^#+\s*PETROLENS/i.test(t)) return true;
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
    if (/^---+$/.test(trimmed)) return;
    out.push(line);
  });
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
}

function streamProcessReportPdf(res, report) {
  const title = report.report_title || `${report.document_type || 'QA/QC'} Report`;
  const filename = String(title).replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 80) || 'qaqc-report';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}.pdf"`);

  const margin = 40;
  const footerReserve = 32;
  const doc = new PDFDocument({ size: 'A4', margin, bufferPages: true });
  doc.pipe(res);

  const brand = '#0B4D99';
  const pageLeft = margin;
  const pageRight = doc.page.width - margin;
  const usable = pageRight - pageLeft;
  const contentBottom = () => doc.page.height - footerReserve;

  const resetX = () => {
    doc.x = pageLeft;
  };

  const drawHeaderBar = () => {
    doc.save();
    doc.rect(0, 0, doc.page.width, 34).fill(brand);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(10)
      .text('DOCCHECK AI  ·  QA/QC REPORT', pageLeft, 11, { width: usable, lineBreak: false });
    doc.restore();
    doc.y = 46;
    resetX();
    doc.fillColor('#0f172a');
  };

  const newPage = () => {
    doc.addPage();
    drawHeaderBar();
  };

  const ensureSpace = (needed) => {
    if (doc.y + needed > contentBottom()) newPage();
    resetX();
  };

  const writeText = (text, opts = {}) => {
    const {
      x = pageLeft,
      size = 9,
      bold = false,
      color = '#0f172a',
      width = usable,
      lineGap = 1.1,
      align = 'left',
    } = opts;
    doc.fillColor(color).font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(size);
    const h = doc.heightOfString(String(text || ''), { width, lineGap });
    ensureSpace(h + 2);
    doc.text(String(text || ''), x, doc.y, { width, lineGap, align, continued: false });
    resetX();
    return h;
  };

  drawHeaderBar();
  writeText(title, { size: 13, bold: true, color: brand });
  doc.y += 4;
  writeText(`Document type: ${report.document_type || 'N/A'}`, { size: 8.5, color: '#475569' });
  writeText(`Main document: ${report.main_document_name || 'N/A'}`, { size: 8.5, color: '#475569' });
  if (report.support_document_name) {
    writeText(`Support: ${report.support_document_name}`, { size: 8.5, color: '#475569' });
  }
  writeText(`Report ID: ${report.id}`, { size: 8.5, color: '#475569' });
  writeText(
    `Generated: ${report.created_at ? new Date(report.created_at).toUTCString() : new Date().toUTCString()}`,
    { size: 8.5, color: '#475569' },
  );
  doc.y += 4;
  doc.strokeColor('#cbd5e1').lineWidth(0.7).moveTo(pageLeft, doc.y).lineTo(pageRight, doc.y).stroke();
  doc.y += 8;
  resetX();

  const lines = compactMarkdownLines(report.report_markdown);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // TABLES
    if (isTableLine(line) && i + 1 < lines.length && isDivider(lines[i + 1])) {
      const headerRaw = splitCells(line);
      i += 2;
      const rowsRaw = [];
      while (i < lines.length && isTableLine(lines[i]) && !isDivider(lines[i])) {
        rowsRaw.push(splitCells(lines[i]));
        i += 1;
      }

      let header = headerRaw;
      let rows = rowsRaw.map((r) => normalizeRow(r, Math.max(headerRaw.length, 1)));
      ({ header, rows } = withSerialColumn(header, rows));
      rows = rows.map((r) => normalizeRow(r, header.length));
      const kinds = header.map(columnKind);
      const colWidths = columnWidthsFor(header, usable);

      const measureRow = (cells, headerRow) => {
        doc.font(headerRow ? 'Helvetica-Bold' : 'Helvetica').fontSize(headerRow ? 7 : 7.5);
        const heights = cells.map((cell, idx) => {
          const h = doc.heightOfString(String(cell || '—'), {
            width: Math.max(colWidths[idx] - 6, 14),
            lineGap: 0.8,
          });
          return Math.min(Math.max(h + 6, 13), 64);
        });
        return Math.max(13, ...heights);
      };

      const paintRow = (cells, { headerRow = false, zebra = false } = {}) => {
        const maxH = measureRow(cells, headerRow);
        // If row won't fit, new page + repeat header
        if (doc.y + maxH > contentBottom()) {
          newPage();
          if (!headerRow) {
            // redraw table header on continuation
            paintRow(header, { headerRow: true });
          }
        }
        const y = doc.y;
        if (headerRow) doc.save().rect(pageLeft, y, usable, maxH).fill('#e2eaf7').restore();
        else if (zebra) doc.save().rect(pageLeft, y, usable, maxH).fill('#f8fafc').restore();

        let x = pageLeft;
        cells.forEach((cell, idx) => {
          const w = colWidths[idx];
          const kind = kinds[idx];
          doc.rect(x, y, w, maxH).strokeColor('#c5d0e6').lineWidth(0.4).stroke();
          const align = ['sno', 'severity', 'status', 'score', 'tag'].includes(kind) ? 'center' : 'left';
          doc.fillColor('#0f172a')
            .font(headerRow || kind === 'sno' || kind === 'id' || kind === 'label' ? 'Helvetica-Bold' : 'Helvetica')
            .fontSize(headerRow ? 7 : 7.5)
            .text(String(cell || '—'), x + 3, y + 3, {
              width: w - 6,
              height: maxH - 5,
              align,
              lineGap: 0.8,
              ellipsis: true,
            });
          x += w;
        });
        doc.y = y + maxH;
        resetX();
      };

      const headerH = measureRow(header, true);
      const firstH = rows[0] ? measureRow(rows[0], false) : 0;
      ensureSpace(headerH + Math.min(firstH, 40) + 2);
      paintRow(header, { headerRow: true });
      rows.forEach((row, ri) => paintRow(row, { zebra: ri % 2 === 1 }));
      doc.y += 8;
      resetX();
      continue;
    }

    // HEADINGS
    if (/^#{1,3}\s+/.test(line)) {
      const level = (line.match(/^#+/) || ['#'])[0].length;
      const size = level === 1 ? 11 : level === 2 ? 10 : 9;
      // Keep heading with following content
      ensureSpace(size + 28);
      doc.y += level === 1 ? 6 : 4;
      writeText(plainLine(line), { size, bold: true, color: brand });
      if (level <= 2) {
        doc.strokeColor('#dbe3f0').lineWidth(0.5).moveTo(pageLeft, doc.y + 1).lineTo(pageRight, doc.y + 1).stroke();
        doc.y += 6;
      } else {
        doc.y += 2;
      }
      resetX();
      i += 1;
      continue;
    }

    // BULLETS
    if (/^\s*[-*]\s+/.test(line)) {
      const bullets = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        bullets.push(plainMultiline(lines[i].replace(/^\s*[-*]\s+/, '')));
        i += 1;
      }
      for (const bullet of bullets) {
        writeText(`•  ${bullet}`, { x: pageLeft, width: usable, size: 9 });
      }
      doc.y += 3;
      resetX();
      continue;
    }

    // PARAGRAPHS
    if (line.trim()) {
      writeText(plainMultiline(line), { size: 9, width: usable });
      doc.y += 2;
      resetX();
      i += 1;
      continue;
    }

    // blank
    doc.y += 4;
    resetX();
    i += 1;
  }

  const range = doc.bufferedPageRange();
  for (let p = 0; p < range.count; p += 1) {
    doc.switchToPage(range.start + p);
    doc.save();
    doc.font('Helvetica').fontSize(7.5).fillColor('#64748b').text(
      `DocCheck AI · Confidential · Page ${p + 1} of ${range.count}`,
      pageLeft,
      doc.page.height - 20,
      { width: usable, align: 'center', lineBreak: false },
    );
    doc.restore();
  }

  doc.end();
}

module.exports = { streamProcessReportPdf };
