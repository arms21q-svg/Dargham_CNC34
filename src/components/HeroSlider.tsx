import { useEffect, useState } from 'react'
import { useSiteData } from '../context/SiteDataContext'
import OptimizedImage from './OptimizedImage'
import { preloadImage } from '../utils/images'

interface HeroSliderProps {
  side?: boolean
}

export default function HeroSlider({ side = false }: HeroSliderProps) {
  const { siteData } = useSiteData()
  const slideImages = siteData.home.slideImages
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    if (slideImages[0]) {
      preloadImage(slideImages[0], { width: 900, quality: 78 })
    }
  }, [slideImages])

  useEffect(() => {
    if (slideImages.length <= 1) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      timer = setTimeout(() => {
        if (cancelled) return
        setCurrent((prev) => (prev + 1) % slideImages.length)
        tick()
      }, 4500)
    }

    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [slideImages.length])

  // Prefetch next slide only (reduces bandwidth vs loading all)
  useEffect(() => {
    if (slideImages.length < 2) return
    const next = slideImages[(current + 1) % slideImages.length]
    if (next) preloadImage(next, { width: 900, quality: 72 })
  }, [current, slideImages])

  const goPrev = () => {
    setCurrent((prev) => (prev - 1 + slideImages.length) % slideImages.length)
  }

  const goNext = () => {
    setCurrent((prev) => (prev + 1) % slideImages.length)
  }

  if (slideImages.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-primary-100 text-primary-700 dark:bg-primary-950 dark:text-primary-300 ${
          side ? 'h-full min-h-[320px] rounded-3xl' : 'h-[50vh] min-h-[320px] w-full'
        }`}
      >
        لا توجد صور للسلايدر
      </div>
    )
  }

  // Only mount current + neighbors to cut paint/memory cost
  const visible = new Set([
    current,
    (current + 1) % slideImages.length,
    (current - 1 + slideImages.length) % slideImages.length,
  ])

  return (
    <div
      className={`relative w-full overflow-hidden ${
        side
          ? 'h-full min-h-[360px] rounded-3xl shadow-xl ring-1 ring-black/5 sm:min-h-[420px] lg:min-h-[520px]'
          : 'h-[50vh] min-h-[320px] max-h-[600px] sm:h-[60vh]'
      }`}
    >
      {slideImages.map((src, i) => {
        if (!visible.has(i)) return null
        const active = i === current
        return (
          <div
            key={`${src}-${i}`}
            className={`absolute inset-0 transition-opacity duration-500 will-change-[opacity] ${
              active ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            aria-hidden={!active}
          >
            <OptimizedImage
              src={src}
              alt=""
              width={900}
              sizes={side ? '(max-width: 1024px) 100vw, 50vw' : '100vw'}
              widths={[640, 900, 1200]}
              priority={i === 0}
              className="h-full w-full object-cover"
            />
            {side ? (
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/45 to-black/30" />
            )}
          </div>
        )
      })}

      {side && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute start-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md transition hover:bg-white"
            aria-label="السابق"
          >
            <svg className="h-5 w-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute end-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-gray-800 shadow-md transition hover:bg-white"
            aria-label="التالي"
          >
            <svg className="h-5 w-5 rtl:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {slideImages.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current
                ? side
                  ? 'w-8 bg-white shadow'
                  : 'w-8 bg-white'
                : 'w-2 bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
