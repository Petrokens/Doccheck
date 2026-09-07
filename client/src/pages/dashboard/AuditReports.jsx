import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, FileSearch, RefreshCw, Search, Users } from 'lucide-react';
import { QA_QC_BASE } from '@/lib/dashboardPaths';
import { listRoles, listUsers } from '@/services/adminService';
import { fetchProcessHistory } from '@/services/processReportService';
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
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Administration · Traceability</p>
          <h1 className="mt-1 font-heading text-2xl font-semibold">Audit Reports</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Account last-login activity and stored QA/QC reports. Use this with History for document traceability.
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

      <Card className="overflow-hidden py-0">
        <Tabs value={tab} onValueChange={setTab}>
          <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b py-3">
            <TabsList>
              <TabsTrigger value="access"><Users /> Access</TabsTrigger>
              <TabsTrigger value="reports"><FileSearch /> QA/QC reports</TabsTrigger>
            </TabsList>
            <div className="relative min-w-[220px] flex-1 sm:max-w-sm">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tab === 'access' ? 'Search users' : 'Search reports'}
                className="pl-8"
              />
            </div>
          </CardHeader>

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
                    <TableCell className="max-w-[280px]">
                      <Link to={`${QA_QC_BASE}/history?id=${item.id}`} className="font-medium text-primary hover:underline">{item.file_name}</Link>
                      <p className="truncate text-xs text-muted-foreground">{item.report_title}</p>
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
