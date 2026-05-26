"use client";

import { Heart, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GalleryItem } from "@/components/experience/single-experience/types";

interface HeroGalleryProps {
  gallery: GalleryItem[];
  activeImageIndex: number;
}

export function HeroGallery({ gallery, activeImageIndex }: HeroGalleryProps) {
  const activeImage = gallery[activeImageIndex] ?? gallery[0];

  return (
    <section className="relative mx-auto max-w-[1280px] overflow-hidden rounded-2xl bg-white shadow-[0_22px_44px_rgba(15,23,42,0.12)]">
      <div className="absolute right-2 top-2 z-10 flex gap-2 md:right-4 md:top-4">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-full border border-white/40 bg-slate-900/35 p-0 text-white backdrop-blur hover:-translate-y-0.5 hover:bg-slate-900/60 md:h-9 md:w-9"
          aria-label="Add to wishlist"
        >
          <Heart size={16} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 rounded-full border border-white/40 bg-slate-900/35 p-0 text-white backdrop-blur hover:-translate-y-0.5 hover:bg-slate-900/60 md:h-9 md:w-9"
          aria-label="Share experience"
        >
          <Share2 size={16} />
        </Button>
      </div>

      <div className="p-2 md:p-3">
        <div className="group relative min-h-[280px] overflow-hidden rounded-2xl md:min-h-[420px] lg:min-h-[520px]">
          <img
            src={activeImage?.image}
            alt={activeImage?.title}
            loading="eager"
            className="h-full w-full object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-[1.01]"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[40%] bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.38)_100%)]" />
        </div>
      </div>
    </section>
  );
}
