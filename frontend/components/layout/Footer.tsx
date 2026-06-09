import Link from "next/link";
import { CheckCircle2, Facebook, Instagram, ShieldCheck, Ticket, Twitter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-gradient-to-b from-slate-50 to-slate-100">
      <div className="container py-8">
        <Card className="rounded-3xl border-slate-200/90 bg-white/90 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.08)] backdrop-blur md:p-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-700 to-blue-500 bg-clip-text text-transparent">Triipzy</h3>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-600">
                Curated premium experiences in 211+ destinations with trusted local operators.
              </p>
              <div className="mt-4 flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Instagram"
                  className="h-10 w-10 rounded-full border-slate-200 p-0 text-slate-600 hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-600"
                >
                  <Instagram size={17} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Facebook"
                  className="h-10 w-10 rounded-full border-slate-200 p-0 text-slate-600 hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-600"
                >
                  <Facebook size={17} />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-label="Twitter"
                  className="h-10 w-10 rounded-full border-slate-200 p-0 text-slate-600 hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-600"
                >
                  <Twitter size={17} />
                </Button>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900">Explore</h4>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                <Link href="/cities" className="transition hover:text-sky-600">
                  Destinations
                </Link>
                <Link href="/products" className="transition hover:text-sky-600">
                  Experiences
                </Link>
                <Link href="/about" className="transition hover:text-sky-600">
                  About Us
                </Link>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900">Support</h4>
              <div className="mt-3 grid gap-2 text-sm text-slate-600">
                <Link href="/help" className="transition hover:text-sky-600">
                  Help center
                </Link>
                <Link href="/privacy-policy" className="transition hover:text-sky-600">
                  Privacy policy
                </Link>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-slate-900">Trust and payments</h4>
              <div className="mt-3 grid gap-2.5 text-sm text-slate-700">
                <span className="inline-flex items-center gap-2">
                  <ShieldCheck size={16} className="text-sky-600" /> Secure checkout
                </span>
                <span className="inline-flex items-center gap-2">
                  <Ticket size={16} className="text-sky-600" /> Official tickets
                </span>
                <span className="inline-flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-sky-600" /> Verified reviews
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5 text-sm">
            <h4 className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              Legal
            </h4>
            <Link
              href="/privacy-policy"
              className="text-slate-600 transition hover:text-sky-600"
            >
              Privacy Policy
            </Link>
          </div>

          <Separator className="mt-5" />
          <div className="pt-4 text-sm text-slate-500">Copyright 2026 Triipzy. All rights reserved.</div>
        </Card>
      </div>
    </footer>
  );
}
