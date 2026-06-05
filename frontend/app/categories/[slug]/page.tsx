import type { Metadata } from "next";
import { CategoryPageClient } from "./CategoryPageClient";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/ui/Breadcrumb";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const categoryName = params.slug.replace(/-/g, " ");

  return {
    title: `${categoryName} Experiences | Triipzy`,
    description: `Discover and book the best ${categoryName} tours, activities, and experiences. Instant confirmation and best prices.`,
    openGraph: {
      title: `${categoryName} Experiences | Triipzy`,
      description: `Discover and book the best ${categoryName} tours, activities, and experiences.`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${categoryName} Experiences | Triipzy`,
      description: `Discover and book the best ${categoryName} tours, activities, and experiences.`,
    },
    alternates: { canonical: `/categories/${params.slug}` },
  };
}

export default function CategoryPage({ params }: Props) {
  const categoryName = params.slug.replace(/-/g, " ");
  return (
    <>
      <BreadcrumbJsonLd items={[{ label: "Experiences", href: "/products" }, { label: categoryName }]} />
      <Breadcrumb
        items={[{ label: "Experiences", href: "/products" }, { label: categoryName }]}
        className="container pt-6"
      />
      <CategoryPageClient slug={params.slug} />
    </>
  );
}
