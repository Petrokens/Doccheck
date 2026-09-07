import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import ConfirmDialog from '@/components/Common/ConfirmDialog';
import { deleteProcessReport, fetchProcessHistory } from '@/services/processReportService';
import { Link } from 'react-router-dom';
import { QA_QC_BASE } from '@/lib/dashboardPaths';

export default function History({ title = 'QC History' }) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchProcessHistory({ page: 1, limit: 500 })
      .then((data) => setHistory(data.history || []))
      .catch((err) => setError(err?.response?.data?.error || err.message))
      .finally(() => setLoading(false));
  }, []);

  const selectableIds = history.map((e) => e.id).filter(Boolean);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.includes(id));

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await Promise.all(selectedIds.map((id) => deleteProcessReport(id)));
      setHistory((prev) => prev.filter((e) => !selectedIds.includes(e.id)));
      setSelectedIds([]);
      setConfirmOpen(false);
      toast.success('Reports deleted.');
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="mb-6 text-2xl font-bold text-blue-800 dark:text-blue-400">{title}</h1>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-gray-600 dark:text-gray-400">Select reports to delete</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setSelectedIds(allSelected ? [] : selectableIds)} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white">
            {allSelected ? 'Clear selection' : `Select all (${selectableIds.length})`}
          </button>
          <button type="button" disabled={!selectedIds.length} onClick={() => setConfirmOpen(true)} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white disabled:opacity-50">
            Delete selected ({selectedIds.length})
          </button>
        </div>
      </div>
      {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-800" />)
          : history.length
            ? history.map((entry) => (
              <Link
                key={entry.id}
                to={`${QA_QC_BASE}/ai-review?id=${entry.id}`}
                className={`flex flex-col rounded-lg border bg-white p-4 shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 ${selectedIds.includes(entry.id) ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className="flex justify-between">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(entry.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => setSelectedIds((prev) => (prev.includes(entry.id) ? prev.filter((x) => x !== entry.id) : [...prev, entry.id]))}
                  />
                  <span className="text-xs text-gray-500">{entry.created_at ? new Date(entry.created_at).toLocaleDateString() : ''}</span>
                </div>
                <p className="mt-3 line-clamp-2 font-semibold">{entry.file_name}</p>
                <p className="mt-2 text-sm text-gray-500">Department: {entry.document_type}</p>
                <p className="text-sm text-gray-500">Checked by: {entry.checked_by}</p>
                {entry.score != null ? (
                  <p className={`mt-auto pt-3 text-lg font-bold ${entry.score >= 90 ? 'text-green-500' : entry.score >= 75 ? 'text-yellow-500' : 'text-red-500'}`}>
                    {entry.score}%
                  </p>
                ) : null}
              </Link>
            ))
            : <div className="col-span-full rounded-lg border bg-white p-6 text-sm dark:border-gray-700 dark:bg-gray-800">No report history found yet.</div>}
      </div>
      <ConfirmDialog
        open={confirmOpen}
        title="Delete reports?"
        message={`Delete ${selectedIds.length} report(s)? This cannot be undone.`}
        confirmLabel={deleting ? 'Deleting…' : 'Delete'}
        loading={deleting}
        onConfirm={confirmDelete}
        onClose={() => !deleting && setConfirmOpen(false)}
      />
    </div>
  );
}
