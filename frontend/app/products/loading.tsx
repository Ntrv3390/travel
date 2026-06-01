import { ProductCardSkeleton } from "@/components/products/ProductCardSkeleton";

export default function Loading() {
  return (
    <main className="container py-8">
      <div className="mb-6 animate-pulse space-y-2">
        <div className="h-8 w-52 rounded bg-muted" />
        <div className="h-4 w-80 rounded bg-muted" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
      </div>
    </main>
  );
}
