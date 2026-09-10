/**
 * Generates a simple one-page PDF for the token cost report.
 * Run: node docs/generate-token-cost-pdf.js
 */
const fs = require('fs');
const path = require('path');
const PDFDocument = require(path.join(__dirname, '..', 'server', 'node_modules', 'pdfkit'));

const OUT = path.join(__dirname, 'DocCheck-AI-Upload-Document-Token-Cost-Report.pdf');
const BLACK = '#000000';
const GRAY = '#444444';

function drawTable(doc, x, y, width, headers, rows, colWeights) {
  const totalW = colWeights.reduce((a, b) => a + b, 0);
  const colWs = colWeights.map((w) => (w / totalW) * width);
  const rowH = 18;
  const headH = 18;

  doc.save();
  doc.rect(x, y, width, headH).strokeColor(BLACK).lineWidth(0.7).stroke();
  let cx = x;
  headers.forEach((h, i) => {
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(8.5);
    doc.text(h, cx + 5, y + 5, { width: colWs[i] - 10, ellipsis: true, lineBreak: false });
    if (i < headers.length - 1) {
      doc.moveTo(cx + colWs[i], y).lineTo(cx + colWs[i], y + headH).stroke();
    }
    cx += colWs[i];
  });
  doc.restore();

  let cy = y + headH;
  rows.forEach((row) => {
    doc.rect(x, cy, width, rowH).strokeColor(BLACK).lineWidth(0.6).stroke();
    let rx = x;
    row.forEach((cell, i) => {
      doc.fillColor(BLACK).font('Helvetica').fontSize(8.5);
      doc.text(String(cell), rx + 5, cy + 5, {
        width: colWs[i] - 10,
        ellipsis: true,
        lineBreak: false,
      });
      if (i < row.length - 1) {
        doc
          .moveTo(rx + colWs[i], cy)
          .lineTo(rx + colWs[i], cy + rowH)
          .strokeColor(BLACK)
          .lineWidth(0.6)
          .stroke();
      }
      rx += colWs[i];
    });
    cy += rowH;
  });

  return cy + 12;
}

