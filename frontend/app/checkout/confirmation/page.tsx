import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking Confirmed | Triipzy",
  description: "Your booking has been confirmed.",
  robots: { index: false, follow: false },
};

export default function ConfirmationPage({
  searchParams,
}: {
  searchParams: {
    bookingRef?: string;
    bookingId?: string;
    firstName?: string;
    title?: string;
    emailSent?: string;
    status?: string;
  };
}) {
  const bookingRef = searchParams.bookingRef ?? `TRV-${Date.now().toString().slice(-8)}`;
  const bookingId = searchParams.bookingId;
  const firstName = searchParams.firstName;
  const title = searchParams.title ?? "Experience";
  const emailSent = searchParams.emailSent === "true";
  const status = searchParams.status ?? "CONFIRMED";

  return (
    <div className="container py-section">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 text-center">
        <CheckCircle2 className="h-16 w-16 text-green-600" />
        <h1 className="text-display-sm font-bold">Booking Confirmed</h1>
        <p className="text-muted-foreground">
          {firstName ? `Thanks ${firstName}! ` : ""}Your booking for {title} is confirmed.
          {emailSent ? " Confirmation details have been sent by email." : ""}
        </p>

        <Card className="w-full">
          <CardContent className="space-y-3 pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Reference number</p>
              <p className="mt-1 font-mono text-lg font-semibold">{bookingRef}</p>
            </div>
            {bookingId && (
              <div>
                <p className="text-sm text-muted-foreground">Booking ID</p>
                <p className="mt-1 font-mono text-sm">{bookingId}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="mt-1 text-sm font-medium capitalize text-green-700">{status.toLowerCase()}</p>
            </div>
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
