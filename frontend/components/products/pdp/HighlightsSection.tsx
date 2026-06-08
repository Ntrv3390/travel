"use client";

import { motion } from "framer-motion";
import { XCircle, Sparkles, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface HighlightsSectionProps {
  highlightsHtml: string | null;
  highlights: string;
  inclusionsHtml: string | null;
  inclusions: string;
  exclusionsHtml: string | null;
  exclusions: string;
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
  exclusionsHtml,
  exclusions,
}: HighlightsSectionProps) {
  const highlightItems = parseListItems(highlightsHtml, highlights);
  const inclusionItems = parseListItems(inclusionsHtml, inclusions);
  const exclusionItems = parseListItems(exclusionsHtml, exclusions);

  const hasIncEx = inclusionItems.length > 0 || exclusionItems.length > 0;

  return (
    <div className="space-y-8">

      {/* ── Highlights ─────────────────────────────────────────────── */}
      {highlightItems.length > 0 && (
        <section id="highlights" className="scroll-mt-20">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-950/40">
              <Sparkles className="h-3.5 w-3.5 text-brand-500" />
            </span>
            <h2 className="text-base font-bold tracking-tight sm:text-lg">
              Highlights
            </h2>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {highlightItems.map((item, i) => (
              <FadeItem
                key={i}
                index={i}
                className={cn(
                  "group flex items-start gap-3 rounded-xl border border-border/50",
                  "bg-background px-4 py-3.5 transition-colors duration-200",
                  "hover:border-brand-200 hover:bg-brand-50/40",
                  "dark:hover:border-brand-800/50 dark:hover:bg-brand-950/20"
                )}
              >
                <span className="mt-[3px] flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/50 transition-colors duration-200 group-hover:bg-brand-200 dark:group-hover:bg-brand-800/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
                </span>
                <span className="text-sm leading-[1.55] text-foreground/90">
                  {item}
                </span>
              </FadeItem>
            ))}
          </div>
        </section>
      )}

      {/* ── Inclusions + Exclusions ─────────────────────────────────── */}
      {hasIncEx && (
        <section id="included" className="scroll-mt-20">
          <h2 className="mb-4 text-base font-bold tracking-tight sm:text-lg">
            What&apos;s Included
          </h2>

          <div
            className={cn(
              "grid gap-3",
              inclusionItems.length > 0 && exclusionItems.length > 0
                ? "md:grid-cols-2"
                : "grid-cols-1"
            )}
          >
            {/* Inclusions */}
            {inclusionItems.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-emerald-100 bg-emerald-50/40 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                <div className="flex items-center gap-2 border-b border-emerald-100 dark:border-emerald-900/40 px-4 py-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500">
                    <Check className="h-3 w-3 text-white stroke-[2.5]" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                    Included
                  </span>
                </div>
                <ul className="divide-y divide-emerald-100/70 dark:divide-emerald-900/30">
                  {inclusionItems.map((item, i) => (
                    <FadeItem
                      key={i}
                      index={i}
                      className="flex items-start gap-2.5 px-4 py-2.5"
                    >
                      <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500 stroke-[2.5]" />
                      <span className="text-sm leading-snug text-foreground/80">
                        {item}
                      </span>
                    </FadeItem>
                  ))}
                </ul>
              </div>
            )}

            {/* Exclusions */}
            {exclusionItems.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-rose-100 bg-rose-50/30 dark:border-rose-900/40 dark:bg-rose-950/15">
                <div className="flex items-center gap-2 border-b border-rose-100 dark:border-rose-900/40 px-4 py-2.5">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-400/80">
                    <XCircle className="h-3.5 w-3.5 text-white" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-widest text-rose-600 dark:text-rose-400">
                    Not included
                  </span>
                </div>
                <ul className="divide-y divide-rose-100/60 dark:divide-rose-900/30">
                  {exclusionItems.map((item, i) => (
                    <FadeItem
                      key={i}
                      index={i}
                      className="flex items-start gap-2.5 px-4 py-2.5"
                    >
                      <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400/80" />
                      <span className="text-sm leading-snug text-foreground/60">
                        {item}
                      </span>
                    </FadeItem>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}