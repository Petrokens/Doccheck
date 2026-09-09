import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
    return { label: 'Unscored', value: '—', variant: 'secondary' };
  }
  if (score >= 90) {
    return { label: 'Approved', value: `${score}%`, variant: 'secondary' };
  }
  if (score >= 75) {
    return { label: 'With comments', value: `${score}%`, variant: 'outline' };
  }
  return { label: 'Rework', value: `${score}%`, variant: 'destructive' };
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
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Workspace · Archive
          </p>
          <h1 className="mt-1 font-heading text-2xl font-semibold">{title}</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Stored QA/QC reports with scores, reviewers, and PDF export. Open a report to review findings or delete records you no longer need.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-muted-foreground">
            Last synced: {syncedAt ? syncedAt.toLocaleTimeString() : '—'}
          </p>
          <Button type="button" variant="outline" size="sm" onClick={loadHistory}>
            <RefreshCw /> Refresh
          </Button>
          <Button asChild size="sm">
            <Link to={QA_QC_PROCESS}>
              <UploadCloud /> New review
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
          { label: 'Stored reports', value: stats.total },
          { label: 'Average QC score', value: stats.avg == null ? '—' : `${stats.avg}%` },
          { label: 'Reviewed today', value: stats.today },
          { label: 'Departments', value: stats.departments },
        ].map((card) => (
          <Card key={card.label} size="sm">
            <CardHeader>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</p>
              <CardTitle className="text-3xl">{loading ? '—' : card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="gap-3 border-b py-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search file, reviewer, or document type"
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Department</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((name) => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Score</Label>
              <Select value={scoreBand} onValueChange={setScoreBand}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="high">Approved (≥90)</SelectItem>
                  <SelectItem value="medium">With comments (75–89)</SelectItem>
                  <SelectItem value="low">Rework (&lt;75)</SelectItem>
                  <SelectItem value="none">Unscored</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex rounded-lg border">
              <Button
                type="button"
                variant={view === 'table' ? 'default' : 'ghost'}
                size="icon-sm"
                aria-label="Table view"
                onClick={() => setView('table')}
              >
                <Table2 />
              </Button>
              <Button
                type="button"
                variant={view === 'cards' ? 'default' : 'ghost'}
                size="icon-sm"
                aria-label="Card view"
                onClick={() => setView('cards')}
              >
                <LayoutGrid />
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedIds(allSelected ? [] : selectableIds)}
              disabled={!selectableIds.length}
            >
              {allSelected ? 'Clear selection' : `Select all (${selectableIds.length})`}
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              disabled={!selectedIds.length}
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 /> Delete ({selectedIds.length})
            </Button>
          </div>
        </CardHeader>

        {loading ? (
          <CardContent className="grid grid-cols-1 gap-3 py-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <Skeleton key={index} className="h-36" />
            ))}
          </CardContent>
        ) : !filtered.length ? (
          <CardContent className="flex flex-col items-center py-12 text-center">
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-primary">
              <Clock size={22} />
            </span>
            <p className="mt-3 text-sm font-semibold">
              {history.length ? 'No reports match these filters.' : 'No report history yet.'}
            </p>
            <p className="mt-1 max-w-md text-sm text-muted-foreground">
              {history.length
                ? 'Try a different search, department, or score band.'
                : 'Run a discipline review and the scored report will appear here for later viewing and PDF export.'}
            </p>
            {!history.length ? (
              <Button asChild className="mt-4">
                <Link to={QA_QC_PROCESS}>
                  <UploadCloud /> Start a QA/QC review
                </Link>
              </Button>
            ) : null}
          </CardContent>
        ) : view === 'table' ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={() => setSelectedIds(allSelected ? [] : selectableIds)}
                    aria-label="Select all reports"
                  />
                </TableHead>
                <TableHead className="w-14">S.No</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Checked by</TableHead>
                <TableHead className="hidden lg:table-cell">Checked at</TableHead>
                <TableHead>Score</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry, index) => {
                const meta = scoreMeta(entry.score);
                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.includes(entry.id)}
                        onCheckedChange={() => toggleSelected(entry.id)}
                        aria-label={`Select ${entry.file_name}`}
                      />
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="max-w-[280px]">
                      <p className="truncate font-medium">{entry.file_name}</p>
                      <p className="truncate text-xs text-muted-foreground">{entry.report_title}</p>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{entry.document_type || '—'}</Badge>
                    </TableCell>
                    <TableCell>{entry.checked_by || '—'}</TableCell>
                    <TableCell className="hidden text-muted-foreground lg:table-cell">
                      {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-bold">{meta.value}</p>
                      <Badge variant={meta.variant}>{meta.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button type="button" size="sm" onClick={() => openReport(entry.id)}>
                          <Eye /> View
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => printReport(entry.id)}>
                          <Printer /> Print
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        ) : (
          <CardContent className="grid grid-cols-1 gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((entry) => {
              const meta = scoreMeta(entry.score);
              return (
                <Card
                  key={entry.id}
                  size="sm"
                  className={selectedIds.includes(entry.id) ? 'ring-2 ring-ring' : ''}
                >
                  <CardHeader className="flex-row items-start justify-between gap-2">
                    <Checkbox
                      checked={selectedIds.includes(entry.id)}
                      onCheckedChange={() => toggleSelected(entry.id)}
                      aria-label={`Select ${entry.file_name}`}
                    />
                    <span className="text-xs text-muted-foreground">
                      {entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}
                    </span>
                  </CardHeader>
                  <CardContent>
                    <p className="line-clamp-2 font-semibold">{entry.file_name}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{entry.document_type || '—'}</p>
                    <p className="text-sm text-muted-foreground">Checked by: {entry.checked_by || '—'}</p>
                    <p className="mt-3 text-lg font-bold">{meta.value}</p>
                    <Badge variant={meta.variant} className="mt-1">{meta.label}</Badge>
                    <div className="mt-3 flex gap-2">
                      <Button type="button" size="sm" className="flex-1" onClick={() => openReport(entry.id)}>
                        View
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => printReport(entry.id)}>
                        Print
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete reports?"
        message={`Delete ${selectedIds.length} report(s)? This cannot be undone.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => !deleting && setConfirmOpen(false)}
      />

      <Dialog open={Boolean(report || reportLoading)} onOpenChange={(open) => { if (!open) closeReport(); }}>
        <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col overflow-hidden sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{report?.report_title || 'QA/QC Report'}</DialogTitle>
            <DialogDescription>Review findings and print a PDF copy.</DialogDescription>
          </DialogHeader>
          {report?.id ? (
            <Button type="button" size="sm" className="w-fit" onClick={() => printReport(report.id)}>
              <Printer /> Print PDF
            </Button>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md bg-muted/30 p-3 sm:p-4">
            {reportLoading && !report ? (
              <p className="text-sm text-muted-foreground">Loading report…</p>
            ) : (
              <ReportMarkdownView markdown={report?.report_markdown} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
