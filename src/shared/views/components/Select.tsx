import { cx } from "@/shared/lib/cx.js";
import { Icon } from "@/shared/views/components/Icon.js";
import { inputClass } from "@/shared/views/components/Input.js";
import type { Child } from "hono/jsx";

export const popoverClass =
  "absolute z-30 mt-2 min-w-full overflow-hidden rounded-lg border border-line bg-elevated p-1 shadow-overlay";

export function optionClass(selected: boolean) {
  return cx(
    "flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-base transition-colors duration-150 ease-standard",
    selected
      ? "bg-accent-subtle text-accent"
      : "text-fg-secondary hover:bg-subtle hover:text-fg focus:bg-subtle focus:text-fg"
  );
}

export interface SelectOption {
  value: string;
  label: string;
  /** Navigates on choose (server-rendered selection, no client fetch). */
  href?: string;
  /** Optional secondary text (e.g. host), set in mono. */
  meta?: string;
}

export interface DropdownProps {
  /** Accessible name of the listbox. */
  label: string;
  /** Classes for the trigger button. */
  triggerClass: string;
  trigger: Child;
  options: SelectOption[];
  selected?: string;
  /** Adds a filter input above the options. */
  searchable?: boolean;
  emptyText?: string;
  align?: "left" | "right";
  panelClass?: string;
}

/**
 * Generic Alpine `dropdown`: trigger + listbox popover. Esc and outside-click close it,
 * arrow keys move between options, focus returns to the trigger.
 */
export function Dropdown(props: DropdownProps) {
  const {
    label,
    triggerClass,
    trigger,
    options,
    selected,
    searchable,
    emptyText = "No matches",
    align = "left",
    panelClass,
  } = props;

  return (
    <div class="relative" x-data="dropdown" x-bind="root">
      <button type="button" class={triggerClass} aria-haspopup="listbox" x-bind="trigger" x-ref="trigger">
        {trigger}
      </button>
      <div
        x-bind="panel"
        x-cloak
        x-transition:enter="transition ease-standard duration-150"
        x-transition:enter-start="opacity-0 -translate-y-1"
        x-transition:enter-end="opacity-100 translate-y-0"
        class={cx(popoverClass, align === "right" ? "right-0" : "left-0", panelClass)}
      >
        {searchable && (
          <div class="relative mb-1">
            <span class="text-fg-muted pointer-events-none absolute inset-y-0 left-3 flex items-center">
              <Icon name="search" />
            </span>
            <input
              type="search"
              x-model="query"
              x-ref="search"
              placeholder="Search…"
              aria-label={`Search ${label.toLowerCase()}`}
              class={cx(inputClass(), "h-9 pl-9")}
            />
          </div>
        )}
        <ul role="listbox" aria-label={label} class="flex max-h-72 flex-col overflow-y-auto">
          {options.map((option) => {
            const isSelected = option.value === selected;
            const inner = (
              <>
                <span class="truncate">{option.label}</span>
                {option.meta && <span class="text-fg-muted ml-auto truncate font-mono text-xs">{option.meta}</span>}
                {isSelected && <Icon name="check" class={option.meta ? "" : "ml-auto"} />}
              </>
            );
            return (
              <li role="presentation" data-label={`${option.label} ${option.meta ?? ""}`} x-show="matches($el)">
                {option.href ? (
                  <a
                    href={option.href}
                    role="option"
                    aria-selected={isSelected ? "true" : "false"}
                    class={optionClass(isSelected)}
                    data-option
                  >
                    {inner}
                  </a>
                ) : (
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected ? "true" : "false"}
                    class={optionClass(isSelected)}
                    data-option
                    data-value={option.value}
                    x-on:click="choose($el.dataset.value)"
                  >
                    {inner}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {searchable && (
          <p class="text-fg-muted px-3 py-2 text-sm" x-show="!hasMatches()" x-cloak>
            {emptyText}
          </p>
        )}
      </div>
    </div>
  );
}

export interface SelectProps extends Omit<DropdownProps, "triggerClass" | "trigger"> {
  placeholder?: string;
  class?: string;
}

/** §4.3 Select — closed state matches Input. */
export function Select({ placeholder = "Select…", class: className, ...props }: SelectProps) {
  const current = props.options.find((o) => o.value === props.selected);
  return (
    <div class={className}>
      <Dropdown
        {...props}
        triggerClass={cx(inputClass(), "flex items-center justify-between gap-2 text-left")}
        trigger={
          <>
            <span class={current ? "truncate" : "text-fg-muted truncate"}>{current?.label ?? placeholder}</span>
            <Icon name="chevron-down" class="text-fg-muted" />
          </>
        }
      />
    </div>
  );
}
