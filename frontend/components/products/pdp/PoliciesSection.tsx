"use client";

import { ShieldCheck, RotateCcw, Info } from "lucide-react";
import type { Product } from "@/types/product";
import { cn } from "@/lib/utils";

interface PoliciesSectionProps {
  cancellationPolicy?: Product["cancellationPolicy"];
  reschedulePolicy?: Product["reschedulePolicy"];
  cutoffTimeInMinutes?: number | null;
}

export function PoliciesSection({
  cancellationPolicy,
  reschedulePolicy,
  cutoffTimeInMinutes,
}: PoliciesSectionProps) {
  return (
    <section id="policies" className="scroll-mt-24">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-3 py-1 text-xs font-medium text-brand-700">
          <ShieldCheck className="h-3.5 w-3.5" />
          Booking Policies
        </div>

        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          Policies & Flexibility
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Important information regarding cancellations,
          rescheduling, and booking requirements.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Cancellation */}
        <div
          className={cn(
            "overflow-hidden rounded-[28px] border backdrop-blur-xl transition-all duration-300",
            cancellationPolicy?.cancellable
              ? "border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-background to-emerald-50/30"
              : "border-border bg-background"
          )}
        >
          <div className="p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl",
                    cancellationPolicy?.cancellable
                      ? "bg-emerald-100"
                      : "bg-muted"
                  )}
                >
                  <ShieldCheck
                    className={cn(
                      "h-5 w-5",
                      cancellationPolicy?.cancellable
                        ? "text-emerald-600"
                        : "text-muted-foreground"
                    )}
                  />
                </div>

                <div>
                  <h3 className="font-semibold">
                    Cancellation
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Refund eligibility
                  </p>
                </div>
              </div>

              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  cancellationPolicy?.cancellable
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {cancellationPolicy?.cancellable
                  ? "Available"
                  : "Not Available"}
              </span>
            </div>

            {cancellationPolicy?.cancellable ? (
              <>
                <p className="text-sm font-medium text-foreground">
                  Free cancellation
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Cancel up to{" "}
                  <span className="font-semibold text-foreground">
                    {
                      cancellationPolicy.cancellableUpToInMinutes
                    }{" "}
                    minutes
                  </span>{" "}
                  before the experience starts.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                This booking cannot be cancelled once
                confirmed.
              </p>
            )}
          </div>
        </div>

        {/* Reschedule */}
        <div
          className={cn(
            "overflow-hidden rounded-[28px] border backdrop-blur-xl transition-all duration-300",
            reschedulePolicy?.reschedulable
              ? "border-blue-200 bg-gradient-to-br from-blue-50/80 via-background to-blue-50/30"
              : "border-border bg-background"
          )}
        >
          <div className="p-5 sm:p-6">
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-2xl",
                    reschedulePolicy?.reschedulable
                      ? "bg-blue-100"
                      : "bg-muted"
                  )}
                >
                  <RotateCcw
                    className={cn(
                      "h-5 w-5",
                      reschedulePolicy?.reschedulable
                        ? "text-blue-600"
                        : "text-muted-foreground"
                    )}
                  />
                </div>

                <div>
                  <h3 className="font-semibold">
                    Reschedule
                  </h3>

                  <p className="text-xs text-muted-foreground">
                    Date changes
                  </p>
                </div>
              </div>

              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-medium",
                  reschedulePolicy?.reschedulable
                    ? "bg-blue-100 text-blue-700"
                    : "bg-muted text-muted-foreground"
                )}
              >
                {reschedulePolicy?.reschedulable
                  ? "Available"
                  : "Not Available"}
              </span>
            </div>

            {reschedulePolicy?.reschedulable ? (
              <>
                <p className="text-sm font-medium text-foreground">
                  Free rescheduling
                </p>

                <p className="mt-1 text-sm text-muted-foreground">
                  Modify your booking up to{" "}
                  <span className="font-semibold text-foreground">
                    {
                      reschedulePolicy.reschedulableUpToInMinutes
                    }{" "}
                    minutes
                  </span>{" "}
                  before departure.
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Changes cannot be made after booking.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Booking Notice */}
      {cutoffTimeInMinutes != null &&
        cutoffTimeInMinutes > 0 && (
          <div className="mt-4 overflow-hidden rounded-[28px] border border-amber-200 bg-gradient-to-br from-amber-50/80 via-background to-amber-50/30">
            <div className="flex gap-4 p-5 sm:p-6">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100">
                <Info className="h-5 w-5 text-amber-600" />
              </div>

              <div>
                <h3 className="font-semibold">
                  Advance Booking Required
                </h3>

                <p className="mt-1 text-sm text-muted-foreground">
                  Reservations must be made at least{" "}
                  <span className="font-semibold text-foreground">
                    {cutoffTimeInMinutes % 60 === 0
                      ? `${cutoffTimeInMinutes / 60} ${cutoffTimeInMinutes / 60 === 1 ? "hour" : "hours"}`
                      : `${(cutoffTimeInMinutes / 60).toFixed(1)} hours`}
                  </span>{" "}
                  before your visit.
                </p>
              </div>
            </div>
          </div>
        )}
    </section>
  );
}
