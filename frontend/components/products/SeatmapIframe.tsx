"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { validateSeatmap } from "@/lib/api";
import { useCurrency } from "@/hooks/useCurrency";
import { cn } from "@/lib/utils";
import type { IframeSeat, SeatmapValidateResponse, SeatmapValidationError } from "@/types/product";

const HEADOUT_ORIGIN = "https://www.headout.com";
// Max wait for iframeInitCompleted before declaring the embed blocked.
const IFRAME_INIT_TIMEOUT_MS = 5000;

interface SeatmapIframeProps {
  productId: string;
  variantId: string | number;
  date: string;
  startTime: string;
  onSeatsConfirmed: (seats: IframeSeat[], validation: SeatmapValidateResponse) => void;
  onFallback?: () => void;
  className?: string;
}

type Phase =
  | "waiting"          // iframe hidden, waiting for iframeInitCompleted
  | "map-loading"      // init handshake done, map rendering
  | "ready"            // map fully rendered, user can interact
  | "validating"       // user submitted seats, calling validate API
  | "validation-error" // validate returned errors
  | "error";           // non-recoverable error

export function SeatmapIframe({
  productId,
  variantId,
  date,
  startTime,
  onSeatsConfirmed,
  onFallback,
  className,
}: SeatmapIframeProps) {
  const { currency } = useCurrency();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [phase, setPhase] = useState<Phase>("waiting");
  const [validationErrors, setValidationErrors] = useState<SeatmapValidationError[]>([]);
  const [selectedSeats, setSelectedSeats] = useState<IframeSeat[]>([]);

  const initSentRef = useRef(false);
  const pluginSentRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const iframeSrc = `${HEADOUT_ORIGIN}/api/public/v2/products/${encodeURIComponent(productId)}/seatmap/`;

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const triggerFallback = useCallback(() => {
    clearTimer();
    onFallback?.();
  }, [clearTimer, onFallback]);

  const sendToIframe = useCallback((msg: object) => {
    iframeRef.current?.contentWindow?.postMessage(JSON.stringify(msg), HEADOUT_ORIGIN);
  }, []);

  // Iframe onLoad — send `init` and start the blocked-domain timer.
  // The iframe `onLoad` fires even when the domain is blocked (CSP frame-ancestors)
  // because the browser receives the HTTP response. If iframeInitCompleted doesn't
  // come back within IFRAME_INIT_TIMEOUT_MS we know embedding is blocked.
  const handleLoad = useCallback(() => {
    if (initSentRef.current) return;
    initSentRef.current = true;
    sendToIframe({ type: "init" });
    timerRef.current = setTimeout(triggerFallback, IFRAME_INIT_TIMEOUT_MS);
  }, [sendToIframe, triggerFallback]);

  const handleValidate = useCallback(
    async (seats: IframeSeat[]) => {
      if (seats.length === 0) return;
      setPhase("validating");
      setValidationErrors([]);

      const inventoryId = Number(seats[0].inventorySlotId);
      const seatCodes = seats.map(s => s.seatCode);

      const result = await validateSeatmap(productId, variantId, { inventoryId, seatCodes }, currency);

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

  // postMessage listener
  useEffect(() => {
    const listener = (event: MessageEvent) => {
      if (event.origin !== HEADOUT_ORIGIN) return;
      let msg: { type: string; data?: Record<string, unknown> };
      try { msg = JSON.parse(event.data as string); } catch { return; }
      const { type, data } = msg;

      switch (type) {
        case "iframeInitCompleted":
          if (pluginSentRef.current) break;
          pluginSentRef.current = true;
          clearTimer(); // domain is whitelisted — cancel fallback timer
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

        case "onSeatSelectionChanged":
          setSelectedSeats((data?.seats ?? []) as IframeSeat[]);
          break;

        case "onSeatSelectionSubmitted":
          handleValidate((data?.seats ?? []) as IframeSeat[]);
          break;

        default:
          break;
      }
    };

    window.addEventListener("message", listener);
    return () => {
      window.removeEventListener("message", listener);
      clearTimer();
    };
  }, [date, startTime, currency, sendToIframe, handleValidate, clearTimer]);

  const isLoading = phase === "waiting" || phase === "map-loading" || phase === "validating";
  const iframeVisible = phase === "ready" || phase === "validating" || phase === "validation-error";

  return (
    <div className={cn("relative flex flex-col", className)}>
      {/* Loading state — shown until map is ready (user never sees headout's error page) */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-border/60 bg-muted/30 py-20">
          <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
          <p className="text-sm font-medium text-muted-foreground">
            {phase === "validating" ? "Checking seat availability…" : "Loading seat map…"}
          </p>
        </div>
      )}

      {/* Iframe — only becomes visible once the map is fully rendered */}
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-border/60 bg-background",
          iframeVisible ? "block" : "hidden",
        )}
      >
        <iframe
          ref={iframeRef}
          src={iframeSrc}
          title="Seat Map"
          onLoad={handleLoad}
          onError={triggerFallback}
          className="w-full"
          style={{ minHeight: 480, display: "block" }}
        />
      </div>

      {/* Seat summary bar */}
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
      {phase === "validation-error" && validationErrors.length > 0 && (
        <div className="mt-3 overflow-hidden rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20">
          <div className="flex items-start gap-3 px-4 py-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-rose-800 dark:text-rose-300">Seat selection issue</p>
              <ul className="mt-1 space-y-0.5">
                {validationErrors.map((e, i) => (
                  <li key={i} className="text-xs text-rose-700 dark:text-rose-400">{e.message}</li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex justify-end border-t border-rose-100 px-4 py-2 dark:border-rose-900/30">
            <button
              className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 dark:text-rose-400"
              onClick={() => {
                setPhase("ready");
                setValidationErrors([]);
              }}
            >
              <RefreshCw className="h-3 w-3" />
              Try different seats
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
