import { useParams, Link } from 'react-router-dom';
import { useEffect, useRef, useState, useCallback } from 'react';
import { Bot, FileText, Loader2, Paperclip, Send, User } from 'lucide-react';
import api from '@/lib/axios';
import { getChecklistItemsForDepartment } from '../departmentChecklistData';

let messageId = 0;
const nextId = () => {
  messageId += 1;
  return messageId;
};

/** Broad accept for file picker; DWG/DXF often report as octet-stream — we also check extension. */
const FILE_INPUT_ACCEPT =
  'image/*,.pdf,.doc,.docx,.xls,.xlsx,.xlsm,.ppt,.pptx,.dwg,.dxf,.txt,.rtf,.csv,.vsd,.vsdx,.zip';

const DOCUMENT_EXT = /\.(pdf|docx?|xlsm?|xlsx?|pptx?|dwg|dxf|txt|rtf|csv|vsdx?|zip)$/i;

function isImageFile(file) {
  if (!file) return false;
  if (file.type.startsWith('image/')) return true;
  return /\.(jpe?g|png|gif|webp|bmp|svg|tif|tiff)$/i.test(file.name);
}

function isAllowedUpload(file) {
  if (!file) return false;
  if (isImageFile(file)) return true;
  return DOCUMENT_EXT.test(file.name);
}

function fileKindLabel(fileName) {
  const m = fileName?.match(/\.([^.]+)$/i);
  return (m?.[1] || 'file').toUpperCase();
}

