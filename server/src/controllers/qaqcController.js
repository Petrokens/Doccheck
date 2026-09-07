const crypto = require('crypto');
const { extractTextFromFile } = require('../services/documentTextService');
const { generateProcessQcReport } = require('../services/qaqcAiService');
const { streamProcessReportPdf } = require('../services/processReportPdfService');
const processReportRepo = require('../db/repositories/processReportRepository');
const userRepo = require('../db/repositories/userRepository');
const { mapWithConcurrency } = require('../utils/asyncPool');
const { sanitizeMarkdown, isReportId, canAccessReport } = require('../security/reportAccess');
const { publicError, internalError } = require('../security/httpErrors');
const { audit } = require('../security/audit');

const EXTRACTION_CONCURRENCY = Number(process.env.EXTRACTION_CONCURRENCY || 4);
const memoryCache = new Map();

function newId() {
  return crypto.randomBytes(8).toString('hex');
}

function toHumanDateTime(iso) {
  const dt = iso ? new Date(iso) : new Date();
  const day = String(dt.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day}-${months[dt.getMonth()]}-${dt.getFullYear()} ${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')} UTC`;
}

function extractScoreFromMarkdown(markdown) {
  const match = String(markdown || '').match(/(?:final\s+qc\s+score|qc\s+score|final score)[^\d]{0,24}(\d{1,3})/i);
  if (!match) return null;
  const score = Number(match[1]);
  if (Number.isNaN(score)) return null;
  return Math.max(0, Math.min(score, 100));
}

function inferReportCategory(documentType, override) {
  const v = String(override || '').trim().toLowerCase();
  if (v === 'piping') return 'Piping';
  if (v === 'pipeline') return 'Pipeline';
  if (v === 'instrumentation' || v === 'i&c') return 'Instrumentation';
  if (v === 'telecom') return 'Telecom';
  if (v === 'hvac') return 'HVAC';
  if (v === 'hse') return 'HSE';
  if (v === 'electrical') return 'Electrical';
  if (v === 'mechanical-rotating' || v === 'rotating') return 'Mechanical - Rotating';
  if (v === 'mechanical-static' || v === 'static') return 'Mechanical - Static';
  if (v === 'mechanical') return 'Mechanical';
  if (v === 'civil' || v === 'civil-structural' || v === 'structural') return 'Civil & Structural';
  if (v === 'general' || v === 'general-discipline') return 'General Discipline';
  if (v === 'process') return 'Process';
  const dt = String(documentType || '');
  if (/piping/i.test(dt)) return 'Piping';
  if (/pipeline/i.test(dt)) return 'Pipeline';
  if (/instrument/i.test(dt)) return 'Instrumentation';
  if (/telecom/i.test(dt)) return 'Telecom';
  if (/hvac/i.test(dt)) return 'HVAC';
  if (/hse/i.test(dt)) return 'HSE';
  if (/civil|structural/i.test(dt)) return 'Civil & Structural';
  if (/rotating/i.test(dt)) return 'Mechanical - Rotating';
  if (/static|vessel|exchanger|tank/i.test(dt)) return 'Mechanical - Static';
  if (/electrical|sld|cable/i.test(dt)) return 'Electrical';
  if (/mechanical/i.test(dt)) return 'Mechanical';
  return 'Process';
}

function footerBlock(generatedAtIso) {
  return [
    '---',
    '',
    `**Report Generated:** ${toHumanDateTime(generatedAtIso)}`,
    '**Report Engine:** Petrolens QA/QC Report Engine v4.2 | Rule Library: 4,000 Rules | Batch Execution: 40/40',
    '**Confidentiality:** Project-Sensitive | Distribution: Authorized Personnel Only',
    '',
    '---',
  ].join('\n');
}

async function buildProcessReport({
  documentType,
  reportCategoryOverride,
  mainFiles,
  supportFiles,
  checkedByUserId,
  onProgress,
}) {
  const emit = typeof onProgress === 'function' ? onProgress : () => {};
  const mains = Array.isArray(mainFiles) ? mainFiles.filter(Boolean) : [];
  const supports = Array.isArray(supportFiles) ? supportFiles.filter(Boolean) : [];
  if (!mains.length) throw new Error('At least one main project document is required.');

  const reportCategory = inferReportCategory(documentType, reportCategoryOverride);
  emit(`Full extraction mode (parallel up to ${EXTRACTION_CONCURRENCY} files).`);

  const extractOne = async (file, role, index, total) => {
    emit(`Extracting text from ${role} document ${index + 1}/${total}: ${file.originalname}...`);
    const text = await extractTextFromFile(file, (line) => emit(`[${role} ${index + 1}] ${line}`));
    return { name: file.originalname, role, text: String(text || '') };
  };

  const [mainChunks, supportChunks] = await Promise.all([
    mapWithConcurrency(mains, EXTRACTION_CONCURRENCY, (file, i) => extractOne(file, 'main', i, mains.length)),
    mapWithConcurrency(supports, EXTRACTION_CONCURRENCY, (file, i) => extractOne(file, 'support', i, supports.length)),
  ]);

  const mainText = mainChunks.map((p) => `\n\n--- SOURCE FILE: ${p.name} ---\n\n${p.text}`).join('');
  if (!String(mainText || '').trim()) {
    throw new Error('No readable text could be extracted. Use text-based PDFs, Word, or Markdown.');
  }
  const supportText = supportChunks.map((p) => `\n\n--- SUPPORT FILE: ${p.name} ---\n\n${p.text}`).join('');
  const mainDocumentLabel = mains.map((m) => m.originalname).join('; ');
  const supportDocumentNameJoined = supports.map((f) => f.originalname).join('; ');
  emit(`Main document(s) parsed (${mainText.length} chars from ${mains.length} file(s)).`);
  if (supports.length) emit(`Support document(s) parsed (${supportText.length} chars from ${supports.length} file(s)).`);

  emit('Preparing AI & 4000 Rule Engine LLM payload...');
  let pulse = 0;
  const timer = setInterval(() => {
    pulse += 1;
    emit(`AI engine is reviewing document context... (${pulse * 5}s)`);
  }, 5000);

  let aiMarkdown = '';
  try {
    aiMarkdown = await generateProcessQcReport({
      documentType: documentType || 'Engineering Document',
      mainDocumentName: mainDocumentLabel,
      supportDocumentName: supportDocumentNameJoined,
      mainText,
      supportText,
      onProgress: emit,
    });
  } finally {
    clearInterval(timer);
  }
  emit('AI response received. Building structured report...');

  const generatedAtIso = new Date().toISOString();
  const formatList = (names) => (names.length ? names.map((n, i) => `${i + 1}. ${n}`).join('\n') : 'Not provided');
  const report_markdown = [
    '# PETROLENS QA/QC REPORT ENGINE',
    '# WITH INTEGRATED 4000-RULE ENGINEERING QA RULE',
    '# LIBRARY',
    '',
    `# ${reportCategory} QA/QC Report`,
    '',
    `**Document type:** ${documentType || 'Engineering Document'}`,
    '**Main document(s):**',
    formatList(mains.map((m) => m.originalname)),
    '**Support document(s):**',
    formatList(supports.map((f) => f.originalname)),
    `**Generated at:** ${generatedAtIso}`,
    '',
    '---',
    '',
    `${sanitizeMarkdown(String(aiMarkdown || '').trim())}\n\n${footerBlock(generatedAtIso)}`,
    '',
  ].join('\n');

  emit('Saving report in database...');
  const id = newId();
  const record = {
    id,
    document_type: documentType || 'Engineering Document',
    main_document_name: mainDocumentLabel,
    support_document_name: supportDocumentNameJoined,
    checked_by_user_id: checkedByUserId,
    report_markdown,
    report_structured: null,
    workflow: 'qaqc',
    report_title: `${reportCategory} QA/QC Report`,
    created_at: generatedAtIso,
  };
  memoryCache.set(id, record);
  await processReportRepo.create(record);
  audit('report.generate', { id, user_id: checkedByUserId, document_type: record.document_type });
  emit(`Report persisted successfully. Report ID: ${id}`);
  return record;
}

function ownerFilterForRequest(req) {
  const userId = String(req.user?.user_id || '').trim();
  const isPrivileged = Number(req.user?.role_id) === 1;
  if (!isPrivileged && userId) return { checked_by_user_id: userId };
  return {};
}

function mapHistoryRows(rows, userMap) {
  return rows.map((item) => ({
    id: item.id,
    document_type: item.document_type,
    file_name: item.main_document_name || 'Unknown',
    report_title: item.report_title || item.main_document_name || 'QA/QC Report',
    checked_by: userMap.get(item.checked_by_user_id) || item.checked_by_user_id || 'Unknown',
    created_at: item.created_at,
    updated_at: item.updated_at,
    status: 'Completed',
    score: extractScoreFromMarkdown(item.report_markdown),
    workflow: 'qaqc',
  }));
}

exports.generateProcessReport = async (req, res) => {
  try {
    const mainFiles = req.files?.mainDocument || [];
    const supportFiles = req.files?.supportDocument || [];
    if (!mainFiles.length) return res.status(400).json({ error: 'Main project document is required.' });
    const record = await buildProcessReport({
      documentType: String(req.body?.documentType || '').trim().slice(0, 255),
      reportCategoryOverride: String(req.body?.reportCategory || '').trim(),
      mainFiles,
      supportFiles,
      checkedByUserId: String(req.user?.user_id || '').trim(),
    });
    return res.status(200).json({ report: record });
  } catch (error) {
    return internalError(res, error, 'Failed to generate QA/QC report.');
  }
};

exports.generateProcessReportStream = async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();

  const sendEvent = (event, payload) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  try {
    const mainFiles = req.files?.mainDocument || [];
    const supportFiles = req.files?.supportDocument || [];
    if (!mainFiles.length) {
      sendEvent('error', { message: 'Main project document is required.' });
      sendEvent('done', { ok: false });
      return res.end();
    }
    const documentType = String(req.body?.documentType || '').trim().slice(0, 255);
    sendEvent('log', { line: 'Initializing generation request...' });
    sendEvent('log', { line: `Document type: ${documentType || 'Engineering Document'}` });
    sendEvent('log', { line: `Project document(s) (${mainFiles.length}): ${mainFiles.map((m) => m.originalname).join(', ')}` });
    sendEvent('log', {
      line: supportFiles.length
        ? `Support document(s) (${supportFiles.length}): ${supportFiles.map((s) => s.originalname).join(', ')}`
        : 'Support document(s): Not provided',
    });
    sendEvent('log', { line: 'Submitting request to QA/QC engine...' });

    const record = await buildProcessReport({
      documentType,
      reportCategoryOverride: String(req.body?.reportCategory || '').trim(),
      mainFiles,
      supportFiles,
      checkedByUserId: String(req.user?.user_id || '').trim(),
      onProgress: (line) => sendEvent('log', { line }),
    });

    sendEvent('report', {
      reportId: record.id,
      report: {
        id: record.id,
        document_type: record.document_type,
        main_document_name: record.main_document_name,
        report_title: record.report_title,
        workflow: 'qaqc',
        created_at: record.created_at,
        report_markdown: record.report_markdown,
      },
    });
    sendEvent('done', { ok: true });
    return res.end();
  } catch (error) {
    sendEvent('error', { message: error?.message || 'Failed to generate QA/QC report.' });
    sendEvent('done', { ok: false });
    return res.end();
  }
};

