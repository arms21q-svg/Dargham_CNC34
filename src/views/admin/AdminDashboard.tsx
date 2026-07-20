'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useSiteData } from '../../context/SiteDataContext'

export default function AdminDashboard() {
  const { siteData, loading } = useSiteData()

  const stats = useMemo(() => {
    const products = siteData.products
    const imageCount = products.reduce((sum, p) => {
      const n = Array.isArray(p.images) && p.images.length > 0 ? p.images.length : p.image ? 1 : 0
      return sum + n
    }, 0)
    const published = products.filter((p) => p.published !== false).length
    const hidden = products.length - published
    const featured = products.filter((p) => p.featured).length
    const updatedAt = siteData.updatedAt
      ? new Date(siteData.updatedAt).toLocaleString('ar-IQ')
      : '—'

    return { total: products.length, imageCount, published, hidden, featured, updatedAt }
  }, [siteData.products, siteData.updatedAt])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  const cards = [
    { label: 'إجمالي الأعمال', value: String(stats.total) },
    { label: 'عدد الصور', value: String(stats.imageCount) },
    { label: 'منشورة', value: String(stats.published) },
    { label: 'مخفية', value: String(stats.hidden) },
    { label: 'مميزة', value: String(stats.featured) },
    { label: 'آخر تحديث', value: stats.updatedAt },
  ]

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">الرئيسية</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">نظرة سريعة على حالة الموقع</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-900"
          >
            <p className="text-sm text-gray-500 dark:text-gray-400">{card.label}</p>
            <p className="mt-2 text-xl font-bold text-gray-900 dark:text-gray-100">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Link
          href="/admin/works"
          className="rounded-2xl bg-primary-600 px-4 py-4 text-center text-sm font-semibold text-white hover:bg-primary-700"
        >
          إدارة الأعمال
        </Link>
        <Link
          href="/admin/social"
          className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-center text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          مواقع التواصل
        </Link>
        <Link
          href="/admin/account"
          className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-center text-sm font-semibold text-gray-800 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          حساب المدير
        </Link>
      </div>
    </div>
  )
}
