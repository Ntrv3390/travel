"use client";

import { createContext, useContext, useMemo, useState } from "react";

interface BookingState {
  variantId: string;
  date: string;
  adults: number;
  children: number;
}

interface BookingContextValue {
  state: BookingState;
  setState: (updater: Partial<BookingState>) => void;
}

const BookingContext = createContext<BookingContextValue | undefined>(undefined);

export function BookingProvider({ children }: { children: React.ReactNode }) {
  const [state, setRawState] = useState<BookingState>({
    variantId: "",
    date: "",
    adults: 1,
    children: 0,
  });

  const setState = (updater: Partial<BookingState>) => {
    setRawState((current) => ({ ...current, ...updater }));
  };

  const value = useMemo(() => ({ state, setState }), [state]);
  return <BookingContext.Provider value={value}>{children}</BookingContext.Provider>;
}

export function useBooking() {
  const context = useContext(BookingContext);
  if (!context) {
    throw new Error("useBooking must be used within BookingProvider");
  }
  return context;
}
