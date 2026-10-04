interface BlogEnv {
  DATABASE_URL: string;
  NEON_AUTH_BASE_URL: string;
  NEON_AUTH_COOKIE_SECRET: string;
  PUBLIC_SITE_URL: string;
  TURNSTILE_SITE_KEY?: string;
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  INITIAL_MODERATOR_EMAIL?: string;
}

declare module "cloudflare:workers" {
  export const env: BlogEnv;
}

declare namespace App {
  interface Locals {
    cfContext?: ExecutionContext;
  }
}
