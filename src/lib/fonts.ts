import { Inter, Tajawal } from 'next/font/google'

export const tajawal = Tajawal({
  subsets: ['arabic', 'latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  variable: '--font-tajawal',
})

export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '600'],
  display: 'swap',
  variable: '--font-inter',
})
