const BASE_URL = "http://localhost:3001";

/**
 * Normalize API errors into readable messages.
 * @param {Response} res
 * @returns {Promise<never>}
 */
async function throwApiError(res) {
  let details = "";
  try {
    const body = await res.json();
    details = body?.detail ? JSON.stringify(body.detail) : JSON.stringify(body);
  } catch {
    // ignore non-json
  }

  const message = `Request failed (${res.status} ${res.statusText})${details ? `: ${details}` : ""}`;
  throw new Error(message);
}

/**
 * @template T
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<T>}
 */
async function request(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    await throwApiError(res);
  }

  // DELETE returns {} in this API; still valid JSON
  return /** @type {Promise<T>} */ (res.json());
}

// PUBLIC_INTERFACE
export async function listNotes() {
  /** @type {import("../types/notes").NoteOut[]} */
  const notes = await request("/notes", { method: "GET" });
  return notes;
}

// PUBLIC_INTERFACE
export async function createNote(payload) {
  /** @type {import("../types/notes").NoteOut} */
  const note = await request("/notes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return note;
}

// PUBLIC_INTERFACE
export async function updateNote(noteId, payload, { partial = true } = {}) {
  const method = partial ? "PATCH" : "PUT";
  /** @type {import("../types/notes").NoteOut} */
  const note = await request(`/notes/${noteId}`, {
    method,
    body: JSON.stringify(payload),
  });
  return note;
}

// PUBLIC_INTERFACE
export async function deleteNote(noteId) {
  await request(`/notes/${noteId}`, { method: "DELETE" });
}
