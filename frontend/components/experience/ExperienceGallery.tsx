"use client";

import Image from "next/image";
import { useProduct } from "@/context/ProductContext";

export function ExperienceGallery() {
  const { state } = useProduct();
  const experience = state.experience!;
  const images = experience.images;
  const title = experience.title;

  const normalizeUrl = (url: string) => url.startsWith("//") ? "https:" + url : url;

  const uniqueImages = images.filter((image, index, array) => array.findIndex((candidate) => candidate.url === image.url) === index);
  const heroImage = uniqueImages[0]?.url ? normalizeUrl(uniqueImages[0].url) : "/images/fallback-experience.svg";
  const thumbnailImages = uniqueImages.slice(1, 5);
  const hasMultipleImages = thumbnailImages.length > 0;

  return (
    <div className={hasMultipleImages ? "grid gap-3 lg:grid-cols-[minmax(0,1.8fr)_minmax(0,1fr)]" : "mx-auto max-w-5xl"}>
      <div className="relative aspect-video overflow-hidden rounded-xl">
        <Image src={heroImage} alt={title} fill priority sizes="(max-width: 1024px) 100vw, 60vw" className="object-cover" />
      </div>

      {hasMultipleImages ? (
        <div className="grid grid-cols-2 gap-2">
          {thumbnailImages.map((image, index) => (
            <div key={image.url + index} className="relative aspect-[4/3] overflow-hidden rounded-md">
              <Image src={normalizeUrl(image.url)} alt={image.caption || `${title} image ${index + 2}`} fill sizes="(max-width: 1024px) 50vw, 20vw" className="object-cover" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
