import { env } from "@/lib/env";
import { HOME_REVALIDATE_SECONDS, PDP_REVALIDATE_SECONDS } from "@/lib/constants";
import { toSlug } from "@/lib/utils";
import type { SearchParams } from "@/types/api";
import type { BookingRequest, BookingResponse } from "@/types/booking";
import type { Experience, ExperienceOption } from "@/types/experience";
import type { Product, ProductsResponse, ProductsQueryParams, VariantAvailabilityResponse, SlotInventoryResponse } from "@/types/product";
import type { SearchAllResponse } from "@/types/search";

const API_BASE = env.API_URL;

// ── In-memory cache (shared across all requests, server-side only) ──
const DEFAULT_CACHE_TTL = HOME_REVALIDATE_SECONDS * 1000;
interface CacheEntry { data: unknown; timestamp: number }
const serverCache = new Map<string, CacheEntry>();

async function withCache<T>(key: string, fetcher: () => Promise<T>, ttl = DEFAULT_CACHE_TTL): Promise<T> {
  const entry = serverCache.get(key);
  if (entry && Date.now() - entry.timestamp < ttl) return entry.data as T;
  const data = await fetcher();
  serverCache.set(key, { data, timestamp: Date.now() });
  return data;
}

function cacheKey(...parts: string[]): string {
  return parts.join("::");
}

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
}

interface BackendExperience {
  id: string | number;
  headout_id: string;
  title: string;
  description: string;
  category?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  duration?: string;
  price: number;
  currency: string;
  rating?: number;
  review_count?: number;
  image_url?: string;
}

interface BackendListResponse {
  data?: BackendExperience[];
  count?: number;
  page?: number;
  limit?: number;
  total_pages?: number;
  error?: string;
}

interface BackendSingleResponse {
  data?: BackendExperience;
  error?: string;
}

interface BackendJSONLDResponse {
  data?: string;
  error?: string;
}

function normalizeExperience(raw: BackendExperience): Experience {
  const imageUrl = raw.image_url && raw.image_url.length > 0 ? raw.image_url : "/images/fallback-experience.svg";
  const option: ExperienceOption = {
    id: `option-${raw.id}`,
    headoutVariantId: raw.headout_id,
    title: "Standard",
    description: raw.description,
    price: raw.price,
    currency: raw.currency,
    inclusions: [],
    exclusions: [],
    highlights: [],
    fulfillmentMobile: true,
    fulfillmentPrint: false,
    fulfillmentPickup: false,
  };

  return {
    id: String(raw.id),
    headoutId: raw.headout_id,
    title: raw.title,
    description: raw.description,
    city: raw.location,
    citySlug: toSlug(raw.location),
    slug: toSlug(raw.title),
    country: "",
    latitude: raw.latitude ?? 0,
    longitude: raw.longitude ?? 0,
    rating: raw.rating ?? 0,
    reviewCount: raw.review_count ?? 0,
    images: [{ url: imageUrl, caption: raw.title }],
    operatorName: "Triipzy",
    categories: raw.category ? [raw.category] : [],
    languages: [],
    durationMinSeconds: 0,
    durationMaxSeconds: 0,
    cancellationPolicy: null,
    options: [option],
    gttdEnabled: false,
  };
}

async function readJson<T>(res: Response): Promise<ApiResult<T>> {
  const text = await res.text();
  if (!res.ok) {
    return { data: null, error: text || res.statusText || "Request failed" };
  }

  if (!text) {
    return { data: null, error: null };
  }

  try {
    return { data: JSON.parse(text) as T, error: null };
  } catch {
    return { data: text as T, error: null };
  }
}

async function requestExperiences(url: string, options?: { signal?: AbortSignal }): Promise<ApiResult<{ experiences: Experience[]; count: number; page: number; limit: number; totalPages: number }>> {
  return withCache(cacheKey("experiences", url), async () => {
    try {
      const res = await fetch(url, { next: { revalidate: 300 }, signal: options?.signal });
      const payload = await readJson<BackendListResponse>(res);

      if (payload.error) {
        return { data: null, error: payload.error };
      }

      const backendExperiences = payload.data?.data ?? [];
      const experiences = backendExperiences.map(normalizeExperience);
      return {
        data: {
          experiences,
          count: payload.data?.count ?? experiences.length,
          page: payload.data?.page ?? 1,
          limit: payload.data?.limit ?? experiences.length,
          totalPages: payload.data?.total_pages ?? 1,
        },
        error: null,
      };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
    }
  }, 300000);
}

