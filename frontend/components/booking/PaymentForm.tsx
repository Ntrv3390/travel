"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PaymentForm() {
  return (
    <div className="space-y-4 rounded-lg border p-4">
      <h3 className="font-semibold">Payment</h3>
      <p className="text-sm text-muted-foreground">Stripe Elements integration placeholder. Card data must be handled by Stripe only.</p>
      <Input placeholder="Stripe Payment Element mounts here" disabled />
      <Button className="w-full" disabled>
        Pay Securely
      </Button>
    </div>
  );
}
