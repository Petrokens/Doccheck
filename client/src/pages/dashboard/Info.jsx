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

const CHECKS = [
  {
    id: 'Check-1',
    title: 'Standard completeness',
    icon: ClipboardCheck,
    body: 'Fixed document-control checks: title block, revision, scope, references, and approval trail before the package is treated as issue-ready.',
  },
  {
    id: 'Check-2',
    title: 'Technical deep review',
    icon: FileSearch,
    body: 'Discipline questions on design conditions, safeguarding, data completeness, operability, and constructability, tagged and scored against the uploaded text.',
  },
  {
    id: 'Rule engine',
    title: '~4,000-rule library',
    icon: Library,
    body: 'The engine auto-detects document type and discipline, then runs 50–300 relevant rules. Each rule is OK, Partial, Not OK, or N/A with Critical / Major / Minor severity.',
  },
];

const STEPS = [
  { n: 1, label: 'Pick a discipline', detail: 'Open Process, Piping, Pipeline, or another workspace from the sidebar.' },
  { n: 2, label: 'Upload the deliverable', detail: 'PDF, Word, or image. Optional support file for specs or previous revisions.' },
  { n: 3, label: 'Run analysis', detail: 'Live console shows extraction, OCR if needed, and Check-1 / Check-2 / rule execution.' },
  { n: 4, label: 'Review and export', detail: 'Read the scored report, then save to History or print a PDF.' },
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
      <header className="rounded-2xl border border-[#c4d2f0] bg-white p-6 dark:border-dash-border dark:bg-dash-surface">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a8794] dark:text-slate-400">
          Workspace · Info
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#0B4D99] dark:text-white">Petrolenz QA/QC</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#4f6490] dark:text-dash-muted">
          AI QC checker for engineering documents. Upload a deliverable, run Check-1 (standard completeness),
          Check-2 (technical review), and the ~4,000-rule library, then store a scored report and export PDF.
          This product is document quality assurance only — it does not replace qualified engineering judgment.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to={QA_QC_PROCESS}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0B4D99] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083a73] dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <UploadCloud size={16} />
            Start a QA/QC review
          </Link>
          <Link
            to={`${QA_QC_BASE}/history`}
            className="inline-flex items-center gap-2 rounded-xl border border-[#c4d2f0] bg-[#f7faff] px-4 py-2 text-sm font-semibold text-[#0B4D99] hover:bg-[#e8f0ff] dark:border-dash-border dark:bg-dash-surface-elevated dark:text-white"
          >
            <BookOpen size={16} />
            Open History
          </Link>
        </div>
      </header>

      <section>
        <h2 className="text-lg font-bold text-[#0B4D99] dark:text-white">How a review is scored</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {CHECKS.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.id}
                className="rounded-2xl border border-[#c4d2f0] bg-white p-5 dark:border-dash-border dark:bg-dash-surface"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#e8f0ff] text-[#0B4D99] dark:bg-dash-surface-elevated dark:text-blue-300">
                  <Icon size={18} />
                </span>
                <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-[#7a8794] dark:text-slate-400">
                  {item.id}
                </p>
                <h3 className="mt-1 text-base font-semibold text-[#0B4D99] dark:text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#4f6490] dark:text-dash-muted">{item.body}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-2xl border border-[#c4d2f0] bg-white p-5 dark:border-dash-border dark:bg-dash-surface">
        <h2 className="text-lg font-bold text-[#0B4D99] dark:text-white">Workflow</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2">
          {STEPS.map((step) => (
            <li key={step.n} className="flex gap-3 rounded-xl border border-[#c3d1ee] bg-[#f7faff] p-3 dark:border-dash-border dark:bg-dash-surface-elevated">
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0B4D99] text-xs font-bold text-white dark:bg-blue-600">
                {step.n}
              </span>
              <div>
                <p className="text-sm font-semibold text-[#29457b] dark:text-white">{step.label}</p>
                <p className="mt-0.5 text-sm text-[#4f6490] dark:text-dash-muted">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2 className="text-lg font-bold text-[#0B4D99] dark:text-white">Disciplines</h2>
        <p className="mt-1 text-sm text-[#4f6490] dark:text-dash-muted">
          Each workspace infers document type from the file (PFD, P&amp;ID, isometric, datasheet, HAZOP, and others) or lets you pick it manually.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DISCIPLINES.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="rounded-full border border-[#c4d2f0] bg-white px-3 py-1.5 text-sm font-medium text-[#0B4D99] hover:bg-[#e8f0ff] dark:border-dash-border dark:bg-dash-surface dark:text-blue-200 dark:hover:bg-dash-surface-elevated"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-[#c4d2f0] bg-white p-5 dark:border-dash-border dark:bg-dash-surface">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#0B4D99] dark:text-white">
            <ShieldCheck size={18} />
            Scoring
          </h2>
          <ul className="mt-3 space-y-2 text-sm">
            {SCORES.map(([name, detail]) => (
              <li key={name} className="flex gap-2">
                <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-blue-600 dark:text-blue-300" />
                <span className="text-[#4f6490] dark:text-dash-muted">
                  <strong className="font-semibold text-[#29457b] dark:text-white">{name}.</strong> {detail}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {STATUS_POINTS.map((row) => (
              <div key={row.status} className="rounded-xl border border-[#c3d1ee] bg-[#f7faff] px-3 py-2 dark:border-dash-border dark:bg-dash-surface-elevated">
                <p className="text-[11px] uppercase tracking-wide text-[#7a8794] dark:text-slate-400">{row.status}</p>
                <p className="text-sm font-semibold text-[#0B4D99] dark:text-white">{row.score}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-[#c4d2f0] bg-white p-5 dark:border-dash-border dark:bg-dash-surface">
          <h2 className="flex items-center gap-2 text-lg font-bold text-[#0B4D99] dark:text-white">
            <FileText size={18} />
            Report output
          </h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-[#4f6490] dark:text-dash-muted">
            {REPORT_SECTIONS.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-sm text-[#4f6490] dark:text-dash-muted">
            <Printer size={16} className="text-[#0B4D99] dark:text-blue-300" />
            Print or download PDF from the completed report or History.
          </p>
        </div>
      </section>

      <section className="rounded-2xl border border-[#c4d2f0] bg-white p-5 dark:border-dash-border dark:bg-dash-surface">
        <h2 className="text-lg font-bold text-[#0B4D99] dark:text-white">Final verdict</h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {VERDICTS.map(([label, detail]) => (
            <div key={label} className="rounded-xl border border-[#c3d1ee] bg-[#f7faff] px-4 py-3 dark:border-dash-border dark:bg-dash-surface-elevated">
              <p className="text-sm font-semibold text-[#29457b] dark:text-white">{label}</p>
              <p className="mt-0.5 text-sm text-[#4f6490] dark:text-dash-muted">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#c4d2f0] bg-white p-5 dark:border-dash-border dark:bg-dash-surface">
        <h2 className="text-lg font-bold text-[#0B4D99] dark:text-white">Scope</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Included</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#4f6490] dark:text-dash-muted">
              <li>Single-document QA/QC with optional support file</li>
              <li>OCR for scanned PDFs, drawings, and images</li>
              <li>Stored reports, History, AI QC Inbox, and PDF export</li>
              <li>Role-based access for users, roles, and audit log</li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9a6b1f] dark:text-amber-300">Not in this product</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[#4f6490] dark:text-dash-muted">
              <li>TBE / bid evaluation</li>
              <li>Standalone cross-document comparison suites</li>
              <li>Constructability or revision-impact copilots</li>
              <li>Replacement for PE / licensed engineering sign-off</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
