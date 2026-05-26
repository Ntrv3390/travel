import Image from "next/image";
import type { ExperienceImage } from "@/types/experience";

export function ExperienceGallery({ images, title }: { images: ExperienceImage[]; title: string }) {
  const first = images[0]?.url ?? "/images/fallback-experience.svg";

  return (
    <div className="space-y-3">
      <div className="relative aspect-video overflow-hidden rounded-xl">
        <Image src={first} alt={title} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
      </div>
      <div className="grid grid-cols-4 gap-2">
        {images.slice(0, 4).map((image, index) => (
          <div key={image.url + index} className="relative aspect-[4/3] overflow-hidden rounded-md">
            <Image src={image.url} alt={image.caption || `${title} image ${index + 1}`} fill sizes="120px" className="object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
}
