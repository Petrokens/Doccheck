import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileSearch, RefreshCw, Search, Users } from 'lucide-react';
import { MAIN_USERS, QA_QC_BASE } from '@/lib/dashboardPaths';
import { listRoles, listUsers } from '@/services/adminService';
import { fetchProcessHistory } from '@/services/processReportService';

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function isSameDay(value) {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
}

function roleName(roles, id) {
  return roles.find((role) => Number(role.id) === Number(id))?.name || `Role ${id}`;
}

export default function AuditReports() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [reports, setReports] = useState([]);
  const [tab, setTab] = useState('access');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([listUsers(), listRoles(), fetchProcessHistory({ page: 1, limit: 500 })])
      .then(([nextUsers, nextRoles, history]) => {
        setUsers(nextUsers);
        setRoles(nextRoles);
        setReports(history.history || []);
      })
      .catch((err) => setError(err?.response?.data?.error || err.message || 'Unable to load audit data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => ({
    accounts: users.length,
    loginsToday: users.filter((item) => isSameDay(item.last_login_at)).length,
    reports: reports.length,
    departments: new Set(reports.map((item) => item.document_type).filter(Boolean)).size,
  }), [users, reports]);

  const accessRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return users
      .slice()
      .sort((a, b) => new Date(b.last_login_at || 0) - new Date(a.last_login_at || 0))
      .filter((item) => {
        if (!needle) return true;
        return [item.username, item.email, roleName(roles, item.role_id)].join(' ').toLowerCase().includes(needle);
      });
  }, [users, roles, query]);

  const reportRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return reports.filter((item) => {
      if (!needle) return true;
      return [item.file_name, item.document_type, item.checked_by, item.report_title].join(' ').toLowerCase().includes(needle);
    });
  }, [reports, query]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a8794] dark:text-slate-400">Administration · Traceability</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#0f1d44] dark:text-white">Audit Reports</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#5d6f9d] dark:text-dash-muted">
            Account last-login activity and stored QA/QC reports. Use this with History for document traceability.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-[#c4d2f0] px-3 py-1.5 text-xs font-semibold dark:border-dash-border dark:text-white">
            <RefreshCw size={13} /> Refresh
          </button>
          <Link to={`${QA_QC_BASE}/history`} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B4D99] px-3 py-1.5 text-xs font-semibold text-white dark:bg-blue-600">
            <BookOpen size={13} /> Open History
          </Link>
        </div>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Accounts', stats.accounts],
          ['Logins today', stats.loginsToday],
          ['Stored reports', stats.reports],
          ['Departments', stats.departments],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#c4d2f0] bg-white px-4 py-3 dark:border-dash-border dark:bg-dash-surface">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a8794] dark:text-slate-400">{label}</p>
            <p className="mt-1 text-3xl font-bold text-[#0f1d44] dark:text-white">{loading ? '—' : value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#c4d2f0] bg-white dark:border-dash-border dark:bg-dash-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfd9ee] px-4 py-3 dark:border-dash-border">
          <div className="flex gap-2">
            <button type="button" onClick={() => setTab('access')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'access' ? 'bg-[#0B4D99] text-white' : 'border border-[#c4d2f0] dark:border-dash-border dark:text-white'}`}>
              <span className="inline-flex items-center gap-1"><Users size={12} /> Access</span>
            </button>
            <button type="button" onClick={() => setTab('reports')} className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${tab === 'reports' ? 'bg-[#0B4D99] text-white' : 'border border-[#c4d2f0] dark:border-dash-border dark:text-white'}`}>
              <span className="inline-flex items-center gap-1"><FileSearch size={12} /> QA/QC reports</span>
            </button>
          </div>
          <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[#c4d2f0] bg-[#f8fbff] px-3 py-1.5 dark:border-dash-border dark:bg-dash-surface-elevated sm:max-w-sm">
            <Search size={14} className="text-[#7a8794]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={tab === 'access' ? 'Search users' : 'Search reports'} className="w-full bg-transparent text-sm outline-none dark:text-white" />
          </div>
        </div>

        {tab === 'access' ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#e8eef8] text-xs uppercase tracking-wide text-[#415e99] dark:bg-[#1c2533] dark:text-slate-200">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Last login</th>
                  <th className="px-4 py-3">Account created</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[#5d6f9d]">Loading…</td></tr>
                ) : accessRows.length ? accessRows.map((item) => (
                  <tr key={item.user_id} className="border-t border-[#e4ebf7] odd:bg-white even:bg-[#f7faff] dark:border-[#2a3548] dark:odd:bg-[#151b27] dark:even:bg-[#1a2230]">
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#0f1d44] dark:text-white">{item.username}</p>
                      <p className="text-xs text-[#7a8794]">{item.email}</p>
                    </td>
                    <td className="px-4 py-3">{roleName(roles, item.role_id)}</td>
                    <td className="px-4 py-3 text-[#5d6f9d]">{formatWhen(item.last_login_at)}</td>
                    <td className="px-4 py-3 text-[#5d6f9d]">{formatWhen(item.created_at)}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-[#5d6f9d]">No access records match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#e8eef8] text-xs uppercase tracking-wide text-[#415e99] dark:bg-[#1c2533] dark:text-slate-200">
                <tr>
                  <th className="px-4 py-3">Document</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Checked by</th>
                  <th className="px-4 py-3">Checked at</th>
                  <th className="px-4 py-3">Score</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[#5d6f9d]">Loading…</td></tr>
                ) : reportRows.length ? reportRows.map((item) => (
                  <tr key={item.id} className="border-t border-[#e4ebf7] odd:bg-white even:bg-[#f7faff] dark:border-[#2a3548] dark:odd:bg-[#151b27] dark:even:bg-[#1a2230]">
                    <td className="max-w-[280px] px-4 py-3">
                      <Link to={`${QA_QC_BASE}/history?id=${item.id}`} className="font-medium text-[#0B4D99] hover:underline dark:text-blue-300">{item.file_name}</Link>
                      <p className="truncate text-xs text-[#7a8794]">{item.report_title}</p>
                    </td>
                    <td className="px-4 py-3">{item.document_type || '—'}</td>
                    <td className="px-4 py-3">{item.checked_by || '—'}</td>
                    <td className="px-4 py-3 text-[#5d6f9d]">{formatWhen(item.created_at)}</td>
                    <td className="px-4 py-3 font-semibold">{item.score == null ? '—' : `${item.score}%`}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-[#5d6f9d]">No report records match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
