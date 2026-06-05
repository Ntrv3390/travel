import type { Metadata } from "next";
import { ProductDetailClient } from "./ProductDetailClient";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/ui/Breadcrumb";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = params.slug;
  const id = slug.split("-").pop() ?? "";
  const title = slug.replace(/-\d+$/, "").replace(/-/g, " ");

  return {
    title: `${title || "Experience"} | Triipzy`,
    description: `Book ${title || "this experience"} on Triipzy. Discover tours, activities, and unforgettable experiences.`,
    openGraph: {
      title: `${title || "Experience"} | Triipzy`,
      description: `Book ${title || "this experience"} on Triipzy.`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title || "Experience"} | Triipzy`,
      description: `Book ${title || "this experience"} on Triipzy.`,
    },
    alternates: { canonical: `/products/${slug}` },
  };
}

export default function ProductDetailPage({ params }: Props) {
  const title = params.slug.replace(/-\d+$/, "").replace(/-/g, " ");
  return (
    <>
      <BreadcrumbJsonLd items={[{ label: "Experiences", href: "/products" }, { label: title || "Experience" }]} />
      <Breadcrumb
        items={[{ label: "Experiences", href: "/products" }, { label: title || "Experience" }]}
        className="container pt-6"
      />
      <ProductDetailClient />
    </>
  );
}
