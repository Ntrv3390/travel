"use client";

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import { useCartContext } from "@/context/CartContext";

const BookingModal = dynamic(
  () => import("./BookingModal").then((m) => ({ default: m.BookingModal })),
  { ssr: false },
);
const SeatmapBookingModal = dynamic(
  () => import("./SeatmapBookingModal").then((m) => ({ default: m.SeatmapBookingModal })),
  { ssr: false },
);
const PackageSelectionModal = dynamic(
  () => import("./pdp/PackageSelectionModal").then((m) => ({ default: m.PackageSelectionModal })),
  { ssr: false },
);
import { ProductHero } from "./pdp/ProductHero";
import { PackageCards } from "./pdp/PackageCards";
import { HighlightsSection } from "./pdp/HighlightsSection";
import { AboutSection } from "./pdp/AboutSection";
import { FaqSection } from "./pdp/FaqSection";
import { MeetingPointSection } from "./pdp/MeetingPointSection";
import { PoliciesSection } from "./pdp/PoliciesSection";
import { StickyBookingBar } from "./pdp/StickyBookingBar";
import { StickyBookingCard } from "./pdp/StickyBookingCard";
import type { Product } from "@/types/product";

interface ProductDetailProps {
  product: Product;
}

export function ProductDetail({ product }: ProductDetailProps) {
  const { cart } = useCartContext();

  // Any cart item for this product — used only to set the initially-highlighted variant
  const anyCartItem = useMemo(() => {
    if (!cart?.items) return null;
    const pid = String(product.id);
    return cart.items.find((i) => i.experienceId === pid || i.productId === pid) ?? null;
  }, [cart, product.id]);

  const [selectedVariantId, setSelectedVariantId] = useState<string | number | null>(
    anyCartItem?.variantId ?? null
  );

  // Cart item for whichever variant is currently selected — drives modal pre-fill
  const cartItem = useMemo(() => {
    if (!cart?.items || !selectedVariantId) return null;
    const pid = String(product.id);
    return (
      cart.items.find(
        (i) =>
          (i.experienceId === pid || i.productId === pid) &&
          String(i.variantId) === String(selectedVariantId)
      ) ?? null
    );
  }, [cart, product.id, selectedVariantId]);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [packageSelectionOpen, setPackageSelectionOpen] = useState(false);

  const finalPrice =
    product.listingPrice?.minimumPrice?.finalPrice ??
    product.pricing.headoutSellingPrice;

  const priceCurrency =
    product.listingPrice?.currencyCode ??
    product.currency?.code;

  const address = (
    product as {
      address?:
      | {
        address?: string;
        city?: string;
        postalCode?: string;
        country?: string;
      }
      | null;
    }
  ).address;

  const cutoffTime = (
    product as { cutoffTimeInMinutes?: number | null }
  ).cutoffTimeInMinutes;

  const openPackageSelection = useCallback(() => {
    setPackageSelectionOpen(true);
  }, []);

  const handleSelectVariant = useCallback((id: string | number) => {
    setSelectedVariantId(id);
    setBookingModalOpen(true);
  }, []);

  const selectedVariant = product.variants?.find(
    (v) => v.id === selectedVariantId
  );

  return (
    <div className="relative">
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 pb-[72px] lg:pb-0">
        {/* Hero */}
        <ProductHero product={product} />

        {/* Desktop two-column layout for packages + booking */}
        <div className="lg:grid lg:grid-cols-[1fr,380px] lg:gap-8">
          <div className="min-w-0 space-y-4 sm:space-y-6 lg:space-y-8">
            {/* Highlights */}
            {(product.content?.highlights ||
              product.content?.inclusions ||
              product.content?.exclusions) && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1, duration: 0.35 }}
                >
                  <HighlightsSection
                    highlightsHtml={product.content.highlightsHtml}
                    highlights={product.content.highlights}
                    inclusionsHtml={product.content.inclusionsHtml}
                    inclusions={product.content.inclusions}
                  />
                </motion.div>
              )}

            {/* Packages */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.35 }}
            >
              <PackageCards
                variants={product.variants ?? []}
                selectedVariantId={selectedVariantId}
                onSelectVariant={handleSelectVariant}
                inCartVariantId={cartItem?.variantId}
                listingPrice={product.listingPrice}
              />
            </motion.div>

            {/* About */}
            {product.content?.shortSummary && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25, duration: 0.35 }}
              >
                <AboutSection
                  shortSummary={product.content.shortSummary}
                  summaryHtml={product.content.summaryHtml}
                />
              </motion.div>
            )}

            {/* FAQ */}
            {product.content?.faqHtml && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.35 }}
              >
                <FaqSection faqHtml={product.content.faqHtml} />
              </motion.div>
            )}

            {/* Meeting Point */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.35 }}
            >
              <MeetingPointSection
                address={product.startLocation}
                endLocation={product.endLocation}
                mainAddress={address}
              />
            </motion.div>

            {/* Policies */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45, duration: 0.35 }}
            >
              <PoliciesSection
                cancellationPolicy={product.cancellationPolicy}
                reschedulePolicy={product.reschedulePolicy}
                cutoffTimeInMinutes={cutoffTime}
              />
            </motion.div>
          </div>

          {/* Desktop sticky booking card */}
          <div className="hidden min-w-0 lg:block">
            <StickyBookingCard
              price={finalPrice}
              priceCurrency={priceCurrency}
              originalPrice={product.listingPrice?.minimumPrice?.originalPrice}
              discount={product.listingPrice?.bestDiscount ?? 0}
              productName={product.name}
              hasFreeCancellation={product.cancellationPolicy?.cancellable}
              hasInstantConfirmation={product.hasInstantConfirmation}
              hasMobileTicket={product.hasMobileTicket}
              duration={product.variants?.[0]?.duration}
              onCheckAvailability={openPackageSelection}
            />
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom CTA */}
      <StickyBookingBar
        price={finalPrice}
        priceCurrency={priceCurrency}
        hasFreeCancellation={product.cancellationPolicy?.cancellable}
        hasInstantConfirmation={product.hasInstantConfirmation}
        onCheckAvailability={openPackageSelection}
      />

      {/* Package selection modal — opens when user clicks Check Availability */}
      <AnimatePresence>
        {packageSelectionOpen && (
          <PackageSelectionModal
            variants={product.variants ?? []}
            selectedVariantId={selectedVariantId}
            onSelectVariant={handleSelectVariant}
            inCartVariantId={cartItem?.variantId}
            listingPrice={product.listingPrice}
            onClose={() => setPackageSelectionOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Booking modals */}
      <AnimatePresence>
        {bookingModalOpen && selectedVariant && (
          product.inventorySelectionType === "SEATMAP" ? (
            <SeatmapBookingModal
              product={product}
              variant={selectedVariant}
              cartItemId={cartItem?.id ?? null}
              initialDate={cartItem?.date ?? null}
              onClose={() => setBookingModalOpen(false)}
            />
          ) : (
            <BookingModal
              product={product}
              variant={selectedVariant}
              cartItemId={cartItem?.id ?? null}
              initialDate={cartItem?.date ?? null}
              initialSlotId={cartItem?.inventoryId ?? null}
              initialGuests={cartItem?.guestCounts ?? null}
              onClose={() => setBookingModalOpen(false)}
            />
          )
        )}
      </AnimatePresence>
    </div>
  );
}