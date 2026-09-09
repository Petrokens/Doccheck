import { Link } from 'react-router-dom';
import {
  BookOpen,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  FileText,
  Library,
  Printer,
  ShieldCheck,
  UploadCloud,
} from 'lucide-react';
import { QA_QC_BASE, QA_QC_PROCESS } from '@/lib/dashboardPaths';
import {
  BRAND_CHECK_1,
  BRAND_CHECK_2,
  BRAND_NAME,
  BRAND_OUTPUT,
  BRAND_PIPELINE,
  BRAND_RULES,
  BRAND_SUBTITLE,
  BRAND_TAGLINE,
} from '@/lib/brandCopy';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const CHECKS = [
  {
    id: 'Check-1',
    title: 'Standard Completeness',
    icon: ClipboardCheck,
    body: 'Fixed document-control checks: title block, revision, scope, references, and approval trail before the package is treated as issue-ready.',
  },
  {
    id: 'Check-2',
    title: 'Technical Review',
    icon: FileSearch,
    body: 'Discipline questions on design conditions, safeguarding, data completeness, operability, and constructability, tagged and scored against the uploaded text.',
  },
  {
    id: 'Rule engine',
    title: '4,000+ Rules',
    icon: Library,
    body: 'Engineering quality & compliance rules. The engine auto-detects document type and discipline, then runs 50–300 relevant rules. Each rule is OK, Partial, Not OK, or N/A with Critical / Major / Minor severity.',
  },
];

const STEPS = [
  { n: 1, label: 'Upload', detail: 'Upload the engineering deliverable (PDF, Word, or image). Optional support file for specs or previous revisions.' },
  { n: 2, label: 'Analyze', detail: 'Live console shows extraction, OCR if needed, and document-type detection.' },
  { n: 3, label: 'Validate', detail: 'Run Check-1 (Standard Completeness) and Check-2 (Technical Review) against the package.' },
  { n: 4, label: 'Score', detail: 'Apply 4,000+ engineering quality & compliance rules and compute weighted QA/QC scores.' },
  { n: 5, label: 'Report', detail: 'Review the scored report, save to History, and export PDF.' },
];

const DISCIPLINES = [
  { label: 'Process', path: `${QA_QC_BASE}/process` },
  { label: 'Piping', path: `${QA_QC_BASE}/piping` },
  { label: 'Pipeline', path: `${QA_QC_BASE}/pipeline` },
  { label: 'Civil & Structural', path: `${QA_QC_BASE}/civil-structural` },
  { label: 'Mechanical — Rotating', path: `${QA_QC_BASE}/mechanical-rotating` },
  { label: 'Mechanical — Static', path: `${QA_QC_BASE}/mechanical-static` },
  { label: 'Electrical', path: `${QA_QC_BASE}/electrical` },
  { label: 'HVAC', path: `${QA_QC_BASE}/hvac` },
  { label: 'Instrumentation', path: `${QA_QC_BASE}/instrumentation` },
  { label: 'Telecom', path: `${QA_QC_BASE}/telecom` },
  { label: 'HSE', path: `${QA_QC_BASE}/hse` },
  { label: 'General', path: `${QA_QC_BASE}/general-discipline` },
];

const SCORES = [
  ['QA Score', 'Completeness of document control and Check-1 items'],
  ['Technical Score', 'Check-2 technical questions'],
  ['Rule Score', 'Applicable rules from the library'],
  ['Interface Score', 'Cross-file consistency when a support document is attached'],
  ['Final QC Score', 'Weighted percentage used for History and PDF'],
];

const VERDICTS = [
  ['Approved', 'No blocking findings'],
  ['Approved with Comments', 'Minor or major comments; package can proceed with actions'],
  ['Rework Required', 'Gaps that must be closed before issue'],
  ['Rejected', 'Critical failures or incomplete package'],
];

