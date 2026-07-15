'use client'

import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_ADMIN_EMAIL } from '../../data/defaultSiteData'
import { useSiteData } from '../../context/SiteDataContext'
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  resetAdminUserPassword,
  type AdminUserRecord,
} from '../../utils/adminUsersApi'

interface AdminAccountSettingsProps {
  compact?: boolean
}

interface CreatedCredentials {
  email: string
  password: string
}

export default function AdminAccountSettings({ compact = false }: AdminAccountSettingsProps) {
  const { siteData } = useSiteData()
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null)

  const currentEmail = siteData.settings.adminEmail || DEFAULT_ADMIN_EMAIL

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    setApiError(null)
    try {
      const result = await fetchAdminUsers()
      if (result.ok && result.users) {
        setAdminUsers(result.users.filter((user) => user.role !== 'super'))
      } else if (result.error) {
        setApiError(result.error)
      }
    } catch {
      setApiError('تعذر تحميل الحسابات — سجّل الدخول من جديد إن لزم')
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  useEffect(() => {
    if (!compact) loadUsers()
  }, [compact, loadUsers])

  if (compact) {
    return (
      <div className="card p-5">
        <h2 className="mb-2 font-semibold text-gray-800 dark:text-gray-100">حسابات المستخدمين</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">المدير: {currentEmail}</p>
        <a
          href="/admin/managers"
          className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          إنشاء حساب (بريد + كلمة سر) →
        </a>
      </div>
    )
  }

  const handleCreateUser = async () => {
    const email = newUserEmail.trim().toLowerCase()
    if (!email.includes('@')) {
      alert('أدخل بريداً إلكترونياً صالحاً')
      return
    }

    setCreating(true)
    setCreatedCredentials(null)
    try {
      const result = await createAdminUser({ email })

      if (!result.ok || !result.user || !result.password) {
        alert(result.error ?? 'فشل إنشاء الحساب')
        return
      }

      setCreatedCredentials({
        email: result.user.email,
        password: result.password,
      })
      setNewUserEmail('')
      await loadUsers()
    } catch {
      alert('تعذر إنشاء الحساب')
    } finally {
      setCreating(false)
    }
  }

  const handleResetPassword = async (user: AdminUserRecord) => {
    if (!confirm(`إنشاء كلمة مرور عشوائية جديدة لـ ${user.email}؟`)) return

    try {
      const result = await resetAdminUserPassword(user.id)
      if (!result.ok || !result.password) {
        alert(result.error ?? 'فشل إعادة التعيين')
        return
      }

      setCreatedCredentials({
        email: user.email,
        password: result.password,
      })
    } catch {
      alert('تعذر إعادة تعيين كلمة المرور')
    }
  }

  const handleDeleteUser = async (user: AdminUserRecord) => {
    if (!confirm(`حذف حساب ${user.email}؟`)) return

    try {
      const result = await deleteAdminUser(user.id)
      if (!result.ok) {
        alert(result.error ?? 'فشل الحذف')
        return
      }
      if (createdCredentials?.email === user.email) {
        setCreatedCredentials(null)
      }
      await loadUsers()
    } catch {
      alert('تعذر حذف الحساب')
    }
  }

  const copyCredentials = async (email: string, password: string) => {
    const text = `البريد: ${email}\nكلمة المرور: ${password}\nرابط الدخول: https://www.dhirghamcnc.com/admin/login`
    try {
      await navigator.clipboard.writeText(text)
      alert('تم نسخ البريد وكلمة المرور')
    } catch {
      alert(text)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">إنشاء حساب مستخدم</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            أدخل البريد فقط — تُنشأ كلمة مرور عشوائية وتظهر فوراً
          </p>
        </div>

        <div>
          <label className="form-label">البريد الإلكتروني</label>
          <input
            type="email"
            className="input-field"
            value={newUserEmail}
            onChange={(e) => setNewUserEmail(e.target.value)}
            placeholder="user@example.com"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                void handleCreateUser()
              }
            }}
          />
        </div>

        <button
          type="button"
          onClick={handleCreateUser}
          disabled={creating || !newUserEmail.trim()}
          className="btn-primary w-full sm:w-auto disabled:opacity-50"
        >
          {creating ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
        </button>

        {createdCredentials && (
          <div className="rounded-2xl border-2 border-green-400 bg-green-50 p-5 dark:border-green-600 dark:bg-green-950/40">
            <p className="mb-4 text-base font-bold text-green-800 dark:text-green-200">
              تم إنشاء الحساب — احفظ البيانات الآن
            </p>
            <div className="space-y-3 rounded-xl bg-white p-4 dark:bg-gray-900">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">البريد</p>
                <p className="break-all font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {createdCredentials.email}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">كلمة المرور (عشوائية)</p>
                <p className="break-all font-mono text-lg font-bold tracking-wide text-primary-700 dark:text-primary-300">
                  {createdCredentials.password}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => copyCredentials(createdCredentials.email, createdCredentials.password)}
              className="btn-primary mt-4 w-full sm:w-auto"
            >
              نسخ البريد وكلمة المرور
            </button>
          </div>
        )}

        {apiError && <p className="text-sm text-amber-700 dark:text-amber-300">{apiError}</p>}
      </div>

      <div className="card space-y-4 p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">الحسابات</h3>
        {loadingUsers ? (
          <p className="text-sm text-gray-500">جاري التحميل...</p>
        ) : adminUsers.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد حسابات بعد</p>
        ) : (
          <div className="space-y-3">
            {adminUsers.map((user) => (
              <div
                key={user.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50"
              >
                <p className="font-mono text-sm font-medium text-gray-800 dark:text-gray-100">
                  {user.email}
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => handleResetPassword(user)}
                    className="text-sm text-primary-600 hover:underline dark:text-primary-400"
                  >
                    كلمة سر عشوائية جديدة
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteUser(user)}
                    className="text-sm text-red-600 hover:underline dark:text-red-400"
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
