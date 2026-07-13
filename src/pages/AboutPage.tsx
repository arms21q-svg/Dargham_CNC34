import { useApp } from '../context/AppContext'

export default function AboutPage() {
  const { t } = useApp()

  return (
    <div className="section-padding">
      <div className="container-main">
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold text-gray-800 dark:text-gray-100">
            {t.about.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{t.about.subtitle}</p>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-primary-500" />
        </div>

        <div className="mb-16 grid gap-8 lg:grid-cols-2">
          <div className="card p-8">
            <h2 className="mb-4 text-2xl font-bold text-primary-700 dark:text-primary-300">
              {t.about.story}
            </h2>
            <p className="leading-relaxed text-gray-600 dark:text-gray-400">
              {t.about.storyText}
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl">
            <img
              src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80"
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </div>
        </div>

        <div className="mb-16 grid gap-8 md:grid-cols-2">
          <div className="card p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-800 dark:text-gray-100">
              {t.about.mission}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">{t.about.missionText}</p>
          </div>

          <div className="card p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-warm/20 text-accent-warm">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-800 dark:text-gray-100">
              {t.about.vision}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">{t.about.visionText}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {t.about.stats.map((stat, i) => (
            <div key={i} className="card p-6 text-center">
              <div className="mb-2 text-3xl font-bold text-primary-600 dark:text-primary-400">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
