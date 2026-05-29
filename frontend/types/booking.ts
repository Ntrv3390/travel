export interface BookingRequest {
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  inventoryId: string;
  inventoryType: string;
  date: string;
  startDateTime: string;
  endDateTime: string;
  adults: number;
  children: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  currencyCode: string;
  priceAmount: number;
  specialRequests?: string;
  variantInputFields?: Array<{ id: string; value: string }>;
}

export interface BookingResponse {
  bookingId: string;
  partnerReferenceId: string;
  status: string;
  startDateTime: string;
  totalAmount: number;
  currency: string;
  voucherUrl: string;
  confirmationEmailSent: boolean;
}

export interface CartItem {
  id: string;
  experienceId: string;
  productId: string;
  variantId: string;
  inventoryId: string;
  inventoryType: string;
  date: string;
  startDateTime: string;
  endDateTime: string;
  adults: number;
  children: number;
  title: string;
  priceAmount: number;
  currency: string;
  imageUrl: string;
  addedAt: string;
}

export interface Cart {
  sessionId: string;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  currency: string;
}
