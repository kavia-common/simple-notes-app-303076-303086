/**
 * @param {unknown} raw
 * @returns {string|null}
 */
function normalizeBaseUrl(raw) {
  if (!raw) return null;
  const trimmed = String(raw).trim();
  if (!trimmed) return null;
  return trimmed.replace(/\/+$/, "");
}

/**
 * Determine the API base URL to use in the browser.
 *
 * Important runtime detail:
 * - In this environment, the React dev server (origin :3000) does NOT proxy /notes to the backend.
 *   Same-origin requests like POST /notes therefore 404 with "Cannot POST /notes".
 * - The backend is reachable on a different origin/port (typically :3001), and CORS is enabled there.
 *
 * Rules:
 *  - Prefer explicit REACT_APP_API_BASE if provided (absolute URL).
 *  - Otherwise, try REACT_APP_BACKEND_URL if present (absolute URL).
 *  - Otherwise, fall back to "" (same-origin). This can work in deployments where a reverse proxy
 *    routes /notes to the backend, but will not work with a plain CRA dev server.
 *
 * @returns {string} empty string for same-origin, or absolute base URL without trailing slash
 */
function getBaseUrl() {
  const apiBase = normalizeBaseUrl(process.env.REACT_APP_API_BASE);
  const backendUrl = normalizeBaseUrl(process.env.REACT_APP_BACKEND_URL);

  const candidate = apiBase || backendUrl;

  // Default: same-origin if nothing is configured.
  if (!candidate) return "";

  // Only accept absolute URL strings.
  if (!/^(https?:)\/\//i.test(candidate)) return "";

  try {
    const resolved = new URL(candidate, window.location.origin);
    return resolved.toString().replace(/\/+$/, "");
  } catch {
    return "";
  }
}

const BASE_URL = getBaseUrl();

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
  // If the error already contains a helpful message (e.g., status + detail),
  // don't hide it behind a generic banner.
  if (err instanceof Error) {
    return err;
  }

  const msg = stringifyUnknownError(err);

  // Never surface noisy browser network errors (or absolute URLs/ports) to the UI.
  // Keep details in console.debug only to avoid banners like:
  //  - "Failed to fetch"
  //  - "Network error ... :3001"
  // eslint-disable-next-line no-console
  console.debug("[notesApi] network error details:", { baseUrl: BASE_URL || "(same-origin)", error: err });

  const isGenericNetworkFailure =
    msg.toLowerCase().includes("failed to fetch") ||
    msg.toLowerCase().includes("networkerror") ||
    msg.toLowerCase().includes("load failed") ||
    msg.toLowerCase().includes("connection refused") ||
    msg.toLowerCase().includes("timeout");

  const friendly = isGenericNetworkFailure
    ? "Can’t reach the server right now. Please try again."
    : "Request failed. Please try again.";

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
  // Prefer JSON detail, but fall back to text for cases like "Cannot POST /notes" (HTML).
  let details = "";
  let rawText = "";

  try {
    const body = await res.json();
    details = body?.detail ? JSON.stringify(body.detail) : JSON.stringify(body);
  } catch {
    try {
      rawText = await res.text();
    } catch {
      // ignore
    }
  }

  const maybeCannotPostNotes =
    res.status === 404 &&
    typeof rawText === "string" &&
    rawText.toLowerCase().includes("cannot post /notes");

  if (maybeCannotPostNotes) {
    throw new Error(
      "The frontend dev server received POST /notes (Cannot POST /notes). " +
        "This usually means same-origin proxying is not configured. " +
        "Set REACT_APP_BACKEND_URL (or REACT_APP_API_BASE) to the backend origin (e.g. https://<host>:3001)."
    );
  }

  if (!details && rawText) {
    // Keep it short; avoid dumping a full HTML page.
    details = rawText.replace(/\s+/g, " ").slice(0, 200);
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
    // Don't force mode:"cors" — for same-origin requests we want default behavior.
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
