import { replaceRegions } from "../../lib/dom.js";
import { getHtml, getJson, postJson } from "../../lib/http.js";

const LIVE_REGION = "health-live";

/**
 * platform health page: countdown + draining bar, in-place refresh of the live
 * region (skipped while a modal is open), forced re-check, copy status JSON, diagnostic modal,
 * scheduler resume.
 *
 * @param {{ refreshSeconds: number, diagnosticModal: string, resumeModal: string }} options
 */
export function healthPage({ refreshSeconds, diagnosticModal, resumeModal }) {
  return {
    remaining: refreshSeconds,
    refreshing: false,
    resuming: false,
    openModals: 0,
    diagnostic: "Running diagnostic…",

    root: {
      "@open-modal.window"(event) {
        this.openModals++;
        if (event.detail === diagnosticModal) this.loadDiagnostic();
      },
      "@modal-closed.window"() {
        this.openModals = Math.max(0, this.openModals - 1);
      },
    },

    init() {
      setInterval(() => this.tick(), 1000);
    },

    tick() {
      if (this.refreshing) return;
      this.remaining = Math.max(0, this.remaining - 1);
      if (this.remaining > 0) return;
      if (document.visibilityState === "visible" && this.openModals === 0) this.refresh(false);
      else this.remaining = refreshSeconds;
    },

    get barWidth() {
      return `width: ${(this.remaining / refreshSeconds) * 100}%`;
    },

    /** @param {boolean} manual forced re-check (`?check=1`); swaps even if a modal is open */
    async refresh(manual) {
      if (this.refreshing) return;
      this.refreshing = true;
      try {
        const html = await getHtml(manual ? "/health?check=1" : "/health");
        if (manual || this.openModals === 0) replaceRegions(html, [LIVE_REGION]);
      } catch {
        this.$store.toasts.push("danger", "Couldn't refresh platform health.");
      } finally {
        this.refreshing = false;
        this.remaining = refreshSeconds;
      }
    },

    async copyStatus() {
      try {
        const payload = await getJson("/health");
        await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
        this.$store.toasts.push("success", "Status JSON copied");
      } catch {
        this.$store.toasts.push("danger", "Couldn't copy status JSON.");
      }
    },

    async loadDiagnostic() {
      this.diagnostic = "Running diagnostic…";
      try {
        this.diagnostic = JSON.stringify(await getJson("/health?check=1"), null, 2);
      } catch {
        this.diagnostic = "Diagnostic failed. Check the server logs.";
      }
    },

    async resume() {
      if (this.resuming) return;
      this.resuming = true;
      try {
        const { ok, body } = await postJson("/health/scheduler/resume");
        this.$dispatch("close-modal", resumeModal);
        this.$store.toasts.push(
          ok ? "success" : "danger",
          body.message || (ok ? "Scheduler resumed" : "Couldn't resume the scheduler.")
        );
        this.refresh(true);
      } catch {
        this.$store.toasts.push("danger", "Couldn't resume the scheduler.");
      } finally {
        this.resuming = false;
      }
    },
  };
}
