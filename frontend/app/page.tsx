import Link from "next/link";
import { Globe2, ShieldCheck, Zap } from "lucide-react";
import { ExperienceHero } from "@/components/experience/ExperienceHero";
import { ExperienceGrid } from "@/components/experience/ExperienceGrid";
import { EmptyState } from "@/components/common/EmptyState";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTopExperiences } from "@/lib/api";

export default async function HomePage() {
  const result = await getTopExperiences(8);

  return (
    <>
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
        ) : result.data && result.data.experiences.length ? (
          <ExperienceGrid experiences={result.data.experiences} />
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
    </>
  );
}
