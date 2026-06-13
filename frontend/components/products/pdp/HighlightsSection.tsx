"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";

interface HighlightsSectionProps {
  highlightsHtml: string | null;
  highlights: string;
  inclusionsHtml: string | null;
  inclusions: string;
}

function parseListItems(html: string | null, fallback: string): string[] {
  if (html) {
    const items = html.match(/<li[^>]*>(.*?)<\/li>/gs);
    if (items) {
      return items.map((item) => item.replace(/<[^>]+>/g, "").trim());
    }
  }
  return fallback
    .split("\n")
    .map((s) => s.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);
}

const HIGHLIGHTS_PREVIEW = 2;
const INCLUSIONS_PREVIEW = 4;

export function HighlightsSection({
  highlightsHtml,
  highlights,
  inclusionsHtml,
  inclusions,
}: HighlightsSectionProps) {
  const highlightItems = parseListItems(highlightsHtml, highlights);
  const inclusionItems = parseListItems(inclusionsHtml, inclusions);
  const [modalOpen, setModalOpen] = useState(false);
  const [showAllInclusions, setShowAllInclusions] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [modalOpen]);

  return (
    <div className="space-y-6">

      {/* ── Highlights ──────────────────────────────────────────────── */}
      {highlightItems.length > 0 && (
        <section id="highlights" className="scroll-mt-20">
          {/* Header row */}
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/40">
                <Sparkles className="h-3.5 w-3.5 text-brand-500" />
              </span>
              <h2 className="text-base font-bold tracking-tight sm:text-lg">Highlights</h2>
            </div>
            {highlightItems.length > HIGHLIGHTS_PREVIEW && (
              <button
                onClick={() => setModalOpen(true)}
                className="shrink-0 text-xs font-semibold text-brand-600 underline-offset-2 hover:underline"
              >
                See all {highlightItems.length}
              </button>
            )}
          </div>

          {/* Preview — first 2, one-line clamp */}
          <div className="space-y-2.5">
            {highlightItems.slice(0, HIGHLIGHTS_PREVIEW).map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background p-4"
              >
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/40">
                  <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                </span>
                <p className="line-clamp-2 text-sm leading-relaxed text-foreground/90">
                  {item}
                </p>
              </div>
            ))}
          </div>

          {/* "View all" trigger button */}
          {highlightItems.length > HIGHLIGHTS_PREVIEW && (
            <button
              onClick={() => setModalOpen(true)}
              className={cn(
                "mt-3 flex w-full items-center justify-center gap-2",
                "rounded-2xl border border-dashed border-border/70 bg-muted/30 py-3",
                "text-xs font-semibold text-muted-foreground",
                "transition-colors hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-600"
              )}
            >
              <ChevronDown className="h-3.5 w-3.5" />
              View all {highlightItems.length} highlights
            </button>
          )}
        </section>
      )}

      {/* ── Highlights modal / bottom-sheet ─────────────────────────── */}
      <AnimatePresence>
        {modalOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm"
              onClick={() => setModalOpen(false)}
            />

            {/* Sheet — full-width bottom on mobile, centered card on sm+ */}
            <div
              className="fixed inset-0 z-[101] flex items-end justify-center sm:items-center sm:p-4"
              onClick={(e) => {
                if (e.target === e.currentTarget) setModalOpen(false);
              }}
            >
              <motion.div
                initial={{ y: "100%", opacity: 0.8 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: "100%", opacity: 0 }}
                transition={{ type: "spring", damping: 32, stiffness: 380 }}
                className={cn(
                  "flex w-full flex-col bg-background shadow-2xl",
                  "max-h-[85svh]",
                  "rounded-t-3xl sm:max-w-lg sm:rounded-3xl"
                )}
              >
                {/* Drag handle — mobile only */}
                <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted-foreground/25 sm:hidden" />

                {/* Modal header */}
                <div className="flex items-center justify-between border-b border-border/50 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-brand-500" />
                    <h3 className="font-bold tracking-tight">All Highlights</h3>
                    <span className="ml-1 rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-600 dark:bg-brand-950/40 dark:text-brand-400">
                      {highlightItems.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setModalOpen(false)}
                    aria-label="Close highlights"
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:bg-muted/70"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Scrollable list */}
                <div className="overflow-y-auto px-5 pb-8 pt-4">
                  <div className="space-y-3">
                    {highlightItems.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-2xl border border-border/60 bg-muted/30 p-4"
                      >
                        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/40">
                          <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                        </span>
                        <p className="text-sm leading-relaxed text-foreground/90">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      {/* ── Included ────────────────────────────────────────────────── */}
      {inclusionItems.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-emerald-100 px-5 py-4 dark:border-emerald-900/40">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
              <Check className="h-4 w-4 stroke-[2.5] text-white" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">Included</h3>
              <p className="text-xs text-muted-foreground">Everything covered in this experience</p>
            </div>
            <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
              {inclusionItems.length} items
            </span>
          </div>

          {/* Compact list rows */}
          <div className="divide-y divide-emerald-100/60 dark:divide-emerald-900/30">
            {inclusionItems
              .slice(0, showAllInclusions ? undefined : INCLUSIONS_PREVIEW)
              .map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3">
                  <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
                    <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="text-sm text-foreground/80">{item}</span>
                </div>
              ))}
          </div>

          {/* Expand / collapse */}
          {inclusionItems.length > INCLUSIONS_PREVIEW && (
            <div className="border-t border-emerald-100 px-5 py-3 dark:border-emerald-900/40">
              <button
                onClick={() => setShowAllInclusions(!showAllInclusions)}
                className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 transition-colors hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-300"
              >
                {showAllInclusions
                  ? "Show less"
                  : `+${inclusionItems.length - INCLUSIONS_PREVIEW} more included`}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-200",
                    showAllInclusions && "rotate-180"
                  )}
                />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
