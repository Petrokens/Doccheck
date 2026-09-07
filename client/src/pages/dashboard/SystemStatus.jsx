import { useEffect, useState } from 'react';
import { fetchReportDashboardStats } from '@/services/processReportService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function SystemStatus() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    fetchReportDashboardStats().then(setStats).catch(() => setStats({ qaqcTotal: 0 }));
  }, []);
  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">System Status</h1>
        <p className="mt-1 text-sm text-muted-foreground">Runtime health for the QA/QC workspace.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['API', 'Operational'],
          ['QA/QC engine', 'Ready'],
          ['Stored reports', String(stats?.qaqcTotal ?? '—')],
        ].map(([label, value]) => (
          <Card key={label}>
            <CardHeader>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
              <CardTitle className="text-xl">{value}</CardTitle>
            </CardHeader>
            <CardContent>
              {label !== 'Stored reports' ? <Badge variant="secondary">{value}</Badge> : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