function formatBytes(n) {
  if (n == null || Number.isNaN(n)) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function getScoreColor(score) {
  if (score >= 90) return 'bg-green-500';
  if (score >= 75) return 'bg-yellow-500';
  if (score >= 50) return 'bg-orange-500';
  return 'bg-red-600';
}

function buildPlainReportText({ checklistTitle, fileName, qc, summary, findings }) {
  const lines = [
    `Checklist: ${checklistTitle || '—'}`,
    `File reviewed: ${fileName || '—'}`,
    `QC score: ${qc.score}%`,
    `Passed: ${qc.passed} / 20 · Failed: ${qc.failed} / 20`,
    '',
    '--- Summary ---',
    summary.replace(/\*\*/g, ''),
  ];
  if (findings?.length) {
    lines.push('', '--- Findings ---');
    findings.forEach((f, i) => lines.push(`${i + 1}. ${f}`));
  }
  return lines.join('\n');
}

export default function ChecklistDetail() {
  const { department = 'process', id } = useParams();
  const [title, setTitle] = useState('');
  const [supportDocuments, setSupportDocuments] = useState('');
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [pendingFile, setPendingFile] = useState(null);
  const [pendingPreviewUrl, setPendingPreviewUrl] = useState(null);
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [expandedReportId, setExpandedReportId] = useState(null);

  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const blobUrlsRef = useRef(new Set());

  const registerBlobUrl = useCallback((url) => {
    if (url?.startsWith('blob:')) blobUrlsRef.current.add(url);
  }, []);

  const clearPendingAttachment = useCallback(() => {
    setPendingPreviewUrl((url) => {
      if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
        blobUrlsRef.current.delete(url);
      }
      return null;
    });
    setPendingFile(null);
  }, []);

  useEffect(() => {
    blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    blobUrlsRef.current.clear();
    setPendingPreviewUrl(null);
    setPendingFile(null);

    const items = getChecklistItemsForDepartment(department);
    const idx = Number.parseInt(id, 10);
    const checklist = Number.isFinite(idx) ? items[idx] : undefined;
    const nextTitle = checklist?.title || 'Checklist Detail';
    setTitle(nextTitle);
    setSupportDocuments(checklist?.supportDocuments || '');
    setInputText('');
    setExpandedReportId(null);
    setIsAssistantTyping(false);
    setMessages([
      {
        id: nextId(),
        role: 'assistant',
        text: `Hi — I can review **${nextTitle}** against your upload. **Attach a PDF, Word (.docx), image (PNG/JPEG), or .txt file**, add an optional note, then **Send**. QC uses your server AI on the file you provide (no external document links).`,
      },
    ]);
  }, [department, id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAssistantTyping]);

  useEffect(
    () => () => {
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current.clear();
    },
    [],
  );

  const attachFile = (file) => {
    if (!file || !isAllowedUpload(file)) {
      window.alert(
        'Unsupported file type. Use images, PDF, Word, Excel, PowerPoint, DWG/DXF, Visio, text/CSV, or ZIP.',
      );
      return;
    }
    clearPendingAttachment();
    setPendingFile(file);
    if (isImageFile(file)) {
      const url = URL.createObjectURL(file);
      registerBlobUrl(url);
      setPendingPreviewUrl(url);
    }
  };

  const handlePickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    attachFile(file);
  };

  const handlePasteFile = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file && (item.type.startsWith('image/') || isAllowedUpload(file))) {
          e.preventDefault();
          attachFile(file);
          break;
        }
      }
    }
  };

  const handleSend = async () => {
    const trimmed = inputText.trim();
    if (!pendingFile) return;

    const fileForApi = pendingFile;
    let userMessage;

    const img = isImageFile(pendingFile);
    if (img && pendingPreviewUrl) {
      userMessage = {
        id: nextId(),
        role: 'user',
        text: trimmed || null,
        attachment: { kind: 'image', name: pendingFile.name, previewUrl: pendingPreviewUrl },
      };
      setPendingFile(null);
      setPendingPreviewUrl(null);
    } else {
      const downloadUrl = URL.createObjectURL(pendingFile);
      registerBlobUrl(downloadUrl);
      userMessage = {
        id: nextId(),
        role: 'user',
        text: trimmed || null,
        attachment: {
          kind: 'document',
          name: pendingFile.name,
          label: fileKindLabel(pendingFile.name),
          size: pendingFile.size,
          downloadUrl,
        },
      };
      setPendingFile(null);
      setPendingPreviewUrl(null);
    }

    const sourceFileName = userMessage.attachment?.name || null;
    const checklistTitleSnapshot = title;

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setExpandedReportId(null);
    setIsAssistantTyping(true);

    try {
      const form = new FormData();
      form.append('checklistTitle', title);
      form.append('supportDocuments', supportDocuments || '');
      form.append('userNote', trimmed);
      form.append('department', department);
      form.append('file', fileForApi);

      const { data } = await api.post('/qc/checklist-review', form, {
        timeout: 120000,
      });

      const assistantId = nextId();
      setMessages((prev) => [
        ...prev,
        {
          id: assistantId,
          role: 'assistant',
          text: data.summary,
          qc: { score: data.score, passed: data.passed, failed: data.failed },
          findings: Array.isArray(data.findings) ? data.findings : [],
          reportSourceFile: sourceFileName,
          reportChecklistTitle: checklistTitleSnapshot,
        },
      ]);
      setExpandedReportId(assistantId);
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.details ||
        err?.message ||
        'Request failed';
      setMessages((prev) => [
        ...prev,
        {
          id: nextId(),
          role: 'assistant',
          text: `**Review could not be completed.** ${msg}`,
          qc: null,
        },
      ]);
    } finally {
      setIsAssistantTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md max-w-5xl mx-auto flex flex-col min-h-[calc(100vh-8rem)]">
      <div className="shrink-0 mb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-blue-800 dark:text-blue-400 mb-2 leading-snug">{title}</h1>
        {supportDocuments ? (
          <details className="rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80 px-3 py-2 text-sm">
            <summary className="cursor-pointer font-semibold text-gray-800 dark:text-gray-200">
              Typical supporting documents (optional reference)
            </summary>
            <p className="mt-2 text-gray-600 dark:text-gray-300 leading-relaxed pl-1">{supportDocuments}</p>
          </details>
        ) : null}
      </div>

      <div className="flex-1 flex flex-col min-h-0 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-950/40 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2 sm:gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                }`}
              >
                {m.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${
                  m.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-100 dark:border-gray-700 rounded-tl-sm'
                }`}
              >
                {m.attachment?.kind === 'image' && m.attachment.previewUrl ? (
                  <div className="mb-2">
                    <img
                      src={m.attachment.previewUrl}
                      alt={m.attachment.name}
                      className="max-h-48 w-full object-contain rounded-lg bg-black/5 dark:bg-black/20"
                    />
                    <p className={`text-xs mt-1 ${m.role === 'user' ? 'text-blue-100' : 'text-gray-500'}`}>
                      {m.attachment.name}
                    </p>
                  </div>
                ) : null}
                {m.attachment?.kind === 'document' ? (
                  <div
                    className={`mb-2 flex items-center gap-3 rounded-lg px-3 py-2 ${
                      m.role === 'user' ? 'bg-blue-500/90 text-white' : 'bg-gray-100 dark:bg-gray-700'
                    }`}
                  >
                    <FileText className="w-8 h-8 shrink-0 opacity-90" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{m.attachment.name}</p>
                      <p className={`text-xs ${m.role === 'user' ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {m.attachment.label}
                        {m.attachment.size != null ? ` · ${formatBytes(m.attachment.size)}` : ''}
                      </p>
                      {m.attachment.downloadUrl ? (
                        <a
                          href={m.attachment.downloadUrl}
                          download={m.attachment.name}
                          className={`text-xs underline mt-1 inline-block ${
                            m.role === 'user' ? 'text-white' : 'text-blue-600 dark:text-blue-400'
                          }`}
                        >
                          Download copy
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                {m.text ? (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed [&_strong]:font-semibold">
                    {m.text.split('**').map((part, i) =>
                      i % 2 === 1 ? (
                        <strong key={`${m.id}-b-${i}`}>{part}</strong>
                      ) : (
                        <span key={`${m.id}-t-${i}`}>{part}</span>
                      ),
                    )}
                  </p>
                ) : null}
                {m.qc ? (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-2">
                    <p className="text-sm font-semibold">
                      QC score:{' '}
                      <span className="text-blue-600 dark:text-blue-400">{m.qc.score}%</span>
                    </p>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-2 rounded-full ${getScoreColor(m.qc.score)}`}
                        style={{ width: `${m.qc.score}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-300">
                      Passed: <span className="text-green-600 font-medium">{m.qc.passed}</span> / 20 · Failed:{' '}
                      <span className="text-red-500 font-medium">{m.qc.failed}</span> / 20
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedReportId((cur) => (cur === m.id ? null : m.id))
                        }
                        className="text-xs px-2 py-1 rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600"
                      >
                        {expandedReportId === m.id ? 'Hide' : 'Open'} full report
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
          {isAssistantTyping ? (
            <div className="flex gap-3">
              <div className="shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <Bot className="w-4 h-4 text-gray-600 dark:text-gray-300" />
              </div>
              <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing…
              </div>
            </div>
          ) : null}
          <div ref={chatEndRef} />
        </div>

        <div className="shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 sm:p-4">
          {pendingFile ? (
            <div className="mb-3 flex items-start gap-2">
              {pendingPreviewUrl && isImageFile(pendingFile) ? (
                <div className="relative inline-block">
                  <img
                    src={pendingPreviewUrl}
                    alt="Pending upload"
                    className="h-20 w-auto max-w-[200px] object-cover rounded-lg border border-gray-200 dark:border-gray-600"
                  />
                  <button
                    type="button"
                    onClick={clearPendingAttachment}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold leading-6 text-center shadow"
                    aria-label="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-2 pr-8 relative">
                  <FileText className="w-6 h-6 text-gray-600 dark:text-gray-300 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{pendingFile.name}</p>
                    <p className="text-xs text-gray-500">
                      {fileKindLabel(pendingFile.name)} · {formatBytes(pendingFile.size)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={clearPendingAttachment}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs font-bold leading-6 text-center"
                    aria-label="Remove attachment"
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ) : null}
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end">
            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_INPUT_ACCEPT}
              className="hidden"
              onChange={handlePickFile}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="shrink-0 inline-flex items-center justify-center gap-2 h-10 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Paperclip className="w-4 h-4" />
              Attach file
            </button>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              onPaste={handlePasteFile}
              rows={2}
              placeholder="Optional note (requires an attached file to run QC)."
              className="flex-1 min-h-[2.5rem] max-h-32 resize-y rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={isAssistantTyping || !pendingFile}
              className="shrink-0 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white text-sm font-medium"
            >
              <Send className="w-4 h-4" />
              Send
            </button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Attach a file to run QC (required). Use text-based PDF, .docx, images, or .txt/.csv. The full report opens below the chat with a Download .txt option — no external links.
          </p>
        </div>
      </div>

      {(() => {
        const reportMsg = messages.find((m) => m.id === expandedReportId && m.qc);
        if (!reportMsg) return null;
        const plain = buildPlainReportText({
          checklistTitle: reportMsg.reportChecklistTitle,
          fileName: reportMsg.reportSourceFile,
          qc: reportMsg.qc,
          summary: reportMsg.text || '',
          findings: reportMsg.findings,
        });
        const safeName = (reportMsg.reportSourceFile || 'qc-report').replace(/[^\w.\-]+/g, '_');
        return (
          <div className="mt-4 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-900 shadow-md shrink-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/80">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                QC report — {reportMsg.reportChecklistTitle || title}
              </h2>
              <button
                type="button"
                onClick={() => {
                  const blob = new Blob([plain], { type: 'text/plain;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `${safeName}-qc-report.txt`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="text-xs px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Download .txt
              </button>
            </div>
            <div className="p-4 max-h-[min(70vh,520px)] overflow-y-auto text-sm text-gray-800 dark:text-gray-200 space-y-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                File reviewed: <span className="font-medium text-gray-700 dark:text-gray-300">{reportMsg.reportSourceFile || '—'}</span>
              </p>
              <div>
                <p className="font-semibold mb-1">
                  Score {reportMsg.qc.score}% · Passed {reportMsg.qc.passed}/20 · Failed {reportMsg.qc.failed}/20
                </p>
                <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full overflow-hidden max-w-md">
                  <div
                    className={`h-2 rounded-full ${getScoreColor(reportMsg.qc.score)}`}
                    style={{ width: `${reportMsg.qc.score}%` }}
                  />
                </div>
              </div>
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                  Summary
                </h3>
                <p className="whitespace-pre-wrap leading-relaxed [&_strong]:font-semibold">
                  {(reportMsg.text || '').split('**').map((part, i) =>
                    i % 2 === 1 ? (
                      <strong key={`rep-b-${i}`}>{part}</strong>
                    ) : (
                      <span key={`rep-t-${i}`}>{part}</span>
                    ),
                  )}
                </p>
              </div>
              {reportMsg.findings?.length ? (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-2">
                    Findings
                  </h3>
                  <ul className="list-disc pl-5 space-y-1.5 text-gray-700 dark:text-gray-300">
                    {reportMsg.findings.map((f, i) => (
                      <li key={`f-${i}`}>{f}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </div>
        );
      })()}

      <div className="shrink-0 mt-6">
        <Link to={`/dashboard/${department}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
          ← Back to all checklists
        </Link>
      </div>
    </div>
  );
}
