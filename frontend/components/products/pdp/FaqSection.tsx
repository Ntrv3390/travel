"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  HelpCircle,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface FaqSectionProps {
  faqHtml: string | null;
}

interface FaqItem {
  question: string;
  answer: string;
}

function parseFaq(html: string): FaqItem[] {
  const items: FaqItem[] = [];

  const h3Regex =
    /<h3[^>]*>(.*?)<\/h3>([\s\S]*?)(?=<h3|$)/gi;

  let match;

  while ((match = h3Regex.exec(html)) !== null) {
    const question = match[1]
      .replace(/<[^>]+>/g, "")
      .trim();

    const answer = match[2]
      .replace(/<[^>]+>/g, "")
      .trim();

    if (question && answer) {
      items.push({
        question,
        answer,
      });
    }
  }

  return items;
}

export function FaqSection({
  faqHtml,
}: FaqSectionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  if (!faqHtml) return null;

  const items = parseFaq(faqHtml);

  if (items.length === 0) {
    return (
      <section
        id="faq"
        className="scroll-mt-24"
      >
        <div className="mb-6">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-3 py-1 text-xs font-medium text-brand-700">
            <HelpCircle className="h-3.5 w-3.5" />
            Help Center
          </div>

          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div
          className="rounded-[28px] border border-white/40 bg-white/80 p-5 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.06)]"
          dangerouslySetInnerHTML={{ __html: faqHtml }}
        />
      </section>
    );
  }

  return (
    <section
      id="faq"
      className="scroll-mt-24"
    >
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-brand-50/60 px-3 py-1 text-xs font-medium text-brand-700">
          <HelpCircle className="h-3.5 w-3.5" />
          Help Center
        </div>

        <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
          Frequently Asked Questions
        </h2>

        <p className="mt-2 text-sm text-muted-foreground">
          Everything travelers usually ask before booking.
        </p>
      </div>

      {/* FAQ Items */}
      <div className="space-y-3">
        {items.map((item, i) => {
          const isOpen = openIndex === i;

          return (
            <motion.div
              key={i}
              layout
              transition={{
                duration: 0.25,
                ease: "easeInOut",
              }}
              className={cn(
                "overflow-hidden rounded-[24px] border backdrop-blur-xl transition-all duration-300",
                isOpen
                  ? "border-brand-200 bg-gradient-to-br from-brand-50/70 via-background to-brand-50/30 shadow-[0_12px_40px_rgba(0,0,0,0.08)]"
                  : "border-border/60 bg-white/70 hover:border-brand-100 hover:shadow-[0_8px_30px_rgba(0,0,0,0.05)]"
              )}
            >
              <button
                onClick={() =>
                  setOpenIndex(
                    isOpen ? null : i
                  )
                }
                className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left sm:px-6"
                aria-expanded={isOpen}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      isOpen
                        ? "bg-brand-500 text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    ?
                  </div>

                  <span className="text-sm font-semibold leading-6 text-foreground sm:text-base">
                    {item.question}
                  </span>
                </div>

                <motion.div
                  animate={{
                    rotate: isOpen
                      ? 180
                      : 0,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors",
                    isOpen
                      ? "bg-brand-100 text-brand-600"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <ChevronDown className="h-4 w-4" />
                </motion.div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{
                      height: 0,
                      opacity: 0,
                    }}
                    animate={{
                      height: "auto",
                      opacity: 1,
                    }}
                    exit={{
                      height: 0,
                      opacity: 0,
                    }}
                    transition={{
                      height: {
                        duration: 0.3,
                        ease: "easeInOut",
                      },
                      opacity: {
                        duration: 0.2,
                      },
                    }}
                  >
                    <div className="border-t border-border/50 px-5 pb-5 pt-4 sm:px-6">
                      <p className="text-sm leading-7 text-muted-foreground">
                        {item.answer}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Support CTA */}
      <div className="mt-6 rounded-[28px] border border-border/60 bg-gradient-to-br from-muted/40 to-background p-5 text-center backdrop-blur-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50">
          <MessageCircle className="h-5 w-5 text-brand-600" />
        </div>

        <h3 className="mt-3 font-semibold">
          Still have questions?
        </h3>

        <p className="mt-1 text-sm text-muted-foreground">
          Our support team is here to help before you book.
        </p>

        <Link
          href="/help"
          className="
            mt-4
            inline-flex
            items-center
            justify-center
            rounded-full
            bg-brand-500
            px-5
            py-2.5
            text-sm
            font-medium
            text-white
            transition-all
            duration-200
            hover:bg-brand-600
            hover:shadow-lg
            active:scale-[0.98]
          "
        >
          Contact Support
        </Link>
      </div>
    </section>
  );
}