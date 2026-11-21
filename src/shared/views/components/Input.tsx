import { cx } from "@/shared/lib/cx.js";
import type { Child } from "hono/jsx";

/**
 * Error state follows aria-invalid, so server- and Alpine-driven errors share one style.
 */
export function inputClass() {
  return "h-10 w-full rounded-lg border border-border bg-input px-3 text-base text-text-primary placeholder:text-text-muted transition-colors duration-150 ease-standard hover:border-border-hover focus:border-border-focus disabled:cursor-not-allowed disabled:opacity-40 aria-invalid:border-danger aria-invalid:hover:border-danger aria-invalid:focus:border-danger";
}

/** 12px uppercase muted label, 4px above the control. */
export function FieldLabel({ for: htmlFor, children }: { for: string; children: Child }) {
  return (
    <label for={htmlFor} class="tracking-label text-text-secondary text-xs font-semibold uppercase">
      {children}
    </label>
  );
}

/** Error helper line under a field: 12px, danger. */
export function FieldError({ id, children, alpineText }: { id: string; children?: Child; alpineText?: string }) {
  if (alpineText) {
    return <p id={id} class="text-danger text-xs" x-show={alpineText} x-text={alpineText} x-cloak />;
  }
  if (!children) return null;
  return (
    <p id={id} class="text-danger text-xs">
      {children}
    </p>
  );
}

export interface InputProps {
  id?: string;
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "url" | "search" | "password";
  value?: string | number;
  placeholder?: string;
  required?: boolean;
  autofocus?: boolean;
  autocomplete?: string;
  /** Server-rendered error message; turns the border danger and sets aria-invalid. */
  error?: string;
  /** Danger border + aria-invalid without a per-field message (shared error region elsewhere). */
  invalid?: boolean;
  /** id of an external element describing the error (used with `invalid`). */
  describedBy?: string;
  class?: string;
  /** Alpine expression holding this field's error message (client-side validation). */
  alpineError?: string;
  /** Extra attributes for the <input> itself (x-model, min, max, inputmode, …). */
  inputAttrs?: Record<string, unknown>;
}

export function Input(props: InputProps) {
  const {
    name,
    label,
    type = "text",
    value,
    placeholder,
    required,
    autofocus,
    autocomplete,
    error,
    invalid,
    describedBy,
    alpineError,
    class: className,
    inputAttrs,
  } = props;
  const id = props.id ?? `field-${name}`;
  const errorId = `${id}-error`;
  const isInvalid = !!error || !!invalid;
  const describedById = error ? errorId : describedBy;

  return (
    <div class={cx("flex flex-col gap-1", className)}>
      <FieldLabel for={id}>{label}</FieldLabel>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        required={required}
        autofocus={autofocus}
        autocomplete={autocomplete}
        class={inputClass()}
        aria-invalid={isInvalid ? "true" : undefined}
        aria-describedby={isInvalid ? describedById : undefined}
        {...(alpineError
          ? {
              "x-bind:aria-invalid": `${alpineError} ? 'true' : null`,
              "x-bind:aria-describedby": `${alpineError} ? '${errorId}' : null`,
            }
          : {})}
        {...inputAttrs}
      />
      {alpineError ? (
        <FieldError id={errorId} alpineText={alpineError} />
      ) : (
        <FieldError id={errorId}>{error}</FieldError>
      )}
    </div>
  );
}
