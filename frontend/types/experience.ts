export interface ExperienceImage {
  url: string;
  caption: string;
}

export interface CancellationPolicy {
  cutoffHours: number;
  refundPercent: number;
  description: string;
}

export interface ExperienceOption {
  id: string;
  headoutVariantId: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  inclusions: string[];
  exclusions: string[];
  highlights: string[];
  fulfillmentMobile: boolean;
  fulfillmentPrint: boolean;
  fulfillmentPickup: boolean;
}

export interface Experience {
  id: string;
  headoutId: string;
  title: string;
  description: string;
  city: string;
  citySlug: string;
  slug: string;
  country: string;
  latitude: number;
  longitude: number;
  rating: number;
  reviewCount: number;
  images: ExperienceImage[];
  operatorName: string;
  categories: string[];
  languages: string[];
  durationMinSeconds: number;
  durationMaxSeconds: number;
  cancellationPolicy: CancellationPolicy | null;
  options: ExperienceOption[];
  gttdEnabled: boolean;
}
