'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSiteData } from '../../context/SiteDataContext'
import { countEmbeddedImages, estimateSiteDataSize } from '../../utils/siteDataStorage'
import { needsPublishCompression } from '../../utils/publishCompress'

export default function AdminSaveBar() {
  const { siteData, saveDraft, publish } = useSiteData()
  const router = useRouter()
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(true)
  const [saving, setSaving] = useState(false)

  const publishHint = useMemo(() => {
    const embedded = countEmbeddedImages(siteData)
    const size = estimateSiteDataSize(siteData)
    if (embedded === 0) return null
    if (needsPublishCompression(siteData)) {
      return `ℹ ${embedded} صورة — سيتم ضغطها تلقائياً عند النشر (قد يستغرق دقيقة)`
    }
    if (size > 2_000_000 || embedded >= 25) {
      return `ℹ ${embedded} صورة — النشر قد يستغرق وقتاً أطول`
    }
    return null
  }, [siteData])

  const handleSave = () => {
    saveDraft()
    setSuccess(true)
    setMessage('تم حفظ المسودة في المتصفح فقط — اضغط «نشر على الموقع» ليظهر للزوار')
    setTimeout(() => setMessage(''), 5000)
  }

  const handlePublish = async () => {
    if (saving) return
    setSaving(true)
    setMessage('')
    const result = await publish()
    setSuccess(result.ok)
    setMessage(result.message)
    setSaving(false)
    if (result.ok) {
      router.refresh()
    }
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
      <div>
        <p className="font-medium text-gray-800 dark:text-gray-100">حفظ التغييرات</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          التغييرات في لوحة التحكم محلية حتى تضغط «نشر على الموقع» — بعدها تظهر للزوار
        </p>
        {publishHint && (
          <p className="mt-2 text-sm font-medium text-amber-600 dark:text-amber-400">
            {publishHint}
          </p>
        )}
        {message && (
          <p
            className={`mt-2 text-sm font-medium ${
              success
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {success ? '✓ ' : '✗ '}
            {message}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={handleSave} className="btn-secondary !px-4 !py-2 text-sm">
          حفظ مسودة
        </button>
        <button
          type="button"
          onClick={handlePublish}
          disabled={saving}
          className="btn-primary !px-4 !py-2 text-sm disabled:opacity-60"
        >
          {saving ? 'جاري النشر...' : 'نشر على الموقع'}
        </button>
      </div>
    </div>
  )
}
