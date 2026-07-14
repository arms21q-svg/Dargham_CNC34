import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import Providers from '@/components/Providers'
import './globals.css'

import '@fontsource/tajawal/arabic-400.css'
import '@fontsource/tajawal/arabic-500.css'
import '@fontsource/tajawal/arabic-700.css'
import '@fontsource/tajawal/latin-400.css'
import '@fontsource/tajawal/latin-700.css'
import '@fontsource/inter/latin-400.css'
import '@fontsource/inter/latin-600.css'

const siteUrl = 'https://www.dhirghamcnc.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'ضرغام CNC | Dorgham CNC',
    template: '%s | ضرغام CNC',
  },
  description:
    'ضرغام CNC — تصاميم خشبية فاخرة بتقنية CNC في العراق. جداريات، أبواب، وديكور مخصص.',
  applicationName: 'Dorgham CNC',
  keywords: [
    'ضرغام CNC',
    'Dorgham CNC',
    'CNC Iraq',
    'أعمال خشبية',
    'جداريات',
    'أبواب CNC',
  ],
  authors: [{ name: 'Dorgham CNC' }],
  creator: 'Dorgham CNC',
  openGraph: {
    type: 'website',
    locale: 'ar_IQ',
    alternateLocale: ['en_US'],
    url: siteUrl,
    siteName: 'ضرغام CNC',
    title: 'ضرغام CNC | Dorgham CNC',
    description:
      'تصاميم خشبية فاخرة بتقنية CNC في العراق. جداريات، أبواب، وديكور مخصص.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ضرغام CNC | Dorgham CNC',
    description:
      'تصاميم خشبية فاخرة بتقنية CNC في العراق. جداريات، أبواب، وديكور مخصص.',
  },
  icons: {
    icon: '/favicon.svg',
  },
  robots: {
    index: true,
    follow: true,
  },
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
