import type { SearchProduct } from "@/types/search";
import type { Experience } from "@/types/experience";

export function normalizeImageUrl(url: string): string {
  if (url.startsWith("//")) return "https:" + url;
  return url;
}

export function toExperience(p: SearchProduct): Experience {
  return {
    id: p.id,
    headoutId: p.id,
    title: p.name,
    description: "",
    city: p.city,
    citySlug: p.cityCode.toLowerCase(),
    slug: p.slug,
    country: "",
    latitude: 0,
    longitude: 0,
    rating: p.rating,
    reviewCount: p.reviewCount,
    images: [{ url: normalizeImageUrl(p.imageUrl), caption: p.name }],
    operatorName: "",
    categories: [p.category],
    languages: [],
    durationMinSeconds: 0,
    durationMaxSeconds: 0,
    cancellationPolicy: null,
    options: [
      {
        id: "default",
        headoutVariantId: "",
        title: "Default",
        description: "",
        price: p.price,
        currency: p.currency,
        inclusions: [],
        exclusions: [],
        highlights: [],
        fulfillmentMobile: false,
        fulfillmentPrint: false,
        fulfillmentPickup: false,
      },
    ],
    gttdEnabled: false,
  };
}
