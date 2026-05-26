"use client";

import { Button } from "@/components/ui/button";

function Counter({ label, value, onChange, min = 0 }: { label: string; value: number; onChange: (value: number) => void; min?: number }) {
  return (
    <div className="flex items-center justify-between rounded-md border p-2">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => onChange(Math.max(min, value - 1))}>
          -
        </Button>
        <span className="w-6 text-center text-sm">{value}</span>
        <Button variant="outline" size="sm" onClick={() => onChange(value + 1)}>
          +
        </Button>
      </div>
    </div>
  );
}

export function GuestSelector({
  adults,
  children,
  onAdultsChange,
  onChildrenChange,
}: {
  adults: number;
  children: number;
  onAdultsChange: (value: number) => void;
  onChildrenChange: (value: number) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Guests</label>
      <div className="space-y-2">
        <Counter label="Adults" value={adults} onChange={onAdultsChange} min={1} />
        <Counter label="Children" value={children} onChange={onChildrenChange} />
      </div>
    </div>
  );
}
