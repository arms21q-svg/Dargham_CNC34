'use client'

import { useCallback, useEffect, useState } from 'react'

const DISPLAY_MS = 2400
const FADE_MS = 500
const STORAGE_KEY = 'dorgham-cnc-splash-v2'
/** Re-show after this many days, or when browser storage is cleared. */
const RESHOW_AFTER_DAYS = 7

function shouldShowSplash(): boolean {
  try {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return true
    const seenAt = Number(raw)
    if (!Number.isFinite(seenAt)) return true
    return Date.now() - seenAt > RESHOW_AFTER_DAYS * 24 * 60 * 60 * 1000
  } catch {
    return false
  }
}

function markSplashSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

/**
 * First-visit brand splash (black & gold). Site loads underneath; no reload on dismiss.
 */
export default function BrandSplash({ skip = false }: { skip?: boolean }) {
  const [phase, setPhase] = useState<'hidden' | 'show' | 'leave'>('hidden')
  const [canSkip, setCanSkip] = useState(false)

  const dismiss = useCallback(() => {
    setPhase((prev) => (prev === 'show' ? 'leave' : prev))
  }, [])

  useEffect(() => {
    if (skip) return
    if (!shouldShowSplash()) return
    setPhase('show')
  }, [skip])

  useEffect(() => {
    if (phase !== 'show') return

    const syncSkip = () => {
      if (document.readyState === 'complete') setCanSkip(true)
    }
    syncSkip()
    window.addEventListener('load', syncSkip)

    const leaveTimer = window.setTimeout(() => setPhase('leave'), DISPLAY_MS)
    return () => {
      window.removeEventListener('load', syncSkip)
      window.clearTimeout(leaveTimer)
    }
  }, [phase])

  useEffect(() => {
    if (phase !== 'leave') return
    markSplashSeen()
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
              fetchPriority="high"
              className="brand-splash__logo"
              draggable={false}
            />
          </picture>
        </div>

        <h1 className="brand-splash__title">مرحبًا بكم في ضرغام CNC</h1>

        <p className="brand-splash__desc">
          نقدم حلولًا احترافية في أعمال CNC، الديكورات، المطابخ، والإكسسوارات بأعلى معايير
          الجودة والدقة.
        </p>

        {canSkip ? <p className="brand-splash__skip">اضغط للمتابعة</p> : null}
      </div>
    </div>
  )
}
