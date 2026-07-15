'use client'

import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useApp } from '../context/AppContext'
import { extractColorsFromFile } from '../utils/imageSearch'
import {
  searchProductsByImage,
  type ImageSearchAnalysis,
  type ImageSearchMatch,
} from '../utils/imageAi'

export interface ImageSearchResult {
  colors: string[]
  productIds: string[]
  matches: ImageSearchMatch[]
  analysis?: ImageSearchAnalysis | null
  softMatch?: boolean
  note?: string
  mode?: string
}

interface ImageSearchProps {
  onSearch: (result: ImageSearchResult) => void
  onClear: () => void
  /** Start expanded (e.g. when opened from CTA) */
  defaultOpen?: boolean
}

type Phase = 'idle' | 'prepare' | 'analyze' | 'done'

export default function ImageSearch({ onSearch, onClear, defaultOpen = false }: ImageSearchProps) {
  const { lang, t } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const [open, setOpen] = useState(defaultOpen)
  const [preview, setPreview] = useState<string | null>(null)
  const [colors, setColors] = useState<string[]>([])
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<ImageSearchAnalysis | null>(null)
  const [dragging, setDragging] = useState(false)

  const loading = phase === 'prepare' || phase === 'analyze'

  useEffect(() => {
    if (!loading) return
    setProgress(8)
    const id = window.setInterval(() => {
      setProgress((p) => Math.min(p < 70 ? p + 4 : p + 1, 92))
    }, 280)
    return () => window.clearInterval(id)
  }, [loading])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
      if (preview) URL.revokeObjectURL(preview)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(lang === 'ar' ? 'الملف يجب أن يكون صورة' : 'File must be an image')
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setOpen(true)
    setPhase('prepare')
    setProgress(5)
    setError(null)
    setNote(null)
    setColors([])
    setAnalysis(null)

    let previewUrl: string | null = null

    try {
      previewUrl = URL.createObjectURL(file)
      setPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return previewUrl
      })

      const extracted = await extractColorsFromFile(file)
      if (controller.signal.aborted) return
      setColors(extracted)
      setPhase('analyze')
      setProgress(35)

      let productIds: string[] = []
      let matches: ImageSearchMatch[] = []
      let searchNote: string
      let mode = 'color'
      let softMatch = true
      let parsedAnalysis: ImageSearchAnalysis | null = null

      try {
        const aiResult = await Promise.race([
          searchProductsByImage(file, lang, controller.signal),
          new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 28000)
          ),
        ])

        if (controller.signal.aborted) return

        if (aiResult?.matches?.length || aiResult?.productIds?.length) {
          matches = aiResult.matches?.length
            ? aiResult.matches
            : (aiResult.productIds ?? []).map((id, i) => ({ id, score: Math.max(70, 98 - i * 4) }))
          productIds = matches.map((m) => m.id)
          mode = aiResult.mode
          softMatch = Boolean(aiResult.softMatch)
          parsedAnalysis = aiResult.analysis ?? null
          setAnalysis(parsedAnalysis)

          if (softMatch) {
            searchNote =
              lang === 'ar'
                ? 'لم نجد تطابقاً دقيقاً — نعرض أقرب الأعمال المشابهة'
                : 'No exact match — showing the closest similar works'
          } else {
            searchNote =
              aiResult.analysisNote ||
              (lang === 'ar'
                ? `وجدنا ${productIds.length} أعمال مشابهة بالذكاء الاصطناعي`
                : `Found ${productIds.length} similar works with AI`)
          }
        } else {
          searchNote =
            lang === 'ar'
              ? 'تم المطابقة بالألوان — جرّب صورة أوضح أو بإضاءة طبيعية'
              : 'Matched by colors — try a clearer photo with natural light'
        }
      } catch (err) {
        if (controller.signal.aborted) return
        searchNote =
          lang === 'ar'
            ? 'تم المطابقة بالألوان (الخدمة الذكية غير متاحة حالياً)'
            : 'Matched by colors (AI service unavailable)'
        if (err instanceof Error && err.name === 'AbortError') return
      }

      setProgress(100)
      setPhase('done')
      setNote(searchNote)
      onSearch({
        colors: extracted,
        productIds,
        matches,
        analysis: parsedAnalysis,
        softMatch,
        note: searchNote,
        mode,
      })
    } catch (err) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreview(null)
      setColors([])
      setPhase('idle')
      setProgress(0)
      setError(err instanceof Error ? err.message : t.works.noResults)
    }
  }

  const handleClear = () => {
    abortRef.current?.abort()
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setColors([])
    setError(null)
    setNote(null)
    setAnalysis(null)
    setPhase('idle')
    setProgress(0)
    if (fileRef.current) fileRef.current.value = ''
    if (cameraRef.current) cameraRef.current.value = ''
    onClear()
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) void handleFile(file)
  }

  const phaseLabel =
    phase === 'prepare'
      ? lang === 'ar'
        ? 'جاري تجهيز الصورة...'
        : 'Preparing image...'
      : phase === 'analyze'
        ? t.works.analyzingImage
        : note ?? t.works.uploadImage

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary-600/25 transition hover:bg-primary-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {t.works.searchByImage}
        </button>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-primary-50 via-white to-amber-50/40 ring-1 ring-primary-100 dark:from-primary-950/50 dark:via-gray-900 dark:to-gray-900 dark:ring-primary-900">
      <div className="flex items-start justify-between gap-3 border-b border-primary-100/80 px-4 py-3 dark:border-primary-900/60">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary-600 text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </span>
            {t.works.searchByImage}
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t.works.imageSearchHint}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            handleClear()
            setOpen(false)
          }}
          className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
          aria-label={lang === 'ar' ? 'إغلاق' : 'Close'}
        >
          ✕
        </button>
      </div>

      <div className="p-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void handleFile(file)
          }}
        />

        {preview ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <img
                src={preview}
                alt=""
                className="h-28 w-28 shrink-0 rounded-2xl object-cover shadow-md ring-1 ring-black/5"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">{phaseLabel}</p>

                {loading && (
                  <div className="mt-3">
                    <div className="mb-1 flex justify-between text-[11px] text-gray-500">
                      <span>{t.works.analyzingImage}</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-emerald-400 transition-[width] duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                {!loading && analysis && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[analysis.workType, ...(analysis.materials ?? []).slice(0, 2), ...(analysis.techniques ?? []).slice(0, 2)]
                      .filter(Boolean)
                      .map((tag) => (
                        <span
                          key={tag}
                          className="rounded-lg bg-white/80 px-2 py-0.5 text-[11px] font-medium text-primary-800 ring-1 ring-primary-100 dark:bg-primary-950 dark:text-primary-200 dark:ring-primary-800"
                        >
                          {tag}
                        </span>
                      ))}
                  </div>
                )}

                {colors.length > 0 && !loading && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {colors.map((color) => (
                      <span
                        key={color}
                        title={color}
                        className="h-5 w-5 rounded-full border border-white shadow ring-1 ring-black/10"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {!loading && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="rounded-xl border border-dashed border-gray-300 py-2 text-sm text-gray-600 hover:border-primary-400 hover:text-primary-700 dark:border-gray-600 dark:text-gray-300"
                >
                  {lang === 'ar' ? 'تغيير الصورة' : 'Change image'}
                </button>
                <button
                  type="button"
                  onClick={() => cameraRef.current?.click()}
                  className="rounded-xl border border-dashed border-gray-300 py-2 text-sm text-gray-600 hover:border-primary-400 hover:text-primary-700 dark:border-gray-600 dark:text-gray-300"
                >
                  {t.works.takePhoto}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  className="col-span-2 rounded-xl py-2 text-sm text-red-600 hover:bg-red-50 sm:col-span-1 dark:hover:bg-red-950/40"
                >
                  {lang === 'ar' ? 'إلغاء البحث' : 'Clear search'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              onDragEnter={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragging(true)
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={`flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed p-7 transition-colors ${
                dragging
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/50'
                  : 'border-gray-200 bg-white/60 hover:border-primary-400 hover:bg-primary-50/50 dark:border-gray-700 dark:bg-gray-900/40 dark:hover:border-primary-600'
              }`}
            >
              <svg className="h-10 w-10 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t.works.uploadImage}</span>
              <span className="text-xs text-gray-400">JPG · PNG · WEBP</span>
            </button>

            <button
              type="button"
              onClick={() => cameraRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gray-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 dark:bg-primary-700 dark:hover:bg-primary-600"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {t.works.takePhoto}
            </button>
          </div>
        )}

        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  )
}
