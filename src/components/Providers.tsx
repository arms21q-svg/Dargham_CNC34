'use client'

import type { ReactNode } from 'react'
import type { SiteData } from '@/types/siteData'
import { AppProvider } from '@/context/AppContext'
import { SiteDataProvider } from '@/context/SiteDataContext'
import CatalogRefreshListener from '@/components/CatalogRefreshListener'

export default function Providers({
  children,
  initialSiteData = null,
}: {
  children: ReactNode
  initialSiteData?: SiteData | null
}) {
  return (
    <SiteDataProvider initialSiteData={initialSiteData}>
      <CatalogRefreshListener />
      <AppProvider>{children}</AppProvider>
    </SiteDataProvider>
  )
}
