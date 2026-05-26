import { env } from "@/lib/env";
import { PDP_REVALIDATE_SECONDS } from "@/lib/constants";
import { toSlug } from "@/lib/utils";
import type { SearchParams } from "@/types/api";
import type { BookingRequest, BookingResponse } from "@/types/booking";
import type { Experience, ExperienceOption } from "@/types/experience";

const API_BASE = env.API_URL;

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
    operatorName: "Traviia",
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

async function requestExperiences(url: string): Promise<ApiResult<{ experiences: Experience[]; count: number; page: number; limit: number; totalPages: number }>> {
  try {
    const res = await fetch(url, { cache: "no-store" });
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
}

export async function getTopExperiences(limit = 8) {
  return requestExperiences(`${API_BASE}/api/v1/experiences?limit=${limit}`);
}

export async function getCityExperiences(city: string, params: SearchParams = {}) {
  const url = new URL(`${API_BASE}/api/v1/experiences`);
  url.searchParams.set("location", city.replace(/-/g, " "));
  url.searchParams.set("page", params.page ?? "1");
  url.searchParams.set("limit", params.limit ?? "12");
  if (params.category) url.searchParams.set("category", params.category);
  return requestExperiences(url.toString());
}

export async function searchExperiences(params: SearchParams) {
  const url = new URL(`${API_BASE}/api/v1/experiences/search`);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  if (!url.searchParams.has("page")) url.searchParams.set("page", "1");
  if (!url.searchParams.has("limit")) url.searchParams.set("limit", "12");
  return requestExperiences(url.toString());
}

export async function getExperience(city: string, slug: string): Promise<ApiResult<Experience>> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/experiences/${encodeURIComponent(city)}/${encodeURIComponent(slug)}`, {
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

export async function getExperienceById(id: string): Promise<ApiResult<Experience>> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/experiences/by-id/${encodeURIComponent(id)}`, {
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
      `${API_BASE}/api/v1/experiences/${encodeURIComponent(experienceId)}/availability?date=${encodeURIComponent(date)}`,
      { cache: "no-store" },
    );
    return readJson<Record<string, unknown>>(res);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}

export async function createBooking(payload: BookingRequest): Promise<ApiResult<BookingResponse>> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    return readJson<BookingResponse>(res);
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Network request failed" };
  }
}
