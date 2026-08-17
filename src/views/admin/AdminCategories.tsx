'use client'

import { useMemo, useState } from 'react'
import type { PortfolioCategory, Product, SiteData } from '../../types/siteData'
import { useSiteData } from '../../context/SiteDataContext'
import AdminSaveBar from '../../components/admin/AdminSaveBar'
import BulkWorksImport from '../../components/admin/BulkWorksImport'
import ImagePicker from '../../components/admin/ImagePicker'
import GalleryPicker from '../../components/admin/GalleryPicker'
import { nextDisplayNumber, productsInCategory, validateProductDisplayNumber } from '../../utils/categories'
import { slugify, uniqueSlug } from '../../utils/slug'

const emptyCategory = (taken: Set<string>): PortfolioCategory => ({
  id: crypto.randomUUID(),
  slug: uniqueSlug('category', taken),
  title: { ar: '', en: '' },
  description: { ar: '', en: '' },
  image: '',
  enabled: true,
  sortOrder: 0,
})

const emptyWork = (categoryId: string, displayNumber: number): Product => ({
  id: crypto.randomUUID(),
  categoryId,
  displayNumber,
  title: { ar: '', en: '' },
  image: '',
  images: [],
  published: true,
  colors: [],
})

export default function AdminCategories() {
  const {
    siteData,
    loading,
    updateCategories,
    addCategory,
    updateCategory,
    deleteCategory,
    addProduct,
    addProducts,
    updateProduct,
    deleteProduct,
    updateProducts,
    publish,
  } = useSiteData()

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<PortfolioCategory | null>(null)
  const [categoryForm, setCategoryForm] = useState<PortfolioCategory | null>(null)
  const [editingWork, setEditingWork] = useState<Product | null>(null)
  const [workForm, setWorkForm] = useState<Product | null>(null)
  const [workFormError, setWorkFormError] = useState('')
  const [bulkOpen, setBulkOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const [autoPublishOnSave, setAutoPublishOnSave] = useState(true)
  const [savingWork, setSavingWork] = useState(false)
  const [autoPublishMessage, setAutoPublishMessage] = useState('')
  const [workSearch, setWorkSearch] = useState('')
  const [selectedWorkIds, setSelectedWorkIds] = useState<Set<string>>(new Set())

  const categories = useMemo(
    () => [...(siteData.categories ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [siteData.categories]
  )

  const selected = categories.find((c) => c.id === selectedId) ?? categories[0] ?? null
  const works = useMemo(
    () => (selected ? productsInCategory(siteData.products, selected.id, false) : []),
    [selected, siteData.products]
  )

  const filteredWorks = useMemo(() => {
    const q = workSearch.trim().toLowerCase()
    if (!q) return works
    return works.filter((p) => {
      const ar = p.title.ar?.toLowerCase() ?? ''
      const en = p.title.en?.toLowerCase() ?? ''
      const num = String(p.displayNumber)
      return ar.includes(q) || en.includes(q) || num.includes(q)
    })
  }, [works, workSearch])

  const allFilteredSelected =
    filteredWorks.length > 0 && filteredWorks.every((p) => selectedWorkIds.has(p.id))

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  const takenSlugs = new Set(categories.map((c) => c.slug))

  const startAddCategory = () => {
    setEditingCategory(null)
    setCategoryForm(emptyCategory(takenSlugs))
    setSelectedId(null)
  }

  const startEditCategory = (category: PortfolioCategory) => {
    setEditingCategory(category)
    setCategoryForm({ ...category })
  }

  const saveCategoryForm = () => {
    if (!categoryForm) return
    if (!categoryForm.title.ar.trim() && !categoryForm.title.en.trim()) return
    const slug = categoryForm.slug.trim() || slugify(categoryForm.title.en || categoryForm.title.ar)
    const payload: PortfolioCategory = {
      ...categoryForm,
      slug: uniqueSlug(
        slug,
        new Set([...takenSlugs].filter((s) => s !== editingCategory?.slug))
      ),
      sortOrder: editingCategory?.sortOrder ?? categories.length,
    }
    if (editingCategory) updateCategory(payload)
    else addCategory(payload)
    setCategoryForm(null)
    setEditingCategory(null)
    setSelectedId(payload.id)
  }

  const moveCategory = (index: number, dir: -1 | 1) => {
    const next = index + dir
    if (next < 0 || next >= categories.length) return
    const copy = [...categories]
    const [item] = copy.splice(index, 1)
    copy.splice(next, 0, item)
    updateCategories(copy.map((c, i) => ({ ...c, sortOrder: i })))
  }

  const tryDeleteCategory = (id: string) => {
    const count = productsInCategory(siteData.products, id, false).length
    if (count > 0) {
      setDeleteError('احذف جميع الأعمال داخل التصنيف أولاً')
      return
    }
    setDeleteError('')
    if (!window.confirm('حذف هذا التصنيف؟')) return
    deleteCategory(id)
    if (selectedId === id) setSelectedId(null)
  }

  const startAddWork = () => {
    if (!selected) return
    setBulkOpen(false)
    setWorkFormError('')
    setEditingWork(null)
    setWorkForm(emptyWork(selected.id, nextDisplayNumber(siteData.products, selected.id)))
  }

  const startBulkAdd = () => {
    if (!selected) return
    setWorkForm(null)
    setEditingWork(null)
    setWorkFormError('')
    setBulkOpen(true)
  }

  const startEditWork = (product: Product) => {
    setBulkOpen(false)
    setWorkFormError('')
    setEditingWork(product)
    setWorkForm({
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

  const saveWorkForm = async () => {
    if (!workForm || !selected || savingWork) return
    if (!workForm.title.ar.trim() && !workForm.title.en.trim()) {
      setWorkFormError('أدخل اسم العمل (عربي أو إنجليزي)')
      return
    }

    const displayNumber = Math.max(1, workForm.displayNumber ?? 1)
    const numberError = validateProductDisplayNumber(
      siteData.products,
      selected.id,
      displayNumber,
      editingWork?.id ?? workForm.id
    )
    if (numberError) {
      setWorkFormError(numberError)
      return
    }

    const gallery =
      Array.isArray(workForm.images) && workForm.images.length > 0
        ? workForm.images
        : workForm.image
          ? [workForm.image]
          : []
    const payload: Product = {
      ...workForm,
      categoryId: selected.id,
      category: selected.slug as Product['category'],
      displayNumber,
      image: workForm.image || gallery[0] || '',
      images: gallery,
      published: workForm.published !== false,
      description:
        workForm.description?.ar?.trim() || workForm.description?.en?.trim()
          ? workForm.description
          : undefined,
    }

    const nextSiteData: SiteData = {
      ...siteData,
      products: editingWork
        ? siteData.products.map((p) => (p.id === payload.id ? payload : p))
        : [...siteData.products, payload],
    }

    if (editingWork) updateProduct(payload)
    else addProduct(payload)
    setWorkForm(null)
    setEditingWork(null)
    setWorkFormError('')

    if (autoPublishOnSave) {
      setSavingWork(true)
      setAutoPublishMessage('')
      const result = await publish(nextSiteData)
      setSavingWork(false)
      setAutoPublishMessage(result.ok ? '✓ تم حفظ العمل ونشره على الموقع' : `✗ ${result.message}`)
      setTimeout(() => setAutoPublishMessage(''), 6000)
    }
  }

  const saveBulkWorks = async (items: Product[]) => {
    if (savingWork) return
    const nextSiteData: SiteData = {
      ...siteData,
      products: [...siteData.products, ...items],
    }
    addProducts(items)
    setBulkOpen(false)
    setSelectedWorkIds(new Set())

    if (autoPublishOnSave) {
      setSavingWork(true)
      setAutoPublishMessage('')
      const result = await publish(nextSiteData)
      setSavingWork(false)
      setAutoPublishMessage(
        result.ok ? `✓ تم إضافة ${items.length} عمل ونشرها على الموقع` : `✗ ${result.message}`
      )
      setTimeout(() => setAutoPublishMessage(''), 6000)
    }
  }

  const toggleWorkSelection = (id: string) => {
    setSelectedWorkIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAllFiltered = () => {
    if (allFilteredSelected) {
      setSelectedWorkIds((prev) => {
        const next = new Set(prev)
        for (const p of filteredWorks) next.delete(p.id)
        return next
      })
    } else {
      setSelectedWorkIds((prev) => {
        const next = new Set(prev)
        for (const p of filteredWorks) next.add(p.id)
        return next
      })
    }
  }

  const applyBulkSiteChange = async (nextProducts: Product[], successMsg: string) => {
    if (savingWork || selectedWorkIds.size === 0) return
    const nextSiteData: SiteData = { ...siteData, products: nextProducts }
    updateProducts(nextProducts)
    setSelectedWorkIds(new Set())

    if (autoPublishOnSave) {
      setSavingWork(true)
      setAutoPublishMessage('')
      const result = await publish(nextSiteData)
      setSavingWork(false)
      setAutoPublishMessage(result.ok ? `✓ ${successMsg}` : `✗ ${result.message}`)
      setTimeout(() => setAutoPublishMessage(''), 6000)
    } else {
      setAutoPublishMessage(`✓ ${successMsg} — اضغط «نشر على الموقع»`)
      setTimeout(() => setAutoPublishMessage(''), 6000)
    }
  }

  const bulkDeleteWorks = async () => {
    if (selectedWorkIds.size === 0) return
    if (!window.confirm(`حذف ${selectedWorkIds.size} عمل؟`)) return
    const ids = selectedWorkIds
    const nextProducts = siteData.products.filter((p) => !ids.has(p.id))
    await applyBulkSiteChange(nextProducts, `تم حذف ${ids.size} أعمال`)
  }

  const bulkSetPublished = async (published: boolean) => {
    if (selectedWorkIds.size === 0) return
    const ids = selectedWorkIds
    const nextProducts = siteData.products.map((p) =>
      ids.has(p.id) ? { ...p, published } : p
    )
    await applyBulkSiteChange(
      nextProducts,
      published ? `تم نشر ${ids.size} أعمال` : `تم إخفاء ${ids.size} أعمال`
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">التصنيفات</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            إدارة التصنيفات والأعمال داخل كل تصنيف
          </p>
        </div>
        <button type="button" onClick={startAddCategory} className="btn-primary">
          + إضافة تصنيف
        </button>
      </div>

      {deleteError && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {deleteError}
        </p>
      )}

      {categoryForm && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5">
          <h2 className="mb-4 text-lg font-semibold">
            {editingCategory ? 'تعديل تصنيف' : 'إضافة تصنيف'}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="form-label">الاسم (عربي)</label>
              <input
                className="input-field"
                value={categoryForm.title.ar}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    title: { ...categoryForm.title, ar: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="form-label">الاسم (إنجليزي)</label>
              <input
                className="input-field"
                value={categoryForm.title.en}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    title: { ...categoryForm.title, en: e.target.value },
                  })
                }
              />
            </div>
            <div>
              <label className="form-label">الرابط (slug)</label>
              <input
                className="input-field"
                dir="ltr"
                value={categoryForm.slug}
                onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })}
                placeholder="doors"
              />
            </div>
            <div>
              <label className="form-label">الترتيب</label>
              <input
                type="number"
                className="input-field"
                value={categoryForm.sortOrder}
                onChange={(e) =>
                  setCategoryForm({ ...categoryForm, sortOrder: Number(e.target.value) || 0 })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <label className="form-label">الوصف (عربي — اختياري)</label>
              <textarea
                className="input-field min-h-[72px]"
                value={categoryForm.description?.ar ?? ''}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    description: { ar: e.target.value, en: categoryForm.description?.en ?? '' },
                  })
                }
              />
            </div>
            <div className="sm:col-span-2">
              <ImagePicker
                label="صورة التصنيف"
                value={categoryForm.image}
                onChange={(image) => setCategoryForm({ ...categoryForm, image })}
              />
            </div>
            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                id="cat-enabled"
                type="checkbox"
                checked={categoryForm.enabled !== false}
                onChange={(e) => setCategoryForm({ ...categoryForm, enabled: e.target.checked })}
              />
              <label htmlFor="cat-enabled" className="text-sm">
                التصنيف فعّال (يظهر في الموقع)
              </label>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={saveCategoryForm} className="btn-primary">
              حفظ التصنيف
            </button>
            <button
              type="button"
              onClick={() => {
                setCategoryForm(null)
                setEditingCategory(null)
              }}
              className="btn-secondary"
            >
              إلغاء
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          <h2 className="mb-3 font-semibold text-gray-800 dark:text-gray-100">قائمة التصنيفات</h2>
          <ul className="space-y-2">
            {categories.map((c, index) => (
              <li
                key={c.id}
                className={`rounded-xl border p-3 ${
                  selected?.id === c.id
                    ? 'border-primary-400 bg-primary-50/50 dark:border-primary-700 dark:bg-primary-950/30'
                    : 'border-gray-200 dark:border-gray-700'
                }`}
              >
                <button
                  type="button"
                  className="w-full text-start"
                  onClick={() => {
                    setSelectedId(c.id)
                    setWorkForm(null)
                    setEditingWork(null)
                    setBulkOpen(false)
                    setSelectedWorkIds(new Set())
                    setWorkSearch('')
                  }}
                >
                  <div className="font-medium text-gray-800 dark:text-gray-100">{c.title.ar || c.title.en}</div>
                  <div className="text-xs text-gray-500">/{c.slug}</div>
                </button>
                <div className="mt-2 flex flex-wrap gap-1">
                  <button type="button" className="text-xs text-primary-600" onClick={() => startEditCategory(c)}>
                    تعديل
                  </button>
                  <button type="button" className="text-xs text-red-600" onClick={() => tryDeleteCategory(c.id)}>
                    حذف
                  </button>
                  <button type="button" className="text-xs text-gray-500" onClick={() => moveCategory(index, -1)}>
                    ↑
                  </button>
                  <button type="button" className="text-xs text-gray-500" onClick={() => moveCategory(index, 1)}>
                    ↓
                  </button>
                  {!c.enabled && <span className="text-xs text-amber-600">مخفي</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
          {selected ? (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-semibold text-gray-800 dark:text-gray-100">
                  أعمال: {selected.title.ar || selected.title.en}
                </h2>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={startAddWork} className="btn-primary text-sm">
                    + إضافة عمل
                  </button>
                  <button type="button" onClick={startBulkAdd} className="btn-secondary text-sm">
                    + إضافة عدة أعمال
                  </button>
                </div>
              </div>

              {bulkOpen && (
                <BulkWorksImport
                  categoryId={selected.id}
                  categorySlug={selected.slug}
                  products={siteData.products}
                  saving={savingWork}
                  onSave={saveBulkWorks}
                  onCancel={() => setBulkOpen(false)}
                />
              )}

              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <input
                  className="input-field max-w-md"
                  placeholder="بحث بالاسم أو رقم العمل..."
                  value={workSearch}
                  onChange={(e) => setWorkSearch(e.target.value)}
                />
                {selectedWorkIds.size > 0 && (
                  <div className="flex flex-wrap gap-2">
                    <span className="self-center text-xs text-gray-500">
                      {selectedWorkIds.size} محدد
                    </span>
                    <button
                      type="button"
                      onClick={() => void bulkSetPublished(true)}
                      disabled={savingWork}
                      className="btn-secondary text-xs disabled:opacity-60"
                    >
                      نشر المحدد
                    </button>
                    <button
                      type="button"
                      onClick={() => void bulkSetPublished(false)}
                      disabled={savingWork}
                      className="btn-secondary text-xs disabled:opacity-60"
                    >
                      إخفاء المحدد
                    </button>
                    <button
                      type="button"
                      onClick={() => void bulkDeleteWorks()}
                      disabled={savingWork}
                      className="text-xs text-red-600 disabled:opacity-60"
                    >
                      حذف المحدد
                    </button>
                  </div>
                )}
              </div>

              {workForm && (
                <div className="mb-6 rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                  <h3 className="mb-3 font-medium">{editingWork ? 'تعديل عمل' : 'إضافة عمل'}</h3>
                  {workFormError && (
                    <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                      {workFormError}
                    </p>
                  )}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="form-label">رقم العمل</label>
                      <input
                        type="number"
                        min={1}
                        className="input-field"
                        value={workForm.displayNumber ?? 1}
                        onChange={(e) =>
                          setWorkForm({
                            ...workForm,
                            displayNumber: Math.max(1, Number(e.target.value) || 1),
                          })
                        }
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        تلقائي عند الإضافة — يمكنك تغييره (فريد داخل التصنيف)
                      </p>
                    </div>
                    <div>
                      <label className="form-label">الاسم (عربي)</label>
                      <input
                        className="input-field"
                        value={workForm.title.ar}
                        onChange={(e) =>
                          setWorkForm({ ...workForm, title: { ...workForm.title, ar: e.target.value } })
                        }
                      />
                    </div>
                    <div>
                      <label className="form-label">الاسم (إنجليزي)</label>
                      <input
                        className="input-field"
                        value={workForm.title.en}
                        onChange={(e) =>
                          setWorkForm({ ...workForm, title: { ...workForm.title, en: e.target.value } })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="form-label">الوصف (عربي — اختياري)</label>
                      <textarea
                        className="input-field min-h-[72px]"
                        value={workForm.description?.ar ?? ''}
                        onChange={(e) =>
                          setWorkForm({
                            ...workForm,
                            description: { ar: e.target.value, en: workForm.description?.en ?? '' },
                          })
                        }
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <GalleryPicker
                        images={workForm.images ?? []}
                        primary={workForm.image}
                        onChange={(images, primary) =>
                          setWorkForm({ ...workForm, images, image: primary })
                        }
                      />
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                      <input
                        id="work-published"
                        type="checkbox"
                        checked={workForm.published !== false}
                        onChange={(e) => setWorkForm({ ...workForm, published: e.target.checked })}
                      />
                      <label htmlFor="work-published" className="text-sm">
                        منشور (يظهر في الموقع)
                      </label>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => void saveWorkForm()}
                      disabled={savingWork}
                      className="btn-primary disabled:opacity-60"
                    >
                      {savingWork ? 'جاري الحفظ...' : autoPublishOnSave ? 'حفظ ونشر' : 'حفظ العمل'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWorkForm(null)
                        setEditingWork(null)
                        setWorkFormError('')
                      }}
                      className="btn-secondary"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              <ul className="space-y-2">
                {filteredWorks.length > 0 && (
                  <li className="flex items-center gap-2 rounded-xl border border-dashed border-gray-200 px-3 py-2 dark:border-gray-700">
                    <input
                      id="select-all-works"
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAllFiltered}
                    />
                    <label htmlFor="select-all-works" className="text-sm text-gray-600 dark:text-gray-400">
                      تحديد الكل ({filteredWorks.length})
                    </label>
                  </li>
                )}
                {filteredWorks.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2 dark:border-gray-700"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedWorkIds.has(p.id)}
                        onChange={() => toggleWorkSelection(p.id)}
                        aria-label={`تحديد ${p.title.ar || p.title.en}`}
                      />
                      {p.image && (
                        <img
                          src={p.image}
                          alt=""
                          className="h-10 w-10 shrink-0 rounded-lg object-cover"
                          loading="lazy"
                        />
                      )}
                      <div className="min-w-0">
                        <span className="me-2 inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded bg-primary-100 px-1 text-xs font-bold text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                          {p.displayNumber}
                        </span>
                        <span className="font-medium">{p.title.ar || p.title.en}</span>
                        {p.published === false && (
                          <span className="ms-2 text-xs text-amber-600">مخفي</span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button type="button" className="text-sm text-primary-600" onClick={() => startEditWork(p)}>
                        تعديل
                      </button>
                      <button
                        type="button"
                        className="text-sm text-red-600"
                        onClick={() => {
                          if (window.confirm('حذف هذا العمل؟')) deleteProduct(p.id)
                        }}
                      >
                        حذف
                      </button>
                    </div>
                  </li>
                ))}
                {filteredWorks.length === 0 && works.length > 0 && (
                  <p className="py-6 text-center text-sm text-gray-500">لا توجد نتائج للبحث</p>
                )}
                {works.length === 0 && (
                  <p className="py-6 text-center text-sm text-gray-500">لا توجد أعمال في هذا التصنيف</p>
                )}
              </ul>
            </>
          ) : (
            <p className="py-8 text-center text-gray-500">أضف تصنيفاً أو اختر تصنيفاً من القائمة</p>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={autoPublishOnSave}
            onChange={(e) => setAutoPublishOnSave(e.target.checked)}
          />
          نشر تلقائي على الموقع بعد حفظ الأعمال (موصى به)
        </label>
        {autoPublishMessage && (
          <p className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">{autoPublishMessage}</p>
        )}
      </div>

      <AdminSaveBar />
    </div>
  )
}
