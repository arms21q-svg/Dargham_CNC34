'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useSiteData } from '../../context/SiteDataContext'

const links = [
  { to: '/admin', label: 'لوحة الإحصائيات', end: true },
  { to: '/admin/home', label: 'الصفحة الرئيسية' },
  { to: '/admin/works', label: 'إدارة الأعمال' },
  { to: '/admin/social', label: 'مواقع التواصل' },
  { to: '/admin/account', label: 'حساب المدير' },
]

export default function AdminSidebar() {
  const { logout } = useSiteData()
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = () => {
    logout()
    router.push('/admin/login')
  }

  const isActive = (to: string, end?: boolean) => {
    if (end) return pathname === to
    return pathname === to || pathname.startsWith(`${to}/`)
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-gray-200 bg-white md:w-60 md:border-b-0 md:border-e dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 p-4 dark:border-gray-800 md:p-5">
        <h1 className="text-lg font-bold text-primary-700 dark:text-primary-300">لوحة التحكم</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">ضرغام CNC</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto p-2 md:flex-col md:gap-1 md:overflow-visible md:p-3">
        {links.map((link) => (
          <Link
            key={link.to}
            href={link.to}
            className={`whitespace-nowrap rounded-xl px-3 py-2.5 text-sm font-medium transition-colors md:px-4 md:py-3 ${
              isActive(link.to, link.end)
                ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto hidden border-t border-gray-200 p-3 dark:border-gray-800 md:block">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 block rounded-xl px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          عرض الموقع
        </a>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full rounded-xl px-4 py-3 text-start text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}
