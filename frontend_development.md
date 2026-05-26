# Frontend Implementation Guide
## Traviia — Next.js App Router + Tailwind CSS + shadcn/ui

> **Purpose:** This is the single source of truth for building the Traviia frontend. Every convention, component pattern, page structure, data-fetching strategy, routing rule, and styling decision is defined here. The AI agent must follow this document exactly — no exceptions, no improvisation.

---

## Table of Contents

1. [Tech Stack & Versions](#1-tech-stack--versions)
2. [Project Directory Structure](#2-project-directory-structure)
3. [Setup & Installation](#3-setup--installation)
4. [Tailwind CSS Configuration](#4-tailwind-css-configuration)
5. [Design System — Tokens & Variables](#5-design-system--tokens--variables)
6. [shadcn/ui — Component Rules](#6-shadcnui--component-rules)
7. [Typography System](#7-typography-system)
8. [Layout Components](#8-layout-components)
9. [Page-by-Page Specification](#9-page-by-page-specification)
10. [Rendering Strategy Per Page](#10-rendering-strategy-per-page)
11. [Data Fetching Patterns](#11-data-fetching-patterns)
12. [Component Library — Custom Components](#12-component-library--custom-components)
13. [Forms & Validation](#13-forms--validation)
14. [Booking Flow — Step by Step](#14-booking-flow--step-by-step)
15. [SEO & Metadata](#15-seo--metadata)
16. [JSON-LD Integration (GTTD)](#16-json-ld-integration-gttd)
17. [Image Handling](#17-image-handling)
18. [Error States & Loading States](#18-error-states--loading-states)
19. [Environment Variables](#19-environment-variables)
20. [Critical Rules — Do NOT Violate](#20-critical-rules--do-not-violate)

---

## 1. Tech Stack & Versions

| Package | Version | Purpose |
|---|---|---|
| Next.js | 14.x (App Router) | Framework — SSR, ISR, routing |
| React | 18.x | UI runtime |
| TypeScript | 5.x | Type safety — strict mode ON |
| Tailwind CSS | 3.4.x | All styling — no other CSS framework |
| shadcn/ui | latest | Component primitives (Radix UI-based) |
| Zod | 3.x | Schema validation (forms + API responses) |
| React Hook Form | 7.x | Form state management |
| SWR | 2.x | Client-side data fetching & revalidation |
| next/image | built-in | Image optimization |
| next/font | built-in | Font loading |
| lucide-react | latest | Icon set (used by shadcn/ui) |
| date-fns | 3.x | Date formatting |
| clsx + tailwind-merge | latest | Conditional class merging |

**Never install:**
- Bootstrap, Material UI, Chakra UI, Ant Design, or any other component library alongside shadcn/ui
- Styled-components or Emotion (we use Tailwind only)
- Moment.js (use date-fns)
- Axios (use native fetch or SWR)

---

## 2. Project Directory Structure

```
traviia-web/
├── app/                          # Next.js App Router root
│   ├── layout.tsx                # Root layout (fonts, providers, global meta)
│   ├── page.tsx                  # Homepage (SSR)
│   ├── not-found.tsx             # Global 404 page
│   ├── error.tsx                 # Global error boundary
│   ├── loading.tsx               # Global loading UI
│   │
│   ├── [city]/                   # City listing pages
│   │   ├── page.tsx              # City experiences list (SSR)
│   │   ├── loading.tsx           # City page skeleton
│   │   └── [slug]/               # Product detail pages
│   │       ├── page.tsx          # PDP (ISR, revalidate: 3600)
│   │       ├── loading.tsx       # PDP skeleton
│   │       └── not-found.tsx     # Experience not found
│   │
│   ├── search/
│   │   └── page.tsx              # Search results (SSR)
│   │
│   ├── checkout/
│   │   ├── layout.tsx            # Checkout layout (no nav, minimal)
│   │   ├── page.tsx              # Checkout form
│   │   └── confirmation/
│   │       └── page.tsx          # Booking confirmation
│   │
│   └── api/                      # Next.js API routes (thin proxies to Go backend)
│       ├── experiences/
│       │   └── route.ts
│       ├── availability/
│       │   └── route.ts
│       └── bookings/
│           └── route.ts
│
├── components/
│   ├── ui/                       # shadcn/ui components (auto-generated, DO NOT EDIT)
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── select.tsx
│   │   ├── dialog.tsx
│   │   ├── sheet.tsx
│   │   ├── badge.tsx
│   │   ├── skeleton.tsx
│   │   ├── toast.tsx
│   │   ├── calendar.tsx
│   │   ├── popover.tsx
│   │   ├── separator.tsx
│   │   ├── tabs.tsx
│   │   ├── avatar.tsx
│   │   ├── breadcrumb.tsx
│   │   └── ...
│   │
│   ├── layout/                   # Structural layout components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── MobileNav.tsx
│   │   └── CheckoutNavbar.tsx
│   │
│   ├── experience/               # Experience-related components
│   │   ├── ExperienceCard.tsx
│   │   ├── ExperienceCardSkeleton.tsx
│   │   ├── ExperienceGrid.tsx
│   │   ├── ExperienceHero.tsx
│   │   ├── ExperienceGallery.tsx
│   │   ├── ExperienceFeatures.tsx
│   │   ├── ExperienceReviews.tsx
│   │   └── PricingBox.tsx        # The sticky booking widget on PDP
│   │
│   ├── search/
│   │   ├── SearchBar.tsx
│   │   ├── SearchFilters.tsx
│   │   └── SearchResults.tsx
│   │
│   ├── booking/
│   │   ├── DatePicker.tsx
│   │   ├── GuestSelector.tsx
│   │   ├── VariantSelector.tsx
│   │   ├── CheckoutForm.tsx
│   │   ├── OrderSummary.tsx
│   │   └── PaymentForm.tsx
│   │
│   └── common/
│       ├── StarRating.tsx
│       ├── PriceDisplay.tsx
│       ├── CityBadge.tsx
│       ├── CategoryBadge.tsx
│       └── EmptyState.tsx
│
├── lib/
│   ├── api.ts                    # API client (typed fetch wrappers for Go backend)
│   ├── utils.ts                  # cn() helper + misc utilities
│   ├── validations.ts            # Zod schemas for all forms
│   ├── formatters.ts             # Price, date, duration formatters
│   └── constants.ts              # App-wide constants
│
├── types/
│   ├── experience.ts             # Experience, Option, PriceOption types
│   ├── booking.ts                # Booking, CheckoutForm types
│   └── api.ts                    # API response envelope types
│
├── hooks/
│   ├── useAvailability.ts        # SWR hook for real-time availability
│   ├── useBooking.ts             # Booking flow state machine
│   └── useSearch.ts              # Search with URL sync
│
├── public/
│   └── images/                   # Static images (hero, fallbacks)
│
├── styles/
│   └── globals.css               # Tailwind directives + CSS variables
│
├── tailwind.config.ts
├── components.json               # shadcn/ui config
├── next.config.ts
└── tsconfig.json
```

---

## 3. Setup & Installation

### Step 1 — Create Next.js project
```bash
npx create-next-app@latest traviia-web \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir=false \
  --import-alias="@/*"

cd traviia-web
```

### Step 2 — Initialize shadcn/ui
```bash
npx shadcn@latest init
```

When prompted, use these answers:
```
Which style would you like to use? › Default
Which color would you like to use as base color? › Neutral
Would you like to use CSS variables for colors? › Yes
```

### Step 3 — Install shadcn/ui components (install ALL upfront)
```bash
npx shadcn@latest add button card input label select dialog sheet badge \
  skeleton toast calendar popover separator tabs avatar breadcrumb \
  dropdown-menu command checkbox radio-group slider switch textarea \
  alert progress scroll-area table accordion collapsible hover-card \
  tooltip form
```

### Step 4 — Install additional dependencies
```bash
npm install swr zod react-hook-form @hookform/resolvers \
  date-fns clsx tailwind-merge lucide-react
```

### Step 5 — Verify `components.json`
```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

---

## 4. Tailwind CSS Configuration

**File: `tailwind.config.ts`**

```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2.5rem",
        "2xl": "2rem",
      },
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // shadcn/ui CSS variable colors — DO NOT RENAME THESE
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Traviia brand colors — extend beyond shadcn defaults
        brand: {
          50:  "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",  // Primary brand
          600: "#0284c7",
          700: "#0369a1",
          800: "#075985",
          900: "#0c4a6e",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          raised: "hsl(var(--surface-raised))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "monospace"],
      },
      fontSize: {
        // Use these — never write raw px values in components
        "display-2xl": ["4.5rem", { lineHeight: "5.625rem", letterSpacing: "-0.02em" }],
        "display-xl":  ["3.75rem", { lineHeight: "4.5rem",  letterSpacing: "-0.02em" }],
        "display-lg":  ["3rem",    { lineHeight: "3.75rem", letterSpacing: "-0.02em" }],
        "display-md":  ["2.25rem", { lineHeight: "2.75rem", letterSpacing: "-0.02em" }],
        "display-sm":  ["1.875rem", { lineHeight: "2.375rem" }],
        "display-xs":  ["1.5rem",  { lineHeight: "2rem" }],
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
        "section": "5rem",          // Standard section vertical padding
        "section-sm": "3rem",
      },
      boxShadow: {
        "card-hover": "0 8px 30px -4px rgba(0,0,0,0.12), 0 4px 8px -2px rgba(0,0,0,0.08)",
        "pricing-box": "0 4px 24px -2px rgba(0,0,0,0.15), 0 2px 8px -2px rgba(0,0,0,0.1)",
      },
      animation: {
        "fade-in":     "fadeIn 0.3s ease-out",
        "slide-up":    "slideUp 0.4s ease-out",
        "shimmer":     "shimmer 1.5s infinite",
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to:   { opacity: "1" },
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to:   { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%":   { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

export default config
```

---

## 5. Design System — Tokens & Variables

**File: `styles/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* shadcn/ui base tokens — Neutral palette */
    --background:    0 0% 100%;
    --foreground:    240 10% 3.9%;
    --card:          0 0% 100%;
    --card-foreground: 240 10% 3.9%;
    --popover:       0 0% 100%;
    --popover-foreground: 240 10% 3.9%;

    /* Traviia brand primary = sky-500 */
    --primary:       199 89% 48%;
    --primary-foreground: 0 0% 100%;

    --secondary:     240 4.8% 95.9%;
    --secondary-foreground: 240 5.9% 10%;

    --muted:         240 4.8% 95.9%;
    --muted-foreground: 240 3.8% 46.1%;

    --accent:        240 4.8% 95.9%;
    --accent-foreground: 240 5.9% 10%;

    --destructive:   0 84.2% 60.2%;
    --destructive-foreground: 0 0% 98%;

    --border:        240 5.9% 90%;
    --input:         240 5.9% 90%;
    --ring:          199 89% 48%;

    /* Surface tokens */
    --surface:       240 5% 96%;
    --surface-raised: 0 0% 100%;

    --radius: 0.5rem;
  }

  .dark {
    --background:    240 10% 3.9%;
    --foreground:    0 0% 98%;
    --card:          240 10% 3.9%;
    --card-foreground: 0 0% 98%;
    --popover:       240 10% 3.9%;
    --popover-foreground: 0 0% 98%;
    --primary:       199 89% 48%;
    --primary-foreground: 0 0% 100%;
    --secondary:     240 3.7% 15.9%;
    --secondary-foreground: 0 0% 98%;
    --muted:         240 3.7% 15.9%;
    --muted-foreground: 240 5% 64.9%;
    --accent:        240 3.7% 15.9%;
    --accent-foreground: 0 0% 98%;
    --destructive:   0 62.8% 30.6%;
    --destructive-foreground: 0 0% 98%;
    --border:        240 3.7% 15.9%;
    --input:         240 3.7% 15.9%;
    --ring:          199 89% 48%;
    --surface:       240 6% 8%;
    --surface-raised: 240 5% 12%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
    font-feature-settings: "rlig" 1, "calt" 1;
  }
  /* Smooth scrolling */
  html {
    scroll-behavior: smooth;
  }
  /* Focus ring */
  :focus-visible {
    @apply outline-none ring-2 ring-ring ring-offset-2;
  }
}

/* Skeleton shimmer utility */
@layer utilities {
  .skeleton {
    background: linear-gradient(
      90deg,
      hsl(var(--muted)) 25%,
      hsl(var(--accent)) 50%,
      hsl(var(--muted)) 75%
    );
    background-size: 200% 100%;
    @apply animate-shimmer;
  }
}
```

---

## 6. shadcn/ui — Component Rules

### The Golden Rule
> **Never write a custom button, input, dialog, or form element from scratch if a shadcn/ui component exists. Always use and extend the shadcn primitive.**

### Component Import Convention
```typescript
// ✅ CORRECT — always import from @/components/ui/
import { Button }   from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input }    from "@/components/ui/input"
import { Badge }    from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

// ❌ WRONG — never import directly from radix or third parties
import { Button } from "radix-ui"
import { Button } from "some-other-lib"
```

### Extending shadcn Components
Use `className` prop with `cn()` to extend — never modify files in `components/ui/`.

```typescript
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

// ✅ Extend via className
<Button
  className={cn(
    "w-full h-12 text-base font-semibold rounded-xl",
    "bg-brand-500 hover:bg-brand-600 active:bg-brand-700",
    "transition-all duration-200 shadow-sm hover:shadow-md",
    isLoading && "opacity-70 cursor-not-allowed"
  )}
>
  Book Now
</Button>

// ❌ Never edit components/ui/button.tsx directly
```

### The `cn()` Utility

**File: `lib/utils.ts`**

```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Use cn() everywhere. It merges Tailwind classes correctly and handles conflicts.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

### shadcn/ui Components Usage Map

| UI Need | shadcn Component | Notes |
|---|---|---|
| Buttons | `Button` | Use `variant` prop: default, destructive, outline, secondary, ghost, link |
| Cards | `Card` + `CardHeader` + `CardContent` + `CardFooter` | Always use the full sub-component set |
| Text inputs | `Input` + `Label` | Always pair with Label |
| Dropdowns (select) | `Select` + `SelectTrigger` + `SelectContent` + `SelectItem` | Never use native `<select>` |
| Date picker | `Calendar` + `Popover` | Combine these two for a date picker |
| Modals | `Dialog` + `DialogContent` + `DialogHeader` | Use for desktop modals |
| Mobile drawers | `Sheet` + `SheetContent` | Use `side="bottom"` for mobile sheets |
| Toasts | `Toaster` + `useToast` | Put `<Toaster>` in root layout |
| Loading | `Skeleton` | Use for all loading states — no spinners except inline |
| Tags/chips | `Badge` | |
| Tabs | `Tabs` + `TabsList` + `TabsTrigger` + `TabsContent` | |
| Tooltips | `Tooltip` + `TooltipContent` + `TooltipTrigger` | Wrap app in `TooltipProvider` |
| Dropdowns (menu) | `DropdownMenu` | For nav menus, action menus |
| Forms | `Form` + `FormField` + `FormControl` + `FormMessage` | Always use with React Hook Form |
| Command palette | `Command` | For search-as-you-type inputs |
| Accordion | `Accordion` | FAQs, collapsible details |

---

## 7. Typography System

### Font Setup

**File: `app/layout.tsx`**

```typescript
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"

// Geist is the Traviia brand font.
// Never substitute with Inter, Roboto, or system fonts.
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className={GeistSans.className}>
        {children}
      </body>
    </html>
  )
}
```

### Typography Scale — Use Only These Classes

```
Page/section titles:    text-display-lg   (3rem / 48px)
Section headings:       text-display-sm   (1.875rem / 30px)
Card titles:            text-xl           (1.25rem / 20px)
Body large:             text-lg           (1.125rem / 18px)
Body default:           text-base         (1rem / 16px)
Body small:             text-sm           (0.875rem / 14px)
Caption/label:          text-xs           (0.75rem / 12px)
```

### Font Weight
```
Bold titles:    font-bold     (700)
Semibold:       font-semibold (600)
Medium:         font-medium   (500)
Normal:         font-normal   (400)
```

### Line Heights
```
Tight headings:   leading-tight    (1.25)
Normal headings:  leading-snug     (1.375)
Body copy:        leading-relaxed  (1.625)
```

---

## 8. Layout Components

### Root Layout

**File: `app/layout.tsx`**

```typescript
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { Toaster } from "@/components/ui/toaster"
import { Navbar } from "@/components/layout/Navbar"
import { Footer } from "@/components/layout/Footer"
import "@/styles/globals.css"

export const metadata: Metadata = {
  title: { default: "Traviia — Experiences Worth Having", template: "%s | Traviia" },
  description: "Book tours, activities and experiences worldwide.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL!),
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(GeistSans.className, "min-h-screen bg-background antialiased")}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  )
}
```

### Navbar

**File: `components/layout/Navbar.tsx`**

```typescript
// Structure:
// <header> — sticky top-0 z-50 border-b bg-background/95 backdrop-blur
//   <div class="container"> (uses Tailwind container)
//     <nav class="flex items-center justify-between h-16">
//       Logo (left)
//       SearchBar (center, hidden on mobile)
//       Actions: CurrencySelector, UserMenu (right)
//       MobileMenuTrigger (right, visible on mobile only)

// Navbar must:
// 1. Be a Server Component — no "use client" unless absolutely needed
// 2. Use <Link> from next/link for all navigation
// 3. Hide the center search bar on mobile (hidden md:flex)
// 4. Show MobileNav sheet on small screens
```

### Page Container Pattern

Always wrap page content in this structure:

```tsx
// Standard page with container
<div className="container py-section">
  {/* content */}
</div>

// Full-width hero, then contained content
<section className="relative w-full">
  {/* full-width hero */}
</section>
<div className="container py-section">
  {/* contained content */}
</div>
```

### Responsive Breakpoints

| Breakpoint | Width | Usage |
|---|---|---|
| `sm` | 640px | Minor adjustments |
| `md` | 768px | Show/hide nav, 2-column grids |
| `lg` | 1024px | 3-column grids, sidebar layout |
| `xl` | 1280px | Max content width for wide layouts |
| `2xl` | 1400px | Container max width |

---

## 9. Page-by-Page Specification

### 9.1 Homepage (`app/page.tsx`)

**Rendering:** SSR (dynamic, no cache) — prices change

**Sections (top to bottom):**

```
1. Hero Section
   - Full-width, min-height: 75vh
   - Background: high-quality destination image (next/image, priority=true)
   - Overlay: gradient from transparent to background
   - Content: H1 headline + SearchBar component
   - SearchBar: destination input + date picker + guests selector + Search button

2. Featured Cities Section
   - Section heading: "Popular Destinations"
   - Grid: 2 cols mobile, 3 cols md, 4 cols lg
   - Each city: CityCard (image + city name + experience count)

3. Featured Experiences Section
   - Section heading: "Top Experiences"
   - Grid: 1 col mobile, 2 cols md, 3 cols lg, 4 cols xl
   - ExperienceCard components
   - "View all" link

4. Why Traviia Section
   - 3 columns: icons + short value props
   - Icon from lucide-react, heading, 2-line description

5. Newsletter CTA
   - Background: brand-50 or muted
   - Email input + subscribe button using shadcn Input + Button
```

---

### 9.2 City Page (`app/[city]/page.tsx`)

**Rendering:** SSR

**URL example:** `/new-york`

**Layout:**

```
1. City Hero
   - Page title: "Things to do in [City]"
   - Breadcrumb: Home > New York  (use shadcn Breadcrumb)
   - Experience count badge

2. Filters Row (sticky below navbar on scroll)
   - Category filter: shadcn Tabs or Button group
   - Sort: shadcn Select (Recommended, Price Low-High, Price High-Low, Rating)
   - Price range: shadcn Slider
   - Duration filter: shadcn Select
   - All filters on mobile: Sheet (bottom drawer) triggered by "Filters" button

3. Experience Grid
   - 1 col mobile, 2 cols md, 3 cols lg
   - ExperienceCard components
   - Pagination: shadcn-style prev/next with page numbers
```

**URL Query Params:**
```
/new-york?category=tours&sort=price_asc&min_price=0&max_price=200&page=1
```
All filter state lives in URL params (use `useSearchParams` + `useRouter`).

---

### 9.3 Product Detail Page — PDP (`app/[city]/[slug]/page.tsx`)

**Rendering:** ISR with `revalidate: 3600` (1 hour)

**URL example:** `/new-york/central-park-bike-tour`

**Layout (Desktop: 2-column, Mobile: stacked):**

```
LEFT COLUMN (flex-1):
  1. Image Gallery
     - Primary image: full-width, aspect-video, rounded-xl
     - Thumbnails: horizontal scroll row
     - "View all photos" button triggers Dialog with gallery grid

  2. Breadcrumb: Home > New York > Central Park Bike Tour

  3. Title Block
     - H1: experience title (text-display-sm font-bold)
     - Meta row: StarRating + review count + CityBadge + CategoryBadge + duration

  4. Highlights
     - 3-column grid of key highlights (icon + text)
     - Icons from lucide-react

  5. About This Experience
     - Full description (rendered from HTML via dangerouslySetInnerHTML — SANITIZE FIRST)
     - "Show more" / "Show less" toggle using shadcn Collapsible

  6. What's Included / Excluded
     - Two columns: Inclusions (CheckCircle icon, text-green-600) / Exclusions (XCircle icon, text-red-500)

  7. Itinerary / Duration
     - Duration badge
     - Step-by-step if available

  8. Cancellation Policy
     - shadcn Alert component
     - Green/yellow/red based on policy strictness

  9. Reviews Section
     - AggregateRating display
     - Review cards (shadcn Card)
     - "Load more reviews" button

RIGHT COLUMN (w-[380px] sticky top-24):
  PricingBox component — see Section 12
```

---

### 9.4 Search Results (`app/search/page.tsx`)

**Rendering:** SSR

**URL:** `/search?q=bike+tour&city=paris&date=2025-08-15`

```
1. SearchBar (pre-filled with query params)
2. Results count: "42 experiences found"
3. Same filter row as city page
4. ExperienceGrid or "No results" EmptyState
```

---

### 9.5 Checkout Page (`app/checkout/page.tsx`)

**Rendering:** Dynamic (no cache)

**Layout:** Minimal — no main Navbar, use CheckoutNavbar (logo + step indicator only)

**Step Indicator:** 3 steps using shadcn Progress or custom step component
```
Step 1: Details (date, guests, variant)
Step 2: Your Info (name, email, phone)
Step 3: Payment
```

See full booking flow in [Section 14](#14-booking-flow--step-by-step).

---

### 9.6 Confirmation Page (`app/checkout/confirmation/page.tsx`)

**Rendering:** Dynamic

```
1. Success icon (lucide CheckCircle, text-green-500, size 64)
2. "Booking Confirmed!" heading
3. Booking reference number (monospace, shadcn Card)
4. Experience summary: title, date, guests, price
5. "What's next" section: check email, download voucher
6. CTA buttons: "Explore more experiences", "View booking"
```

---

## 10. Rendering Strategy Per Page

| Page | Strategy | Reason |
|---|---|---|
| Homepage | `SSR` (no cache) | Featured experiences change daily |
| City page | `SSR` | Prices and availability change |
| PDP (product detail) | `ISR` `revalidate: 3600` | Experience details stable but update hourly |
| Search results | `SSR` | Query-dependent, can't cache |
| Checkout | `dynamic` (no static) | Real-time availability lock |
| Confirmation | `dynamic` | Per-booking data |

**ISR Implementation on PDP:**

```typescript
// app/[city]/[slug]/page.tsx
export const revalidate = 3600 // 1 hour

export async function generateStaticParams() {
  // Pre-generate top 100 most-booked experiences at build time
  const experiences = await getTopExperiences(100)
  return experiences.map(exp => ({
    city: exp.citySlug,
    slug: exp.slug,
  }))
}

export default async function PDPPage({ params }) {
  const experience = await getExperience(params.city, params.slug)
  if (!experience) notFound()
  // ...
}
```

---

## 11. Data Fetching Patterns

### Server Components — Use `fetch` directly

```typescript
// lib/api.ts — Server-side API client
const API_BASE = process.env.API_URL // internal Docker network URL

export async function getExperience(city: string, slug: string) {
  const res = await fetch(`${API_BASE}/api/v1/experiences/${city}/${slug}`, {
    next: { revalidate: 3600 }, // ISR cache
  })
  if (!res.ok) return null
  return res.json() as Promise<Experience>
}

export async function getCityExperiences(city: string, params: SearchParams) {
  const url = new URL(`${API_BASE}/api/v1/experiences`)
  url.searchParams.set("city", city)
  Object.entries(params).forEach(([k, v]) => v && url.searchParams.set(k, String(v)))

  const res = await fetch(url.toString(), { cache: "no-store" }) // SSR
  if (!res.ok) return { experiences: [], total: 0 }
  return res.json()
}
```

### Client Components — Use SWR for real-time data

```typescript
// hooks/useAvailability.ts
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then(r => r.json())

export function useAvailability(experienceId: string, date: string) {
  const { data, error, isLoading } = useSWR(
    experienceId && date
      ? `/api/availability?id=${experienceId}&date=${date}`
      : null,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds on availability page
      revalidateOnFocus: true,
    }
  )

  return {
    availability: data,
    isLoading,
    isError: !!error,
  }
}
```

### Next.js API Routes — Thin Proxies

```typescript
// app/api/availability/route.ts
// These routes are thin proxies to the Go backend.
// They exist to: 1) avoid CORS issues, 2) keep Go URL internal

import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id   = searchParams.get("id")
  const date = searchParams.get("date")

  if (!id || !date) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 })
  }

  const res = await fetch(
    `${process.env.API_URL}/api/v1/experiences/${id}/availability?date=${date}`,
    { cache: "no-store" }
  )

  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
```

---

## 12. Component Library — Custom Components

### ExperienceCard

```typescript
// components/experience/ExperienceCard.tsx
import Image from "next/image"
import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/common/StarRating"
import { PriceDisplay } from "@/components/common/PriceDisplay"
import { cn } from "@/lib/utils"
import { Clock } from "lucide-react"

interface ExperienceCardProps {
  id: string
  title: string
  city: string
  citySlug: string
  slug: string
  imageUrl: string
  rating: number
  reviewCount: number
  price: number
  currency: string
  durationMinutes: number
  category: string
  className?: string
}

export function ExperienceCard({
  title, city, citySlug, slug, imageUrl,
  rating, reviewCount, price, currency,
  durationMinutes, category, className
}: ExperienceCardProps) {
  return (
    <Link href={`/${citySlug}/${slug}`} className="group block">
      <Card className={cn(
        "overflow-hidden border-0 shadow-sm",
        "transition-all duration-300 ease-out",
        "hover:shadow-card-hover hover:-translate-y-1",
        className
      )}>
        {/* Image */}
        <div className="relative aspect-[4/3] overflow-hidden">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          />
          <div className="absolute top-3 left-3">
            <Badge className="bg-white/90 text-foreground text-xs font-medium hover:bg-white/90">
              {category}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 space-y-2">
          {/* Title */}
          <h3 className="font-semibold text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {title}
          </h3>

          {/* City + Duration */}
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <span>{city}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {formatDuration(durationMinutes)}
            </span>
          </div>

          {/* Rating */}
          {rating > 0 && (
            <StarRating rating={rating} reviewCount={reviewCount} />
          )}

          {/* Price */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <span className="text-xs text-muted-foreground">From</span>
              <PriceDisplay amount={price} currency={currency} className="font-bold text-lg" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
```

### ExperienceCardSkeleton

```typescript
// components/experience/ExperienceCardSkeleton.tsx
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent } from "@/components/ui/card"

export function ExperienceCardSkeleton() {
  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <Skeleton className="aspect-[4/3] w-full rounded-none" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex justify-between items-center pt-1">
          <Skeleton className="h-6 w-24" />
        </div>
      </CardContent>
    </Card>
  )
}
```

### PricingBox (Sticky Booking Widget on PDP)

```typescript
// components/experience/PricingBox.tsx
// This is a Client Component — has interactive date/guest pickers
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DatePicker } from "@/components/booking/DatePicker"
import { GuestSelector } from "@/components/booking/GuestSelector"
import { VariantSelector } from "@/components/booking/VariantSelector"
import { useAvailability } from "@/hooks/useAvailability"
import { Skeleton } from "@/components/ui/skeleton"
import { ShieldCheck, Clock } from "lucide-react"

// Structure:
// Card with shadow-pricing-box
//   Price: "From $XX" (large, top)
//   StarRating + review count
//   Separator
//   VariantSelector (option picker — adult/child/etc.)
//   DatePicker  (uses shadcn Calendar + Popover)
//   GuestSelector (increment/decrement adults, children)
//   Separator
//   Order summary: subtotal calculation
//   "Check Availability" button → validates → "Book Now"
//   Free cancellation notice (if applicable)
//   "No booking fees" trust badge

// Rules:
// 1. PricingBox is sticky: className="sticky top-24"
// 2. On mobile it disappears and a bottom bar CTA appears instead
// 3. Price shown = PricingEngine result from Go API
// 4. NEVER calculate price client-side — always from API
// 5. Availability check calls /api/availability before enabling Book Now
```

### StarRating

```typescript
// components/common/StarRating.tsx
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"

interface StarRatingProps {
  rating: number        // 0.0–5.0
  reviewCount?: number
  size?: "sm" | "md" | "lg"
  className?: string
}

export function StarRating({ rating, reviewCount, size = "sm", className }: StarRatingProps) {
  const sizes = { sm: "h-3.5 w-3.5", md: "h-4 w-4", lg: "h-5 w-5" }
  const textSizes = { sm: "text-xs", md: "text-sm", lg: "text-base" }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              sizes[size],
              star <= Math.round(rating)
                ? "fill-amber-400 text-amber-400"
                : "fill-muted text-muted-foreground"
            )}
          />
        ))}
      </div>
      <span className={cn("font-semibold text-foreground", textSizes[size])}>
        {rating.toFixed(1)}
      </span>
      {reviewCount !== undefined && (
        <span className={cn("text-muted-foreground", textSizes[size])}>
          ({reviewCount.toLocaleString()})
        </span>
      )}
    </div>
  )
}
```

### PriceDisplay

```typescript
// components/common/PriceDisplay.tsx
interface PriceDisplayProps {
  amount: number
  currency: string   // ISO 4217: "USD", "INR", "EUR"
  className?: string
}

export function PriceDisplay({ amount, currency, className }: PriceDisplayProps) {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)

  return <span className={className}>{formatted}</span>
}
```

---

## 13. Forms & Validation

### Zod Schemas

**File: `lib/validations.ts`**

```typescript
import { z } from "zod"

// Checkout / guest info form
export const checkoutFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName:  z.string().min(2, "Last name must be at least 2 characters"),
  email:     z.string().email("Please enter a valid email address"),
  phone:     z.string().min(10, "Please enter a valid phone number"),
  specialRequests: z.string().max(500).optional(),
})

// Date + guest selection form (Step 1 of booking)
export const bookingDetailsSchema = z.object({
  date:      z.date({ required_error: "Please select a date" }),
  variantId: z.string().min(1, "Please select a ticket type"),
  adults:    z.number().min(1, "At least 1 adult required").max(20),
  children:  z.number().min(0).max(20).default(0),
})

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>
export type BookingDetailsValues = z.infer<typeof bookingDetailsSchema>
```

### Form Implementation Pattern

**Always use React Hook Form + Zod + shadcn Form components together:**

```typescript
"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { checkoutFormSchema, type CheckoutFormValues } from "@/lib/validations"

export function CheckoutForm() {
  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "" },
  })

  async function onSubmit(values: CheckoutFormValues) {
    // Call Go backend
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage /> {/* Shows Zod validation errors */}
              </FormItem>
            )}
          />
          {/* Repeat for lastName, email, phone */}
        </div>
        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Processing..." : "Continue to Payment"}
        </Button>
      </form>
    </Form>
  )
}
```

---

## 14. Booking Flow — Step by Step

```
Step 1 — PDP: User selects variant + date + guests
  Component: PricingBox
  Action: POST /api/availability (validate slot still open)
  On success: Enable "Book Now" button
  On error: Show "Sold out" or "Temporarily unavailable" using shadcn Alert

Step 2 — Checkout: Guest info
  Route: /checkout?experienceId=X&date=Y&guests=Z&variantId=W
  Component: CheckoutForm
  Validate: Zod + React Hook Form
  On submit: Store in sessionStorage (not localStorage), move to Step 3

Step 3 — Checkout: Payment
  Component: PaymentForm
  Integration: Stripe Elements (iframe) — NEVER handle raw card numbers
  On submit: POST /api/bookings → Go backend → Headout booking API

Step 4 — Confirmation
  Route: /checkout/confirmation?bookingRef=ABC123
  Show: booking reference, email confirmation notice
  Log: Booking reference into google_feed_status if needed
```

**State Management:**
- Use URL query params to pass data between checkout steps (not localStorage)
- Use React `useState` + `useContext` for in-page booking widget state
- Use SWR for availability polling

---

## 15. SEO & Metadata

### Per-Page Metadata

```typescript
// app/[city]/[slug]/page.tsx
import type { Metadata } from "next"

export async function generateMetadata({ params }): Promise<Metadata> {
  const experience = await getExperience(params.city, params.slug)
  if (!experience) return {}

  return {
    title: `${experience.title} in ${experience.city}`,
    description: experience.description.substring(0, 160),
    openGraph: {
      title: experience.title,
      description: experience.description.substring(0, 160),
      images: [{ url: experience.images[0].url, width: 1200, height: 630 }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: experience.title,
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL}/${params.city}/${params.slug}`,
    },
  }
}
```

### URL Structure
```
/                           → Homepage
/[city]                     → City listing (e.g., /new-york)
/[city]/[slug]              → PDP (e.g., /new-york/central-park-bike-tour)
/search                     → Search results
/checkout                   → Checkout
/checkout/confirmation      → Confirmation
```

**Slug generation rules:**
- Always lowercase
- Spaces → hyphens
- Remove special characters
- Max 60 characters
- Must be stable — changing a slug breaks the GTTD landing_page URL

---

## 16. JSON-LD Integration (GTTD)

Every PDP must include JSON-LD. Fetch it from the Go API — never build it in the frontend.

```typescript
// app/[city]/[slug]/page.tsx
export default async function PDPPage({ params }) {
  const [experience, jsonLD] = await Promise.all([
    getExperience(params.city, params.slug),
    getJSONLD(params.slug), // calls /api/v1/gttd/jsonld/:headout_id
  ])

  if (!experience) notFound()

  return (
    <>
      {jsonLD && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLD) }}
        />
      )}
      {/* Page content */}
    </>
  )
}
```

**Validation:** Test every PDP with Google's Rich Results Test at https://search.google.com/test/rich-results before deploying.

---

## 17. Image Handling

### Rules
1. **Always use `next/image`** — never raw `<img>` tags
2. Set `sizes` prop on every image for correct responsive loading
3. Set `priority={true}` on above-the-fold images (hero, first card)
4. Use `fill` on container images, `width`+`height` on fixed-size images
5. All external image domains must be whitelisted in `next.config.ts`

### `next.config.ts`

```typescript
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.headout.com",     // Headout CDN
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.traviia.com",  // Own CDN (if applicable)
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
  },
  // Proxy API calls to Go backend in development
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${process.env.API_URL}/api/v1/:path*`,
      },
    ]
  },
}

export default nextConfig
```

### Image Sizes Reference

```typescript
// Hero image
<Image fill sizes="100vw" priority className="object-cover" />

// ExperienceCard (in grid)
<Image fill sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw" />

// PDP main image
<Image fill sizes="(max-width: 1024px) 100vw, 60vw" priority />

// Thumbnail
<Image width={120} height={80} className="object-cover rounded" />
```

---

## 18. Error States & Loading States

### Loading States

```typescript
// RULE: Every page that fetches data must have a loading.tsx sibling

// For grids — show skeleton cards
export default function Loading() {
  return (
    <div className="container py-section">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <ExperienceCardSkeleton key={i} />
        ))}
      </div>
    </div>
  )
}
```

### Error States

```typescript
// app/error.tsx — global error boundary
"use client"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="container py-section flex flex-col items-center gap-4 text-center">
      <AlertTriangle className="h-12 w-12 text-destructive" />
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-muted-foreground text-sm max-w-sm">{error.message}</p>
      <Button variant="outline" onClick={reset}>Try again</Button>
    </div>
  )
}
```

### API Unavailable State (GTTD Critical)

When the Go backend / Headout API is unreachable, show this — never show stale prices:

```typescript
// Used in PricingBox when availability check fails
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertTriangle } from "lucide-react"

<Alert variant="destructive">
  <AlertTriangle className="h-4 w-4" />
  <AlertDescription>
    Pricing is temporarily unavailable. Please refresh or try again in a few minutes.
  </AlertDescription>
</Alert>
```

### Empty States

```typescript
// components/common/EmptyState.tsx
import { SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"

interface EmptyStateProps {
  title: string
  description: string
  action?: { label: string; href: string }
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <SearchX className="h-12 w-12 text-muted-foreground" />
      <div className="space-y-1">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-muted-foreground text-sm max-w-sm">{description}</p>
      </div>
      {action && (
        <Button asChild variant="outline">
          <a href={action.href}>{action.label}</a>
        </Button>
      )}
    </div>
  )
}
```

---

## 19. Environment Variables

**File: `.env.local` (development) / Docker secrets (production)**

```dotenv
# Go Backend URL — internal Docker network in production, localhost in dev
API_URL=http://localhost:8080

# Public site URL — used in metadata and JSON-LD
NEXT_PUBLIC_SITE_URL=https://traviia.com

# Stripe publishable key (public — safe to expose)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Stripe secret key (server only — NEVER prefix with NEXT_PUBLIC_)
STRIPE_SECRET_KEY=sk_live_...
```

**Rules:**
- Variables prefixed `NEXT_PUBLIC_` are exposed to the browser — never put secrets there
- `API_URL` is server-only — never expose the internal backend URL to the client
- Access environment variables via `process.env.VARIABLE_NAME`
- Validate env vars at startup using a Zod schema in `lib/env.ts`

---

## 20. Critical Rules — Do NOT Violate

### R1 — shadcn/ui is the only component source
Never build custom buttons, inputs, dialogs, selects, or toasts. Always use the shadcn primitive and extend via `className`. Never install a second component library.

### R2 — Tailwind only for styling
No inline `style={{}}` objects, no CSS modules, no styled-components. Every style must be a Tailwind class. If something can't be expressed in Tailwind, add it to `tailwind.config.ts` as an extension.

### R3 — Never modify `components/ui/`
Files in `components/ui/` are generated by shadcn CLI. They will be regenerated on updates. Put all customization in the consuming component via `className` prop and `cn()`.

### R4 — Server Components by default
Every component is a Server Component unless it uses hooks, browser APIs, or event handlers. Only add `"use client"` when required. Keep the client boundary as far down the tree as possible.

### R5 — Never calculate price client-side
Prices must always come from the Go backend API. The frontend displays prices — it never computes them. This is required for GTTD compliance (feed price = page price).

### R6 — Never use `<img>` tags
Always use `next/image`. Add any required image domains to `next.config.ts` `remotePatterns`.

### R7 — Slugs are immutable after creation
A slug in the URL corresponds to the `landing_page.url` in the GTTD feed. Changing a slug breaks the Google listing. Slugs are set once from the experience title and never changed. If a title changes, a redirect must be added — not a slug change.

### R8 — All forms use React Hook Form + Zod
Never use uncontrolled inputs or manual form validation. Every form = React Hook Form + Zod schema + shadcn Form components.

### R9 — TypeScript strict mode
`tsconfig.json` must have `"strict": true`. No `any` types. All API response shapes must have corresponding types in `types/`.

### R10 — ISR revalidation must stay at 3600s minimum on PDPs
The PDP ISR interval controls how stale the JSON-LD can get. Setting it lower is fine for freshness but increases server load. Never increase it above 3600s (1 hour) — prices change.

### R11 — Mobile-first responsive design
All components start with the mobile layout, then add `md:`, `lg:` modifiers. Never write desktop-first styles.

### R12 — Accessibility baseline
Every interactive element must be keyboard navigable (shadcn handles this). All images must have meaningful `alt` text. Color contrast must meet WCAG AA. Never remove focus rings.

---

## Appendix: TypeScript Types

**File: `types/experience.ts`**

```typescript
export interface Experience {
  id: string
  headoutId: string
  title: string
  description: string        // may contain HTML
  city: string
  citySlug: string
  slug: string
  country: string
  latitude: number
  longitude: number
  rating: number
  reviewCount: number
  images: ExperienceImage[]
  operatorName: string
  categories: string[]
  languages: string[]
  durationMinSeconds: number
  durationMaxSeconds: number
  cancellationPolicy: CancellationPolicy | null
  options: ExperienceOption[]
  gttdEnabled: boolean
}

export interface ExperienceImage {
  url: string
  caption: string
}

export interface ExperienceOption {
  id: string
  headoutVariantId: string
  title: string
  description: string
  price: number         // final price after markup — from API
  currency: string
  inclusions: string[]
  exclusions: string[]
  highlights: string[]
  fulfillmentMobile: boolean
  fulfillmentPrint: boolean
  fulfillmentPickup: boolean
}

export interface CancellationPolicy {
  cutoffHours: number
  refundPercent: number
  description: string
}
```

**File: `types/booking.ts`**

```typescript
export interface BookingRequest {
  experienceId: string
  variantId: string
  date: string          // ISO 8601: "2025-08-15"
  adults: number
  children: number
  firstName: string
  lastName: string
  email: string
  phone: string
  specialRequests?: string
}

export interface BookingResponse {
  bookingId: string
  headoutReference: string
  status: "PENDING" | "CONFIRMED" | "CANCELLED"
  totalAmount: number
  currency: string
  confirmationEmailSent: boolean
}
```

**File: `types/api.ts`**

```typescript
// Standard API response envelope from Go backend
export interface APIResponse<T> {
  data: T
  error: string | null
  meta?: {
    total: number
    page: number
    limit: number
  }
}
```