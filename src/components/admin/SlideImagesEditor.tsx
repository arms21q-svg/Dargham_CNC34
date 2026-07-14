'use client'

import { useRef, useState } from 'react'
import ImagePicker from './ImagePicker'
import { fileToDataUrl } from '../../utils/imageFile'

interface SlideImagesEditorProps {
  images: string[]
  onChange: (images: string[]) => void
}

export default function SlideImagesEditor({ images, onChange }: SlideImagesEditorProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [newImage, setNewImage] = useState('')
  const [bulkUrls, setBulkUrls] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const addImage = (url: string) => {
    if (!url.trim()) return
    onChange([...images, url.trim()])
    setNewImage('')
  }

  const removeImage = (index: number) => {
    onChange(images.filter((_, i) => i !== index))
  }

  const moveImage = (index: number, direction: -1 | 1) => {
    const next = index + direction
    if (next < 0 || next >= images.length) return
    const updated = [...images]
    ;[updated[index], updated[next]] = [updated[next], updated[index]]
    onChange(updated)
  }

  const handleBulkAdd = () => {
    const urls = bulkUrls
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
    if (urls.length === 0) return
    onChange([...images, ...urls])
    setBulkUrls('')
  }

  const handleMultiUpload = async (files: FileList | null) => {
    if (!files?.length) return
    setLoading(true)
    setError('')
    try {
      const uploaded: string[] = []
      for (const file of Array.from(files)) {
        uploaded.push(await fileToDataUrl(file))
      }
      onChange([...images, ...uploaded])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع الصور')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="space-y-6">
      {images.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((src, index) => (
            <div key={`${index}-${src.slice(0, 32)}`} className="group relative overflow-hidden rounded-xl ring-1 ring-gray-200 dark:ring-gray-700">
              <img src={src} alt={`سلايد ${index + 1}`} className="h-36 w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/60 p-2">
                <span className="text-xs font-medium text-white">صورة {index + 1}</span>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => moveImage(index, -1)}
                    disabled={index === 0}
                    className="rounded bg-white/20 px-2 py-1 text-xs text-white disabled:opacity-30"
                    title="تحريك لأعلى"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(index, 1)}
                    disabled={index === images.length - 1}
                    className="rounded bg-white/20 px-2 py-1 text-xs text-white disabled:opacity-30"
                    title="تحريك لأسفل"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="rounded bg-red-600/80 px-2 py-1 text-xs text-white"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {images.length === 0 && (
        <p className="text-center text-sm text-gray-500 dark:text-gray-400">
          لا توجد صور في السلايدر. أضف صورة من الجهاز أو برابط.
        </p>
      )}

      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-3 font-medium">إضافة صورة للسلايدر</h3>
        <ImagePicker
          value={newImage}
          onChange={setNewImage}
          label="صورة واحدة (رابط أو من الجهاز)"
        />
        <button
          type="button"
          onClick={() => addImage(newImage)}
          disabled={!newImage}
          className="btn-primary mt-3 w-full !py-2 text-sm disabled:opacity-50"
        >
          + إضافة للسلايدر
        </button>
      </div>

      <div className="rounded-xl border border-dashed border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-2 font-medium">رفع عدة صور من الجهاز</h3>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
          يمكنك اختيار أكثر من صورة دفعة واحدة
        </p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleMultiUpload(e.target.files)}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="btn-secondary w-full !py-2 text-sm disabled:opacity-60"
        >
          {loading ? 'جاري رفع الصور...' : 'اختيار صور من الجهاز'}
        </button>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <h3 className="mb-2 font-medium">إضافة روابط دفعة واحدة</h3>
        <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">رابط كل صورة في سطر منفصل</p>
        <textarea
          className="input-field resize-none font-mono text-sm"
          rows={4}
          value={bulkUrls}
          onChange={(e) => setBulkUrls(e.target.value)}
          placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
        />
        <button
          type="button"
          onClick={handleBulkAdd}
          disabled={!bulkUrls.trim()}
          className="btn-secondary mt-3 w-full !py-2 text-sm disabled:opacity-50"
        >
          إضافة الروابط
        </button>
      </div>
    </div>
  )
}
