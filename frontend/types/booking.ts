export interface BookingRequest {
  experienceId: string;
  variantId: string;
  date: string;
  adults: number;
  children: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests?: string;
}

export interface BookingResponse {
  bookingId: string;
  headoutReference: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  totalAmount: number;
  currency: string;
  confirmationEmailSent: boolean;
}
