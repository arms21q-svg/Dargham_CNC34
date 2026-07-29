'use client'

import { useCallback, useEffect, useState } from 'react'

/** Welcome overlay — once per tab session; fast dismiss for better LCP. */
const DISPLAY_MS = 1200
const FADE_MS = 400

/**
 * Brand welcome splash — shows for 3 seconds every time the site is opened.
 * Stays mounted across client navigations so it does not reappear mid-browse.
 */
export default function BrandSplash({ skip = false }: { skip?: boolean }) {
  const [phase, setPhase] = useState<'hidden' | 'show' | 'leave'>('hidden')
  const [canSkip, setCanSkip] = useState(false)

  const dismiss = useCallback(() => {
    setPhase((prev) => (prev === 'show' ? 'leave' : prev))
  }, [])

  useEffect(() => {
    if (skip) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (sessionStorage.getItem('dorgham-splash-seen') === '1') return
    sessionStorage.setItem('dorgham-splash-seen', '1')
    setPhase('show')
  }, [skip])

  useEffect(() => {
    if (phase !== 'show') return

    // Allow early dismiss after a short beat so the screen never feels stuck
    const skipTimer = window.setTimeout(() => setCanSkip(true), 300)
    const leaveTimer = window.setTimeout(() => setPhase('leave'), DISPLAY_MS)

    return () => {
      window.clearTimeout(skipTimer)
      window.clearTimeout(leaveTimer)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'leave') return
    const hideTimer = window.setTimeout(() => setPhase('hidden'), FADE_MS)
    return () => window.clearTimeout(hideTimer)
  }, [phase])

  useEffect(() => {
    if (phase === 'hidden') return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [phase])

  if (phase === 'hidden') return null

  const leaving = phase === 'leave'

  return (
    <div
      className={`brand-splash${leaving ? ' brand-splash--out' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="مرحبًا بكم في ضرغام CNC"
      onClick={() => {
        if (canSkip) dismiss()
      }}
      onKeyDown={(e) => {
        if (!canSkip) return
        if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          dismiss()
        }
      }}
      tabIndex={canSkip ? 0 : -1}
    >
      <div className="brand-splash__glow" aria-hidden />

      <div className="brand-splash__content">
        <div className="brand-splash__logo-wrap">
          <picture>
            <source srcSet="/splash-logo.webp" type="image/webp" />
            <img
              src="/splash-logo.png"
              alt="ضرغام CNC"
              width={512}
              height={512}
              decoding="async"
              fetchPriority="auto"
              className="brand-splash__logo"
              draggable={false}
            />
          </picture>
        </div>

        <p className="brand-splash__title">مرحبًا بكم في ضرغام CNC</p>

        <p className="brand-splash__desc">
          نبدع في فن النحت والحفر بتقنية CNC على جميع أنواع الخشب، والتفلون، والبلاستيك،
          والألمنيوم، وألواح الكابون، لنقدم أعمالًا دقيقة تجمع بين الجودة، والإتقان، والإبداع
          الجميع ديكورات
        </p>

        {canSkip ? <p className="brand-splash__skip">اضغط للمتابعة</p> : null}
      </div>
    </div>
  )
}
