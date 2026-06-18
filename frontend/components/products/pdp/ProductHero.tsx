"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Star,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  Camera,
  CheckCircle2,
  Smartphone,
  RefreshCw,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";
import { useCurrency } from "@/hooks/useCurrency";
import { ReviewsSection } from "./ReviewsSection";

// ─── Helpers ────────────────────────────────────────────────────────────────

const productTypeColors: Record<string, { bg: string; text: string }> = {
  ATTRACTION: { bg: "bg-violet-500", text: "text-white" },
  TOUR: { bg: "bg-brand-500", text: "text-white" },
  ACTIVITY: { bg: "bg-emerald-500", text: "text-white" },
  EVENT: { bg: "bg-amber-500", text: "text-white" },
  TRANSFER: { bg: "bg-slate-700", text: "text-white" },
  AIRPORT_TRANSFER: { bg: "bg-slate-700", text: "text-white" },
  ADD_ON: { bg: "bg-pink-500", text: "text-white" },
};

function formatDuration(ms: number | null): string {
  if (!ms) return "Flexible";
  const hours = Math.floor(ms / 3_600_000);
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours}h`;
  return `${mins}m`;
}

function imgixUrl(raw: string, width: number, quality = 65): string {
  if (!raw) return raw;
  const url = raw.startsWith("//") ? `https:${raw}` : raw;
  if (!url.includes("cdn-imgix.headout.com") && !url.includes("cdn.headout.com")) return url;
  const [base, existing] = url.split("?");
  const params = new URLSearchParams(existing ?? "");
  params.set("w", String(width));
  params.set("q", String(quality));
  params.set("auto", "format,compress");
  params.set("fit", "crop");
  params.delete("fm");
  return `${base}?${params.toString()}`;
}

// ─── Lightbox ───────────────────────────────────────────────────────────────

interface LightboxProps {
  images: Array<{ url: string }>;
  initialIndex: number;
  productName: string;
  onClose: () => void;
}

function ImageLightbox({ images, initialIndex, productName, onClose }: LightboxProps) {
  const [current, setCurrent] = useState(initialIndex);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const go = useCallback(
    (dir: 1 | -1) => setCurrent((p) => (p + dir + images.length) % images.length),
    [images.length]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose, go]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="fixed inset-0 z-[200] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Photo gallery"
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 safe-area-top">
        <button
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 active:scale-95"
          aria-label="Close gallery"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-sm font-medium tabular-nums text-white/80">
          {current + 1} / {images.length}
        </span>
        <div className="w-10" aria-hidden />
      </div>

      {/* Main image */}
      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden px-4"
        onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchStart === null) return;
          const diff = touchStart - e.changedTouches[0].clientX;
          if (Math.abs(diff) > 48) go(diff > 0 ? 1 : -1);
          setTouchStart(null);
        }}
      >
        <button
          onClick={() => go(-1)}
          className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 active:scale-95"
          aria-label="Previous photo"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <AnimatePresence mode="wait">
          <motion.img
            key={current}
            src={imgixUrl(images[current]?.url, 1200, 75)}
            alt={`${productName} — photo ${current + 1}`}
            className="max-h-full max-w-full select-none rounded-xl object-contain"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.2 }}
            draggable={false}
          />
        </AnimatePresence>

        <button
          onClick={() => go(1)}
          className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-md transition-colors hover:bg-white/20 active:scale-95"
          aria-label="Next photo"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Dot strip */}
      <div className="flex justify-center gap-1.5 pb-8 pt-4 safe-area-bottom">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            aria-label={`Photo ${i + 1}`}
            className={cn(
              "h-1.5 rounded-full transition-all duration-200",
              i === current ? "w-5 bg-white" : "w-1.5 bg-white/35"
            )}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Trust pills ────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  {
    key: "cancel",
    icon: CheckCircle2,
    label: "Free cancellation",
    color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400",
  },
  {
    key: "instant",
    icon: Zap,
    label: "Instant confirmation",
    color: "text-brand-600 bg-brand-50 dark:bg-brand-950/40 dark:text-brand-400",
  },
  {
    key: "mobile",
    icon: Smartphone,
    label: "Mobile ticket",
    color: "text-violet-600 bg-violet-50 dark:bg-violet-950/40 dark:text-violet-400",
  },
  {
    key: "reschedule",
    icon: RefreshCw,
    label: "Reschedulable",
    color: "text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400",
  },
] as const;

// ─── Thumbnail row ──────────────────────────────────────────────────────────

interface ThumbRowProps {
  images: Array<{ url: string }>;
  selected: number;
  onSelect: (i: number) => void;
  onOpenAll: () => void;
  cols?: 4 | 5;
}

function ThumbRow({ images, selected, onSelect, onOpenAll, cols = 4 }: ThumbRowProps) {
  const visible = images.slice(0, cols);
  const hidden = images.length - cols;

  return (
    <div className={cn("grid gap-2", cols === 5 ? "grid-cols-5" : "grid-cols-4")}>
      {visible.map((img, i) => {
        const isOverlay = i === cols - 1 && hidden > 0;
        return (
          <button
            key={i}
            onClick={() => (isOverlay ? onOpenAll() : onSelect(i))}
            aria-label={isOverlay ? `View all ${images.length} photos` : `Photo ${i + 1}`}
            className={cn(
              "relative aspect-[4/3] overflow-hidden rounded-xl transition-all duration-200",
              !isOverlay && i === selected
                ? "ring-2 ring-brand-500 ring-offset-1"
                : "opacity-70 hover:opacity-100"
            )}
          >
            <img
              src={imgixUrl(img.url, 200, 55)}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              width={200}
              height={150}
            />
            {isOverlay && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-xl bg-black/55 backdrop-blur-[3px]">
                <Camera className="h-4 w-4 text-white" />
                <span className="text-[11px] font-semibold text-white">+{hidden}</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export interface ProductHeroProps {
  product: Product;
}

export function ProductHero({ product }: ProductHeroProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);

  const images = product.media?.filter((m) => m.type === "IMAGE") ?? [];
  const typeStyle = productTypeColors[product.productType] ?? { bg: "bg-slate-700", text: "text-white" };

  const { formatPrice } = useCurrency();
  const discount = product.listingPrice?.bestDiscount ?? 0;
  const originalPrice = product.listingPrice?.minimumPrice?.originalPrice;
  const finalPrice =
    product.listingPrice?.minimumPrice?.finalPrice ?? product.pricing?.headoutSellingPrice;
  const priceCurrency = product.listingPrice?.currencyCode ?? product.currency?.code;

  const rating = product.reviewsSummary?.averageRating;
  const reviewCount = product.reviewsSummary?.ratingsCount ?? 0;
  const duration = product.variants?.[0]?.duration;

  const typeLabel =
    product.productType === "AIRPORT_TRANSFER"
      ? "Airport Transfer"
      : product.productType.charAt(0) + product.productType.slice(1).toLowerCase();

  const nextImage = () => images.length > 1 && setSelectedImage((p) => (p + 1) % images.length);
  const prevImage = () => images.length > 1 && setSelectedImage((p) => (p - 1 + images.length) % images.length);

  const trustItems = TRUST_ITEMS.filter(({ key }) => {
    if (key === "cancel") return product.cancellationPolicy?.cancellable;
    if (key === "instant") return product.hasInstantConfirmation;
    if (key === "mobile") return product.hasMobileTicket;
    if (key === "reschedule") return product.reschedulePolicy?.reschedulable;
    return false;
  });

  return (
    <>
      <section id="overview" className="scroll-mt-20">

        {/* ── MOBILE / TABLET ── */}
        <div className="lg:hidden">

          {/* Hero image carousel */}
          <div
            className="relative overflow-hidden rounded-2xl bg-slate-100"
            style={{ aspectRatio: "16/9" }}
            onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
            onTouchEnd={(e) => {
              if (touchStart === null) return;
              const diff = touchStart - e.changedTouches[0].clientX;
              if (Math.abs(diff) > 48) {
                if (diff > 0) nextImage();
                else prevImage();
              }
              setTouchStart(null);
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.img
                key={selectedImage}
                src={imgixUrl(images[selectedImage]?.url, 640, 65)}
                srcSet={`${imgixUrl(images[selectedImage]?.url, 390, 65)} 390w, ${imgixUrl(images[selectedImage]?.url, 640, 65)} 640w, ${imgixUrl(images[selectedImage]?.url, 828, 65)} 828w`}
                sizes="100vw"
                alt={product.name}
                className="h-full w-full cursor-pointer select-none object-cover"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                onClick={() => setLightboxOpen(true)}
                draggable={false}
                fetchPriority={selectedImage === 0 ? "high" : "auto"}
              />
            </AnimatePresence>

            {/* Gradient scrim for readability */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-black/10 rounded-2xl" />

            {/* Prev / Next arrows */}
            {images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  aria-label="Previous photo"
                  className="absolute left-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-all hover:bg-black/50 active:scale-90"
                >
                  <ChevronLeft className="h-4.5 w-4.5" />
                </button>
                <button
                  onClick={nextImage}
                  aria-label="Next photo"
                  className="absolute right-3 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md transition-all hover:bg-black/50 active:scale-90"
                >
                  <ChevronRight className="h-4.5 w-4.5" />
                </button>
              </>
            )}

            {/* Top-left: type badge */}
            <span
              className={cn(
                "absolute left-3 top-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold shadow-sm",
                typeStyle.bg, typeStyle.text
              )}
            >
              {typeLabel}
            </span>

            {/* Bottom-right: photo count */}
            <button
              onClick={() => setLightboxOpen(true)}
              aria-label={`View all ${images.length} photos`}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-md transition-all hover:bg-black/60 active:scale-95"
            >
              <Camera className="h-3.5 w-3.5" />
              {images.length}
            </button>

            {/* Dot indicators */}
            {images.length > 1 && images.length <= 8 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1 rounded-full transition-all duration-200",
                      i === selectedImage ? "w-4 bg-white" : "w-1 bg-white/45"
                    )}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Thumbnail strip (mobile) */}
          {/* Thumbnail strip (mobile) */}
          {images.length > 1 && (
            <div className="mt-2.5">
              <ThumbRow
                images={images}
                selected={selectedImage}
                onSelect={setSelectedImage}
                onOpenAll={() => setLightboxOpen(true)}
                cols={4}
              />
            </div>
          )}

          {/* Content card */}
          <div className="mt-4 space-y-4">

            {/* Title + location */}
            <div>
              <h1 className="text-[1.15rem] font-bold leading-snug tracking-tight text-foreground">
                {product.name}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                {product.city?.name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {product.city.name}
                  </span>
                )}
                {rating != null && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({reviewCount.toLocaleString()})</span>
                  </span>
                )}
                {duration != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    {formatDuration(duration)}
                  </span>
                )}
              </div>
            </div>

            {/* Trust badges — 2-col pill grid */}
            {trustItems.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {trustItems.map(({ key, icon: Icon, label, color }) => (
                  <div
                    key={key}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold",
                      color
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Pricing pill */}
            {finalPrice !== undefined && (
              <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-background px-4 py-3.5 shadow-sm">
                {/* Subtle gradient wash */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50/60 via-transparent to-transparent dark:from-brand-950/20" />
                <div className="relative flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-500">
                      From
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <span className="text-[1.6rem] font-black tracking-tight leading-none">
                        {formatPrice(finalPrice, priceCurrency)}
                      </span>
                      {discount > 0 && originalPrice && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(originalPrice, priceCurrency)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      per {product.pricing?.profileType === "PER_GROUP" ? "group" : "person"}
                    </p>
                  </div>
                  {discount > 0 ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 px-3 py-1.5 text-sm font-black text-white shadow-md shadow-rose-200/50 dark:shadow-rose-900/30">
                      {discount}%&nbsp;<span className="font-semibold opacity-90">OFF</span>
                    </span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                      <Zap className="h-3.5 w-3.5 text-brand-500" />
                      Best Price
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── DESKTOP ── */}
        <div className="hidden lg:grid lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] lg:gap-5 xl:gap-6 lg:items-start">
          {/* Left: gallery */}
          <div className="flex min-w-0 flex-col gap-3">
            {/* Main image */}
            <div
              className="group relative cursor-pointer overflow-hidden rounded-2xl bg-slate-100"
              style={{ height: "340px" }}
              onClick={() => setLightboxOpen(true)}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.img
                  key={selectedImage}
                  src={imgixUrl(images[selectedImage]?.url, 828, 65)}
                  srcSet={`${imgixUrl(images[selectedImage]?.url, 640, 65)} 640w, ${imgixUrl(images[selectedImage]?.url, 828, 65)} 828w, ${imgixUrl(images[selectedImage]?.url, 1080, 65)} 1080w`}
                  sizes="65vw"
                  alt={product.name}
                  className="h-full w-full select-none object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  draggable={false}
                  fetchPriority={selectedImage === 0 ? "high" : "auto"}
                />
              </AnimatePresence>

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-black/10 rounded-2xl" />

              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => { e.stopPropagation(); prevImage(); }}
                    aria-label="Previous photo"
                    className="absolute left-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-black/50 active:scale-90"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); nextImage(); }}
                    aria-label="Next photo"
                    className="absolute right-4 top-1/2 -translate-y-1/2 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-md opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-black/50 active:scale-90"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}

              <span
                className={cn(
                  "absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold shadow-md",
                  typeStyle.bg, typeStyle.text
                )}
              >
                {typeLabel}
              </span>

              <button
                onClick={(e) => { e.stopPropagation(); setLightboxOpen(true); }}
                aria-label={`View all ${images.length} photos`}
                className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-black/40 px-3.5 py-1.5 text-xs font-medium text-white backdrop-blur-md transition-all hover:bg-black/60 active:scale-95"
              >
                <Camera className="h-3.5 w-3.5" />
                {images.length} Photos
              </button>
            </div>

            {/* Thumbnail strip */}
            {images.length > 1 && (
              <ThumbRow
                images={images}
                selected={selectedImage}
                onSelect={setSelectedImage}
                onOpenAll={() => setLightboxOpen(true)}
                cols={5}
              />
            )}
          </div>

          {/* Right: info card */}<div className="flex flex-col gap-4">

            <div className="flex flex-col rounded-2xl border border-border/60 bg-background shadow-sm overflow-hidden">
              {/* Header */}
              <div className="flex-1 px-5 pt-5 pb-3">
                <h1 className="text-lg font-bold leading-snug tracking-tight xl:text-xl">
                  {product.name}
                </h1>

                {/* Location + rating */}
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-muted-foreground">
                  {product.city?.name && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {product.city.name}
                    </span>
                  )}
                  {rating != null && (
                    <span className="flex items-center gap-1.5">
                      <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                      <span className="font-semibold text-foreground">{rating.toFixed(1)}</span>
                      <span className="text-xs">({reviewCount.toLocaleString()} reviews)</span>
                    </span>
                  )}
                </div>

                {/* Duration */}
                <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
                  {duration != null && (
                    <span className="flex items-center gap-1.5 rounded-lg bg-muted/50 px-2.5 py-1">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {formatDuration(duration)}
                    </span>
                  )}
                </div>

                {/* Trust badges — compact 2-col pill grid */}
                {trustItems.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {trustItems.map(({ key, icon: Icon, label, color }) => (
                      <div
                        key={key}
                        className={cn(
                          "flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold",
                          color
                        )}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="leading-tight">{label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pricing footer */}
              {finalPrice !== undefined && (
                <div className="relative mt-auto overflow-hidden border-t border-border/50 px-5 py-4">
                  {/* Brand gradient wash */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50/60 via-transparent to-transparent dark:from-brand-950/20" />
                  <div className="relative flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-brand-500">
                        Starting from
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-[2rem] font-black tracking-tight leading-none">
                          {formatPrice(finalPrice, priceCurrency)}
                        </span>
                        {discount > 0 && originalPrice && (
                          <span className="text-sm text-muted-foreground line-through">
                            {formatPrice(originalPrice, priceCurrency)}
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        per {product.pricing?.profileType === "PER_GROUP" ? "group" : "person"}
                      </p>
                    </div>
                    {discount > 0 ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-gradient-to-r from-rose-500 to-rose-600 px-3.5 py-2 text-sm font-black text-white shadow-md shadow-rose-200/50 dark:shadow-rose-900/30">
                        {discount}%&nbsp;<span className="font-semibold opacity-90">OFF</span>
                      </span>
                    ) : (
                      <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-50 px-3 py-2 text-xs font-bold text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                        <Zap className="h-3.5 w-3.5 text-brand-500" />
                        Best Price
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>  <ReviewsSection product={product} />

          </div></div>
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxOpen && (
          <ImageLightbox
            images={images}
            initialIndex={selectedImage}
            productName={product.name}
            onClose={() => setLightboxOpen(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}