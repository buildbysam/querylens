/**
 * registers the "@/…" alias resolver for the compiled build:
 *   node --import ./scripts/register-aliases.js dist/index.js
 */
import { register } from "node:module";

register("./alias-hooks.js", import.meta.url);