async function main() {
  const doc = new PDFDocument({
    size: 'A4',
    autoFirstPage: true,
    margins: { top: 36, bottom: 36, left: 40, right: 40 },
    info: {
      Title: 'DocCheck AI - Upload Document Token Cost Report',
      Author: 'DocCheck AI',
    },
  });

  // Keep everything on one page - never auto-add pages.
  doc.on('pageAdded', () => {
    throw new Error('Content overflowed to a second page. Reduce spacing.');
  });

  const stream = fs.createWriteStream(OUT);
  doc.pipe(stream);

  const margin = 40;
  const contentW = doc.page.width - margin * 2;
  let y = 36;

  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(13);
  doc.text('DocCheck AI - Upload Document Token Cost Report', margin, y, {
    width: contentW,
    align: 'center',
    lineBreak: false,
  });
  y += 22;

  doc.moveTo(margin, y).lineTo(margin + contentW, y).strokeColor(BLACK).lineWidth(1).stroke();
  y += 14;

  // 1
  doc.font('Helvetica-Bold').fontSize(10).fillColor(BLACK);
  doc.text('1. Cost per document (min & max)', margin, y, { lineBreak: false });
  y += 16;

  y = drawTable(
    doc,
    margin,
    y,
    contentW,
    ['Content type', 'Examples', 'Min / document', 'Max / document'],
    [
      ['Document-based', 'PDF, Word, Excel, text', '~$0.002 / Rs 0.17', '~$0.18 / Rs 15'],
      ['Image-based', 'Drawing, PNG, JPG, TIFF', '~$0.003 / Rs 0.25', '~$0.12 / Rs 10'],
    ],
    [1.4, 2.0, 1.5, 1.4],
  );

  doc.font('Helvetica').fontSize(8).fillColor(GRAY);
  doc.text(
    'Min = short file / 1 image     Max = large file (50-100 pages) / many sheets (5-20)',
    margin,
    y,
    { width: contentW, lineBreak: false },
  );
  y += 16;

  // 2
  doc.font('Helvetica-Bold').fontSize(10).fillColor(BLACK);
  doc.text('2. Document-based content (text / PDF / Word)', margin, y, { lineBreak: false });
  y += 16;

  y = drawTable(
    doc,
    margin,
    y,
    contentW,
    ['Size', 'Pages', 'Est. tokens', 'Cost (USD)', 'Cost (INR)'],
    [
      ['Small', '1 - 5', '~2,000 - ~10,000', '$0.002 - $0.01', 'Rs 0.17 - Rs 0.85'],
      ['Medium', '10 - 25', '~20,000 - ~50,000', '$0.02 - $0.05', 'Rs 1.70 - Rs 4.20'],
      ['Large', '50 - 100', '~100,000 - ~200,000', '$0.09 - $0.18', 'Rs 7.50 - Rs 15'],
    ],
    [1, 1.2, 2.2, 1.6, 1.6],
  );
  doc.font('Helvetica').fontSize(8.5).fillColor(BLACK);
  doc.text('Per document: min ~$0.002 (Rs 0.17)  |  max ~$0.18 (Rs 15)', margin, y, {
    lineBreak: false,
  });
  y += 16;

  // 3
  doc.font('Helvetica-Bold').fontSize(10).fillColor(BLACK);
  doc.text('3. Image-based content (drawings / photos)', margin, y, { lineBreak: false });
  y += 16;

  y = drawTable(
    doc,
    margin,
    y,
    contentW,
    ['Size', 'Images / pages', 'Est. tokens', 'Cost (USD)', 'Cost (INR)'],
    [
      ['Small', '1', '~5,000 - ~8,000', '$0.003 - $0.005', 'Rs 0.25 - Rs 0.40'],
      ['Medium', '2 - 5', '~12,000 - ~40,000', '$0.008 - $0.03', 'Rs 0.70 - Rs 2.50'],
      ['Large', '5 - 20', '~40,000 - ~160,000', '$0.03 - $0.12', 'Rs 2.50 - Rs 10'],
    ],
    [1, 1.4, 2.2, 1.6, 1.6],
  );
  doc.font('Helvetica').fontSize(8.5).fillColor(BLACK);
  doc.text('Per document: min ~$0.003 (Rs 0.25)  |  max ~$0.12 (Rs 10)', margin, y, {
    lineBreak: false,
  });
  y += 16;

  // 4
  doc.font('Helvetica-Bold').fontSize(10).fillColor(BLACK);
  doc.text('4. Simple guide (INR)', margin, y, { lineBreak: false });
  y += 16;

  y = drawTable(
    doc,
    margin,
    y,
    contentW,
    ['You upload...', 'Expect about...'],
    [
      ['Small PDF / Word (few pages)', 'Rs 0.20 - Rs 1'],
      ['Medium PDF (10-25 pages)', 'Rs 2 - Rs 4'],
      ['Large PDF (50-100 pages)', 'Rs 8 - Rs 15'],
      ['One drawing / image', 'Rs 0.25 - Rs 0.40'],
      ['Many drawings (5-20)', 'Rs 3 - Rs 10'],
    ],
    [2.4, 1.4],
  );

  // 5
  doc.font('Helvetica-Bold').fontSize(10).fillColor(BLACK);
  doc.text('5. Measured sample', margin, y, { lineBreak: false });
  y += 16;

  y = drawTable(
    doc,
    margin,
    y,
    contentW,
    ['Content type', 'File', 'Pages', 'Tokens', 'USD', 'INR'],
    [
      ['Document-based', 'PDF', '24', '48,210', '$0.0425', 'Rs 3.55'],
      ['Image-based', 'Drawing', '1', '6,800', '$0.0032', 'Rs 0.27'],
    ],
    [1.8, 1.2, 0.8, 1.1, 1.1, 1],
  );

  doc.font('Helvetica').fontSize(8.5).fillColor(GRAY);
  doc.text('Token Cost (INR) = Token Cost (USD) x 83.5', margin, y, {
    width: contentW,
    align: 'center',
    lineBreak: false,
  });

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  console.log(`Created: ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
