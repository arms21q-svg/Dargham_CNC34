'use client'

import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'
import OptimizedImage from '../components/OptimizedImage'
import { createDefaultAboutSettings, DEFAULT_ABOUT_IMAGE } from '../data/defaultSiteData'

export default function AboutPage() {
  const { lang } = useApp()
  const { siteData } = useSiteData()
  const about = siteData.about ?? createDefaultAboutSettings()
  const image = about.image?.trim() || DEFAULT_ABOUT_IMAGE

  return (
    <div className="section-padding">
      <div className="container-main">
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold text-gray-800 dark:text-gray-100">
            {about.title[lang]}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{about.subtitle[lang]}</p>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-primary-500" />
        </div>

        <div className="mb-16 grid gap-8 lg:grid-cols-2">
          <div className="card p-8">
            <h2 className="mb-4 text-2xl font-bold text-primary-700 dark:text-primary-300">
              {about.story[lang]}
            </h2>
            <p className="leading-relaxed text-gray-600 dark:text-gray-400">
              {about.storyText[lang]}
            </p>
          </div>
          <div className="overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800">
            <OptimizedImage
              src={image}
              alt={about.title[lang]}
              width={800}
              height={600}
              widths={[480, 640, 800]}
              sizes="(max-width: 1024px) 100vw, 50vw"
              className="h-full min-h-[280px] w-full object-cover"
            />
          </div>
        </div>

        <div className="mb-16 grid gap-8 md:grid-cols-2">
          <div className="card p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-800 dark:text-gray-100">
              {about.mission[lang]}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">{about.missionText[lang]}</p>
          </div>

          <div className="card p-8">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent-warm/20 text-accent-warm">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <h3 className="mb-3 text-xl font-bold text-gray-800 dark:text-gray-100">
              {about.vision[lang]}
            </h3>
            <p className="text-gray-600 dark:text-gray-400">{about.visionText[lang]}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
          {about.stats.map((stat, i) => (
            <div key={i} className="card p-6 text-center">
              <div className="mb-2 text-3xl font-bold text-primary-600 dark:text-primary-400">
                {stat.value}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label[lang]}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
