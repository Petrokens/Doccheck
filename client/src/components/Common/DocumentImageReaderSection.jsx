import { useEffect, useMemo, useRef, useState } from 'react';
import ReportMarkdownView from '@/components/Common/ReportMarkdownView';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { openPdfFromFile, previewPageLimit, renderPdfPageSafe } from '@/lib/pdfjsClient';
import { Brain, CheckCircle2, Eye, FileSearch, Loader2, ScanLine } from 'lucide-react';

const PAGE_DWELL_MS = 1600;
const IMAGE_RE = /\.(png|jpe?g|webp|tif|tiff)$/i;
const PDF_RE = /\.pdf$/i;

function detectAiPhase(logs = []) {
  const joined = logs.join('\n').toLowerCase();
  if (/report generated|tokens used|report engine provider/.test(joined)) return 'complete';
  if (/ai engine|preparing ai|rule engine|llm|reviewing document/.test(joined)) return 'ai';
  if (/extract|ocr|parsing|raster|vision page|page\s+\d+/i.test(joined)) return 'ocr';
  return 'idle';
}

/** Collect OCR / vision snippets from server logs, keyed by page number. */
function ocrMarkdownByPage(logs = []) {
  const map = new Map();
  for (const raw of logs) {
    const line = String(raw || '');
    const match = line.match(
      /(?:OCR|Vision|Raster OCR)\s+page\s+(\d+)(?:\s*\/\s*\d+)?\s*(?:\(low embedded text\))?\s*[:.]?\s*(.*)$/i,
    );
    if (!match) continue;
    const pageNum = Number(match[1]) || 0;
    if (!pageNum) continue;
    let body = String(match[2] || '').trim();
    if (!body || /^\(no ocr text\)$/i.test(body) || /^\(empty/i.test(body)) continue;
    if (/^embedded text/i.test(body)) continue;
    if (/recognizing|raster ocr page/i.test(body)) continue;
    const isVision = /^vision\s+page/i.test(line);
    const prev = map.get(pageNum) || { ocr: '', vision: '' };
    if (isVision) prev.vision = body;
    else prev.ocr = body.length > (prev.ocr?.length || 0) ? body : prev.ocr;
    map.set(pageNum, prev);
  }
  return map;
}

function buildPageMarkdown(pageNum, embeddedText, logEntry) {
  const lines = [`## Page ${pageNum}`, ''];
  const embedded = String(embeddedText || '').trim();
  const ocr = String(logEntry?.ocr || '').trim();
  const vision = String(logEntry?.vision || '').trim();

  if (embedded) {
    lines.push('### Embedded text', '', embedded, '');
  }
  if (ocr && ocr !== embedded) {
    lines.push('### OCR text', '', ocr, '');
  }
  if (vision) {
    lines.push('### Image / drawing analysis', '', vision, '');
  }
  if (!embedded && !ocr && !vision) {
    lines.push('_Scanning this page for OCR tokens…_');
  }
  return lines.join('\n').trim();
}

function textFromPdfItems(items = []) {
  let lastY;
  const lines = [];
  let line = '';
  for (const item of items) {
    if (typeof item?.str !== 'string') continue;
    const y = item.transform?.[5];
    if (lastY !== undefined && Math.abs(lastY - y) > 2.5) {
      if (line.trim()) lines.push(line.trim());
      line = item.str;
    } else {
      line += (line && !line.endsWith(' ') && item.str && !item.str.startsWith(' ') ? ' ' : '') + item.str;
    }
    lastY = y;
  }
  if (line.trim()) lines.push(line.trim());
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function PhaseBadge({ phase }) {
  if (phase === 'ai') {
    return (
      <Badge className="gap-1 bg-violet-600 text-white hover:bg-violet-600">
        <Brain className="size-3.5 animate-pulse" /> AI reviewing
      </Badge>
    );
  }
  if (phase === 'ocr') {
    return (
      <Badge className="gap-1 bg-emerald-600 text-white hover:bg-emerald-600">
        <ScanLine className="size-3.5 animate-pulse" /> OCR scanning
      </Badge>
    );
  }
  if (phase === 'complete') {
    return (
      <Badge className="gap-1 bg-sky-700 text-white hover:bg-sky-700">
        <CheckCircle2 className="size-3.5" /> Scan complete
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <Eye className="size-3.5" /> Ready
    </Badge>
  );
}

function PageThumb({ page, active, done, scanning, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative shrink-0 overflow-hidden rounded-md border bg-background text-left transition',
        active ? 'border-primary ring-2 ring-primary/40' : 'border-border hover:border-primary/50',
        done && !active ? 'opacity-90' : '',
      )}
    >
      <div className="relative h-24 w-[4.5rem] bg-muted">
        {page.previewUrl ? (
          <img src={page.previewUrl} alt={`Page ${page.pageNum}`} className="h-full w-full object-cover object-top" />
        ) : (
          <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">P{page.pageNum}</div>
        )}
        {scanning ? <div className="ocr-scan-beam absolute inset-x-0" /> : null}
        {done ? (
          <span className="absolute right-1 top-1 rounded-full bg-emerald-600 p-0.5 text-white">
            <CheckCircle2 className="size-3" />
          </span>
        ) : null}
      </div>
      <div className="border-t px-1.5 py-1 text-center text-[10px] font-medium">P{page.pageNum}</div>
    </button>
  );
}

export default function DocumentImageReaderSection({
  mainDocument,
  supportDocument = null,
  logs = [],
  isGenerating = false,
}) {
  const [pages, setPages] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loadError, setLoadError] = useState('');
  const [isLoadingPages, setIsLoadingPages] = useState(false);
  const [activePage, setActivePage] = useState(1);
  const [scannedThrough, setScannedThrough] = useState(0);
  const [imagePreview, setImagePreview] = useState(null);
  const [loadProgress, setLoadProgress] = useState({ current: 0, total: 0 });
  const [userLocked, setUserLocked] = useState(false);
  const abortRef = useRef(0);
  const objectUrlRef = useRef('');
  const scanCursorRef = useRef(0);
  const thumbStripRef = useRef(null);

  const phase = useMemo(() => {
    if (isGenerating) return detectAiPhase(logs) === 'idle' ? 'ocr' : detectAiPhase(logs);
    if (detectAiPhase(logs) === 'complete') return 'complete';
    return detectAiPhase(logs);
  }, [isGenerating, logs]);

  const logOcrMap = useMemo(() => ocrMarkdownByPage(logs), [logs]);
  const active = pages.find((p) => p.pageNum === activePage) || pages[0] || null;

  const activeMarkdown = useMemo(() => {
    const entry = logOcrMap.get(activePage);
    return buildPageMarkdown(activePage, active?.text || '', entry);
  }, [activePage, active?.text, logOcrMap]);

  const progressPct = useMemo(() => {
    if (!totalPages) {
      if (phase === 'complete') return 100;
      if (isGenerating && phase === 'ai') return 90;
      if (isGenerating) return Math.max(8, Math.round((scannedThrough / Math.max(pages.length, 1)) * 70));
      return 0;
    }
    const scanShare = Math.min(scannedThrough, totalPages) / totalPages;
    if (phase === 'complete') return 100;
    if (phase === 'ai') return Math.min(99, Math.round(70 + scanShare * 25));
    return Math.min(95, Math.round(scanShare * 70));
  }, [totalPages, scannedThrough, pages.length, phase, isGenerating]);

  useEffect(() => {
    if (!mainDocument) {
      setPages([]);
      setTotalPages(0);
      setImagePreview(null);
      setLoadError('');
      setScannedThrough(0);
      setActivePage(1);
      setUserLocked(false);
      scanCursorRef.current = 0;
      return undefined;
    }

    const seq = ++abortRef.current;
    setLoadError('');
    setScannedThrough(0);
    scanCursorRef.current = 0;
    setActivePage(1);
    setUserLocked(false);
    setPages([]);
    setLoadProgress({ current: 0, total: 0 });

    const name = mainDocument.name || '';
    if (IMAGE_RE.test(name)) {
      setIsLoadingPages(false);
      const url = URL.createObjectURL(mainDocument);
      setImagePreview(url);
      setTotalPages(1);
      setPages([{ pageNum: 1, previewUrl: url, text: '', charCount: 0 }]);
      return () => URL.revokeObjectURL(url);
    }

    if (!PDF_RE.test(name)) {
      setIsLoadingPages(false);
      setImagePreview(null);
      setTotalPages(0);
      setPages([]);
      return undefined;
    }

    setIsLoadingPages(true);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = '';
    }

    (async () => {
      try {
        const opened = await openPdfFromFile(mainDocument);
        objectUrlRef.current = opened.objectUrl;
        const { pdf, pdfjsLib } = opened;
        if (seq !== abortRef.current) return;
        const total = pdf.numPages || 0;
        const limit = previewPageLimit(mainDocument.size, total);
        setTotalPages(total);

        const built = [];
        for (let pageNum = 1; pageNum <= limit; pageNum += 1) {
          if (seq !== abortRef.current) return;
          const page = await pdf.getPage(pageNum);
          let text = '';
          try {
            const content = await page.getTextContent();
            text = textFromPdfItems(content.items || []);
          } catch {
            text = '';
          }
          const previewUrl = await renderPdfPageSafe(page, pdfjsLib, pageNum);
          try {
            page.cleanup?.();
          } catch {
            // ignore
          }
          built.push({
            pageNum,
            previewUrl,
            text,
            charCount: text.length,
          });
          setPages([...built]);
          setLoadProgress({ current: pageNum, total: limit });
          if (pageNum === 1) setActivePage(1);
        }
      } catch (err) {
        if (seq !== abortRef.current) return;
        const raw = String(err?.message || 'Could not render document pages.');
        setLoadError(
          /toHex is not a function/i.test(raw)
            ? 'This drawing uses a CAD color space the previewer cannot paint. Analysis can still run — start QA/QC.'
            : raw,
        );
      } finally {
        if (seq === abortRef.current) setIsLoadingPages(false);
      }
    })();

    return () => {
      abortRef.current += 1;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = '';
      }
    };
  }, [mainDocument]);

  // Strict one-by-one page scan: 1 → 2 → 3 … (never jump ahead)
  useEffect(() => {
    if (!pages.length) return undefined;

    if (!isGenerating) {
      if (phase === 'complete') {
        scanCursorRef.current = pages.length;
        setScannedThrough(pages.length);
      }
      return undefined;
    }

    // Begin at page 1
    if (scanCursorRef.current < 1) {
      scanCursorRef.current = 1;
      setScannedThrough(1);
      if (!userLocked) setActivePage(1);
    }

    const timer = setInterval(() => {
      if (scanCursorRef.current >= pages.length) return;
      scanCursorRef.current += 1;
      const next = scanCursorRef.current;
      setScannedThrough(next);
      if (!userLocked) setActivePage(next);
    }, PAGE_DWELL_MS);

    return () => clearInterval(timer);
  }, [isGenerating, pages.length, phase, userLocked]);

  // Keep active thumbnail in view
  useEffect(() => {
    const strip = thumbStripRef.current;
    if (!strip) return;
    const btn = strip.querySelector(`[data-page="${activePage}"]`);
    btn?.scrollIntoView?.({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [activePage]);

  // When generation starts, unlock auto page follow
  useEffect(() => {
    if (isGenerating) {
      setUserLocked(false);
      scanCursorRef.current = 0;
      setScannedThrough(0);
      setActivePage(1);
    }
  }, [isGenerating]);

  if (!mainDocument) return null;

  const aiLines = logs
    .filter((line) => /ai|rule engine|llm|token|provider|reviewing|preparing ai/i.test(line))
    .slice(-8);

  const scanningNow = isGenerating && scannedThrough < pages.length;
  const showBeam = isGenerating && (scanningNow || phase === 'ocr' || phase === 'ai');

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3 border-b bg-muted/30">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileSearch className="size-4 text-primary" />
            Advanced OCR & AI Image Analysis
          </CardTitle>
          <CardDescription className="mt-1">
            {mainDocument.name}
            {supportDocument ? ` · support: ${supportDocument.name}` : ''}
            {totalPages ? ` · ${totalPages} page${totalPages === 1 ? '' : 's'}` : ''}
            {pages.length && totalPages > pages.length ? ` (previewing first ${pages.length})` : ''}
          </CardDescription>
        </div>
        <PhaseBadge phase={isGenerating ? phase : phase === 'complete' ? 'complete' : 'idle'} />
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {isGenerating
                ? scanningNow
                  ? `Scanning page ${activePage} of ${pages.length || totalPages || '…'} (one by one)`
                  : phase === 'ai'
                    ? 'Page scan complete — AI deep review in progress'
                    : 'Finalizing OCR markdown…'
                : phase === 'complete'
                  ? 'Document scan finished'
                  : isLoadingPages
                    ? `Preparing page previews (${loadProgress.current}/${loadProgress.total || '…'})`
                    : 'Waiting to start analysis'}
            </span>
            <span className="font-mono">{progressPct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all duration-500',
                phase === 'ai' ? 'bg-violet-600' : 'bg-primary',
                isGenerating ? 'ocr-progress-pulse' : '',
              )}
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="relative overflow-hidden rounded-xl border bg-[#0b1220] shadow-inner">
              <div className="flex items-center justify-between border-b border-white/10 px-3 py-2 text-[11px] text-emerald-300/90">
                <span className="font-mono">
                  PAGE {activePage}
                  {totalPages ? ` / ${totalPages}` : ''}
                </span>
                <span className="font-mono uppercase tracking-wider">
                  {isGenerating ? (scanningNow ? 'OCR PASS' : phase === 'ai' ? 'AI PASS' : 'OCR PASS') : 'PREVIEW'}
                </span>
              </div>

              <div className="relative flex min-h-[280px] items-center justify-center bg-[radial-gradient(circle_at_top,#132033,#0b1220)] p-4">
                {isLoadingPages && !pages.length ? (
                  <div className="flex flex-col items-center gap-2 text-emerald-300/80">
                    <Loader2 className="size-6 animate-spin" />
                    <p className="text-xs">Rendering document pages…</p>
                  </div>
                ) : loadError ? (
                  <p className="max-w-sm text-center text-sm text-amber-200">{loadError}</p>
                ) : active?.previewUrl || imagePreview ? (
                  <>
                    <img
                      src={active?.previewUrl || imagePreview}
                      alt={`Scanning page ${activePage}`}
                      className="max-h-[360px] w-auto max-w-full rounded-md object-contain shadow-lg shadow-black/40"
                    />
                    {showBeam ? (
                      <div className="pointer-events-none absolute inset-4 overflow-hidden rounded-md">
                        <div className="ocr-scan-beam" />
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.05)_1px,transparent_1px)] bg-[length:100%_8px] opacity-40" />
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="flex max-w-sm flex-col items-center gap-2 px-4 text-center text-emerald-200/80">
                    <ScanLine className="size-8 opacity-70" />
                    <p className="text-sm font-medium">Document ready for server OCR</p>
                    <p className="text-xs text-emerald-200/60">
                      Page preview is available for PDFs and images.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {pages.length > 1 ? (
              <div ref={thumbStripRef} className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {pages.map((page) => (
                  <div key={page.pageNum} data-page={page.pageNum}>
                    <PageThumb
                      page={page}
                      active={page.pageNum === activePage}
                      done={page.pageNum <= scannedThrough}
                      scanning={isGenerating && page.pageNum === activePage && scanningNow}
                      onClick={() => {
                        setUserLocked(true);
                        setActivePage(page.pageNum);
                      }}
                    />
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-3 lg:col-span-5">
            <div className="rounded-xl border bg-card">
              <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <ScanLine className="size-3.5 text-emerald-600" />
                  OCR markdown · page {activePage}
                </div>
                {isGenerating && !userLocked ? (
                  <button
                    type="button"
                    className="text-[10px] text-primary underline-offset-2 hover:underline"
                    onClick={() => setUserLocked(true)}
                  >
                    Pause auto
                  </button>
                ) : isGenerating && userLocked ? (
                  <button
                    type="button"
                    className="text-[10px] text-primary underline-offset-2 hover:underline"
                    onClick={() => setUserLocked(false)}
                  >
                    Follow scan
                  </button>
                ) : null}
              </div>
              <div className="max-h-52 overflow-auto px-3 py-3">
                <ReportMarkdownView markdown={activeMarkdown} variant="compact" />
              </div>
              <div className="border-t px-3 py-2 text-[11px] text-muted-foreground">
                {active?.charCount || logOcrMap.get(activePage)?.ocr
                  ? `${(active?.charCount || logOcrMap.get(activePage)?.ocr?.length || 0).toLocaleString()} characters on this page`
                  : scanningNow
                    ? `OCR pass on page ${activePage}…`
                    : 'Waiting for page OCR markdown'}
              </div>
            </div>

            <div className="rounded-xl border bg-card">
              <div className="flex items-center gap-2 border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Brain className={cn('size-3.5', phase === 'ai' ? 'animate-pulse text-violet-600' : 'text-violet-600')} />
                AI analysis stream
              </div>
              <div className="min-h-[9rem] space-y-1.5 bg-[#0b1220] px-3 py-3 font-mono text-[11px] leading-5 text-emerald-300">
                {aiLines.length ? (
                  aiLines.map((line, idx) => (
                    <p key={`${idx}-${line.slice(0, 24)}`} className="break-words">
                      ▸ {line}
                    </p>
                  ))
                ) : (
                  <p className="text-emerald-400/60">
                    {isGenerating
                      ? scanningNow
                        ? `OCR page ${activePage} — AI review starts after all pages…`
                        : 'Starting AI review…'
                      : 'Start QA/QC analysis to watch pages scan one by one.'}
                  </p>
                )}
                {isGenerating ? <span className="inline-block h-3.5 w-1.5 animate-pulse bg-emerald-400 align-middle" /> : null}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'Pages', value: totalPages || (IMAGE_RE.test(mainDocument.name || '') ? 1 : '—') },
                { label: 'Scanned', value: Math.min(scannedThrough, pages.length || scannedThrough) || 0 },
                {
                  label: 'Stage',
                  value: scanningNow ? `P${activePage}` : phase === 'ai' ? 'AI' : phase === 'complete' ? 'Done' : 'Idle',
                },
              ].map((item) => (
                <div key={item.label} className="rounded-lg border bg-muted/40 px-2 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{item.label}</div>
                  <div className="mt-0.5 text-sm font-semibold">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
