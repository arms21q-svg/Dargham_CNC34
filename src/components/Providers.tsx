'use client'

import type { ReactNode } from 'react'
import { AppProvider } from '@/context/AppContext'
import { SiteDataProvider } from '@/context/SiteDataContext'

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SiteDataProvider>
      <AppProvider>{children}</AppProvider>
    </SiteDataProvider>
  )
}
