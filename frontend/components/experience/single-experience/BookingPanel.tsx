"use client";

import { CalendarCheck2, CheckCircle2, ShieldCheck, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface BookingPanelProps {
  priceLabel: string;
  onSelectOptions: () => void;
}

export function BookingPanel({
  priceLabel,
  onSelectOptions,
}: BookingPanelProps) {
  return (
    <>
      <aside className="sticky top-[9rem] self-start z-10 h-fit">
        <Card className="w-full rounded-2xl border border-slate-300/90 bg-[radial-gradient(circle_at_88%_0%,rgba(37,99,235,0.09),transparent_35%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_26px_46px_rgba(15,23,42,0.16)]">
          <CardContent className="p-0">
            <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">From</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-[2.12rem] font-black leading-none tracking-tight text-slate-900 md:text-[2.55rem]">{priceLabel}</span>
              <span className="text-sm text-slate-500 md:text-base">per person</span>
            </div>
            <Button
              className="mt-3 h-11 w-full rounded-2xl bg-gradient-to-r from-blue-700 to-brand-600 text-base font-bold text-white shadow-[0_14px_28px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(37,99,235,0.42)]"
              onClick={onSelectOptions}
            >
              Select options
            </Button>

            <Separator className="my-3" />

            <div className="grid gap-2 text-xs text-slate-700 md:text-sm">
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 size={14} className="text-brand-600" /> Instant confirmation
              </span>
              <span className="inline-flex items-center gap-2">
                <Smartphone size={14} className="text-brand-600" /> Mobile tickets accepted
              </span>
              <span className="inline-flex items-center gap-2">
                <CalendarCheck2 size={14} className="text-brand-600" /> Free cancellation up to 24h
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck size={14} className="text-brand-600" /> Top-rated experience
              </span>
            </div>
          </CardContent>
        </Card>
      </aside>

      <div className="fixed bottom-[calc(0.55rem+env(safe-area-inset-bottom))] left-2 right-2 z-30 flex items-center justify-between gap-3 rounded-2xl border border-slate-300/90 bg-[radial-gradient(circle_at_0%_0%,rgba(37,99,235,0.12),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.95))] p-2 shadow-[0_14px_28px_rgba(15,23,42,0.16)] backdrop-blur md:hidden">
        <div className="grid min-w-0 gap-0">
          <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">from</p>
          <strong className="block text-lg font-extrabold leading-none tracking-tight text-slate-900">{priceLabel}</strong>
          <span className="text-xs text-slate-500"> per person</span>
        </div>
        <Button
          className="h-10 rounded-xl bg-gradient-to-r from-blue-700 to-brand-600 px-4 text-sm font-extrabold text-white shadow-[0_10px_20px_rgba(37,99,235,0.32)]"
          onClick={onSelectOptions}
        >
          Select options
        </Button>
      </div>
    </>
  );
}
