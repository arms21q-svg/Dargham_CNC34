'use client'

export default function AdminDashboard() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">مرحباً بك</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">
          اختر قسماً من القائمة الجانبية لإدارة محتوى موقع ضرغام CNC
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <li>• الصفحة الرئيسية — العنوان والوصف وصور السلايدر</li>
          <li>• أعمالنا — إضافة وتعديل وحذف الأعمال</li>
          <li>• روابط التواصل — واتساب وفيسبوك والموقع</li>
          <li>• فريق العمل — أسماء وأرقام صفحة اتصل بنا</li>
        </ul>
      </div>
    </div>
  )
}
