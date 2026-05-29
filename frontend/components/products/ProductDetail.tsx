"use client";

import { useState } from "react";
import { AvailabilityCalendar } from "@/components/products/AvailabilityCalendar";
import {
  Star,
  MapPin,
  Clock,
  Users,
  XCircle,
  RefreshCw,
  Zap,
  ClipboardCheck,
  Tag,
  ChevronDown,
  ChevronUp,
  Ticket,
  DollarSign,
  Calendar,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { Product, ProductVariant } from "@/types/product";

const productTypeColors: Record<string, string> = {
  ATTRACTION: "bg-purple-100 text-purple-700 border-purple-200",
  TOUR: "bg-blue-100 text-blue-700 border-blue-200",
  ACTIVITY: "bg-green-100 text-green-700 border-green-200",
  EVENT: "bg-amber-100 text-amber-700 border-amber-200",
  TRANSFER: "bg-slate-100 text-slate-700 border-slate-200",
  AIRPORT_TRANSFER: "bg-slate-100 text-slate-700 border-slate-200",
  ADD_ON: "bg-pink-100 text-pink-700 border-pink-200",
};

function formatDuration(ms: number | null): string {
  if (!ms) return "Flexible";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-semibold hover:bg-muted/50"
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="px-4 pb-3 pt-1">{children}</div>}
    </div>
  );
}

