'use client'

import { useState } from 'react'
import type { Category, Product } from '../../types/siteData'
import { categoryLabels } from '../../data/content'
import { useSiteData } from '../../context/SiteDataContext'
import AdminSaveBar from '../../components/admin/AdminSaveBar'
import ImagePicker from '../../components/admin/ImagePicker'
const emptyProduct = (): Product => ({
  id: crypto.randomUUID(),
  title: { ar: '', en: '' },
  description: { ar: '', en: '' },
  category: 'wallArt',
  image: '',
  materials: { ar: '', en: '' },
  dimensions: { ar: '', en: '' },
  featured: false,
  colors: ['#8B4513'],
})

export default function AdminWorks() {
  const { siteData, loading, addProduct, updateProduct, deleteProduct } = useSiteData()
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<Product>(emptyProduct())

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  const startAdd = () => {
    setEditing(null)
    setForm(emptyProduct())
  }

  const startEdit = (product: Product) => {
    setEditing(product)
    setForm({ ...product })
  }

  const handleSave = () => {
    if (!form.title.ar || !form.image) {
      alert('يرجى إدخال العنوان بالعربي وإضافة صورة')
      return
    }
    if (editing) {
      updateProduct(form)
    } else {
      addProduct(form)
    }
    setForm(emptyProduct())
    setEditing(null)
    alert('تم حفظ العمل — اضغط «نشر على الموقع» أعلاه لحفظه بشكل دائم')
  }

  const handleDelete = (id: string) => {
    if (confirm('هل تريد حذف هذا العمل؟')) {
      deleteProduct(id)
      if (editing?.id === id) {
        setEditing(null)
        setForm(emptyProduct())
      }
    }
  }

  const categories = Object.keys(categoryLabels.ar) as Category[]

  return (
    <div>
      <AdminSaveBar />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">أعمالنا</h1>
        <button onClick={startAdd} className="btn-primary !px-4 !py-2 text-sm">
          + إضافة عمل
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 font-semibold">{editing ? 'تعديل عمل' : 'عمل جديد'}</h2>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">العنوان (عربي)</label>
                <input
                  className="input-field"
                  value={form.title.ar}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: { ...p.title, ar: e.target.value } }))
                  }
                />
              </div>
              <div>
                <label className="form-label">العنوان (English)</label>
                <input
                  className="input-field"
                  value={form.title.en}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, title: { ...p.title, en: e.target.value } }))
                  }
                />
              </div>
            </div>

            <ImagePicker
              value={form.image}
              onChange={(image) => setForm((p) => ({ ...p, image }))}
            />
            <div>
              <label className="form-label">التصنيف</label>
              <select
                className="input-field"
                value={form.category}
                onChange={(e) =>
                  setForm((p) => ({ ...p, category: e.target.value as Category }))
                }
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryLabels.ar[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="form-label">الخامات (عربي)</label>
                <input
                  className="input-field"
                  value={form.materials.ar}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      materials: { ...p.materials, ar: e.target.value },
                    }))
                  }
                />
              </div>
              <div>
                <label className="form-label">الأبعاد (عربي)</label>
                <input
                  className="input-field"
                  value={form.dimensions.ar}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      dimensions: { ...p.dimensions, ar: e.target.value },
                    }))
                  }
                />
              </div>
            </div>

            <div>
              <label className="form-label">الوصف (عربي)</label>
              <textarea
                className="input-field resize-none"
                rows={3}
                value={form.description.ar}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    description: { ...p.description, ar: e.target.value },
                  }))
                }
              />
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setForm((p) => ({ ...p, featured: e.target.checked }))}
                className="h-4 w-4 rounded"
              />
              <span className="text-sm font-medium">عمل مميز</span>
            </label>

            <button onClick={handleSave} className="btn-primary w-full">
              {editing ? 'حفظ التعديل' : 'إضافة العمل'}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {siteData.products.map((product) => (
            <div key={product.id} className="card flex gap-4 p-4">
              <img
                src={product.image}
                alt={product.title.ar}
                className="h-20 w-20 shrink-0 rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <h3 className="truncate font-semibold">{product.title.ar}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {categoryLabels.ar[product.category]}
                  {product.featured && ' • مميز'}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => startEdit(product)}
                    className="text-sm text-primary-600 hover:underline dark:text-primary-400"
                  >
                    تعديل
                  </button>
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="text-sm text-red-600 hover:underline dark:text-red-400"
                  >
                    حذف
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
