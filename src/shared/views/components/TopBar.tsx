import { cx } from "@/shared/lib/cx.js";
import { Button } from "@/shared/views/components/Button.js";
import { Icon } from "@/shared/views/components/Icon.js";
import { LogoMark } from "@/shared/views/components/Logo.js";
import { optionClass, popoverClass } from "@/shared/views/components/Select.js";
import type { Child } from "hono/jsx";

export interface CurrentUser {
  name: string;
  email: string;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0]![0]! + parts[parts.length - 1]![0]! : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

function AvatarMenu({ user }: { user: CurrentUser }) {
  return (
    <div class="relative" x-data="dropdown" x-bind="root">
      <button
        type="button"
        x-ref="trigger"
        x-bind="trigger"
        aria-haspopup="menu"
        aria-label={`Account menu for ${user.name}`}
        class="border-line bg-elevated text-fg ease-standard hover:border-line-strong flex size-7 items-center justify-center rounded-full border text-xs font-semibold transition-colors duration-150"
      >
        {initials(user.name)}
      </button>
      <div x-bind="panel" x-cloak class={cx(popoverClass, "right-0 w-60")} role="menu">
        <div class="border-line border-b px-3 pt-2 pb-3">
          <p class="text-fg truncate text-base font-medium">{user.name}</p>
          <p class="text-fg-muted truncate font-mono text-xs">{user.email}</p>
        </div>
        <form method="post" action="/auth/logout" class="pt-1">
          <button type="submit" role="menuitem" data-option class={optionClass(false)}>
            <Icon name="log-out" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}

export interface TopBarProps {
  /** Current page title (Inter 500 / 14px). */
  title: string;
  user: CurrentUser;
  /** Optional database pill — only present on /app/snapshots (§3.1). */
  pill?: Child;
}

export function TopBar({ title, user, pill }: TopBarProps) {
  return (
    <header class="border-line bg-surface sticky top-0 z-40 flex h-14 items-center gap-4 border-b px-4">
      <button
        type="button"
        class="text-fg-secondary ease-standard hover:bg-elevated hover:text-fg -ml-1 flex size-8 items-center justify-center rounded-lg transition-colors duration-150 md:hidden"
        aria-label="Open navigation"
        aria-controls="app-sidebar"
        x-bind:aria-expanded="navOpen.toString()"
        x-on:click="navOpen = !navOpen"
      >
        <Icon name="menu" size={20} />
      </button>
      <a href="/app/databases" class="flex items-center rounded-lg" aria-label="QueryLens home">
        <LogoMark size={24} />
      </a>
      <p class="text-fg truncate text-base font-medium">{title}</p>
      {pill && <div class="min-w-0">{pill}</div>}
      <div class="ml-auto flex items-center gap-2">
        <Button variant="ghost" size="sm" icon="plus" href="/app/databases?register=1" aria-label="New Database">
          <span class="hidden sm:inline">New Database</span>
        </Button>
        <AvatarMenu user={user} />
      </div>
    </header>
  );
}
