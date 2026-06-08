"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const sections = [
  { id: "overview", label: "Overview" },
  { id: "reviews", label: "Reviews" },
  { id: "highlights", label: "Highlights" },
  { id: "packages", label: "Packages" },
  { id: "availability", label: "Availability" },
  { id: "faq", label: "FAQ" },
  { id: "location", label: "Location" },
  { id: "policies", label: "Policies" },
];

export function SectionNav() {
  const [active, setActive] = useState("overview");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);

      const scrollPos = window.scrollY + 120;
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i].id);
        if (el && el.offsetTop <= scrollPos) {
          setActive(sections[i].id);
          break;
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (!visible) return null;

  return (
    <motion.nav
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed left-1/2 top-20 z-40 hidden -translate-x-1/2 lg:block"
    >
      <div className="glass-strong flex items-center gap-1 rounded-2xl p-1.5 shadow-glass">
        {sections.map((section) => (
          <button
            key={section.id}
            onClick={() => scrollTo(section.id)}
            className={cn(
              "relative rounded-xl px-3.5 py-1.5 text-xs font-medium transition-colors",
              active === section.id
                ? "text-brand-700"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {active === section.id && (
              <motion.div
                layoutId="activeSection"
                className="absolute inset-0 rounded-xl bg-brand-100"
                transition={{ type: "spring", damping: 20, stiffness: 300 }}
              />
            )}
            <span className="relative z-10">{section.label}</span>
          </button>
        ))}
      </div>
    </motion.nav>
  );
}
