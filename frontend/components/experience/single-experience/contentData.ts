import type { Experience } from "@/types/experience";
import type { RelatedCard, Review, SingleExperienceContent } from "@/components/experience/single-experience/types";

const FALLBACK_IMAGE = "/images/fallback-experience.svg";

const fallbackReviews: Review[] = [
  {
    name: "Recent traveler",
    country: "Global",
    date: "Recently",
    stars: 5,
    text: "Smooth booking and clear instructions throughout the experience.",
  },
  {
    name: "Verified guest",
    country: "Global",
    date: "Recently",
    stars: 4,
    text: "Good pacing, friendly support, and a very convenient overall flow.",
  },
  {
    name: "Travel community",
    country: "Global",
    date: "Recently",
    stars: 5,
    text: "Strong value for visitors looking for a low-friction booking experience.",
  },
];

function formatPrice(value: number, currency: string) {
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

function buildRelatedCard(exp: Experience, idx: number): RelatedCard {
  const option = exp.options[0];
  const price = option?.price ?? 0;
  const currency = option?.currency ?? "USD";
  const oldPrice = price > 0 ? Math.round(price * 1.12) : 0;
  const shouldDiscount = idx % 3 !== 1;

  return {
    id: exp.id,
    title: exp.title,
    images: exp.images.length ? exp.images.map((image) => image.url || FALLBACK_IMAGE) : [FALLBACK_IMAGE],
    price: `from ${formatPrice(price, currency)}`,
    oldPrice: shouldDiscount && oldPrice ? formatPrice(oldPrice, currency) : undefined,
    discount: shouldDiscount ? "Best value" : undefined,
    location: exp.city,
    rating: exp.rating ? exp.rating.toFixed(1) : "4.5",
    reviews: exp.reviewCount > 0 ? Intl.NumberFormat("en-US", { notation: "compact" }).format(exp.reviewCount) : "new",
    badge: idx % 4 === 1 ? "Selling out fast" : undefined,
    slug: exp.slug,
    headoutId: exp.headoutId,
  };
}

function buildHighlights(exp: Experience): string[] {
  const option = exp.options[0];
  const fromOption = [
    ...(option?.highlights ?? []),
    ...(option?.inclusions ?? []),
  ]
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (fromOption.length) {
    return fromOption;
  }

  const base = exp.description
    .split(/[.!?]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (base.length) {
    return base;
  }

  return [
    "Instant confirmation after booking",
    "Mobile tickets supported",
    "Flexible scheduling and easy check-in",
    "Curated experience by local operators",
  ];
}

function buildRatingBreakdown(rating: number): Array<{ label: string; value: string }> {
  const rounded = Math.max(1, Math.min(5, Math.round(rating || 4.5)));
  const excellent = 60 + rounded * 5;
  const veryGood = 18;
  const good = 10;
  const average = 7;
  const poor = Math.max(1, 100 - excellent - veryGood - good - average);

  return [
    { label: "Excellent", value: `${excellent}%` },
    { label: "Very good", value: `${veryGood}%` },
    { label: "Good", value: `${good}%` },
    { label: "Average", value: `${average}%` },
    { label: "Poor", value: `${poor}%` },
  ];
}

export function buildSingleExperienceContent(experience: Experience, related: Experience[]): SingleExperienceContent {
  const gallery = (experience.images.length ? experience.images : [{ url: FALLBACK_IMAGE, caption: experience.title }]).map((image, idx) => ({
    title: image.caption || `${experience.title} ${idx + 1}`,
    image: image.url || FALLBACK_IMAGE,
  }));

  const otherExperiences = related.filter((item) => item.id !== experience.id);
  const combinations = otherExperiences.slice(0, 8).map(buildRelatedCard);
  const moreWays = otherExperiences.slice(8, 12).map(buildRelatedCard);

  return {
    experience,
    breadcrumb: ["Home", "Experiences", experience.city, experience.title],
    gallery,
    highlights: buildHighlights(experience),
    about: experience.description,
    reviews: fallbackReviews,
    ratingBreakdown: buildRatingBreakdown(experience.rating),
    combinations,
    moreWays,
  };
}
