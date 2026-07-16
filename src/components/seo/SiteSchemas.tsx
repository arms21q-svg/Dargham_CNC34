import JsonLd from '@/components/seo/JsonLd'
import { createDefaultSiteData } from '@/data/defaultSiteData'
import {
  localBusinessSchema,
  organizationSchema,
  websiteSchema,
} from '@/lib/seo'

/**
 * Static JSON-LD only — no DB calls during SSG/build
 * (avoids Prisma connection errors when Supabase is unreachable locally).
 */
export default function SiteSchemas() {
  const defaults = createDefaultSiteData()
  const { whatsapp, mapsUrl, address } = defaults.contact

  return (
    <JsonLd
      data={[
        organizationSchema(),
        websiteSchema(),
        localBusinessSchema({
          phone: whatsapp,
          addressAr: address.ar,
          mapsUrl,
        }),
      ]}
    />
  )
}
