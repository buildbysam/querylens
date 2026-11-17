// DOM helpers shared by components and pages.

export const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** True when the element takes up space on the page (not display:none / hidden). */
export function isVisible(el) {
  return Boolean(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

/** Visible elements under `root` matching `selector`. */
export function visibleWithin(root, selector) {
  return Array.from(root.querySelectorAll(selector)).filter(isVisible);
}

/**
 * Replaces elements in the current document with the elements of the same id from a
 * freshly rendered page. Alpine initialises the inserted markup automatically.
 */
export function replaceRegions(html, ids) {
  const doc = new DOMParser().parseFromString(html, "text/html");
  for (const id of ids) {
    const next = doc.getElementById(id);
    const current = document.getElementById(id);
    if (next && current) current.replaceWith(next);
  }
}
