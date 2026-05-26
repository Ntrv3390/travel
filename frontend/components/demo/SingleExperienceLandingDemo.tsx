"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock3,
  Heart,
  Languages,
  MapPin,
  ShieldCheck,
  Share2,
  Smartphone,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type GalleryItem = {
  title: string;
  image: string;
};

type Review = {
  name: string;
  country: string;
  date: string;
  text: string;
  stars: number;
};

type RelatedCard = {
  title: string;
  images: string[];
  price: string;
  oldPrice?: string;
  discount?: string;
  location: string;
  rating: string;
  reviews: string;
  badge?: string;
};

const SINGLE_IMAGE =
  "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1800&q=80";

const gallery: GalleryItem[] = Array.from({ length: 5 }, (_, index) => ({
  title: `Eiffel view ${index + 1}`,
  image: SINGLE_IMAGE,
}));

const highlights = [
  "Reserved Eiffel Tower entry with guided introduction",
  "2nd floor access with optional summit extension",
  "Small groups for smoother movement through checkpoints",
  "Audio support for clear storytelling during the experience",
];

const reviews: Review[] = [
  {
    name: "Mariam",
    country: "UAE",
    date: "2 days ago",
    stars: 5,
    text: "Excellent pacing and very polished organization. The guide made the history engaging and we had enough time for photos.",
  },
  {
    name: "Jon",
    country: "UK",
    date: "1 week ago",
    stars: 4,
    text: "Great option for first-time visitors. The meeting instructions were clear and entry was much smoother than expected.",
  },
  {
    name: "Ayan",
    country: "India",
    date: "2 weeks ago",
    stars: 5,
    text: "Loved the summit upgrade. The team handled everything professionally and the city views were unreal.",
  },
  {
    name: "Sofia",
    country: "Spain",
    date: "3 days ago",
    stars: 5,
    text: "The host was warm, organized, and very clear. We skipped uncertainty and went straight into an amazing experience.",
  },
  {
    name: "Noah",
    country: "US",
    date: "5 days ago",
    stars: 4,
    text: "Excellent for couples. Fast check-in, smooth access, and great recommendations for best photo corners.",
  },
  {
    name: "Leila",
    country: "Morocco",
    date: "6 days ago",
    stars: 5,
    text: "Everything felt premium and stress-free. Communication before the tour was also really helpful.",
  },
  {
    name: "Kai",
    country: "Germany",
    date: "1 week ago",
    stars: 4,
    text: "Very good route planning and pacing. We never felt rushed, and still covered all the iconic viewpoints.",
  },
  {
    name: "Ava",
    country: "Canada",
    date: "1 week ago",
    stars: 5,
    text: "The summit option was the best decision. Strongly recommended for anyone visiting Paris for the first time.",
  },
  {
    name: "Yusuf",
    country: "Saudi Arabia",
    date: "9 days ago",
    stars: 5,
    text: "Clean process from start to end. The guide kept the energy high and answered every question clearly.",
  },
  {
    name: "Emma",
    country: "Australia",
    date: "10 days ago",
    stars: 4,
    text: "Great value. Timings were accurate, and the whole team looked experienced handling large tourist crowds.",
  },
  {
    name: "Ravi",
    country: "India",
    date: "11 days ago",
    stars: 5,
    text: "One of our best memories in Paris. The photo stops were perfectly timed and the views were spectacular.",
  },
  {
    name: "Nora",
    country: "France",
    date: "12 days ago",
    stars: 4,
    text: "Professional team and smooth logistics. Would definitely book this format again for guests visiting us.",
  },
  {
    name: "Daniel",
    country: "Ireland",
    date: "2 weeks ago",
    stars: 5,
    text: "This was exactly what we wanted: minimal hassle, strong storytelling, and premium service feel throughout.",
  },
];

