/** Public site routes shown in nav, footer, and SEO. */
export const PUBLIC_PAGES = [
  { path: '/', navKey: 'home' as const },
  { path: '/works', navKey: 'works' as const },
  { path: '/works/all', navKey: 'allWorks' as const },
  { path: '/about', navKey: 'about' as const },
  { path: '/faq', navKey: 'faq' as const },
  { path: '/contact', navKey: 'contact' as const },
  { path: '/saved', navKey: 'saved' as const },
] as const
