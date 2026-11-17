/**
 * Alpine.js (CDN, no build step) and the small set of Alpine components the shared UI
 * Components:
 *   passwordReveal  — eye / eye-off toggle (§4.2)
 *   copyable        — copy-to-clipboard icon (§4.7, reference strips)
 *   dropdown        — popover listbox (§4.3, database pill, avatar menu)
 *   modal(id)       — open/close, Esc, focus trap, focus return (§4.8, §7)
 *   $store.toasts   — toast queue, 4s auto-dismiss (§4.9)
 */

export const ALPINE_SRC = "https://cdn.jsdelivr.net/npm/alpinejs@3.14.9/dist/cdn.min.js";

const components = /* js */ `
document.addEventListener("alpine:init", function () {
  var FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function visible(el) {
    return !!(el.offsetWidth || el.offsetHeight || el.getClientRects().length);
  }

  Alpine.data("passwordReveal", function () {
    return {
      shown: false,
      toggle: function () { this.shown = !this.shown; },
    };
  });

  Alpine.data("copyable", function () {
    return {
      copied: false,
      copy: function (text) {
        var self = this;
        if (!navigator.clipboard) return;
        navigator.clipboard.writeText(String(text || "").trim()).then(function () {
          self.copied = true;
          setTimeout(function () { self.copied = false; }, 1500);
        }).catch(function () {});
      },
    };
  });

  Alpine.data("dropdown", function () {
    return {
      open: false,
      query: "",
      root: {
        "@click.outside": function () { this.close(false); },
        "@keydown.escape": function (e) { if (this.open) { e.stopPropagation(); this.close(true); } },
      },
      trigger: {
        "@click": function () { this.open ? this.close(false) : this.show(); },
        "@keydown.arrow-down.prevent": function () { this.show(); },
        ":aria-expanded": function () { return this.open.toString(); },
      },
      panel: {
        "x-show": function () { return this.open; },
        "@keydown.arrow-down.prevent": function () { this.move(1); },
        "@keydown.arrow-up.prevent": function () { this.move(-1); },
      },
      show: function () {
        var self = this;
        this.open = true;
        this.$nextTick(function () {
          if (self.$refs.search) self.$refs.search.focus();
          else self.move(0);
        });
      },
      close: function (focusTrigger) {
        if (!this.open) return;
        this.open = false;
        this.query = "";
        if (focusTrigger && this.$refs.trigger) this.$refs.trigger.focus();
      },
      options: function () {
        return Array.prototype.filter.call(this.$root.querySelectorAll("[data-option]"), visible);
      },
      move: function (delta) {
        var opts = this.options();
        if (!opts.length) return;
        var i = opts.indexOf(document.activeElement);
        var next = i === -1 ? (delta < 0 ? opts.length - 1 : 0) : Math.min(Math.max(i + delta, 0), opts.length - 1);
        opts[next].focus();
      },
      matches: function (el) {
        if (!this.query) return true;
        return (el.dataset.label || "").toLowerCase().indexOf(this.query.toLowerCase()) !== -1;
      },
      hasMatches: function () {
        var self = this;
        return Array.prototype.some.call(this.$root.querySelectorAll("li[data-label]"), function (li) {
          return self.matches(li);
        });
      },
      choose: function (value) {
        this.$dispatch("dropdown-change", value);
        this.close(true);
      },
    };
  });

  Alpine.data("modal", function (id) {
    return {
      open: false,
      returnTo: null,
      root: {
        "@open-modal.window": function (e) { if (e.detail === id) this.show(); },
        "@close-modal.window": function (e) { if (e.detail === id) this.close(); },
        "@keydown.escape.window": function () { if (this.open) this.close(); },
      },
      panel: {
        "@keydown.tab": function (e) { this.trap(e); },
      },
      show: function () {
        var self = this;
        this.returnTo = document.activeElement;
        this.open = true;
        document.documentElement.style.overflow = "hidden";
        this.$nextTick(function () {
          var panel = self.$refs.panel;
          var preferred = panel.querySelector("[data-autofocus]");
          var first = preferred && visible(preferred) ? preferred : self.focusables()[0];
          if (first) first.focus();
        });
      },
      close: function () {
        if (!this.open) return;
        this.open = false;
        document.documentElement.style.overflow = "";
        this.$dispatch("modal-closed", id);
        if (this.returnTo && typeof this.returnTo.focus === "function") this.returnTo.focus();
        this.returnTo = null;
      },
      focusables: function () {
        return Array.prototype.filter.call(this.$refs.panel.querySelectorAll(FOCUSABLE), visible);
      },
      trap: function (e) {
        var items = this.focusables();
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      },
    };
  });

  Alpine.store("toasts", {
    items: [],
    nextId: 1,
    push: function (type, message) {
      var self = this;
      var id = this.nextId++;
      this.items.push({ id: id, type: type, message: message });
      setTimeout(function () { self.dismiss(id); }, 4000);
    },
    dismiss: function (id) {
      this.items = this.items.filter(function (t) { return t.id !== id; });
    },
  });

  window.addEventListener("toast", function (e) {
    if (e.detail && e.detail.message) Alpine.store("toasts").push(e.detail.type || "info", e.detail.message);
  });
});
`;

export function ClientScripts() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: components }} />
      <script defer src={ALPINE_SRC} />
    </>
  );
}
