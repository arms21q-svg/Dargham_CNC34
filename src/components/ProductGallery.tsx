'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import OptimizedImage from './OptimizedImage'

interface ProductGalleryProps {
  images: string[]
  alt: string
}

const frameClass =
  'flex aspect-[4/3] w-full items-center justify-center overflow-hidden bg-gray-100 dark:bg-gray-800'
const imageClass = 'max-h-full max-w-full object-contain'

export default function ProductGallery({ images, alt }: ProductGalleryProps) {
  const slides = useMemo(() => images.filter(Boolean), [images])
  const slidesKey = slides.join('|')
  const [cursor, setCursor] = useState({ key: slidesKey, index: 0 })
  const index = cursor.key === slidesKey ? cursor.index : 0
  const setIndex = useCallback(
    (next: number | ((prev: number) => number)) => {
      setCursor((prev) => {
        const base = prev.key === slidesKey ? prev.index : 0
        const value = typeof next === 'function' ? next(base) : next
        return { key: slidesKey, index: value }
      })
    },
    [slidesKey]
  )
  const [lightbox, setLightbox] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const safeIndex = slides.length === 0 ? 0 : Math.min(index, slides.length - 1)

  const go = useCallback(
    (delta: number) => {
      if (slides.length <= 1) return
      setIndex((i) => (i + delta + slides.length) % slides.length)
    },
    [slides.length, setIndex]
  )

  if (slides.length === 0) {
    return (
      <div className={`${frameClass} rounded-2xl text-gray-400`}>—</div>
    )
  }

  if (slides.length === 1) {
    return (
      <div className="overflow-hidden rounded-2xl">
        <button type="button" className="block w-full" onClick={() => setLightbox(true)}>
          <div className={frameClass}>
            <OptimizedImage
              src={slides[0]}
              alt={alt}
              width={960}
              widths={[480, 720, 960]}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority
              className={imageClass}
            />
          </div>
        </button>
        {lightbox && (
          <Lightbox images={slides} index={0} alt={alt} onClose={() => setLightbox(false)} onGo={go} />
        )}
      </div>
    )
  }

  return (
    <>
      <div
        className="relative overflow-hidden rounded-2xl"
        onTouchStart={(e) => setTouchStartX(e.changedTouches[0]?.clientX ?? null)}
        onTouchEnd={(e) => {
          if (touchStartX == null) return
          const dx = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX
          if (Math.abs(dx) > 40) go(dx > 0 ? -1 : 1)
          setTouchStartX(null)
        }}
      >
        <button type="button" className="block w-full" onClick={() => setLightbox(true)}>
          <div className={frameClass}>
            <OptimizedImage
              src={slides[safeIndex]}
              alt={`${alt} — ${safeIndex + 1}`}
              width={960}
              widths={[480, 720, 960]}
              sizes="(max-width: 1024px) 100vw, 50vw"
              priority={safeIndex === 0}
              className={imageClass}
            />
          </div>
        </button>

        <button
          type="button"
          onClick={() => go(-1)}
          aria-label="Previous"
          className="absolute start-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"
        >
          ‹
        </button>
        <button
          type="button"
          onClick={() => go(1)}
          aria-label="Next"
          className="absolute end-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm hover:bg-black/60"
        >
          ›
        </button>

        <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1.5 bg-gradient-to-t from-black/50 to-transparent px-3 pb-3 pt-8">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => setIndex(i)}
              className={`h-2 rounded-full transition-all ${
                i === safeIndex ? 'w-5 bg-white' : 'w-2 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>

      {lightbox && (
        <Lightbox images={slides} index={safeIndex} alt={alt} onClose={() => setLightbox(false)} onGo={go} />
      )}
    </>
  )
}

function Lightbox({
  images,
  index,
  alt,
  onClose,
  onGo,
}: {
  images: string[]
  index: number
  alt: string
  onClose: () => void
  onGo: (delta: number) => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onGo(-1)
      if (e.key === 'ArrowRight') onGo(1)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose, onGo])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute end-4 top-4 z-10 rounded-full bg-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/25"
      >
        ✕
      </button>
      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onGo(-1)
            }}
            className="absolute start-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-2xl text-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onGo(1)
            }}
            className="absolute end-3 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/15 px-3 py-2 text-2xl text-white"
          >
            ›
          </button>
        </>
      )}
      <img
        src={images[index]}
        alt={`${alt} — ${index + 1}`}
        className="max-h-[90vh] max-w-full object-contain"
        loading="lazy"
        decoding="async"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
