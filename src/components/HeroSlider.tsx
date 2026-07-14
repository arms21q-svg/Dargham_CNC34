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
          </div>
        )
      })}

      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-black/25 px-2.5 py-1.5 backdrop-blur-sm">
        {slideImages.map((_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCurrent(i)}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === current ? 'w-7 bg-white' : 'w-2 bg-white/55 hover:bg-white/80'
            }`}
            aria-label={`Slide ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
