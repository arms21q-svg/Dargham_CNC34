import { Link } from 'react-router-dom'
import ProductCard from '../components/ProductCard'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'

export default function WorksPage() {
  const { t } = useApp()
  const { siteData } = useSiteData()
  const featured = siteData.products.filter((p) => p.featured)
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

        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
            {t.works.featured}
          </h2>
          <Link to="/works/all" className="btn-primary">
            {t.works.allWorks} →
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  )
}
