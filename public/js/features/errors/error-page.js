/**
 * error page actions: 429 / 503 countdowns, 503 auto-retry, back, retry.
 * retry reloads only after a GET (`mode: "reload"`); after a POST it goes back, so a form is
 * never resubmitted.
 *
 * @param {{ countdown?: number, autoRetry?: boolean, mode: "reload" | "back" }} options
 */
export function errorPage({ countdown = 0, autoRetry = false, mode }) {
  return {
    remaining: countdown,

    init() {
      if (this.remaining <= 0) return;
      const timer = setInterval(() => {
        this.remaining = Math.max(0, this.remaining - 1);
        if (this.remaining > 0) return;
        clearInterval(timer);
        if (autoRetry && mode === "reload") this.retry();
      }, 1000);
    },

    back() {
      if (window.history.length > 1) window.history.back();
      else window.location.href = "/app/databases";
    },

    retry() {
      if (this.remaining > 0) return;
      if (mode === "reload") window.location.reload();
      else this.back();
    },
  };
}
