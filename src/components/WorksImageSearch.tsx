'use client'

import { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext'
import {
  processImageForSearch,
  searchProductsByImage,
  type ImageSearchApiResult,
} from '../utils/imageAi'

export interface WorksImageSearchResult {
  productIds: string[]
  matches: { id: string; score: number }[]
  softMatch?: boolean
}

interface WorksImageSearchProps {
  open: boolean
  onClose: () => void
  onResult: (result: WorksImageSearchResult) => void
}

type SearchPhase = 'idle' | 'compress' | 'search'

export default function WorksImageSearch({ open, onClose, onResult }: WorksImageSearchProps) {
  const { lang, t } = useApp()
  const cameraRef = useRef<HTMLInputElement>(null)
  const galleryRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [sourceFile, setSourceFile] = useState<File | null>(null)
  const [rotation, setRotation] = useState(0)
  const [squareCrop, setSquareCrop] = useState(false)
  const [loading, setLoading] = useState(false)
  const [phase, setPhase] = useState<SearchPhase>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort()
      setLoading(false)
      setPhase('idle')
      setProgress(0)
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      abortRef.current?.abort()
    }
  }, [previewUrl])

  useEffect(() => {
    if (!loading) return
    const id = window.setInterval(() => {
      setProgress((p) => {
        if (phase === 'compress') return Math.min(p + 8, 35)
        if (phase === 'search') return Math.min(p + 4, 92)
        return p
      })
    }, 120)
    return () => window.clearInterval(id)
  }, [loading, phase])

  const resetLocal = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setSourceFile(null)
    setRotation(0)
    setSquareCrop(false)
    setError(null)
    setLoading(false)
    setPhase('idle')
    setProgress(0)
    if (cameraRef.current) cameraRef.current.value = ''
    if (galleryRef.current) galleryRef.current.value = ''
  }

  if (!open) return null

  const onPickFile = (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError(lang === 'ar' ? 'يرجى اختيار صورة صالحة' : 'Please choose a valid image')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError(lang === 'ar' ? 'حجم الصورة كبير جداً' : 'Image is too large')
      return
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSourceFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setRotation(0)
    setSquareCrop(false)
    setError(null)
  }

  const runSearch = async () => {
    if (!sourceFile) return
    setLoading(true)
    setPhase('compress')
    setProgress(8)
    setError(null)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const processed = await processImageForSearch(sourceFile, { rotation, squareCrop })
      setPhase('search')
      setProgress(40)

      const apiResult: ImageSearchApiResult | null = await searchProductsByImage(
        processed,
        lang,
        controller.signal
      )

      setProgress(100)

      if (!apiResult || apiResult.matches.length === 0) {
        setError(
          lang === 'ar'
            ? 'لم نجد تطابقاً واضحاً. جرّب صورة أوضح أو زاوية مختلفة.'
            : 'No clear match found. Try a clearer photo or different angle.'
        )
        return
      }

      onResult({
        productIds: apiResult.productIds,
        matches: apiResult.matches,
        softMatch: apiResult.softMatch,
      })
      resetLocal()
      onClose()
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return
      setError(lang === 'ar' ? 'تعذر البحث في قاعدة البيانات. حاول مجدداً.' : 'Database search failed. Try again.')
    } finally {
      setLoading(false)
      setPhase('idle')
      setProgress(0)
    }
  }

  const statusLabel =
    phase === 'compress'
      ? t.works.analyzingImage
      : phase === 'search'
        ? t.works.searchingDatabase
        : t.works.startImageSearch

  return (
    <div className="mt-3 rounded-2xl border border-[#c9a227]/40 bg-black p-4 text-white shadow-lg md:border-primary-200 md:bg-[#141414]">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-bold text-[#e8c547]">{t.works.searchByImage}</h3>
          <p className="mt-1 text-xs text-white/60">{t.works.imageSearchHint}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            resetLocal()
            onClose()
          }}
          className="rounded-lg px-2 py-1 text-sm text-white/70 hover:bg-white/10"
        >
          ✕
        </button>
      </div>

      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onPickFile(e.target.files?.[0])}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPickFile(e.target.files?.[0])}
      />

      {!previewUrl ? (
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="rounded-xl border border-[#c9a227]/50 bg-[#c9a227]/15 px-4 py-3 text-sm font-semibold text-[#e8c547] transition hover:bg-[#c9a227]/25"
          >
            📷 {t.works.takePhoto}
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            {t.works.uploadImage}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-medium text-white/70">{t.works.previewImage}</p>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
            <img
              src={previewUrl}
              alt=""
              className="mx-auto max-h-64 w-full object-contain transition-transform"
              style={{
                transform: `rotate(${rotation}deg) scale(${squareCrop ? 1.05 : 1})`,
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setRotation((r) => (r + 90) % 360)}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
            >
              ↺ {t.works.rotate}
            </button>
            <button
              type="button"
              onClick={() => setSquareCrop((v) => !v)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                squareCrop
                  ? 'border-[#c9a227] bg-[#c9a227]/20 text-[#e8c547]'
                  : 'border-white/15 text-white hover:bg-white/10'
              }`}
            >
              {t.works.cropSquare}
            </button>
            <button
              type="button"
              onClick={() => {
                resetLocal()
              }}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10"
            >
              {lang === 'ar' ? 'تغيير الصورة' : 'Change image'}
            </button>
          </div>

          {loading && (
            <div className="space-y-2" aria-live="polite">
              <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[#c9a227] transition-[width] duration-150 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex gap-2">
                <div className="h-16 flex-1 animate-pulse rounded-lg bg-white/10" />
                <div className="h-16 flex-1 animate-pulse rounded-lg bg-white/10" />
                <div className="h-16 flex-1 animate-pulse rounded-lg bg-white/10" />
              </div>
            </div>
          )}

          <button
            type="button"
            disabled={loading}
            onClick={() => void runSearch()}
            className="w-full rounded-xl bg-[#c9a227] px-4 py-3 text-sm font-bold text-black transition hover:bg-[#d4b03a] disabled:opacity-60"
          >
            {loading ? statusLabel : t.works.startImageSearch}
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-amber-300">{error}</p>}
    </div>
  )
}
