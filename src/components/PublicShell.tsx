'use client'

import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
import MobileBottomNav from '@/components/MobileBottomNav'
import BrandSplash from '@/components/BrandSplash'

const ContactFloat = lazy(() => import('@/components/ContactFloat'))

function DeferredFloat() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const enable = () => setReady(true)

    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(enable, { timeout: 2500 })
      return () => window.cancelIdleCallback(id)
    }

    const t = window.setTimeout(enable, 1200)
    return () => window.clearTimeout(t)
  }, [])

  if (!ready) return null

  return (
    <Suspense fallback={null}>
      <ContactFloat />
    </Suspense>
  )
}

function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  useEffect(() => {
    // Instant jump — smooth scroll made detail pages feel laggy
    window.scrollTo(0, 0)
  }, [pathname])

  return <div className="contents">{children}</div>
}

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <a href="#main-content" className="skip-link">
        تخطي إلى المحتوى
      </a>
      <BrandSplash skip={false} />
      <div className="flex min-h-screen flex-col pb-[4.75rem] md:pb-0">
        <Header />
        <main id="main-content" className="flex-1" tabIndex={-1}>
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
        <MobileBottomNav />
        <DeferredFloat />
      </div>
    </>
  )
}
