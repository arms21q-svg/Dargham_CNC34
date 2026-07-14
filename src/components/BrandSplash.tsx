import { useEffect, useState } from 'react'

const SPLASH_MS = 3000
const SESSION_KEY = 'dorgham-cnc-splash-seen'

interface BrandSplashProps {
  /** Skip splash on admin routes */
  skip?: boolean
}

/**
 * Elegant brand intro — once per browser tab session when opening the site.
 */
export default function BrandSplash({ skip = false }: BrandSplashProps) {
  const [visible, setVisible] = useState(() => {
    if (skip || typeof window === 'undefined') return false
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
    return sessionStorage.getItem(SESSION_KEY) !== '1'
  })
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!visible) return

    const leaveTimer = window.setTimeout(() => setLeaving(true), SPLASH_MS - 450)
    const hideTimer = window.setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, '1')
      setVisible(false)
    }, SPLASH_MS)

    return () => {
      window.clearTimeout(leaveTimer)
      window.clearTimeout(hideTimer)
    }
  }, [visible])

  if (!visible) return null

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center overflow-hidden transition-opacity duration-450 ${
        leaving ? 'pointer-events-none opacity-0' : 'opacity-100'
      }`}
      style={{
        background:
          'radial-gradient(ellipse at 30% 20%, #5a9f82 0%, transparent 45%), radial-gradient(ellipse at 80% 80%, #3d7a5f 0%, transparent 40%), linear-gradient(160deg, #1a2f28 0%, #2d5244 45%, #1f3d33 100%)',
      }}
      role="status"
      aria-label="ضرغام CNC"
    >
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.35) 1px, transparent 0)',
            backgroundSize: '28px 28px',
          }}
        />
      </div>

      <div className="relative flex flex-col items-center px-6 text-center">
        <div
          className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-white/15 text-4xl font-extrabold text-white shadow-2xl ring-1 ring-white/25 backdrop-blur-md"
          style={{ animation: 'splashMark 0.7s ease-out both' }}
        >
          D
        </div>

        <h1
          className="font-arabic text-4xl font-extrabold tracking-wide text-white sm:text-5xl"
          style={{ animation: 'splashTitle 0.8s ease-out 0.15s both' }}
        >
          ضرغام CNC
        </h1>

        <p
          className="mt-3 font-english text-sm font-medium tracking-[0.35em] text-white/70 uppercase sm:text-base"
          style={{ animation: 'splashTitle 0.8s ease-out 0.3s both' }}
        >
          Dorgham CNC
        </p>

        <div
          className="mt-8 h-0.5 w-16 overflow-hidden rounded-full bg-white/20"
          style={{ animation: 'splashTitle 0.6s ease-out 0.45s both' }}
        >
          <div
            className="h-full rounded-full bg-white/80"
            style={{ animation: 'splashBar 2.4s ease-in-out 0.5s both' }}
          />
        </div>
      </div>

      <style>{`
        @keyframes splashMark {
          from { opacity: 0; transform: scale(0.7) translateY(12px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes splashTitle {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashBar {
          from { width: 0%; }
          to { width: 100%; }
        }
      `}</style>
    </div>
  )
}
