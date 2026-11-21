import { cx } from "@/shared/lib/cx.js";
import { FieldError, FieldLabel, inputClass } from "@/shared/views/components/Input.js";
import { Icon } from "@/shared/views/components/Icon.js";

export interface PasswordInputProps {
  id?: string;
  name: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  autocomplete?: string;
  error?: string;
  /** Danger border + aria-invalid without a per-field message (shared error region elsewhere). */
  invalid?: boolean;
  /** id of an external element describing the error (used with `invalid`). */
  describedBy?: string;
  class?: string;
  /** Alpine expression holding this field's error message. */
  alpineError?: string;
  inputAttrs?: Record<string, unknown>;
}

/** password field with an eye / eye-off reveal toggle (Alpine `passwordReveal`). */
export function PasswordInput(props: PasswordInputProps) {
  const {
    name,
    label,
    placeholder,
    required,
    autocomplete = "current-password",
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
    <div class={cx("flex flex-col gap-1", className)} x-data="passwordReveal">
      <FieldLabel for={id}>{label}</FieldLabel>
      <div class="relative">
        <input
          id={id}
          name={name}
          type="password"
          x-bind:type="shown ? 'text' : 'password'"
          placeholder={placeholder}
          required={required}
          autocomplete={autocomplete}
          class={cx(inputClass(), "pr-10")}
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
        <button
          type="button"
          class="text-text-muted ease-standard hover:text-text-primary absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-lg transition-colors duration-150"
          aria-label="Show password"
          x-bind:aria-label="shown ? 'Hide password' : 'Show password'"
          x-bind:aria-pressed="shown.toString()"
          aria-controls={id}
          x-on:click="toggle()"
        >
          <span x-show="!shown" class="inline-flex">
            <Icon name="eye" size={20} />
          </span>
          <span x-show="shown" x-cloak class="inline-flex">
            <Icon name="eye-off" size={20} />
          </span>
        </button>
      </div>
      {alpineError ? (
        <FieldError id={errorId} alpineText={alpineError} />
      ) : (
        <FieldError id={errorId}>{error}</FieldError>
      )}
    </div>
  );
}
