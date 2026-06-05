import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ProductProvider } from "@/context/ProductContext";
import { PdpContent } from "@/components/experience/PdpContent";
import { PdpCurrencyReloader } from "@/components/experience/PdpCurrencyReloader";
import { getExperienceById, getJSONLD } from "@/lib/api";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/ui/Breadcrumb";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const cookieStore = await cookies();
  const currency = cookieStore.get("traviia_currency")?.value ?? "USD";
  const result = await getExperienceById(params.id, currency);
  if (!result.data) return {};

  const imageUrl = result.data.images[0]?.url ?? "/images/fallback-experience.svg";

  return {
    title: `${result.data.title} in ${result.data.city}`,
    description: result.data.description.slice(0, 160),
    openGraph: {
      title: result.data.title,
      description: result.data.description.slice(0, 160),
      images: [{ url: imageUrl, width: 1200, height: 630, alt: result.data.title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: result.data.title,
      description: result.data.description.slice(0, 160),
      images: [imageUrl],
    },
    alternates: {
      canonical: `/experiences/${params.id}`,
    },
  };
}

export default async function ExperienceByIDPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const currency = cookieStore.get("traviia_currency")?.value ?? "USD";
  const result = await getExperienceById(params.id, currency);
  if (!result.data) notFound();

  const jsonLD = await getJSONLD(result.data.headoutId);

  const experienceTitle = result.data.title;

  return (
    <>
      <PdpCurrencyReloader />
      <BreadcrumbJsonLd
        items={[
          { label: "Experiences", href: "/products" },
          { label: experienceTitle },
        ]}
      />
      {jsonLD.data ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD.data }} /> : null}
      <Breadcrumb
        items={[
          { label: "Experiences", href: "/products" },
          { label: experienceTitle },
        ]}
        className="container pt-6"
      />
      <ProductProvider experience={result.data} error={result.error}>
        <PdpContent />
      </ProductProvider>
    </>
  );
}
