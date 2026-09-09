import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Printer } from 'lucide-react';
import ReportMarkdownView from '@/components/Common/ReportMarkdownView';
import { fetchProcessHistory, fetchProcessReport, printProcessReportPdf } from '@/services/processReportService';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
          <h1 className="font-heading text-2xl font-semibold">AI Review Inbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">Checked files across departments, ready to view or print.</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Last synced: {syncedAt ? syncedAt.toLocaleTimeString() : '—'}
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { label: 'Total Reports', value: stats.total },
          { label: 'Departments Covered', value: stats.departments },
          { label: 'Reviewed Today', value: stats.today },
        ].map((card) => (
          <Card key={card.label} size="sm">
            <CardHeader>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{card.label}</p>
              <CardTitle className="text-3xl">{card.value}</CardTitle>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden py-0">
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-3 border-b py-3">
          <CardTitle className="text-sm">Checked Files</CardTitle>
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
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>S.No</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Checked File</TableHead>
              <TableHead>Checked By</TableHead>
              <TableHead>Checked At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? rows.map((item, index) => (
              <TableRow key={item.id}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{item.document_type || '—'}</Badge>
                </TableCell>
                <TableCell className="max-w-[280px] truncate font-medium">{item.file_name}</TableCell>
                <TableCell>{item.checked_by || '—'}</TableCell>
                <TableCell className="text-muted-foreground">
                  {item.created_at ? new Date(item.created_at).toLocaleString() : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button type="button" size="sm" onClick={() => openReport(item.id)}>View</Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => printProcessReportPdf(item.id).catch((err) => setError(err.message))}
                    >
                      <Printer /> Print
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  No checked files yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <Dialog open={Boolean(report)} onOpenChange={(open) => { if (!open) closeReport(); }}>
        <DialogContent className="flex max-h-[92vh] max-w-5xl flex-col overflow-hidden sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>{report?.report_title || 'QA/QC Report'}</DialogTitle>
            <DialogDescription>Print or review the stored analysis.</DialogDescription>
          </DialogHeader>
          {report?.id ? (
            <Button type="button" size="sm" className="w-fit" onClick={() => printProcessReportPdf(report.id)}>
              <Printer /> Print PDF
            </Button>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto rounded-md bg-muted/30 p-3 sm:p-4">
            <ReportMarkdownView markdown={report?.report_markdown} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
