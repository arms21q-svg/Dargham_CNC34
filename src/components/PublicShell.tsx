'use client'

import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import Header from '@/components/Header'
import Footer from '@/components/Footer'
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [pathname])

  return (
    <div key={pathname} className="animate-fade-in">
      {children}
    </div>
  )
}

export default function PublicShell({ children }: { children: ReactNode }) {
  return (
    <>
      <BrandSplash skip={false} />
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1">
          <PageTransition>{children}</PageTransition>
        </main>
        <Footer />
        <DeferredFloat />
      </div>
    </>
  )
}
