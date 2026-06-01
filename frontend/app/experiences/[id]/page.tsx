import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { ProductProvider } from "@/context/ProductContext";
import { PdpContent } from "@/components/experience/PdpContent";
import { PdpCurrencyReloader } from "@/components/experience/PdpCurrencyReloader";
import { getExperienceById, getJSONLD } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const cookieStore = await cookies();
  const currency = cookieStore.get("traviia_currency")?.value ?? "USD";
  const result = await getExperienceById(params.id, currency);
  if (!result.data) return {};

  return {
    title: `${result.data.title} in ${result.data.city}`,
    description: result.data.description.slice(0, 160),
  };
}

export default async function ExperienceByIDPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies();
  const currency = cookieStore.get("traviia_currency")?.value ?? "USD";
  const result = await getExperienceById(params.id, currency);
  if (!result.data) notFound();

  const jsonLD = await getJSONLD(result.data.headoutId);

  return (
    <>
      <PdpCurrencyReloader experienceId={result.data.headoutId} />
      {jsonLD.data ? <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLD.data }} /> : null}
      <ProductProvider experience={result.data} error={result.error}>
        <PdpContent />
      </ProductProvider>
    </>
  );
}
