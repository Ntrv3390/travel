"use client";

import type { ExperienceOption } from "@/types/experience";
import { Button } from "@/components/ui/button";

export function VariantSelector({ options, value, onChange }: { options: ExperienceOption[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Ticket type</label>
      <div className="grid gap-2">
        {options.map((option) => (
          <Button
            key={option.id}
            variant={value === option.id ? "default" : "outline"}
            onClick={() => onChange(option.id)}
            className="justify-start"
          >
            {option.title}
          </Button>
        ))}
      </div>
    </div>
  );
}
