"use client";

import { motion } from "framer-motion";
import { Sparkles, Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

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

function FadeItem({
  index,
  children,
  className,
}: {
  index: number;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ delay: index * 0.045, duration: 0.28, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function HighlightsSection({
  highlightsHtml,
  highlights,
  inclusionsHtml,
  inclusions,
}: HighlightsSectionProps) {
  const highlightItems = parseListItems(highlightsHtml, highlights);
  const inclusionItems = parseListItems(inclusionsHtml, inclusions);
  const [showAllInclusions, setShowAllInclusions] = useState(false);
  return (
    <div className="space-y-8">

      {/* ── Highlights ─────────────────────────────────────────────── */}
      {highlightItems.length > 0 && (
        <section id="highlights" className="scroll-mt-20">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-50 dark:bg-brand-950/40">
              <Sparkles className="h-4 w-4 text-brand-500" />
            </span>

            <div>
              <h2 className="text-lg font-bold tracking-tight">
                Highlights
              </h2>
              <p className="text-sm text-muted-foreground">
                Key experiences included in this activity
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {highlightItems.map((item, i) => (
              <FadeItem key={i} index={i}>
                <div
                  className={cn(
                    "group h-full rounded-2xl border",
                    "border-border/60 bg-background",
                    "p-4 transition-all duration-200",
                    "hover:border-brand-200",
                    "hover:bg-brand-50/40",
                    "hover:shadow-sm",
                    "dark:hover:border-brand-800/50",
                    "dark:hover:bg-brand-950/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center",
                        "rounded-xl bg-brand-100",
                        "dark:bg-brand-900/40"
                      )}
                    >
                      <Sparkles className="h-4 w-4 text-brand-500" />
                    </div>

                    <p className="text-sm leading-relaxed text-foreground/90">
                      {item}
                    </p>
                  </div>
                </div>
              </FadeItem>
            ))}
          </div>
        </section>
      )}

      {inclusionItems.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20">
          {/* Header */}
          <div className="flex items-center gap-3 border-b border-emerald-100 dark:border-emerald-900/40 px-5 py-4">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 shadow-sm">
              <Check className="h-4 w-4 text-white stroke-[2.5]" />
            </span>

            <div className="flex-1">
              <h3 className="font-semibold text-emerald-800 dark:text-emerald-300">
                Included
              </h3>
              <p className="text-xs text-muted-foreground">
                Everything covered in this experience
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {inclusionItems.map((item, i) => (
              <FadeItem
                key={i}
                index={i}
                className={cn(
                  !showAllInclusions && i >= 4 && "hidden sm:block"
                )}
              >
                <motion.div
                  whileHover={{ y: -2, scale: 1.01 }}
                  transition={{
                    type: "spring",
                    stiffness: 400,
                    damping: 25,
                  }}
                  className={cn(
                    "group flex h-full items-start gap-3 rounded-xl border",
                    "border-emerald-100 bg-white/80 px-4 py-3",
                    "transition-all duration-300",
                    "hover:border-emerald-300",
                    "hover:shadow-md hover:shadow-emerald-100/60",
                    "dark:border-emerald-900/40",
                    "dark:bg-background/40",
                    "dark:hover:border-emerald-700/60"
                  )}
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 transition-all duration-300 group-hover:bg-emerald-500">
                    <Check className="h-3 w-3 text-emerald-600 transition-colors duration-300 group-hover:text-white" />
                  </div>

                  <span className="text-sm leading-relaxed text-foreground/80">
                    {item}
                  </span>
                </motion.div>
              </FadeItem>
            ))}
          </div>

          {/* Mobile Expand / Collapse */}
          {inclusionItems.length > 4 && (
            <div className="border-t border-emerald-100 px-4 py-4 sm:hidden dark:border-emerald-900/40">
              <button
                onClick={() => setShowAllInclusions(!showAllInclusions)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/80 px-4 py-3 text-sm font-medium text-emerald-700 transition-all hover:bg-white dark:bg-background/40"
              >
                {showAllInclusions
                  ? "Show less"
                  : `View all included items (${inclusionItems.length})`}

                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform duration-300",
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