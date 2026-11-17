import { visibleWithin } from "../lib/dom.js";

/**
 * popover listbox: select, the top-bar database pill and the avatar menu
 * markup: wrapper `x-bind="root"`, button `x-bind="trigger" x-ref="trigger"`, panel `x-bind="panel"`,
 * options `[data-option]`, filterable rows `li[data-label]`, optional `x-ref="search"`.
 */
export function dropdown() {
  return {
    open: false,
    query: "",

    root: {
      "@click.outside"() {
        this.close(false);
      },
      "@keydown.escape"(event) {
        if (!this.open) return;
        event.stopPropagation();
        this.close(true);
      },
    },
    trigger: {
      "@click"() {
        if (this.open) this.close(false);
        else this.show();
      },
      "@keydown.arrow-down.prevent"() {
        this.show();
      },
      ":aria-expanded"() {
        return String(this.open);
      },
    },
    panel: {
      "x-show"() {
        return this.open;
      },
      "@keydown.arrow-down.prevent"() {
        this.move(1);
      },
      "@keydown.arrow-up.prevent"() {
        this.move(-1);
      },
    },

    show() {
      this.open = true;
      this.$nextTick(() => {
        if (this.$refs.search) this.$refs.search.focus();
        else this.move(0);
      });
    },
    close(focusTrigger) {
      if (!this.open) return;
      this.open = false;
      this.query = "";
      if (focusTrigger) this.$refs.trigger?.focus();
    },
    move(delta) {
      const options = visibleWithin(this.$root, "[data-option]");
      if (!options.length) return;
      const index = options.indexOf(document.activeElement);
      const next =
        index === -1 ? (delta < 0 ? options.length - 1 : 0) : Math.min(Math.max(index + delta, 0), options.length - 1);
      options[next].focus();
    },
    matches(el) {
      if (!this.query) return true;
      return (el.dataset.label ?? "").toLowerCase().includes(this.query.toLowerCase());
    },
    hasMatches() {
      return Array.from(this.$root.querySelectorAll("li[data-label]")).some((li) => this.matches(li));
    },
    choose(value) {
      this.$dispatch("dropdown-change", value);
      this.close(true);
    },
  };
}
