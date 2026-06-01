export default function Loading() {
  return (
    <main className="container py-8">
      <div className="mx-auto max-w-5xl animate-pulse space-y-6">
        <div className="h-8 w-40 rounded bg-muted" />
        <div className="grid gap-6 md:grid-cols-2">
          <div className="aspect-[4/3] rounded-xl bg-muted" />
          <div className="space-y-4">
            <div className="h-8 w-3/4 rounded bg-muted" />
            <div className="h-4 w-1/2 rounded bg-muted" />
            <div className="h-24 w-full rounded-lg bg-muted" />
            <div className="h-10 w-1/3 rounded bg-muted" />
          </div>
        </div>
      </div>
    </main>
  );
}
