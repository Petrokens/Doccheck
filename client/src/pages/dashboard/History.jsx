import { useEffect, useState } from 'react';

const dummyHistory = [
  {
    file: 'PROCESS OVERALL CHECKLIST',
    discipline: 'Process',
    score: 92,
    date: '2025-07-10',
    time: '14:32',
  },
  {
    file: 'CABLE TRAY LAYOUT CHECKLIST',
    discipline: 'Instrumentation',
    score: 85,
    date: '2025-07-09',
    time: '18:10',
  },
  {
    file: 'STRUCTURAL CHECKLIST PDS',
    discipline: 'Civil & Structural',
    score: 78,
    date: '2025-07-08',
    time: '11:45',
  },
  {
    file: 'CONTROL SYSTEM PHILOSOPHY',
    discipline: 'Instrumentation',
    score: 88,
    date: '2025-07-08',
    time: '09:55',
  },
  {
    file: 'ELECTRICAL CABLE SCHEDULE',
    discipline: 'Electrical',
    score: 95,
    date: '2025-07-07',
    time: '16:22',
  },
];

export default function History() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1000);
  }, []);

  const renderCard = (entry, index) => (
    <div
      key={index}
      className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700 hover:shadow-md transition"
    >
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-2 md:space-y-0">
        {loading ? (
          <>
            <div className="space-y-2 w-full">
              <div className="h-4 w-2/3 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
            </div>
            <div className="flex flex-col space-y-1 md:items-end">
              <div className="h-3 w-32 bg-gray-200 dark:bg-gray-600 rounded animate-pulse" />
              <div className="h-4 w-24 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{entry.file}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Discipline: <span className="font-medium">{entry.discipline}</span>
              </p>
            </div>
            <div className="flex flex-col md:items-end">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Date: {entry.date} — {entry.time}
              </span>
              <span
                className={`text-sm font-bold ${
                  entry.score >= 90
                    ? 'text-green-500'
                    : entry.score >= 75
                    ? 'text-yellow-500'
                    : 'text-red-500'
                }`}
              >
                Score: {entry.score}%
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-blue-800 dark:text-blue-400 mb-6">QC History</h1>

      <div className="space-y-4">
        {(loading ? dummyHistory : dummyHistory).map((entry, index) =>
          renderCard(entry, index)
        )}
      </div>
    </div>
  );
}
