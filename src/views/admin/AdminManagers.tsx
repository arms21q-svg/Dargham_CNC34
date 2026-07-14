'use client'

import { useState } from 'react'
import type { Manager } from '../../types/siteData'
import { useSiteData } from '../../context/SiteDataContext'
import AdminSaveBar from '../../components/admin/AdminSaveBar'
import AdminAccountSettings from '../../components/admin/AdminAccountSettings'

const emptyManager = (): Manager => ({
  id: crypto.randomUUID(),
  name: { ar: '', en: '' },
  role: { ar: '', en: '' },
  phone: '',
  whatsapp: '',
})

export default function AdminManagers() {
  const { siteData, addManager, updateManager, deleteManager } = useSiteData()
  const [editing, setEditing] = useState<Manager | null>(null)
  const [form, setForm] = useState<Manager>(emptyManager())

  const startAdd = () => {
    setEditing(null)
    setForm(emptyManager())
  }

  const startEdit = (manager: Manager) => {
    setEditing(manager)
    setForm({ ...manager })
  }

  const handleSave = () => {
    if (!form.name.ar) return
    if (editing) {
      updateManager(form)
    } else {
      addManager(form)
    }
    setForm(emptyManager())
    setEditing(null)
  }

  const handleDelete = (id: string) => {
    if (confirm('هل تريد حذف هذا المسؤول؟')) {
      deleteManager(id)
      if (editing?.id === id) {
        setEditing(null)
        setForm(emptyManager())
      }
    }
  }

  return (
    <div>
      <AdminSaveBar />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">المسؤولين</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          إدارة فريق العمل + حسابات الدخول للوحة التحكم
        </p>
      </div>

      <div className="mb-8">
        <AdminAccountSettings />
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">فريق العمل</h2>
        <button onClick={startAdd} className="btn-primary !px-4 !py-2 text-sm">
          + إضافة مسؤول
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card space-y-4 p-6">
          <h3 className="font-semibold">{editing ? 'تعديل مسؤول' : 'مسؤول جديد'}</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">الاسم (عربي)</label>
              <input
                className="input-field"
                value={form.name.ar}
                onChange={(e) =>
                  setForm((m) => ({ ...m, name: { ...m.name, ar: e.target.value } }))
                }
              />
            </div>
            <div>
              <label className="form-label">الاسم (English)</label>
              <input
                className="input-field"
                value={form.name.en}
                onChange={(e) =>
                  setForm((m) => ({ ...m, name: { ...m.name, en: e.target.value } }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">المنصب (عربي)</label>
              <input
                className="input-field"
                value={form.role.ar}
                onChange={(e) =>
                  setForm((m) => ({ ...m, role: { ...m.role, ar: e.target.value } }))
                }
              />
            </div>
            <div>
              <label className="form-label">المنصب (English)</label>
              <input
                className="input-field"
                value={form.role.en}
                onChange={(e) =>
                  setForm((m) => ({ ...m, role: { ...m.role, en: e.target.value } }))
                }
              />
            </div>
          </div>

          <div>
            <label className="form-label">رقم الهاتف</label>
            <input
              className="input-field"
              value={form.phone}
              onChange={(e) => setForm((m) => ({ ...m, phone: e.target.value }))}
            />
          </div>

          <div>
            <label className="form-label">واتساب (اختياري، بدون +)</label>
            <input
              className="input-field"
              value={form.whatsapp ?? ''}
              onChange={(e) => setForm((m) => ({ ...m, whatsapp: e.target.value }))}
            />
          </div>

          <button onClick={handleSave} className="btn-primary w-full">
            {editing ? 'حفظ التعديل' : 'إضافة المسؤول'}
          </button>
        </div>

        <div className="space-y-3">
          {siteData.managers.map((manager) => (
            <div key={manager.id} className="card p-5">
              <h3 className="font-semibold text-gray-800 dark:text-gray-100">
                {manager.name.ar}
              </h3>
              <p className="text-sm text-primary-600 dark:text-primary-400">{manager.role.ar}</p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{manager.phone}</p>
              {manager.whatsapp && (
                <p className="text-sm text-[#25D366]">WhatsApp: {manager.whatsapp}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => startEdit(manager)}
                  className="text-sm text-primary-600 hover:underline dark:text-primary-400"
                >
                  تعديل
                </button>
                <button
                  onClick={() => handleDelete(manager.id)}
                  className="text-sm text-red-600 hover:underline dark:text-red-400"
                >
                  حذف
                </button>
              </div>
            </div>
          ))}

          {siteData.managers.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400">لا يوجد مسؤولين في فريق العمل</p>
          )}
        </div>
      </div>
    </div>
  )
}
