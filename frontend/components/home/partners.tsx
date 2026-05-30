"use client";

import { motion } from "framer-motion";

const partners = [
  { name: "Airbnb", color: "text-rose-500" },
  { name: "Booking.com", color: "text-blue-600" },
  { name: "Expedia", color: "text-amber-600" },
  { name: "TripAdvisor", color: "text-emerald-600" },
  { name: "Viator", color: "text-indigo-600" },
  { name: "GetYourGuide", color: "text-orange-500" },
];

export function Partners() {
  return (
    <section className="border-b border-slate-100 py-section">
      <div className="container">
        <p className="mb-8 text-center text-xs font-semibold uppercase tracking-widest text-slate-400">
          Trusted by leading travel platforms
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {partners.map((partner, i) => (
            <motion.span
              key={partner.name}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.08 }}
              className={`text-lg font-black tracking-tight opacity-40 transition-opacity hover:opacity-60 ${partner.color}`}
            >
              {partner.name}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
