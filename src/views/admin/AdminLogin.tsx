'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSiteData } from '../../context/SiteDataContext'

export default function AdminLogin() {
  const { isAdmin, login, loading } = useSiteData()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const nextPath = (() => {
    const next = searchParams.get('next')
    if (next && next.startsWith('/admin') && !next.startsWith('//')) return next
    return '/admin'
  })()

  useEffect(() => {
    if (!loading && isAdmin) {
      router.replace(nextPath)
    }
  }, [loading, isAdmin, router, nextPath])

  if (!loading && isAdmin) {
    return null
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) {
      setError('جاري تحميل البيانات، انتظر قليلاً...')
      return
    }

    setSubmitting(true)
    setError('')

    const result = await login(email.trim(), password)
    setSubmitting(false)

    if (result.ok) {
      router.push(nextPath)
    } else {
      setError(result.error ?? 'البريد الإلكتروني أو كلمة المرور غير صحيحة')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-stone-100 to-stone-200 p-4 dark:from-gray-950 dark:to-gray-900">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <div className="mb-8 text-center">
          <img
            src="/logo.png"
            alt="ضرغام CNC"
            width={64}
            height={64}
            className="mx-auto mb-4 h-16 w-16 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
          />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">تسجيل الدخول</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            لوحة تحكم ضرغام CNC — البريد وكلمة المرور فقط
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">البريد الإلكتروني</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="admin@example.com"
                autoComplete="username"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="form-label">كلمة المرور</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
                autoComplete="current-password"
              />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'جاري الدخول...' : 'دخول'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
