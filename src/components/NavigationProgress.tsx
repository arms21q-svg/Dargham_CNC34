'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/** Thin top progress bar during client navigations. */
export default function NavigationProgress() {
  const pathname = usePathname()
  const [active, setActive] = useState(false)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    setActive(true)
    setWidth(18)

    const t1 = window.setTimeout(() => setWidth(62), 120)
    const t2 = window.setTimeout(() => setWidth(88), 320)
    const t3 = window.setTimeout(() => {
      setWidth(100)
      window.setTimeout(() => {
        setActive(false)
        setWidth(0)
      }, 180)
    }, 480)

    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
      window.clearTimeout(t3)
    }
  }, [pathname])

  if (!active && width === 0) return null

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[9999] h-0.5 bg-transparent"
      aria-hidden
    >
      <div
        className="h-full bg-primary-600 shadow-[0_0_8px_rgba(68,141,111,0.55)] transition-[width] duration-200 ease-out dark:bg-primary-400"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
