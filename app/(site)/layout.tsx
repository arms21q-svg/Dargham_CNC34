import type { ReactNode } from 'react'
import PublicShell from '@/components/PublicShell'
import SiteSchemas from '@/components/seo/SiteSchemas'
import { getPublicSiteBootstrap, safeJsonForScript } from '@server/publicSiteBootstrap'

/** Always serve fresh HTML — content comes from DB via bootstrap + API. */
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function SiteLayout({ children }: { children: ReactNode }) {
  const bootstrap = await getPublicSiteBootstrap()

  return (
    <>
      <link rel="preload" href="/api/site-data" as="fetch" crossOrigin="anonymous" />
      {bootstrap ? (
        <script
          id="__SITE_DATA__"
          type="application/json"
          dangerouslySetInnerHTML={{ __html: safeJsonForScript(bootstrap) }}
        />
      ) : null}
      <SiteSchemas />
      <PublicShell>{children}</PublicShell>
    </>
  )
}
