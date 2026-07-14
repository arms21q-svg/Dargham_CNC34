'use client'

import ProductCard from '../components/ProductCard'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'

export default function WorksPage() {
  const { t } = useApp()
  const { siteData } = useSiteData()
  const products = siteData.products

  return (
    <div className="section-padding">
      <div className="container-main">
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold text-gray-800 dark:text-gray-100">
            {t.works.title}
          </h1>
          <p className="mx-auto max-w-2xl text-gray-500 dark:text-gray-400">
            {t.works.subtitle}
          </p>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-primary-500" />
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {t.works.allWorks}
          </h2>
        </div>

        {products.length === 0 ? (
          <p className="py-16 text-center text-gray-500 dark:text-gray-400">{t.works.noResults}</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
