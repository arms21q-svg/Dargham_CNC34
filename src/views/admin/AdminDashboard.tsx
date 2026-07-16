'use client'

import Link from 'next/link'
import { useSiteData } from '../../context/SiteDataContext'
import AdminSaveBar from '../../components/admin/AdminSaveBar'
import AdminAccountSettings from '../../components/admin/AdminAccountSettings'

const cards = [
  { to: '/admin/home', title: 'الصفحة الرئيسية', desc: 'العنوان والوصف وصور السلايدر', icon: '🏠' },
  { to: '/admin/about', title: 'من نحن', desc: 'القصة والمهمة والرؤية والإحصائيات', icon: '📖' },
  { to: '/admin/works', title: 'أعمالنا', desc: 'إضافة وتعديل وحذف الأعمال', icon: '🪵' },
  { to: '/admin/contact', title: 'روابط التواصل', desc: 'واتساب، فيسبوك، الموقع', icon: '📞' },
  { to: '/admin/managers', title: 'حسابات المستخدمين', desc: 'إنشاء حساب بريد + كلمة سر عشوائية', icon: '👥' },
]

export default function AdminDashboard() {
  const { siteData } = useSiteData()

  return (
    <div>
      <AdminSaveBar />

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">مرحباً بك</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">إدارة محتوى موقع ضرغام CNC</p>
      </div>

      <div className="mb-8 grid gap-4 lg:grid-cols-3">
        <AdminAccountSettings compact />
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-2">
          <div className="card p-5">
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {siteData.products.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">عمل</p>
          </div>
          <div className="card p-5">
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {siteData.products.filter((p) => p.featured).length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">عمل مميز</p>
          </div>
          <div className="card p-5">
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {siteData.managers.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">مسؤول</p>
          </div>
          <div className="card p-5">
            <p className="text-3xl font-bold text-primary-600 dark:text-primary-400">
              {siteData.home.slideImages.length}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">صورة سلايدر</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.to}
            href={card.to}
            className="card-hover flex items-start gap-4 p-6"
          >
            <span className="text-3xl">{card.icon}</span>
            <div>
              <h2 className="font-semibold text-gray-800 dark:text-gray-100">{card.title}</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{card.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
