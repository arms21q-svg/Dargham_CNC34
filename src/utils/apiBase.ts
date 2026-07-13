/** Base URL for the API in production (empty = same domain as the site). */
export function getApiBase(): string {
  return (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
}

export function apiUrl(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${getApiBase()}${normalized}`
}
