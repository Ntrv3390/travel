export interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  city: string;
  cityCode: string;
  category: string;
  imageUrl: string;
  price: number;
  currency: string;
  rating: number;
  reviewCount: number;
  productType: string;
  url: string;
}

export interface SearchCity {
  code: string;
  name: string;
  country: string;
  image: string;
  slug: string;
  url: string;
}

export interface SearchCategory {
  id: string;
  name: string;
  slug: string;
  url: string;
}

export interface SearchSuggestion {
  text: string;
  type: string;
  url: string;
  score: number;
}

export interface SearchAllResponse {
  query: string;
  products: SearchProduct[];
  cities: SearchCity[];
  categories: SearchCategory[];
  suggestions: SearchSuggestion[];
}

export interface SearchGrouped {
  attractions: SearchProduct[];
  cities: SearchCity[];
  categories: SearchCategory[];
  popular: SearchSuggestion[];
}
