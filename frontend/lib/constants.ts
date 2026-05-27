export const PDP_REVALIDATE_SECONDS = 3600;
export const DEFAULT_PAGE_SIZE = 12;
export const AVAILABILITY_REFRESH_MS = 30_000;
export const CURRENCIES = ["USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD", "JPY"] as const;
export const SORT_OPTIONS = [
  { label: "Recommended", value: "recommended" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
  { label: "Rating", value: "rating" },
] as const;
export const CART_SESSION_KEY = "traviia_cart_session";
