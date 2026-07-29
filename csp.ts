const isDev = process.env.NODE_ENV === 'development'

/** CSP tuned for Next.js: strict in production, dev-friendly for React/Turbopack HMR. */
export function buildContentSecurityPolicy(): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'"

  const connectSrc = isDev
    ? "connect-src 'self' https://generativelanguage.googleapis.com https://*.supabase.co wss://*.supabase.co ws: wss: http://localhost:* https://localhost:*"
    : "connect-src 'self' https://generativelanguage.googleapis.com https://*.supabase.co wss://*.supabase.co"

  return [
    "default-src 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    connectSrc,
    "frame-ancestors 'self'",
    "base-uri 'self'",
    "form-action 'self' https://wa.me https://api.whatsapp.com",
  ].join('; ')
}

export function buildSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(self), microphone=(), geolocation=()',
    'X-DNS-Prefetch-Control': 'on',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'cross-origin',
    'Origin-Agent-Cluster': '?1',
    'Content-Security-Policy': buildContentSecurityPolicy(),
  }
}
