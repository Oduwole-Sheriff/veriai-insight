import { Skeleton } from "@/components/ui/skeleton";

export function ResultsSkeleton() {
  return (
    <div className="grid gap-6" aria-hidden="true">
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-xl">
          <div className="flex flex-col items-center gap-4">
            <Skeleton className="h-48 w-48 rounded-full" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-xl lg:col-span-2">
          <Skeleton className="h-3 w-40" />
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <div className="mt-5 grid grid-cols-3 gap-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 p-6 backdrop-blur-xl">
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
