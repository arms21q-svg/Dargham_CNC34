import { NavLink, useNavigate } from 'react-router-dom'
import { useSiteData } from '../../context/SiteDataContext'

const links = [
  { to: '/admin', label: 'الرئيسية', end: true },
  { to: '/admin/home', label: 'الصفحة الرئيسية' },
  { to: '/admin/works', label: 'أعمالنا' },
  { to: '/admin/contact', label: 'روابط التواصل' },
  { to: '/admin/managers', label: 'المسؤولين' },
]

export default function AdminSidebar() {
  const { logout } = useSiteData()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/admin/login')
  }

  return (
    <aside className="w-64 shrink-0 border-e border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="border-b border-gray-200 p-5 dark:border-gray-800">
        <h1 className="text-lg font-bold text-primary-700 dark:text-primary-300">لوحة التحكم</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">ضرغام CNC</p>
      </div>

      <nav className="flex flex-col gap-1 p-3">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) =>
              `rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
              }`
            }
          >
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-gray-200 p-3 dark:border-gray-800">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="mb-2 block rounded-xl px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          عرض الموقع
        </a>
        <button
          onClick={handleLogout}
          className="w-full rounded-xl px-4 py-3 text-start text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
        >
          تسجيل الخروج
        </button>
      </div>
    </aside>
  )
}
