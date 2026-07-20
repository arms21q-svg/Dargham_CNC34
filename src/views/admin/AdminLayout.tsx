'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useSiteData } from '../../context/SiteDataContext'
import { hasPublishSession, isVercelHost } from '../../utils/siteDataStorage'
import AdminSidebar from './AdminSidebar'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAdmin, logout } = useSiteData()
  const router = useRouter()

  useEffect(() => {
    if (!isAdmin) {
      router.replace('/admin/login')
    }
  }, [isAdmin, router])

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  const needsApiSession = isVercelHost() && !hasPublishSession()

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-950 md:flex-row">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        {needsApiSession && (
          <div className="mb-4 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-100 dark:ring-amber-800">
            <p className="font-medium">يلزم إعادة تسجيل الدخول للنشر على الموقع</p>
            <p className="mt-1 opacity-90">
              جلستك الحالية محلية فقط ولن تُحفظ التغييرات على السيرفر.
            </p>
            <button
              type="button"
              onClick={() => {
                logout()
                window.location.assign('/admin/login')
              }}
              className="mt-3 rounded-xl bg-amber-600 px-4 py-2 text-white hover:bg-amber-700"
            >
              تسجيل الخروج والدخول من جديد
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  )
}
