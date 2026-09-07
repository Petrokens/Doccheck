import { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw, Search, Server } from 'lucide-react';
import { fetchSystemLogs } from '@/services/adminService';

function formatWhen(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString();
}

function uptimeLabel(startedAt, now) {
  const start = new Date(startedAt).getTime();
  const end = new Date(now).getTime();
  if (!start || !end || end < start) return '—';
  const minutes = Math.round((end - start) / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}m`;
}

function eventTone(event) {
  const key = String(event || '');
  if (key.startsWith('auth.')) return 'bg-blue-600/15 text-blue-800 dark:bg-blue-600/25 dark:text-blue-200';
  if (key.startsWith('admin.')) return 'bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200';
  if (key.startsWith('report.')) return 'bg-emerald-500/15 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-200';
  if (key.startsWith('user.')) return 'bg-violet-500/15 text-violet-800 dark:bg-violet-500/20 dark:text-violet-200';
  return 'bg-[#e8eef8] text-[#415e99] dark:bg-[#243044] dark:text-slate-200';
}

function detailsOf(entry) {
  const { ts, event, ...rest } = entry || {};
  const keys = Object.keys(rest);
  if (!keys.length) return '—';
  return keys.map((key) => `${key}: ${typeof rest[key] === 'object' ? JSON.stringify(rest[key]) : rest[key]}`).join(' · ');
}

export default function SystemLogs() {
  const [data, setData] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    fetchSystemLogs()
      .then(setData)
      .catch((err) => setError(err?.response?.data?.error || err.message || 'Unable to load system logs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const events = data?.events || [];
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return events;
    return events.filter((item) => JSON.stringify(item).toLowerCase().includes(needle));
  }, [events, query]);

  return (
    <div className="space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7a8794] dark:text-slate-400">Administration · Runtime</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#0f1d44] dark:text-white">System Logs</h1>
          <p className="mt-1 max-w-2xl text-sm text-[#5d6f9d] dark:text-dash-muted">
            In-memory audit events since the API last started. Full console output stays on the server process.
          </p>
        </div>
        <button type="button" onClick={load} className="inline-flex items-center gap-1.5 rounded-lg border border-[#c4d2f0] px-3 py-1.5 text-xs font-semibold dark:border-dash-border dark:text-white">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {error ? <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Environment', data?.env || '—'],
          ['Node', data?.node || '—'],
          ['API uptime', data ? uptimeLabel(data.startedAt, data.now) : '—'],
          ['Buffered events', events.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-[#c4d2f0] bg-white px-4 py-3 dark:border-dash-border dark:bg-dash-surface">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#7a8794] dark:text-slate-400">{label}</p>
            <p className="mt-1 truncate text-xl font-bold text-[#0f1d44] dark:text-white">{loading && label !== 'Environment' ? '—' : value}</p>
          </div>
        ))}
      </div>

      <section className="overflow-hidden rounded-2xl border border-[#c4d2f0] bg-white dark:border-dash-border dark:bg-dash-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#cfd9ee] px-4 py-3 dark:border-dash-border">
          <p className="inline-flex items-center gap-2 text-sm font-semibold text-[#153063] dark:text-white">
            <Activity size={16} /> Recent events
          </p>
          <div className="flex min-w-[220px] items-center gap-2 rounded-lg border border-[#c4d2f0] bg-[#f8fbff] px-3 py-1.5 dark:border-dash-border dark:bg-dash-surface-elevated">
            <Search size={14} className="text-[#7a8794]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter event, user, or IP" className="w-full bg-transparent text-sm outline-none dark:text-white" />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[#e8eef8] text-xs uppercase tracking-wide text-[#415e99] dark:bg-[#1c2533] dark:text-slate-200">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Event</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-[#5d6f9d]">Loading logs…</td></tr>
              ) : filtered.length ? filtered.map((item, index) => (
                <tr key={`${item.ts}-${item.event}-${index}`} className="border-t border-[#e4ebf7] odd:bg-white even:bg-[#f7faff] dark:border-[#2a3548] dark:odd:bg-[#151b27] dark:even:bg-[#1a2230]">
                  <td className="whitespace-nowrap px-4 py-3 text-[#5d6f9d] dark:text-slate-300">{formatWhen(item.ts)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${eventTone(item.event)}`}>{item.event}</span>
                  </td>
                  <td className="max-w-[520px] truncate px-4 py-3 font-mono text-xs text-[#415e99] dark:text-slate-200">{detailsOf(item)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center">
                    <Server className="mx-auto mb-2 text-[#7a8794]" size={22} />
                    <p className="text-sm font-semibold text-[#153063] dark:text-white">{events.length ? 'No events match this filter.' : 'No buffered events yet.'}</p>
                    <p className="mt-1 text-sm text-[#5d6f9d]">Sign in, generate a report, or change a user to produce audit lines.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
