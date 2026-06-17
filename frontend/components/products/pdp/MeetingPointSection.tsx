"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import type { Product } from "@/types/product";

interface MeetingPointSectionProps {
  address?: Product["startLocation"];
  endLocation?: Product["endLocation"];
  mainAddress?: {
    address?: string;
    city?: string;
    postalCode?: string;
    country?: string;
  } | null;
}

export function MeetingPointSection({
  address,
  endLocation,
  mainAddress,
}: MeetingPointSectionProps) {
  const lat =
    address?.latitude ??
    (address as { lat?: number })?.lat;
  const lng =
    address?.longitude ??
    (address as { lng?: number })?.lng;
  const hasCoords = lat != null && lng != null;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    if (!hasCoords) return;
    const el = mapContainerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setMapReady(true); observer.disconnect(); } },
      { rootMargin: "400px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasCoords]);

  const hasContent =
    address?.address ||
    endLocation?.address ||
    mainAddress?.address;

  if (!hasContent) return null;

  const meetingAddress = address?.address
    ? [address.address, address.city, address.country]
      .filter(Boolean)
      .join(", ")
    : mainAddress
      ? [
        mainAddress.address,
        mainAddress.city,
        mainAddress.postalCode,
        mainAddress.country,
      ]
        .filter(Boolean)
        .join(", ")
      : null;

  const endAddress = endLocation?.address
    ? [
      endLocation.address,
      endLocation.city,
      endLocation.country,
    ]
      .filter(Boolean)
      .join(", ")
    : null;

  const mapUrl = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : meetingAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingAddress)}`
      : null;

  return (
    <section id="location" className="scroll-mt-24">
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-3 py-1 text-xs font-medium text-brand-700">
          <MapPin className="h-3.5 w-3.5" />
          Location Details
        </div>

        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          Meeting Point
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Find your starting location and directions before your experience.
        </p>
      </div>

      <div
        className="
        overflow-hidden
        rounded-[28px]
        border
        border-white/40
        bg-white/80
        backdrop-blur-xl
        shadow-[0_8px_40px_rgba(0,0,0,0.06)]
      "
      >
        {/* Map */}
        <div ref={mapContainerRef} className="relative h-[220px] overflow-hidden border-b border-border/50 md:h-[260px]">
          {hasCoords ? (
            mapReady ? (
              <>
                <iframe
                  src={`https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed`}
                  width="100%"
                  height="100%"
                  loading="lazy"
                  style={{ border: 0 }}
                  className="absolute inset-0 h-full w-full"
                  title="Meeting Point Map"
                />
                <div className="pointer-events-none absolute left-4 top-4">
                  <div className="rounded-full border border-white/50 bg-white/90 px-3 py-1.5 shadow-lg backdrop-blur-md">
                    <span className="flex items-center gap-1 text-xs font-medium">
                      <MapPin className="h-3.5 w-3.5 text-brand-600" />
                      Meeting Point
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex h-full items-center justify-center bg-muted/30">
                <div className="text-center">
                  <MapPin className="mx-auto h-10 w-10 text-brand-400/40 animate-pulse" />
                  <p className="mt-2 text-sm text-muted-foreground">Loading map…</p>
                </div>
              </div>
            )
          ) : (
            <div className="flex h-full items-center justify-center bg-muted/30">
              <div className="text-center">
                <MapPin className="mx-auto h-10 w-10 text-muted-foreground/30" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Location details available
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6">
          <div className="space-y-3">
            {meetingAddress && (
              <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100">
                    <MapPin className="h-4 w-4 text-brand-600" />
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
                      Meeting Point
                    </p>

                    <p className="mt-1 text-sm leading-6 text-foreground">
                      {meetingAddress}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {endAddress && (
              <div className="rounded-2xl border border-border bg-muted/20 p-4">
                <div className="flex gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                    <Navigation className="h-4 w-4 text-muted-foreground" />
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      End Point
                    </p>

                    <p className="mt-1 text-sm leading-6 text-foreground">
                      {endAddress}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {mapUrl && (
            <div className="mt-5 flex flex-wrap gap-3">
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-border
                bg-background
                px-4
                py-2.5
                text-sm
                font-medium
                transition-colors
                hover:bg-muted
              "
              >
                <ExternalLink className="h-4 w-4" />
                Open in Maps
              </a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
