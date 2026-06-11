# Cart, Checkout & Confirmation — UI Redesign Plan

## Design Principles

- **Mobile-first, always.** Every layout starts at 375px and scales up. No horizontal overflow ever.
- **Consistent token usage.** Brand blue (`brand-500 = #0ea5e9`), Geist Sans, `--radius` from CSS vars, custom shadows from tailwind config.
- **Generous whitespace.** Cards get `p-6` minimum, sections breathe with `gap-6`/`gap-8`.
- **Rounded, soft.** Upgrade from `rounded-lg` to `rounded-2xl` on all experience cards.
- **Trust-first.** Secure checkout badges, instant confirmation copy, cancellation policy visible before booking.
- **Animate sparingly.** `fade-in-up` on mount, `slide-in-bottom` for mobile sticky bars.

---

## Page 1: Cart (`/cart`)

### Layout structure

```
Mobile                          Desktop (lg+)
─────────────────────           ───────────────────────────────────────
[Header: "Your Cart" (n items)] [Header]
[Currency alert (if stale)]     [Currency alert]
[Experience Group Card]         [Experience Group Card] │ [Order Summary
[Experience Group Card]         [Experience Group Card] │  sticky card ]
                                                        │
[Sticky bottom bar: total + CTA]
```

### Header
- `"Your Cart"` as `text-display-sm font-bold`
- Grey pill badge showing item count: `n items`
- "Clear all" ghost button — right-aligned, only shown if cart has items
- `mb-8` separation from content

### Experience Group Cards
Each experience gets a `rounded-2xl border bg-card shadow-glass` card:

**Card top:** Horizontal strip
- Left: `80×80` experience image, `rounded-xl object-cover` — linked to PDP
- Center: Experience title (bold, `line-clamp-2`), then muted variant name if different
- Right: Trash icon button (`hover:text-destructive`, ghost)

**Booking rows** (one per date/variant combo) — inside `divide-y`:
- **Date + time pill:** `rounded-full bg-muted px-3 py-1 text-xs font-medium` — e.g. "Jun 25 · 9:00 AM"
- **Guest stepper:** Per type (ADULT/CHILD), pill-style inline stepper `[−] 2 [+]`, `h-8 w-8` touch targets
- **Price:** Right-aligned — unit price small muted below, **total bold** above
- **"Book this" CTA:** Full-width on mobile, `w-auto` on sm+, placed bottom-right of row

**Card footer:** Light grey `bg-muted/30` strip — "Activity total: $XXX" right-aligned

### Desktop Order Summary Sidebar (lg+ only)
Sticky `top-24` card:
- "Order Summary" heading
- Each item: title + date + price in a compact list
- Divider
- **Cart total** large + bold
- **"Checkout All" primary button** full-width `h-12`
- "🔒 All payments secured" caption

### Mobile Sticky Bottom Bar
`fixed bottom-0 inset-x-0` bar with `shadow-sticky bg-background/95 backdrop-blur-md`:
- "Total: $XXX" left
- "Checkout All →" primary button right, `h-12`
- Only shown when cart has items, `slide-in-bottom` animation

### Empty State
Centered, with a luggage/compass SVG icon (inline, brand-colored), "Your cart is empty" heading, "Browse experiences" CTA button.

### Loading Skeleton
3× skeleton cards with image placeholder + text lines.

---

## Page 2: Checkout — Single Item (`/checkout`)

### Layout structure

```
Mobile                         Desktop (lg+)
──────────────────             ──────────────────────────────────────
[Step bar: ① Cart ② Checkout]  [Step bar]
[Order Summary card]           [Traveller Details form] │ [Order Summary
[Traveller Details form]                                │  sticky card ]
[Trust signals strip]          [Trust signals strip]    │
[Submit CTA]
```

### Step Progress Bar
3 steps inline: `Cart → Checkout → Confirmed`
Each step is a labelled dot. Active = filled brand circle. Done = filled green checkmark. Future = grey outline.
Full-width, `mb-8`.

### Order Summary card (visible top on mobile, sidebar on desktop)
Card `rounded-2xl border shadow-glass p-6`:
- Image: `aspect-video w-full rounded-xl object-cover` — or `h-48` fixed height
- Title: `text-xl font-bold mt-4`
- Metadata row: `Calendar icon + date`, `Clock icon + time` (if set), `Users icon + "N guests"`
  — each as a `flex items-center gap-1.5 text-sm text-muted-foreground` pill
- Divider
- Guest breakdown: per type, count × unit price = subtotal, listed rows
- Divider
- **Total row:** "Total" left, bold price right — `text-lg font-bold`
- Small muted: "Price confirmed at booking time"

### Traveller Details Form
Section card `rounded-2xl border p-6`:
- Heading: `text-lg font-semibold` "Traveller Details"
- Subheading: muted small text "Enter details for the lead traveller"
- All inputs: `h-12 rounded-xl text-base` (larger than default for mobile comfort)
- Labels: `text-sm font-medium mb-1.5` above each field
- Two-column grid for First Name / Last Name on sm+
- Two-column grid for Email / Phone on sm+
- Error states: red border + red helper text below
- "Special Requests" (optional) collapsible `<details>` / accordion at bottom of form
- **Submit button:** `w-full h-14 rounded-xl text-base font-semibold` with Loader2 spinner when submitting

