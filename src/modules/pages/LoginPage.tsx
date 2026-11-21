import { APP_NAME, APP_VERSION } from "@/shared/lib/app-info.js";
import { DEFAULT_AFTER_LOGIN } from "@/shared/lib/redirect.js";
import { PAGE_SCRIPTS } from "@/shared/views/assets.js";
import { Button } from "@/shared/views/components/Button.js";
import { Input } from "@/shared/views/components/Input.js";
import { Logo } from "@/shared/views/components/Logo.js";
import { PasswordInput } from "@/shared/views/components/PasswordInput.js";
import { AuthLayout } from "@/shared/views/layouts/AuthLayout.js";

export interface LoginPageProps {
  /** Inline error shown above the button after a failed sign-in. */
  error?: string;
  /** Email to keep in the field after a failed attempt. */
  email?: string;
  /** Validated path to return to after sign-in. */
  next: string;
}

const ERROR_ID = "login-error";

/** /login. Plain HTML form POST */
export function LoginPage({ error, email, next }: LoginPageProps) {
  return (
    <AuthLayout title="Sign in" script={PAGE_SCRIPTS.login}>
      <div class="border-border-subtle bg-surface w-full max-w-100 rounded-xl border p-8">
        <div class="flex justify-center">
          <Logo size="lg" />
        </div>

        <h1 class="tracking-heading text-text-primary mt-6 text-center text-xl font-semibold">Sign in to {APP_NAME}</h1>
        <p class="text-text-secondary mt-2 text-center text-base">Monitor your PostgreSQL databases.</p>

        <form
          method="post"
          action="/auth/login"
          class="mt-8 flex flex-col gap-4"
          x-data="loginForm"
          x-on:submit="submit()"
        >
          {next !== DEFAULT_AFTER_LOGIN && <input type="hidden" name="next" value={next} />}

          <Input
            name="email"
            label="Email"
            type="email"
            value={email}
            placeholder="you@company.com"
            autocomplete="username"
            required
            autofocus
            invalid={!!error}
            describedBy={ERROR_ID}
          />
          <PasswordInput
            name="password"
            label="Password"
            required
            autocomplete="current-password"
            invalid={!!error}
            describedBy={ERROR_ID}
          />

          {error && (
            <p id={ERROR_ID} role="alert" class="text-danger text-sm">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" class="w-full" loadingWhen="submitting">
            Sign in
          </Button>

          <div class="flex justify-end">
            <a
              href="/login"
              title="Not available in MVP"
              class="text-brand-400 ease-standard hover:text-brand-100 rounded-md text-sm transition-colors duration-150"
            >
              Forgot password?
            </a>
          </div>
        </form>
      </div>

      <p class="text-text-muted mt-6 text-center text-xs">
        {APP_NAME} v{APP_VERSION} · PostgreSQL Observability
      </p>
    </AuthLayout>
  );
}
