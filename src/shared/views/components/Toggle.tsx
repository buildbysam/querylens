import { cx } from "@/shared/lib/cx.js";

export interface ToggleProps {
  name: string;
  label: string;
  checked?: boolean;
  disabled?: boolean;
  /** Visually hide the text label (it is still announced). */
  hideLabel?: boolean;
  class?: string;
  inputAttrs?: Record<string, unknown>;
}

export function Toggle({ name, label, checked, disabled, hideLabel, class: className, inputAttrs }: ToggleProps) {
  return (
    <label
      class={cx(
        "inline-flex cursor-pointer items-center gap-2 has-disabled:cursor-not-allowed has-disabled:opacity-40",
        className
      )}
    >
      <span class="relative inline-flex">
        <input
          type="checkbox"
          role="switch"
          name={name}
          checked={checked}
          disabled={disabled}
          class="peer sr-only"
          {...inputAttrs}
        />
        <span
          class="bg-subtle peer-checked:bg-accent peer-focus-visible:outline-accent h-4.5 w-8 rounded-full peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2"
          aria-hidden="true"
        />
        <span
          class="border-line bg-knob ease-standard absolute top-0.5 left-0.5 size-3.5 rounded-full border transition-transform duration-150 peer-checked:translate-x-3.5"
          aria-hidden="true"
        />
      </span>
      <span class={hideLabel ? "sr-only" : "text-fg-secondary text-base"}>{label}</span>
    </label>
  );
}
