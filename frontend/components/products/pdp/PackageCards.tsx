"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  Users,
  ShieldCheck,
  Star,
  Crown,
  X,
  ChevronRight,
  ChevronDown,
  Check,
  ShoppingCart,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import type { ProductListingPrice, ProductVariant } from "@/types/product";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDuration(ms: number | null): string {
  if (!ms) return "Flexible";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

function getDisplayPrice(variant: ProductVariant): number | undefined {
  const p = (variant as { pricing?: { headoutSellingPrice?: number } }).pricing;
  const vp = (variant as { startingHeadoutSellingPrice?: { amount?: number } })
    .startingHeadoutSellingPrice;
  return p?.headoutSellingPrice ?? vp?.amount;
}

function getVariantBadge(
  index: number,
  total: number
): { label: string; Icon: React.ElementType; color: string } | null {
  if (total <= 1) return null;
  if (index === 0)
    return { label: "Most Popular", Icon: Star, color: "bg-amber-500 text-white" };
  if (index === total - 1 && total > 2)
    return { label: "Best Value", Icon: Crown, color: "bg-emerald-500 text-white" };
  return null;
}

// Converts markdown description to a bullet list, renders **bold**
function MarkdownDescription({ text }: { text: string }) {
  const parts = text.split(/\s+-\s+/).map((s) => s.replace(/^-\s*/, "").trim()).filter(Boolean);

  if (parts.length <= 1) {
    return (
      <p
        className="text-sm leading-relaxed text-foreground/80"
        dangerouslySetInnerHTML={{
          __html: text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
        }}
      />
    );
  }

  return (
    <ul className="space-y-2">
      {parts.map((part, i) => (
        <li key={i} className="flex items-start gap-2.5">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
          <span
            className="text-sm leading-relaxed text-foreground/80"
            dangerouslySetInnerHTML={{
              __html: part.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
            }}
          />
        </li>
      ))}
    </ul>
  );
}

// ─── Package Detail Modal ─────────────────────────────────────────────────────

interface PackageModalProps {
  variant: ProductVariant;
  displayPrice: number | undefined;
  discount: number;
  originalPrice: number | undefined;
  isSelected: boolean;
  onSelect: () => void;
  onClose: () => void;
}

function PackageModal({
  variant,
  displayPrice,
  discount,
  originalPrice,
  isSelected,
  onSelect,
  onClose,
}: PackageModalProps) {
  const { formatPrice } = useCurrency();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSelect = () => { onSelect(); onClose(); };

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="fixed inset-0 z-[101] flex items-end justify-center sm:items-center sm:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ y: "100%", opacity: 0.85 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 32, stiffness: 380 }}
          className="flex w-full flex-col bg-background shadow-2xl max-h-[88svh] rounded-t-3xl sm:max-w-lg sm:rounded-3xl"
        >
          {/* Drag handle */}
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20 sm:hidden" />

          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-border/50 px-5 py-4">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Package details
              </p>
              <h3 className="mt-0.5 font-bold leading-snug tracking-tight">
                {variant.name ?? "Package"}
              </h3>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-4">

              {/* Price — compact horizontal row */}
              <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Price per person
                  </p>
                  <div className="mt-0.5 flex items-baseline gap-2">
                    <span className="text-2xl font-black tracking-tight">
                      {displayPrice !== undefined ? formatPrice(displayPrice) : "—"}
                    </span>
                    {discount > 0 && originalPrice && (
                      <span className="text-sm text-muted-foreground line-through">
                        {formatPrice(originalPrice)}
                      </span>
                    )}
                  </div>
                </div>
                {discount > 0 && (
                  <span className="shrink-0 rounded-full bg-rose-500 px-3 py-1 text-sm font-black text-white shadow">
                    -{discount}% OFF
                  </span>
                )}
              </div>

              {/* Description — markdown rendered */}
              {variant.description && (
                <div>
                  <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    About this package
                  </p>
                  <MarkdownDescription text={variant.description} />
                </div>
              )}

              {/* What's included — compact pill row */}
              <div>
                <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  What&apos;s included
                </p>
                <div className="flex flex-wrap gap-2">
                  {variant.duration != null && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-100 bg-orange-50/80 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-400">
                      <Clock className="h-3.5 w-3.5 shrink-0" />
                      {formatDuration(variant.duration)}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-400">
                    <Users className="h-3.5 w-3.5 shrink-0" />
                    {variant.pax.min}–{variant.pax.max ?? "∞"} guests
                  </span>
                  {variant.cancellationPolicy?.cancellable && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-brand-100 bg-brand-50/80 px-3 py-1.5 text-xs font-semibold text-brand-700 dark:border-brand-900/40 dark:bg-brand-950/20 dark:text-brand-400">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
                      Free cancellation
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer CTA */}
          <div className="border-t border-border/50 px-5 py-4">
            <button
              onClick={handleSelect}
              className={cn(
                "relative w-full overflow-hidden rounded-2xl py-3.5",
                "flex items-center justify-center gap-2",
                "text-[15px] font-bold text-white tracking-tight",
                "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-[45%] before:bg-white/20 before:rounded-t-2xl",
                "transition-all duration-150 active:scale-[0.98]",
                "bg-gradient-to-r from-brand-500 to-brand-600 shadow-lg shadow-brand-500/25"
              )}
            >
              {isSelected ? (
                <>
                  <Check className="h-4 w-4" />
                  Currently selected
                </>
              ) : (
                <>
                  Select this package
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </>
  );
}

// ─── Package Card ─────────────────────────────────────────────────────────────

interface PackageCardProps {
  variant: ProductVariant;
  index: number;
  total: number;
  isSelected: boolean;
  isInCart: boolean;
  discount: number;
  originalPrice: number | undefined;
  onSelect: () => void;
  onViewDetails: () => void;
}

function PackageCard({
  variant,
  index,
  total,
  isSelected,
  isInCart,
  discount,
  originalPrice,
  onSelect,
  onViewDetails,
}: PackageCardProps) {
  const { formatPrice } = useCurrency();
  const displayPrice = getDisplayPrice(variant);
  const badge = getVariantBadge(index, total);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onSelect(); }}
      aria-pressed={isSelected}
      className={cn(
        "relative overflow-hidden rounded-2xl border transition-all duration-200 cursor-pointer select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
        isSelected
          ? "border-brand-400 bg-brand-50/50 shadow-md shadow-brand-100 dark:bg-brand-950/20 dark:shadow-none"
          : "border-border/60 bg-background hover:border-brand-200 hover:shadow-sm dark:bg-card/80"
      )}
    >
      {/* Selected left accent stripe */}
      {isSelected && (
        <motion.div
          layoutId="selected-stripe"
          className="absolute inset-y-0 left-0 w-[3px] rounded-l-2xl bg-brand-500"
        />
      )}

      <div className="px-3.5 py-2.5 sm:px-4">

        {/* Top row: badge/title + price */}
        <div className="flex items-start justify-between gap-3">

          {/* Left: badge + title + pills stacked tightly */}
          <div className="min-w-0 flex-1">
            {(badge || isInCart) && (
              <div className="mb-1 flex flex-wrap gap-1.5">
                {badge && (
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", badge.color)}>
                    <badge.Icon className="h-3 w-3" />
                    {badge.label}
                  </span>
                )}
                {isInCart && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-brand-200 bg-brand-50 px-2 py-0.5 text-[11px] font-bold text-brand-700 dark:bg-brand-950/40 dark:text-brand-400">
                    <ShoppingCart className="h-3 w-3" />
                    In cart
                  </span>
                )}
              </div>
            )}

            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold leading-snug tracking-tight sm:text-[15px]">
                {variant.name ?? "Standard Package"}
              </h3>
              {isSelected && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 500, damping: 25 }}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white"
                >
                  <Check className="h-3 w-3 stroke-[3]" />
                </motion.span>
              )}
            </div>

            {/* Pills directly under title — no extra gap */}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {variant.duration != null && (
                <span className="inline-flex items-center gap-1 rounded-full border border-orange-100 bg-orange-50/80 px-2.5 py-1 text-[11px] font-semibold text-orange-700 dark:border-orange-900/40 dark:bg-orange-950/20 dark:text-orange-400">
                  <Clock className="h-3 w-3 shrink-0" />
                  {formatDuration(variant.duration)}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50/80 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:border-slate-700/40 dark:bg-slate-800/30 dark:text-slate-400">
                <Users className="h-3 w-3 shrink-0" />
                {variant.pax.min}–{variant.pax.max ?? "∞"}
              </span>
              {variant.cancellationPolicy?.cancellable && (
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50/80 px-2.5 py-1 text-[11px] font-semibold text-brand-700 dark:border-brand-900/40 dark:bg-brand-950/20 dark:text-brand-400">
                  <ShieldCheck className="h-3 w-3 shrink-0" />
                  Free cancellation
                </span>
              )}
            </div>
          </div>

          {/* Right: price */}
          {displayPrice !== undefined && (
            <div className="shrink-0 text-right">
              {discount > 0 && (
                <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                  Save {discount}%
                </span>
              )}
              <span className="text-xl font-black tracking-tight sm:text-2xl">
                {formatPrice(displayPrice)}
              </span>
              {discount > 0 && originalPrice && (
                <span className="block text-[11px] text-muted-foreground line-through">
                  {formatPrice(originalPrice)}
                </span>
              )}
              <span className="block text-[10px] text-muted-foreground">per person</span>
            </div>
          )}
        </div>

        {/* Bottom row */}
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/40 pt-2">
          <button
            onClick={(e) => { e.stopPropagation(); onViewDetails(); }}
            className="flex items-center gap-0.5 text-xs font-semibold text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
          >
            View details
            <ChevronRight className="h-3.5 w-3.5" />
          </button>

          <div className={cn(
            "rounded-full px-3.5 py-1 text-[11px] font-bold transition-all",
            isSelected ? "bg-brand-500 text-white" : "bg-muted text-muted-foreground"
          )}>
            {isSelected ? "Selected" : "Select"}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Container ────────────────────────────────────────────────────────────────

interface PackageCardsProps {
  variants: ProductVariant[];
  selectedVariantId: string | number | null;
  onSelectVariant: (id: string | number) => void;
  inCartVariantId?: string | number | null;
  listingPrice?: ProductListingPrice;
  hideHeader?: boolean;
}

const INITIAL_VISIBLE = 2;

export function PackageCards({
  variants,
  selectedVariantId,
  onSelectVariant,
  inCartVariantId,
  listingPrice,
  hideHeader = false,
}: PackageCardsProps) {
  const [showAll, setShowAll] = useState(false);
  const [openModalId, setOpenModalId] = useState<string | number | null>(null);

  if (!variants || variants.length === 0) return null;

  const sortedVariants = [...variants].sort(
    (a, b) => (getDisplayPrice(a) ?? Infinity) - (getDisplayPrice(b) ?? Infinity)
  );

  const discount = listingPrice?.bestDiscount ?? 0;
  const originalPrice = listingPrice?.minimumPrice?.originalPrice;
  const openVariant = sortedVariants.find((v) => v.id === openModalId) ?? null;

  const visibleVariants = showAll ? sortedVariants : sortedVariants.slice(0, INITIAL_VISIBLE);
  const hiddenCount = sortedVariants.length - INITIAL_VISIBLE;

  return (
    <section id="packages" className="scroll-mt-24">
      {/* Header */}
      {!hideHeader && (
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Choose a Package</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Select the option that suits you best
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {sortedVariants.length} option{sortedVariants.length !== 1 ? "s" : ""}
          </span>
        </div>
      )}

      {/* Cards */}
      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {visibleVariants.map((variant, index) => (
            <motion.div
              key={String(variant.id)}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
            >
              <PackageCard
                variant={variant}
                index={index}
                total={sortedVariants.length}
                isSelected={selectedVariantId === variant.id}
                isInCart={
                  inCartVariantId != null &&
                  String(inCartVariantId) === String(variant.id)
                }
                discount={discount}
                originalPrice={originalPrice}
                onSelect={() => onSelectVariant(variant.id)}
                onViewDetails={() => setOpenModalId(variant.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Show more / less */}
      {sortedVariants.length > INITIAL_VISIBLE && (
        <button
          onClick={() => setShowAll((p) => !p)}
          className={cn(
            "mt-2.5 flex w-full items-center justify-between gap-3 px-4 py-2.5",
            "rounded-2xl border border-brand-200/70 bg-brand-50/50",
            "transition-all duration-200",
            "hover:bg-brand-50 hover:border-brand-300",
            "dark:border-brand-800/40 dark:bg-brand-950/20 dark:hover:bg-brand-950/40"
          )}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-brand-600 dark:text-brand-400">
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform duration-200",
                showAll && "rotate-180"
              )}
            />
            {showAll
              ? "Show fewer options"
              : `View ${hiddenCount} more option${hiddenCount !== 1 ? "s" : ""}`}
          </div>
          {!showAll && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-[10px] font-black text-white">
              {hiddenCount}
            </span>
          )}
        </button>
      )}

      {/* Detail modal */}
      <AnimatePresence>
        {openVariant && (
          <PackageModal
            variant={openVariant}
            displayPrice={getDisplayPrice(openVariant)}
            discount={discount}
            originalPrice={originalPrice}
            isSelected={selectedVariantId === openVariant.id}
            onSelect={() => onSelectVariant(openVariant.id)}
            onClose={() => setOpenModalId(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
