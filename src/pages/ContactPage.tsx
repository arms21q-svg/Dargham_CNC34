import { useState, type FormEvent } from 'react'
import { useApp } from '../context/AppContext'
import { useSiteData } from '../context/SiteDataContext'
import SocialLinks from '../components/SocialLinks'
import { getContactFormWhatsAppUrl, getWhatsAppUrl } from '../utils/siteDataStorage'

const emptyForm = { name: '', email: '', phone: '', message: '' }

export default function ContactPage() {
  const { lang, t } = useApp()
  const { siteData } = useSiteData()
  const { contact, managers } = siteData
  const [form, setForm] = useState(emptyForm)
  const [sent, setSent] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()

    const url = getContactFormWhatsAppUrl(contact, lang, form)
    window.open(url, '_blank', 'noopener,noreferrer')
    setSent(true)
  }

  const handleReset = () => {
    setForm(emptyForm)
    setSent(false)
  }

  return (
    <div className="section-padding">
      <div className="container-main">
        <div className="mb-12 text-center">
          <h1 className="mb-3 text-4xl font-bold text-gray-800 dark:text-gray-100">
            {t.contact.title}
          </h1>
          <p className="text-gray-500 dark:text-gray-400">{t.contact.subtitle}</p>
          <p className="mt-2 text-sm text-[#25D366]">{t.contact.whatsappNote}</p>
          <div className="mx-auto mt-4 h-1 w-16 rounded-full bg-primary-500" />
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h3 className="mb-1 font-semibold">{contact.address[lang]}</h3>
              <a
                href={contact.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                {t.contact.openMaps}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>

            {managers.length > 0 && (
              <div className="card p-6">
                <h3 className="mb-4 font-semibold">
                  {lang === 'ar' ? 'المسؤولين' : 'Our Team'}
                </h3>
                <div className="space-y-4">
                  {managers.map((manager) => (
                    <div
                      key={manager.id}
                      className="rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50"
                    >
                      <h4 className="font-semibold text-gray-800 dark:text-gray-100">
                        {manager.name[lang]}
                      </h4>
                      <p className="text-sm text-primary-600 dark:text-primary-400">
                        {manager.role[lang]}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-3">
                        <a
                          href={`tel:${manager.phone}`}
                          className="text-sm text-gray-600 hover:text-primary-600 dark:text-gray-300"
                        >
                          {manager.phone}
                        </a>
                        {manager.whatsapp && (
                          <a
                            href={getWhatsAppUrl(
                              { ...contact, whatsapp: manager.whatsapp },
                              lang
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-[#25D366] hover:underline"
                          >
                            WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="card p-6">
              <h3 className="mb-4 font-semibold">{t.contact.followUs}</h3>
              <SocialLinks />
            </div>
          </div>

          <div className="card p-8">
            {sent ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-gray-800 dark:text-gray-200">
                  {t.contact.success}
                </p>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {t.contact.whatsappNote}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  <a
                    href={getContactFormWhatsAppUrl(contact, lang, form)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#20BD5A]"
                  >
                    WhatsApp
                  </a>
                  <button type="button" onClick={handleReset} className="btn-secondary">
                    {t.contact.sendAnother}
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="form-label">{t.contact.name}</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">{t.contact.email}</label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    value={form.email}
                    onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">{t.contact.phone}</label>
                  <input
                    type="tel"
                    className="input-field"
                    value={form.phone}
                    onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="form-label">{t.contact.message}</label>
                  <textarea
                    required
                    rows={5}
                    className="input-field resize-none"
                    value={form.message}
                    onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                  />
                </div>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#25D366] px-4 py-3 text-base font-bold text-white transition-colors hover:bg-[#20BD5A]"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.75.75 0 00.917.917l4.458-1.495A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.013-1.378l-.358-.214-2.645.887.887-2.645-.214-.358A9.818 9.818 0 1112 21.818z" />
                  </svg>
                  {t.contact.send}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
