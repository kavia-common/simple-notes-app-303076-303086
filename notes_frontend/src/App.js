import React, { useMemo, useState } from "react";
import "./App.css";
import { useNotes } from "./hooks/useNotes";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { EmptyState } from "./components/EmptyState";
import { LoadingSkeleton } from "./components/LoadingSkeleton";
import { NoteEditorModal } from "./components/NoteEditorModal";
import { NotesList } from "./components/NotesList";

// PUBLIC_INTERFACE
function App() {
  const { notes, isLoading, showNetworkHint, dismissNetworkHint, refresh, create, update, remove } =
    useNotes();

  const [selectedId, setSelectedId] = useState(null);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState("create"); // "create" | "edit"
  const [editorInitial, setEditorInitial] = useState({ title: "", content: "", id: null });
  const [isSaving, setIsSaving] = useState(false);
  const [editorError, setEditorError] = useState(null);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  const selectedNote = useMemo(() => {
    return notes.find((n) => n.id === selectedId) || null;
  }, [notes, selectedId]);

  function openCreate() {
    setEditorMode("create");
    setEditorInitial({ title: "", content: "", id: null });
    setEditorError(null);
    setEditorOpen(true);
  }

  function openEdit(note) {
    setSelectedId(note.id);
    setEditorMode("edit");
    setEditorInitial({ title: note.title, content: note.content, id: note.id });
    setEditorError(null);
    setEditorOpen(true);
  }

  function openDelete(note) {
    setNoteToDelete(note);
    setDeleteError(null);
    setConfirmOpen(true);
  }

  async function handleSave(payload) {
    setEditorError(null);
    setIsSaving(true);
    try {
      if (editorMode === "create") {
        const created = await create(payload);
        setSelectedId(created.id);
      } else if (editorMode === "edit" && editorInitial.id != null) {
        const updated = await update(editorInitial.id, payload);
        setSelectedId(updated.id);
      }
      setEditorOpen(false);
    } catch (e) {
      const raw = e instanceof Error ? e.message : "Failed to save note";
      const msg =
        typeof raw === "string" && raw.toLowerCase().includes("failed to fetch")
          ? "Can’t reach the server right now. Please try again."
          : raw;
      setEditorError(msg);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleConfirmDelete() {
    if (!noteToDelete) return;
    setDeleteError(null);
    setIsDeleting(true);
    try {
      await remove(noteToDelete.id);
      if (selectedId === noteToDelete.id) {
        setSelectedId(null);
      }
      setConfirmOpen(false);
      setNoteToDelete(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete note");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="appShell">
      <header className="topbar">
        <div className="topbar__brand">
          <div className="brandMark" aria-hidden="true" />
          <div>
            <h1 className="topbar__title">Notes</h1>
            <p className="topbar__subtitle">Simple, fast, and focused.</p>
          </div>
        </div>

        <div className="topbar__actions">
          <button className="btn btn-ghost" onClick={refresh} disabled={isLoading}>
            Refresh
          </button>
          <button className="btn btn-primary" onClick={openCreate}>
            New note
          </button>

          {showNetworkHint ? (
            <div className="alert alert-warn" role="status" aria-live="polite" style={{ marginTop: 0 }}>
              <div className="alert__row">
                <span className="muted">
                  Can’t reach the server right now. You can keep editing and try “Refresh” again.
                </span>
                <button className="icon-btn" onClick={dismissNetworkHint} aria-label="Dismiss hint">
                  ✕
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </header>

      <main className="layout">
        <section className="panel panel--list" aria-label="Notes">
          <div className="panel__header">
            <h2 className="panel__title">All notes</h2>
            <span className="chip" aria-label={`${notes.length} notes`}>
              {notes.length}
            </span>
          </div>

          {/* Avoid showing a prominent, generic "Failed to fetch" banner in the main UI. */}
          {/* Network/API errors are surfaced as a small non-blocking toast instead. */}

          {isLoading ? (
            <div className="stack">
              <LoadingSkeleton lines={2} />
              <LoadingSkeleton lines={3} />
              <LoadingSkeleton lines={2} />
            </div>
          ) : notes.length === 0 ? (
            <EmptyState onCreate={openCreate} />
          ) : (
            <NotesList
              notes={notes}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onEdit={openEdit}
              onDelete={openDelete}
            />
          )}
        </section>

        <section className="panel panel--detail" aria-label="Selected note">
          <div className="panel__header">
            <h2 className="panel__title">Preview</h2>
            {selectedNote ? (
              <div className="inlineActions">
                <button className="btn btn-ghost btn-small" onClick={() => openEdit(selectedNote)}>
                  Edit
                </button>
                <button
                  className="btn btn-danger btn-small"
                  onClick={() => openDelete(selectedNote)}
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>

          {!selectedNote ? (
            <div className="previewEmpty">
              <p className="previewEmpty__title">Select a note</p>
              <p className="previewEmpty__desc">
                Choose one from the list to see it here, or create a new note.
              </p>
              <button className="btn btn-primary" onClick={openCreate}>
                New note
              </button>
            </div>
          ) : (
            <article className="preview">
              <h3 className="preview__title">{selectedNote.title}</h3>
              <div className="preview__meta">
                <span className="muted">
                  Updated: {new Date(selectedNote.updated_at).toLocaleString()}
                </span>
              </div>
              <div className="preview__content">{selectedNote.content}</div>
            </article>
          )}
        </section>
      </main>

      <NoteEditorModal
        isOpen={editorOpen}
        mode={editorMode}
        initialTitle={editorInitial.title}
        initialContent={editorInitial.content}
        isSaving={isSaving}
        error={editorError}
        onClose={() => (isSaving ? null : setEditorOpen(false))}
        onSave={handleSave}
      />

      <ConfirmDialog
        isOpen={confirmOpen}
        title="Delete note?"
        message={
          noteToDelete
            ? `This will permanently delete “${noteToDelete.title}”.`
            : "This will permanently delete the note."
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        isConfirming={isDeleting}
        onCancel={() => (isDeleting ? null : setConfirmOpen(false))}
        onConfirm={handleConfirmDelete}
      />

      {deleteError ? (
        <div className="toast" role="alert" aria-live="polite">
          <div className="toast__content">
            <strong>Delete failed</strong>
            <span className="muted">{deleteError}</span>
          </div>
          <button className="icon-btn" onClick={() => setDeleteError(null)} aria-label="Dismiss">
            ✕
          </button>
        </div>
      ) : null}
    </div>
  );
}

export default App;
