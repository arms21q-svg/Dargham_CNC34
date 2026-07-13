import { useState } from 'react'
import { useApp } from '../context/AppContext'

interface FAQItemProps {
  question: string
  answer: string
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-5 text-start transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
      >
        <span className="font-medium text-gray-800 dark:text-gray-200">{question}</span>
        <svg
          className={`h-5 w-5 shrink-0 text-primary-600 transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${open ? 'max-h-96' : 'max-h-0'}`}
      >
        <p className="border-t border-gray-100 px-5 py-4 text-sm leading-relaxed text-gray-600 dark:border-gray-800 dark:text-gray-400">
          {answer}
        </p>
      </div>
    </div>
  )
}

export default function FAQList() {
  const { t } = useApp()

  return (
    <div className="space-y-3">
      {t.faq.items.map((item, i) => (
        <FAQItem key={i} question={item.q} answer={item.a} />
      ))}
    </div>
  )
}
