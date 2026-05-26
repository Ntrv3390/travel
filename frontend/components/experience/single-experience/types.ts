import type { Experience } from "@/types/experience";

export type Review = {
  name: string;
  country: string;
  date: string;
  text: string;
  stars: number;
};

export type RelatedCard = {
  id: string;
  title: string;
  images: string[];
  price: string;
  oldPrice?: string;
  discount?: string;
  location: string;
  rating: string;
  reviews: string;
  badge?: string;
};

export type GalleryItem = {
  title: string;
  image: string;
};

export type SingleExperienceContent = {
  experience: Experience;
  breadcrumb: string[];
  gallery: GalleryItem[];
  highlights: string[];
  about: string;
  reviews: Review[];
  ratingBreakdown: Array<{ label: string; value: string }>;
  combinations: RelatedCard[];
  moreWays: RelatedCard[];
};
