import { cx } from "@/shared/lib/cx.js";
import { Icon } from "@/shared/views/components/Icon.js";

export interface CodeBlockProps {
  /** Server-rendered content. Callers must redact secrets as •••• before passing (§5.4). */
  code?: string;
  /** Alpine expression supplying the content instead (e.g. JSON fetched on refresh). */
  alpineText?: string;
  /** 13px default; 12px for error-page details (§5.5). */
  size?: "sm" | "xs";
  /** Scroll container height limit, e.g. "max-h-96". */
  maxHeightClass?: string;
  label?: string;
  copyable?: boolean;
  class?: string;
}

export function CodeBlock({
  code,
  alpineText,
  size = "sm",
  maxHeightClass,
  label = "Code",
  copyable = true,
  class: className,
}: CodeBlockProps) {
  return (
    <div
      class={cx("border-border-subtle bg-sidebar relative rounded-xl border", className)}
      x-data={copyable ? "copyable" : undefined}
    >
      {copyable && (
        <button
          type="button"
          class="text-text-muted ease-standard hover:text-text-primary absolute top-2 right-2 flex size-8 items-center justify-center rounded-lg transition-colors duration-150"
          aria-label={`Copy ${label.toLowerCase()}`}
          x-on:click="copy($refs.code.textContent)"
        >
          <span x-show="!copied" class="inline-flex">
            <Icon name="copy" size={16} />
          </span>
          <span x-show="copied" x-cloak class="text-success inline-flex">
            <Icon name="check" size={16} />
          </span>
        </button>
      )}
      <pre
        class={cx(
          "text-text-secondary overflow-auto p-4 font-mono whitespace-pre",
          size === "xs" ? "text-xs" : "text-sm",
          copyable && "pr-12",
          maxHeightClass
        )}
        tabindex={0}
        aria-label={label}
      >
        <code x-ref="code" {...(alpineText ? { "x-text": alpineText } : {})}>
          {code}
        </code>
      </pre>
    </div>
  );
}
