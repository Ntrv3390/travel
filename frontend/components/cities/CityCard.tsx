import Image from "next/image";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { cn, toSlug } from "@/lib/utils";
import type { City } from "@/types/api";

export function CityCard({ city, className, priority = false }: { city: City; className?: string; priority?: boolean }) {
  const imageUrl = city.image?.url
    ? `https:${city.image.url}`
    : "/images/fallback-experience.svg";

  return (
    <Link href={`/cities/${toSlug(city.name)}`} className="group block">
      <Card
        className={cn(
          "overflow-hidden border-0 shadow-sm transition-all duration-300 ease-out",
          "hover:-translate-y-1 hover:shadow-card-hover",
          className,
        )}
      >
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={imageUrl}
            alt={city.name}
            fill
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h3 className="text-lg font-bold text-white">{city.name}</h3>
            <p className="text-sm text-white/80">{city.country.name}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
