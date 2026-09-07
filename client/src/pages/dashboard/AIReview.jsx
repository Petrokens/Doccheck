import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer, X } from 'lucide-react';
import ReportMarkdownView from '@/components/Common/ReportMarkdownView';
import { fetchProcessHistory, fetchProcessReport, printProcessReportPdf } from '@/services/processReportService';

function isSameDay(value) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

export default function AIReview() {
  const [params, setParams] = useSearchParams();
  const [list, setList] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [department, setDepartment] = useState('All');
  const [syncedAt, setSyncedAt] = useState(null);

  useEffect(() => {
    fetchProcessHistory({ page: 1, limit: 100 })
      .then((data) => {
        setList(data.history || []);
        setSyncedAt(new Date());
      })
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const id = params.get('id');
    if (!id) {
      setReport(null);
      return;
    }
    fetchProcessReport(id).then(setReport).catch((err) => setError(err.message));
  }, [params]);

  const departments = useMemo(
    () => ['All', ...Array.from(new Set(list.map((item) => item.document_type).filter(Boolean)))],
    [list],
  );

  const rows = useMemo(
    () => (department === 'All' ? list : list.filter((item) => item.document_type === department)),
    [list, department],
  );

  const stats = useMemo(() => ({
    total: list.length,
    departments: new Set(list.map((item) => item.document_type).filter(Boolean)).size,
    today: list.filter((item) => isSameDay(item.created_at)).length,
  }), [list]);

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

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#0f1d44] dark:text-white">AI Review Inbox</h1>
          <p className="mt-1 text-sm text-[#5d6f9d] dark:text-dash-muted">Checked files across departments, ready to view or print.</p>
        </div>
        <p className="text-xs text-[#7a8794] dark:text-slate-300">
          Last synced: {syncedAt ? syncedAt.toLocaleTimeString() : '—'}
        </p>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total Reports', value: stats.total, tone: 'text-[#0f1d44] dark:text-white' },
          { label: 'Departments Covered', value: stats.departments, tone: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Reviewed Today', value: stats.today, tone: 'text-blue-600 dark:text-blue-400' },
        ].map((card) => (
          <div key={card.label} className="rounded-xl border border-[#c4d2f0] bg-white px-4 py-3 dark:border-dash-border dark:bg-dash-surface">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a8794] dark:text-slate-400">{card.label}</p>
            <p className={`mt-1 text-3xl font-bold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#c4d2f0] bg-white dark:border-dash-border dark:bg-dash-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfd9ee] px-4 py-3 dark:border-dash-border">
          <h2 className="text-sm font-semibold text-[#153063] dark:text-white">Checked Files</h2>
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
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#e8eef8] text-xs uppercase tracking-wide text-[#415e99] dark:bg-[#1c2533] dark:text-slate-200">
              <tr>
                <th className="px-4 py-3">S.No</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Checked File</th>
                <th className="px-4 py-3">Checked By</th>
                <th className="px-4 py-3">Checked At</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? rows.map((item, index) => (
                <tr key={item.id} className="border-t border-[#e4ebf7] odd:bg-white even:bg-[#f7faff] dark:border-[#2a3548] dark:odd:bg-[#151b27] dark:even:bg-[#1a2230]">
                  <td className="px-4 py-3 text-[#5d6f9d] dark:text-slate-300">{index + 1}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex max-w-[180px] truncate rounded-full bg-blue-600/15 px-2.5 py-1 text-xs font-medium text-blue-700 dark:bg-blue-600/25 dark:text-blue-300">
                      {item.document_type || '—'}
                    </span>
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-3 font-medium text-[#0f1d44] dark:text-white">{item.file_name}</td>
                  <td className="px-4 py-3 text-[#415e99] dark:text-slate-200">{item.checked_by || '—'}</td>
                  <td className="px-4 py-3 text-[#5d6f9d] dark:text-slate-300">
                    {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openReport(item.id)}
                        className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
                      >
                        View
                      </button>
                      <button
                        type="button"
                        onClick={() => printProcessReportPdf(item.id).catch((err) => setError(err.message))}
                        className="inline-flex items-center gap-1 rounded-lg border border-[#9bb3e4] px-3 py-1.5 text-xs font-semibold text-[#2e4f8f] dark:border-slate-400 dark:text-white"
                      >
                        <Printer size={12} /> Print
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#5d6f9d] dark:text-slate-300">
                    No checked files yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {report ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-6">
          <button type="button" aria-label="Close report" onClick={closeReport} className="absolute inset-0 bg-black/55" />
          <div className="relative flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-[#c4d2f0] bg-white shadow-2xl dark:border-dash-border dark:bg-dash-surface">
            <div className="flex items-center justify-between border-b px-4 py-3 dark:border-dash-border">
              <h2 className="text-base font-semibold text-[#153063] dark:text-white">{report.report_title || 'QA/QC Report'}</h2>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => printProcessReportPdf(report.id)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white">
                  Print PDF
                </button>
                <button type="button" onClick={closeReport} className="rounded-lg border p-2 dark:border-dash-border dark:text-white"><X size={18} /></button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 dark:bg-[#0b0f16]">
              <ReportMarkdownView markdown={report.report_markdown} />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
