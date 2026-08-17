'use client'

import { useRef, useState } from 'react'
import { fileToDataUrl } from '../../utils/imageFile'

interface ImagePickerProps {
  value: string
  onChange: (value: string) => void
  label?: string
}

/** Admin image picker — any aspect ratio; auto-compress for performance. */
export default function ImagePicker({ value, onChange, label = 'الصورة' }: ImagePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [preserveOriginal, setPreserveOriginal] = useState(false)

  const handleFile = async (file: File) => {
    setLoading(true)
    setError('')
    try {
      const dataUrl = await fileToDataUrl(file, { maxSide: 1200, quality: 0.78, preserveOriginal })
      onChange(dataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع الصورة')
    } finally {
      setLoading(false)
    }
  }

  const clearImage = () => {
    onChange('')
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div>
      <label className="form-label">{label}</label>

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
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-200 p-6 transition-colors hover:border-primary-400 hover:bg-primary-50/50 disabled:opacity-60 dark:border-gray-700 dark:hover:border-primary-600 dark:hover:bg-primary-950/50"
      >
        <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
          />
        </svg>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {loading ? 'جاري رفع الصورة...' : 'اضغط لاختيار صورة من جهازك'}
        </span>
        <span className="text-xs text-gray-400">
          أي مقاس — عمودي، أفقي، أو مربع · JPG, PNG, WebP
        </span>
      </button>

      <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
        <input
          type="checkbox"
          checked={preserveOriginal}
          onChange={(e) => setPreserveOriginal(e.target.checked)}
        />
        حفظ الصورة الأصلية بدون ضغط (للملفات حتى 2 ميجابايت)
      </label>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {value && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600 dark:text-gray-300">معاينة</span>
            <button
              type="button"
              onClick={clearImage}
              className="text-sm text-red-600 hover:underline dark:text-red-400"
            >
              حذف الصورة
            </button>
          </div>
          <div className="flex h-48 items-center justify-center overflow-hidden rounded-xl bg-gray-100 ring-1 ring-gray-200 dark:bg-gray-800 dark:ring-gray-700">
            <img
              src={value}
              alt="معاينة"
              className="max-h-full max-w-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  )
}
