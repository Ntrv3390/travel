"use client";

import useSWR from "swr";
import { AVAILABILITY_REFRESH_MS } from "@/lib/constants";

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch availability");
  }
  return response.json();
};

export function useAvailability(experienceId: string, variantId: string, date: string) {
  const { data, error, isLoading } = useSWR(
    experienceId && variantId && date
      ? `/api/availability?id=${encodeURIComponent(experienceId)}&variantId=${encodeURIComponent(variantId)}&date=${encodeURIComponent(date)}`
      : null,
    fetcher,
    {
      refreshInterval: AVAILABILITY_REFRESH_MS,
      revalidateOnFocus: true,
    },
  );

  return {
    availability: data,
    isLoading,
    isError: Boolean(error),
  };
}
