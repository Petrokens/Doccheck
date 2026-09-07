export default function PlaceholderPage({ title, body }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#0B4D99] dark:text-white">{title}</h1>
      <p className="mt-3 max-w-xl text-sm text-[#4f6490] dark:text-dash-muted">{body || 'This workspace is available in the QA/QC product shell.'}</p>
    </div>
  );
}
