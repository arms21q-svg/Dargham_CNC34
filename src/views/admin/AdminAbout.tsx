'use client'

import { useSiteData } from '../../context/SiteDataContext'
import AdminSaveBar from '../../components/admin/AdminSaveBar'
import ImagePicker from '../../components/admin/ImagePicker'
import { createDefaultAboutSettings } from '../../data/defaultSiteData'
import type { AboutSettings } from '../../types/siteData'

const TEXT_FIELDS: {
  key: keyof Omit<AboutSettings, 'image' | 'stats'>
  title: string
  rows?: number
}[] = [
  { key: 'title', title: 'عنوان الصفحة' },
  { key: 'subtitle', title: 'العنوان الفرعي' },
  { key: 'story', title: 'عنوان قسم القصة' },
  { key: 'storyText', title: 'نص القصة', rows: 5 },
  { key: 'mission', title: 'عنوان المهمة' },
  { key: 'missionText', title: 'نص المهمة', rows: 4 },
  { key: 'vision', title: 'عنوان الرؤية' },
  { key: 'visionText', title: 'نص الرؤية', rows: 4 },
]

export default function AdminAbout() {
  const { siteData, updateAbout } = useSiteData()
  const about = siteData.about ?? createDefaultAboutSettings()

  const handleChange = (
    field: keyof Omit<AboutSettings, 'image' | 'stats'>,
    lang: 'ar' | 'en',
    value: string
  ) => {
    updateAbout({
      [field]: { ...about[field], [lang]: value },
    })
  }

  const updateStat = (
    index: number,
    patch: Partial<{ value: string; labelAr: string; labelEn: string }>
  ) => {
    const stats = about.stats.map((stat, i) => {
      if (i !== index) return stat
      return {
        value: patch.value ?? stat.value,
        label: {
          ar: patch.labelAr ?? stat.label.ar,
          en: patch.labelEn ?? stat.label.en,
        },
      }
    })
    updateAbout({ stats })
  }

  const addStat = () => {
    updateAbout({
      stats: [...about.stats, { value: '', label: { ar: '', en: '' } }],
    })
  }

  const removeStat = (index: number) => {
    updateAbout({ stats: about.stats.filter((_, i) => i !== index) })
  }

  return (
    <div>
      <AdminSaveBar />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">من نحن</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          عدّل نصوص الصفحة والصورة والإحصائيات — ثم اضغط «نشر على الموقع»
        </p>
      </div>

      <div className="space-y-6">
        {TEXT_FIELDS.map(({ key, title, rows }) => (
          <div key={key} className="card p-6">
            <h2 className="mb-4 font-semibold">{title}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">عربي</label>
                {rows ? (
                  <textarea
                    className="input-field resize-none"
                    rows={rows}
                    value={about[key].ar}
                    onChange={(e) => handleChange(key, 'ar', e.target.value)}
                  />
                ) : (
                  <input
                    className="input-field"
                    value={about[key].ar}
                    onChange={(e) => handleChange(key, 'ar', e.target.value)}
                  />
                )}
              </div>
              <div>
                <label className="form-label">English</label>
                {rows ? (
                  <textarea
                    className="input-field resize-none"
                    rows={rows}
                    value={about[key].en}
                    onChange={(e) => handleChange(key, 'en', e.target.value)}
                  />
                ) : (
                  <input
                    className="input-field"
                    value={about[key].en}
                    onChange={(e) => handleChange(key, 'en', e.target.value)}
                  />
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="card p-6">
          <h2 className="mb-4 font-semibold">صورة الصفحة</h2>
          <ImagePicker value={about.image} onChange={(image) => updateAbout({ image })} />
        </div>

        <div className="card p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold">الإحصائيات</h2>
            <button type="button" onClick={addStat} className="btn-secondary text-sm">
              إضافة إحصائية
            </button>
          </div>

          <div className="space-y-4">
            {about.stats.map((stat, index) => (
              <div
                key={index}
                className="rounded-xl border border-gray-100 p-4 dark:border-gray-800"
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeStat(index)}
                    className="text-sm text-red-600 hover:underline dark:text-red-400"
                    disabled={about.stats.length <= 1}
                  >
                    حذف
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <label className="form-label">القيمة</label>
                    <input
                      className="input-field"
                      value={stat.value}
                      onChange={(e) => updateStat(index, { value: e.target.value })}
                      placeholder="+500"
                    />
                  </div>
                  <div>
                    <label className="form-label">التسمية عربي</label>
                    <input
                      className="input-field"
                      value={stat.label.ar}
                      onChange={(e) => updateStat(index, { labelAr: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Label English</label>
                    <input
                      className="input-field"
                      value={stat.label.en}
                      onChange={(e) => updateStat(index, { labelEn: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