const REPORT_SECTIONS = [
  'Report header (document identity, revision, discipline)',
  'Executive summary dashboard',
  'Check-1 completeness table',
  'Check-2 technical review table',
  'Rule engine results',
  'Consolidated scoring and final verdict',
  'Findings by priority (Critical / Major / Minor)',
];

const STATUS_POINTS = [
  { status: 'OK', score: '10' },
  { status: 'Partial', score: '7.5' },
  { status: 'Not OK', score: '0' },
  { status: 'N/A', score: 'Excluded' },
];

export default function Info() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Workspace · Info
          </p>
          <CardTitle className="text-2xl">{BRAND_NAME}</CardTitle>
          <CardDescription className="max-w-3xl text-sm leading-relaxed">
            {BRAND_SUBTITLE}. {BRAND_TAGLINE}. {BRAND_PIPELINE}.
            {' '}{BRAND_CHECK_1}. {BRAND_CHECK_2}. {BRAND_RULES}. {BRAND_OUTPUT}.
            This product is document quality assurance only — it does not replace qualified engineering judgment.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to={QA_QC_PROCESS}>
              <UploadCloud />
              Start a QA/QC review
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`${QA_QC_BASE}/history`}>
              <BookOpen />
              Open History
            </Link>
          </Button>
        </CardContent>
      </Card>

      <section>
        <h2 className="font-heading text-lg font-semibold">How a review is scored</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {CHECKS.map((item) => {
            const Icon = item.icon;
            return (
              <Card key={item.id}>
                <CardHeader>
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon size={18} />
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {item.id}
                  </p>
                  <CardTitle>{item.title}</CardTitle>
                  <CardDescription>{item.body}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="grid gap-3 sm:grid-cols-2">
            {STEPS.map((step) => (
              <li key={step.n} className="flex gap-3 rounded-xl border bg-muted/40 p-3">
                <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {step.n}
                </span>
                <div>
                  <p className="text-sm font-semibold">{step.label}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{step.detail}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <section>
        <h2 className="font-heading text-lg font-semibold">Disciplines</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Each workspace infers document type from the file (PFD, P&amp;ID, isometric, datasheet, HAZOP, and others) or lets you pick it manually.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DISCIPLINES.map((item) => (
            <Button key={item.path} asChild variant="outline" size="sm" className="rounded-full">
              <Link to={item.path}>{item.label}</Link>
            </Button>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck size={18} />
              Scoring
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {SCORES.map(([name, detail]) => (
                <li key={name} className="flex gap-2">
                  <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-primary" />
                  <span className="text-muted-foreground">
                    <strong className="font-semibold text-foreground">{name}.</strong> {detail}
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {STATUS_POINTS.map((row) => (
                <div key={row.status} className="rounded-xl border bg-muted/40 px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{row.status}</p>
                  <p className="text-sm font-semibold">{row.score}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText size={18} />
              Report output
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
              {REPORT_SECTIONS.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
            <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Printer size={16} className="text-primary" />
              Print or download PDF from the completed report or History.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Final verdict</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {VERDICTS.map(([label, detail]) => (
            <div key={label} className="rounded-xl border bg-muted/40 px-4 py-3">
              <p className="text-sm font-semibold">{label}</p>
              <p className="mt-0.5 text-sm text-muted-foreground">{detail}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Scope</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <Badge variant="secondary">Included</Badge>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>Single-document QA/QC with optional support file</li>
              <li>OCR for scanned PDFs, drawings, and images</li>
              <li>Stored reports, History, AI QC Inbox, and PDF export</li>
              <li>Role-based access for users, roles, and audit log</li>
            </ul>
          </div>
          <div>
            <Badge variant="outline">Not in this product</Badge>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              <li>TBE / bid evaluation</li>
              <li>Standalone cross-document comparison suites</li>
              <li>Constructability or revision-impact copilots</li>
              <li>Replacement for PE / licensed engineering sign-off</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
