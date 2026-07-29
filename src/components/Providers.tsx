'use client'

import type { ReactNode } from 'react'
import type { SiteData } from '@/types/siteData'
import { AppProvider } from '@/context/AppContext'
import { SiteDataProvider } from '@/context/SiteDataContext'

export default function Providers({
  children,
  initialSiteData = null,
}: {
  children: ReactNode
  initialSiteData?: SiteData | null
}) {
  return (
    <SiteDataProvider initialSiteData={initialSiteData}>
      <AppProvider>{children}</AppProvider>
    </SiteDataProvider>
  )
}
