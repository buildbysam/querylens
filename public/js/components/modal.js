import { FOCUSABLE, isVisible, visibleWithin } from "../lib/dom.js";

/**
 * dialog behaviour: opens on the window event `open-modal` with its id,
 * closes on Esc / backdrop / `close-modal`, traps focus, returns focus to the trigger, and
 * announces `modal-closed` with its id.
 */
export function modal(id) {
  return {
    open: false,
    returnTo: null,

    root: {
      "@open-modal.window"(event) {
        if (event.detail === id) this.show();
      },
      "@close-modal.window"(event) {
        if (event.detail === id) this.close();
      },
      "@keydown.escape.window"() {
        if (this.open) this.close();
      },
    },
    panel: {
      "@keydown.tab"(event) {
        this.trap(event);
      },
    },

    show() {
      this.returnTo = document.activeElement;
      this.open = true;
      document.documentElement.style.overflow = "hidden";
      this.$nextTick(() => {
        const preferred = this.$refs.panel.querySelector("[data-autofocus]");
        const first = preferred && isVisible(preferred) ? preferred : this.focusables()[0];
        first?.focus();
      });
    },
    close() {
      if (!this.open) return;
      this.open = false;
      document.documentElement.style.overflow = "";
      this.$dispatch("modal-closed", id);
      if (typeof this.returnTo?.focus === "function") this.returnTo.focus();
      this.returnTo = null;
    },
    focusables() {
      return visibleWithin(this.$refs.panel, FOCUSABLE);
    },
    trap(event) {
      const items = this.focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
  };
}
