import { useSiteData } from '../../context/SiteDataContext'
import AdminSaveBar from '../../components/admin/AdminSaveBar'
import SlideImagesEditor from '../../components/admin/SlideImagesEditor'
import type { HomeSettings } from '../../types/siteData'

export default function AdminHome() {
  const { siteData, updateHome } = useSiteData()
  const home = siteData.home

  const handleChange = (
    field: keyof Omit<HomeSettings, 'slideImages'>,
    lang: 'ar' | 'en',
    value: string
  ) => {
    updateHome({
      [field]: { ...home[field], [lang]: value },
    })
  }

  return (
    <div>
      <AdminSaveBar />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">الصفحة الرئيسية</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          التغييرات تظهر فوراً على الموقع — اضغط «نشر على الموقع» لحفظها بشكل دائم
        </p>
      </div>

      <div className="space-y-6">
        <div className="card p-6">
          <h2 className="mb-4 font-semibold">العنوان الرئيسي</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">عربي</label>
              <input
                className="input-field"
                value={home.heroTitle.ar}
                onChange={(e) => handleChange('heroTitle', 'ar', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">English</label>
              <input
                className="input-field"
                value={home.heroTitle.en}
                onChange={(e) => handleChange('heroTitle', 'en', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-semibold">العنوان الفرعي</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">عربي</label>
              <input
                className="input-field"
                value={home.heroSubtitle.ar}
                onChange={(e) => handleChange('heroSubtitle', 'ar', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">English</label>
              <input
                className="input-field"
                value={home.heroSubtitle.en}
                onChange={(e) => handleChange('heroSubtitle', 'en', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-semibold">الوصف</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">عربي</label>
              <textarea
                className="input-field resize-none"
                rows={4}
                value={home.heroDesc.ar}
                onChange={(e) => handleChange('heroDesc', 'ar', e.target.value)}
              />
            </div>
            <div>
              <label className="form-label">English</label>
              <textarea
                className="input-field resize-none"
                rows={4}
                value={home.heroDesc.en}
                onChange={(e) => handleChange('heroDesc', 'en', e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <h2 className="mb-4 font-semibold">صور السلايدر</h2>
          <SlideImagesEditor
            images={home.slideImages}
            onChange={(slideImages) => updateHome({ slideImages })}
          />
        </div>
      </div>
    </div>
  )
}
