import type { SiteData } from '../types/siteData'

const BOOTSTRAP_ID = '__SITE_DATA__'

/** Read SSR-injected site data so the first paint matches the database. */
export function readBootstrapSiteData(): SiteData | null {
  if (typeof document === 'undefined') return null
  try {
    const el = document.getElementById(BOOTSTRAP_ID)
    if (!el?.textContent) return null
    return JSON.parse(el.textContent) as SiteData
  } catch {
    return null
  }
}
