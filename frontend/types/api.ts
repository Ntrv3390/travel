export interface APIResponse<T> {
  data: T;
  error: string | null;
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
}

export interface PaginatedResponse<T> {
  experiences: T[];
  total: number;
  page: number;
  limit: number;
}

export interface CurrencyOption {
  code: string
  symbol: string
  name: string
}

export interface SearchParams {
  category?: string;
  sort?: "recommended" | "price_asc" | "price_desc" | "rating";
  min_price?: string;
  max_price?: string;
  page?: string;
  limit?: string;
  q?: string;
  city?: string;
  currency?: string;
}
