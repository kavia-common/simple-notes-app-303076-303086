import { useCallback, useEffect, useMemo, useState } from "react";
import { createNote, deleteNote, listNotes, updateNote } from "../api/notesApi";

/**
 * @returns {{
 *  notes: import("../types/notes").NoteOut[],
 *  isLoading: boolean,
 *  error: string | null,
 *  refresh: () => Promise<void>,
 *  clearError: () => void,
 *  create: (payload: import("../types/notes").NoteCreate) => Promise<import("../types/notes").NoteOut>,
 *  update: (id: number, payload: import("../types/notes").NoteUpdate) => Promise<import("../types/notes").NoteOut>,
 *  remove: (id: number) => Promise<void>,
 * }}
 */
export function useNotes() {
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Do not surface a generic "Failed to fetch" / ":3001" banner in the UI.
  // Instead, provide a subtle, dismissible inline hint near the form actions.
  const [showNetworkHint, setShowNetworkHint] = useState(false);

  const dismissNetworkHint = useCallback(() => setShowNetworkHint(false), []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listNotes();
      setNotes(data);
      setShowNetworkHint(false);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.debug("[useNotes] Failed to load notes:", e);
      setShowNetworkHint(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (payload) => {
    const created = await createNote(payload);
    // Optimistic local insert; backend returns timestamps.
    setNotes((prev) => [created, ...prev]);
    setShowNetworkHint(false);
    return created;
  }, []);

  const update = useCallback(async (id, payload) => {
    const updated = await updateNote(id, payload, { partial: true });
    setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
    setShowNetworkHint(false);
    return updated;
  }, []);

  const remove = useCallback(async (id) => {
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
    setShowNetworkHint(false);
  }, []);

  return useMemo(
    () => ({
      notes,
      isLoading,
      showNetworkHint,
      dismissNetworkHint,
      refresh,
      create,
      update,
      remove,
    }),
    [notes, isLoading, showNetworkHint, dismissNetworkHint, refresh, create, update, remove]
  );
}
