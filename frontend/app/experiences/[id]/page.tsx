import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductProvider } from "@/context/ProductContext";
import { PdpContent } from "@/components/experience/PdpContent";
import { getExperienceById, getJSONLD } from "@/lib/api";
import { PDP_REVALIDATE_SECONDS } from "@/lib/constants";

export const revalidate = PDP_REVALIDATE_SECONDS;

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const result = await getExperienceById(params.id);
  if (!result.data) return {};

  return {
    title: `${result.data.title} in ${result.data.city}`,
    description: result.data.description.slice(0, 160),
  };
}

export default async function ExperienceByIDPage({ params }: { params: { id: string } }) {
  const result = await getExperienceById(params.id);
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
