/**
 * Invalidate Next.js caches after admin publish so Vercel serves fresh HTML/RSC.
 */
export async function revalidatePublishedSite() {
  try {
    const { revalidateTag, revalidatePath } = await import('next/cache')

    revalidateTag('products', 'max')
    revalidateTag('site-data', 'max')

    revalidatePath('/', 'layout')
    revalidatePath('/works')
    revalidatePath('/works/[id]', 'page')
    revalidatePath('/categories')
    revalidatePath('/categories/[slug]', 'page')
    revalidatePath('/contact')
    revalidatePath('/sitemap.xml')
  } catch (err) {
    console.warn('site cache revalidation skipped', err)
  }
}
