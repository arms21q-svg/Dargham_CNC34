import type { Metadata } from 'next'
import { Suspense } from 'react'
import AdminLogin from '@/views/admin/AdminLogin'
import { buildPageMetadata } from '@/lib/seo'
import { DEFAULT_ADMIN_EMAIL } from '@/data/defaultSiteData'
import { prisma } from '@server/db'

export const metadata: Metadata = {
  ...buildPageMetadata({
    path: '/admin/login',
    title: 'تسجيل الدخول',
    description: 'تسجيل الدخول إلى لوحة تحكم ضرغام CNC.',
    noIndex: true,
  }),
}

export const dynamic = 'force-dynamic'

async function loadLoginHints() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return { superEmail: DEFAULT_ADMIN_EMAIL, usernames: [] as string[] }
  }

  try {
    const [config, users] = await Promise.all([
      prisma.siteConfig.findUnique({ where: { id: 1 }, select: { adminEmail: true } }),
      prisma.adminUser.findMany({
        where: { status: 'active', role: { not: 'super' } },
        select: { username: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    return {
      superEmail: config?.adminEmail?.trim() || DEFAULT_ADMIN_EMAIL,
      usernames: users
        .map((u) => u.username?.trim())
        .filter((name): name is string => Boolean(name)),
    }
  } catch {
    return { superEmail: DEFAULT_ADMIN_EMAIL, usernames: [] as string[] }
  }
}

export default async function Page() {
  const hints = await loadLoginHints()

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      }
    >
      <AdminLogin superEmail={hints.superEmail} employeeUsernames={hints.usernames} />
    </Suspense>
  )
}
