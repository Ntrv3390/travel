import { Lock, CheckCircle2, Mail } from "lucide-react"

const SIGNALS = [
  {
    Icon: Lock,
    label: "Secure Checkout",
    sub: "256-bit SSL encryption",
  },
  {
    Icon: CheckCircle2,
    label: "Instant Confirmation",
    sub: "Booking confirmed immediately",
  },
  {
    Icon: Mail,
    label: "Voucher by Email",
    sub: "Sent straight to your inbox",
  },
]

export function TrustSignals() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {SIGNALS.map(({ Icon, label, sub }) => (
        <div key={label} className="flex items-center gap-3 rounded-xl border bg-muted/40 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
            <Icon className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">{label}</p>
            <p className="text-xs text-muted-foreground leading-tight mt-0.5">{sub}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
