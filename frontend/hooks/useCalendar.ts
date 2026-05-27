"use client"

import useSWR from "swr"

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error("Failed to fetch calendar")
  return res.json()
}

export function useCalendar(experienceId: string, months = 2, currency = "USD") {
  const { data, error, isLoading } = useSWR(
    experienceId
      ? `/api/experiences/${encodeURIComponent(experienceId)}/calendar?months=${months}&currency=${currency}`
      : null,
    fetcher,
    { revalidateOnFocus: false, refreshInterval: 120000 }
  )

  return {
    calendar: data,
    isLoading,
    isError: Boolean(error),
  }
}
