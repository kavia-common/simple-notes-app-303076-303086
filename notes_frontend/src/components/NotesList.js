import React, { useMemo } from "react";

/**
 * @param {{
 *  notes: import("../types/notes").NoteOut[],
 *  selectedId: number | null,
 *  onSelect: (id: number) => void,
 *  onEdit: (note: import("../types/notes").NoteOut) => void,
 *  onDelete: (note: import("../types/notes").NoteOut) => void,
 * }} props
 */
export function NotesList({ notes, selectedId, onSelect, onEdit, onDelete }) {
  const formatted = useMemo(() => {
    return notes.map((n) => ({
      ...n,
      updatedLabel: new Date(n.updated_at).toLocaleString(),
    }));
  }, [notes]);

  return (
    <div className="notesList" role="list" aria-label="Notes list">
      {formatted.map((note) => (
        <article
          key={note.id}
          role="listitem"
          className={`noteCard ${selectedId === note.id ? "noteCard--active" : ""}`}
          onClick={() => onSelect(note.id)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") onSelect(note.id);
          }}
        >
          <div className="noteCard__top">
            <h3 className="noteCard__title">{note.title}</h3>
            <div className="noteCard__actions" onClick={(e) => e.stopPropagation()}>
              <button
                className="icon-btn"
                type="button"
                aria-label={`Edit note ${note.title}`}
                onClick={() => onEdit(note)}
              >
                Edit
              </button>
              <button
                className="icon-btn icon-btn--danger"
                type="button"
                aria-label={`Delete note ${note.title}`}
                onClick={() => onDelete(note)}
              >
                Delete
              </button>
            </div>
          </div>

          <p className="noteCard__content">
            {note.content.length > 180 ? `${note.content.slice(0, 180)}…` : note.content}
          </p>

          <div className="noteCard__meta">
            <span>Updated</span>
            <span className="noteCard__metaValue">{note.updatedLabel}</span>
          </div>
        </article>
      ))}
    </div>
  );
}
