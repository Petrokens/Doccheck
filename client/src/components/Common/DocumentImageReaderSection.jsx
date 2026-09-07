export default function DocumentImageReaderSection({ mainDocument, logs }) {
  if (!mainDocument) return null;
  const isImage = /\.(png|jpe?g|webp|tif|tiff)$/i.test(mainDocument.name || '');
  const previewUrl = isImage ? URL.createObjectURL(mainDocument) : null;
  return (
    <div className="rounded-2xl border border-[#c4d2f0] bg-white p-4 dark:border-dash-border dark:bg-dash-surface">
      <h3 className="text-sm font-semibold text-[#153063] dark:text-white">Document reader</h3>
      <p className="mt-1 text-xs text-[#627ab1] dark:text-slate-300">
        {mainDocument.name} · {(mainDocument.size / (1024 * 1024)).toFixed(2)} MB
      </p>
      {previewUrl ? (
        <img src={previewUrl} alt="Uploaded document" className="mt-3 max-h-80 rounded-lg border object-contain dark:border-dash-border" />
      ) : (
        <p className="mt-3 text-sm text-[#5d6f9d] dark:text-slate-300">
          Server OCR extracts text from PDFs, Word, and scans during QA/QC analysis.
        </p>
      )}
      {logs?.length ? (
        <p className="mt-2 font-mono text-[11px] text-[#7f91c4] dark:text-slate-300">{logs[logs.length - 1]}</p>
      ) : null}
    </div>
  );
}
