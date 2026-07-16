import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import AdminLayout from '@/views/admin/AdminLayout'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = buildPageMetadata({
  path: '/admin',
  title: 'لوحة التحكم',
  description: 'لوحة تحكم موقع ضرغام CNC.',
  noIndex: true,
})

export default function Layout({ children }: { children: ReactNode }) {
  return <AdminLayout>{children}</AdminLayout>
}
