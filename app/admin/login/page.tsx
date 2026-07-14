import type { Metadata } from 'next'
import AdminLogin from '@/views/admin/AdminLogin'

export const metadata: Metadata = {
  title: 'تسجيل الدخول',
  robots: { index: false, follow: false },
}

export default function Page() {
  return <AdminLogin />
}
