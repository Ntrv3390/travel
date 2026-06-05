import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductsGrid } from "@/components/products/ProductsGrid";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/ui/Breadcrumb";

export const metadata: Metadata = {
  title: "Explore Experiences & Tours | Triipzy",
  description: "Browse our collection of tours, activities, and experiences from cities around the world. Book your next adventure.",
  openGraph: {
    title: "Explore Experiences | Triipzy",
    description: "Browse our collection of tours, activities, and experiences from cities around the world.",
    images: [{ url: "/api/og?title=Explore+Experiences&subtitle=Browse+tours+and+activities+worldwide&page=products", width: 1200, height: 630, alt: "Triipzy Experiences" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Explore Experiences | Triipzy",
    description: "Browse our collection of tours, activities, and experiences from cities around the world.",
    images: ["/api/og?title=Explore+Experiences&subtitle=Browse+tours+and+activities+worldwide&page=products"],
  },
  alternates: { canonical: "/products" },
};

export default function ProductsPage() {
  return (
    <main className="container py-8">
      <BreadcrumbJsonLd items={[{ label: "Experiences" }]} />
      <Breadcrumb items={[{ label: "Experiences" }]} className="mb-6" />
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