const combinations: RelatedCard[] = [
  {
    title: "Arc de Triomphe + Eiffel Tower Combo",
    images: [SINGLE_IMAGE, SINGLE_IMAGE, SINGLE_IMAGE],
    price: "from ₹87",
    oldPrice: "₹99",
    discount: "12% off",
    location: "Paris",
    rating: "4.5",
    reviews: "1.8k",
  },
  {
    title: "Eiffel Tower + Notre-Dame",
    images: [SINGLE_IMAGE, SINGLE_IMAGE, SINGLE_IMAGE],
    price: "from ₹95",
    oldPrice: "₹110",
    badge: "Selling out fast",
    location: "Paris",
    rating: "4.6",
    reviews: "1.2k",
  },
  {
    title: "Eiffel Tower + Seine Cruise",
    images: [SINGLE_IMAGE, SINGLE_IMAGE, SINGLE_IMAGE],
    price: "from ₹57",
    location: "Paris",
    rating: "4.4",
    reviews: "980",
  },
  {
    title: "Louvre + Eiffel Reserved Entry",
    images: [SINGLE_IMAGE, SINGLE_IMAGE, SINGLE_IMAGE],
    price: "from ₹91",
    location: "Paris",
    rating: "4.6",
    reviews: "1.1k",
  },
  {
    title: "Seine Evening Cruise + Eiffel",
    images: [SINGLE_IMAGE, SINGLE_IMAGE, SINGLE_IMAGE],
    price: "from ₹74",
    oldPrice: "₹86",
    location: "Paris",
    rating: "4.5",
    reviews: "890",
  },
  {
    title: "Montmartre Walk + Tower Access",
    images: [SINGLE_IMAGE, SINGLE_IMAGE, SINGLE_IMAGE],
    price: "from ₹69",
    location: "Paris",
    rating: "4.4",
    reviews: "760",
  },
  {
    title: "Notre-Dame + Eiffel Summit Option",
    images: [SINGLE_IMAGE, SINGLE_IMAGE, SINGLE_IMAGE],
    price: "from ₹88",
    badge: "Selling out fast",
    location: "Paris",
    rating: "4.7",
    reviews: "1.4k",
  },
  {
    title: "Paris Highlights Pass + Eiffel",
    images: [SINGLE_IMAGE, SINGLE_IMAGE, SINGLE_IMAGE],
    price: "from ₹79",
    location: "Paris",
    rating: "4.5",
    reviews: "920",
  },
];

const moreWays: RelatedCard[] = [
  {
    title: "Eiffel Summit by Elevator",
    images: [SINGLE_IMAGE, SINGLE_IMAGE, SINGLE_IMAGE],
    price: "from ₹112",
    oldPrice: "₹127",
    discount: "11% off",
    location: "Paris",
    rating: "4.7",
    reviews: "2.1k",
  },
  {
    title: "Night Entry + Sparkle Show",
    images: [SINGLE_IMAGE, SINGLE_IMAGE, SINGLE_IMAGE],
    price: "from ₹99",
    badge: "Selling out fast",
    location: "Paris",
    rating: "4.6",
    reviews: "1.5k",
  },
  {
    title: "Champ de Mars Photo Walk",
    images: [SINGLE_IMAGE, SINGLE_IMAGE, SINGLE_IMAGE],
    price: "from ₹58",
    oldPrice: "₹66",
    location: "Paris",
    rating: "4.5",
    reviews: "870",
  },
  {
    title: "Louvre + River Evening",
    images: [SINGLE_IMAGE, SINGLE_IMAGE, SINGLE_IMAGE],
    price: "from ₹63",
    location: "Paris",
    rating: "4.4",
    reviews: "730",
  },
];

const ratingBreakdown = [
  { label: "Excellent", value: "74%" },
  { label: "Very good", value: "18%" },
  { label: "Good", value: "5%" },
  { label: "Average", value: "2%" },
  { label: "Poor", value: "1%" },
];

const sectionLinks = [
  { href: "#included", label: "Included" },
  { href: "#about", label: "About" },
  { href: "#reviews", label: "Reviews" },
  { href: "#combinations", label: "Combinations" },
  { href: "#more-ways", label: "More ways" },
];

const slotPools = [
  ["09:00", "11:30", "14:00", "18:15"],
  ["10:00", "12:45", "15:30", "19:00"],
  ["09:30", "13:00", "16:30", "20:00"],
  ["08:45", "11:15", "14:45", "18:30"],
] as const;

const sectionMotion = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

const sectionCardClass =
  "scroll-mt-[10.2rem] rounded-2xl border border-slate-200/70 bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.06)] md:p-5 lg:scroll-mt-[10.5rem]";

