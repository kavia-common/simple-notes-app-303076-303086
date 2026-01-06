import React from "react";

/**
 * @param {{
 *  isOpen: boolean,
 *  title: string,
 *  message: string,
 *  confirmLabel?: string,
 *  cancelLabel?: string,
 *  isConfirming?: boolean,
 *  onCancel: () => void,
 *  onConfirm: () => Promise<void> | void,
 * }} props
 */
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  isConfirming = false,
  onCancel,
  onConfirm,
}) {
  if (!isOpen) return null;

  return (
    <div
      className="modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="modal modal--sm">
        <div className="modal__header">
          <div>
            <h2 className="modal__title">{title}</h2>
            <p className="modal__subtitle">{message}</p>
          </div>
          <button
            className="icon-btn"
            onClick={onCancel}
            aria-label="Close dialog"
            disabled={isConfirming}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="modal__footer">
          <button className="btn btn-ghost" onClick={onCancel} disabled={isConfirming}>
            {cancelLabel}
          </button>
          <button className="btn btn-danger" onClick={onConfirm} disabled={isConfirming}>
            {isConfirming ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
