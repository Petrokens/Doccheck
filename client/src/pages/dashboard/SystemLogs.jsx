import { useEffect, useMemo, useState } from 'react';
import { Activity, RefreshCw, Search, Server } from 'lucide-react';
import { fetchSystemLogs } from '@/services/adminService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

function eventVariant(event) {
  const key = String(event || '');
  if (key.startsWith('auth.')) return 'default';
  if (key.startsWith('admin.')) return 'outline';
  if (key.startsWith('report.')) return 'secondary';
  return 'secondary';
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
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Administration · Runtime</p>
          <h1 className="mt-1 font-heading text-2xl font-semibold">System Logs</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            In-memory audit events since the API last started. Full console output stays on the server process.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={load}>
          <RefreshCw /> Refresh
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Environment', data?.env || '—'],
          ['Node', data?.node || '—'],
          ['API uptime', data ? uptimeLabel(data.startedAt, data.now) : '—'],
          ['Buffered events', events.length],
        ].map(([label, value]) => (
          <Card key={label} size="sm">
            <CardHeader>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <CardTitle className="truncate text-xl">{loading && label !== 'Environment' ? '—' : value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b py-3">
          <CardTitle className="inline-flex items-center gap-2 text-sm">
            <Activity size={16} /> Recent events
          </CardTitle>
          <div className="relative min-w-[220px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter event, user, or IP" className="pl-8" />
          </div>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="py-8 text-center text-muted-foreground">Loading logs…</TableCell></TableRow>
            ) : filtered.length ? filtered.map((item, index) => (
              <TableRow key={`${item.ts}-${item.event}-${index}`}>
                <TableCell className="whitespace-nowrap text-muted-foreground">{formatWhen(item.ts)}</TableCell>
                <TableCell>
                  <Badge variant={eventVariant(item.event)}>{item.event}</Badge>
                </TableCell>
                <TableCell className="max-w-[520px] truncate font-mono text-xs">{detailsOf(item)}</TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center">
                  <Server className="mx-auto mb-2 text-muted-foreground" size={22} />
                  <p className="text-sm font-semibold">{events.length ? 'No events match this filter.' : 'No buffered events yet.'}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Sign in, generate a report, or change a user to produce audit lines.</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
