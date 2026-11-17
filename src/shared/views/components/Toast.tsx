import { Icon } from "@/shared/views/components/Icon.js";

export type ToastType = "success" | "warning" | "danger" | "info";

export interface ToastMessage {
  type: ToastType;
  message: string;
}

export function ToastRegion({ initial = [] }: { initial?: ToastMessage[] }) {
  return (
    <div
      class="pointer-events-none fixed right-4 bottom-4 z-60 flex w-full max-w-90 flex-col gap-2"
      role="status"
      aria-live="polite"
      x-data
      x-init={
        initial.length ? `${JSON.stringify(initial)}.forEach(t => $store.toasts.push(t.type, t.message))` : undefined
      }
    >
      <template x-for="toast in $store.toasts.items" x-bind:key="toast.id">
        <div
          class="border-line bg-elevated text-fg-secondary shadow-overlay pointer-events-auto flex items-start gap-3 rounded-lg border border-l-3 px-4 py-3 text-sm"
          x-bind:class="{
            'border-l-success': toast.type === 'success',
            'border-l-warning': toast.type === 'warning',
            'border-l-danger': toast.type === 'danger',
            'border-l-info': toast.type === 'info',
          }"
          x-transition:enter="transition duration-200 ease-standard"
          x-transition:enter-start="opacity-0 translate-y-2"
          x-transition:enter-end="opacity-100 translate-y-0"
        >
          <p class="flex-1" x-text="toast.message" />
          <button
            type="button"
            class="text-fg-muted ease-standard hover:text-fg -my-1 -mr-2 flex size-6 items-center justify-center rounded-md transition-colors duration-150"
            aria-label="Dismiss notification"
            x-on:click="$store.toasts.dismiss(toast.id)"
          >
            <Icon name="x" size={14} />
          </button>
        </div>
      </template>
    </div>
  );
}
