import FAQList from '../components/FAQList'
import { useApp } from '../context/AppContext'

export default function FAQPage() {
  const { t } = useApp()

  return (
    <div className="section-padding">
      <div className="container-main mx-auto max-w-3xl">
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold text-gray-800 dark:text-gray-100">
            {t.faq.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{t.faq.subtitle}</p>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-primary-500" />
        </div>

        <FAQList />
      </div>
    </div>
  )
}
