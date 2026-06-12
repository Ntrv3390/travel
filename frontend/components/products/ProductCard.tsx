"use client";

import Image from "next/image";
import Link from "next/link";
import { Star, ClipboardCheck, XCircle, RefreshCw, MapPin, Zap, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { useCurrency } from "@/hooks/useCurrency";
import { toSlug } from "@/lib/utils";
import type { Product } from "@/types/product";

function optimizeImageUrl(url: string, width: number): string {
  if (url.startsWith("//")) url = `https:${url}`;
  if (url.includes("cdn-imgix.headout.com")) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}w=${width}&q=75&auto=format`;
  }
  return url;
}

const productTypeColors: Record<string, string> = {
  ATTRACTION: "bg-purple-100 text-purple-700 border-purple-200",
  TOUR: "bg-blue-100 text-blue-700 border-blue-200",
  ACTIVITY: "bg-green-100 text-green-700 border-green-200",
  EVENT: "bg-amber-100 text-amber-700 border-amber-200",
  TRANSFER: "bg-slate-100 text-slate-700 border-slate-200",
  AIRPORT_TRANSFER: "bg-slate-100 text-slate-700 border-slate-200",
  ADD_ON: "bg-pink-100 text-pink-700 border-pink-200",
};

export function ProductCard({ product }: { product: Product }) {
  const { currency: selectedCurrency, formatPrice } = useCurrency();
  const {
    id,
    name,
    productType,
    reviewsSummary,
    pricing,
    listingPrice, title,
    hasInstantConfirmation,
    hasMobileTicket, fromPrice, cityName,
    cancellationPolicy,
    reschedulePolicy,
    imageUrl,
    media,
    currency,
  } = product as Product;

  const imgSrc = imageUrl ?? (media?.find(m => m.type === "IMAGE")?.url) ?? null;

  const discount = listingPrice?.bestDiscount ?? 0;
  const hasDiscount = discount > 0;
  const originalPrice = listingPrice?.minimumPrice?.originalPrice;
  const finalPrice = fromPrice ??
    listingPrice?.minimumPrice?.finalPrice ??
    pricing?.headoutSellingPrice ??
    0; const priceCurrency = listingPrice?.currencyCode ?? currency?.code ?? selectedCurrency;
  const rating = reviewsSummary?.averageRating ?? 0;
  const reviewCount = reviewsSummary?.ratingsCount ?? 0;
  const safeProductType = productType ?? "ACTIVITY";

  const typeColor =
    productTypeColors[safeProductType] ??
    "bg-gray-100 text-gray-700 border-gray-200";
  const productName = name ?? title ?? "product";
  const slug = toSlug(productName);
  return (
    <Link href={`/products/${slug}-${id}`} className="group block">
      <Card className="overflow-hidden transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
          {imgSrc ? (
            <Image
              src={optimizeImageUrl(imgSrc, 400)}
              alt={productName}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-300">
              <Ticket className="h-12 w-12" />
            </div>
          )}

          {hasDiscount && (
            <Badge className="absolute left-2 top-2 border-0 bg-rose-500 px-2 py-1 text-xs font-bold text-white shadow">
              {discount}% OFF
            </Badge>
          )}

          <Badge className={`absolute right-2 top-2 border text-xs font-medium shadow-sm ${typeColor}`}>
            {safeProductType === "AIRPORT_TRANSFER"
              ? "Airport Transfer"
              : safeProductType.charAt(0) +
              safeProductType.slice(1).toLowerCase()}
          </Badge>
        </div>

        <div className="space-y-2 p-3">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span>{cityName ?? product?.city?.name ?? "Unknown"}</span>
          </div>

          <h3 className="line-clamp-2 text-sm font-semibold leading-snug">{productName}</h3>

          {rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-medium">{rating.toFixed(1)}</span>
              {reviewCount > 0 && (
                <span className="text-xs text-muted-foreground">({reviewCount.toLocaleString()})</span>
              )}
            </div>
          )}

          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Starting at</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-lg font-bold">{formatPrice(finalPrice, priceCurrency)}</span>
              {hasDiscount && originalPrice && (
                <span className="text-sm text-muted-foreground line-through">{formatPrice(originalPrice, priceCurrency)}</span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {cancellationPolicy?.cancellable && (
              <Badge className="border-emerald-200 bg-emerald-50 text-[10px] text-emerald-700">
                <XCircle className="mr-0.5 h-2.5 w-2.5" />
                Free Cancel
              </Badge>
            )}
            {reschedulePolicy?.reschedulable && (
              <Badge className="border-blue-200 bg-blue-50 text-[10px] text-blue-700">
                <RefreshCw className="mr-0.5 h-2.5 w-2.5" />
                Reschedulable
              </Badge>
            )}
            {hasInstantConfirmation && (
              <Badge className="border-cyan-200 bg-cyan-50 text-[10px] text-cyan-700">
                <Zap className="mr-0.5 h-2.5 w-2.5" />
                Instant Conf.
              </Badge>
            )}
            {hasMobileTicket && (
              <Badge className="border-indigo-200 bg-indigo-50 text-[10px] text-indigo-700">
                <ClipboardCheck className="mr-0.5 h-2.5 w-2.5" />
                Mobile Ticket
              </Badge>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}
