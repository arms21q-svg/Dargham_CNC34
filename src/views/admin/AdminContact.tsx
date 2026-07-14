'use client'

import type { FloatLink, FloatLinkIcon } from '../../types/siteData'
import Link from 'next/link'
import { useSiteData } from '../../context/SiteDataContext'
import AdminSaveBar from '../../components/admin/AdminSaveBar'
import { FLOAT_LINK_ICONS, FloatLinkIconSvg, normalizeFloatLinks } from '../../utils/floatLinks'

export default function AdminContact() {
  const { siteData, updateContact } = useSiteData()
  const contact = siteData.contact

  const floatLinks = normalizeFloatLinks(contact, contact.floatLinks)

  const updateFloatLinks = (links: FloatLink[]) => {
    updateContact({ floatLinks: links })
  }

  const updateFloatLink = (id: string, patch: Partial<FloatLink>) => {
    updateFloatLinks(floatLinks.map((link) => (link.id === id ? { ...link, ...patch } : link)))
  }

  const addFloatLink = () => {
    updateFloatLinks([
      ...floatLinks,
      {
        id: crypto.randomUUID(),
        label: { ar: 'رابط جديد', en: 'New link' },
        url: 'https://',
        icon: 'website',
        enabled: true,
      },
    ])
  }

  const removeFloatLink = (id: string) => {
    if (!confirm('حذف هذا الرابط؟')) return
    updateFloatLinks(floatLinks.filter((link) => link.id !== id))
  }

  return (
    <div>
      <AdminSaveBar />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">روابط التواصل</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          التغييرات تظهر فوراً على الموقع — اضغط «نشر على الموقع» لحفظها بشكل دائم
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4 p-6">
          <h2 className="font-semibold">واتساب</h2>
          <div>
            <label className="form-label">رقم الواتساب (بدون +)</label>
            <input
              className="input-field"
              value={contact.whatsapp}
              onChange={(e) => updateContact({ whatsapp: e.target.value })}
              placeholder="9647701234567"
            />
          </div>
          <div>
            <label className="form-label">رسالة الواتساب (عربي)</label>
            <input
              className="input-field"
              value={contact.whatsappMessage.ar}
              onChange={(e) =>
                updateContact({
                  whatsappMessage: { ...contact.whatsappMessage, ar: e.target.value },
                })
              }
            />
          </div>
          <div>
            <label className="form-label">رسالة الواتساب (English)</label>
            <input
              className="input-field"
              value={contact.whatsappMessage.en}
              onChange={(e) =>
                updateContact({
                  whatsappMessage: { ...contact.whatsappMessage, en: e.target.value },
                })
              }
            />
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <h2 className="font-semibold">فيسبوك والموقع</h2>
          <div>
            <label className="form-label">رابط فيسبوك</label>
            <input
              className="input-field"
              value={contact.facebook}
              onChange={(e) => updateContact({ facebook: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">رابط الموقع على الخريطة</label>
            <input
              className="input-field"
              value={contact.mapsUrl}
              onChange={(e) => updateContact({ mapsUrl: e.target.value })}
            />
          </div>
          <div>
            <label className="form-label">العنوان (عربي)</label>
            <input
              className="input-field"
              value={contact.address.ar}
              onChange={(e) =>
                updateContact({
                  address: { ...contact.address, ar: e.target.value },
                })
              }
            />
          </div>
          <div>
            <label className="form-label">العنوان (English)</label>
            <input
              className="input-field"
              value={contact.address.en}
              onChange={(e) =>
                updateContact({
                  address: { ...contact.address, en: e.target.value },
                })
              }
            />
          </div>
        </div>

        <div className="card space-y-4 p-6 lg:col-span-2">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">المساعد الذكي (AI)</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                زر دائري بنفسجي يفتح محادثة ذكية مع الزوار عن أعمالكم وخدماتكم.
              </p>
            </div>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={contact.aiAssistant?.enabled ?? true}
                onChange={(e) =>
                  updateContact({
                    aiAssistant: {
                      enabled: e.target.checked,
                      welcomeMessage: contact.aiAssistant?.welcomeMessage ?? {
                        ar: 'مرحباً! أنا مساعد ضرغام CNC. اسألني عن أعمالنا وخدماتنا.',
                        en: 'Hello! I am Dorgham CNC assistant. Ask about our works and services.',
                      },
                    },
                  })
                }
                className="h-4 w-4 rounded"
              />
              مفعّل
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">رسالة الترحيب (عربي)</label>
              <textarea
                className="input-field resize-none"
                rows={3}
                value={contact.aiAssistant?.welcomeMessage.ar ?? ''}
                onChange={(e) =>
                  updateContact({
                    aiAssistant: {
                      enabled: contact.aiAssistant?.enabled ?? true,
                      welcomeMessage: {
                        ar: e.target.value,
                        en: contact.aiAssistant?.welcomeMessage.en ?? '',
                      },
                    },
                  })
                }
              />
            </div>
            <div>
              <label className="form-label">رسالة الترحيب (English)</label>
              <textarea
                className="input-field resize-none"
                rows={3}
                value={contact.aiAssistant?.welcomeMessage.en ?? ''}
                onChange={(e) =>
                  updateContact({
                    aiAssistant: {
                      enabled: contact.aiAssistant?.enabled ?? true,
                      welcomeMessage: {
                        ar: contact.aiAssistant?.welcomeMessage.ar ?? '',
                        en: e.target.value,
                      },
                    },
                  })
                }
              />
            </div>
          </div>
        </div>

        <div className="card space-y-4 p-6 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">الزر العائم — روابط الموقع</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                تظهر في الزر الدائري أسفل الموقع. يمكنك إضافة إنستغرام، تيك توك، وغيرها.
              </p>
            </div>
            <button type="button" onClick={addFloatLink} className="btn-primary !px-4 !py-2 text-sm">
              + إضافة رابط
            </button>
          </div>

          <div className="space-y-3">
            {floatLinks.map((link) => (
              <div key={link.id} className="rounded-2xl border border-gray-100 p-4 dark:border-gray-800">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium">
                    <input
                      type="checkbox"
                      checked={link.enabled}
                      onChange={(e) => updateFloatLink(link.id, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded"
                    />
                    <span
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-white ${link.icon === 'instagram' ? 'bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]' : 'bg-primary-600'}`}
                    >
                      <FloatLinkIconSvg icon={link.icon} className="h-4 w-4" />
                    </span>
                    {link.label.ar}
                  </label>
                  <button
                    type="button"
                    onClick={() => removeFloatLink(link.id)}
                    className="text-sm text-red-600 hover:underline dark:text-red-400"
                  >
                    حذف
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="form-label">الأيقونة</label>
                    <select
                      className="input-field"
                      value={link.icon}
                      onChange={(e) =>
                        updateFloatLink(link.id, { icon: e.target.value as FloatLinkIcon })
                      }
                    >
                      {FLOAT_LINK_ICONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">الاسم (عربي)</label>
                    <input
                      className="input-field"
                      value={link.label.ar}
                      onChange={(e) =>
                        updateFloatLink(link.id, {
                          label: { ...link.label, ar: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label">الاسم (English)</label>
                    <input
                      className="input-field"
                      value={link.label.en}
                      onChange={(e) =>
                        updateFloatLink(link.id, {
                          label: { ...link.label, en: e.target.value },
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="form-label">
                      {link.icon === 'whatsapp' ? 'الرابط (يُستخدم رقم الواتساب)' : 'الرابط'}
                    </label>
                    <input
                      className="input-field"
                      value={link.url}
                      onChange={(e) => updateFloatLink(link.id, { url: e.target.value })}
                      placeholder={
                        link.icon === 'whatsapp'
                          ? 'يُؤخذ من رقم الواتساب أعلاه'
                          : 'https://example.com'
                      }
                      disabled={link.icon === 'whatsapp'}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">حساب المدير العام</h2>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            لتعديل البريد الإلكتروني وكلمة المرور، انتقل إلى صفحة{' '}
            <Link href="/admin/managers" className="font-medium text-primary-600 hover:underline dark:text-primary-400">
              المسؤولين
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
