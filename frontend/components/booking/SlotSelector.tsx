"use client";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export interface Slot {
  inventoryId: string;
  startDateTime: string;
  slot?: string;
  availability: string;
  price?: number;
  currency: string;
  seatsAvailable?: number;
}

interface SlotSelectorProps {
  slots: Slot[];
  value: string;
  onChange: (value: string) => void;
}

export function SlotSelector({ slots, value, onChange }: SlotSelectorProps) {
  if (!slots || slots.length === 0) return null;

  return (
    <div className="space-y-2">
      <Label>Time Slot</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a time slot" />
        </SelectTrigger>
        <SelectContent>
          {slots.map((slot) => {
            const timeLabel = slot.slot ? slot.slot : new Date(slot.startDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return (
              <SelectItem key={slot.inventoryId} value={slot.inventoryId} disabled={slot.availability === "UNAVAILABLE" || slot.availability === "SOLD_OUT"}>
                {timeLabel} {slot.price ? `(+${slot.price} ${slot.currency})` : ""}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
