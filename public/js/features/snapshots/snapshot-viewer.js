import { getJson } from "../../lib/http.js";
import { relativeTime } from "../../lib/time.js";
import { deriveColumns, displayValue } from "./columns.js";

/**
 * snapshot viewer
 * initial state comes from a `<script type="application/json">` rendered by the server:
 * `{ database, view, snapshot, hasAny, pollMs, classes: { text, mono, numeric, nullValue } }`.
 * polls the latest snapshot while the tab is visible and replaces the rows in place.
 *
 * @param {string} configId id of the JSON config element
 */
export function snapshotViewer(configId) {
  const config = JSON.parse(document.getElementById(configId).textContent);

  return {
    database: config.database,
    view: config.view,
    snapshot: config.snapshot,
    hasAny: config.hasAny,
    classes: config.classes,
    status: config.snapshot ? "ready" : config.hasAny ? "unavailable" : "empty",
    fetching: false,
    failed: false,
    now: Date.now(),
    lastFetchAt: Date.now(),
    requestSeq: 0,

    init() {
      this.$watch("view", () => this.onViewChange());
      setInterval(() => {
        this.now = Date.now();
      }, 1000);
      setInterval(() => {
        if (document.visibilityState === "visible") this.load(false);
      }, config.pollMs);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && Date.now() - this.lastFetchAt >= config.pollMs) this.load(false);
      });
    },

    get rows() {
      return this.snapshot ? this.snapshot.payload : [];
    },
    get columns() {
      return deriveColumns(this.rows);
    },
    get updatedLabel() {
      return this.snapshot ? relativeTime(this.now - new Date(this.snapshot.capturedAt).getTime()) : "";
    },

    onViewChange() {
      const url = new URL(window.location.href);
      url.searchParams.set("database", this.database);
      url.searchParams.set("view", this.view);
      history.replaceState(null, "", url.pathname + url.search);
      this.snapshot = null;
      this.status = "loading";
      this.load(true);
    },

    refresh() {
      this.load(true);
    },

    async load(manual) {
      if (this.fetching && !manual) return;
      const seq = ++this.requestSeq;
      const view = this.view;
      this.fetching = true;
      try {
        const query = new URLSearchParams({ database: this.database, view });
        const body = await getJson(`/api/snapshots/latest?${query}`);
        // a newer request (or a view change) superseded this one
        if (seq !== this.requestSeq || view !== this.view) return;
        const latest = body.data?.[0];
        this.failed = false;
        this.lastFetchAt = Date.now();
        if (latest) {
          this.snapshot = latest;
          this.hasAny = true;
          this.status = "ready";
        } else {
          this.snapshot = null;
          this.status = this.hasAny ? "unavailable" : "empty";
        }
      } catch {
        if (seq !== this.requestSeq) return;
        this.failed = true;
        if (!this.snapshot) this.status = "error";
      } finally {
        if (seq === this.requestSeq) this.fetching = false;
      }
    },

    display: displayValue,
    cellClass(column, value) {
      const base =
        column.kind === "numeric"
          ? this.classes.numeric
          : column.kind === "mono"
            ? this.classes.mono
            : this.classes.text;
      return value === null || value === undefined ? `${base} ${this.classes.nullValue}` : base;
    },
  };
}
