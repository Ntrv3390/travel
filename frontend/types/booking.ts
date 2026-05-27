export interface BookingRequest {
  experienceId: string;
  inventoryId: string;
  variantId: string;
  date: string;
  time?: string;
  adults: number;
  children: number;
  currencyCode: string;
  idempotencyKey: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  specialRequests?: string;
  variantInputFields?: Array<{ id: string; value: string }>;
}

export interface CartItem {
  id: string
  experienceId: string
  experience?: import("./experience").Experience
  variantId: string
  variantTitle: string
  inventoryId?: string
  date: string
  time?: string
  adults: number
  children: number
  unitPrice: number
  totalPrice: number
  currency: string
}

export interface Cart {
  sessionId: string
  items: CartItem[]
  totalItems: number
  totalPrice: number
  currency: string
}

export interface BookingResponse {
  bookingId: string;
  headoutReference: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED";
  totalAmount: number;
  currency: string;
  voucherUrl?: string;
  confirmationEmailSent: boolean;
}
