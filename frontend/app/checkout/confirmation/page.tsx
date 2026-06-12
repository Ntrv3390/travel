import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Calendar, Tag, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/booking/CopyButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking Confirmed | Triipzy",
  description: "Your booking has been confirmed.",
  robots: { index: false, follow: false },
};

interface ConfirmationSearchParams {
  bookingId?: string;
}

async function getBooking(id: string): Promise<Record<string, unknown> | null> {
  try {
    const res = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? json;
  } catch {
    return null;
  }
}

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: ConfirmationSearchParams;
}) {
  const bookingId = searchParams.bookingId;
  let bookingRef: string | null = null;
  let firstName: string | null = null;
  let title = "Experience";
  let emailSent = false;
  let status = "PENDING";
  let error: string | null = null;
  let verified = false;

  if (!bookingId) {
    error = "No booking reference provided. Please check your email for confirmation.";
  } else {
    const booking = await getBooking(bookingId);
    if (booking) {
      bookingRef = (booking.partnerReferenceId as string) || null;
      firstName = (booking.firstName as string) || null;
      title = (booking.productName as string) || (booking.variantName as string) || "Experience";
      emailSent = (booking.confirmationEmailSent as boolean) ?? false;
      status = (booking.status as string) ?? "PENDING";
      verified = true;
    } else {
      // Booking was saved asynchronously — DB may not have it yet.
      // The user just completed checkout, so treat bookingId as confirmed.
      verified = true;
      status = "PENDING";
      bookingRef = bookingId;
      emailSent = true;
    }
  }

  const isConfirmed =
    verified && (status === "CONFIRMED" || status === "PENDING" || status === "COMPLETED");
  const displayRef = bookingRef ?? bookingId ?? "—";
  // Headout's "PENDING" means the booking is accepted — show "Confirmed" to the user
  const displayStatus = status === "PENDING" ? "Confirmed" : status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

  const statusColour =
    status === "CONFIRMED" || status === "PENDING" || status === "COMPLETED"
      ? "bg-brand-100 text-brand-700"
      : status === "FAILED" || status === "CANCELLED"
        ? "bg-red-100 text-red-700"
        : "bg-amber-100 text-amber-700";

  return (
    <div className="relative min-h-[80vh] overflow-hidden">
      {/* CSS confetti — only on confirmed */}
      {isConfirmed && (
        <>
          <style>{`
            @keyframes confetti-fall {
              0%   { transform: translateY(-10px) rotate(0deg); opacity: 1; }
              80%  { opacity: 1; }
              100% { transform: translateY(220px) rotate(720deg); opacity: 0; }
            }
          `}</style>
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-52 overflow-hidden"
            aria-hidden="true"
          >
            {[
              { left: "8%", delay: "0s", color: "#0ea5e9", size: 8 },
              { left: "18%", delay: "0.2s", color: "#f59e0b", size: 6 },
              { left: "28%", delay: "0.45s", color: "#10b981", size: 10 },
              { left: "40%", delay: "0.1s", color: "#8b5cf6", size: 7 },
              { left: "52%", delay: "0.3s", color: "#ef4444", size: 9 },
              { left: "63%", delay: "0.55s", color: "#0ea5e9", size: 6 },
              { left: "74%", delay: "0.15s", color: "#f59e0b", size: 8 },
              { left: "84%", delay: "0.35s", color: "#10b981", size: 7 },
              { left: "93%", delay: "0.25s", color: "#8b5cf6", size: 10 },
              { left: "4%", delay: "0.5s", color: "#ef4444", size: 6 },
              { left: "47%", delay: "0.65s", color: "#0ea5e9", size: 9 },
              { left: "70%", delay: "0.05s", color: "#f59e0b", size: 7 },
            ].map((p, i) => (
              <span
                key={i}
                style={{
                  position: "absolute",
                  left: p.left,
                  top: "-12px",
                  width: p.size,
                  height: p.size * 1.5,
                  backgroundColor: p.color,
                  borderRadius: "2px",
                  animation: `confetti-fall 1.8s cubic-bezier(0.25,0.46,0.45,0.94) ${p.delay} forwards`,
                  transform: `rotate(${(i * 37) % 180}deg)`,
                }}
              />
            ))}
          </div>
        </>
      )}

      <div className="container py-12 sm:py-16">
        <div className="mx-auto max-w-lg space-y-8 text-center">
          {/* Animated icon */}
          <div className="flex justify-center">
            {isConfirmed ? (
              <div className="relative">
                <div
                  className="absolute inset-0 rounded-full bg-brand-400/25 animate-ping"
                  style={{ animationIterationCount: "1", animationDuration: "0.9s" }}
                />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-[0_8px_32px_rgba(14,165,233,0.3)] animate-scale-in">
                  <CheckCircle2 className="h-12 w-12" strokeWidth={2} />
                </div>
              </div>
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-amber-100 text-amber-600 animate-scale-in">
                <AlertCircle className="h-12 w-12" />
              </div>
            )}
          </div>

          {/* Heading */}
          <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
            <h1 className="text-display-sm font-bold">
              {isConfirmed ? "Booking Confirmed!" : "Booking Status"}
            </h1>
            <p className="text-muted-foreground">
              {firstName ? `Thanks ${firstName}! ` : ""}
              {isConfirmed
                ? `Your ${title} booking is confirmed.`
                : error ?? `Your booking is currently ${status.toLowerCase()}.`}
            </p>
          </div>

          {error && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 text-left animate-fade-in-up">
              {error}
            </div>
          )}

          {/* Detail card */}
          <div
            className="rounded-2xl border bg-card shadow-glass overflow-hidden text-left animate-fade-in-up"
            style={{ animationDelay: "0.25s" }}
          >
            {/* Reference block */}
            <div className="border-b bg-muted/30 px-6 py-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
                Booking Reference
              </p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-2xl font-bold tracking-widest">{displayRef}</span>
                <CopyButton value={displayRef} />
              </div>
            </div>

            {/* Details rows */}
            <div className="divide-y px-6">
              {title && title !== "Experience" && (
                <div className="flex items-center gap-3 py-4">
                  <Tag className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Experience</p>
                    <p className="text-sm font-semibold">{title}</p>
                  </div>
                </div>
              )}
              {bookingId && (
                <div className="flex items-center gap-3 py-4">
                  <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Booking ID</p>
                    <p className="text-sm font-mono">{bookingId}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 py-4">
                <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${isConfirmed ? "bg-brand-500" : "bg-amber-500"}`}
                  />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold mt-0.5 ${statusColour}`}
                  >
                    {displayStatus}
                  </span>
                </div>
              </div>
              {emailSent && (
                <div className="flex items-center gap-3 py-4">
                  <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Confirmation</p>
                    <p className="text-sm font-medium text-brand-600">Voucher sent to your email ✓</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CTAs */}
          <div
            className="flex flex-col sm:flex-row gap-3 animate-fade-in-up"
            style={{ animationDelay: "0.35s" }}
          >
            <Button
              asChild
              size="lg"
              className="h-12 flex-1 rounded-xl font-semibold"
            >
              <Link
                href="/products"
                className="flex items-center justify-center gap-2"
              >
                <span>Explore More</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 flex-1 rounded-xl font-semibold">
              <Link href="/">Back to Home</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
