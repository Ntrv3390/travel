"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Package } from "lucide-react";
import { PackageCards } from "./PackageCards";
import type { ProductListingPrice, ProductVariant } from "@/types/product";

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

interface PackageSelectionModalProps {
  variants: ProductVariant[];
  selectedVariantId: string | number | null;
  onSelectVariant: (id: string | number) => void;
  inCartVariantId?: string | number | null;
  listingPrice?: ProductListingPrice;
  onClose: () => void;
}

export function PackageSelectionModal({
  variants,
  selectedVariantId,
  onSelectVariant,
  inCartVariantId,
  listingPrice,
  onClose,
}: PackageSelectionModalProps) {
  const isDesktop = useIsDesktop();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSelectVariant = (id: string | number) => {
    onClose();
    onSelectVariant(id);
  };

  const panelVariants = isDesktop
    ? {
        initial: { opacity: 0, scale: 0.96, y: 12 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.96, y: 12 },
      }
    : {
        initial: { y: "100%", opacity: 0.9 },
        animate: { y: 0, opacity: 1 },
        exit: { y: "100%", opacity: 0 },
      };

  const transition = isDesktop
    ? { type: "spring" as const, damping: 28, stiffness: 350 }
    : { type: "spring" as const, damping: 32, stiffness: 380 };

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[98] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Positioning container */}
      <div
        className="fixed inset-0 z-[99] flex items-end justify-center lg:items-center lg:p-6"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          variants={panelVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
          className="flex w-full flex-col bg-background shadow-2xl max-h-[88svh] rounded-t-3xl lg:max-w-2xl lg:rounded-3xl lg:max-h-[80vh]"
        >
          {/* Drag handle — mobile only */}
          <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/20 lg:hidden" />

          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-border/50 px-5 py-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                <Package className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {variants.length} option{variants.length !== 1 ? "s" : ""} available
                </p>
                <h2 className="mt-0.5 text-base font-bold leading-snug tracking-tight sm:text-lg">
                  Choose a Package
                </h2>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close package selection"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-muted/70 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            <PackageCards
              variants={variants}
              selectedVariantId={selectedVariantId}
              onSelectVariant={handleSelectVariant}
              inCartVariantId={inCartVariantId}
              listingPrice={listingPrice}
              hideHeader
            />
          </div>
        </motion.div>
      </div>
    </>
  );
}
