import { Navigate, Outlet } from 'react-router-dom'
import { useSiteData } from '../../context/SiteDataContext'
import AdminSidebar from './AdminSidebar'

export default function AdminLayout() {
  const { isAdmin } = useSiteData()

  if (!isAdmin) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
      <AdminSidebar />
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