export async function getTopExperiences(limit = 24, page = 1, currency = "USD", options?: { signal?: AbortSignal }) {
  const url = new URL(`${API_BASE}/api/v1/experiences`);
  url.searchParams.set("limit", String(limit));
  url.searchParams.set("page", String(page));
  url.searchParams.set("currencyCode", currency);
  return requestExperiences(url.toString(), options);
}

// ── New: Popular Experiences ──
export async function getPopularExperiences(currency = "USD", limit = 24) {
  const url = new URL(`${API_BASE}/api/v1/experiences`);
  url.searchParams.set("currencyCode", currency);
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url.toString(), { cache: "no-store" });
  if (!res.ok) return { data: null, error: "Failed to fetch popular experiences" };
  const json = await res.json();
  return { data: json.data ?? json, error: null };
}

export async function getExperienceCalendar(experienceId: string, months = 2, currency = "USD") {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/booking-flow/calendar?headoutId=${encodeURIComponent(experienceId)}&months=${months}&currencyCode=${currency}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { data: [], error: null };
    const json = await res.json();
    return { data: json.data ?? json, error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Network error" };
  }
}

export async function getSlotAvailability(experienceId: string, variantId: string, date: string, currency = "USD") {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/experiences-availability/${encodeURIComponent(experienceId)}?variantId=${encodeURIComponent(variantId)}&date=${encodeURIComponent(date)}&currencyCode=${currency}`,
      { cache: "no-store" }
    );
    if (!res.ok) return { data: [], error: null };
    const json = await res.json();
    return { data: json.data ?? json, error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Network error" };
  }
}

export async function getSupportedCurrencies() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/currencies`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return { data: [], error: null };
    const json = await res.json();
    return { data: json.data ?? json, error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Network error" };
  }
}

export async function getCities(offset = 0, limit = 20) {
  const url = new URL(`${API_BASE}/api/v1/headout/v2/cities`);
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("limit", String(limit));
  const urlStr = url.toString();
  return withCache(cacheKey("cities", urlStr), async () => {
    try {
      const res = await fetch(urlStr, { next: { revalidate: HOME_REVALIDATE_SECONDS } });
      if (!res.ok) return { data: null, error: null };
      const json = await res.json();
      return { data: json.data ?? json, error: null };
    } catch (error) {
      return { data: null, error: error instanceof Error ? error.message : "Network error" };
    }
  });
}

