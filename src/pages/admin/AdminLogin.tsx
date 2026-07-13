import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useSiteData } from '../../context/SiteDataContext'
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from '../../data/defaultSiteData'

export default function AdminLogin() {
  const { isAdmin, login, loading } = useSiteData()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!loading && isAdmin) {
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (loading) {
      setError('جاري تحميل البيانات، انتظر قليلاً...')
      return
    }

    setSubmitting(true)
    setError('')

    const result = await login(email, password)
    setSubmitting(false)

    if (result.ok) {
      navigate('/admin')
    } else {
      setError(result.error ?? 'البريد الإلكتروني أو كلمة المرور غير صحيحة')
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-950">
      <div className="card w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-600 text-2xl font-bold text-white">
            D
          </div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">لوحة التحكم</h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            أدخل البريد الإلكتروني وكلمة المرور
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
                placeholder="admin@dorghamcnc.com"
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
              />
            </div>

            {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

            <button type="submit" disabled={submitting} className="btn-primary w-full">
              {submitting ? 'جاري الدخول...' : 'دخول'}
            </button>
          </form>
        )}

        <div className="mt-4 space-y-1 text-center text-xs text-gray-400">
          <p>البريد الافتراضي: {DEFAULT_ADMIN_EMAIL}</p>
          <p>كلمة المرور الافتراضية: {DEFAULT_ADMIN_PASSWORD}</p>
        </div>
      </div>
    </div>
  )
}
