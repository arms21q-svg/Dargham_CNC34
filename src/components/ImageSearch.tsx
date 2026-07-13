import { useRef, useState, type DragEvent } from 'react'
import { useApp } from '../context/AppContext'
import { extractColorsFromFile } from '../utils/imageSearch'
import { searchProductsByImage } from '../utils/imageAi'

export interface ImageSearchResult {
  colors: string[]
  productIds: string[]
  note?: string
  mode?: 'ai' | 'color'
}

interface ImageSearchProps {
  onSearch: (result: ImageSearchResult) => void
  onClear: () => void
}

export default function ImageSearch({ onSearch, onClear }: ImageSearchProps) {
  const { lang, t } = useApp()
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [colors, setColors] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError(lang === 'ar' ? 'الملف يجب أن يكون صورة' : 'File must be an image')
      return
    }

    setLoading(true)
    setError(null)
    setNote(null)
    setColors([])

    let previewUrl: string | null = null

    try {
      previewUrl = URL.createObjectURL(file)
      setPreview(previewUrl)

      const extracted = await extractColorsFromFile(file)
      setColors(extracted)

      let productIds: string[] = []
      let searchNote: string
      let mode: 'ai' | 'color' = 'color'

      try {
        const aiResult = await Promise.race([
          searchProductsByImage(file, lang),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), 12000)),
        ])

        if (aiResult?.productIds.length) {
          productIds = aiResult.productIds
          mode = 'ai'
          searchNote =
            lang === 'ar'
              ? `وجدنا ${aiResult.productIds.length} أعمال مشابهة بالذكاء الاصطناعي`
              : `Found ${aiResult.productIds.length} similar works with AI`
        } else {
          searchNote =
            lang === 'ar'
              ? 'تم المطابقة بالألوان — جرّب صورة أوضح أو بإضاءة طبيعية'
              : 'Matched by colors — try a clearer photo with natural light'
        }
      } catch {
        searchNote =
          lang === 'ar'
            ? 'تم المطابقة بالألوان (الخدمة الذكية غير متاحة حالياً)'
            : 'Matched by colors (AI service unavailable)'
      }

      setNote(searchNote)
      onSearch({ colors: extracted, productIds, note: searchNote, mode })
    } catch (err) {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
      setPreview(null)
      setColors([])
      setError(err instanceof Error ? err.message : t.works.noResults)
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    if (preview) URL.revokeObjectURL(preview)
    setPreview(null)
    setColors([])
    setError(null)
    setNote(null)
    if (fileRef.current) fileRef.current.value = ''
    onClear()
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="border-b border-gray-100 bg-primary-50/80 px-4 py-3 dark:border-gray-800 dark:bg-primary-950/40">
        <h3 className="flex items-center gap-2 font-semibold text-gray-800 dark:text-gray-100">
          <svg className="h-5 w-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          {t.works.searchByImage}
        </h3>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {lang === 'ar'
            ? 'ارفع صورة تصميم أو قطعة خشب لنقترح أعمالاً مشابهة'
            : 'Upload a design or wood photo to find similar works'}
        </p>
      </div>

      <div className="p-4">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
          }}
        />

        {preview ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <img
                src={preview}
                alt=""
                className="h-24 w-24 shrink-0 rounded-xl object-cover ring-1 ring-gray-200 dark:ring-gray-700"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-100">
                  {loading
                    ? lang === 'ar'
                      ? 'جاري التحليل...'
                      : 'Analyzing...'
                    : note ?? t.works.uploadImage}
                </p>
                {loading && (
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                    <div className="h-full w-2/3 animate-pulse rounded-full bg-primary-500" />
                  </div>
                )}
                {colors.length > 0 && !loading && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                      {lang === 'ar' ? 'الألوان المستخرجة:' : 'Extracted colors:'}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {colors.map((color) => (
                        <span
                          key={color}
                          title={color}
                          className="h-6 w-6 rounded-full border border-white shadow ring-1 ring-black/10"
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="rounded-lg px-2 py-1 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                ✕
              </button>
            </div>

            {!loading && (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border border-dashed border-gray-300 py-2 text-sm text-gray-600 hover:border-primary-400 hover:text-primary-700 dark:border-gray-600 dark:text-gray-300"
              >
                {lang === 'ar' ? 'تغيير الصورة' : 'Change image'}
              </button>
            )}
          </div>
        ) : (
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
            className={`flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-6 transition-colors ${
              dragging
                ? 'border-primary-500 bg-primary-50 dark:bg-primary-950/50'
                : 'border-gray-200 hover:border-primary-400 hover:bg-primary-50/50 dark:border-gray-700 dark:hover:border-primary-600 dark:hover:bg-primary-950/50'
            }`}
          >
            <svg className="h-9 w-9 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
              {t.works.uploadImage}
            </span>
            <span className="text-xs text-gray-400">JPG · PNG · WEBP</span>
          </button>
        )}

        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </div>
  )
}
