/**
 * client entry loaded on every page (before any page module).
 * Registers the shared Alpine components and starts Alpine once all module scripts —
 * this one and the page's own entry under /js/pages — have run.
 */
import { appShell } from "./components/app-shell.js";
import { copyable } from "./components/copyable.js";
import { dropdown } from "./components/dropdown.js";
import { modal } from "./components/modal.js";
import { passwordReveal } from "./components/password-reveal.js";
import { createToastStore, toastRegion } from "./components/toasts.js";
import Alpine from "./vendor/alpine.js";

Alpine.data("appShell", appShell);
Alpine.data("copyable", copyable);
Alpine.data("dropdown", dropdown);
Alpine.data("modal", modal);
Alpine.data("passwordReveal", passwordReveal);
Alpine.data("toastRegion", toastRegion);
Alpine.store("toasts", createToastStore());

window.addEventListener("toast", (event) => {
  if (event.detail?.message) {
    Alpine.store("toasts").push(event.detail.type ?? "info", event.detail.message);
  }
});

window.Alpine = Alpine;

// Module scripts all execute before DOMContentLoaded, so page components are registered by then.
document.addEventListener("DOMContentLoaded", () => {
  Alpine.start();
});
