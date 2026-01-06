import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * @param {{
 *  isOpen: boolean,
 *  mode: "create" | "edit",
 *  initialTitle?: string,
 *  initialContent?: string,
 *  isSaving?: boolean,
 *  error?: string | null,
 *  onClose: () => void,
 *  onSave: (payload: { title: string, content: string }) => Promise<void> | void,
 * }} props
 */
export function NoteEditorModal({
  isOpen,
  mode,
  initialTitle = "",
  initialContent = "",
  isSaving = false,
  error = null,
  onClose,
  onSave,
}) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [touched, setTouched] = useState(false);
  const titleRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTitle(initialTitle);
      setContent(initialContent);
      setTouched(false);
      // focus title on open
      setTimeout(() => titleRef.current?.focus(), 0);
    }
  }, [isOpen, initialTitle, initialContent]);

  const canSave = useMemo(() => {
    const t = title.trim();
    const c = content.trim();
    return t.length > 0 && c.length > 0 && !isSaving;
  }, [title, content, isSaving]);

  if (!isOpen) return null;

  const titleLabel = mode === "create" ? "New note" : "Edit note";
  const ctaLabel = mode === "create" ? "Create" : "Save";

  const showValidation =
    touched && (title.trim().length === 0 || content.trim().length === 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setTouched(true);
    if (!canSave) return;

    await onSave({ title: title.trim(), content: content.trim() });
  }

  return (
    <div
      className="modal__backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={titleLabel}
      onMouseDown={(e) => {
        // close only when clicking backdrop, not modal content
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal">
        <div className="modal__header">
          <div>
            <h2 className="modal__title">{titleLabel}</h2>
            <p className="modal__subtitle">
              {mode === "create"
                ? "Add a title and some content."
                : "Update your note and save changes."}
            </p>
          </div>

          <button
            className="icon-btn"
            onClick={onClose}
            aria-label="Close editor"
            disabled={isSaving}
            type="button"
          >
            ✕
          </button>
        </div>

        <form className="modal__body" onSubmit={handleSubmit}>
          <label className="field">
            <span className="field__label">Title</span>
            <input
              ref={titleRef}
              className="input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Meeting notes"
              onBlur={() => setTouched(true)}
              maxLength={255}
            />
          </label>

          <label className="field">
            <span className="field__label">Content</span>
            <textarea
              className="textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your note..."
              rows={10}
              onBlur={() => setTouched(true)}
            />
          </label>

          {showValidation ? (
            <div className="alert alert-warn" role="alert">
              Please provide both a title and content.
            </div>
          ) : null}

          {error ? (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          ) : null}

          <div className="modal__footer">
            <button
              className="btn btn-ghost"
              type="button"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button className="btn btn-primary" type="submit" disabled={!canSave}>
              {isSaving ? "Saving..." : ctaLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
