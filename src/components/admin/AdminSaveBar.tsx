'use client'

import { useMemo, useState } from 'react'
import { useSiteData } from '../../context/SiteDataContext'
import { countEmbeddedImages, estimateSiteDataSize } from '../../utils/siteDataStorage'

export default function AdminSaveBar() {
  const { siteData, saveDraft, publish } = useSiteData()
  const [message, setMessage] = useState('')
  const [success, setSuccess] = useState(true)
  const [saving, setSaving] = useState(false)

  const publishHint = useMemo(() => {
    const embedded = countEmbeddedImages(siteData)
    const size = estimateSiteDataSize(siteData)
    if (embedded === 0) return null
    if (size > 3_200_000) {
      return `⚠ ${embedded} صورة مرفوعة محلياً — الحجم كبير جداً ولن يُقبل النشر. استخدم روابط URL`
    }
    if (size > 2_000_000 || embedded >= 4) {
      return `⚠ ${embedded} صورة مرفوعة محلياً قد تبطّئ النشر — يُفضّل روابط URL`
    }
    return null
  }, [siteData])

  const handleSave = () => {
    saveDraft()
    setSuccess(true)
    setMessage('تم حفظ المسودة في المتصفح')
    setTimeout(() => setMessage(''), 3000)
  }

  const handlePublish = async () => {
    setSaving(true)
    setMessage('')
    const result = await publish()
    setSuccess(result.ok)
    setMessage(result.message)
    setSaving(false)
  }

  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 ring-1 ring-gray-100 dark:bg-gray-900 dark:ring-gray-800">
      <div>
        <p className="font-medium text-gray-800 dark:text-gray-100">حفظ التغييرات</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          التغييرات تظهر فوراً — اضغط «نشر على الموقع» لحفظها بشكل دائم
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
        <button onClick={handleSave} className="btn-secondary !px-4 !py-2 text-sm">
          حفظ مسودة
        </button>
        <button
          onClick={handlePublish}
          disabled={saving}
          className="btn-primary !px-4 !py-2 text-sm"
        >
          {saving ? 'جاري النشر...' : 'نشر على الموقع'}
        </button>
      </div>
    </div>
  )
}
