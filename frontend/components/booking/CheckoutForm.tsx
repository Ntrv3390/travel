"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { checkoutFormSchema, type CheckoutFormValues } from "@/lib/validations";
import { createBooking } from "@/lib/api";
import { useCheckout } from "@/context/CheckoutContext";

export function CheckoutForm() {
  const router = useRouter();
  const { info } = useCheckout();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      specialRequests: "",
    },
  });

  const onSubmit = async (values: CheckoutFormValues) => {
    setSubmitting(true);
    const idempotencyKey = crypto.randomUUID?.() ?? `bk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const result = await createBooking({
      experienceId: info.experienceId,
      variantId: info.variantId,
      inventoryId: info.inventoryId,
      date: info.date,
      adults: info.adults,
      children: info.children,
      currencyCode: info.currency,
      idempotencyKey,
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      phone: values.phone,
      specialRequests: values.specialRequests,
    });

    if (result.error) {
      alert("Booking failed: " + result.error);
      setSubmitting(false);
      return;
    }

    const booking = result.data;
    const params = new URLSearchParams();
    params.set("title", info.title);
    if (booking) {
      params.set("bookingRef", booking.headoutReference || booking.bookingId);
      params.set("bookingId", booking.bookingId);
      params.set("status", booking.status);
      params.set("emailSent", String(booking.confirmationEmailSent));
    }
    params.set("firstName", values.firstName);
    router.push(`/checkout/confirmation?${params.toString()}`);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input placeholder="John" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input placeholder="Doe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="john@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input type="tel" placeholder="+1 555 0123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <Button className="w-full" type="submit" disabled={submitting}>
          {submitting ? "Booking..." : "Confirm & Book"}
        </Button>
      </form>
    </Form>
  );
}
