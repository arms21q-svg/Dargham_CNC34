'use client'

interface UploadProgressBarProps {
  done: number
  total: number
  label?: string
}

export default function UploadProgressBar({ done, total, label }: UploadProgressBarProps) {
  if (total <= 0) return null
  const pct = Math.round((done / total) * 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>{label ?? 'جاري رفع الصور'}</span>
        <span>
          {done}/{total} ({pct}%)
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full rounded-full bg-primary-600 transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
