import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Clock,
  Eye,
  LayoutGrid,
  Printer,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import ConfirmDialog from '@/components/Common/ConfirmDialog';
import ReportMarkdownView from '@/components/Common/ReportMarkdownView';
import { QA_QC_PROCESS } from '@/lib/dashboardPaths';
import {
  deleteProcessReport,
  fetchProcessHistory,
  fetchProcessReport,
  printProcessReportPdf,
} from '@/services/processReportService';

function isSameDay(value) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function scoreMeta(score) {
  if (score == null) {
    return {
      label: 'Unscored',
      value: '—',
      text: 'text-[#7a8794] dark:text-slate-400',
      badge: 'bg-[#eef2f7] text-[#5d6f9d] dark:bg-[#243044] dark:text-slate-300',
    };
  }
  if (score >= 90) {
    return {
      label: 'Approved',
      value: `${score}%`,
      text: 'text-emerald-600 dark:text-emerald-400',
      badge: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    };
  }
  if (score >= 75) {
    return {
      label: 'With comments',
      value: `${score}%`,
      text: 'text-amber-600 dark:text-amber-400',
      badge: 'bg-amber-500/15 text-amber-800 dark:text-amber-300',
    };
  }
  return {
    label: 'Rework',
    value: `${score}%`,
    text: 'text-red-600 dark:text-red-400',
    badge: 'bg-red-500/15 text-red-700 dark:text-red-300',
  };
}

function matchesScoreBand(score, band) {
  if (band === 'all') return true;
  if (band === 'high') return score != null && score >= 90;
  if (band === 'medium') return score != null && score >= 75 && score < 90;
  if (band === 'low') return score != null && score < 75;
  if (band === 'none') return score == null;
  return true;
}

