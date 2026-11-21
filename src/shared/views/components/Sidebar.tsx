import { cx } from "@/shared/lib/cx.js";
import { Icon, type IconName } from "@/shared/views/components/Icon.js";
import type { StatusVariant } from "@/shared/views/components/StatusBadge.js";
import { StatusDot } from "@/shared/views/components/StatusDot.js";

export type NavKey = "databases" | "snapshots" | "health";

/** The only in-scope sections: Overview · Observe · System. */
const sections: { label: string; items: { key: NavKey; label: string; href: string; icon: IconName }[] }[] = [
  { label: "Overview", items: [{ key: "databases", label: "Databases", href: "/app/databases", icon: "database" }] },
  { label: "Observe", items: [{ key: "snapshots", label: "Snapshots", href: "/app/snapshots", icon: "camera" }] },
  { label: "System", items: [{ key: "health", label: "Health", href: "/health", icon: "heart-pulse" }] },
];

export interface SystemStatus {
  variant: StatusVariant;
  /** e.g. "System healthy", "Degraded", "Platform down". */
  label: string;
}

export interface SidebarProps {
  active: NavKey;
  systemStatus: SystemStatus;
}

export function Sidebar({ active, systemStatus }: SidebarProps) {
  return (
    <>
      <div
        class="bg-app/80 fixed inset-0 top-14 z-20 md:hidden"
        x-show="navOpen"
        x-cloak
        x-on:click="navOpen = false"
        aria-hidden="true"
      />
      <aside
        id="app-sidebar"
        aria-label="Primary"
        class="border-border-subtle bg-sidebar fixed top-14 bottom-0 left-0 z-30 hidden w-60 flex-col border-r px-3 pb-4 md:flex md:w-16 md:px-2 lg:w-60 lg:px-3"
        x-bind:class="navOpen ? 'max-md:flex' : ''"
      >
        <nav class="flex-1 overflow-y-auto">
          {sections.map((section) => (
            <div class="mt-6">
              <p class="text-2xs tracking-label text-text-muted mb-2 px-3 font-semibold uppercase md:max-lg:sr-only">
                {section.label}
              </p>
              <ul class="flex flex-col gap-1">
                {section.items.map((item) => {
                  const isActive = item.key === active;
                  return (
                    <li>
                      <a
                        href={item.href}
                        title={item.label}
                        aria-current={isActive ? "page" : undefined}
                        class={cx(
                          "group ease-standard relative flex h-9 items-center gap-3 rounded-lg px-3 text-base font-medium transition-colors duration-150 md:max-lg:justify-center md:max-lg:px-0",
                          isActive
                            ? "bg-brand-900 text-brand-400 before:bg-brand-400 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full"
                            : "text-text-secondary hover:bg-hover hover:text-text-primary"
                        )}
                      >
                        <Icon
                          name={item.icon}
                          size={20}
                          class={
                            isActive
                              ? "text-brand-400"
                              : "text-text-muted ease-standard group-hover:text-text-primary transition-colors duration-150"
                          }
                        />
                        <span class="md:max-lg:sr-only">{item.label}</span>
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>
        <a
          href="/health"
          title={systemStatus.label}
          class="text-text-muted ease-standard hover:bg-hover hover:text-text-secondary flex h-9 items-center rounded-lg px-3 text-xs transition-colors duration-150 md:max-lg:justify-center md:max-lg:px-0"
        >
          <StatusDot variant={systemStatus.variant} class="text-xs" />
          <span class="ml-2 md:max-lg:sr-only">{systemStatus.label}</span>
        </a>
      </aside>
    </>
  );
}