exports.getProcessReportById = async (req, res) => {
  const id = String(req.params?.id || '');
  if (!isReportId(id)) return publicError(res, 400, 'Invalid report id');
  const record = memoryCache.get(id) || (await processReportRepo.findById(id));
  if (!record || !canAccessReport(req, record)) return publicError(res, 404, 'Report not found');
  return res.json({ report: record });
};

exports.getReportDashboardStats = async (req, res) => {
  try {
    const qaqcTotal = await processReportRepo.countWithFilter(ownerFilterForRequest(req));
    return res.json({ qaqcTotal });
  } catch (error) {
    return internalError(res, error, 'Failed to fetch report counts.');
  }
};

exports.getProcessReportHistory = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(500, Math.max(5, parseInt(req.query.limit, 10) || 50));
    const allRows = await processReportRepo.findWithFilter(ownerFilterForRequest(req), { limit: 500 });
    const total = allRows.length;
    const totalPages = Math.max(1, Math.ceil(total / limit) || 1);
    const safePage = Math.min(page, totalPages);
    const pageRows = allRows.slice((safePage - 1) * limit, safePage * limit);
    const userIds = [...new Set(pageRows.map((item) => item.checked_by_user_id).filter(Boolean))];
    const users = userIds.length ? await userRepo.findByUserIds(userIds) : [];
    const userMap = new Map(users.map((user) => [user.user_id, user.username]));
    return res.json({
      history: mapHistoryRows(pageRows, userMap),
      pagination: { page: safePage, limit, total, totalPages },
    });
  } catch (error) {
    return internalError(res, error, 'Failed to fetch report history.');
  }
};

