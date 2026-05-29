"use client";

import { motion } from "framer-motion";
import { useProduct } from "@/context/ProductContext";
import { HeroGallery } from "@/components/experience/single-experience/HeroGallery";
import { ExperienceHeader } from "@/components/experience/single-experience/ExperienceHeader";
import { SectionNav } from "@/components/experience/single-experience/SectionNav";
import { ContentSections } from "@/components/experience/single-experience/ContentSections";
import { BookingPanel } from "@/components/experience/single-experience/BookingPanel";
import { PackageOptionsSection } from "@/components/experience/single-experience/PackageOptionsSection";

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

export function SingleExperienceLanding() {
  const { state } = useProduct();
  const content = state.singleExperienceContent!;

  const priceLabel = formatDisplayPrice(
    content.experience.options[0]?.price ?? 0,
    content.experience.options[0]?.currency ?? "USD",
  );

  const handleSelectOptions = () => {
    const target = document.getElementById("packages");
    if (!target) return;
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
          <HeroGallery />
        </motion.div>

        <motion.div initial="hidden" animate="show" variants={sectionMotion} transition={{ duration: 0.4, delay: 0.06 }}>
          <ExperienceHeader />
        </motion.div>

        <SectionNav links={sectionLinks} />

        <div className="relative grid grid-cols-1 items-start gap-4 md:gap-6 lg:grid-cols-[minmax(0,calc(100%_-_392px))_360px] lg:gap-8">
          <main className="min-w-0 overflow-hidden">
            <PackageOptionsSection />
            <ContentSections />
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
