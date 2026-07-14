import type { Metadata } from 'next'
import SavedPage from '@/views/SavedPage'

export const metadata: Metadata = {
  title: 'المحفوظات',
  description: 'الأعمال التي حفظتها من معرض ضرغام CNC.',
}

export default function Page() {
  return <SavedPage />
}
