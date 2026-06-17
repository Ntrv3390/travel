import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ProductProvider } from "@/context/ProductContext";
import { PdpContent } from "@/components/experience/PdpContent";
import { getExperience, getJSONLD, getTopExperiences } from "@/lib/api";
import { PDP_REVALIDATE_SECONDS } from "@/lib/constants";
import { Breadcrumb, BreadcrumbJsonLd } from "@/components/ui/Breadcrumb";

export const revalidate = PDP_REVALIDATE_SECONDS;

export async function generateStaticParams() {
  const top = await getTopExperiences(100);
  return top.data?.experiences.map((exp) => ({ city: exp.citySlug, slug: exp.slug })) ?? [];
}

export async function generateMetadata({ params }: { params: { city: string; slug: string } }): Promise<Metadata> {
  const cookieStore = await cookies();
  const currency = cookieStore.get("traviia_currency")?.value ?? "INR";
  const result = await getExperience(params.city, params.slug, currency);
  if (!result.data) return {};

  return {
    title: `${result.data.title} in ${result.data.city}`,
    description: result.data.description.slice(0, 160),
    openGraph: {
      title: result.data.title,
      description: result.data.description.slice(0, 160),
      images: [{ url: result.data.images[0]?.url ?? "/images/fallback-experience.svg", width: 1200, height: 630, alt: result.data.title }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: result.data.title,
      description: result.data.description.slice(0, 160),
      images: [result.data.images[0]?.url ?? "/images/fallback-experience.svg"],
    },
    alternates: {
      canonical: `/cities/${params.city}/${params.slug}`,
    },
  };
}

export default async function PDPPage({ params }: { params: { city: string; slug: string } }) {
  const cookieStore = await cookies();
  const currency = cookieStore.get("traviia_currency")?.value ?? "INR";
  const result = await getExperience(params.city, params.slug, currency);
  if (!result.data) notFound();

  const jsonLD = await getJSONLD(result.data.headoutId);

  const cityName = params.city.replace(/-/g, " ");
  const experienceTitle = result.data.title;

  return (
    <>
      <BreadcrumbJsonLd
        items={[
          { label: "Destinations", href: "/cities" },
          { label: cityName, href: `/cities/${params.city}` },
          { label: experienceTitle },
        ]}
      />
      {jsonLD.data ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD.data }} /> : null}
      <Breadcrumb
        items={[
          { label: "Destinations", href: "/cities" },
          { label: cityName, href: `/cities/${params.city}` },
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
