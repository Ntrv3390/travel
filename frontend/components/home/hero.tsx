"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { MapPin, Search, TrendingUp, Sparkles, Star, Award } from "lucide-react";
import { useSearchAutocomplete } from "@/hooks/useSearchAutocomplete";
import { SearchOverlay } from "@/components/search/SearchOverlay";

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}K+`;
  return String(n);
}

interface HeroStats {
  totalExperiences: number;
  totalDestinations: number;
  avgRating: number;
}

export function Hero({ stats }: { stats: HeroStats }) {
  const {
    query,
    setQuery,
    grouped,
    loading,
    open,
    highlightedIndex,
    openDropdown,
    closeDropdown,
    handleKeyDown,
    inputRef,
    dropdownRef,
  } = useSearchAutocomplete();

  const statItems = [
    { icon: Star, value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : "4.8", label: "Average Rating" },
    { icon: Award, value: formatCount(stats.totalDestinations), label: "Destinations" },
  ];

  return (
    <section className="relative min-h-screen overflow-hidden -mt-20 pt-20">
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          src="https://www.youtube.com/embed/FJKPmnyPqsg?autoplay=1&mute=1&loop=1&playlist=FJKPmnyPqsg&controls=0&rel=0&iv_load_policy=3&modestbranding=1&cc_load_policy=0&disablekb=1&fs=0&playsinline=1"
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "177.77777778vh",
            height: "56.25vw",
            minWidth: "100%",
            minHeight: "100%",
            pointerEvents: "none",
          }}
          allow="autoplay; encrypted-media"
          title=""
        />
        <div className="absolute inset-0 bg-gradient-to-br from-sky-950/85 via-slate-900/80 to-indigo-950/85" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(56,189,248,0.15),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.1),transparent_50%)]" />
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: "64px 64px",
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        <div className="flex-1 container flex flex-col items-center justify-center pt-28 pb-16 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/80 backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-sky-400" />
              Discover extraordinary experiences worldwide
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="max-w-4xl text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
          >
            Discover the World,{" "}
            <span className="bg-gradient-to-r from-sky-300 via-cyan-300 to-teal-300 bg-clip-text text-transparent">
              Your Way
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-6 max-w-2xl text-lg text-white/60 sm:text-xl"
          >
            Curated tours, activities, and experiences crafted by locals. Book unique adventures in{" "}
            <span className="font-semibold text-white">{formatCount(stats.totalDestinations)} destinations</span> worldwide.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="mt-10 w-full max-w-3xl"
          >
            <div className="relative rounded-2xl border border-white/10 bg-white/5 p-2 backdrop-blur-xl">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                  <input
                    ref={inputRef as React.Ref<HTMLInputElement>}
                    type="text"
                    placeholder="Where do you want to go?"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => {
                      if (query.length >= 2) openDropdown();
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full rounded-xl border-0 bg-white/10 py-3 pl-10 pr-4 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                    role="combobox"
                    aria-expanded={open}
                    aria-label="Search"
                    autoComplete="off"
                  />
                  {/* Overlay needs inverted colors for hero */}
                  <div ref={dropdownRef as React.Ref<HTMLDivElement>} className="absolute left-0 right-0 top-full z-50 mt-2">
                    {open && (
                      <div className="overflow-y-auto rounded-2xl border border-slate-200/80 bg-white shadow-2xl max-h-[70vh]">
                        {/* Loading */}
                        {loading && (
                          <div className="flex items-center gap-3 px-5 py-4 text-sm text-slate-500">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-500" />
                            Searching...
                          </div>
                        )}

                        {/* Attractions */}
                        {grouped.attractions.length > 0 && (
                          <div className="px-3 pb-2 pt-3">
                            <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Attractions</p>
                            <div className="space-y-0.5">
                              {grouped.attractions.map((item) => (
                                <Link
                                  key={item.id}
                                  href={item.url}
                                  onClick={closeDropdown}
                                  className="flex items-center gap-3 rounded-xl px-2 py-2 text-slate-900 transition-colors hover:bg-slate-50"
                                >
                                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                                    {item.imageUrl && (
                                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                    )}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-sm font-medium">{item.name}</p>
                                    <p className="truncate text-xs text-slate-500">
                                      {item.city}{item.category ? ` \u00B7 ${item.category}` : ""}
                                    </p>
                                  </div>
                                  {item.price > 0 && (
                                    <span className="shrink-0 text-sm font-semibold">
                                      {new Intl.NumberFormat("en-US", { style: "currency", currency: item.currency, minimumFractionDigits: 0 }).format(item.price)}
                                    </span>
                                  )}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Cities */}
                        {grouped.cities.length > 0 && (
                          <div className="px-3 pb-2 pt-1">
                            <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Cities</p>
                            <div className="space-y-0.5">
                              {grouped.cities.map((item) => (
                                <Link
                                  key={item.code}
                                  href={item.url}
                                  onClick={closeDropdown}
                                  className="flex items-center gap-3 rounded-xl px-2 py-2 text-slate-900 transition-colors hover:bg-slate-50"
                                >
                                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100" />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium">{item.name}</p>
                                    {item.country && <p className="text-xs text-slate-500">{item.country}</p>}
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Categories */}
                        {grouped.categories.length > 0 && (
                          <div className="px-3 pb-2 pt-1">
                            <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Categories</p>
                            <div className="space-y-0.5">
                              {grouped.categories.map((item) => (
                                <Link
                                  key={item.id}
                                  href={item.url}
                                  onClick={closeDropdown}
                                  className="flex items-center gap-3 rounded-xl px-2 py-2 text-slate-900 transition-colors hover:bg-slate-50"
                                >
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                                    <Search className="h-5 w-5" />
                                  </div>
                                  <p className="text-sm font-medium">{item.name}</p>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Empty */}
                        {query.length >= 2 && !loading && !grouped.attractions.length && !grouped.cities.length && !grouped.categories.length && (
                          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
                            <Search className="h-8 w-8 text-slate-300" />
                            <p className="text-sm font-medium text-slate-600">No results found</p>
                            <p className="text-xs text-slate-400">Try searching for a city, attraction, or category</p>
                          </div>
                        )}

                        {/* Initial - Popular Destinations from API */}
                        {query.length < 2 && grouped.cities.length > 0 && (
                          <div className="space-y-4 px-5 py-5">
                            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-slate-400">
                              <TrendingUp className="h-3 w-3" />
                              Popular Destinations
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {grouped.cities.map((city) => (
                                <Link
                                  key={city.code}
                                  href={city.url}
                                  onClick={closeDropdown}
                                  className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-200"
                                >
                                  {city.name}
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <Link
                  href={query.trim() ? `/search?q=${encodeURIComponent(query.trim())}` : "/search"}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition-all hover:from-sky-400 hover:to-cyan-400 hover:shadow-xl hover:shadow-sky-500/30"
                >
                  <Search className="h-4 w-4" />
                  <span className="hidden sm:inline">Search</span>
                </Link>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.65 }}
            className="mt-8 flex flex-wrap items-center justify-center gap-6"
          >
            {statItems.map((stat) => (
              <div key={stat.label} className="flex items-center gap-2 text-white/60">
                <stat.icon className="h-4 w-4 text-sky-400" />
                <span className="text-sm">
                  <span className="font-semibold text-white">{stat.value}</span> {stat.label}
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="relative pb-8"
        >
          <div className="container">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { title: "Top Rated", desc: "Curated by travel experts", icon: Star, color: "from-amber-500/20 to-orange-500/10" },
                { title: "Best Price Guarantee", desc: "Lowest price, every time", icon: Award, color: "from-emerald-500/20 to-teal-500/10" },
                { title: "24/7 Support", desc: "We're here to help", icon: TrendingUp, color: "from-sky-500/20 to-blue-500/10" },
              ].map((item, i) => (
                <motion.div
                  key={item.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.9 + i * 0.1 }}
                  className={`flex items-center gap-4 rounded-2xl border border-white/10 bg-gradient-to-br ${item.color} p-4 backdrop-blur-md`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                    <item.icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">{item.title}</p>
                    <p className="text-xs text-white/60">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
