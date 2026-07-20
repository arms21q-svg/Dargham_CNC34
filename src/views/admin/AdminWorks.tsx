'use client'

import { useState } from 'react'
import type { Category, Product } from '../../types/siteData'
import { categoryLabels } from '../../data/content'
import { useSiteData } from '../../context/SiteDataContext'
import AdminSaveBar from '../../components/admin/AdminSaveBar'
import GalleryPicker from '../../components/admin/GalleryPicker'

const emptyProduct = (): Product => ({
  id: crypto.randomUUID(),
  title: { ar: '', en: '' },
  description: { ar: '', en: '' },
  category: 'wallArt',
  image: '',
  images: [],
  materials: { ar: '', en: '' },
  dimensions: { ar: '', en: '' },
  featured: false,
  published: true,
  colors: ['#8B4513'],
})

export default function AdminWorks() {
  const { siteData, loading, updateProducts, addProduct, updateProduct, deleteProduct } =
    useSiteData()
  const [editing, setEditing] = useState<Product | null>(null)
  const [form, setForm] = useState<Product>(emptyProduct())

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  const products = siteData.products

  const startAdd = () => {
    setEditing(null)
    setForm(emptyProduct())
  }

  const startEdit = (product: Product) => {
    setEditing(product)
    setForm({
      ...product,
      images:
        Array.isArray(product.images) && product.images.length > 0
          ? product.images
          : product.image
            ? [product.image]
            : [],
      published: product.published !== false,
    })
  }

  const saveForm = () => {
    if (!form.title.ar.trim() && !form.title.en.trim()) return
    const gallery =
      Array.isArray(form.images) && form.images.length > 0
        ? form.images
        : form.image
          ? [form.image]
          : []
    const payload: Product = {
      ...form,
      image: form.image || gallery[0] || '',
      images: gallery,
      published: form.published !== false,
    }
    if (editing) updateProduct(payload)
    else addProduct(payload)
    setEditing(null)
    setForm(emptyProduct())
  }

  const move = (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= products.length) return
    const copy = [...products]
    const [item] = copy.splice(index, 1)
    copy.splice(next, 0, item)
    updateProducts(copy)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">إدارة الأعمال</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            إضافة وتعديل وترتيب وإظهار/إخفاء الأعمال
          </p>
        </div>
        <button type="button" onClick={startAdd} className="btn-primary">
          عمل جديد
        </button>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
        <h2 className="mb-4 text-lg font-semibold text-gray-800 dark:text-gray-100">
          {editing ? 'تعديل عمل' : 'إضافة عمل'}
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="form-label">العنوان (عربي)</label>
            <input
              className="input-field"
              value={form.title.ar}
              onChange={(e) => setForm({ ...form, title: { ...form.title, ar: e.target.value } })}
            />
          </div>
          <div>
            <label className="form-label">العنوان (إنجليزي)</label>
            <input
              className="input-field"
              value={form.title.en}
              onChange={(e) => setForm({ ...form, title: { ...form.title, en: e.target.value } })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="form-label">الوصف (عربي)</label>
            <textarea
              className="input-field min-h-[88px]"
              value={form.description.ar}
              onChange={(e) =>
                setForm({ ...form, description: { ...form.description, ar: e.target.value } })
              }
            />
          </div>
          <div>
            <label className="form-label">التصنيف</label>
            <select
              className="input-field"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value as Category })}
            >
              {(Object.keys(categoryLabels.ar) as Category[]).map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabels.ar[cat]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">المواد (عربي)</label>
            <input
              className="input-field"
              value={form.materials.ar}
              onChange={(e) =>
                setForm({ ...form, materials: { ...form.materials, ar: e.target.value } })
              }
            />
          </div>
          <div>
            <label className="form-label">الأبعاد (عربي)</label>
            <input
              className="input-field"
              value={form.dimensions.ar}
              onChange={(e) =>
                setForm({ ...form, dimensions: { ...form.dimensions, ar: e.target.value } })
              }
            />
          </div>
        </div>

        <div className="mt-4">
          <GalleryPicker
            images={form.images ?? []}
            primary={form.image}
            onChange={(images, primary) => setForm({ ...form, images, image: primary })}
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm({ ...form, featured: e.target.checked })}
            />
            عمل مميز
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.published !== false}
              onChange={(e) => setForm({ ...form, published: e.target.checked })}
            />
            ظاهر على الموقع
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button type="button" onClick={saveForm} className="btn-primary">
            {editing ? 'حفظ التعديل' : 'إضافة'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null)
                setForm(emptyProduct())
              }}
              className="btn-secondary"
            >
              إلغاء
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {products.map((product, index) => (
          <div
            key={product.id}
            className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 sm:flex-row sm:items-center"
          >
            <img
              src={product.image || '/logo.png'}
              alt=""
              className="h-20 w-20 shrink-0 rounded-xl object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-900 dark:text-gray-100">
                {product.title.ar || product.title.en || 'بدون عنوان'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {product.published === false ? 'مخفي' : 'ظاهر'}
                {product.featured ? ' · مميز' : ''}
                {` · ${(product.images?.length || (product.image ? 1 : 0))} صور`}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={() => move(index, -1)}>
                ↑
              </button>
              <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={() => move(index, 1)}>
                ↓
              </button>
              <button
                type="button"
                className="btn-secondary !px-3 !py-2 text-xs"
                onClick={() =>
                  updateProduct({ ...product, published: product.published === false })
                }
              >
                {product.published === false ? 'إظهار' : 'إخفاء'}
              </button>
              <button type="button" className="btn-secondary !px-3 !py-2 text-xs" onClick={() => startEdit(product)}>
                تعديل
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400"
                onClick={() => {
                  if (confirm('حذف هذا العمل؟')) deleteProduct(product.id)
                }}
              >
                حذف
              </button>
            </div>
          </div>
        ))}
      </div>

      <AdminSaveBar />
    </div>
  )
}
