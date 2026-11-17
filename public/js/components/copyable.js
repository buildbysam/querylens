const COPIED_MS = 1500;

/** copy-to-clipboard with a brief "copied" state */
export function copyable() {
  return {
    copied: false,
    async copy(text) {
      if (!navigator.clipboard) return;
      try {
        await navigator.clipboard.writeText(String(text ?? "").trim());
        this.copied = true;
        setTimeout(() => {
          this.copied = false;
        }, COPIED_MS);
      } catch {
        // clipboard permission denied: leave the icon unchanged
      }
    },
  };
}