const reviewSpanClass: Record<string, string> = {
  reviewSpanFull: "md:col-span-6 lg:col-span-12",
  reviewSpanQuarter: "md:col-span-3 lg:col-span-3",
  reviewSpanHalf: "md:col-span-6 lg:col-span-6",
  reviewSpanWide: "md:col-span-6 lg:col-span-8",
  reviewSpanNarrow: "md:col-span-3 lg:col-span-4",
  reviewSpanThird: "md:col-span-3 lg:col-span-4",
};

const comboSpanClass: Record<string, string> = {
  comboSpanWide: "md:col-span-6 lg:col-span-8",
  comboSpanTall: "md:col-span-3 lg:col-span-4",
  comboSpanThird: "md:col-span-3 lg:col-span-4",
  comboSpanHalf: "md:col-span-6 lg:col-span-6",
  comboSpanQuarter: "md:col-span-2 lg:col-span-3",
};

function formatSelectedDate(dateValue: string) {
  const parsed = new Date(`${dateValue}T00:00:00`);
  return parsed.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function getSlotOptions(dateValue: string) {
  if (!dateValue) {
    return [] as string[];
  }

  const dayIndex = new Date(`${dateValue}T00:00:00`).getDay();
  return [...slotPools[dayIndex % slotPools.length]];
}

function getSlotWindowLabel(slot: string) {
  const hour = Number.parseInt(slot.split(":")[0] ?? "0", 10);

  if (hour < 12) {
    return "Morning";
  }
  if (hour < 17) {
    return "Afternoon";
  }
  return "Evening";
}

function avatarLabel(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function getReviewCardClass(index: number) {
  const pattern = [
    "reviewSpanFull",
    "reviewSpanQuarter",
    "reviewSpanQuarter",
    "reviewSpanQuarter",
    "reviewSpanQuarter",
    "reviewSpanHalf",
    "reviewSpanHalf",
    "reviewSpanWide",
    "reviewSpanNarrow",
    "reviewSpanThird",
    "reviewSpanThird",
    "reviewSpanThird",
    "reviewSpanFull",
  ] as const;

  return pattern[index % pattern.length];
}

function getCombinationCardClass(index: number) {
  const pattern = [
    "comboSpanWide",
    "comboSpanTall",
    "comboSpanThird",
    "comboSpanThird",
    "comboSpanHalf",
    "comboSpanQuarter",
    "comboSpanQuarter",
  ] as const;

  return pattern[index % pattern.length];
}

export function SingleExperienceLandingDemo() {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [cardImageTick, setCardImageTick] = useState(0);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedSlot, setSelectedSlot] = useState("");
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState("Pick a date to unlock available slots.");
  const availabilityTimerRef = useRef<number | null>(null);
  const moreWaysRailRef = useRef<HTMLDivElement | null>(null);

  const slotOptions = getSlotOptions(selectedDate);

  useEffect(() => {
    return () => {
      if (availabilityTimerRef.current !== null) {
        window.clearTimeout(availabilityTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % gallery.length);
    }, 3500);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCardImageTick((current) => current + 1);
    }, 2800);

    return () => window.clearInterval(intervalId);
  }, []);

  const showPrev = () => {
    setActiveImageIndex((current) => (current - 1 + gallery.length) % gallery.length);
  };

  const showNext = () => {
    setActiveImageIndex((current) => (current + 1) % gallery.length);
  };

  const getCardImage = (images: string[], cardSeed: number) => {
    if (images.length === 0) {
      return SINGLE_IMAGE;
    }
    return images[(cardImageTick + cardSeed) % images.length];
  };

  const heroPreviewItems = Array.from({ length: 4 }, (_, offset) => {
    const galleryIndex = (activeImageIndex + offset + 1) % gallery.length;
    return {
      item: gallery[galleryIndex],
      galleryIndex,
    };
  });

  const scrollMoreWays = (direction: "left" | "right") => {
    const rail = moreWaysRailRef.current;
    if (!rail) return;

    const distance = Math.max(rail.clientWidth * 0.82, 280);
    rail.scrollBy({
      left: direction === "right" ? distance : -distance,
      behavior: "smooth",
    });
  };

  const handleDateChange = (value: string) => {
    setSelectedDate(value);
    const nextSlots = getSlotOptions(value);
    setSelectedSlot(nextSlots[0] ?? "");
    setAvailabilityStatus(value ? "Press Check availability to fetch live slots." : "Pick a date to unlock available slots.");
  };

  const handleCheckAvailability = () => {
    if (!selectedDate || isCheckingAvailability) {
      return;
    }

    setIsCheckingAvailability(true);
    setAvailabilityStatus("Checking live availability...");

    if (availabilityTimerRef.current !== null) {
      window.clearTimeout(availabilityTimerRef.current);
    }

    const selectedSlotLabel = selectedSlot || slotOptions[0] || "10:00";
    availabilityTimerRef.current = window.setTimeout(() => {
      setIsCheckingAvailability(false);
      setAvailabilityStatus(`Spots available on ${formatSelectedDate(selectedDate)} at ${selectedSlotLabel}.`);
    }, 900);
  };

  return (
    <section className="min-h-screen bg-[radial-gradient(circle_at_10%_-14%,rgba(37,99,235,0.14),transparent_36%),radial-gradient(circle_at_88%_-8%,rgba(14,165,233,0.08),transparent_34%),#f8fafc] text-slate-900">
      <div className="mx-auto w-full max-w-[1280px] px-3 pb-[5.6rem] pt-3 md:px-4 md:pb-6 md:pt-4">
        <motion.div
          className="mb-4 flex w-full max-w-full items-center gap-1 overflow-x-auto whitespace-nowrap rounded-full border border-slate-300/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.95),rgba(245,249,255,0.92))] px-2 py-1 text-[11px] text-slate-600 shadow-[0_10px_24px_rgba(37,99,235,0.1)] backdrop-blur md:w-fit md:flex-wrap md:overflow-visible md:px-3 md:py-1.5 md:text-xs"
          initial="hidden"
          animate="show"
          variants={sectionMotion}
          transition={{ duration: 0.35 }}
        >
          <span className="font-semibold text-slate-500 transition-colors hover:text-slate-700">Home</span>
          <span className="font-medium text-slate-400">/</span>
          <span className="font-semibold text-slate-500 transition-colors hover:text-slate-700">Europe</span>
          <span className="font-medium text-slate-400">/</span>
          <span className="font-semibold text-slate-500 transition-colors hover:text-slate-700">France</span>
          <span className="font-medium text-slate-400">/</span>
          <span className="font-semibold text-slate-500 transition-colors hover:text-slate-700">Paris</span>
          <span className="font-medium text-slate-400">/</span>
          <span className="rounded-full bg-brand-100 px-2 py-0.5 font-extrabold text-brand-800">Eiffel Tower experience</span>
        </motion.div>

        <motion.section
          className="relative overflow-hidden rounded-2xl bg-white shadow-[0_22px_44px_rgba(15,23,42,0.12)]"
          initial="hidden"
          animate="show"
          variants={sectionMotion}
          transition={{ duration: 0.45 }}
        >
          <div className="absolute right-2 top-2 z-10 flex gap-2 md:right-4 md:top-4">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full border border-white/40 bg-slate-900/35 p-0 text-white backdrop-blur hover:-translate-y-0.5 hover:bg-slate-900/60 md:h-9 md:w-9"
              aria-label="Add to wishlist"
            >
              <Heart size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 rounded-full border border-white/40 bg-slate-900/35 p-0 text-white backdrop-blur hover:-translate-y-0.5 hover:bg-slate-900/60 md:h-9 md:w-9"
              aria-label="Share experience"
            >
              <Share2 size={16} />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-2 p-2 lg:grid-cols-[1.85fr_0.9fr]">
            <div className="group relative min-h-[260px] overflow-hidden rounded-2xl md:min-h-[360px] lg:min-h-[420px] lg:max-h-[460px]">
              <img
                src={gallery[activeImageIndex].image}
                alt={gallery[activeImageIndex].title}
                loading="eager"
                className="h-full w-full object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-105"
              />
              <div className="absolute bottom-4 left-4 z-[3] flex gap-1.5">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 rounded-full border border-white/35 bg-slate-900/50 p-0 text-white hover:-translate-y-0.5 hover:bg-slate-900/65"
                  aria-label="Previous image"
                  onClick={showPrev}
                >
                  <ChevronLeft size={14} />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 rounded-full border border-white/35 bg-slate-900/50 p-0 text-white hover:-translate-y-0.5 hover:bg-slate-900/65"
                  aria-label="Next image"
                  onClick={showNext}
                >
                  <ChevronRight size={14} />
                </Button>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-[linear-gradient(180deg,transparent_0%,rgba(15,23,42,0.62)_100%)]" />
              <div className="absolute bottom-4 right-4 z-[3] rounded-full bg-slate-900/60 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur">
                {activeImageIndex + 1} / {gallery.length}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 lg:grid-cols-2 lg:grid-rows-2">
              {heroPreviewItems.map(({ item, galleryIndex }, index) => (
                <button
                  type="button"
                  className="group relative min-h-[82px] overflow-hidden rounded-2xl border-0 bg-transparent p-0 md:min-h-[120px]"
                  key={`${item.title}-${galleryIndex}`}
                  onClick={() => setActiveImageIndex(galleryIndex)}
                  aria-label={`Show image ${galleryIndex + 1}`}
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-105"
                  />
                  {(index === 2 || index === heroPreviewItems.length - 1) && (
                    <span
                      className={cn(
                        "absolute bottom-2 right-2 rounded-full border border-white/30 bg-slate-900/60 px-2 py-1 text-[11px] font-bold text-white shadow-[0_8px_18px_rgba(15,23,42,0.18)]",
                        index === 2 ? "inline-flex lg:hidden" : "hidden lg:inline-flex",
                      )}
                    >
                      +24 images
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </motion.section>

        <motion.header
          className="mb-4 mt-5 md:my-5"
          initial="hidden"
          animate="show"
          variants={sectionMotion}
          transition={{ duration: 0.4, delay: 0.06 }}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-base font-bold text-slate-900">4.8</span>
            <span className="text-sm tracking-wide text-amber-500">★★★★★</span>
            <span className="text-sm text-slate-500">2,137 verified reviews</span>
          </div>
          <h1 className="m-0 max-w-5xl text-[1.48rem] font-black leading-[1.14] tracking-[-0.03em] text-slate-950 md:text-[clamp(1.95rem,2.45vw,2.75rem)] md:leading-[1.1]">
            Eiffel Tower Premium Access: 2nd Floor Guided Tour + Summit Option
          </h1>
          <p className="mt-2 max-w-[760px] text-sm leading-relaxed text-slate-500 md:mt-3 md:text-base md:leading-[1.62]">
            Reserve timed entry with a local expert, enjoy smoother access, and unlock iconic Paris views with an optional summit
            extension.
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Badge className="rounded-full border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-800 md:text-xs">
              <Clock3 size={14} className="mr-1" /> 1.5 to 2 hours
            </Badge>
            <Badge className="rounded-full border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-800 md:text-xs">
              <Languages size={14} className="mr-1" /> English, French, Spanish
            </Badge>
            <Badge className="rounded-full border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-800 md:text-xs">
              <MapPin size={14} className="mr-1" /> Eiffel Tower, Paris
            </Badge>
          </div>
        </motion.header>

        <nav
          className="sticky top-[5.35rem] z-20 mb-4 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200/90 bg-white/90 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur md:top-[5.05rem] md:mb-5 md:rounded-full lg:top-[5.65rem]"
          aria-label="Experience sections"
        >
          {sectionLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-brand-700"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="relative grid grid-cols-1 items-start gap-4 md:gap-6 lg:grid-cols-[minmax(0,calc(100%_-_392px))_360px] lg:gap-8">
          <main className="min-w-0 overflow-hidden">
            <motion.div
              className="relative z-0 grid min-w-0 content-start gap-4"
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-100px" }}
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.08 } },
              }}
            >
              <motion.article id="included" className="min-w-0" variants={sectionMotion} transition={{ duration: 0.45 }}>
                <Card className={sectionCardClass}>
                  <CardContent className="p-0">
                    <h2 className="font-[Sora,Inter,Manrope,sans-serif] text-xl font-extrabold leading-tight tracking-tight text-slate-900">
                      What is included
                    </h2>
                    <ul className="mt-4 grid gap-3">
                      {highlights.map((item) => (
                        <li key={item} className="grid grid-cols-[18px_1fr] gap-2.5 text-sm leading-relaxed text-slate-700">
                          <CheckCircle2 size={16} className="mt-0.5 text-brand-600" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </motion.article>

              <motion.article id="about" className="min-w-0" variants={sectionMotion} transition={{ duration: 0.45 }}>
                <Card className={sectionCardClass}>
                  <CardContent className="p-0">
                    <h2 className="font-[Sora,Inter,Manrope,sans-serif] text-xl font-extrabold leading-tight tracking-tight text-slate-900">
                      About this experience
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500 md:text-[15px] md:leading-[1.62]">
                      This premium format combines guided support with enough free time for photos and exploration. It is ideal for
                      first-time visitors who want a confident entry flow and a memorable Eiffel Tower experience without logistics stress.
                    </p>
                  </CardContent>
                </Card>
              </motion.article>

              <motion.article id="reviews" className="min-w-0" variants={sectionMotion} transition={{ duration: 0.45 }}>
                <Card className={sectionCardClass}>
                  <CardContent className="p-0">
                    <div className="grid min-w-0 gap-3 sm:flex sm:items-start sm:justify-between">
                      <div>
                        <h2 className="font-[Sora,Inter,Manrope,sans-serif] text-xl font-extrabold leading-tight tracking-tight text-slate-900">
                          Ratings and reviews
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">High satisfaction from recent travelers</p>
                      </div>
                      <div className="inline-flex w-fit items-center gap-1 rounded-full border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-3 py-1.5 shadow-[0_8px_20px_rgba(15,23,42,0.08)]">
                        <strong className="text-[1.35rem] leading-none tracking-tight">4.8</strong>
                        <span className="text-xs tracking-wide text-amber-500">★★★★★</span>
                        <span className="text-xs text-slate-500">out of 5</span>
                      </div>
                    </div>

                    <div className="mt-4 grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                      {ratingBreakdown.map((row) => (
                        <div
                          key={row.label}
                          className="flex items-center justify-between rounded-full border border-slate-200 bg-[radial-gradient(circle_at_12%_0%,rgba(37,99,235,0.12),transparent_42%),linear-gradient(180deg,#ffffff_0%,#f7faff_100%)] px-3 py-1.5 text-xs text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                        >
                          <span>{row.label}</span>
                          <strong className="text-sm font-black tracking-tight text-slate-900">{row.value}</strong>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-6 lg:grid-cols-12">
                      {reviews.map((review, index) => {
                        const key = getReviewCardClass(index);
                        return (
                          <article
                            key={`${review.name}-${index}`}
                            className={cn(
                              "rounded-xl border border-slate-200 bg-white p-3 transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(15,23,42,0.09)]",
                              reviewSpanClass[key],
                            )}
                          >
                            <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2.5">
                              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-b from-blue-100 to-blue-200 text-xs font-bold text-blue-800">
                                {avatarLabel(review.name)}
                              </span>
                              <div>
                                <p className="text-sm font-bold">{review.name}</p>
                                <p className="text-xs text-slate-500">
                                  {review.country} . {review.date}
                                </p>
                              </div>
                              <span className="text-xs tracking-wide text-amber-500">{"★".repeat(review.stars)}</span>
                            </div>
                            <p className="mt-3 text-sm leading-relaxed text-slate-700">{review.text}</p>
                          </article>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.article>

              <motion.article id="combinations" className="min-w-0" variants={sectionMotion} transition={{ duration: 0.45 }}>
                <Card className={sectionCardClass}>
                  <CardContent className="p-0">
                    <h2 className="font-[Sora,Inter,Manrope,sans-serif] text-xl font-extrabold leading-tight tracking-tight text-slate-900">
                      Hand-picked combinations
                    </h2>
                    <div className="mt-4 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-6 lg:grid-cols-12">
                      {combinations.map((item, index) => {
                        const spanClass = comboSpanClass[getCombinationCardClass(index)];
                        const imageHeightClass =
                          getCombinationCardClass(index) === "comboSpanWide"
                            ? "h-[175px] md:h-[180px] lg:h-[220px]"
                            : getCombinationCardClass(index) === "comboSpanTall"
                              ? "h-[175px] md:h-[180px] lg:h-[250px]"
                              : "h-[175px] md:h-[180px] lg:h-[170px]";

                        return (
                          <Card
                            className={cn(
                              "group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_16px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)]",
                              spanClass,
                            )}
                            key={item.title}
                          >
                            <div className={cn("relative", imageHeightClass)}>
                              <img
                                src={getCardImage(item.images, index)}
                                alt={item.title}
                                loading="lazy"
                                className="h-full w-full object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-105"
                              />
                              {item.badge && (
                                <Badge className="absolute left-2 top-2 rounded-md border-[#f3d19f] bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-900">
                                  {item.badge}
                                </Badge>
                              )}
                            </div>
                            <CardContent className="space-y-1 p-3">
                              <div className="flex items-center gap-1 text-[13px]">
                                <span className="inline-flex items-center gap-1 font-bold text-brand-700">
                                  <Star size={12} /> {item.rating} ({item.reviews})
                                </span>
                                <span className="text-slate-400">•</span>
                                <span className="text-slate-500">{item.location}</span>
                              </div>
                              <h3 className="min-h-10 text-base font-semibold leading-tight tracking-tight text-slate-800">{item.title}</h3>
                              <div className="pt-2">
                                <span className="block text-sm text-slate-500">from</span>
                                {item.oldPrice && <span className="inline-block pt-1 text-sm text-slate-500 line-through">{item.oldPrice}</span>}
                                <div className="mt-1 flex items-center gap-2">
                                  <strong className="text-lg font-extrabold text-slate-900">{item.price}</strong>
                                  {item.discount && (
                                    <Badge className="rounded-md border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">
                                      {item.discount}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                              <Button variant="link" className="mt-2 h-auto p-0 text-sm font-bold text-brand-600 hover:text-brand-700">
                                Explore <ArrowRight size={14} className="ml-1" />
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.article>

              <motion.article id="more-ways" className="min-w-0" variants={sectionMotion} transition={{ duration: 0.45 }}>
                <Card className={sectionCardClass}>
                  <CardContent className="p-0">
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <h2 className="font-[Sora,Inter,Manrope,sans-serif] text-xl font-extrabold leading-tight tracking-tight text-slate-900">
                        More ways to experience Eiffel Tower
                      </h2>
                      <div className="inline-flex gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 rounded-full p-0 text-blue-900"
                          aria-label="Scroll cards left"
                          onClick={() => scrollMoreWays("left")}
                        >
                          <ChevronLeft size={16} />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 rounded-full p-0 text-blue-900"
                          aria-label="Scroll cards right"
                          onClick={() => scrollMoreWays("right")}
                        >
                          <ChevronRight size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 flex min-w-0 w-full snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-hidden pb-1 [&::-webkit-scrollbar]:hidden" ref={moreWaysRailRef}>
                      {moreWays.map((item, index) => (
                        <Card
                          className="group flex min-h-0 w-[82vw] flex-none snap-start flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_6px_16px_rgba(15,23,42,0.07)] transition hover:-translate-y-1 hover:shadow-[0_14px_28px_rgba(15,23,42,0.12)] md:min-h-[372px] md:w-[248px] lg:min-h-[390px] lg:w-[272px]"
                          key={item.title}
                        >
                          <div className="relative h-[168px]">
                            <img
                              src={getCardImage(item.images, index + combinations.length)}
                              alt={item.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-700 motion-reduce:transition-none group-hover:scale-105"
                            />
                            {item.badge && (
                              <Badge className="absolute left-2 top-2 rounded-md border-[#f3d19f] bg-orange-50 px-2 py-1 text-[11px] font-bold text-orange-900">
                                {item.badge}
                              </Badge>
                            )}
                          </div>
                          <CardContent className="flex flex-1 flex-col gap-1 p-3">
                            <div className="min-h-5 text-[13px]">
                              <span className="inline-flex items-center gap-1 font-bold text-brand-700">
                                <Star size={12} /> {item.rating} ({item.reviews})
                              </span>
                              <span className="mx-1 text-slate-400">•</span>
                              <span className="text-slate-500">{item.location}</span>
                            </div>
                            <h3 className="line-clamp-2 min-h-10 text-base font-semibold leading-tight tracking-tight text-slate-800">{item.title}</h3>
                            <div className="mt-1 min-h-[4.3rem]">
                              <span className="block text-sm text-slate-500">from</span>
                              <span className={cn("inline-block pt-1 text-sm text-slate-500 line-through", !item.oldPrice && "invisible")}>
                                {item.oldPrice ?? "₹000"}
                              </span>
                              <div className="mt-1 flex min-h-6 items-center gap-2">
                                <strong className="text-lg font-extrabold text-slate-900">{item.price}</strong>
                                <Badge
                                  className={cn(
                                    "rounded-md border-amber-300 bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700",
                                    !item.discount && "invisible",
                                  )}
                                >
                                  {item.discount ?? "00% off"}
                                </Badge>
                              </div>
                            </div>
                            <Button variant="link" className="mt-1 h-auto p-0 text-sm font-bold text-brand-600 hover:text-brand-700">
                              Explore <ArrowRight size={14} className="ml-1" />
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.article>
            </motion.div>
          </main>

          <aside className={cn(
            "sticky self-start z-10 h-fit",
            selectedDate ? "top-[9rem]" : "top-[12rem]",
          )}>
            <Card className="w-full rounded-2xl border border-slate-300/90 bg-[radial-gradient(circle_at_88%_0%,rgba(37,99,235,0.09),transparent_35%),linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_26px_46px_rgba(15,23,42,0.16)]">
              <CardContent className="p-0">
                <p className="m-0 text-xs font-bold uppercase tracking-[0.16em] text-slate-500">From</p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[2.12rem] font-black leading-none tracking-tight text-slate-900 md:text-[2.55rem]">₹103</span>
                  <span className="text-sm text-slate-500 md:text-base">per person</span>
                </div>

                <label className="mt-3 block text-sm font-bold text-slate-700" htmlFor="date-select">
                  Select a date
                </label>
                <Input
                  id="date-select"
                  className="mt-1 h-11 rounded-2xl border-slate-300 text-base md:h-12"
                  type="date"
                  value={selectedDate}
                  onChange={(event) => handleDateChange(event.target.value)}
                />

                <label className="mt-3 block text-sm font-bold text-slate-700" htmlFor="slot-select">
                  Date and slot
                </label>
                {selectedDate ? (
                  <div className="mt-1 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2" id="slot-select" role="radiogroup" aria-label="Available time slots">
                    {slotOptions.map((slot, index) => {
                      const isActive = slot === selectedSlot;

                      return (
                        <Button
                          key={slot}
                          type="button"
                          role="radio"
                          aria-checked={isActive}
                          variant="outline"
                          className={cn(
                            "h-auto items-start justify-start rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 px-3 py-2 text-left",
                            isActive && "border-brand-600 bg-gradient-to-b from-blue-50 to-blue-100 shadow-[0_8px_16px_rgba(37,99,235,0.2)]",
                          )}
                          onClick={() => setSelectedSlot(slot)}
                        >
                          <span className="grid gap-0.5">
                            <span className="text-[15px] font-extrabold tracking-tight text-slate-900">{slot}</span>
                            <span className="text-[11px] font-semibold text-slate-500">
                              {getSlotWindowLabel(slot)}
                              {index === 0 ? " • Fast entry" : ""}
                            </span>
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-1 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                    Select a date to reveal available time badges.
                  </p>
                )}

                <Button
                  className="mt-3 h-11 w-full rounded-2xl bg-gradient-to-r from-blue-700 to-brand-600 text-base font-bold text-white shadow-[0_14px_28px_rgba(37,99,235,0.35)] hover:-translate-y-0.5 hover:shadow-[0_18px_32px_rgba(37,99,235,0.42)]"
                  disabled={!selectedDate || isCheckingAvailability}
                  onClick={handleCheckAvailability}
                >
                  {isCheckingAvailability ? "Checking..." : "Check availability"}
                </Button>

                <p className="mt-2 min-h-4 text-xs text-slate-600">{availabilityStatus}</p>

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
        </div>

        <div className="fixed bottom-[calc(0.55rem+env(safe-area-inset-bottom))] left-2 right-2 z-30 flex items-center justify-between gap-3 rounded-2xl border border-slate-300/90 bg-[radial-gradient(circle_at_0%_0%,rgba(37,99,235,0.12),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.95))] p-2 shadow-[0_14px_28px_rgba(15,23,42,0.16)] backdrop-blur md:hidden">
          <div className="grid min-w-0 gap-0">
            <p className="m-0 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">from</p>
            <strong className="block text-lg font-extrabold leading-none tracking-tight text-slate-900">₹103</strong>
            <span className="text-xs text-slate-500"> per person</span>
          </div>
          <Button className="h-10 rounded-xl bg-gradient-to-r from-blue-700 to-brand-600 px-4 text-sm font-extrabold text-white shadow-[0_10px_20px_rgba(37,99,235,0.32)]">
            Check availability <ArrowRight size={14} className="ml-1" />
          </Button>
        </div>
      </div>
    </section>
  );
}