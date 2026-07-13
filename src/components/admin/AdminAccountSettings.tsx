import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD } from '../../data/defaultSiteData'
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
  title: string
}

export default function AdminAccountSettings({ compact = false }: AdminAccountSettingsProps) {
  const { siteData, updateAdminEmail, updateAdminPassword } = useSiteData()
  const [showPassword, setShowPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [newUserEmail, setNewUserEmail] = useState('')
  const [newUserNameAr, setNewUserNameAr] = useState('')
  const [creating, setCreating] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null)

  const currentPassword = siteData.settings.adminPassword || DEFAULT_ADMIN_PASSWORD
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
      setApiError('تعذر تحميل حسابات لوحة التحكم — تأكد من تشغيل API')
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  useEffect(() => {
    if (!compact) {
      loadUsers()
    }
  }, [compact, loadUsers])

  const handlePasswordSave = () => {
    if (!newPassword.trim()) return
    updateAdminPassword(newPassword.trim())
    setNewPassword('')
    alert('تم تحديث كلمة المرور — اضغط «نشر على الموقع» لحفظها على السيرفر')
  }

  const handleCreateUser = async () => {
    const email = newUserEmail.trim().toLowerCase()
    if (!email.includes('@')) {
      alert('أدخل بريداً إلكترونياً صالحاً')
      return
    }

    setCreating(true)
    try {
      const result = await createAdminUser({
        email,
        nameAr: newUserNameAr.trim() || undefined,
      })

      if (!result.ok || !result.user || !result.password) {
        alert(result.error ?? 'فشل إنشاء الحساب')
        return
      }

      setCreatedCredentials({
        email: result.user.email,
        password: result.password,
        title: 'تم إنشاء حساب جديد',
      })
      setNewUserEmail('')
      setNewUserNameAr('')
      await loadUsers()
    } catch {
      alert('تعذر إنشاء الحساب — تأكد من تشغيل API وتسجيل الدخول كمدير رئيسي')
    } finally {
      setCreating(false)
    }
  }

  const handleResetPassword = async (user: AdminUserRecord) => {
    if (!confirm(`إنشاء كلمة مرور جديدة لـ ${user.email}؟`)) return

    try {
      const result = await resetAdminUserPassword(user.id)
      if (!result.ok || !result.password) {
        alert(result.error ?? 'فشل إعادة التعيين')
        return
      }

      setCreatedCredentials({
        email: user.email,
        password: result.password,
        title: 'كلمة مرور جديدة',
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
      await loadUsers()
    } catch {
      alert('تعذر حذف الحساب')
    }
  }

  const copyCredentials = async (email: string, password: string) => {
    const text = `البريد: ${email}\nكلمة المرور: ${password}\nرابط الدخول: /admin/login`
    try {
      await navigator.clipboard.writeText(text)
      alert('تم النسخ')
    } catch {
      alert(text)
    }
  }

  if (compact) {
    return (
      <div className="card p-5">
        <h2 className="mb-3 font-semibold text-gray-800 dark:text-gray-100">المدير الرئيسي</h2>
        <dl className="space-y-2 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-gray-500 dark:text-gray-400">البريد</dt>
            <dd className="font-medium text-gray-800 dark:text-gray-100">{currentEmail}</dd>
          </div>
          <div className="flex flex-wrap justify-between gap-2">
            <dt className="text-gray-500 dark:text-gray-400">كلمة المرور</dt>
            <dd className="font-mono font-medium text-gray-800 dark:text-gray-100">
              {showPassword ? currentPassword : '••••••••••'}
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => setShowPassword((v) => !v)}
          className="mt-3 text-sm text-primary-600 hover:underline dark:text-primary-400"
        >
          {showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
        </button>
        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          رابط الدخول: <span className="font-medium">/admin/login</span>
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4 p-6">
        <div>
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">المدير الرئيسي</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            حساب المدير العام — رابط الدخول: <span className="font-medium">/admin/login</span>
          </p>
        </div>

        <div className="rounded-xl border border-primary-200 bg-primary-50/70 p-4 dark:border-primary-900 dark:bg-primary-950/40">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-primary-700 dark:text-primary-300">
            Super Admin
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">البريد الإلكتروني</p>
              <p className="font-medium text-gray-800 dark:text-gray-100">{currentEmail}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">كلمة المرور</p>
              <p className="font-mono font-medium text-gray-800 dark:text-gray-100">
                {showPassword ? currentPassword : '••••••••••'}
              </p>
            </div>
          </div>
        </div>

        <div>
          <label className="form-label">تعديل البريد الإلكتروني</label>
          <input
            type="email"
            className="input-field"
            value={siteData.settings.adminEmail}
            onChange={(e) => updateAdminEmail(e.target.value)}
            placeholder={DEFAULT_ADMIN_EMAIL}
          />
        </div>

        <div>
          <label className="form-label">كلمة مرور جديدة للمدير الرئيسي</label>
          <div className="flex gap-2">
            <input
              type="password"
              className="input-field"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="اتركها فارغة إن لم تُرد التغيير"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="btn-secondary shrink-0 !px-4 !py-2 text-sm"
            >
              {showPassword ? 'إخفاء' : 'إظهار'}
            </button>
            <button
              type="button"
              onClick={handlePasswordSave}
              disabled={!newPassword.trim()}
              className="btn-primary shrink-0 !px-4 !py-2 text-sm disabled:opacity-50"
            >
              تحديث
            </button>
          </div>
        </div>

        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          بعد تغيير بيانات المدير الرئيسي، اضغط «نشر على الموقع» لحفظها على السيرفر.
        </p>
      </div>

      <div className="card space-y-4 p-6">
        <div>
          <h2 className="font-semibold text-gray-800 dark:text-gray-100">إنشاء حسابات لوحة التحكم</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            أدخل البريد فقط — تُنشأ كلمة مرور عشوائية وتُعرض مرة واحدة
          </p>
        </div>

        {createdCredentials && (
          <div className="rounded-xl border border-green-300 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
            <p className="font-semibold text-green-800 dark:text-green-200">{createdCredentials.title}</p>
            <p className="mt-2 text-sm text-green-900 dark:text-green-100">
              البريد: <span className="font-mono">{createdCredentials.email}</span>
            </p>
            <p className="text-sm text-green-900 dark:text-green-100">
              كلمة المرور: <span className="font-mono font-bold">{createdCredentials.password}</span>
            </p>
            <p className="mt-2 text-xs text-green-700 dark:text-green-300">
              احفظ كلمة المرور الآن — لن تُعرض مرة أخرى
            </p>
            <button
              type="button"
              onClick={() =>
                copyCredentials(createdCredentials.email, createdCredentials.password)
              }
              className="mt-3 text-sm font-medium text-green-800 underline dark:text-green-200"
            >
              نسخ البيانات
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">البريد الإلكتروني للحساب الجديد</label>
            <input
              type="email"
              className="input-field"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="form-label">الاسم (اختياري)</label>
            <input
              className="input-field"
              value={newUserNameAr}
              onChange={(e) => setNewUserNameAr(e.target.value)}
              placeholder="اسم المسؤول"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateUser}
          disabled={creating || !newUserEmail.trim()}
          className="btn-primary !px-5 !py-2.5 text-sm disabled:opacity-50"
        >
          {creating ? 'جاري الإنشاء...' : '+ إنشاء حساب بكلمة مرور عشوائية'}
        </button>

        {apiError && (
          <p className="text-sm text-amber-700 dark:text-amber-300">{apiError}</p>
        )}

        <div className="border-t border-gray-100 pt-4 dark:border-gray-800">
          <h3 className="mb-3 font-medium text-gray-800 dark:text-gray-100">الحسابات الفرعية</h3>
          {loadingUsers ? (
            <p className="text-sm text-gray-500">جاري التحميل...</p>
          ) : adminUsers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد حسابات فرعية بعد</p>
          ) : (
            <div className="space-y-3">
              {adminUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50"
                >
                  <div>
                    <p className="font-medium text-gray-800 dark:text-gray-100">{user.email}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.nameAr || user.nameEn} — {user.role}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleResetPassword(user)}
                      className="text-sm text-primary-600 hover:underline dark:text-primary-400"
                    >
                      كلمة مرور جديدة
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
    </div>
  )
}
