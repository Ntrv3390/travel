import { Clock3, Languages, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Experience } from "@/types/experience";

interface ExperienceHeaderProps {
  experience: Experience;
}

function formatDuration(minSeconds: number, maxSeconds: number) {
  const minHours = minSeconds > 0 ? minSeconds / 3600 : 1.5;
  const maxHours = maxSeconds > 0 ? maxSeconds / 3600 : 2;
  if (Math.abs(minHours - maxHours) < 0.25) {
    return `${minHours.toFixed(1)} hours`;
  }
  return `${minHours.toFixed(1)} to ${maxHours.toFixed(1)} hours`;
}

export function ExperienceHeader({ experience }: ExperienceHeaderProps) {
  return (
    <header className="mb-4 mt-5 md:my-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-base font-bold text-slate-900">{experience.rating ? experience.rating.toFixed(1) : "4.5"}</span>
        <span className="text-sm tracking-wide text-amber-500">★★★★★</span>
        <span className="text-sm text-slate-500">
          {experience.reviewCount > 0 ? experience.reviewCount.toLocaleString() : "New"} verified reviews
        </span>
      </div>
      <h1 className="m-0 max-w-5xl text-[1.48rem] font-black leading-[1.14] tracking-[-0.03em] text-slate-950 md:text-[clamp(1.95rem,2.45vw,2.75rem)] md:leading-[1.1]">
        {experience.title}
      </h1>
      <p className="mt-2 max-w-[760px] text-sm leading-relaxed text-slate-500 md:mt-3 md:text-base md:leading-[1.62]">
        {experience.description}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge className="rounded-full border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-800 md:text-xs">
          <Clock3 size={14} className="mr-1" /> {formatDuration(experience.durationMinSeconds, experience.durationMaxSeconds)}
        </Badge>
        <Badge className="rounded-full border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-800 md:text-xs">
          <Languages size={14} className="mr-1" /> {experience.languages.length ? experience.languages.join(", ") : "English"}
        </Badge>
        <Badge className="rounded-full border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-800 md:text-xs">
          <MapPin size={14} className="mr-1" /> {experience.city}
        </Badge>
      </div>
    </header>
  );
}
