const mammoth = require('mammoth');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { callGPT, callChecklistChatReview } = require('../services/openaiService');
const path = require('path');
const checklist = require('../data/checklist.json');

const {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel
} = require('docx');

exports.evaluateChecklist = async (req, res) => {
  try {
    const designFile = req.files.find(file => file.fieldname === 'design');

    if (!designFile) {
      return res.status(400).json({ error: 'Missing design file' });
    }

    const designPath = designFile.path;
    const designText = (await mammoth.extractRawText({ path: designPath })).value;

    const evaluations = [];

    for (const section of checklist) {
      for (const point of section.items) {
        const result = await callGPT(point.item, designText);
        evaluations.push({
          section: section.section,
          checklist_item: point.item,
          ...result
        });
      }
    }

    // Calculate score
    const total = evaluations.length;
    const passed = evaluations.filter(e => e.result === "Yes").length;
    const score = Math.round((passed / total) * 100);

    // Create reports folder if not exist
    const reportsDir = path.join(__dirname, '..', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir);
    }

    // Create Word document
    const doc = new Document({
      sections: [{
        children: [
          new Paragraph({
            text: "Civil Design Basis QC Report",
            heading: HeadingLevel.TITLE,
          }),
          new Paragraph({
            text: `Overall Compliance Score: ${score}% (${passed}/${total} Passed)`,
            spacing: { after: 300 },
            heading: HeadingLevel.HEADING_2,
          }),
          ...evaluations.map(e =>
            new Paragraph({
              children: [
                new TextRun({ text: `✔ Checklist: ${e.checklist_item}`, bold: true }),
                new TextRun({ text: `\nSection: ${e.section}` }),
                new TextRun({ text: `\nResult: ${e.result === "Yes" ? "✅ Yes" : "❌ No"} (${Math.round(e.confidence * 100)}%)` }),
                new TextRun({ text: `\nRemark: ${e.remark}` }),
                new TextRun({ text: `\n\n` }),
              ],
            })
          )
        ]
      }]
    });

    const wordPath = path.join(reportsDir, `qc-${Date.now()}.docx`);
    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(wordPath, buffer);

    res.json({
      evaluations,
      wordReport: wordPath,
      score
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'QC failed', details: err.message });
  }
};

exports.reviewChecklistDetail = async (req, res) => {
  const checklistTitle = (req.body.checklistTitle || '').trim();
  const supportDocuments = (req.body.supportDocuments || '').trim();
  const userNote = (req.body.userNote || '').trim();
  const department = (req.body.department || '').trim();

  const file = req.file;
  let documentText = '';
  let imageBase64 = null;
  let imageMime = null;
  const cleanupPath = file?.path;

  try {
    if (!file) {
      return res.status(400).json({ error: 'Upload a document or image to run QC review.' });
    }

    const ext = path.extname(file.originalname || '').toLowerCase();
    const mime = file.mimetype || '';

    if (mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(ext)) {
      const buf = fs.readFileSync(file.path);
      imageBase64 = buf.toString('base64');
      imageMime = mime || 'image/png';
    } else if (ext === '.docx' || mime.includes('wordprocessingml') || mime.includes('officedocument')) {
      documentText = (await mammoth.extractRawText({ path: file.path })).value || '';
    } else if (ext === '.pdf' || mime === 'application/pdf') {
      const buf = fs.readFileSync(file.path);
      const data = await pdfParse(buf);
      documentText = data.text || '';
    } else if (['.txt', '.csv'].includes(ext) || mime.startsWith('text/')) {
      documentText = fs.readFileSync(file.path, 'utf8');
    } else {
      return res.status(400).json({
        error:
          'Unsupported file type for AI review. Use PDF, Word (.docx), PNG/JPEG/WebP, or plain text (.txt/.csv).',
      });
    }

    if (!userNote && !documentText.trim() && !imageBase64) {
      return res.status(400).json({
        error:
          'No readable text or image could be taken from this file. Try PDF with selectable text, .docx, .txt, or a clear image (PNG/JPEG).',
      });
    }

    const result = await callChecklistChatReview({
      department,
      checklistTitle,
      supportDocuments,
      userNote,
      documentText,
      imageBase64,
      imageMime,
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Checklist review failed', details: err.message });
  } finally {
    if (cleanupPath && fs.existsSync(cleanupPath)) {
      try {
        fs.unlinkSync(cleanupPath);
      } catch (_) {
        /* ignore */
      }
    }
  }
};
