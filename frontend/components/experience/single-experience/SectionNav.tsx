interface SectionNavProps {
  links: Array<{ href: string; label: string }>;
}

export function SectionNav({ links }: SectionNavProps) {
  return (
    <nav
      className="sticky top-[5.35rem] z-20 mb-4 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200/90 bg-white/90 p-1.5 shadow-[0_10px_24px_rgba(15,23,42,0.08)] backdrop-blur md:top-[5.05rem] md:mb-5 md:rounded-full lg:top-[5.65rem]"
      aria-label="Experience sections"
    >
      {links.map((link) => (
        <a
          key={link.href}
          href={link.href}
          className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-brand-700"
        >
          {link.label}
        </a>
      ))}
    </nav>
  );
}
