export interface ProductContent {
  highlights: string;
  highlightsHtml: string | null;
  shortSummary: string;
  summaryHtml: string | null;
  inclusions: string;
  inclusionsHtml: string | null;
  exclusions: string;
  exclusionsHtml: string | null;
  faqHtml: string | null;
  ticketDeliveryInfoHtml: string | null;
}

export interface ProductCity {
  code: string;
  name: string;
  image: { url: string };
}

export interface ProductMedia {
  url: string;
  type: "IMAGE" | "VIDEO" | "PDF";
}

export interface ProductLocation {
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
}

export interface ProductReviews {
  ratingsCount: number;
  averageRating: number;
}

export interface ProductPricing {
  currency: string;
  profileType: "PER_PERSON" | "PER_GROUP";
  headoutSellingPrice: number;
  netPrice: number;
}

export interface ProductListingPrice {
  type: "PER_PERSON" | "PER_GROUP";
  currencyCode: string;
  minimumPrice: { originalPrice: number; finalPrice: number };
  bestDiscount: number;
}

export interface ProductCurrency {
  code: string;
  currencyName: string;
  symbol: string;
  localSymbol: string;
  precision: number;
}

export interface ProductCategory {
  id: string;
  name: string;
  canonicalUrl?: string;
  localeSpecificUrls?: Record<string, string>;
}

export interface ProductSubCategory {
  id: string;
  name: string;
  categoryId: string;
  canonicalUrl?: string;
  localeSpecificUrls?: Record<string, string>;
}

export interface ProductCollection {
  id: string;
  name: string;
  cityCode: string;
  content?: { description: string | null; subtext: string | null } | null;
  localeSpecificUrls?: Record<string, string>;
  canonicalUrl?: string;
  heroImage?: { url: string; type: string } | null;
  cardImage?: { url: string; type: string } | null;
}

export interface CollectionsResponse {
  collections: ProductCollection[];
  nextUrl: string | null;
  prevUrl: string | null;
  total: number;
  nextOffset: number | null;
}

export interface SubcategoriesResponse {
  subCategories: ProductSubCategory[];
}

export interface ProductVariant {
  id: string | number;
  name: string | null;
  description: string | null;
  duration: number | null;
  inventoryType:
  | "FIXED_START_FIXED_DURATION"
  | "FIXED_START_FLEXIBLE_DURATION"
  | "FLEXIBLE_START_FIXED_DURATION"
  | "FLEXIBLE_START_FLEXIBLE_DURATION";
  pax: { min: number; max: number | null };
  cashback?: { value: number; type: "PERCENTAGE" | "ABSOLUTE" };
  ticketDeliveryInfoHtml: string | null;
  cancellationPolicy?: { cancellable: boolean; cancellableUpTo: number | null };
  inputFields?: Array<{
    oldId?: number;
    id: string;
    name: string;
    description?: string;
    dataType: "STRING" | "ENUM" | "BOOL" | "INT" | "FLOAT" | "LOCATION";
    level?: "PRIMARY_CUSTOMER" | "ALL_CUSTOMER" | "BOOKING";
    validation?: {
      regex?: string | null;
      minLength?: number | null;
      maxLength?: number | null;
      minValue?: number | null;
      maxValue?: number | null;
      required?: boolean;
      values?: string[] | null;
    };
  }>;
  tags?: string[];
  pricing?: {
    currency?: string;
    profileType?: "PER_PERSON" | "PER_GROUP";
    headoutSellingPrice?: number;
    netPrice?: number;
  };
  startingHeadoutSellingPrice?: {
    amount?: number;
    currencyCode?: string;
  };
}

export interface ProductCancellationPolicy {
  cancellable: boolean;
  cancellableUpToInMinutes: number | null;
}

export interface ProductReschedulePolicy {
  reschedulable: boolean;
  reschedulableUpToInMinutes: number | null;
}

export interface Product {
  id: string;
  name: string;
  canonicalUrl: string;
  content: ProductContent;
  city: ProductCity;
  media: ProductMedia[];
  startLocation: ProductLocation;
  endLocation: ProductLocation;
  productType: "TOUR" | "ACTIVITY" | "EVENT" | "ATTRACTION" | "TRANSFER" | "AIRPORT_TRANSFER" | "ADD_ON";
  reviewsSummary: ProductReviews;
  pricing: ProductPricing;
  listingPrice: ProductListingPrice;
  currency: ProductCurrency;
  localeSpecificUrls: Record<string, string>;
  hasInstantConfirmation: boolean;
  hasMobileTicket: boolean;
  cityName: string | null;
  title?: string;
  imageUrl?: string;
  fromPrice?: number;
  primaryCategory: ProductCategory;
  primarySubCategory: ProductSubCategory;
  primaryCollection: ProductCollection;
  variants: ProductVariant[];
  inventorySelectionType: "NORMAL" | "SEATMAP" | "SVG";
  cancellationPolicy: ProductCancellationPolicy;
  reschedulePolicy: ProductReschedulePolicy;
}

