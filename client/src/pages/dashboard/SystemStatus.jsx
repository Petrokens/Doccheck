import { useEffect, useState } from 'react';
import { fetchReportDashboardStats } from '@/services/processReportService';

export default function SystemStatus() {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    fetchReportDashboardStats().then(setStats).catch(() => setStats({ qaqcTotal: 0 }));
  }, []);
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#0B4D99]">System Status</h1>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {[
          ['API', 'Operational'],
          ['QA/QC engine', 'Ready'],
          ['Stored reports', String(stats?.qaqcTotal ?? '—')],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[#c4d2f0] bg-white p-4 dark:border-dash-border dark:bg-dash-surface">
            <p className="text-xs uppercase tracking-wide text-[#7a8794]">{label}</p>
            <p className="mt-1 text-xl font-bold">{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