export default function History({ title = 'QA/QC History' }) {
  const [params, setParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('All');
  const [scoreBand, setScoreBand] = useState('all');
  const [view, setView] = useState('table');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [syncedAt, setSyncedAt] = useState(null);

  const loadHistory = () => {
    setLoading(true);
    setError('');
    fetchProcessHistory({ page: 1, limit: 500 })
      .then((data) => {
        setHistory(data.history || []);
        setSyncedAt(new Date());
      })
      .catch((err) => setError(err?.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape' && (report || reportLoading || params.get('id'))) closeReport();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [report, reportLoading, params]);

  useEffect(() => {
    const id = params.get('id');
    if (!id) {
      setReport(null);
      setReportLoading(false);
      return undefined;
    }
    let active = true;
    setReportLoading(true);
    fetchProcessReport(id)
      .then((data) => {
        if (active) setReport(data);
      })
      .catch((err) => {
        if (active) setError(err?.response?.data?.error || err.message);
      })
      .finally(() => {
        if (active) setReportLoading(false);
      });
    return () => {
      active = false;
    };
  }, [params]);

  const departments = useMemo(
    () => ['All', ...Array.from(new Set(history.map((item) => item.document_type).filter(Boolean)))],
    [history],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return history.filter((entry) => {
      if (department !== 'All' && entry.document_type !== department) return false;
      if (!matchesScoreBand(entry.score, scoreBand)) return false;
      if (!needle) return true;
      return [entry.file_name, entry.report_title, entry.checked_by, entry.document_type]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [history, department, scoreBand, query]);

  const stats = useMemo(() => {
    const scored = history.filter((item) => item.score != null);
    const avg = scored.length
      ? Math.round(scored.reduce((sum, item) => sum + item.score, 0) / scored.length)
      : null;
    return {
      total: history.length,
      today: history.filter((item) => isSameDay(item.created_at)).length,
      departments: new Set(history.map((item) => item.document_type).filter(Boolean)).size,
      avg,
    };
  }, [history]);

  const selectableIds = filtered.map((entry) => entry.id).filter(Boolean);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const openReport = (id) => {
    const next = new URLSearchParams(params);
    next.set('id', String(id));
    setParams(next, { replace: true });
  };

  const closeReport = () => {
    const next = new URLSearchParams(params);
    next.delete('id');
    setParams(next, { replace: true });
    setReport(null);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await Promise.all(selectedIds.map((id) => deleteProcessReport(id)));
      setHistory((prev) => prev.filter((entry) => !selectedIds.includes(entry.id)));
      setSelectedIds([]);
      setConfirmOpen(false);
      if (selectedIds.includes(params.get('id'))) closeReport();
      toast.success('Reports deleted.');
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message);
    } finally {
      setDeleting(false);
    }
  };

  const printReport = (id) => {
    printProcessReportPdf(id).catch((err) => toast.error(err.message || 'Failed to print PDF'));
  };

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a8794] dark:text-slate-400">
            Workspace · Archive
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-[#0f1d44] dark:text-white">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#5d6f9d] dark:text-dash-muted">
            Stored QA/QC reports with scores, reviewers, and PDF export. Open a report to review findings or delete records you no longer need.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-[#7a8794] dark:text-slate-300">
            Last synced: {syncedAt ? syncedAt.toLocaleTimeString() : '—'}
          </p>
          <button
            type="button"
            onClick={loadHistory}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#c4d2f0] px-3 py-1.5 text-xs font-semibold text-[#2e4f8f] hover:bg-[#e8f0ff] dark:border-dash-border dark:text-white dark:hover:bg-dash-surface-elevated"
          >
            <RefreshCw size={13} /> Refresh
          </button>
          <Link
            to={QA_QC_PROCESS}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B4D99] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#083a73] dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <UploadCloud size={13} /> New review
          </Link>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Stored reports', value: stats.total, tone: 'text-[#0f1d44] dark:text-white' },
          { label: 'Average QC score', value: stats.avg == null ? '—' : `${stats.avg}%`, tone: 'text-blue-600 dark:text-blue-400' },
          { label: 'Reviewed today', value: stats.today, tone: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Departments', value: stats.departments, tone: 'text-[#0B4D99] dark:text-blue-300' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#c4d2f0] bg-white px-4 py-3 dark:border-dash-border dark:bg-dash-surface">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a8794] dark:text-slate-400">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${card.tone}`}>{loading ? '—' : card.value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#c4d2f0] bg-white dark:border-dash-border dark:bg-dash-surface">
        <div className="flex flex-col gap-3 border-b border-[#cfd9ee] px-4 py-3 dark:border-dash-border">
          <div className="flex min-w-0 items-center gap-2 rounded-lg border border-[#c4d2f0] bg-[#f8fbff] px-3 py-1.5 dark:border-dash-border dark:bg-dash-surface-elevated">
            <Search size={14} className="text-[#7a8794]" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search file, reviewer, or document type"
              className="w-full bg-transparent text-sm text-[#0f1d44] outline-none placeholder:text-[#8a9bb8] dark:text-white"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-xs text-[#5d6f9d] dark:text-slate-300">
              Department
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="rounded-lg border border-[#c4d2f0] bg-white px-2 py-1.5 text-sm dark:border-dash-border dark:bg-dash-surface-elevated dark:text-white"
              >
                {departments.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-xs text-[#5d6f9d] dark:text-slate-300">
              Score
              <select
                value={scoreBand}
                onChange={(e) => setScoreBand(e.target.value)}
                className="rounded-lg border border-[#c4d2f0] bg-white px-2 py-1.5 text-sm dark:border-dash-border dark:bg-dash-surface-elevated dark:text-white"
              >
                <option value="all">All</option>
                <option value="high">Approved (≥90)</option>
                <option value="medium">With comments (75–89)</option>
                <option value="low">Rework (&lt;75)</option>
                <option value="none">Unscored</option>
              </select>
            </label>
            <div className="flex rounded-lg border border-[#c4d2f0] dark:border-dash-border">
              <button
                type="button"
                aria-label="Table view"
                onClick={() => setView('table')}
                className={`p-1.5 ${view === 'table' ? 'bg-blue-600 text-white' : 'text-[#415e99] dark:text-slate-200'}`}
              >
                <Table2 size={14} />
              </button>
              <button
                type="button"
                aria-label="Card view"
                onClick={() => setView('cards')}
                className={`p-1.5 ${view === 'cards' ? 'bg-blue-600 text-white' : 'text-[#415e99] dark:text-slate-200'}`}
              >
                <LayoutGrid size={14} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedIds(allSelected ? [] : selectableIds)}
              disabled={!selectableIds.length}
              className="rounded-lg border border-[#c4d2f0] px-3 py-1.5 text-xs font-semibold text-[#2e4f8f] disabled:opacity-50 dark:border-dash-border dark:text-white"
            >
              {allSelected ? 'Clear selection' : `Select all (${selectableIds.length})`}
            </button>
            <button
              type="button"
              disabled={!selectedIds.length}
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Trash2 size={12} /> Delete ({selectedIds.length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="h-36 animate-pulse rounded-lg bg-[#e8eef8] dark:bg-[#1c2533]" />
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="flex flex-col items-center px-4 py-12 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f0ff] text-[#0B4D99] dark:bg-dash-surface-elevated dark:text-blue-300">
              <Clock size={22} />
            </span>
            <p className="mt-3 text-sm font-semibold text-[#153063] dark:text-white">
              {history.length ? 'No reports match these filters.' : 'No report history yet.'}
            </p>
            <p className="mt-1 max-w-md text-sm text-[#5d6f9d] dark:text-dash-muted">
              {history.length
                ? 'Try a different search, department, or score band.'
                : 'Run a discipline review and the scored report will appear here for later viewing and PDF export.'}
            </p>
            {!history.length ? (
              <Link
                to={QA_QC_PROCESS}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#0B4D99] px-4 py-2 text-sm font-semibold text-white hover:bg-[#083a73] dark:bg-blue-600"
              >
                <UploadCloud size={16} /> Start a QA/QC review
              </Link>
            ) : null}
          </div>
        ) : view === 'table' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#e8eef8] text-xs uppercase tracking-wide text-[#415e99] dark:bg-[#1c2533] dark:text-slate-200">
                <tr>
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelectedIds(allSelected ? [] : selectableIds)}
                      aria-label="Select all reports"
                    />
                  </th>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Checked by</th>
                  <th className="hidden px-4 py-3 lg:table-cell">Checked at</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="sticky right-0 bg-[#e8eef8] px-4 py-3 text-right dark:bg-[#1c2533]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const meta = scoreMeta(entry.score);
                  return (
                    <tr key={entry.id} className="border-t border-[#e4ebf7] odd:bg-white even:bg-[#f7faff] dark:border-[#2a3548] dark:odd:bg-[#151b27] dark:even:bg-[#1a2230]">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(entry.id)}
                          onChange={() => toggleSelected(entry.id)}
                          aria-label={`Select ${entry.file_name}`}
                        />
                      </td>
                      <td className="max-w-[280px] px-4 py-3">
                        <p className="truncate font-medium text-[#0f1d44] dark:text-white">{entry.file_name}</p>
                        <p className="truncate text-xs text-[#7a8794] dark:text-slate-400">{entry.report_title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex max-w-[180px] truncate rounded-full bg-blue-600/15 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-600/25 dark:text-blue-300">
                          {entry.document_type || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#415e99] dark:text-slate-200">{entry.checked_by || '—'}</td>
                      <td className="hidden px-4 py-3 text-[#5d6f9d] dark:text-slate-300 lg:table-cell">
                        {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <p className={`text-sm font-bold ${meta.text}`}>{meta.value}</p>
                          <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>{meta.label}</span>
                        </div>
                      </td>
                      <td className="sticky right-0 bg-inherit px-3 py-3">
                        <div className="flex justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openReport(entry.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                          >
                            <Eye size={12} /> View
                          </button>
                          <button
                            type="button"
                            onClick={() => printReport(entry.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#9bb3e4] px-2.5 py-1.5 text-xs font-semibold text-[#2e4f8f] dark:border-slate-400 dark:text-white"
                          >
                            <Printer size={12} /> Print
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((entry) => {
              const meta = scoreMeta(entry.score);
              return (
                <article
                  key={entry.id}
                  className={`flex flex-col rounded-xl border border-[#c4d2f0] bg-[#f8fbff] p-4 dark:border-dash-border dark:bg-dash-surface-elevated ${
                    selectedIds.includes(entry.id) ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(entry.id)}
                      onChange={() => toggleSelected(entry.id)}
                      aria-label={`Select ${entry.file_name}`}
                    />
                    <span className="text-xs text-[#7a8794] dark:text-slate-300">
                      {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}
                    </span>
                  </div>
                  <p className="mt-3 line-clamp-2 font-semibold text-[#0f1d44] dark:text-white">{entry.file_name}</p>
                  <p className="mt-2 text-sm text-[#5d6f9d] dark:text-slate-300">{entry.document_type || '—'}</p>
                  <p className="text-sm text-[#5d6f9d] dark:text-slate-300">Checked by: {entry.checked_by || '—'}</p>
                  <p className={`mt-auto pt-3 text-lg font-bold ${meta.text}`}>{meta.value}</p>
                  <span className={`mt-1 w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.badge}`}>{meta.label}</span>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openReport(entry.id)}
                      className="flex-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                    >
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => printReport(entry.id)}
                      className="rounded-lg border border-[#9bb3e4] px-3 py-1.5 text-xs font-semibold text-[#2e4f8f] dark:border-slate-400 dark:text-white"
                    >
                      Print
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete reports?"
        message={`Delete ${selectedIds.length} report(s)? This cannot be undone.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => !deleting && setConfirmOpen(false)}
      />

      {report || reportLoading ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
          <button type="button" aria-label="Close report" onClick={closeReport} className="absolute inset-0 bg-black/55" />
          <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#c4d2f0] bg-white shadow-2xl dark:border-dash-border dark:bg-dash-surface">
            <div className="flex items-center justify-between border-b px-4 py-3 dark:border-dash-border">
              <h2 className="text-base font-semibold text-[#153063] dark:text-white">
                {report?.report_title || 'QA/QC Report'}
              </h2>
              <div className="flex items-center gap-2">
                {report?.id ? (
                  <button
                    type="button"
                    onClick={() => printReport(report.id)}
                    className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Print PDF
                  </button>
                ) : null}
                <button
                  type="button"
                  aria-label="Close report"
                  onClick={closeReport}
                  className="rounded-lg border p-2 dark:border-dash-border dark:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 dark:bg-[#0b0f16]">
              {reportLoading && !report ? (
                <p className="text-sm text-[#5d6f9d] dark:text-slate-300">Loading report…</p>
              ) : (
                <ReportMarkdownView markdown={report?.report_markdown} />
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
