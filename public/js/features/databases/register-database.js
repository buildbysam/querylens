import { replaceRegions } from "../../lib/dom.js";
import { getHtml, postJson } from "../../lib/http.js";

const IDLE = Object.freeze({ state: "idle", reason: "" });
/** regions of /app/databases refreshed in place after a registration. */
const LIST_REGIONS = ["databases-count", "databases-region"];

const emptyForm = () => ({ name: "", host: "", port: 5432, databaseName: "", username: "", password: "" });

/**
 * register-database modal: test Connection must succeed before register is
 * enabled; editing any field resets the test. on success: close, toast, refresh the list.
 *
 * @param {{ modalId: string, openOnLoad?: boolean }} options
 */
export function registerDatabase({ modalId, openOnLoad = false }) {
  return {
    form: emptyForm(),
    errors: {},
    message: "",
    test: IDLE,
    submitting: false,

    formEvents: {
      "@submit.prevent"() {
        if (this.test.state === "ok") this.register();
        else this.runTest();
      },
      // never keep a password in the DOM after the dialog closes
      "@modal-closed.window"(event) {
        if (event.detail !== modalId) return;
        this.form.password = "";
        this.errors = {};
        this.message = "";
        this.test = IDLE;
      },
    },

    init() {
      if (!openOnLoad) return;
      // top-bar "New Database" links to ?register=1
      setTimeout(() => this.$dispatch("open-modal", modalId), 0);
      history.replaceState(null, "", window.location.pathname);
    },

    onEdit() {
      if (this.test.state !== "testing") this.test = IDLE;
      this.message = "";
    },

    payload() {
      return { ...this.form, port: Number(this.form.port) };
    },

    async runTest() {
      if (this.test.state === "testing") return;
      this.errors = {};
      this.message = "";
      this.test = { state: "testing", reason: "" };
      try {
        const { status, body } = await postJson("/api/databases/test", this.payload());
        if (status === 422 && body.fieldErrors) {
          this.errors = body.fieldErrors;
          this.test = IDLE;
        } else if (body.data?.ok) {
          this.test = { state: "ok", reason: "" };
        } else {
          this.test = { state: "fail", reason: body.message || "Could not connect" };
        }
      } catch {
        this.test = { state: "fail", reason: "Network error" };
      }
    },

    async register() {
      if (this.test.state !== "ok" || this.submitting) return;
      this.submitting = true;
      this.message = "";
      try {
        const { status, body } = await postJson("/api/databases", this.payload());
        if (status === 201) {
          this.form = emptyForm();
          this.test = IDLE;
          this.$dispatch("close-modal", modalId);
          this.$store.toasts.push(
            "success",
            body.data ? `Database ${body.data.name} registered` : "Database registered"
          );
          this.refreshList();
        } else if (status === 422 && body.fieldErrors) {
          this.errors = body.fieldErrors;
          this.test = IDLE;
        } else if (status === 422) {
          this.test = { state: "fail", reason: body.message || "Could not connect" };
        } else {
          this.message = body.message || "Couldn't register the database. Try again.";
        }
      } catch {
        this.message = "Network error. Try again.";
      } finally {
        this.submitting = false;
      }
    },

    async refreshList() {
      try {
        replaceRegions(await getHtml(window.location.pathname), LIST_REGIONS);
      } catch {
        // the list refreshes on the next navigation
      }
    },
  };
}
