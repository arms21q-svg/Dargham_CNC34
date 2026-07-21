'use client'

import { useRef, useState } from 'react'
import { fileToDataUrl } from '../../utils/imageFile'

interface GalleryPickerProps {
  images: string[]
  primary: string
  onChange: (images: string[], primary: string) => void
}

export default function GalleryPicker({ images, primary, onChange }: GalleryPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')

  const gallery = images.length > 0 ? images : primary ? [primary] : []

  const commit = (nextImages: string[], nextPrimary?: string) => {
    const clean = nextImages.filter(Boolean)
    const cover =
      nextPrimary && clean.includes(nextPrimary)
        ? nextPrimary
        : clean.includes(primary)
          ? primary
          : clean[0] || ''
    onChange(clean, cover)
  }

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setLoading(true)
    setError('')
    try {
      const added: string[] = []
      const list = Array.from(files).slice(0, 8)
      for (const file of list) {
        added.push(await fileToDataUrl(file, 900, 0.72))
      }
      commit([...gallery, ...added])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع الصور')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const addUrl = () => {
    const url = urlDraft.trim()
    if (!url) return
    if (!/^https?:\/\//i.test(url) && !url.startsWith('data:')) {
      setError('استخدم رابطاً يبدأ بـ https://')
      return
    }
    setError('')
    commit([...gallery, url])
    setUrlDraft('')
  }

  return (
    <div className="space-y-3">
      <label className="form-label">صور العمل</label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
        >
          {loading ? 'جاري الرفع...' : 'رفع صور'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => void addFiles(e.target.files)}
        />
      </div>

      <div className="flex gap-2">
        <input
          className="input-field"
          value={urlDraft}
          onChange={(e) => setUrlDraft(e.target.value)}
          placeholder="أو الصق رابط صورة https://..."
        />
        <button type="button" onClick={addUrl} className="btn-secondary shrink-0">
          إضافة
        </button>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {gallery.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {gallery.map((src) => {
            const isPrimary = src === primary
            return (
              <div
                key={src.slice(0, 64)}
                className={`relative overflow-hidden rounded-xl border ${
                  isPrimary
                    ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <img src={src} alt="" className="aspect-square w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex gap-1 bg-black/55 p-1.5">
                  <button
                    type="button"
                    onClick={() => commit(gallery, src)}
                    className="flex-1 rounded-lg bg-white/90 px-1 py-1 text-[10px] font-semibold text-gray-900"
                  >
                    {isPrimary ? 'رئيسية' : 'تعيين رئيسية'}
                  </button>
                  <button
                    type="button"
                    onClick={() => commit(gallery.filter((g) => g !== src))}
                    className="rounded-lg bg-red-500/90 px-2 py-1 text-[10px] font-semibold text-white"
                  >
                    حذف
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
