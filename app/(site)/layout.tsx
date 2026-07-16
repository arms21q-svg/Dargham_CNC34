import type { ReactNode } from 'react'
import PublicShell from '@/components/PublicShell'
import SiteSchemas from '@/components/seo/SiteSchemas'

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteSchemas />
      <PublicShell>{children}</PublicShell>
    </>
  )
}
