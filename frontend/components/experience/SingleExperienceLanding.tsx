"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import type { Experience } from "@/types/experience";
import { buildSingleExperienceContent } from "@/components/experience/single-experience/contentData";
import { HeroGallery } from "@/components/experience/single-experience/HeroGallery";
import { ExperienceHeader } from "@/components/experience/single-experience/ExperienceHeader";
import { SectionNav } from "@/components/experience/single-experience/SectionNav";
import { ContentSections } from "@/components/experience/single-experience/ContentSections";
import { BookingPanel } from "@/components/experience/single-experience/BookingPanel";
import { PackageOptionsSection } from "@/components/experience/single-experience/PackageOptionsSection";

interface SingleExperienceLandingProps {
  experience: Experience;
  related: Experience[];
}

const sectionMotion = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const sectionLinks = [
  { href: "#packages", label: "Packages" },
  { href: "#included", label: "Included" },
  { href: "#about", label: "About" },
  { href: "#reviews", label: "Reviews" },
  { href: "#combinations", label: "Combinations" },
  { href: "#more-ways", label: "More ways" },
];

const fallbackSlots = ["09:00", "11:30", "14:00", "18:15"];

function formatDisplayPrice(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency || "USD"} ${value.toFixed(0)}`;
  }
}

function extractInventorySlots(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    return [];
  }

  const candidates: string[] = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }

    if (!value || typeof value !== "object") {
      return;
    }

    const obj = value as Record<string, unknown>;
    const raw = (obj.startDateTime || obj.startTime || obj.time) as string | undefined;
    if (typeof raw === "string" && raw.length >= 5) {
      const slot = raw.includes("T") ? raw.split("T")[1]?.slice(0, 5) : raw.slice(0, 5);
      if (slot && /^\d{2}:\d{2}$/.test(slot)) {
        candidates.push(slot);
      }
    }

    Object.values(obj).forEach(visit);
  };

  visit(payload);

  return [...new Set(candidates)].sort();
}

export function SingleExperienceLanding({ experience, related }: SingleExperienceLandingProps) {
  const content = buildSingleExperienceContent(experience, related);

  const [cardImageTick, setCardImageTick] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const moreWaysRailRef = useRef<HTMLDivElement | null>(null);

  const variantId = content.experience.options[0]?.headoutVariantId;
  const priceLabel = formatDisplayPrice(
    content.experience.options[0]?.price ?? 0,
    content.experience.options[0]?.currency ?? "USD",
  );

  useEffect(() => {
    const imageInterval = window.setInterval(() => {
      setCardImageTick((current) => current + 1);
    }, 4000);
    return () => window.clearInterval(imageInterval);
  }, []);

  const scrollMoreWays = (direction: "left" | "right") => {
    const rail = moreWaysRailRef.current;
    if (!rail) {
      return;
    }

    const card = rail.querySelector<HTMLElement>("[data-card-width]");
    const fallbackAmount = Math.max(rail.clientWidth * 0.82, 240);
    const scrollBy = card?.offsetWidth ? card.offsetWidth + 12 : fallbackAmount;

    rail.scrollBy({
      left: direction === "left" ? -scrollBy : scrollBy,
      behavior: "smooth",
    });
  };

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    setSelectedSlot("");
  };

  const handleSelectOptions = () => {
    const target = document.getElementById("packages");
    if (!target) {
      return;
    }
    target.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_10%_-14%,rgba(37,99,235,0.14),transparent_36%),radial-gradient(circle_at_88%_-8%,rgba(14,165,233,0.08),transparent_34%),#f8fafc] text-slate-900">
      <div className="mx-auto w-full max-w-[1280px] px-3 pb-[5.6rem] pt-3 md:px-4 md:pb-6 md:pt-4">
        <motion.div
          className="mb-4 flex w-full max-w-full items-center gap-1 overflow-x-auto whitespace-nowrap rounded-full border border-slate-300/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,249,255,0.92))] px-2 py-1 text-[11px] text-slate-600 shadow-[0_10px_24px_rgba(37,99,235,0.1)] backdrop-blur md:w-fit md:flex-wrap md:overflow-visible md:px-3 md:py-1.5 md:text-xs"
          initial="hidden"
          animate="show"
          variants={sectionMotion}
          transition={{ duration: 0.35 }}
        >
          {content.breadcrumb.map((crumb, idx) => (
            <div className="inline-flex items-center gap-1" key={`${crumb}-${idx}`}>
              {idx > 0 && <span className="font-medium text-slate-400">/</span>}
              {idx === content.breadcrumb.length - 1 ? (
                <span className="rounded-full bg-brand-100 px-2 py-0.5 font-extrabold text-brand-800">{crumb}</span>
              ) : (
                <span className="font-semibold text-slate-500 transition-colors hover:text-slate-700">{crumb}</span>
              )}
            </div>
          ))}
        </motion.div>

        <motion.div initial="hidden" animate="show" variants={sectionMotion} transition={{ duration: 0.45 }}>
          <HeroGallery
            gallery={content.gallery}
            activeImageIndex={0}
          />
        </motion.div>

        <motion.div initial="hidden" animate="show" variants={sectionMotion} transition={{ duration: 0.4, delay: 0.06 }}>
          <ExperienceHeader experience={content.experience} />
        </motion.div>

        <SectionNav links={sectionLinks} />

        <div className="relative grid grid-cols-1 items-start gap-4 md:gap-6 lg:grid-cols-[minmax(0,calc(100%_-_392px))_360px] lg:gap-8">
          <main className="min-w-0 overflow-hidden">
            <PackageOptionsSection
              variantId={variantId ?? ""}
              headoutId={content.experience.headoutId}
              selectedDate={selectedDate}
              selectedSlot={selectedSlot}
              onDateChange={handleDateChange}
              onSlotChange={setSelectedSlot}
            />
            <ContentSections
              content={content}
              cardImageTick={cardImageTick}
              moreWaysRailRef={moreWaysRailRef}
              onScrollMoreWays={scrollMoreWays}
            />
          </main>

          <BookingPanel
            priceLabel={priceLabel}
            onSelectOptions={handleSelectOptions}
          />
        </div>
      </div>
    </section>
  );
}
