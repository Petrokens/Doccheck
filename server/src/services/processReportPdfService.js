const PDFDocument = require('pdfkit');

function plainLine(line) {
  return String(line || '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s*/, '');
}

function splitCells(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => plainLine(c.trim()));
}

function isTableLine(line) {
  return /^\s*\|.*\|\s*$/.test(line);
}

function isDivider(line) {
  return /^\s*\|?(\s*:?-{3,}:?\s*\|)+\s*$/.test(line);
}

function streamProcessReportPdf(res, report) {
  const title = report.report_title || `${report.document_type || 'QA/QC'} Report`;
  const filename = String(title).replace(/[^a-zA-Z0-9-_]+/g, '-').slice(0, 80) || 'qaqc-report';
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}.pdf"`);

  const doc = new PDFDocument({ size: 'A4', margin: 48, bufferPages: true });
  doc.pipe(res);

  const brand = '#0B4D99';
  doc.rect(0, 0, doc.page.width, 46).fill(brand);
  doc.fillColor('#ffffff').fontSize(14).font('Helvetica-Bold').text('DOCCHECK AI QA/QC REPORT', 48, 16);
  doc.fillColor('#0f172a');

  doc.moveDown(2);
  doc.fontSize(16).font('Helvetica-Bold').text(title);
  doc.moveDown(0.3);
  doc.fontSize(9).font('Helvetica').fillColor('#475569');
  doc.text(`Document type: ${report.document_type || 'N/A'}`);
  doc.text(`Main document: ${report.main_document_name || 'N/A'}`);
  if (report.support_document_name) doc.text(`Support: ${report.support_document_name}`);
  doc.text(`Report ID: ${report.id}`);
  doc.text(`Generated: ${report.created_at ? new Date(report.created_at).toUTCString() : new Date().toUTCString()}`);
  doc.fillColor('#0f172a');
  doc.moveDown(0.8);

  const lines = String(report.report_markdown || '').split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (isTableLine(line) && i + 1 < lines.length && isDivider(lines[i + 1])) {
      const header = splitCells(line);
      i += 2;
      const rows = [];
      while (i < lines.length && isTableLine(lines[i]) && !isDivider(lines[i])) {
        rows.push(splitCells(lines[i]));
        i += 1;
      }
      const colCount = Math.max(header.length, ...rows.map((r) => r.length), 1);
      const usable = doc.page.width - 96;
      const colW = usable / colCount;
      const drawRow = (cells, headerRow) => {
        if (doc.y > doc.page.height - 80) doc.addPage();
        const y = doc.y;
        let maxH = 18;
        cells.forEach((cell, idx) => {
          const h = doc.heightOfString(cell || '', { width: colW - 8, fontSize: 8 });
          maxH = Math.max(maxH, h + 10);
        });
        cells.forEach((cell, idx) => {
          const x = 48 + idx * colW;
          if (headerRow) doc.save().rect(x, y, colW, maxH).fill('#e8eef8').restore();
          doc.rect(x, y, colW, maxH).strokeColor('#c4d2f0').stroke();
          doc.fillColor('#0f172a').fontSize(8).font(headerRow ? 'Helvetica-Bold' : 'Helvetica');
          doc.text(cell || '', x + 4, y + 4, { width: colW - 8 });
        });
        doc.y = y + maxH;
      };
      drawRow(header.concat(Array(colCount).fill('')).slice(0, colCount), true);
      rows.forEach((row) => drawRow(row.concat(Array(colCount).fill('')).slice(0, colCount), false));
      doc.moveDown(0.4);
      continue;
    }

    if (/^#{1,3}\s+/.test(line)) {
      if (doc.y > doc.page.height - 90) doc.addPage();
      doc.moveDown(0.4);
      doc.fillColor(brand).font('Helvetica-Bold').fontSize(/^#\s/.test(line) ? 13 : 11).text(plainLine(line));
      doc.fillColor('#0f172a').font('Helvetica').fontSize(10);
    } else if (/^\s*[-*]\s+/.test(line)) {
      doc.fontSize(10).text(`• ${plainLine(line.replace(/^\s*[-*]\s+/, ''))}`, { indent: 12 });
    } else if (line.trim()) {
      doc.fontSize(10).font('Helvetica').text(plainLine(line), { align: 'left' });
    } else {
      doc.moveDown(0.25);
    }
    i += 1;
  }

  const range = doc.bufferedPageRange();
  for (let p = 0; p < range.count; p += 1) {
    doc.switchToPage(p);
    doc.fontSize(8).fillColor('#64748b').text(
      `DocCheck AI · Confidential · Page ${p + 1} of ${range.count}`,
      48,
      doc.page.height - 32,
      { width: doc.page.width - 96, align: 'center' },
    );
  }

  doc.end();
}

module.exports = { streamProcessReportPdf };
