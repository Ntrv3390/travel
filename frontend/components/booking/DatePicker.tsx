"use client";

import { Input } from "@/components/ui/input";

export function DatePicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Date</label>
      <Input type="date" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
