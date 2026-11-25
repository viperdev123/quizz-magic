/** Turnstile (human verification) is optional: with no site key the widget is not shown and no token is sent. */
export const TURNSTILE_ENABLED = Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim())
