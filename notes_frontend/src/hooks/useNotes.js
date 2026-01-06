import { useCallback, useEffect, useMemo, useState } from "react";
import { createNote, deleteNote, listNotes, updateNote } from "../api/notesApi";

/**
 * @returns {{
 *  notes: import("../types/notes").NoteOut[],
 *  isLoading: boolean,
 *  error: string | null,
 *  refresh: () => Promise<void>,
 *  create: (payload: import("../types/notes").NoteCreate) => Promise<import("../types/notes").NoteOut>,
 *  update: (id: number, payload: import("../types/notes").NoteUpdate) => Promise<import("../types/notes").NoteOut>,
 *  remove: (id: number) => Promise<void>,
 * }}
 */
export function useNotes() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setError(null);
    setIsLoading(true);
    try {
      const data = await listNotes();
      setNotes(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load notes");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (payload) => {
    setError(null);
    const created = await createNote(payload);
    // Optimistic local insert; backend returns timestamps.
    setNotes((prev) => [created, ...prev]);
    return created;
  }, []);

  const update = useCallback(async (id, payload) => {
    setError(null);
    const updated = await updateNote(id, payload, { partial: true });
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    return updated;
  }, []);

  const remove = useCallback(async (id) => {
    setError(null);
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return useMemo(
    () => ({ notes, isLoading, error, refresh, create, update, remove }),
    [notes, isLoading, error, refresh, create, update, remove]
  );
}
