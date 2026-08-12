import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Providers from '@/components/Providers'
import {
  absoluteUrl,
  DEFAULT_OG_IMAGE,
  SITE_NAME_AR,
  SITE_NAME_EN,
  SITE_URL,
} from '@/lib/seo'
import { tajawal, inter } from '@/lib/fonts'
import { getPublicSiteBootstrap } from '@server/publicSiteBootstrap'
import { optimizeImageUrl } from '@/utils/images'
import './globals.css'

/** ISR for public HTML — admin routes override with force-dynamic. */
export const revalidate = 120

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
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', type: 'image/png', sizes: '512x512' },
      { url: '/favicon-16.png', type: 'image/png', sizes: '16x16' },
      { url: '/favicon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/favicon-48.png', type: 'image/png', sizes: '48x48' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', type: 'image/png', sizes: '180x180' },
      { url: '/apple-icon.png', type: 'image/png', sizes: '180x180' },
    ],
    shortcut: [{ url: '/favicon.ico' }],
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

function heroPreloadHref(src: string): string {
  const resolved = src.startsWith('http') ? src : absoluteUrl(src)
  return optimizeImageUrl(resolved, { width: 900, quality: 78 })
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const bootstrap = await getPublicSiteBootstrap()
  const heroSrc = bootstrap?.home?.slideImages?.[0]

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={`${tajawal.variable} ${inter.variable}`}>
      <head>
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="preconnect" href="https://images.unsplash.com" crossOrigin="anonymous" />
        <link rel="preconnect" href={absoluteUrl('/')} />
        {heroSrc ? (
          <link rel="preload" as="image" href={heroPreloadHref(heroSrc)} fetchPriority="high" />
        ) : null}
        <Script id="theme-init" strategy="beforeInteractive">
          {themeScript}
        </Script>
      </head>
      <body className="min-h-screen antialiased">
        <Providers initialSiteData={bootstrap}>{children}</Providers>
        {process.env.NODE_ENV === 'production' ? (
          <>
            <Analytics />
            <SpeedInsights />
          </>
        ) : null}
      </body>
    </html>
  )
}