exports.updateProcessReport = async (req, res) => {
  try {
    const id = String(req.params.id || '');
    if (!isReportId(id)) return publicError(res, 400, 'Invalid report id');
    const existing = memoryCache.get(id) || (await processReportRepo.findById(id));
    if (!existing || !canAccessReport(req, existing)) return publicError(res, 404, 'Report not found');
    const updated = await processReportRepo.update(id, {
      report_title: String(req.body?.report_title || existing.report_title || '').slice(0, 500),
      report_markdown: sanitizeMarkdown(req.body?.report_markdown ?? existing.report_markdown),
      report_structured: req.body?.report_structured,
    });
    if (!updated) return publicError(res, 404, 'Report not found');
    memoryCache.set(updated.id, updated);
    audit('report.update', { id, user_id: req.user?.user_id });
    return res.json({ report: updated });
  } catch (error) {
    return internalError(res, error, 'Failed to update report.');
  }
};

exports.deleteProcessReport = async (req, res) => {
  const id = String(req.params?.id || '');
  if (!isReportId(id)) return publicError(res, 400, 'Invalid report id');
  try {
    const record = await processReportRepo.findById(id);
    if (!record || !canAccessReport(req, record)) return publicError(res, 404, 'Report not found');
    await processReportRepo.deleteById(id);
    memoryCache.delete(id);
    audit('report.delete', { id, user_id: req.user?.user_id });
    return res.json({ message: 'Report deleted', id });
  } catch (error) {
    return internalError(res, error, 'Failed to delete report.');
  }
};

exports.downloadProcessReport = async (req, res) => {
  const id = String(req.params?.id || '');
  if (!isReportId(id)) return publicError(res, 400, 'Invalid report id');
  const record = memoryCache.get(id) || (await processReportRepo.findById(id));
  if (!record || !canAccessReport(req, record)) return publicError(res, 404, 'Report not found');
  audit('report.download', { id, user_id: req.user?.user_id });
  streamProcessReportPdf(res, record);
};
