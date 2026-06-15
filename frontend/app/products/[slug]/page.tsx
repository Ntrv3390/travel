import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ProductDetailClient } from "./ProductDetailClient";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/ui/Breadcrumb";
import { MaxWidthWrapper } from "@/components/ui/MaxWidthWrapper";
import { getProductById } from "@/lib/api";
import { PDP_REVALIDATE_SECONDS } from "@/lib/constants";

export const revalidate = PDP_REVALIDATE_SECONDS;

type Props = { params: { slug: string } };

function extractId(slug: string): string {
  return slug.split("-").pop() ?? "";
}

function heroImageUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  return url.startsWith("//") ? `https:${url}` : url;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = extractId(params.slug);
  const result = await getProductById(id, { revalidate: PDP_REVALIDATE_SECONDS });
  const product = result.data;

  const title = product?.name ?? params.slug.replace(/-\d+$/, "").replace(/-/g, " ");
  const description =
    product?.content?.shortSummary ??
    `Book ${title} on Triipzy. Discover tours, activities, and unforgettable experiences.`;
  const image = heroImageUrl(product?.media?.find((m) => m.type === "IMAGE")?.url);

  return {
    title: `${title} | Triipzy`,
    description,
    openGraph: {
      title: `${title} | Triipzy`,
      description,
      type: "website",
      ...(image && { images: [{ url: image, width: 1200, height: 630, alt: title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | Triipzy`,
      description,
      ...(image && { images: [image] }),
    },
    alternates: { canonical: `/products/${params.slug}` },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const id = extractId(params.slug);
  const result = await getProductById(id, { revalidate: PDP_REVALIDATE_SECONDS });

  if (!result.data) notFound();

  const product = result.data;
  const title = product.name ?? params.slug.replace(/-\d+$/, "").replace(/-/g, " ");

  return (
    <>
      <BreadcrumbJsonLd
        items={[{ label: "Products", href: "/products" }, { label: title }]}
      />
      <MaxWidthWrapper className="pt-4 lg:pt-5">
        <Breadcrumb
          items={[{ label: "Products", href: "/products" }, { label: title }]}
        />
      </MaxWidthWrapper>
      <ProductDetailClient key={id} initialProduct={product} />
    </>
  );
}