export async function getProducts(params: ProductsQueryParams, options?: { signal?: AbortSignal }): Promise<ApiResult<ProductsResponse>> {
  try {
    const url = new URL(`${API_BASE}/api/v1/headout/v2/products`);
    if (params.cityCode) url.searchParams.set("cityCode", params.cityCode);
    if (params.collectionId) url.searchParams.set("collectionId", params.collectionId);
    if (params.categoryId) url.searchParams.set("categoryId", params.categoryId);
    if (params.subCategoryId) url.searchParams.set("subCategoryId", params.subCategoryId);
    if (params.languageCode) url.searchParams.set("languageCode", params.languageCode);
    if (params.currencyCode) url.searchParams.set("currencyCode", params.currencyCode);
    if (params.campaignName) url.searchParams.set("campaignName", params.campaignName);
    if (params.offset !== undefined) url.searchParams.set("offset", String(params.offset));
    if (params.limit !== undefined) url.searchParams.set("limit", String(params.limit));
    const res = await fetch(url.toString(), { cache: "no-store", signal: options?.signal });
    return readJson<ProductsResponse>(res);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}

export async function getVariantAvailabilities(
  productId: string,
  variantId: string | number,
  options?: { currencyCode?: string; startDate?: string; endDate?: string },
): Promise<ApiResult<VariantAvailabilityResponse>> {
  try {
    const url = new URL(`${API_BASE}/api/v1/headout/v2/products/${encodeURIComponent(productId)}/variants/${encodeURIComponent(variantId)}/availabilities`);
    if (options?.currencyCode) url.searchParams.set("currencyCode", options.currencyCode);
    if (options?.startDate) url.searchParams.set("startDate", options.startDate);
    if (options?.endDate) url.searchParams.set("endDate", options.endDate);
    const res = await fetch(url.toString(), { cache: "no-store" });
    return readJson<VariantAvailabilityResponse>(res);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}

export async function getSlotInventory(
  tourId: string | number,
  startDateTime: string,
  endDateTime: string,
  currencyCode: string,
): Promise<ApiResult<SlotInventoryResponse>> {
  try {
    const url = new URL(`${API_BASE}/api/v1/headout/v2/inventory`);
    url.searchParams.set("tourId", String(tourId));
    url.searchParams.set("startDateTime", startDateTime);
    url.searchParams.set("endDateTime", endDateTime);
    url.searchParams.set("currencyCode", currencyCode);
    const res = await fetch(url.toString(), { cache: "no-store" });
    return readJson<SlotInventoryResponse>(res);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}

export async function getProductById(
  id: string,
  options?: { languageCode?: string; currencyCode?: string },
): Promise<ApiResult<Product>> {
  try {
    const url = new URL(`${API_BASE}/api/v1/headout/v2/products/${encodeURIComponent(id)}`);
    if (options?.languageCode) url.searchParams.set("languageCode", options.languageCode);
    if (options?.currencyCode) url.searchParams.set("currencyCode", options.currencyCode);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      if (res.status === 404) {
        return { data: null, error: "Product not found" };
      }
      if (res.status === 502 || res.status === 503) {
        return { data: null, error: "Service temporarily unavailable. Please try again." };
      }
      return { data: null, error: "Failed to load product details" };
    }
    return readJson<Product>(res);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}

export async function searchAll(
  q: string,
  options?: { signal?: AbortSignal; currencyCode?: string },
): Promise<SearchAllResponse | null> {
  try {
    const url = new URL(`${API_BASE}/api/v1/search`);
    url.searchParams.set("q", q);
    if (options?.currencyCode) {
      url.searchParams.set("currencyCode", options.currencyCode);
    }
    const res = await fetch(url.toString(), {
      signal: options?.signal,
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function getCategories() {
  try {
    const res = await fetch(`${API_BASE}/api/v1/headout/v2/categories`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return { data: [], error: null };
    const json = await res.json();
    return { data: json.data ?? json, error: null };
  } catch (error) {
    return { data: [], error: error instanceof Error ? error.message : "Network error" };
  }
}

export async function getCityExperiences(city: string, params: SearchParams = {}) {
  const url = new URL(`${API_BASE}/api/v1/experiences`);
  url.searchParams.set("location", city.replace(/-/g, " "));
  url.searchParams.set("page", params.page ?? "1");
  url.searchParams.set("limit", params.limit ?? "24");
  if (params.category) url.searchParams.set("category", params.category);
  if (params.currency) url.searchParams.set("currencyCode", params.currency);
  return requestExperiences(url.toString());
}

export async function searchExperiences(params: SearchParams) {
  const url = new URL(`${API_BASE}/api/v1/experiences/search`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      if (key === "currency") {
        url.searchParams.set("currencyCode", value);
      } else {
        url.searchParams.set(key, value);
      }
    }
  });
  if (!url.searchParams.has("page")) url.searchParams.set("page", "1");
  if (!url.searchParams.has("limit")) url.searchParams.set("limit", "24");
  return requestExperiences(url.toString());
}

export async function getExperience(city: string, slug: string, currencyCode?: string): Promise<ApiResult<Experience>> {
  try {
    const url = new URL(`${API_BASE}/api/v1/experiences/${encodeURIComponent(city)}/${encodeURIComponent(slug)}`);
    if (currencyCode) url.searchParams.set("currencyCode", currencyCode);
    const res = await fetch(url.toString(), {
      next: { revalidate: PDP_REVALIDATE_SECONDS },
    });
    const payload = await readJson<BackendSingleResponse>(res);
    if (payload.error) {
      return { data: null, error: payload.error };
    }
    return { data: payload.data?.data ? normalizeExperience(payload.data.data) : null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}

export async function getExperienceById(id: string, currencyCode?: string): Promise<ApiResult<Experience>> {
  try {
    const url = new URL(`${API_BASE}/api/v1/experiences/id/${encodeURIComponent(id)}`);
    if (currencyCode) url.searchParams.set("currencyCode", currencyCode);
    const res = await fetch(url.toString(), {
      next: { revalidate: PDP_REVALIDATE_SECONDS },
    });
    const payload = await readJson<BackendSingleResponse>(res);
    if (payload.error) {
      return { data: null, error: payload.error };
    }
    return { data: payload.data?.data ? normalizeExperience(payload.data.data) : null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}

export async function getJSONLD(headoutId: string): Promise<ApiResult<string>> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/gttd/jsonld/${encodeURIComponent(headoutId)}`, {
      next: { revalidate: PDP_REVALIDATE_SECONDS },
    });
    const payload = await readJson<BackendJSONLDResponse>(res);
    if (payload.error) {
      return { data: null, error: payload.error };
    }
    if (typeof payload.data?.data === "string") {
      return { data: payload.data.data, error: null };
    }
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}

export async function getAvailability(experienceId: string, date: string): Promise<ApiResult<Record<string, unknown>>> {
  try {
    const res = await fetch(
      `${API_BASE}/api/v1/experiences-availability/${encodeURIComponent(experienceId)}?date=${encodeURIComponent(date)}`,
      { cache: "no-store" },
    );
    return readJson<Record<string, unknown>>(res);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}

export async function createBooking(payload: BookingRequest, sessionId?: string, idempotencyKey?: string): Promise<ApiResult<BookingResponse>> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (sessionId) headers["X-Session-ID"] = sessionId;
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    return readJson<BookingResponse>(res);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}

export interface CartItemPayload {
  experienceId: string;
  productId?: string;
  variantId: string;
  inventoryId?: string;
  inventoryType?: string;
  date: string;
  startDateTime?: string;
  endDateTime?: string;
  adults: number;
  children: number;
  guestCounts?: Record<string, number>;
  priceAmount?: number;
  currency?: string;
  title?: string;
  imageUrl?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

interface CartItemResponse {
  id: string;
  experienceId: string;
  productId: string;
  variantId: string;
  inventoryId: string;
  inventoryType: string;
  date: string;
  startDateTime: string;
  endDateTime: string;
  adults: number;
  children: number;
  guestCounts?: Record<string, number>;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  priceAmount: number;
  currency: string;
  title: string;
  imageUrl: string;
  addedAt: string;
}

interface CartResponse {
  id: string;
  sessionId: string;
  items: CartItemResponse[];
  createdAt: string;
  updatedAt: string;
}

const CART_SESSION_KEY = "traviia_cart_session";

export function getCartSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(CART_SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(CART_SESSION_KEY, id);
  }
  return id;
}

export async function getCart(sessionId: string): Promise<ApiResult<CartResponse>> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/cart`, {
      headers: { "X-Session-ID": sessionId },
      cache: "no-store",
    });
    return readJson<CartResponse>(res);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}

export async function addCartItem(sessionId: string, item: CartItemPayload): Promise<ApiResult<CartResponse>> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/cart/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
      body: JSON.stringify(item),
      cache: "no-store",
    });
    return readJson<CartResponse>(res);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}

export async function removeCartItem(sessionId: string, itemId: string): Promise<ApiResult<CartResponse>> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/cart/items/${encodeURIComponent(itemId)}`, {
      method: "DELETE",
      headers: { "X-Session-ID": sessionId },
      cache: "no-store",
    });
    return readJson<CartResponse>(res);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}

export async function clearCart(sessionId: string): Promise<ApiResult<{ message: string }>> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/cart`, {
      method: "DELETE",
      headers: { "X-Session-ID": sessionId },
      cache: "no-store",
    });
    return readJson<{ message: string }>(res);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}
