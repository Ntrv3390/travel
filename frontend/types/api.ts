export interface APIResponse<T> {
  data: T;
  error: string | null;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface PaginatedResponse<T> {
  experiences: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CurrencyOption {
  code: string
  symbol: string
  name: string
}

export interface CityImage {
  url: string;
}

export interface CityCountry {
  code: string;
  name: string;
}

export interface City {
  code: string;
  name: string;
  image: CityImage;
  country: CityCountry;
  timezone: string;
}

export interface CitiesResponse {
  cities: City[];
  nextUrl: string | null;
  prevUrl: string | null;
  total: number;
  nextOffset: number | null;
}

export interface HomeCategory {
  id: number;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  icon_name: string;
  sort_order: number;
  is_active: boolean;
}

export interface HomeCollection {
  id: number;
  title: string;
  slug: string;
  description: string;
  image_url: string;
  experience_count: number;
  sort_order: number;
  is_active: boolean;
}

export interface Testimonial {
  id: number;
  name: string;
  location: string;
  text: string;
  rating: number;
  avatar: string;
  color: string;
  sort_order: number;
  is_active: boolean;
}

export interface SearchParams {
  category?: string;
  sort?: "recommended" | "price_asc" | "price_desc" | "rating";
  min_price?: string;
  max_price?: string;
  page?: string;
  limit?: string;
  q?: string;
  city?: string;
  currency?: string;
}
