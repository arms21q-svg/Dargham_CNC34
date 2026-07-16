import type { Metadata } from 'next'
import { Suspense } from 'react'
import AdminLogin from '@/views/admin/AdminLogin'
import { buildPageMetadata } from '@/lib/seo'

export const metadata: Metadata = {
  ...buildPageMetadata({
    path: '/admin/login',
    title: 'تسجيل الدخول',
    description: 'تسجيل الدخول إلى لوحة تحكم ضرغام CNC.',
    noIndex: true,
  }),
}

export default function Page() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      }
    >
      <AdminLogin />
    </Suspense>
  )
}
