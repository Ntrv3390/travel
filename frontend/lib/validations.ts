import { z } from "zod";

export const checkoutFormSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  specialRequests: z.string().max(500).optional(),
  passport: z.string().max(100).optional(),
  hotelName: z.string().max(200).optional(),
});

export const bookingDetailsSchema = z.object({
  date: z.date({ required_error: "Please select a date" }),
  variantId: z.string().min(1, "Please select a ticket type"),
  adults: z.number().min(1, "At least 1 adult required").max(20),
  children: z.number().min(0).max(20).default(0),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;
export type BookingDetailsValues = z.infer<typeof bookingDetailsSchema>;
