import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

type InventoryItem = {
  startDateTime?: string;
  endDateTime?: string;
  availability?: string;
  pricing?: {
    persons?: Array<{
      price?: number;
      originalPrice?: number;
      netPrice?: number;
      headoutSellingPrice?: number;
    }>;
  };
};

type CalendarDay = {
  date: string;
  label: string;
  price: number | null;
  currency: string;
  availability: string;
  slots: string[];
};

type InventoryPayload = {
  items?: InventoryItem[];
};

const INVENTORY_FETCH_TIMEOUT_MS = 3500;
const MAX_VARIANT_CANDIDATES = 6;

function uniqueValues(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value && value.trim().length)))];
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function collectVariantIds(input: unknown): string[] {
  const found = new Set<string>();

  const visit = (value: unknown, parentKey = "") => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, parentKey));
      return;
    }

    const record = toRecord(value);
    if (!record) {
      return;
    }

    for (const [key, child] of Object.entries(record)) {
      const loweredKey = key.toLowerCase();
      const parentHint = parentKey.toLowerCase();
      const hasVariantHint = loweredKey.includes("variant") || parentHint.includes("variant");
      if (hasVariantHint && (typeof child === "string" || typeof child === "number")) {
        found.add(String(child));
      }
      visit(child, loweredKey);
    }
  };

  visit(input);
  return [...found];
}

function toDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfDay(value: Date) {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(value: Date, days: number) {
  const next = new Date(value);
  next.setDate(next.getDate() + days);
  return next;
}

function formatLabel(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(value);
}

function formatPrice(value: number | null, currency: string) {
  if (value == null || Number.isNaN(value)) {
    return null;
  }

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency || "USD"} ${Math.round(value)}`;
  }
}

function getItemPrice(item: InventoryItem) {
  const personPrice = item.pricing?.persons?.[0]?.price;
  const netPrice = item.pricing?.persons?.[0]?.netPrice;
  const sellingPrice = item.pricing?.persons?.[0]?.headoutSellingPrice;
  return personPrice ?? netPrice ?? sellingPrice ?? null;
}

function getSlot(value?: string) {
  if (!value) {
    return null;
  }

  const time = value.includes("T") ? value.split("T")[1]?.slice(0, 5) : value.slice(0, 5);
  return time && /^\d{2}:\d{2}$/.test(time) ? time : null;
}

async function fetchInventoryByVariant(variantId: string, rangeStart: Date, rangeEnd: Date): Promise<InventoryItem[]> {
  const endpoints = [
    `${env.HEADOUT_PUBLIC_API_URL}/v1/inventory/list-by/variant`,
    `${env.API_URL}/api/v1/headout/v1/inventory/list-by/variant`,
  ];

  for (const endpoint of endpoints) {
    const upstream = new URL(endpoint);
    upstream.searchParams.set("variantId", variantId);
    upstream.searchParams.set("startDateTime", `${toDateKey(rangeStart)}T00:00:00`);
    upstream.searchParams.set("endDateTime", `${toDateKey(rangeEnd)}T23:59:59`);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), INVENTORY_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(upstream.toString(), {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        continue;
      }

      const payload = (await response.json().catch(() => ({}))) as InventoryPayload;
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (items.length > 0) {
        return items;
      }
    } catch {
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  return [];
}

async function fetchVariantCandidatesFromProduct(headoutId: string): Promise<string[]> {
  const endpoints = [
    `${env.HEADOUT_PUBLIC_API_URL}/v1/product/get/${encodeURIComponent(headoutId)}`,
    `${env.API_URL}/api/v1/headout/v1/product/get/${encodeURIComponent(headoutId)}`,
  ];

  for (const endpoint of endpoints) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), INVENTORY_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        continue;
      }

      const payload = await response.json().catch(() => ({}));
      const variants = collectVariantIds(payload).slice(0, MAX_VARIANT_CANDIDATES);
      if (variants.length > 0) {
        return variants;
      }
    } catch {
      continue;
    } finally {
      clearTimeout(timeout);
    }
  }

  return [];
}

export async function GET(req: NextRequest) {
  const variantId = req.nextUrl.searchParams.get("variantId");
  const headoutId = req.nextUrl.searchParams.get("headoutId");
  const days = Math.max(1, Math.min(Number(req.nextUrl.searchParams.get("days") ?? "42"), 42));
  const startDateParam = req.nextUrl.searchParams.get("startDate");

  if (!variantId && !headoutId) {
    return NextResponse.json({ error: "variantId or headoutId is required" }, { status: 400 });
  }

  const today = startOfDay(new Date());
  const requestedStartDate = startDateParam ? startOfDay(new Date(`${startDateParam}T00:00:00`)) : today;
  const rangeStart = requestedStartDate < today ? today : requestedStartDate;
  const rangeEnd = addDays(rangeStart, days - 1);

  try {
    const seedCandidates = uniqueValues([headoutId, variantId]);
    const productCandidates = headoutId ? await fetchVariantCandidatesFromProduct(headoutId) : [];
    const candidateVariantIds = uniqueValues([...seedCandidates, ...productCandidates]).slice(0, MAX_VARIANT_CANDIDATES);

    let resolvedVariantId = "";
    let items: InventoryItem[] = [];

    for (const candidate of candidateVariantIds) {
      const result = await fetchInventoryByVariant(candidate, rangeStart, rangeEnd);
      if (result.length > 0) {
        resolvedVariantId = candidate;
        items = result;
        break;
      }
    }

    const dayMap = new Map<string, CalendarDay>();

    for (let offset = 0; offset < days; offset += 1) {
      const currentDate = addDays(rangeStart, offset);
      const key = toDateKey(currentDate);
      dayMap.set(key, {
        date: key,
        label: formatLabel(currentDate),
        price: null,
        currency: "USD",
        availability: "UNAVAILABLE",
        slots: [],
      });
    }

    items.forEach((item) => {
      const key = item.startDateTime?.slice(0, 10);
      if (!key || !dayMap.has(key)) {
        return;
      }

      const current = dayMap.get(key);
      if (!current) {
        return;
      }

      const price = getItemPrice(item);
      const currency = item.pricing?.persons?.[0]?.headoutSellingPrice != null ? current.currency : current.currency;
      const slot = getSlot(item.startDateTime);

      current.price = current.price == null ? price : Math.min(current.price, price ?? current.price);
      current.currency = currency || current.currency;
      current.availability = item.availability || current.availability;
      if (slot && !current.slots.includes(slot)) {
        current.slots.push(slot);
      }
    });

    const daysPayload = Array.from(dayMap.values()).map((day) => ({
      ...day,
      slots: day.slots.sort(),
      priceLabel: formatPrice(day.price, day.currency),
      isAvailable: day.slots.length > 0,
    }));

    return NextResponse.json({
      days: daysPayload,
      rangeStart: toDateKey(rangeStart),
      rangeEnd: toDateKey(rangeEnd),
      currency: daysPayload.find((day) => day.currency)?.currency ?? "USD",
      resolvedVariantId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch calendar availability",
      },
      { status: 500 },
    );
  }
}