import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Coins, FileSearch, FileStack, Hash, RefreshCw, Search, Users } from 'lucide-react';
import { QA_QC_BASE } from '@/lib/dashboardPaths';
import { listRoles, listUsers } from '@/services/adminService';
import { fetchProcessHistory, fetchReportDashboardStats } from '@/services/processReportService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

function formatCount(value) {
  return Number(value || 0).toLocaleString();
}

/** Approx USD→INR; override with VITE_USD_TO_INR in client env if needed. */
const USD_TO_INR = Number(import.meta.env.VITE_USD_TO_INR || 83.5) || 83.5;

function formatUsd(value) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '$0.00';
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  return `$${amount.toFixed(2)}`;
}

function formatInr(valueUsd) {
  const usd = Number(valueUsd || 0);
  if (!Number.isFinite(usd) || usd <= 0) return '₹0.00';
  const inr = usd * USD_TO_INR;
  if (inr < 1) return `₹${inr.toFixed(2)}`;
  return `₹${inr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatCostDual(valueUsd) {
  const amount = Number(valueUsd || 0);
  if (!Number.isFinite(amount) || amount <= 0) return '—';
  return `${formatUsd(amount)} · ${formatInr(amount)}`;
}

function formatTokensCell(value) {
  const tokens = Number(value || 0);
  return tokens > 0 ? tokens.toLocaleString() : '—';
}

function formatCostCell(value) {
  return formatCostDual(value);
}

export default function AuditReports() {
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [reports, setReports] = useState([]);
  const [usage, setUsage] = useState(null);
  const [tab, setTab] = useState('spend');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    setError('');
    Promise.all([
      listUsers(),
      listRoles(),
      fetchProcessHistory({ page: 1, limit: 500 }),
      fetchReportDashboardStats().catch(() => null),
    ])
      .then(([nextUsers, nextRoles, history, nextUsage]) => {
        setUsers(nextUsers);
        setRoles(nextRoles);
        setReports(history.history || []);
        setUsage(nextUsage);
      })
      .catch((err) => setError(err?.response?.data?.error || err.message || 'Unable to load audit data'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const fromRows = reports.reduce((acc, item) => {
      acc.documents += Number(item.document_count || 0);
      acc.tokens += Number(item.total_tokens || 0);
      acc.cost += Number(item.token_cost_usd || 0);
      return acc;
    }, { documents: 0, tokens: 0, cost: 0 });
    return {
      accounts: users.length,
      loginsToday: users.filter((item) => isSameDay(item.last_login_at)).length,
      reports: Number(usage?.qaqcTotal ?? reports.length),
      departments: new Set(reports.map((item) => item.document_type).filter(Boolean)).size,
      documents: Number(usage?.documents ?? fromRows.documents),
      tokens: Number(usage?.total_tokens ?? fromRows.tokens),
      promptTokens: Number(usage?.prompt_tokens || 0),
      completionTokens: Number(usage?.completion_tokens || 0),
      cost: Number(usage?.token_cost_usd ?? fromRows.cost),
    };
  }, [users, reports, usage]);

  const userSpendRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const spendByUser = new Map((usage?.byUser || []).map((item) => [item.user_id, item]));
    const fromReports = reports.reduce((acc, item) => {
      const name = String(item.checked_by || '').trim() || 'Unknown';
      if (!acc.has(name)) {
        acc.set(name, { documents: 0, total_tokens: 0, token_cost_usd: 0, reports: 0 });
      }
      const row = acc.get(name);
      row.documents += Number(item.document_count || 0);
      row.total_tokens += Number(item.total_tokens || 0);
      row.token_cost_usd += Number(item.token_cost_usd || 0);
      row.reports += 1;
      return acc;
    }, new Map());
    const rows = users.map((user) => {
      const spend = spendByUser.get(user.user_id)
        || fromReports.get(user.username)
        || {};
      return {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        reports: Number(spend.reports || 0),
        documents: Number(spend.documents || 0),
        total_tokens: Number(spend.total_tokens || 0),
        token_cost_usd: Number(spend.token_cost_usd || 0),
      };
    });
    const knownIds = new Set(rows.map((item) => item.user_id));
    (usage?.byUser || []).forEach((item) => {
      if (item.user_id && !knownIds.has(item.user_id)) {
        rows.push({
          user_id: item.user_id,
          username: item.username || 'Unknown',
          email: item.email || '',
          role_id: null,
          reports: Number(item.reports || 0),
          documents: Number(item.documents || 0),
          total_tokens: Number(item.total_tokens || 0),
          token_cost_usd: Number(item.token_cost_usd || 0),
        });
      }
    });
    return rows
      .filter((item) => {
        if (!needle) return true;
        return [item.username, item.email, roleName(roles, item.role_id)].join(' ').toLowerCase().includes(needle);
      })
      .sort((a, b) => b.total_tokens - a.total_tokens || b.documents - a.documents || a.username.localeCompare(b.username));
  }, [users, roles, reports, usage, query]);

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
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Administration · Traceability</p>
          <h1 className="mt-1 font-heading text-2xl font-semibold">Audit Reports</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Account last-login activity and per-user documents processed, tokens used, and token cost.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load}>
            <RefreshCw /> Refresh
          </Button>
          <Button asChild size="sm">
            <Link to={`${QA_QC_BASE}/history`}>
              <BookOpen /> Open History
            </Link>
          </Button>
        </div>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['Accounts', stats.accounts],
          ['Logins today', stats.loginsToday],
          ['Stored reports', stats.reports],
          ['Departments', stats.departments],
        ].map(([label, value]) => (
          <Card key={label} size="sm">
            <CardHeader>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
              <CardTitle className="text-3xl">{loading ? '—' : value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <FileStack className="size-3.5" /> Documents processed
            </p>
            <CardTitle className="text-3xl">{loading ? '—' : formatCount(stats.documents)}</CardTitle>
            <p className="text-xs text-muted-foreground">Main and support files across stored reports</p>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Hash className="size-3.5" /> Tokens used
            </p>
            <CardTitle className="text-3xl">{loading ? '—' : formatCount(stats.tokens)}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {stats.promptTokens || stats.completionTokens
                ? `${formatCount(stats.promptTokens)} prompt · ${formatCount(stats.completionTokens)} completion`
                : 'Prompt + completion tokens from the QA/QC engine'}
            </p>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <Coins className="size-3.5" /> Token cost
            </p>
            <CardTitle className="text-3xl">{loading ? '—' : formatUsd(stats.cost)}</CardTitle>
            <p className="text-sm font-medium text-foreground/80">
              {loading ? '—' : formatInr(stats.cost)}
            </p>
            <p className="text-xs text-muted-foreground">
              Estimated USD + INR (≈ {USD_TO_INR} ₹/$) from model rates
            </p>
          </CardHeader>
        </Card>
      </div>

      <Card className="overflow-hidden py-0">
        <Tabs value={tab} onValueChange={setTab}>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b py-3">
            <TabsList>
              <TabsTrigger value="spend"><Coins /> User spend</TabsTrigger>
              <TabsTrigger value="access"><Users /> Access</TabsTrigger>
              <TabsTrigger value="reports"><FileSearch /> QA/QC reports</TabsTrigger>
            </TabsList>
            <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === 'reports' ? 'Search reports' : 'Search users'}
                className="pl-8"
              />
            </div>
          </CardHeader>

          <TabsContent value="spend">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Documents processed</TableHead>
                  <TableHead className="text-right">Tokens used</TableHead>
                  <TableHead className="text-right">Token cost (USD · INR)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
                ) : userSpendRows.length ? userSpendRows.map((item) => (
                  <TableRow key={item.user_id || item.username}>
                    <TableCell>
                      <p className="font-medium">{item.username}</p>
                      <p className="text-xs text-muted-foreground">{item.email || '—'}</p>
                    </TableCell>
                    <TableCell>{item.role_id == null ? '—' : roleName(roles, item.role_id)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCount(item.documents)}</TableCell>
                    <TableCell className="text-right">{formatTokensCell(item.total_tokens)}</TableCell>
                    <TableCell className="text-right">
                      {item.token_cost_usd > 0 ? (
                        <div className="leading-tight">
                          <div className="font-medium">{formatUsd(item.token_cost_usd)}</div>
                          <div className="text-xs text-muted-foreground">{formatInr(item.token_cost_usd)}</div>
                        </div>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No user spend records match.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="access">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Last login</TableHead>
                  <TableHead>Account created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
                ) : accessRows.length ? accessRows.map((item) => (
                  <TableRow key={item.user_id}>
                    <TableCell>
                      <p className="font-medium">{item.username}</p>
                      <p className="text-xs text-muted-foreground">{item.email}</p>
                    </TableCell>
                    <TableCell>{roleName(roles, item.role_id)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatWhen(item.last_login_at)}</TableCell>
                    <TableCell className="text-muted-foreground">{formatWhen(item.created_at)}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No access records match.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="reports">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Document</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Checked by</TableHead>
                  <TableHead>Checked at</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">Loading…</TableCell></TableRow>
                ) : reportRows.length ? reportRows.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="max-w-[320px]">
                      <Link to={`${QA_QC_BASE}/history?id=${item.id}`} className="font-medium text-primary hover:underline">{item.file_name}</Link>
                      <p className="truncate text-xs text-muted-foreground">{item.report_title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.document_count || 0} docs · {formatTokensCell(item.total_tokens)} tok · {formatCostCell(item.token_cost_usd)}
                      </p>
                    </TableCell>
                    <TableCell>{item.document_type || '—'}</TableCell>
                    <TableCell>{item.checked_by || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{formatWhen(item.created_at)}</TableCell>
                    <TableCell className="font-semibold">{item.score == null ? '—' : `${item.score}%`}</TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No report records match.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
