// fetch wrappers for same-origin requests from the UI.

/** A promise that never settles — used after starting a navigation. */
const never = () => new Promise(() => {});

/** Sends the browser to sign-in, returning here afterwards. */
export function redirectToLogin(next = window.location.pathname + window.location.search) {
  window.location.href = `/login?next=${encodeURIComponent(next)}`;
  return never();
}

/** GET returning parsed JSON; redirects to sign-in on 401 and throws on other errors. */
export async function getJson(url) {
  const res = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" } });
  if (res.status === 401) return redirectToLogin();
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

/**
 * POST with a JSON body. Resolves with `{ status, ok, body }` for any HTTP status so callers can
 * read validation errors; redirects to sign-in on 401.
 */
export async function postJson(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    credentials: "same-origin",
    headers: { Accept: "application/json", ...(payload === undefined ? {} : { "Content-Type": "application/json" }) },
    body: payload === undefined ? undefined : JSON.stringify(payload),
  });
  if (res.status === 401) return redirectToLogin();
  const body = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, body: body ?? {} };
}

/** GET of a server-rendered page (for in-place region refreshes). Follows a sign-in redirect. */
export async function getHtml(url) {
  const res = await fetch(url, { credentials: "same-origin", headers: { Accept: "text/html" } });
  if (res.redirected && new URL(res.url).pathname === "/login") {
    window.location.href = res.url;
    return never();
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}
