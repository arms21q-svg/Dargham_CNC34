'use client'

import { useEffect, useState } from 'react'
import type { ContactSettings, FloatLink, FloatLinkIcon } from '../../types/siteData'
import { useSiteData } from '../../context/SiteDataContext'
import AdminSaveBar from '../../components/admin/AdminSaveBar'

type SocialField = {
  id: string
  label: string
  icon: FloatLinkIcon
  placeholder: string
  scalar?: keyof Pick<
    ContactSettings,
    | 'whatsapp'
    | 'facebook'
    | 'mapsUrl'
    | 'email'
    | 'phone'
    | 'instagram'
    | 'tiktok'
    | 'telegram'
    | 'youtube'
    | 'linkedin'
  >
}

const SOCIAL_FIELDS: SocialField[] = [
  { id: 'facebook', label: 'Facebook', icon: 'facebook', placeholder: 'https://facebook.com/...', scalar: 'facebook' },
  { id: 'instagram', label: 'Instagram', icon: 'instagram', placeholder: 'https://instagram.com/...', scalar: 'instagram' },
  { id: 'tiktok', label: 'TikTok', icon: 'tiktok', placeholder: 'https://tiktok.com/@...', scalar: 'tiktok' },
  { id: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp', placeholder: '9647XXXXXXXX', scalar: 'whatsapp' },
  { id: 'telegram', label: 'Telegram', icon: 'telegram', placeholder: 'https://t.me/...', scalar: 'telegram' },
  { id: 'youtube', label: 'YouTube', icon: 'youtube', placeholder: 'https://youtube.com/...', scalar: 'youtube' },
  { id: 'linkedin', label: 'LinkedIn', icon: 'linkedin', placeholder: 'https://linkedin.com/...', scalar: 'linkedin' },
  { id: 'email', label: 'البريد الإلكتروني', icon: 'email', placeholder: 'info@example.com', scalar: 'email' },
  { id: 'phone', label: 'رقم الهاتف', icon: 'phone', placeholder: '07XXXXXXXXX', scalar: 'phone' },
  { id: 'maps', label: 'خرائط Google', icon: 'maps', placeholder: 'https://maps.google.com/...', scalar: 'mapsUrl' },
]

function linkValue(contact: ContactSettings, field: SocialField): string {
  if (field.scalar && contact[field.scalar]) {
    return String(contact[field.scalar] ?? '')
  }
  const fromFloat = contact.floatLinks?.find((l) => l.id === field.id || l.icon === field.icon)
  return fromFloat?.url ?? ''
}

function valuesFromContact(contact: ContactSettings): Record<string, string> {
  const map: Record<string, string> = {}
  for (const field of SOCIAL_FIELDS) {
    map[field.id] = linkValue(contact, field)
  }
  return map
}

function buildFloatLinks(values: Record<string, string>): FloatLink[] {
  return SOCIAL_FIELDS.map((field) => {
    const url = (values[field.id] ?? '').trim()
    return {
      id: field.id,
      label: { ar: field.label, en: field.label },
      url: field.icon === 'whatsapp' ? '' : field.icon === 'email' ? (url ? `mailto:${url.replace(/^mailto:/i, '')}` : '') : url,
      icon: field.icon,
      enabled: Boolean(url) || field.icon === 'whatsapp',
    }
  })
}

export default function AdminSocial() {
  const { siteData, loading, updateContact } = useSiteData()
  const contact = siteData.contact
  const [values, setValues] = useState(() => valuesFromContact(contact))
  const [aiEnabled, setAiEnabled] = useState(contact.aiAssistant?.enabled ?? true)

  useEffect(() => {
    setValues(valuesFromContact(siteData.contact))
    setAiEnabled(siteData.contact.aiAssistant?.enabled ?? true)
  }, [siteData.updatedAt, siteData.contact])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  const apply = (nextValues: Record<string, string>, nextAi = aiEnabled) => {
    setValues(nextValues)
    updateContact({
      whatsapp: nextValues.whatsapp ?? contact.whatsapp,
      facebook: nextValues.facebook ?? contact.facebook,
      mapsUrl: nextValues.maps ?? contact.mapsUrl,
      email: nextValues.email,
      phone: nextValues.phone,
      instagram: nextValues.instagram,
      tiktok: nextValues.tiktok,
      telegram: nextValues.telegram,
      youtube: nextValues.youtube,
      linkedin: nextValues.linkedin,
      floatLinks: buildFloatLinks(nextValues),
      aiAssistant: {
        enabled: nextAi,
        welcomeMessage: contact.aiAssistant?.welcomeMessage ?? {
          ar: 'مرحباً! أنا مساعد ضرغام CNC.',
          en: 'Hello! I am Dorgham CNC assistant.',
        },
      },
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">مواقع التواصل</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          عدّل الروابط ثم احفظ وانشر لتظهر على الموقع فوراً
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {SOCIAL_FIELDS.map((field) => (
          <div key={field.id}>
            <label className="form-label">{field.label}</label>
            <input
              className="input-field"
              value={values[field.id] ?? ''}
              placeholder={field.placeholder}
              onChange={(e) => apply({ ...values, [field.id]: e.target.value })}
            />
          </div>
        ))}
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <input
          type="checkbox"
          checked={aiEnabled}
          onChange={(e) => {
            setAiEnabled(e.target.checked)
            apply(values, e.target.checked)
          }}
          className="h-4 w-4 rounded border-gray-300 text-primary-600"
        />
        <span className="text-sm font-medium text-gray-800 dark:text-gray-100">
          تفعيل المساعد الذكي في الموقع
        </span>
      </label>

      <AdminSaveBar />
    </div>
  )
}
