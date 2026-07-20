'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { useSiteData } from '../../context/SiteDataContext'
import AdminSaveBar from '../../components/admin/AdminSaveBar'
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
  const { siteData, loading, updateAdminEmail, updateAdminPassword, logout, isSuperAdmin } =
    useSiteData()
  const router = useRouter()
  const [email, setEmail] = useState(
    () => emailFromSession() || siteData.settings.adminEmail || ''
  )
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  const onSubmit = (e: FormEvent) => {
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

    updateAdminEmail(nextEmail)
    if (password) {
      updateAdminPassword(password)
      setPassword('')
      setPassword2('')
    }
    setMessage('تم تحديث البيانات محلياً — اضغط حفظ ونشر لتطبيقها على السيرفر')
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">حساب المدير</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          تغيير البريد وكلمة المرور ثم الحفظ والنشر
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
        <div>
          <label className="form-label">اسم المدير (اختياري)</label>
          <input
            className="input-field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ضرغام CNC"
          />
        </div>
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

        <button type="submit" className="btn-primary w-full sm:w-auto">
          تطبيق على المسودة
        </button>
      </form>

      <AdminSaveBar />

      <button
        type="button"
        onClick={() => {
          logout()
          router.push('/admin/login')
        }}
        className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/30"
      >
        تسجيل الخروج
      </button>
    </div>
  )
}
