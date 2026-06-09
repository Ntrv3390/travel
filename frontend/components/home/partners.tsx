"use client";

import { motion } from "framer-motion";

const partners = [
  { name: "Airbnb", color: "text-rose-400" },
  { name: "Booking.com", color: "text-blue-500" },
  { name: "Expedia", color: "text-amber-500" },
  { name: "TripAdvisor", color: "text-emerald-500" },
  { name: "Viator", color: "text-indigo-500" },
  { name: "GetYourGuide", color: "text-orange-500" },
];

export function Partners() {
  return (
    <section className="border-b border-slate-100 bg-white py-8 sm:py-10">
      <div className="container px-4">
        <p className="mb-6 text-center text-[10px] font-bold uppercase tracking-widest text-slate-300">
          Trusted by leading travel platforms
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-12">
          {partners.map((partner, i) => (
            <motion.span
              key={partner.name}
              initial={{ opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.06 }}
              className={`text-base font-black tracking-tight opacity-30 transition-opacity hover:opacity-50 sm:text-lg ${partner.color}`}
            >
              {partner.name}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}