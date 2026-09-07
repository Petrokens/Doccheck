import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ReportMarkdownView from '@/components/Common/ReportMarkdownView';
import { fetchProcessHistory, fetchProcessReport, printProcessReportPdf } from '@/services/processReportService';

export default function AIReview() {
  const [params] = useSearchParams();
  const [list, setList] = useState([]);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProcessHistory({ page: 1, limit: 100 })
      .then((data) => setList(data.history || []))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    const id = params.get('id') || list[0]?.id;
    if (!id) return;
    fetchProcessReport(id).then(setReport).catch((err) => setError(err.message));
  }, [params, list]);

  return (
    <div className="grid gap-4 p-4 lg:grid-cols-[280px_1fr]">
      <aside className="rounded-2xl border border-[#c4d2f0] bg-white p-3 dark:border-dash-border dark:bg-dash-surface">
        <h2 className="mb-3 text-sm font-semibold">AI QC Inbox</h2>
        <div className="max-h-[70vh] space-y-2 overflow-auto">
          {list.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => fetchProcessReport(item.id).then(setReport)}
              className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${report?.id === item.id ? 'bg-blue-600 text-white' : 'hover:bg-[#e8f0ff] dark:hover:bg-[#182553]'}`}
            >
              <span className="line-clamp-2 font-medium">{item.file_name}</span>
              <span className="block text-xs opacity-80">{item.document_type}</span>
            </button>
          ))}
        </div>
      </aside>
      <section className="rounded-2xl border border-[#c4d2f0] bg-white p-5 dark:border-dash-border dark:bg-dash-surface">
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {report ? (
          <>
            <div className="mb-4 flex items-center justify-between">
              <h1 className="text-xl font-semibold text-[#153063] dark:text-[#edf1ff]">{report.report_title || 'QA/QC Report'}</h1>
              <button type="button" onClick={() => printProcessReportPdf(report.id)} className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white">
                Print PDF
              </button>
            </div>
            <ReportMarkdownView markdown={report.report_markdown} />
          </>
        ) : (
          <p className="text-sm text-[#5d6f9d]">Select a report from the inbox.</p>
        )}
      </section>
    </div>
  );
}
