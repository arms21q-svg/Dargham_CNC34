'use client'

interface DirectionalArrowProps {
  /** forward = navigate onward; back = return */
  direction: 'forward' | 'back'
  className?: string
}

/**
 * Navigation chevron that mirrors with document `dir` (RTL/LTR).
 * Drawn pointing right in LTR; `rtl:rotate-180` flips it for Arabic.
 */
export default function DirectionalArrow({
  direction,
  className = 'h-4 w-4',
}: DirectionalArrowProps) {
  const isForward = direction === 'forward'

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`inline-block shrink-0 transition-transform duration-200 ease-out rtl:rotate-180 ${
        isForward
          ? 'group-hover:translate-x-0.5 group-active:translate-x-1 rtl:group-hover:-translate-x-0.5 rtl:group-active:-translate-x-1'
          : 'group-hover:-translate-x-0.5 group-active:-translate-x-1 rtl:group-hover:translate-x-0.5 rtl:group-active:translate-x-1'
      } ${className}`}
    >
      {isForward ? (
        <path d="M5 12h14M13 6l6 6-6 6" />
      ) : (
        <path d="M19 12H5M11 6l-6 6 6 6" />
      )}
    </svg>
  )
}
