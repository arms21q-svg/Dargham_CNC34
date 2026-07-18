/** Public site routes shown in nav, footer, and SEO. */
export const PUBLIC_PAGES = [
  { path: '/', navKey: 'home' as const },
  { path: '/works', navKey: 'works' as const },
  { path: '/contact', navKey: 'contact' as const },
  { path: '/saved', navKey: 'saved' as const },
] as const
