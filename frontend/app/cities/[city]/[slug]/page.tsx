import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductProvider } from "@/context/ProductContext";
import { PdpContent } from "@/components/experience/PdpContent";
import { getExperience, getJSONLD, getTopExperiences } from "@/lib/api";
import { PDP_REVALIDATE_SECONDS } from "@/lib/constants";

export const revalidate = PDP_REVALIDATE_SECONDS;

export async function generateStaticParams() {
  const top = await getTopExperiences(100);
  return top.data?.experiences.map((exp) => ({ city: exp.citySlug, slug: exp.slug })) ?? [];
}

export async function generateMetadata({ params }: { params: { city: string; slug: string } }): Promise<Metadata> {
  const result = await getExperience(params.city, params.slug);
  if (!result.data) return {};

  return {
    title: `${result.data.title} in ${result.data.city}`,
    description: result.data.description.slice(0, 160),
    openGraph: {
      title: result.data.title,
      description: result.data.description.slice(0, 160),
      images: [{ url: result.data.images[0]?.url ?? "/images/fallback-experience.svg", width: 1200, height: 630 }],
      type: "website",
    },
    alternates: {
      canonical: `/cities/${params.city}/${params.slug}`,
    },
  };
}

export default async function PDPPage({ params }: { params: { city: string; slug: string } }) {
  const result = await getExperience(params.city, params.slug);
  if (!result.data) notFound();

  const jsonLD = await getJSONLD(result.data.headoutId);

  return (
    <>
      {jsonLD.data ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD.data }} /> : null}
      <ProductProvider experience={result.data} error={result.error}>
        <PdpContent />
      </ProductProvider>
    </>
  );
}
