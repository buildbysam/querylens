const AUTO_DISMISS_MS = 4000;

/**
 * toast queue, registered as `$store.toasts`.
 * push from components with `this.$store.toasts.push("success", "…")`, or from anywhere with
 * `window.dispatchEvent(new CustomEvent("toast", { detail: { type, message } }))`.
 */
export function createToastStore() {
  return {
    items: [],
    nextId: 1,
    push(type, message) {
      const id = this.nextId++;
      this.items.push({ id, type, message });
      setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS);
    },
    dismiss(id) {
      this.items = this.items.filter((toast) => toast.id !== id);
    },
  };
}

/** Toast region: shows toasts queued by the server in `data-initial` (JSON) once on load. */
export function toastRegion() {
  return {
    init() {
      const initial = this.$el.dataset.initial;
      if (!initial) return;
      for (const toast of JSON.parse(initial)) this.$store.toasts.push(toast.type, toast.message);
    },
  };
}
