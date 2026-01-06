function normalizeBaseUrl(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

function resolveDefaultBaseUrl() {
  // When served in KAVIA, the frontend is typically on :3000 and backend on :3001.
  // Using window.location.hostname keeps it working across different hosts.
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname || "localhost";
    const protocol = window.location.protocol || "http:";
    return `${protocol}//${hostname}:3001`;
  }
  return "http://localhost:3001";
}

const BASE_URL =
  // CRA exposes only REACT_APP_* vars to the browser build.
  // Prefer explicit API base from environment (set in notes_frontend/.env via platform env injection).
  normalizeBaseUrl(process.env.REACT_APP_API_BASE) ||
  normalizeBaseUrl(process.env.REACT_APP_BACKEND_URL) ||
  resolveDefaultBaseUrl();

/**
 * Convert unknown thrown values to a readable message.
 * @param {unknown} err
 * @returns {string}
 */
function stringifyUnknownError(err) {
  if (err instanceof Error) return err.message || "Unknown error";
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

/**
 * Normalize fetch/network failures into something actionable.
 * Browsers often throw TypeError("Failed to fetch") for:
 * - CORS errors
 * - DNS failures
 * - connection refused
 * - mixed content
 * @param {unknown} err
 * @returns {Error}
 */
function normalizeNetworkError(err) {
  const msg = stringifyUnknownError(err);
  // Keep the original for debugging, but provide a friendlier message to the app.
  const friendly =
    msg.toLowerCase().includes("failed to fetch") ||
    msg.toLowerCase().includes("networkerror") ||
    msg.toLowerCase().includes("load failed")
      ? `Network error contacting API at ${BASE_URL}. Please ensure the backend is running and reachable.`
      : `Network error contacting API at ${BASE_URL}: ${msg}`;

  const e = new Error(friendly);
  // @ts-ignore - attach original error for debugging
  e.cause = err;
  return e;
}

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
 * True when an error is likely transient and a retry can help.
 * @param {unknown} err
 * @returns {boolean}
 */
function isRetryableNetworkError(err) {
  const msg = stringifyUnknownError(err).toLowerCase();
  return (
    // Typical browser network error
    msg.includes("failed to fetch") ||
    msg.includes("networkerror") ||
    msg.includes("load failed") ||
    msg.includes("connection refused") ||
    msg.includes("timeout")
  );
}

/**
 * @template T
 * @param {string} path
 * @param {RequestInit} [options]
 * @returns {Promise<T>}
 */
async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;

  /** @type {RequestInit} */
  const init = {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    // CORS mode is default for cross-origin, but we set explicitly for clarity.
    mode: "cors",
    ...options,
  };

  // Retry once on transient network errors (e.g., backend just restarted).
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const res = await fetch(url, init);

      if (!res.ok) {
        await throwApiError(res);
      }

      // DELETE returns {} in this API; still valid JSON
      return /** @type {Promise<T>} */ (res.json());
    } catch (err) {
      if (attempt === 0 && isRetryableNetworkError(err)) {
        // Small delay before retry.
        await new Promise((r) => setTimeout(r, 250));
        continue;
      }
      throw normalizeNetworkError(err);
    }
  }

  // Unreachable, but satisfies flow analysis.
  throw new Error("Unexpected request flow");
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
