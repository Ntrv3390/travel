export default function ProductLoading() {
  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <div className="mb-4 lg:mb-6">
          <div className="h-8 w-24 animate-pulse rounded-xl bg-muted" />
        </div>

        <div className="animate-pulse space-y-8">
          {/* Hero skeleton */}
          <div className="grid gap-6 lg:grid-cols-[1fr,420px]">
            <div>
              <div className="aspect-[4/3] rounded-2xl bg-muted lg:aspect-[16/10]" />
              <div className="mt-3 flex gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-16 w-20 shrink-0 rounded-xl bg-muted"
                  />
                ))}
              </div>
            </div>
            <div className="space-y-4">
              <div className="h-8 w-3/4 rounded-lg bg-muted" />
              <div className="h-4 w-1/2 rounded bg-muted" />
              <div className="flex gap-2">
                <div className="h-6 w-20 rounded-full bg-muted" />
                <div className="h-6 w-24 rounded-full bg-muted" />
                <div className="h-6 w-20 rounded-full bg-muted" />
              </div>
              <div className="mt-6 h-32 rounded-2xl bg-muted" />
            </div>
          </div>

          {/* Packages skeleton */}
          <div className="space-y-3">
            <div className="h-6 w-40 rounded bg-muted" />
            {[1, 2].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted" />
            ))}
          </div>

          {/* Content skeleton */}
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