### Trust Signals Strip (below form)
3 columns on sm+, stacked on mobile:
```
🔒 Secure Payment    ✓ Instant Confirmation    📧 Voucher by Email
```
Each column: icon (brand colour) + bold label + muted sub-label
`rounded-xl border bg-muted/30 px-4 py-3`

---

## Page 3: Checkout — Multi Item (`/checkout?multi=true`)

Same two-column layout as single checkout. Differences:

### Order Summary
- Collapsible per-item sections (`<details>` accordion): title, date, guests, price
- "N items" heading at top
- Mixed-currency warning if applicable (amber alert, better designed)
- Grand total at bottom

### Form
Same `CustomerDetailsForm`. Different submit label: "Confirm & Book All (N)"

### After Booking (completion state)
Replaces the page content:

**All succeeded:**
- Animated green checkmark (scale-in)
- "All Bookings Confirmed!" heading
- Booking results table: title | booking ID | status badge
- Two CTAs: "Explore More" (primary) + "Download Vouchers" (if applicable)

**Partial failure:**
- Amber icon
- Table shows success (green badge) and failed (red badge) rows
- "Retry failed" link for failed items
- "Go to cart" secondary CTA

---

## Page 4: Booking Confirmation (`/checkout/confirmation`)

### Confirmed State Layout

```
──────────────────────────────────────────
[Ambient confetti particles — CSS only]

         ✓ (animated circle → checkmark)
    "Booking Confirmed!"   text-display-sm
    "Thanks [name], you're all set."

┌───────────────────────────────────────┐
│  BOOKING REFERENCE                    │
│  ████████████   (monospace, large)    │
│                                       │
│  Experience: [title]                  │
│  Date:       Jun 25, 2026             │
│  Status:     ● Confirmed              │
│  Email:      Confirmation sent ✓      │
└───────────────────────────────────────┘

    [Explore More Experiences] [Home]
──────────────────────────────────────────
```

**Animated checkmark:** 
- Outer ring: `animate-ping` brand green circle, one pulse then stops
- Inner circle: `scale-in` animation, filled green
- Checkmark: SVG `stroke-dashoffset` animation draws the path in

**Reference number:**
- `font-mono text-2xl font-bold tracking-widest` inside a `rounded-2xl bg-muted/40 p-4` block
- Copy-to-clipboard button (icon only, ghost)

**Booking detail card `rounded-2xl border shadow-glass p-6`:**
- Each row: label (muted, uppercase xs) + value (bold), separated by subtle divider
- Status shown as coloured badge: green "Confirmed", amber "Pending", grey "Processing"

**Confetti (CSS-only, no library):**
- 12 absolutely-positioned `before:` / `after:` pseudo-elements or small `span` elements
- `@keyframes confetti-fall` — random rotations + fall from top
- `pointer-events-none overflow-hidden` wrapper, height `160px`
- Only rendered when `isConfirmed === true`

### Error/Pending State
- Amber pulsing ring icon
- "Booking Reference Unavailable" heading
- Helpful copy explaining what to do
- Support contact link

---

## Files to Create / Modify

| File | Action | Summary |
|---|---|---|
| `frontend/app/cart/page.tsx` | Rewrite | New layout with groups, desktop sidebar, mobile sticky bar |
| `frontend/components/booking/CartItemCard.tsx` | Rewrite | Rounded card, better stepper, price layout |
| `frontend/components/booking/CheckoutForm.tsx` | Rewrite | Wrap with two-column layout + OrderSummary |
| `frontend/components/booking/MultiCheckoutView.tsx` | Rewrite | Two-column layout, collapsible order summary, better result state |
| `frontend/app/checkout/confirmation/page.tsx` | Rewrite | Animated checkmark, confetti, copy reference, full detail card |
| `frontend/components/booking/CustomerDetailsForm.tsx` | Enhance | Larger inputs (`h-12`), better field layout, trust strip |
| `frontend/components/booking/OrderSummary.tsx` | New/enhance | Reusable card used in both single and multi checkout |
| `frontend/components/booking/StepBar.tsx` | Create | Reusable 3-step progress indicator |
| `frontend/components/booking/TrustSignals.tsx` | Create | Reusable trust signals strip |

---

## Component Design Tokens (consistent across all 3 pages)

```
Card shell:        rounded-2xl border bg-card shadow-glass
Section heading:   text-lg font-semibold text-foreground
Metadata pill:     rounded-full bg-muted/60 px-3 py-1 text-xs font-medium
Primary CTA:       h-12 sm:h-14 w-full rounded-xl text-base font-semibold
Ghost/delete:      text-muted-foreground hover:text-destructive transition-colors
Image thumbnail:   rounded-xl object-cover (80×80 cart, full-width checkout)
Price display:     text-lg font-bold (total), text-sm text-muted-foreground (unit)
Status badge:      rounded-full px-2.5 py-0.5 text-xs font-semibold + colour
```

---

## Mobile-Specific Patterns

- All cards: `mx-0 rounded-none` on xs, `rounded-2xl` on sm+ (edge-to-edge on small phones)
- Checkout form stacks above order summary on mobile (summary collapses to top)
- Cart sticky bar: `fixed bottom-0 inset-x-0 z-50 p-4` with safe-area inset
- Touch targets: minimum `h-10 w-10` (44px) for all interactive elements
- Font size: `text-base` minimum for all inputs (prevents iOS zoom)
- `gap-4` between sections on mobile, `gap-8` on lg+
