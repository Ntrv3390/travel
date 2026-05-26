import Image from "next/image";
import { SearchBar } from "@/components/search/SearchBar";

export function ExperienceHero() {
  return (
    <section className="relative min-h-[75vh] w-full overflow-hidden">
      <Image
        src="/images/hero-travel.svg"
        alt="Scenic travel destination"
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-background" />
      <div className="container relative flex min-h-[75vh] flex-col items-start justify-center gap-6 py-20 text-white">
        <h1 className="max-w-2xl text-display-lg font-bold leading-tight">Experiences Worth Having</h1>
        <p className="max-w-xl text-lg text-white/90">Discover curated tours, activities, and attractions with fast booking and real-time availability.</p>
        <div className="w-full max-w-3xl rounded-xl bg-background/90 p-4 text-foreground shadow-pricing-box">
          <SearchBar />
        </div>
      </div>
    </section>
  );
}
