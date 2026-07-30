import type { SiteData } from '../types/siteData'
import { getAuthToken } from './siteDataStorage'

const BOOTSTRAP_ID = '__SITE_DATA__'

declare global {
  interface Window {
    __DORGHAM_BOOTSTRAP__?: SiteData
  }
}

/** Read SSR-injected site data — must run before any default/fallback content renders. */
export function readBootstrapSiteData(): SiteData | null {
  if (typeof window === 'undefined') return null

  if (window.__DORGHAM_BOOTSTRAP__) {
    return window.__DORGHAM_BOOTSTRAP__
  }

  try {
    const el = document.getElementById(BOOTSTRAP_ID)
    if (!el?.textContent) return null
    const parsed = JSON.parse(el.textContent) as SiteData
    window.__DORGHAM_BOOTSTRAP__ = parsed
    return parsed
  } catch {
    return null
  }
}

export function resolveInitialSiteData(serverData?: SiteData | null): SiteData | null {
  return serverData ?? readBootstrapSiteData()
}

export function isSiteDataNewer(next: SiteData, prev: SiteData): boolean {
  return (next.updatedAt ?? 0) > (prev.updatedAt ?? 0)
}

/** Authenticated sessions need full API media; equal updatedAt must not keep stripped bootstrap. */
export function shouldApplyIncomingSiteData(incoming: SiteData, current: SiteData): boolean {
  if (getAuthToken()) return true
  if (isSiteDataNewer(incoming, current)) return true
  return countCatalogImages(incoming) > countCatalogImages(current)
}

function countCatalogImages(data: SiteData): number {
  return (data.products ?? []).filter(
    (p) => Boolean(p.image?.trim()) || (p.images ?? []).some((url) => Boolean(url?.trim()))
  ).length
}
