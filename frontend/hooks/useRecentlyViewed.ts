"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { batchLookupRecentlyViewed } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { Experience } from "@/types/experience";

const STORAGE_KEY = "triipzy_recently_viewed";
const MAX_ITEMS = 20;

export interface RecentlyViewedItem {
  headoutId: string;
  title: string;
  imageUrl: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  city: string;
  category: string;
  slug: string;
  duration: string;
  viewedAt: string;
}

function loadFromStorage(): RecentlyViewedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentlyViewedItem[];
  } catch {
    return [];
  }
}

function saveToStorage(items: RecentlyViewedItem[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useRecentlyViewed() {
  const { user } = useAuth();
  const [items, setItems] = useState<RecentlyViewedItem[]>([]);
  const isLoggedIn = !!user;

  const refresh = useCallback(async () => {
    if (isLoggedIn) {
      try {
        const data = await api.get<{ data?: BackendExperience[] }>("/api/v1/recently-viewed");
        const backendItems = (data?.data ?? []).map(backendToItem);
        setItems(backendItems);
      } catch {
        setItems([]);
      }
    } else {
      const local = loadFromStorage();
      if (local.length === 0) {
        setItems([]);
        return;
      }

      const ids = local.map((i) => i.headoutId);
      const result = await batchLookupRecentlyViewed(ids);
      if (result.data?.experiences && result.data.experiences.length > 0) {
        const lookupMap = new Map<string, Experience>();
        for (const exp of result.data.experiences) {
          lookupMap.set(exp.headoutId || exp.id, exp);
        }

        const merged: RecentlyViewedItem[] = [];
        for (const item of local) {
          const fresh = lookupMap.get(item.headoutId);
          if (fresh) {
            merged.push(experienceToItem(fresh));
          } else {
            merged.push(item);
          }
        }
        setItems(merged);
      } else {
        setItems(local);
      }
    }
  }, [isLoggedIn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, refresh };
}

export function removeFromRecentlyViewed(headoutId: string) {
  // Always remove from localStorage
  const local = loadFromStorage();
  const filtered = local.filter((i) => i.headoutId !== headoutId);
  if (filtered.length !== local.length) {
    saveToStorage(filtered);
  }

  // If logged in, also remove from backend
  const accessToken = localStorage.getItem("triipzy_access_token");
  if (accessToken) {
    fetch("/api/v1/recently-viewed/remove", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ headout_id: headoutId }),
    }).catch(() => {});
  }
}

export function useTrackRecentlyViewed() {
  const { user } = useAuth();
  const isLoggedIn = !!user;

  const track = useCallback(
    (item: {
      headoutId: string;
      title: string;
      imageUrl: string;
      price: number;
      currency: string;
      rating: number;
      reviewCount: number;
      city: string;
      category: string;
      slug: string;
      duration: string;
    }) => {
      const entry: RecentlyViewedItem = {
        ...item,
        viewedAt: new Date().toISOString(),
      };

      // Always save to localStorage
      const local = loadFromStorage();
      const idx = local.findIndex((i) => i.headoutId === item.headoutId);
      if (idx !== -1) {
        local.splice(idx, 1);
      }
      local.unshift(entry);
      if (local.length > MAX_ITEMS) local.pop();
      saveToStorage(local);

      // If logged in, sync to backend
      if (isLoggedIn) {
        api.post("/api/v1/recently-viewed", item).catch(() => {});
      }
    },
    [isLoggedIn],
  );

  return { track };
}

interface BackendExperience {
  headout_id: string;
  title: string;
  image_url: string;
  price: number;
  currency: string;
  rating: number;
  review_count: number;
  location: string;
  category: string;
  slug: string;
  duration: string;
}

function backendToItem(be: BackendExperience): RecentlyViewedItem {
  return {
    headoutId: be.headout_id,
    title: be.title,
    imageUrl: be.image_url || "",
    price: be.price || 0,
    currency: be.currency || "USD",
    rating: be.rating || 0,
    reviewCount: be.review_count || 0,
    city: be.location || "",
    category: be.category || "",
    slug: "",
    duration: be.duration || "",
    viewedAt: "",
  };
}

function experienceToItem(exp: Experience): RecentlyViewedItem {
  return {
    headoutId: exp.headoutId || exp.id,
    title: exp.title,
    imageUrl: exp.images[0]?.url || "",
    price: exp.options[0]?.price || 0,
    currency: exp.options[0]?.currency || "USD",
    rating: exp.rating || 0,
    reviewCount: exp.reviewCount || 0,
    city: exp.city || "",
    category: exp.categories[0] || "",
    slug: exp.slug || "",
    duration: "",
    viewedAt: "",
  };
}
