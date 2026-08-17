'use client'

import { useRef, useState } from 'react'
import type { ProductAttachmentMeta } from '../../data/content'
import {
  fileToAttachment,
  formatAttachmentType,
  type ProductAttachment,
} from '../../utils/fileAttachment'
import { formatFileSize } from '../../utils/imageFile'

interface ProductAttachmentPickerProps {
  value?: ProductAttachmentMeta
  onChange: (value: ProductAttachmentMeta | undefined) => void
  label?: string
}

export default function ProductAttachmentPicker({
  value,
  onChange,
  label = 'ملف مرفق (PDF / كتالوج / تصميم)',
}: ProductAttachmentPickerProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleFile = async (file: File) => {
    setLoading(true)
    setError('')
    try {
      const attachment: ProductAttachment = await fileToAttachment(file)
      onChange({
        name: attachment.name,
        mime: attachment.mime,
        size: attachment.size,
        data: attachment.data,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعذر رفع الملف')
    } finally {
      setLoading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const remove = () => {
    onChange(undefined)
    setError('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const hasFile = Boolean(value?.name?.trim())

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 dark:border-gray-700 dark:bg-gray-900/40">
      <label className="form-label">{label}</label>
      <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
        PDF, ZIP, DOC, DWG, DXF, AI, PSD — حتى 15 ميجابايت
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.zip,.rar,.7z,.doc,.docx,.xls,.xlsx,.dwg,.dxf,.ai,.eps,.psd,.cdr,.svg,application/pdf,application/zip"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />

      {!hasFile ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={loading}
          className="btn-secondary w-full text-sm disabled:opacity-60"
        >
          {loading ? 'جاري الرفع...' : 'رفع ملف من الجهاز'}
        </button>
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate font-medium text-gray-800 dark:text-gray-100">{value!.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatAttachmentType(value!.mime, value!.name)} · {formatFileSize(value!.size)}
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={loading}
              className="btn-secondary !px-3 !py-1.5 text-xs disabled:opacity-60"
            >
              {loading ? '...' : 'استبدال'}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={loading}
              className="text-xs text-red-600 hover:underline dark:text-red-400"
            >
              حذف
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  )
}