export interface ProductsResponse {
  products: Product[];
  nextUrl: string | null;
  prevUrl: string | null;
  total: number;
  nextOffset: number | null;
}

export interface VariantAvailability {
  date: string;
  pricing: {
    currency: string;
    profileType: string;
    headoutSellingPrice: number;
    netPrice: number;
  };
  availability: "UNLIMITED" | "LIMITED" | "CLOSED";
  remaining: number;
}

export interface VariantAvailabilityResponse {
  productId: number;
  variantId: number;
  currencyCode: string;
  availabilities: VariantAvailability[];
}

export interface PersonPricing {
  type: string;
  name: string;
  description: string | null;
  ageFrom: number;
  ageTo: number | null;
  price: number;
  originalPrice: number;
  netPrice: number;
  headoutSellingPrice: number;
  remaining: number;
  availability: "UNLIMITED" | "LIMITED" | "CLOSED";
  paxRange: { min: number | null; max: number | null };
}

export interface SlotItem {
  id: string;
  startDateTime: string;
  endDateTime: string;
  availability: "UNLIMITED" | "LIMITED" | "CLOSED";
  remaining: number;
  pricing: {
    persons: PersonPricing[];
    groups: Array<{
      size: number;
      description: string | null;
      price: number;
      originalPrice: number;
      netPrice: number;
      headoutSellingPrice: number;
      remaining: number;
      availability: "UNLIMITED" | "LIMITED" | "CLOSED";
    }>;
  };
}

export interface SlotInventoryResponse {
  items: SlotItem[];
  nextUrl: string | null;
  prevUrl: string | null;
  total: number;
  nextOffset: number | null;
}

// ── Seatmap availability ──────────────────────────────────────────────────────

export interface SeatmapAvailabilitySlot {
  startTime: string; // "HH:mm"
  pricing: {
    currency: string;
    profileType: "PER_PERSON";
    headoutSellingPrice: number;
    netPrice: number;
  };
  remaining: number;
}

export interface SeatmapAvailabilityDate {
  date: string;
  slots: SeatmapAvailabilitySlot[];
}

export interface SeatmapAvailabilityResponse {
  productId: number;
  variantId: number;
  currencyCode: string;
  availabilities: SeatmapAvailabilityDate[];
}

// ── Seatmap inventory ─────────────────────────────────────────────────────────

export interface SeatmapSeatPrice {
  currency: string;
  profileType: string;
  headoutSellingPrice: number;
  netPrice: number | null;
}

export interface SeatmapSeat {
  seatCode: string;
  row: string | null;
  seatNumber: string | null;
  seatType: string | null;
  pricing: SeatmapSeatPrice | null;
}

export interface SeatmapSection {
  sectionName: string | null;
  remaining: number;
  seats: SeatmapSeat[];
}

export interface SeatmapInventoryResponse {
  productId: number;
  variantId: number;
  inventoryId: number;
  currencyCode: string;
  date: string;
  startTime: string;
  remaining: number;
  sections: SeatmapSection[];
}

export interface VenueMapResponse {
  productId: number;
  svgUrl: string;
}

export interface SeatmapValidateRequest {
  inventoryId: number;
  seatCodes: string[];
}

export interface SeatmapPrice {
  currency: string;
  profileType?: string;
  headoutSellingPrice: number;
  netPrice: number | null;
}

export interface SeatmapValidatedSeat {
  seatCode: string;
  sectionName: string | null;
  row: string | null;
  seatNumber: string | null;
  seatType: string | null;
  isAvailable: boolean;
  pricing: SeatmapPrice | null;
}

export interface SeatmapValidationError {
  code: "SEAT_UNAVAILABLE" | "SEAT_NOT_FOUND" | "ADJACENCY_RULE_VIOLATION";
  message: string;
  seatCode: string;
}

export interface SeatmapValidateResponse {
  productId: number;
  variantId: number;
  inventoryId: number;
  currencyCode: string;
  date: string;
  startTime: string;
  seats: SeatmapValidatedSeat[];
  validationErrors: SeatmapValidationError[];
}

export interface IframeSeat {
  id: string;
  seatCode: string;
  inventorySlotId: string;
  price: number;
  originalPrice: number;
  currency: string;
  discounted: boolean;
  seatNumber: string;
  seatRow: string;
  seatSection: string;
  color: string;
  description: string;
  remaining: number;
  maxAvailable: number;
}

export interface ProductsQueryParams {
  cityCode?: string;
  collectionId?: string;
  categoryId?: string;
  subCategoryId?: string;
  languageCode?: string;
  currencyCode?: string;
  campaignName?: string;
  offset?: number;
  limit?: number;
}
