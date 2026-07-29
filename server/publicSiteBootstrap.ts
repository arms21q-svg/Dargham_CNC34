import { getCachedSiteData } from './cachedSiteData'
import { lightPublicSiteData } from './lightSiteData'
import type { SiteData } from '@/types/siteData'

/** Server-side public payload for HTML bootstrap (no credentials, light images). */
export async function getPublicSiteBootstrap(): Promise<SiteData | null> {
  const data = await getCachedSiteData()
  if (!data) return null

  const sanitized: SiteData = {
    ...data,
    settings: {
      ...data.settings,
      adminEmail: '',
      adminPassword: '',
    },
  }

  return lightPublicSiteData(sanitized)
}

/** Safe JSON for inline script tags. */
export function safeJsonForScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c')
}
