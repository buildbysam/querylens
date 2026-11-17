/**
 * sign-in form: disables the button and shows the ring while submitting.
 * form itself is a plain HTML POST. resets when the page is restored from the
 * back/forward cache so the button isn't stuck disabled.
 */
export function loginForm() {
  return {
    submitting: false,
    init() {
      window.addEventListener("pageshow", () => {
        this.submitting = false;
      });
    },
    submit() {
      this.submitting = true;
    },
  };
}
