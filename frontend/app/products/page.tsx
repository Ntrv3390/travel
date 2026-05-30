"use client";

import { Suspense } from "react";
import { ProductsGrid } from "@/components/products/ProductsGrid";

export default function ProductsPage() {
  return (
    <main className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Explore Products</h1>
        <p className="mt-1 text-sm text-muted-foreground">Discover experiences from cities around the world</p>
      </div>

      <Suspense>
        <ProductsGrid queryParams={{}} />
      </Suspense>
    </main>
  );
}
