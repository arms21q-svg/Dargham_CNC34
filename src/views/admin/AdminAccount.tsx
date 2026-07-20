'use client'

import { useState, type FormEvent } from 'react'
import { useSiteData } from '../../context/SiteDataContext'
import { apiUrl } from '../../utils/apiBase'
import { getAuthToken } from '../../utils/siteDataStorage'

function emailFromSession(): string {
  try {
    const token = getAuthToken()
    if (!token) return ''
    const payload = JSON.parse(atob(token.split('.')[1] ?? '')) as { email?: string }
    return (payload.email || '').trim().toLowerCase()
  } catch {
    return ''
  }
}

export default function AdminAccount() {
  const { siteData, loading, logout, isSuperAdmin, updateAdminEmail } = useSiteData()
  const [email, setEmail] = useState(
    () => emailFromSession() || siteData.settings.adminEmail || ''
  )
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setError(null)

    if (!isSuperAdmin) {
      setError('تعديل الحساب متاح للمدير الرئيسي فقط')
      return
    }

    const nextEmail = email.trim().toLowerCase()
    if (!nextEmail || !nextEmail.includes('@')) {
      setError('أدخل بريداً إلكترونياً صالحاً')
      return
    }

    if (password && password.length < 8) {
      setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }
    if (password && password !== password2) {
      setError('كلمتا المرور غير متطابقتين')
      return
    }

    const token = getAuthToken()
    if (!token) {
      setError('انتهت الجلسة — سجّل الدخول مجدداً')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(apiUrl('/api/auth/update-credentials'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        credentials: 'same-origin',
        body: JSON.stringify({
          email: nextEmail,
          password: password || undefined,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        message?: string
      }

      if (!res.ok || !json.ok) {
        setError(json.error || 'فشل تحديث بيانات الدخول')
        setSaving(false)
        return
      }

      updateAdminEmail(nextEmail)
      setPassword('')
      setPassword2('')
      setMessage(json.message || 'تم التحديث')
      setSaving(false)

      // Force re-login with the new credentials
      window.setTimeout(() => {
        logout()
        window.location.assign('/admin/login')
      }, 1200)
    } catch {
      setError('تعذر الاتصال بالسيرفر')
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">حساب المدير</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          يُحفظ البريد وكلمة المرور مباشرة على السيرفر، ثم يُطلب منك تسجيل الدخول من جديد
        </p>
      </div>

      <form
        onSubmit={(e) => void onSubmit(e)}
        className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
      >
        <div>
          <label className="form-label">البريد الإلكتروني</label>
          <input
            type="email"
            className="input-field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />
        </div>
        <div>
          <label className="form-label">كلمة مرور جديدة</label>
          <input
            type="password"
            className="input-field"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="اتركها فارغة للإبقاء على الحالية"
            autoComplete="new-password"
          />
        </div>
        <div>
          <label className="form-label">تأكيد كلمة المرور</label>
          <input
            type="password"
            className="input-field"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        {message && <p className="text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}

        <button type="submit" disabled={saving} className="btn-primary w-full sm:w-auto">
          {saving ? 'جاري الحفظ...' : 'حفظ بيانات الدخول'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          logout()
          window.location.assign('/admin/login')
        }}
        className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        تسجيل الخروج
      </button>
    </div>
  )
}
