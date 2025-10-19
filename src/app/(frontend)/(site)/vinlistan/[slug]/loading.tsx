import { Skeleton } from '@/components/ui/skeleton'

export default function WineDetailLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="rounded-lg border p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4 mb-2">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-4 w-1/3 mb-6" />

        <div className="flex flex-col sm:flex-row gap-6">
          <Skeleton className="h-72 w-40 rounded-md" />
          <div className="flex-1 min-w-0 space-y-4">
            <div>
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-4 w-16" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-4 w-10" />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 space-y-3">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>

      <div className="mt-10">
        <Skeleton className="h-6 w-40 mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-3">
              <Skeleton className="h-32 w-16 mx-auto mb-3" />
              <Skeleton className="h-4 w-24 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
