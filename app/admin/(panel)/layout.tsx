import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import AdminLayout from '@/views/admin/AdminLayout'

export const metadata: Metadata = {
  title: 'لوحة التحكم',
  robots: { index: false, follow: false },
}

export default function Layout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
