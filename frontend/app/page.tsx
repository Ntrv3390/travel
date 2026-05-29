import Link from "next/link";
import { cookies } from "next/headers";
import { Globe2, ShieldCheck, Zap } from "lucide-react";
import { ExperienceHero } from "@/components/experience/ExperienceHero";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ExperiencesProvider } from "@/context/ExperiencesContext";
import { getTopExperiences } from "@/lib/api";
import type { SearchParams } from "@/types/api";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 24;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const cookieStore = await cookies();
  const currency = cookieStore.get("traviia_currency")?.value ?? "INR";
  const page = parseInt(searchParams.page ?? "1", 10);
  const limit = parseInt(searchParams.limit ?? String(PAGE_SIZE), 10);
  const result = await getTopExperiences(limit, page, currency);

  const totalPages = result.data?.totalPages ?? 1;
  const currentCount = result.data?.experiences.length ?? 0;

  return (
    <ExperiencesProvider
      initialExperiences={result.data?.experiences ?? []}
      totalCount={result.data?.count ?? 0}
      page={page}
      totalPages={totalPages}
      error={result.error}
    >
      <ExperienceHero />

      <section className="container py-section">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-display-sm font-bold">Top Experiences</h2>
          <Button asChild variant="outline">
            <Link href="/search">View all</Link>
          </Button>
        </div>
        {result.error ? (
          <Alert>
            <AlertDescription>Experiences are temporarily unavailable. Please refresh in a moment.</AlertDescription>
          </Alert>
        ) : currentCount ? (
          <>
            <ExperienceGrid />
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                {page > 1 && (
                  <Button asChild variant="outline">
                    <Link href={`/?page=${page - 1}&limit=${limit}`}>Previous</Link>
                  </Button>
                )}
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                {page < totalPages && (
                  <Button asChild variant="outline">
                    <Link href={`/?page=${page + 1}&limit=${limit}`}>Next</Link>
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <EmptyState title="No experiences yet" description="Try again later or explore another destination." />
        )}
      </section>

      <section className="container pb-section">
        <h2 className="mb-6 text-display-sm font-bold">Why Traviia</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <Globe2 className="h-6 w-6 text-brand-600" />
              <CardTitle className="text-xl">Worldwide inventory</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Curated tours and attractions across top global destinations.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Zap className="h-6 w-6 text-brand-600" />
              <CardTitle className="text-xl">Fast booking</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Optimized performance and real-time availability checks before purchase.</CardContent>
          </Card>
          <Card>
            <CardHeader>
              <ShieldCheck className="h-6 w-6 text-brand-600" />
              <CardTitle className="text-xl">Trusted pricing</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">Consistent pricing between search, product pages, and checkout.</CardContent>
          </Card>
        </div>
      </section>
    </ExperiencesProvider>
  );
}
