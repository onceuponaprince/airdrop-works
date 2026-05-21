'use client';

interface GasConfirmDialogProps {
  open: boolean;
  estimatedUsd: number;
  thresholdUsd: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function GasConfirmDialog({
  open,
  estimatedUsd,
  thresholdUsd,
  onConfirm,
  onCancel,
}: GasConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="gas-confirm-title"
    >
      <div className="w-full max-w-md rounded-lg border border-[--border] bg-[--card] p-6 shadow-xl">
        <h2 id="gas-confirm-title" className="font-heading text-lg font-bold">
          Confirm network fee
        </h2>
        <p className="mt-2 text-sm text-[--muted-foreground]">
          Estimated gas is about ${estimatedUsd.toFixed(2)} (threshold ${thresholdUsd.toFixed(2)}).
          Proceed only if you accept the onchain cost.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded border border-[--border] text-sm hover:bg-[--secondary]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded bg-[--primary] text-[--primary-foreground] text-sm font-semibold hover:opacity-90"
          >
            Confirm claim
          </button>
        </div>
      </div>
    </div>
  );
}
