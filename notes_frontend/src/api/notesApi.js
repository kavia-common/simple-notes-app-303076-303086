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
 * In preview environments, the frontend is commonly served behind a reverse proxy that can
 * route same-origin calls (e.g. GET /notes) to the backend service. Cross-host/port calls
 * can be blocked, so the safest default is to use same-origin relative paths.
 *
 * Rules:
 *  - Default: return "" (empty base) meaning same-origin relative paths.
 *  - Allow an override via REACT_APP_API_BASE ONLY when it is an absolute URL AND is same-origin.
 *    (Prevents accidentally constructing hostname:port URLs or cross-origin calls in preview.)
 *  - Any other value is ignored.
 *
 * @returns {string} empty string for same-origin, or absolute same-origin base URL without trailing slash
 */
function getBaseUrl() {
  const candidate = normalizeBaseUrl(process.env.REACT_APP_API_BASE);

  // Default: always prefer same-origin relative calls.
  if (!candidate) return "";

  // Only consider absolute URL overrides.
  if (!/^(https?:)\/\//i.test(candidate)) return "";

  // Enforce same-origin only (preview-safe). If it doesn't match current origin, ignore.
  // This prevents cases like https://<host>:3001 from being used from the :3000 frontend.
  try {
    const resolved = new URL(candidate, window.location.origin);
    if (resolved.origin !== window.location.origin) {
      // eslint-disable-next-line no-console
      console.debug("[notesApi] Ignoring REACT_APP_API_BASE due to cross-origin override:", candidate);
      return "";
    }
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
