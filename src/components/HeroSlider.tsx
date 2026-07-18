'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSiteData } from '../context/SiteDataContext'
import OptimizedImage from './OptimizedImage'

interface HeroSliderProps {
  side?: boolean
}

const SWIPE_THRESHOLD = 40

export default function HeroSlider({ side = false }: HeroSliderProps) {
  const { siteData } = useSiteData()
  const slideImages = siteData.home.slideImages
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const ignoreSwipe = useRef(false)

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % slideImages.length)
  }, [slideImages.length])

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + slideImages.length) % slideImages.length)
  }, [slideImages.length])

  useEffect(() => {
    if (slideImages.length <= 1) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const tick = () => {
      timer = setTimeout(() => {
        if (cancelled) return
        goNext()
        tick()
      }, 4500)
    }

    tick()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [slideImages.length, goNext, current])

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    if (!touch) return
    touchStartX.current = touch.clientX
    touchStartY.current = touch.clientY
    ignoreSwipe.current = false
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null || touchStartY.current == null) return
    const touch = e.touches[0]
    if (!touch) return
    const dx = Math.abs(touch.clientX - touchStartX.current)
    const dy = Math.abs(touch.clientY - touchStartY.current)
    // Prefer vertical page scroll when gesture is mostly vertical
    if (dy > dx && dy > 12) ignoreSwipe.current = true
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    if (slideImages.length <= 1) return
    if (ignoreSwipe.current || touchStartX.current == null) {
      touchStartX.current = null
      touchStartY.current = null
      return
    }

    const touch = e.changedTouches[0]
    if (!touch) return
    const deltaX = touch.clientX - touchStartX.current
    touchStartX.current = null
    touchStartY.current = null

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) return

    // Swipe left → next, swipe right → previous (natural finger navigation)
    if (deltaX < 0) goNext()
    else goPrev()
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
      className={`relative w-full touch-pan-y overflow-hidden ${
        side
          ? 'h-full min-h-[360px] rounded-3xl shadow-xl ring-1 ring-black/5 sm:min-h-[420px] lg:min-h-[520px]'
          : 'h-[50vh] min-h-[320px] max-h-[600px] sm:h-[60vh]'
      }`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
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
              className="pointer-events-none h-full w-full select-none object-cover"
              draggable={false}
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
