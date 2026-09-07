import { useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchProcessReport,
  generateProcessReportStream,
  printProcessReportPdf,
} from '@/services/processReportService';
import ReportMarkdownView from '@/components/Common/ReportMarkdownView';
import DocumentImageReaderSection from '@/components/Common/DocumentImageReaderSection';
import {
  inferDocumentTypeFromFile,
} from '@/utils/inferQaQcDocumentType';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  FileSearch,
  FileText,
  FileUp,
  Printer,
  Share2,
  UploadCloud,
  X,
} from 'lucide-react';

const DEFAULT_INITIAL_LOGS = [
  'Petrolenz Engine v4.2 Ready',
  'OCR scanner ready for scanned PDFs, drawings, and images.',
  'Awaiting project document upload.',
];

async function getPdfPageCount(file) {
  if (!file?.name?.toLowerCase().endsWith('.pdf')) return null;
  try {
    const pdfjsLib = await import('pdfjs-dist');
    if (pdfjsLib?.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version || '4.4.168'}/build/pdf.worker.min.mjs`;
    }
    const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    return pdf.numPages || null;
  } catch {
    return null;
  }
}

export default function Process({
  pageTitle = 'Process Document QA/QC',
  pageDescription = 'Upload your engineering document and generate a structured QA/QC report.',
  documentTypes = [],
  initialLogs = DEFAULT_INITIAL_LOGS,
  reportCategory,
  showDocumentTypeSelector = true,
  implicitDocumentType = 'Engineering Document',
  generateButtonLabel = 'Start QA/QC Analysis',
  generatingButtonLabel = 'Generating QA/QC Report...',
} = {}) {
  const [documentType, setDocumentType] = useState('');
  const [documentTypeSource, setDocumentTypeSource] = useState('');
  const [isDetectingType, setIsDetectingType] = useState(false);
  const [isDocTypeOpen, setIsDocTypeOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [mainDocument, setMainDocument] = useState(null);
  const [supportDocument, setSupportDocument] = useState(null);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportModalSeenForMain, setSupportModalSeenForMain] = useState('');
  const [logs, setLogs] = useState(initialLogs);
  const [isGenerating, setIsGenerating] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [mainDocumentPageCount, setMainDocumentPageCount] = useState(null);
  const [isPageCountLoading, setIsPageCountLoading] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const docTypeDropdownRef = useRef(null);
  const consoleBodyRef = useRef(null);
  const reportMarkdownAnchorRef = useRef(null);
  const inferSeqRef = useRef(0);
  const fileInputRef = useRef(null);

  const resolvedDocumentType = showDocumentTypeSelector ? documentType : implicitDocumentType;
  const canGenerate = Boolean(resolvedDocumentType && mainDocument && !isGenerating);
  const activeStep = report ? 4 : isGenerating ? 3 : mainDocument ? 2 : 1;
  const pushLog = (line) => setLogs((prev) => [...prev, line]);
  const terminalOutput = useMemo(() => logs.join('\n'), [logs]);

  const applyInferredDocumentType = (result, seq) => {
    if (seq !== inferSeqRef.current) return;
    setIsDetectingType(false);
    if (!showDocumentTypeSelector || !result?.type) {
      setDocumentTypeSource((prev) => (prev === 'detecting' ? '' : prev));
      return;
    }
    setDocumentType(result.type);
    setDocumentTypeSource(result.source === 'default' ? 'default' : 'auto');
    if (result.source === 'default') {
      pushLog(`No strong type match — selected default: ${result.type}. Change it if needed.`);
    } else {
      pushLog(
        `Detected document type: ${result.type} (${
          result.source === 'document' ? 'document text' : 'file name'
        }).`,
      );
    }
  };

  const handleProjectDocumentChange = (file) => {
    const seq = ++inferSeqRef.current;
    setMainDocument(file || null);
    setSupportDocument(null);
    setError('');
    if (!file) {
      setDocumentType('');
      setDocumentTypeSource('');
      setIsDetectingType(false);
      return;
    }
    const key = file.name || '';
    if (key && key !== supportModalSeenForMain) {
      setSupportModalSeenForMain(key);
      setIsSupportModalOpen(true);
    }
    if (!showDocumentTypeSelector) return;

    setIsDetectingType(true);
    setDocumentTypeSource('detecting');
    inferDocumentTypeFromFile(file, documentTypes)
      .then((result) => applyInferredDocumentType(result, seq))
      .catch(() => {
        const fallback = documentTypes?.[0] || '';
        applyInferredDocumentType(
          fallback ? { type: fallback, source: 'default' } : { type: '', source: '' },
          seq,
        );
      });
  };

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setIsGenerating(true);
    setError('');
    setReport(null);
    setLogs(initialLogs);
    try {
      let receivedReport = null;
      await generateProcessReportStream(
        {
          documentType: resolvedDocumentType,
          mainDocument,
          supportDocument,
          reportCategory,
        },
        {
          onLog: (line) => line && pushLog(line),
          onReport: (nextReport) => {
            receivedReport = nextReport;
            setReport(nextReport);
          },
          onError: (message) => {
            throw new Error(message || 'Failed to generate report.');
          },
        },
      );
      if (!receivedReport) throw new Error('Report generation completed without report data.');
      pushLog(`Report generated successfully. Report ID: ${receivedReport.id}`);
    } catch (err) {
      const message = err?.response?.data?.details || err?.response?.data?.error || err?.message || 'Failed to generate report.';
      setError(message);
      pushLog(`Error: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (!docTypeDropdownRef.current?.contains(event.target)) setIsDocTypeOpen(false);
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    if (consoleBodyRef.current) consoleBodyRef.current.scrollTop = consoleBodyRef.current.scrollHeight;
  }, [terminalOutput]);

  useEffect(() => {
    let active = true;
    if (!mainDocument) {
      setMainDocumentPageCount(null);
      return undefined;
    }
    setIsPageCountLoading(mainDocument.name?.toLowerCase().endsWith('.pdf'));
    getPdfPageCount(mainDocument).then((count) => {
      if (!active) return;
      setMainDocumentPageCount(count);
      setIsPageCountLoading(false);
    });
    return () => {
      active = false;
    };
  }, [mainDocument]);

  useEffect(() => {
    if (!isReportModalOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') setIsReportModalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isReportModalOpen]);

  return (
    <div className="space-y-6 p-4 text-gray-800 dark:text-dash-text md:p-6">
      <div className="rounded-2xl border border-[#c4d2f0] bg-white shadow-lg shadow-blue-100/50 dark:border-dash-border dark:bg-dash-surface dark:shadow-none">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#cfd9ee] px-5 py-4 dark:border-dash-border">
          <div>
            <h1 className="text-xl font-semibold text-[#0f1d44] dark:text-white md:text-2xl">{pageTitle}</h1>
            <p className="mt-1 text-sm text-[#5d6f9d] dark:text-dash-muted">{pageDescription}</p>
          </div>
          {report ? (
            <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-300">Completed</span>
          ) : null}
        </div>
        <div className="px-5 py-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { id: 1, label: 'Upload Document', icon: UploadCloud },
              { id: 2, label: 'Processing', icon: FileSearch },
              { id: 3, label: 'Review Report', icon: FileUp },
              { id: 4, label: 'Complete', icon: CheckCircle2 },
            ].map((step) => {
              const done = activeStep > step.id;
              const active = activeStep === step.id;
              const Icon = step.icon;
              return (
                <div
                  key={step.id}
                  className={`rounded-xl border px-3 py-2 ${
                    done || active
                      ? 'border-blue-500 bg-blue-500/15 dark:border-blue-400 dark:bg-blue-600/25'
                      : 'border-[#c3d1ee] bg-[#f7faff] dark:border-dash-border dark:bg-dash-surface-elevated'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${done || active ? 'bg-blue-600 text-white' : 'bg-[#e5ecff] text-[#5570aa] dark:bg-[#2a364a] dark:text-slate-200'}`}>
                      {step.id}
                    </span>
                    <Icon size={14} className={done || active ? 'text-blue-600 dark:text-blue-300' : 'text-[#6480bc] dark:text-slate-300'} />
                    <span className="text-xs font-medium text-[#415e99] dark:text-white">{step.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        <div className="col-span-12 space-y-5 rounded-2xl border border-[#c4d2f0] bg-white p-5 dark:border-dash-border dark:bg-dash-surface lg:col-span-7">
          {showDocumentTypeSelector ? (
            <div>
              <label className="mb-2 block text-sm font-medium text-[#3c5a95] dark:text-white">
                Engineering Document Type
              </label>
              <div ref={docTypeDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsDocTypeOpen((p) => !p)}
                  className="flex w-full items-center justify-between rounded-lg border border-[#bdcceb] bg-[#f8fbff] px-3 py-2.5 text-left text-sm dark:border-dash-border dark:bg-dash-surface-elevated dark:text-white"
                >
                  <span>{isDetectingType ? 'Detecting from file…' : documentType || 'Select document type (or upload a file)'}</span>
                  <ChevronDown size={16} className="text-[#6f88be] dark:text-slate-300" />
                </button>
                {isDocTypeOpen ? (
                  <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-[#bdcceb] bg-white shadow-lg dark:border-dash-border dark:bg-[#1c2533]">
                    {documentTypes.map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setDocumentType(type);
                          setDocumentTypeSource('manual');
                          setIsDocTypeOpen(false);
                        }}
                        className={`w-full px-3 py-2 text-left text-sm ${
                          documentType === type
                            ? 'bg-blue-600 text-white'
                            : 'text-[#29457b] hover:bg-[#e8f0ff] dark:text-slate-100 dark:hover:bg-[#243044]'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              {documentType && documentTypeSource === 'auto' ? (
                <p className="mt-1.5 text-xs text-[#5d7ab0] dark:text-slate-300">Auto-selected from the uploaded file. You can change it.</p>
              ) : documentType && documentTypeSource === 'default' ? (
                <p className="mt-1.5 text-xs text-[#5d7ab0] dark:text-slate-300">Default type selected — change it if this file is a different deliverable.</p>
              ) : !documentType ? (
                <p className="mt-1.5 text-xs text-[#6d86b8] dark:text-slate-300">Upload a file and we will pick the matching type automatically.</p>
              ) : null}
            </div>
          ) : null}

          <div
            onDragEnter={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
            onDragLeave={(e) => {
              e.preventDefault();
              if (!e.currentTarget.contains(e.relatedTarget)) setIsDragOver(false);
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragOver(false);
              const file = e.dataTransfer?.files?.[0];
              if (file) handleProjectDocumentChange(file);
            }}
            className={`rounded-xl border-2 border-dashed p-6 text-center ${
              isDragOver
                ? 'border-blue-500 bg-blue-100/70 dark:bg-blue-600/20'
                : 'border-[#b9cbed] bg-[#f6f9ff] dark:border-blue-400/80 dark:bg-dash-surface-elevated'
            }`}
          >
            <UploadCloud className="mx-auto mb-3 text-[#6783bf] dark:text-blue-300" size={34} />
            <p className="mb-4 text-sm text-[#385793] dark:text-slate-100">Drag and drop your file here — type is selected automatically</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.csv,.md,.png,.jpg,.jpeg,.webp,.tif,.tiff"
              onChange={(e) => handleProjectDocumentChange(e.target.files?.[0] || null)}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-semibold text-white hover:bg-blue-500"
            >
              Choose File
            </button>
            {mainDocument ? <p className="mt-3 truncate text-xs font-medium text-emerald-600 dark:text-emerald-300">{mainDocument.name}</p> : null}
          </div>

          {mainDocument ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-[#c3d1ee] bg-[#f7faff] px-3 py-2 dark:border-dash-border dark:bg-dash-surface-elevated">
              <div className="min-w-0">
                <div className="text-sm font-medium text-[#1a3062] dark:text-white">Support Document</div>
                <div className="truncate text-xs text-[#647eb4] dark:text-slate-300">{supportDocument ? supportDocument.name : 'Not attached'}</div>
              </div>
              <button type="button" onClick={() => setIsSupportModalOpen(true)} className="shrink-0 rounded-lg border border-[#9bb3e4] px-3 py-2 text-sm font-medium text-[#2e4f8f] dark:border-slate-400 dark:text-white">
                {supportDocument ? 'Change' : 'Add'}
              </button>
            </div>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-600">
              <AlertTriangle size={16} className="mt-0.5" />
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 font-semibold text-white hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {isGenerating ? generatingButtonLabel : generateButtonLabel}
          </button>
        </div>

        <div className="col-span-12 rounded-2xl border border-[#c4d2f0] bg-[#0b1220] p-4 dark:border-dash-border dark:bg-[#0a0e16] lg:col-span-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-semibold text-emerald-400">Processing Console</h2>
            <span className="rounded-full border border-emerald-500/40 px-2 py-0.5 text-[11px] text-emerald-300">{isGenerating ? 'Running' : 'Idle'}</span>
          </div>
          <div ref={consoleBodyRef} className="h-[320px] overflow-auto rounded-lg border border-[#2a3548] bg-black p-3 font-mono text-xs leading-6 text-emerald-400">
            <pre className="whitespace-pre-wrap break-words">
              {terminalOutput}
              <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-emerald-400 align-middle" />
            </pre>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setIsReportModalOpen(true)}
              disabled={!report?.id || isGenerating}
              className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                report?.id && !isGenerating
                  ? 'bg-blue-600 text-white hover:bg-blue-500'
                  : 'border border-slate-500 text-slate-400'
              }`}
            >
              Open Report
            </button>
            <button
              type="button"
              onClick={() => report?.id && printProcessReportPdf(report.id).catch((e) => setError(e.message))}
              disabled={!report?.id || isGenerating}
              className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-400 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10 disabled:opacity-40"
            >
              <Printer size={14} /> Print
            </button>
          </div>
        </div>

        {mainDocument ? (
          <div className="col-span-12">
            <DocumentImageReaderSection mainDocument={mainDocument} logs={logs} />
          </div>
        ) : null}
      </div>

      {isSupportModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <button type="button" aria-label="Close" onClick={() => setIsSupportModalOpen(false)} className="absolute inset-0 bg-black/50" />
          <div className="relative w-full max-w-lg rounded-2xl border bg-white p-5 shadow-xl dark:border-dash-border dark:bg-dash-surface dark:text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold">Add Support Document</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-slate-300">Optional references to improve report quality.</p>
              </div>
              <button type="button" onClick={() => setIsSupportModalOpen(false)}>✕</button>
            </div>
            <input
              type="file"
              accept=".pdf,.docx,.txt,.csv,.md,.png,.jpg,.jpeg,.webp,.tif,.tiff"
              onChange={(e) => setSupportDocument(e.target.files?.[0] || null)}
              className="mt-4 block w-full text-sm"
            />
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => { setSupportDocument(null); setIsSupportModalOpen(false); }} className="rounded-lg border px-4 py-2">Skip</button>
              <button type="button" onClick={() => setIsSupportModalOpen(false)} className="rounded-lg bg-blue-600 px-4 py-2 text-white">Continue</button>
            </div>
          </div>
        </div>
      ) : null}

      {isReportModalOpen && report ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
          <button type="button" aria-label="Close report modal" onClick={() => setIsReportModalOpen(false)} className="absolute inset-0 bg-black/55" />
          <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#c4d2f0] bg-white shadow-2xl dark:border-dash-border dark:bg-dash-surface">
            <div className="flex items-center justify-between border-b px-4 py-3 dark:border-dash-border">
              <div>
                <h2 className="text-base font-semibold text-[#153063] dark:text-white">Report</h2>
                <p className="text-xs text-[#627ab1] dark:text-slate-300">Report ID {report.id} · Press Esc to close</p>
              </div>
              <button type="button" onClick={() => setIsReportModalOpen(false)} className="rounded-lg border p-2 dark:border-dash-border dark:text-white"><X size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8fbff] p-4 dark:bg-[#0b0f16] sm:p-6">
              <div className="mb-4 rounded-2xl border bg-white p-4 dark:border-dash-border dark:bg-dash-surface">
                <h3 className="mb-3 text-sm font-semibold dark:text-white">Document Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3"><span className="text-[#627ab1] dark:text-slate-300">File Name</span><span className="dark:text-white">{mainDocument?.name || 'N/A'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-[#627ab1] dark:text-slate-300">Document Type</span><span className="dark:text-white">{resolvedDocumentType || 'N/A'}</span></div>
                  <div className="flex justify-between gap-3"><span className="text-[#627ab1] dark:text-slate-300">Number of Pages</span><span className="dark:text-white">{isPageCountLoading ? 'Detecting...' : (mainDocumentPageCount ?? 'N/A')}</span></div>
                </div>
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                <button type="button" onClick={() => reportMarkdownAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })} className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
                  <FileText size={16} /> Open report
                </button>
                <button type="button" onClick={async () => { const latest = await fetchProcessReport(report.id); setReport(latest); }} className="rounded-lg border px-3 py-2 text-xs dark:border-slate-400 dark:text-white">Refresh</button>
                <button type="button" onClick={() => printProcessReportPdf(report.id)} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs dark:border-slate-400 dark:text-white"><Printer size={14} /> Print PDF</button>
                <button type="button" className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs dark:border-slate-400 dark:text-white"><Share2 size={14} /> Share</button>
              </div>
              <div ref={reportMarkdownAnchorRef} className="rounded-xl border bg-white p-4 dark:border-dash-border dark:bg-dash-surface">
                <ReportMarkdownView markdown={report.report_markdown} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