function VariantCard({ variant }: { variant: ProductVariant }) {
  const pricing = (variant as { pricing?: { headoutSellingPrice?: number; netPrice?: number; currency?: string } }).pricing;
  const vp = (variant as { startingHeadoutSellingPrice?: { amount?: number; currencyCode?: string } }).startingHeadoutSellingPrice;
  const displayPrice = pricing?.headoutSellingPrice ?? vp?.amount;
  const currencySymbol = pricing?.currency ?? vp?.currencyCode ?? "$";

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="truncate text-sm font-semibold">{variant.name ?? "Default"}</h4>
              <Badge className="shrink-0 border-slate-200 bg-slate-50 text-[10px] text-slate-600">
                {variant.inventoryType
                  ?.replace(/_/g, " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </Badge>
            </div>
            {variant.description && (
              <p className="mt-1 text-xs text-muted-foreground">{variant.description}</p>
            )}
          </div>
          {displayPrice !== undefined && (
            <div className="shrink-0 text-right">
              <p className="text-lg font-bold">
                {typeof currencySymbol === "string" && currencySymbol.length <= 3
                  ? `${currencySymbol}${displayPrice.toFixed(2)}`
                  : `${currencySymbol} ${displayPrice.toFixed(2)}`}
              </p>
              {pricing?.netPrice && pricing.netPrice < displayPrice && (
                <p className="text-xs text-muted-foreground line-through">
                  {typeof currencySymbol === "string" && currencySymbol.length <= 3
                    ? `${currencySymbol}${pricing.netPrice.toFixed(2)}`
                    : `${currencySymbol} ${pricing.netPrice.toFixed(2)}`}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {variant.duration !== null && (
            <Badge className="border-orange-200 bg-orange-50 text-[10px] text-orange-700">
              <Clock className="mr-0.5 h-2.5 w-2.5" />
              {formatDuration(variant.duration)}
            </Badge>
          )}
          <Badge className="border-slate-200 bg-slate-50 text-[10px] text-slate-600">
            <Users className="mr-0.5 h-2.5 w-2.5" />
            {variant.pax.min}–{variant.pax.max ?? "∞"} pax
          </Badge>
          {variant.cashback && variant.cashback.value > 0 && (
            <Badge className="border-green-200 bg-green-50 text-[10px] text-green-700">
              <DollarSign className="mr-0.5 h-2.5 w-2.5" />
              {variant.cashback.value}{variant.cashback.type === "PERCENTAGE" ? "%" : "$"} cashback
            </Badge>
          )}
          {variant.cancellationPolicy?.cancellable && (
            <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
              <XCircle className="mr-0.5 h-2.5 w-2.5" />
              Free Cancel
            </Badge>
          )}
        </div>

        {variant.inputFields && variant.inputFields.length > 0 && (
          <div className="mt-3 border-t pt-3">
            <p className="mb-1 text-[10px] font-medium text-muted-foreground">Required info:</p>
            <div className="flex flex-wrap gap-1">
              {variant.inputFields.map((f, i) => (
                <Badge key={i} className="border-gray-200 bg-gray-50 text-[10px] text-gray-600">
                  {f.name}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OperatingScheduleTable({ schedules }: { schedules: Array<{ dayOfWeek: string; openingTime: string | null; closingTime: string | null; lastEntryTime: string | null; closed: boolean }> }) {
  const dayOrder: Record<string, number> = {
    MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3, THURSDAY: 4, FRIDAY: 5, SATURDAY: 6, SUNDAY: 7,
  };
  const sorted = [...schedules].sort((a, b) => (dayOrder[a.dayOfWeek] ?? 99) - (dayOrder[b.dayOfWeek] ?? 99));
  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b text-muted-foreground">
          <th className="py-1 pr-2 text-left font-medium">Day</th>
          <th className="py-1 px-2 text-left font-medium">Open</th>
          <th className="py-1 px-2 text-left font-medium">Close</th>
          <th className="py-1 pl-2 text-left font-medium">Last Entry</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((s, i) => (
          <tr key={i} className={cn("border-b last:border-0", s.closed && "text-muted-foreground")}>
            <td className="py-1 pr-2 font-medium">{s.dayOfWeek.charAt(0) + s.dayOfWeek.slice(1).toLowerCase()}</td>
            <td className="py-1 px-2">{s.closed ? "—" : s.openingTime ?? "—"}</td>
            <td className="py-1 px-2">{s.closed ? "—" : s.closingTime ?? "—"}</td>
            <td className="py-1 pl-2">{s.closed ? "Closed" : s.lastEntryTime ?? "—"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState<string | number | null>(
    product.variants?.[0]?.id ?? null
  );

  const images = product.media.filter((m) => m.type === "IMAGE");
  const typeColor = productTypeColors[product.productType] ?? "bg-gray-100 text-gray-700 border-gray-200";
  const symbol = product.currency?.localSymbol ?? "$";
  const discount = product.listingPrice?.bestDiscount ?? 0;
  const originalPrice = product.listingPrice?.minimumPrice?.originalPrice;
  const finalPrice = product.listingPrice?.minimumPrice?.finalPrice ?? product.pricing.headoutSellingPrice;
  const hasPricing = finalPrice !== undefined;
  const poi = (product as { pois?: Array<{ name: string; operatingSchedules?: Array<{ startDate: string; endDate: string; scheduleName: string; operatingDaySchedules: Array<{ dayOfWeek: string; openingTime: string | null; closingTime: string | null; lastEntryTime: string | null; closed: boolean }> }>; holidays?: string[]; freeEntryDays?: string[] }> }).pois;
  const address = (product as { address?: { address?: string; city?: string; postalCode?: string; country?: string } | null }).address;
  const cutoffTime = (product as { cutoffTimeInMinutes?: number | null }).cutoffTimeInMinutes;

  return (
    <div className="mx-auto max-w-5xl">
      {/* Hero Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Image Gallery */}
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
            {images.length > 0 ? (
              <img
                src={images[selectedImage]?.url?.startsWith("//") ? `https:${images[selectedImage].url}` : images[selectedImage]?.url}
                alt={product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-300">
                <Ticket className="h-16 w-16" />
              </div>
            )}
            <Badge className={`absolute right-2 top-2 border text-xs font-medium shadow-sm ${typeColor}`}>
              {product.productType === "AIRPORT_TRANSFER"
                ? "Airport Transfer"
                : product.productType.charAt(0) + product.productType.slice(1).toLowerCase()}
            </Badge>
          </div>
          {images.length > 1 && (
            <div className="mt-2 flex gap-2 overflow-x-auto">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedImage(i)}
                  className={cn(
                    "h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition-all",
                    i === selectedImage ? "border-brand-600 ring-1 ring-brand-600" : "border-transparent opacity-70 hover:opacity-100",
                  )}
                >
                  <img
                    src={img.url?.startsWith("//") ? `https:${img.url}` : img.url}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info Header */}
        <div className="space-y-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{product.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {product.city?.name}
              </span>
              {product.reviewsSummary && (
                <span className="flex items-center gap-1">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {product.reviewsSummary.averageRating.toFixed(1)}
                  <span className="text-xs">({product.reviewsSummary.ratingsCount?.toLocaleString()})</span>
                </span>
              )}
            </div>
          </div>

          {/* Policy + Feature Badges */}
          <div className="flex flex-wrap gap-1.5">
            {product.cancellationPolicy?.cancellable && (
              <Badge className="border-emerald-200 bg-emerald-50 text-xs text-emerald-700">
                <XCircle className="mr-1 h-3 w-3" />
                Free Cancellation
              </Badge>
            )}
            {product.reschedulePolicy?.reschedulable && (
              <Badge className="border-blue-200 bg-blue-50 text-xs text-blue-700">
                <RefreshCw className="mr-1 h-3 w-3" />
                Reschedulable
              </Badge>
            )}
            {product.hasInstantConfirmation && (
              <Badge className="border-cyan-200 bg-cyan-50 text-xs text-cyan-700">
                <Zap className="mr-1 h-3 w-3" />
                Instant Confirmation
              </Badge>
            )}
            {product.hasMobileTicket && (
              <Badge className="border-indigo-200 bg-indigo-50 text-xs text-indigo-700">
                <ClipboardCheck className="mr-1 h-3 w-3" />
                Mobile Ticket
              </Badge>
            )}
          </div>

          {/* Pricing */}
          {hasPricing && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <p className="text-xs text-muted-foreground">Starting from</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold">{symbol}{finalPrice.toFixed(2)}</span>
                {discount > 0 && originalPrice && (
                  <>
                    <span className="text-lg text-muted-foreground line-through">{symbol}{originalPrice.toFixed(2)}</span>
                    <Badge className="bg-rose-500 text-xs font-bold text-white">{discount}% OFF</Badge>
                  </>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                per person &middot; {product.pricing.profileType === "PER_GROUP" ? "per group" : "per person"} pricing
              </p>
            </div>
          )}

          {/* Categories */}
          <div className="flex flex-wrap gap-2 text-xs">
            {product.primaryCategory && (
              <Badge className="border-slate-200 bg-slate-50 text-slate-600">
                <Tag className="mr-0.5 h-3 w-3" />
                {product.primaryCategory.name}
              </Badge>
            )}
            {product.primarySubCategory && (
              <Badge className="border-slate-200 bg-slate-50 text-slate-600">{product.primarySubCategory.name}</Badge>
            )}
            {product.primaryCollection && (
              <Badge className="border-slate-200 bg-slate-50 text-slate-600">{product.primaryCollection.name}</Badge>
            )}
          </div>

          {/* Cutoff Time */}
          {cutoffTime != null && (
            <p className="text-xs text-muted-foreground">
              <Calendar className="mr-1 inline h-3 w-3" />
              Book at least {cutoffTime} minutes before your visit
            </p>
          )}
        </div>
      </div>

      {/* Content Sections */}
      <div className="mt-8 space-y-3">
        {product.content?.highlights && (
          <Section title="Highlights">
            <div
              className="text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1"
              dangerouslySetInnerHTML={{ __html: product.content.highlightsHtml ?? product.content.highlights }}
            />
          </Section>
        )}
        {product.content?.shortSummary && (
          <Section title="About">
            <div
              className="text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: product.content.summaryHtml ?? product.content.shortSummary }}
            />
          </Section>
        )}
        {product.content?.inclusions && (
          <Section title="What's Included">
            <div
              className="text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1"
              dangerouslySetInnerHTML={{ __html: product.content.inclusionsHtml ?? product.content.inclusions }}
            />
          </Section>
        )}
        {product.content?.exclusions && (
          <Section title="What's Not Included">
            <div
              className="text-sm leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mt-1"
              dangerouslySetInnerHTML={{ __html: product.content.exclusionsHtml ?? product.content.exclusions }}
            />
          </Section>
        )}
        {product.content?.faqHtml && (
          <Section title="FAQ" defaultOpen={false}>
            <div
              className="text-sm leading-relaxed [&_h3]:mt-3 [&_h3]:font-semibold [&_h3:first-child]:mt-0"
              dangerouslySetInnerHTML={{ __html: product.content.faqHtml }}
            />
          </Section>
        )}
      </div>

      {/* Ticket Delivery Info */}
      {product.content?.ticketDeliveryInfoHtml && (
        <div className="mt-3 rounded-lg border bg-muted/20 p-4">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Ticket Delivery</p>
          <div
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: product.content.ticketDeliveryInfoHtml }}
          />
        </div>
      )}

      {/* Address */}
      {address && (
        <div className="mt-3 rounded-lg border bg-muted/20 p-4">
          <p className="mb-1 text-xs font-semibold text-muted-foreground">Location</p>
          <p className="text-sm">
            {[address.address, address.city, address.postalCode, address.country].filter(Boolean).join(", ")}
          </p>
        </div>
      )}

      {/* Start / End Locations */}
      {(product.startLocation || product.endLocation) && (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {product.startLocation && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">Meeting Point</p>
              <p className="text-sm">
                {[product.startLocation.address, product.startLocation.city, product.startLocation.country].filter(Boolean).join(", ")}
              </p>
            </div>
          )}
          {product.endLocation && product.endLocation.address && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="mb-1 text-xs font-semibold text-muted-foreground">End Point</p>
              <p className="text-sm">
                {[product.endLocation.address, product.endLocation.city, product.endLocation.country].filter(Boolean).join(", ")}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Variants Section */}
      {product.variants && product.variants.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-bold">
            Available Options
            <span className="ml-2 text-sm font-normal text-muted-foreground">({product.variants.length})</span>
          </h2>
          <div className="space-y-3">
            {product.variants.map((variant) => (
              <div
                key={String(variant.id)}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedVariantId(variant.id)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedVariantId(variant.id) }}
                className={`cursor-pointer rounded-lg transition-all ${
                  selectedVariantId === variant.id ? "ring-2 ring-brand-500" : "hover:ring-1 hover:ring-brand-300"
                }`}
              >
                <VariantCard variant={variant} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Availability Calendar (Normal products only) */}
      {product.inventorySelectionType === "NORMAL" && selectedVariantId && product.id && (
        <div className="mt-6">
          <AvailabilityCalendar productId={product.id} variantId={selectedVariantId} />
        </div>
      )}

      {/* POI Section */}
      {poi && poi.length > 0 && (
        <div className="mt-8">
          <h2 className="mb-4 text-lg font-bold">
            Points of Interest
            <span className="ml-2 text-sm font-normal text-muted-foreground">({poi.length})</span>
          </h2>
          <div className="space-y-4">
            {poi.map((point, idx) => (
              <Card key={idx}>
                <CardContent className="p-4">
                  <h3 className="mb-2 text-sm font-semibold">{point.name}</h3>
                  {point.operatingSchedules?.map((schedule, si) => (
                    <div key={si} className="mb-3 last:mb-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="font-medium">{schedule.scheduleName}</span>
                        <span>({schedule.startDate} – {schedule.endDate})</span>
                      </div>
                      <OperatingScheduleTable schedules={schedule.operatingDaySchedules} />
                    </div>
                  ))}
                  {point.holidays && point.holidays.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Closed on: {point.holidays.join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Cancellation & Reschedule Policy */}
      <Separator className="my-8" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Cancellation Policy</h3>
          {product.cancellationPolicy?.cancellable ? (
            <p className="mt-1 text-sm text-green-600">
              Free cancellation up to {product.cancellationPolicy.cancellableUpToInMinutes} minutes before the experience.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">This experience is non-cancellable.</p>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold">Reschedule Policy</h3>
          {product.reschedulePolicy?.reschedulable ? (
            <p className="mt-1 text-sm text-blue-600">
              Free reschedule up to {product.reschedulePolicy.reschedulableUpToInMinutes} minutes before the experience.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">This experience is non-reschedulable.</p>
          )}
        </div>
      </div>
    </div>
  );
}
