"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { validateSeatmap } from "@/lib/api";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import type { IframeSeat, SeatmapValidateResponse, SeatmapValidationError } from "@/types/product";

const HEADOUT_ORIGIN = "https://www.headout.com";

interface SeatmapIframeProps {
  productId: string;
  variantId: string | number;
  date: string;
  startTime: string;
  onSeatsConfirmed: (seats: IframeSeat[], validation: SeatmapValidateResponse) => void;
  className?: string;
}

type IframePhase =
  | "loading"
  | "init-sent"
  | "map-loading"
  | "ready"
  | "validating"
  | "validation-error"
  | "error";

export function SeatmapIframe({
  productId,
  variantId,
  date,
  startTime,
  onSeatsConfirmed,
  className,
}: SeatmapIframeProps) {
  const { currency } = useCurrency();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [phase, setPhase] = useState<IframePhase>("loading");
  const [validationErrors, setValidationErrors] = useState<SeatmapValidationError[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<IframeSeat[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const initSentRef = useRef(false);
  const pluginSentRef = useRef(false);

  const iframeSrc = `${HEADOUT_ORIGIN}/api/public/v2/products/${encodeURIComponent(productId)}/seatmap/`;

  const sendToIframe = useCallback((msg: object) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), HEADOUT_ORIGIN);
  }, []);

  const handleLoad = useCallback(() => {
    if (initSentRef.current) return;
    initSentRef.current = true;
    setPhase("init-sent");
    sendToIframe({ type: "init" });
  }, [sendToIframe]);

  const handleValidate = useCallback(
    async (seats: IframeSeat[]) => {
      if (seats.length === 0) return;
      setPhase("validating");
      setValidationErrors([]);

      const inventoryId = Number(seats[0].inventorySlotId);
      const seatCodes = seats.map((s) => s.seatCode);

      const result = await validateSeatmap(
        productId,
        variantId,
        { inventoryId, seatCodes },
        currency,
      );

      if (result.error || !result.data) {
        setPhase("validation-error");
        setValidationErrors([
          { code: "SEAT_UNAVAILABLE", message: result.error ?? "Validation failed", seatCode: "" },
        ]);
        return;
      }

      if (result.data.validationErrors.length > 0) {
        setPhase("validation-error");
        setValidationErrors(result.data.validationErrors);
        return;
      }

      onSeatsConfirmed(seats, result.data);
    },
    [productId, variantId, currency, onSeatsConfirmed],
  );

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== HEADOUT_ORIGIN) return;
      let msg: { type: string; data?: Record<string, unknown> };
      try {
        msg = JSON.parse(event.data as string);
      } catch {
        return;
      }
      const { type, data } = msg;

      switch (type) {
        case "iframeInitCompleted":
          if (pluginSentRef.current) break;
          pluginSentRef.current = true;
          sendToIframe({
            type: "initPlugin",
            data: {
              options: {
                date,
                time: startTime.length === 5 ? `${startTime}:00` : startTime,
                currencyCode: currency,
                deviceType: window.innerWidth >= 768 ? "DESKTOP" : "MOBILE",
              },
            },
          });
          break;

        case "initializingSeatmapStarted":
          setPhase("map-loading");
          break;

        case "initializingSeatmapCompleted":
          setPhase("ready");
          break;

        case "onSeatSelectionChanged": {
          const seats = (data?.seats ?? []) as IframeSeat[];
          setSelectedSeats(seats);
          break;
        }

        case "onSeatSelectionSubmitted": {
          const seats = (data?.seats ?? []) as IframeSeat[];
          setSelectedSeats(seats);
          handleValidate(seats);
          break;
        }

        default:
          break;
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [date, startTime, currency, sendToIframe, handleValidate]);

  const isOverlayVisible = phase === "loading" || phase === "map-loading" || phase === "validating";
  const showError = phase === "validation-error" || phase === "error";

  return (
    <div className={cn("relative flex flex-col", className)}>
      {/* Iframe */}
      <div className="relative flex-1 overflow-hidden rounded-2xl border border-border/60 bg-background">
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title="Seat Map"
          onLoad={handleLoad}
          onError={() => {
            setPhase("error");
            setErrorMsg("Failed to load the seat map. Please try again.");
          }}
          className="h-full w-full"
          allow="same-origin"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          style={{ minHeight: 480 }}
        />

        {/* Loading overlay */}
        {isOverlayVisible && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-background/90 backdrop-blur-sm">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <p className="text-sm font-medium text-muted-foreground">
              {phase === "validating" ? "Checking seat availability…" : "Loading seat map…"}
            </p>
          </div>
        )}
      </div>

      {/* Seat selection summary bar */}
      {phase === "ready" && selectedSeats.length > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl border border-brand-200 bg-brand-50/50 px-4 py-2.5 dark:border-brand-900/40 dark:bg-brand-950/20">
          <p className="text-sm font-medium text-foreground">
            {selectedSeats.length} seat{selectedSeats.length !== 1 ? "s" : ""} selected
          </p>
          <p className="text-sm text-muted-foreground">
            {selectedSeats[0]?.currency}
            {selectedSeats.reduce((s, x) => s + (x.price ?? 0), 0).toFixed(2)} total
          </p>
        </div>
      )}

      {/* Validation errors */}
      {showError && validationErrors.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-start gap-3 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">
                Seat selection issue
              </p>
              <ul className="mt-1 space-y-0.5">
                {validationErrors.map((e, i) => (
                  <li key={i} className="text-xs text-rose-700 dark:text-rose-400">
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex justify-end border-t border-rose-100 px-4 py-2 dark:border-rose-900/30">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1.5 text-xs text-rose-700 hover:bg-rose-100 dark:text-rose-400"
              onClick={() => {
                setPhase("ready");
                setValidationErrors([]);
                pluginSentRef.current = false;
                initSentRef.current = false;
                iframeRef.current?.contentWindow?.location.reload();
              }}
            >
              <RefreshCw className="h-3 w-3" />
              Try different seats
            </Button>
          </div>
        </div>
      )}

      {/* Generic error */}
      {phase === "error" && errorMsg && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-950/20">
          <AlertCircle className="h-4 w-4 flex-shrink-0 text-rose-600" />
          <p className="text-sm text-rose-700 dark:text-rose-400">{errorMsg}</p>
        </div>
      )}
    </div>
  );
}
