import { CitiesGrid } from "@/components/cities/CitiesGrid";
import { getCities } from "@/lib/api";
import type { CitiesResponse } from "@/types/api";

const PAGE_SIZE = 40;

export const dynamic = "force-dynamic";

export default async function CitiesPage() {
  const result = await getCities(0, PAGE_SIZE);
  const data = result.data as CitiesResponse | null;
  const cities = data?.cities ?? [];
  const total = data?.total ?? 0;
  const nextOffset = data?.nextOffset ?? null;

  return (
    <section className="container py-section">
      <div className="mb-8">
        <h1 className="text-display-sm font-bold">Cities</h1>
        <p className="mt-2 text-muted-foreground">
          Explore tours and activities across {total} destinations worldwide.
        </p>
      </div>

      {cities.length === 0 ? (
        <p className="text-center text-muted-foreground">No cities available.</p>
      ) : (
        <CitiesGrid
          initialCities={cities}
          initialNextOffset={nextOffset}
        />
      )}
    </section>
  );
}
