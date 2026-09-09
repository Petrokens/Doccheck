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
import { validateUploadFile } from '@/lib/uploadSafety';
import {
  AlertTriangle,
  CheckCircle2,
  FileSearch,
  FileText,
  FileUp,
  Printer,
  Share2,
  UploadCloud,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const DEFAULT_INITIAL_LOGS = [
  'DocCheck AI Engine Ready',
  'OCR scanner ready for scanned PDFs, drawings, and images.',
  'Awaiting project document upload.',
];

async function getPdfPageCount(file) {
  if (!file?.name?.toLowerCase().endsWith('.pdf')) return null;
  try {
    const pdfjsLib = await import('pdfjs-dist');
    if (pdfjsLib?.GlobalWorkerOptions) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
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
    if (!file) {
      setMainDocument(null);
      setSupportDocument(null);
      setError('');
      setDocumentType('');
      setDocumentTypeSource('');
      setIsDetectingType(false);
      return;
    }
    const check = validateUploadFile(file);
    if (!check.ok) {
      setError(check.reason);
      return;
    }
    setMainDocument(file);
    setSupportDocument(null);
    setError('');
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
      const message = err?.response?.data?.error || err?.message || 'Failed to generate report.';
      setError(message);
      pushLog(`Error: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

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

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 border-b">
          <div>
            <CardTitle className="text-xl md:text-2xl">{pageTitle}</CardTitle>
            <CardDescription className="mt-1">{pageDescription}</CardDescription>
          </div>
          {report ? <Badge variant="secondary">Completed</Badge> : null}
        </CardHeader>
        <CardContent>
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
                    done || active ? 'border-primary bg-primary/10' : 'border-border bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${done || active ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
                      {step.id}
                    </span>
                    <Icon size={14} className={done || active ? 'text-primary' : 'text-muted-foreground'} />
                    <span className="text-xs font-medium">{step.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-12 gap-6">
        <Card className="col-span-12 lg:col-span-7">
          <CardContent className="space-y-5">
            {showDocumentTypeSelector ? (
              <div className="space-y-1.5">
                <Label>Engineering Document Type</Label>
                <Select
                  value={documentType || undefined}
                  onValueChange={(value) => {
                    setDocumentType(value);
                    setDocumentTypeSource('manual');
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={isDetectingType ? 'Detecting from file…' : 'Select document type (or upload a file)'} />
                  </SelectTrigger>
                  <SelectContent>
                    {documentTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {documentType && documentTypeSource === 'auto' ? (
                  <p className="text-xs text-muted-foreground">Auto-selected from the uploaded file. You can change it.</p>
                ) : documentType && documentTypeSource === 'default' ? (
                  <p className="text-xs text-muted-foreground">Default type selected — change it if this file is a different deliverable.</p>
                ) : !documentType ? (
                  <p className="text-xs text-muted-foreground">Upload a file and we will pick the matching type automatically.</p>
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
                isDragOver ? 'border-primary bg-primary/10' : 'border-border bg-muted/40'
              }`}
            >
              <UploadCloud className="mx-auto mb-3 text-muted-foreground" size={34} />
              <p className="mb-4 text-sm text-muted-foreground">Drag and drop your file here — type is selected automatically</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.csv,.md,.png,.jpg,.jpeg,.webp,.tif,.tiff"
                onChange={(e) => handleProjectDocumentChange(e.target.files?.[0] || null)}
                className="hidden"
              />
              <Button type="button" onClick={() => fileInputRef.current?.click()}>
                Choose File
              </Button>
              {mainDocument ? <p className="mt-3 truncate text-xs font-medium text-emerald-600 dark:text-emerald-300">{mainDocument.name}</p> : null}
            </div>

            {mainDocument ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium">Support Document</div>
                  <div className="truncate text-xs text-muted-foreground">{supportDocument ? supportDocument.name : 'Not attached'}</div>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setIsSupportModalOpen(true)}>
                  {supportDocument ? 'Change' : 'Add'}
                </Button>
              </div>
            ) : null}

            {error ? (
              <Alert variant="destructive">
                <AlertTriangle />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <Button type="button" onClick={handleGenerate} disabled={!canGenerate} className="w-full sm:w-auto">
              {isGenerating ? generatingButtonLabel : generateButtonLabel}
            </Button>
          </CardContent>
        </Card>

        <Card className="col-span-12 bg-[#0b1220] text-emerald-400 lg:col-span-5 dark:bg-[#0a0e16]">
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-emerald-400">Processing Console</CardTitle>
            <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">{isGenerating ? 'Running' : 'Idle'}</Badge>
          </CardHeader>
          <CardContent>
            <div ref={consoleBodyRef} className="h-[320px] overflow-auto rounded-[var(--radius)] border border-border bg-dash-console p-3 font-mono text-xs leading-6 text-dash-console-text">
              <pre className="whitespace-pre-wrap break-words">
                {terminalOutput}
                <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-emerald-400 align-middle" />
              </pre>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                onClick={() => setIsReportModalOpen(true)}
                disabled={!report?.id || isGenerating}
              >
                Open Report
              </Button>
              <Button
                type="button"
                variant="outline"
                className="text-white"
                onClick={() => report?.id && printProcessReportPdf(report.id).catch((e) => setError(e.message))}
                disabled={!report?.id || isGenerating}
              >
                <Printer /> Print
              </Button>
            </div>
          </CardContent>
        </Card>

        {mainDocument ? (
          <div className="col-span-12">
            <DocumentImageReaderSection mainDocument={mainDocument} logs={logs} />
          </div>
        ) : null}
      </div>

      <Dialog open={isSupportModalOpen} onOpenChange={setIsSupportModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Support Document</DialogTitle>
            <DialogDescription>Optional references to improve report quality.</DialogDescription>
          </DialogHeader>
          <Input
            type="file"
            accept=".pdf,.docx,.txt,.csv,.md,.png,.jpg,.jpeg,.webp,.tif,.tiff"
            onChange={(e) => {
              const next = e.target.files?.[0] || null;
              if (!next) {
                setSupportDocument(null);
                return;
              }
              const check = validateUploadFile(next);
              if (!check.ok) {
                setError(check.reason);
                return;
              }
              setSupportDocument(next);
            }}
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setSupportDocument(null); setIsSupportModalOpen(false); }}>Skip</Button>
            <Button type="button" onClick={() => setIsSupportModalOpen(false)}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(isReportModalOpen && report)} onOpenChange={setIsReportModalOpen}>
        <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col overflow-hidden sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Report</DialogTitle>
            <DialogDescription>Report ID {report?.id} · Press Esc to close</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-sm">Document Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">File Name</span><span>{mainDocument?.name || 'N/A'}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Document Type</span><span>{resolvedDocumentType || 'N/A'}</span></div>
                <div className="flex justify-between gap-3"><span className="text-muted-foreground">Number of Pages</span><span>{isPageCountLoading ? 'Detecting...' : (mainDocumentPageCount ?? 'N/A')}</span></div>
              </CardContent>
            </Card>
            <div className="mb-4 flex flex-wrap gap-2">
              <Button type="button" onClick={() => reportMarkdownAnchorRef.current?.scrollIntoView({ behavior: 'smooth' })}>
                <FileText /> Open report
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={async () => { const latest = await fetchProcessReport(report.id); setReport(latest); }}>Refresh</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => printProcessReportPdf(report.id)}><Printer /> Print PDF</Button>
              <Button type="button" variant="outline" size="sm"><Share2 /> Share</Button>
            </div>
            <div ref={reportMarkdownAnchorRef}>
              <Card>
                <CardContent className="pt-4">
                  <ReportMarkdownView markdown={report?.report_markdown} />
                </CardContent>
              </Card>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
