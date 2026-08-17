'use client'

import { useMemo, useRef, useState } from 'react'
import type { Product } from '../../types/siteData'
import { allocateDisplayNumbers, validateProductDisplayNumber } from '../../utils/categories'
import { fileFingerprint, fileToDataUrl } from '../../utils/imageFile'
import UploadProgressBar from './UploadProgressBar'

const MAX_BULK = 100

export type BulkWorkDraft = {
  id: string
  image: string
  titleAr: string
  titleEn: string
  descAr: string
  descEn: string
  displayNumber: number
  fingerprint: string
}

interface BulkWorksImportProps {
  categoryId: string
  categorySlug: string
  products: Product[]
  saving?: boolean
  onSave: (items: Product[]) => void | Promise<void>
  onCancel: () => void
}

export default function BulkWorksImport({
  categoryId,
  categorySlug,
  products,
  saving = false,
  onSave,
  onCancel,
}: BulkWorksImportProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [drafts, setDrafts] = useState<BulkWorkDraft[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const existingFingerprints = useMemo(() => {
    const fps = new Set<string>()
    for (const p of products) {
      if (p.categoryId !== categoryId) continue
      for (const src of [p.image, ...(p.images ?? [])]) {
        if (src?.startsWith('data:')) fps.add(src.slice(0, 120))
      }
    }
    return fps
  }, [products, categoryId])

  const addFiles = async (files: FileList | null) => {
    if (!files?.length || loading || saving) return
    setLoading(true)
    setError('')
    setInfo('')
    try {
      const remaining = MAX_BULK - drafts.length
      if (remaining <= 0) {
        setError(`الحد الأقصى ${MAX_BULK} أعمال في الدفعة الواحدة`)
        return
      }
      const list = Array.from(files).slice(0, remaining)
      setProgress({ done: 0, total: list.length })

      const added: BulkWorkDraft[] = []
      const seen = new Set(drafts.map((d) => d.fingerprint))
      let skipped = 0

      for (let i = 0; i < list.length; i++) {
        const file = list[i]!
        try {
          const fingerprint = await fileFingerprint(file)
          if (seen.has(fingerprint)) {
            skipped++
            setProgress({ done: i + 1, total: list.length })
            continue
          }

          const image = await fileToDataUrl(file, { maxSide: 1200, quality: 0.78 })
          if (existingFingerprints.has(image.slice(0, 120))) {
            skipped++
            setProgress({ done: i + 1, total: list.length })
            continue
          }

          seen.add(fingerprint)
          added.push({
            id: crypto.randomUUID(),
            image,
            titleAr: '',
            titleEn: '',
            descAr: '',
            descEn: '',
            displayNumber: 1,
            fingerprint,
          })
        } catch (fileErr) {
          console.warn('[bulk] skip file', fileErr)
        }
        setProgress({ done: i + 1, total: list.length })
      }

      if (added.length === 0) {
        setError(skipped > 0 ? 'جميع الصور المختارة مكررة أو تعذر معالجتها' : 'تعذر رفع الصور')
        return
      }

      setDrafts((prev) => {
        const merged = [...prev, ...added]
        const nums = allocateDisplayNumbers(products, categoryId, merged.length)
        return merged.map((row, index) => ({ ...row, displayNumber: nums[index]! }))
      })

      if (skipped > 0) {
        setInfo(`تم تخطي ${skipped} صورة مكررة`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع الصور')
    } finally {
      setLoading(false)
      setProgress(null)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removeDraft = (id: string) => {
    setDrafts((prev) => {
      const next = prev.filter((d) => d.id !== id)
      const nums = allocateDisplayNumbers(products, categoryId, next.length)
      return next.map((row, index) => ({ ...row, displayNumber: nums[index]! }))
    })
  }

  const saveAll = () => {
    if (saving || loading) return
    if (drafts.length === 0) {
      setError('أضف صورة واحدة على الأقل')
      return
    }

    const batchNumbers = drafts.map((d) => d.displayNumber)
    for (const draft of drafts) {
      const msg = validateProductDisplayNumber(
        products,
        categoryId,
        draft.displayNumber,
        draft.id,
        batchNumbers
      )
      if (msg) {
        setError(msg)
        return
      }
    }

    const items: Product[] = drafts.map((draft) => ({
      id: draft.id,
      categoryId,
      category: categorySlug as Product['category'],
      displayNumber: draft.displayNumber,
      title: {
        ar: draft.titleAr.trim() || `عمل ${draft.displayNumber}`,
        en: draft.titleEn.trim() || `Work ${draft.displayNumber}`,
      },
      description:
        draft.descAr.trim() || draft.descEn.trim()
          ? { ar: draft.descAr.trim(), en: draft.descEn.trim() }
          : undefined,
      image: draft.image,
      images: [draft.image],
      published: true,
      colors: [],
    }))

    void onSave(items)
  }

  return (
    <div className="mb-6 rounded-xl border border-primary-200 bg-primary-50/40 p-4 dark:border-primary-800 dark:bg-primary-950/20">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-medium text-gray-800 dark:text-gray-100">إضافة عدة أعمال دفعة واحدة</h3>
        <span className="text-xs text-gray-500">حتى {MAX_BULK} صورة — ترقيم تلقائي</span>
      </div>

      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        اختر عدة صور من جهازك — يُنشأ عمل لكل صورة ويرتبط بالتصنيف المحدد تلقائياً
      </p>

      <div className="mb-4 space-y-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading || saving || drafts.length >= MAX_BULK}
          className="btn-primary text-sm disabled:opacity-60"
        >
          {loading ? 'جاري الرفع...' : 'اختيار صور متعددة من الجهاز'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void addFiles(e.target.files)}
        />
        {progress && <UploadProgressBar done={progress.done} total={progress.total} />}
      </div>

      {info && (
        <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          {info}
        </p>
      )}
      {error && (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {drafts.length > 0 && (
        <ul className="mb-4 max-h-[480px] space-y-3 overflow-y-auto">
          {drafts.map((draft) => (
            <li
              key={draft.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-start"
            >
              <img src={draft.image} alt="" className="h-20 w-20 shrink-0 rounded-lg object-contain bg-gray-100 dark:bg-gray-800" />
              <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="form-label text-xs">رقم العمل</label>
                  <input
                    type="number"
                    min={1}
                    className="input-field"
                    value={draft.displayNumber}
                    onChange={(e) => {
                      const displayNumber = Math.max(1, Number(e.target.value) || 1)
                      setDrafts((prev) =>
                        prev.map((d) => (d.id === draft.id ? { ...d, displayNumber } : d))
                      )
                    }}
                  />
                </div>
                <div>
                  <label className="form-label text-xs">الاسم (عربي)</label>
                  <input
                    className="input-field"
                    placeholder={`عمل ${draft.displayNumber}`}
                    value={draft.titleAr}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((d) => (d.id === draft.id ? { ...d, titleAr: e.target.value } : d))
                      )
                    }
                  />
                </div>
                <div>
                  <label className="form-label text-xs">الاسم (إنجليزي)</label>
                  <input
                    className="input-field"
                    placeholder={`Work ${draft.displayNumber}`}
                    value={draft.titleEn}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((d) => (d.id === draft.id ? { ...d, titleEn: e.target.value } : d))
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="form-label text-xs">الوصف (عربي — اختياري)</label>
                  <textarea
                    className="input-field min-h-[56px]"
                    value={draft.descAr}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((d) => (d.id === draft.id ? { ...d, descAr: e.target.value } : d))
                      )
                    }
                  />
                </div>
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="form-label text-xs">الوصف (إنجليزي — اختياري)</label>
                  <textarea
                    className="input-field min-h-[56px]"
                    value={draft.descEn}
                    onChange={(e) =>
                      setDrafts((prev) =>
                        prev.map((d) => (d.id === draft.id ? { ...d, descEn: e.target.value } : d))
                      )
                    }
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeDraft(draft.id)}
                className="shrink-0 text-sm text-red-600"
              >
                حذف
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={saveAll}
          disabled={drafts.length === 0 || saving || loading}
          className="btn-primary disabled:opacity-60"
        >
          {saving ? 'جاري الحفظ...' : drafts.length > 0 ? `حفظ ${drafts.length} أعمال` : 'حفظ'}
        </button>
        <button type="button" onClick={onCancel} disabled={saving || loading} className="btn-secondary">
          إلغاء
        </button>
      </div>
    </div>
  )
}
