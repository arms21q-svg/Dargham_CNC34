'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSiteData } from '../../context/SiteDataContext'
import AdminAccountSettings from '../../components/admin/AdminAccountSettings'

export default function AdminEmployees() {
  const { isSuperAdmin, loading } = useSiteData()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !isSuperAdmin) {
      router.replace('/admin')
    }
  }, [isSuperAdmin, loading, router])

  if (loading || !isSuperAdmin) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">إدارة الموظفين</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          إنشاء وإدارة حسابات دخول الموظفين — متاح للمدير الرئيسي فقط
        </p>
      </div>

      <AdminAccountSettings />
    </div>
  )
}
