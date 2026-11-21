/**
 * node module-resolution hook for the compiled build.  
 * e.g. "@/shared/db/client.js" → dist/shared/db/client.js.
 * loaded by scripts/register-aliases.js
 */
const DIST_ROOT = new URL("../dist/", import.meta.url);
const ALIAS = "@/";

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(ALIAS)) {
    return nextResolve(new URL(specifier.slice(ALIAS.length), DIST_ROOT).href, context);
  }
  return nextResolve(specifier, context);
}
