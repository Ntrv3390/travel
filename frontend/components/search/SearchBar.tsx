"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);
    router.push(`/search?${params.toString()}`);
  };

  return (
    <form
      onSubmit={onSubmit}
      className={
        compact ? "grid grid-cols-[minmax(0,1fr)_220px_auto] items-center gap-2 lg:grid-cols-[minmax(0,1fr)_260px_auto]" : "grid gap-3 md:grid-cols-[1fr_1fr_auto]"
      }
    >
      <Input
        placeholder="Search experiences"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className={compact ? "h-12 rounded-xl border-slate-200 bg-white/90 text-base shadow-sm focus-visible:ring-sky-500" : ""}
      />
      <Input
        placeholder="City"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className={compact ? "h-12 rounded-xl border-slate-200 bg-white/90 text-base shadow-sm focus-visible:ring-sky-500" : ""}
      />
      <Button
        type="submit"
        className={compact ? "h-12 rounded-xl bg-sky-600 px-6 text-2xl font-bold shadow-[0_10px_24px_rgba(14,165,233,0.28)] hover:bg-sky-700 gap-2" : "gap-2"}
      >
        <Search className="h-4 w-4" />
        Search
      </Button>
    </form>
  );
}
