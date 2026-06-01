"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/hooks/useCurrency";

/**
 * Invisible client component that re-runs the parent server component
 * whenever the user changes currency — so the PDP always shows fresh
 * prices for the selected currency.
 */
export function PdpCurrencyReloader() {
  const { currency } = useCurrency();
  const router = useRouter();
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    router.refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  return null;
}
