"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { ProductDetailProvider } from "@/context/ProductDetailContext";
import { useCartContext } from "@/context/CartContext";
import { ProductHero } from "./pdp/ProductHero";
import { PackageCards } from "./pdp/PackageCards";
import { AvailabilitySection } from "./pdp/AvailabilitySection";
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
  const availabilityRef = useRef<HTMLDivElement>(null);

  const cartItem = useMemo(() => {
    if (!cart?.items) return null;
    const pid = String(product.id);
    return (
      cart.items.find(
        (i) => i.experienceId === pid || i.productId === pid
      ) ?? null
    );
  }, [cart, product.id]);

  const [selectedVariantId, setSelectedVariantId] = useState<
    string | number | null
  >(cartItem?.variantId ?? product.variants?.[0]?.id ?? null);

  const symbol = product.currency?.localSymbol ?? "$";
  const finalPrice =
    product.listingPrice?.minimumPrice?.finalPrice ??
    product.pricing.headoutSellingPrice;

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

  const scrollToAvailability = useCallback(() => {
    setTimeout(() => {
      const el = document.getElementById("packages");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  }, []);

  const handleSelectVariant = useCallback(
    (id: string | number) => {
      setSelectedVariantId(id);
      scrollToAvailability();
    },
    [scrollToAvailability]
  );

  const selectedVariant = product.variants?.find(
    (v) => v.id === selectedVariantId
  );

  // Derive pax from the selected variant (falls back to first variant)
  const pax = selectedVariant?.pax ?? product.variants?.[0]?.pax ?? null;

  const imageUrl =
    product.media?.find((m) => m.type === "IMAGE")?.url?.replace(/^\/\//, "https://") ?? "";

  return (
    <div className="relative">
      <div className="space-y-3 sm:space-y-4 lg:space-y-6 pb-[72px] lg:pb-0">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <ProductHero product={product} />
        </motion.div>

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
                    exclusionsHtml={product.content.exclusionsHtml}
                    exclusions={product.content.exclusions}
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
                symbol={symbol}
              />
            </motion.div>

            {/* Full Availability Calendar */}
            {product.inventorySelectionType === "NORMAL" &&
              selectedVariantId != null &&
              product.id && (
                <div ref={availabilityRef}>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3, duration: 0.35 }}
                  >
                    <ProductDetailProvider
                      productId={String(product.id)}
                      productName={product.name}
                      variantId={selectedVariantId}
                      variantName={selectedVariant?.name ?? ""}
                      imageUrl={imageUrl}
                      cartItemId={cartItem?.id ?? null}
                      initialDate={cartItem?.date ?? null}
                      initialGuests={cartItem?.guestCounts ?? null}
                      pax={pax}
                    >
                      <AvailabilitySection />
                    </ProductDetailProvider>
                  </motion.div>
                </div>
              )}

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
              symbol={symbol}
              productName={product.name}
              hasFreeCancellation={product.cancellationPolicy?.cancellable}
              hasInstantConfirmation={product.hasInstantConfirmation}
              hasMobileTicket={product.hasMobileTicket}
              duration={product.variants?.[0]?.duration}
              onCheckAvailability={scrollToAvailability}
            />
          </div>
        </div>
      </div>

      {/* Mobile sticky bottom CTA */}
      <StickyBookingBar
        price={finalPrice}
        symbol={symbol}
        onCheckAvailability={scrollToAvailability}
      />
    </div>
  );
}