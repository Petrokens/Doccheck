export default function Info() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-[#0B4D99] dark:text-white">Petrolenz QA/QC</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#4f6490] dark:text-dash-muted">
        This product checks engineering documents for quality before issue. Upload a deliverable,
        run Check-1 (standard completeness), Check-2 (technical review), and the ~4,000-rule library,
        then export a scored report as PDF.
      </p>
    </div>
  );
}
