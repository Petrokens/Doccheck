export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  loading,
  onConfirm,
  onClose,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-[#c4d2f0] bg-white p-5 shadow-xl dark:border-dash-border dark:bg-dash-surface">
        <h3 className="text-lg font-semibold text-[#0c2340] dark:text-white">{title}</h3>
        <p className="mt-2 text-sm text-[#4f6490] dark:text-dash-muted">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[#c4d2f0] px-4 py-2 text-sm dark:border-dash-border"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
