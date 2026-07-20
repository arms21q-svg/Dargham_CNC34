'use client'

import { useSiteData } from '../../context/SiteDataContext'
import AdminSaveBar from '../../components/admin/AdminSaveBar'
import GalleryPicker from '../../components/admin/GalleryPicker'

export default function AdminHome() {
  const { siteData, loading, updateHome } = useSiteData()
  const home = siteData.home

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  const setField = (
    key: 'heroTitle' | 'heroSubtitle' | 'heroDesc',
    lang: 'ar' | 'en',
    value: string
  ) => {
    updateHome({
      [key]: { ...home[key], [lang]: value },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">الصفحة الرئيسية</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          تعديل نصوص الهيرو وصور السلايدر الظاهرة في واجهة الموقع
        </p>
      </div>

      <AdminSaveBar />

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">نصوص الهيرو</h2>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="form-label">العنوان (عربي)</label>
            <input
              className="input-field"
              value={home.heroTitle.ar}
              onChange={(e) => setField('heroTitle', 'ar', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">العنوان (إنجليزي)</label>
            <input
              className="input-field"
              value={home.heroTitle.en}
              onChange={(e) => setField('heroTitle', 'en', e.target.value)}
              dir="ltr"
            />
          </div>
          <div>
            <label className="form-label">العنوان الفرعي (عربي)</label>
            <input
              className="input-field"
              value={home.heroSubtitle.ar}
              onChange={(e) => setField('heroSubtitle', 'ar', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">العنوان الفرعي (إنجليزي)</label>
            <input
              className="input-field"
              value={home.heroSubtitle.en}
              onChange={(e) => setField('heroSubtitle', 'en', e.target.value)}
              dir="ltr"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="form-label">الوصف (عربي)</label>
            <textarea
              className="input-field min-h-[120px]"
              value={home.heroDesc.ar}
              onChange={(e) => setField('heroDesc', 'ar', e.target.value)}
            />
          </div>
          <div>
            <label className="form-label">الوصف (إنجليزي)</label>
            <textarea
              className="input-field min-h-[120px]"
              value={home.heroDesc.en}
              onChange={(e) => setField('heroDesc', 'en', e.target.value)}
              dir="ltr"
            />
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">صور السلايدر</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          الصورة المعيّنة كـ «رئيسية» تظهر أولاً في السلايدر
        </p>
        <GalleryPicker
          images={home.slideImages}
          primary={home.slideImages[0] || ''}
          onChange={(images, primary) => {
            const ordered = primary
              ? [primary, ...images.filter((src) => src !== primary)]
              : images
            updateHome({ slideImages: ordered })
          }}
        />
      </section>

      <AdminSaveBar />
    </div>
  )
}
