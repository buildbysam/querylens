/** eye/eye-off toggle for password fields. used by PasswordInput. */
export function passwordReveal() {
  return {
    shown: false,
    toggle() {
      this.shown = !this.shown;
    },
  };
}
