'use client'

import { useRef, useState } from 'react'
import { fileFingerprint, fileToDataUrl } from '../../utils/imageFile'
import UploadProgressBar from './UploadProgressBar'

const MAX_FILES = 20

interface GalleryPickerProps {
  images: string[]
  primary: string
  onChange: (images: string[], primary: string) => void
}

export default function GalleryPicker({ images, primary, onChange }: GalleryPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const gallery = images.length > 0 ? images : primary ? [primary] : []
  const atLimit = gallery.length >= MAX_FILES

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

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= gallery.length || to >= gallery.length) return
    const next = [...gallery]
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    commit(next)
  }

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return
    setLoading(true)
    setError('')
    setInfo('')
    const remaining = MAX_FILES - gallery.length
    if (remaining <= 0) {
      setError(`الحد الأقصى ${MAX_FILES} صورة لكل عمل`)
      setLoading(false)
      return
    }

    const list = Array.from(files).slice(0, remaining)
    setProgress({ done: 0, total: list.length })

    const existing = new Set(gallery)
    const seen = new Set<string>()
    let skipped = 0

    try {
      const added: string[] = []
      for (let i = 0; i < list.length; i++) {
        const file = list[i]!
        try {
          const fp = await fileFingerprint(file)
          if (seen.has(fp)) {
            skipped++
            setProgress({ done: i + 1, total: list.length })
            continue
          }
          seen.add(fp)

          const dataUrl = await fileToDataUrl(file, { maxSide: 1200, quality: 0.78 })
          if (existing.has(dataUrl)) {
            skipped++
            setProgress({ done: i + 1, total: list.length })
            continue
          }
          existing.add(dataUrl)
          added.push(dataUrl)
        } catch (fileErr) {
          console.warn('[gallery] skip file', fileErr)
        }
        setProgress({ done: i + 1, total: list.length })
      }

      if (added.length === 0) {
        setError(skipped > 0 ? 'جميع الصور المختارة مكررة أو تعذر معالجتها' : 'تعذر معالجة الصور المختارة')
        return
      }
      commit([...gallery, ...added])
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

  return (
    <div className="space-y-3">
      <label className="form-label">
        صور العمل ({gallery.length}/{MAX_FILES}) — رفع من الجهاز فقط
      </label>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={loading || atLimit}
            className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-60"
          >
            {loading ? 'جاري الرفع...' : 'رفع صور (متعدد)'}
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
        {progress && <UploadProgressBar done={progress.done} total={progress.total} />}
      </div>

      {info && <p className="text-sm text-amber-600 dark:text-amber-400">{info}</p>}
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {gallery.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {gallery.map((src, index) => {
            const isPrimary = src === primary
            return (
              <div
                key={`${index}-${src.slice(0, 48)}`}
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIndex != null) reorder(dragIndex, index)
                  setDragIndex(null)
                }}
                onDragEnd={() => setDragIndex(null)}
                className={`relative cursor-grab overflow-hidden rounded-xl border active:cursor-grabbing ${
                  isPrimary
                    ? 'border-primary-500 ring-2 ring-primary-200 dark:ring-primary-800'
                    : 'border-gray-200 dark:border-gray-700'
                } ${dragIndex === index ? 'opacity-60' : ''}`}
              >
                <img src={src} alt="" className="aspect-square w-full object-contain bg-gray-100 dark:bg-gray-900" loading="lazy" />
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
      {gallery.length > 1 && (
        <p className="text-xs text-gray-500 dark:text-gray-400">اسحب الصور لإعادة ترتيبها</p>
      )}
    </div>
  )
}
