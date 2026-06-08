"use client";

import { ShieldCheck, Zap, Smartphone, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadgesProps {
  hasFreeCancellation?: boolean;
  hasInstantConfirmation?: boolean;
  hasMobileTicket?: boolean;
  hasReschedulable?: boolean;
  className?: string;
}

export function TrustBadges({
  hasFreeCancellation,
  hasInstantConfirmation,
  hasMobileTicket,
  hasReschedulable,
  className,
}: TrustBadgesProps) {
  const badges = [
    hasFreeCancellation && {
      icon: ShieldCheck,
      label: "Free Cancellation",
      color: "text-emerald-600",
    },
    hasInstantConfirmation && {
      icon: Zap,
      label: "Instant Confirmation",
      color: "text-brand-600",
    },
    hasMobileTicket && {
      icon: Smartphone,
      label: "Mobile Ticket",
      color: "text-violet-600",
    },
    hasReschedulable && {
      icon: RotateCcw,
      label: "Reschedulable",
      color: "text-blue-600",
    },
  ].filter(Boolean) as Array<{ icon: React.ElementType; label: string; color: string }>;

  if (badges.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {badges.map((badge) => (
        <div
          key={badge.label}
          className="glass-subtle flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium"
        >
          <badge.icon className={cn("h-3.5 w-3.5", badge.color)} />
          <span className="text-foreground/80">{badge.label}</span>
        </div>
      ))}
    </div>
  );
}
