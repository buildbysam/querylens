/**
 * serialises data for a <script type="application/json"> block. Escapes "<" (so "</script>"
 * and "<!--" can't break out) and the JS line separators U+2028 / U+2029.
 */
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), "g");
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), "g");
const BACKSLASH = String.fromCharCode(0x5c);

export function scriptJson(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, BACKSLASH + "u003c")
    .replace(LINE_SEPARATOR, BACKSLASH + "u2028")
    .replace(PARAGRAPH_SEPARATOR, BACKSLASH + "u2029");
}
