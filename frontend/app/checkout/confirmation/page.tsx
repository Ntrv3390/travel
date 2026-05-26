import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function ConfirmationPage({
  searchParams,
}: {
  searchParams: { bookingRef?: string; firstName?: string };
}) {
  const bookingRef = searchParams.bookingRef ?? `TRV-${Date.now().toString().slice(-8)}`;

  return (
    <div className="container py-section">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
        <h1 className="text-display-sm font-bold">Booking Confirmed</h1>
        <p className="text-muted-foreground">Your confirmation details have been sent by email.</p>

        <Card className="w-full">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Reference number</p>
            <p className="mt-1 font-mono text-lg font-semibold">{bookingRef}</p>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button asChild>
            <Link href="/search">Explore more</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/">Back home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
