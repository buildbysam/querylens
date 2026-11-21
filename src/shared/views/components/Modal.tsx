import { cx } from "@/shared/lib/cx.js";
import type { Child } from "hono/jsx";
import { Icon } from "@/shared/views/components/Icon.js";

export type ModalSize = "md" | "wide" | "lg";

const widths: Record<ModalSize, string> = {
  md: "max-w-120",
  wide: "max-w-140",
  lg: "max-w-160",
};

/**
 * Attributes for any element that opens a modal. Focus returns to this element on close.
 * Usage: <Button {...modalTrigger("register-db")}>Register Database</Button>
 */
export function modalTrigger(id: string) {
  return {
    "x-data": "",
    "x-on:click": `$dispatch('open-modal', '${id}')`,
    "aria-haspopup": "dialog",
    "aria-controls": id,
  };
}

export interface ModalProps {
  id: string;
  title: string;
  size?: ModalSize;
  children?: Child;
  /**
   * Footer row content. Convention: ghost Cancel on the left, primary action on the right.
   * Elements inside can call `close()`.
   */
  footer?: Child;
  /** Extra Alpine state merged into the modal scope, e.g. "registerForm" component name. */
  bodyData?: string;
}

/**
 * Alpine `modal` component: opens on `open-modal` window event with its id,
 * Esc / backdrop / X close it, focus is trapped and returned to the trigger.
 */
export function Modal({ id, title, size = "md", children, footer, bodyData }: ModalProps) {
  const titleId = `${id}-title`;
  return (
    <div x-data={`modal('${id}')`} x-bind="root">
      {/* leave="duration-150" only delays hiding so the panel's leave transition can play */}
      <div
        x-show="open"
        x-cloak
        x-transition:leave="duration-150"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="bg-app/80 absolute inset-0"
          aria-hidden="true"
          x-show="open"
          x-transition:enter="transition-opacity duration-200 ease-standard"
          x-transition:enter-start="opacity-0"
          x-transition:enter-end="opacity-100"
          x-transition:leave="transition-opacity duration-150 ease-standard"
          x-transition:leave-start="opacity-100"
          x-transition:leave-end="opacity-0"
          x-on:click="close()"
        />
        <div
          id={id}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          x-ref="panel"
          x-bind="panel"
          x-show="open"
          x-transition:enter="transition duration-200 ease-standard"
          x-transition:enter-start="opacity-0 translate-y-2"
          x-transition:enter-end="opacity-100 translate-y-0"
          x-transition:leave="transition duration-150 ease-standard"
          x-transition:leave-start="opacity-100 translate-y-0"
          x-transition:leave-end="opacity-0 translate-y-2"
          class={cx(
            "border-border bg-elevated shadow-overlay relative flex max-h-full w-full flex-col rounded-xl border p-6",
            widths[size]
          )}
          {...(bodyData ? { "x-data": bodyData } : {})}
        >
          <div class="flex items-start justify-between gap-4">
            <h2 id={titleId} class="tracking-heading text-text-primary text-lg font-semibold">
              {title}
            </h2>
            <button
              type="button"
              class="text-text-muted ease-standard hover:bg-surface hover:text-text-primary -mt-1 -mr-2 flex size-8 items-center justify-center rounded-lg transition-colors duration-150"
              aria-label="Close"
              x-on:click="close()"
            >
              <Icon name="x" size={16} />
            </button>
          </div>
          <div class="mt-4 min-h-0 overflow-y-auto">{children}</div>
          {footer && <div class="mt-6 flex items-center justify-between gap-4">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
