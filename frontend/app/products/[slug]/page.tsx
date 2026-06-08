import type { Metadata } from "next";
import { ProductDetailClient } from "./ProductDetailClient";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/ui/Breadcrumb";
import { MaxWidthWrapper } from "@/components/ui/MaxWidthWrapper";

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = params.slug;
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
      <BreadcrumbJsonLd items={[{ label: "Products", href: "/products" }, { label: title || "Products" }]} />
      <MaxWidthWrapper className="pt-4 lg:pt-5">
        <Breadcrumb
          items={[{ label: "Products", href: "/products" }, { label: title || "Products" }]}
        />
      </MaxWidthWrapper>
      <ProductDetailClient />
    </>
  );
}
