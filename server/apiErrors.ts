/** Generic production-safe API error (details logged server-side only). */
export function publicApiError(fallback = 'حدث خطأ في السيرفر'): string {
  return fallback
}
