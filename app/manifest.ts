import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ضرغام CNC | Dorgham CNC',
    short_name: 'Dorgham CNC',
    description: 'تصاميم خشبية فاخرة بتقنية CNC في العراق',
    start_url: '/',
    display: 'standalone',
    background_color: '#faf9f7',
    theme_color: '#448d6f',
    lang: 'ar',
    dir: 'rtl',
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
