import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import Providers from '@/components/Providers'
import {
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  SITE_NAME_AR,
  SITE_NAME_EN,
  SITE_URL,
} from '@/lib/seo'
import './globals.css'

import '@fontsource/tajawal/arabic-400.css'
import '@fontsource/tajawal/arabic-500.css'
import '@fontsource/tajawal/arabic-700.css'
import '@fontsource/tajawal/latin-400.css'
import '@fontsource/tajawal/latin-700.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-600.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME_AR} | ${SITE_NAME_EN}`,
    template: `%s | ${SITE_NAME_AR}`,
  },
  description:
    'ضرغام CNC — تصاميم خشبية فاخرة بتقنية CNC في العراق. جداريات، أبواب، وديكور مخصص.',
  applicationName: SITE_NAME_EN,
  keywords: [
    'ضرغام CNC',
    'Dorgham CNC',
    'CNC Iraq',
    'أعمال خشبية',
    'جداريات',
    'أبواب CNC',
    'ديكور خشبي',
    'CNC بغداد',
  ],
  authors: [{ name: SITE_NAME_AR }],
  creator: SITE_NAME_AR,
  alternates: {
    canonical: SITE_URL,
    languages: {
      'ar-IQ': SITE_URL,
      en: SITE_URL,
      'x-default': SITE_URL,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ar_IQ',
    alternateLocale: ['en_US'],
    url: SITE_URL,
    siteName: SITE_NAME_AR,
    title: `${SITE_NAME_AR} | ${SITE_NAME_EN}`,
    description:
      'تصاميم خشبية فاخرة بتقنية CNC في العراق. جداريات، أبواب، وديكور مخصص.',
    images: [
      {
        url: DEFAULT_OG_IMAGE,
        width: 1200,
        height: 630,
        alt: SITE_NAME_AR,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME_AR} | ${SITE_NAME_EN}`,
    description:
      'تصاميم خشبية فاخرة بتقنية CNC في العراق. جداريات، أبواب، وديكور مخصص.',
    images: [DEFAULT_OG_IMAGE],
  },
  icons: {
    icon: '/favicon.svg',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  category: 'business',
}

export const viewport: Viewport = {
  themeColor: '#448d6f',
  colorScheme: 'light dark',
  width: 'device-width',
  initialScale: 1,
}

const themeScript = `(function(){try{var theme=localStorage.getItem('dorgham-cnc-theme');var isDark=theme==='dark'||(theme!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',isDark);document.documentElement.style.colorScheme=isDark?'dark':'light';}catch(e){}})();`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://generativelanguage.googleapis.com" />
        <link rel="preconnect" href={absoluteUrl('/')} />
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
