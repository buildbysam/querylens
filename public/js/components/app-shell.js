/** app shell: mobile navigation drawer, closed with Esc */
export function appShell() {
  return {
    navOpen: false,
    root: {
      "@keydown.escape"() {
        this.navOpen = false;
      },
    },
  };
}
