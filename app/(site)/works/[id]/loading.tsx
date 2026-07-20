export default function ProductDetailLoading() {
  return (
    <div className="section-padding animate-pulse">
      <div className="container-main">
        <div className="mb-6 h-10 w-28 rounded-xl bg-gray-200 dark:bg-gray-800" />

        <div className="grid gap-8 lg:grid-cols-2">
          <div className="aspect-[4/3] rounded-2xl bg-gray-200 dark:bg-gray-800" />

          <div className="space-y-4">
            <div className="h-7 w-24 rounded-lg bg-gray-200 dark:bg-gray-800" />
            <div className="h-10 w-4/5 max-w-md rounded-xl bg-gray-200 dark:bg-gray-800" />
            <div className="space-y-2">
              <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-11/12 rounded bg-gray-200 dark:bg-gray-800" />
              <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-800" />
            </div>
            <div className="h-5 w-48 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="h-5 w-40 rounded bg-gray-200 dark:bg-gray-800" />
            <div className="flex gap-3 pt-2">
              <div className="h-11 w-28 rounded-xl bg-gray-200 dark:bg-gray-800" />
              <div className="h-11 w-28 rounded-xl bg-gray-200 dark:bg-gray-800" />
              <div className="h-11 w-32 rounded-xl bg-gray-200 dark:bg-gray-800" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
