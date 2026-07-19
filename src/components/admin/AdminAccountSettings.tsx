'use client'

import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_ADMIN_EMAIL } from '../../data/defaultSiteData'
import { useSiteData } from '../../context/SiteDataContext'
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  resetAdminUserPassword,
  setAdminUserStatus,
  type AdminAuditLogRecord,
  type AdminUserRecord,
} from '../../utils/adminUsersApi'
import { EMPLOYEE_JOB_ROLES, generateEmployeePassword } from '../../utils/employeeAccounts'
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

interface AdminAccountSettingsProps {
  compact?: boolean
}

interface RevealedCredentials {
  name: string
  email: string
  username: string
  password: string
  jobTitle?: string
  reason: 'create' | 'reset'
}

const ACTION_LABELS: Record<string, string> = {
  'user.create': 'إنشاء حساب',
  'user.reset_password': 'كلمة مرور عشوائية',
  'user.set_password': 'تعيين كلمة مرور',
  'user.delete': 'حذف حساب',
  'user.status_change': 'تغيير الحالة',
}

function accountTypeLabel(user: AdminUserRecord) {
  if (user.role === 'super') return 'مدير رئيسي'
  return user.jobTitle?.trim() || 'مسؤول'
}

function statusLabel(status: string) {
  return status === 'disabled' ? 'معطّل' : 'نشط'
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString('ar-IQ', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function AdminAccountSettings({ compact = false }: AdminAccountSettingsProps) {
  const { siteData } = useSiteData()
  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([])
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogRecord[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const [nameAr, setNameAr] = useState('')
  const [newUserEmail, setNewUserEmail] = useState('')
  const [password, setPassword] = useState(() => generateEmployeePassword())
  const [jobTitle, setJobTitle] = useState<string>(EMPLOYEE_JOB_ROLES[0].value)
  const [creating, setCreating] = useState(false)
  const [revealed, setRevealed] = useState<RevealedCredentials | null>(null)
  const [resetTarget, setResetTarget] = useState<AdminUserRecord | null>(null)
  const [customPassword, setCustomPassword] = useState('')
  const [resetting, setResetting] = useState(false)

  const currentEmail =
    emailFromSession() || siteData.settings.adminEmail || DEFAULT_ADMIN_EMAIL

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    setApiError(null)
    try {
      const result = await fetchAdminUsers()
      if (result.ok && result.users) {
        setAdminUsers(result.users)
        setAuditLogs(result.auditLogs ?? [])
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
        <h2 className="mb-2 font-semibold text-gray-800 dark:text-gray-100">إدارة الموظفين</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">المدير: {currentEmail}</p>
        <a
          href="/admin/employees"
          className="mt-3 inline-block text-sm font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          فتح إدارة الموظفين →
        </a>
      </div>
    )
  }

  const handleCreateUser = async () => {
    const email = newUserEmail.trim().toLowerCase()
    const name = nameAr.trim()
    const plainPassword = password.trim()

    if (!name) {
      alert('أدخل اسم الموظف')
      return
    }
    if (!email.includes('@')) {
      alert('أدخل بريداً إلكترونياً صالحاً')
      return
    }
    if (plainPassword.length < 8) {
      alert('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }
    if (!jobTitle.trim()) {
      alert('اختر نوع الوظيفة')
      return
    }

    setCreating(true)
    setRevealed(null)
    try {
      const result = await createAdminUser({
        email,
        nameAr: name,
        password: plainPassword,
        jobTitle: jobTitle.trim(),
      })

      if (!result.ok || !result.user || !result.password) {
        alert(result.error ?? 'فشل إنشاء الحساب')
        return
      }

      setRevealed({
        name: result.user.nameAr || name,
        email: result.user.email,
        username: result.user.username,
        password: result.password,
        jobTitle: result.user.jobTitle || jobTitle,
        reason: 'create',
      })
      setNameAr('')
      setNewUserEmail('')
      setPassword(generateEmployeePassword())
      setJobTitle(EMPLOYEE_JOB_ROLES[0].value)
      await loadUsers()
    } catch {
      alert('تعذر إنشاء الحساب')
    } finally {
      setCreating(false)
    }
  }

  const finishPasswordReveal = (user: AdminUserRecord, password: string, reason: 'create' | 'reset') => {
    setRevealed({
      name: user.nameAr || user.nameEn || user.email,
      email: user.email,
      username: user.username,
      password,
      reason,
    })
    setResetTarget(null)
    setCustomPassword('')
  }

  const handleRandomPassword = async (user: AdminUserRecord) => {
    if (!confirm(`إنشاء كلمة مرور عشوائية جديدة لـ ${user.email}؟`)) return

    setResetting(true)
    try {
      const result = await resetAdminUserPassword(user.id)
      if (!result.ok || !result.password) {
        alert(result.error ?? 'فشل إعادة التعيين')
        return
      }
      finishPasswordReveal(result.user ?? user, result.password, 'reset')
      await loadUsers()
    } catch {
      alert('تعذر إعادة تعيين كلمة المرور')
    } finally {
      setResetting(false)
    }
  }

  const handleSetCustomPassword = async () => {
    if (!resetTarget) return
    const password = customPassword.trim()
    if (password.length < 8) {
      alert('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      return
    }

    setResetting(true)
    try {
      const result = await resetAdminUserPassword(resetTarget.id, password)
      if (!result.ok || !result.password) {
        alert(result.error ?? 'فشل تعيين كلمة المرور')
        return
      }
      finishPasswordReveal(result.user ?? resetTarget, result.password, 'reset')
      await loadUsers()
    } catch {
      alert('تعذر تعيين كلمة المرور')
    } finally {
      setResetting(false)
    }
  }

  const handleToggleStatus = async (user: AdminUserRecord) => {
    if (user.role === 'super') return
    const next = user.status === 'disabled' ? 'active' : 'disabled'
    const label = next === 'disabled' ? 'تعطيل' : 'تفعيل'
    if (!confirm(`${label} حساب ${user.email}؟`)) return

    try {
      const result = await setAdminUserStatus(user.id, next)
      if (!result.ok) {
        alert(result.error ?? 'فشل تغيير الحالة')
        return
      }
      await loadUsers()
    } catch {
      alert('تعذر تغيير حالة الحساب')
    }
  }

  const handleDeleteUser = async (user: AdminUserRecord) => {
    if (user.role === 'super') return
    if (!confirm(`حذف حساب ${user.email}؟`)) return

    try {
      const result = await deleteAdminUser(user.id)
      if (!result.ok) {
        alert(result.error ?? 'فشل الحذف')
        return
      }
      if (revealed?.email === user.email) setRevealed(null)
      await loadUsers()
    } catch {
      alert('تعذر حذف الحساب')
    }
  }

  const copyCredentials = async (creds: RevealedCredentials) => {
    const text = [
      `الاسم: ${creds.name}`,
      `البريد الإلكتروني: ${creds.email}`,
      `اسم المستخدم: ${creds.username}`,
      creds.jobTitle ? `نوع الوظيفة: ${creds.jobTitle}` : null,
      `كلمة المرور: ${creds.password}`,
      `رابط الدخول: https://www.dhirghamcnc.com/admin/login`,
    ]
      .filter(Boolean)
      .join('\n')

    try {
      await navigator.clipboard.writeText(text)
      alert('تم نسخ بيانات الحساب')
    } catch {
      alert(text)
    }
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-5 p-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">إنشاء حساب موظف</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            أدخل بيانات الموظف — كلمة المرور تُنشأ تلقائياً ويمكن إعادة توليدها قبل الحفظ
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">اسم الموظف</label>
            <input
              type="text"
              className="input-field"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="الاسم الكامل"
            />
          </div>
          <div>
            <label className="form-label">البريد الإلكتروني (Email)</label>
            <input
              type="email"
              className="input-field"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="form-label">كلمة المرور (Password)</label>
            <div className="flex gap-2">
              <input
                type="text"
                className="input-field font-mono"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setPassword(generateEmployeePassword())}
                className="shrink-0 rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                Generate Password
              </button>
            </div>
          </div>
          <div>
            <label className="form-label">نوع الوظيفة (Role)</label>
            <select
              className="input-field"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            >
              {EMPLOYEE_JOB_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={handleCreateUser}
          disabled={creating || !newUserEmail.trim() || !nameAr.trim() || password.trim().length < 8}
          className="btn-primary w-full sm:w-auto disabled:opacity-50"
        >
          {creating ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
        </button>

        {revealed && (
          <div className="rounded-2xl border-2 border-green-400 bg-green-50 p-5 dark:border-green-600 dark:bg-green-950/40">
            <p className="mb-1 text-base font-bold text-green-800 dark:text-green-200">
              {revealed.reason === 'create'
                ? 'تم إنشاء الحساب — احفظ البيانات الآن'
                : 'كلمة مرور جديدة — احفظها الآن'}
            </p>
            <p className="mb-4 text-xs text-green-700 dark:text-green-300">
              لن تُعرض كلمة المرور مرة أخرى بعد مغادرة هذه الرسالة
            </p>
            <div className="space-y-3 rounded-xl bg-white p-4 dark:bg-gray-900">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">الاسم</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{revealed.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">البريد الإلكتروني</p>
                <p className="break-all font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {revealed.email}
                </p>
              </div>
              {revealed.jobTitle && (
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">نوع الوظيفة</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {revealed.jobTitle}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">اسم المستخدم</p>
                <p className="break-all font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {revealed.username}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">كلمة المرور</p>
                <p className="break-all font-mono text-lg font-bold tracking-wide text-primary-700 dark:text-primary-300">
                  {revealed.password}
                </p>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => copyCredentials(revealed)}
                className="btn-primary w-full sm:w-auto"
              >
                نسخ البيانات
              </button>
              <button
                type="button"
                onClick={() => setRevealed(null)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                إخفاء
              </button>
            </div>
          </div>
        )}

        {apiError && <p className="text-sm text-amber-700 dark:text-amber-300">{apiError}</p>}
      </div>

      <div className="card space-y-4 p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">جميع الحسابات</h3>
        {loadingUsers ? (
          <p className="text-sm text-gray-500">جاري التحميل...</p>
        ) : adminUsers.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد حسابات بعد</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-right text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="px-3 py-2 font-medium">الاسم</th>
                  <th className="px-3 py-2 font-medium">اسم المستخدم</th>
                  <th className="px-3 py-2 font-medium">البريد الإلكتروني</th>
                  <th className="px-3 py-2 font-medium">نوع الوظيفة</th>
                  <th className="px-3 py-2 font-medium">الحالة</th>
                  <th className="px-3 py-2 font-medium">تاريخ الإنشاء</th>
                  <th className="px-3 py-2 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {adminUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-gray-100 dark:border-gray-800/80"
                  >
                    <td className="px-3 py-3 font-medium text-gray-800 dark:text-gray-100">
                      {user.nameAr || user.nameEn || '—'}
                    </td>
                    <td className="px-3 py-3 font-mono text-gray-700 dark:text-gray-200">
                      {user.username}
                    </td>
                    <td className="px-3 py-3 font-mono text-gray-700 dark:text-gray-200">
                      {user.email}
                    </td>
                    <td className="px-3 py-3 text-gray-700 dark:text-gray-200">
                      {accountTypeLabel(user)}
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={
                          user.status === 'disabled'
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-green-700 dark:text-green-300'
                        }
                      >
                        {statusLabel(user.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-3 py-3">
                      {user.role === 'super' ? (
                        <span className="text-xs text-gray-400">—</span>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setResetTarget(user)
                              setCustomPassword('')
                              setRevealed(null)
                            }}
                            className="text-sm text-primary-600 hover:underline dark:text-primary-400"
                          >
                            إعادة تعيين
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRandomPassword(user)}
                            disabled={resetting}
                            className="text-sm text-primary-600 hover:underline dark:text-primary-400 disabled:opacity-50"
                          >
                            عشوائية
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className="text-sm text-amber-700 hover:underline dark:text-amber-300"
                          >
                            {user.status === 'disabled' ? 'تفعيل' : 'تعطيل'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(user)}
                            className="text-sm text-red-600 hover:underline dark:text-red-400"
                          >
                            حذف
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {resetTarget && (
          <div className="rounded-xl border border-primary-200 bg-primary-50/60 p-4 dark:border-primary-900 dark:bg-primary-950/30">
            <p className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-100">
              تعيين كلمة مرور لـ {resetTarget.email}
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="form-label">كلمة مرور جديدة (8 أحرف على الأقل)</label>
                <input
                  type="text"
                  className="input-field font-mono"
                  value={customPassword}
                  onChange={(e) => setCustomPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور"
                  autoComplete="new-password"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleSetCustomPassword}
                  disabled={resetting || customPassword.trim().length < 8}
                  className="btn-primary disabled:opacity-50"
                >
                  حفظ كلمة المرور
                </button>
                <button
                  type="button"
                  onClick={() => handleRandomPassword(resetTarget)}
                  disabled={resetting}
                  className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  إنشاء عشوائية
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetTarget(null)
                    setCustomPassword('')
                  }}
                  className="rounded-xl px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="card space-y-4 p-6">
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">سجل العمليات</h3>
        {auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">لا توجد عمليات مسجّلة بعد</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-right text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="px-3 py-2 font-medium">التاريخ</th>
                  <th className="px-3 py-2 font-medium">العملية</th>
                  <th className="px-3 py-2 font-medium">بواسطة</th>
                  <th className="px-3 py-2 font-medium">المستهدف</th>
                  <th className="px-3 py-2 font-medium">التفاصيل</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-100 dark:border-gray-800/80">
                    <td className="px-3 py-3 whitespace-nowrap text-gray-600 dark:text-gray-300">
                      {formatDate(log.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-gray-800 dark:text-gray-100">
                      {ACTION_LABELS[log.action] || log.action}
                    </td>
                    <td className="px-3 py-3 font-mono text-gray-700 dark:text-gray-200">
                      {log.actorEmail}
                    </td>
                    <td className="px-3 py-3 font-mono text-gray-700 dark:text-gray-200">
                      {log.targetEmail || '—'}
                    </td>
                    <td className="px-3 py-3 text-gray-600 dark:text-gray-300">{log.details || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
