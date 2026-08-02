/** Base URL for the API in production (empty = same domain as the site). */
export function getApiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL ?? '').replace(/\/$/, '')
}

/** Prefer same-origin relative API paths to avoid www/apex CORS mismatches. */
export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  const base = getApiBase()

  if (!base) return normalized

  if (typeof window !== 'undefined') {
    try {
      const configured = new URL(base.startsWith('http') ? base : `${window.location.origin}${base}`)
      if (configured.origin === window.location.origin) return normalized
    } catch {
      return normalized
    }
  }

  return `${base}${normalized}`
}
