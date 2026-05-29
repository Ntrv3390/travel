"use client";

import { useCallback, useEffect, useReducer } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/products/ProductCard";
import { getProducts } from "@/lib/api";
import { useCurrency } from "@/hooks/useCurrency";
import type { Product, ProductsQueryParams } from "@/types/product";

interface State {
  products: Product[];
  nextOffset: number | null;
  total: number;
  loading: boolean;
  error: string | null;
  initialLoading: boolean;
}

type Action =
  | { type: "FETCH_START" }
  | { type: "FETCH_SUCCESS"; products: Product[]; nextOffset: number | null; total: number; append: boolean }
  | { type: "FETCH_ERROR"; error: string }
  | { type: "RESET" };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "FETCH_START":
      return { ...state, loading: true, error: null };
    case "FETCH_SUCCESS":
      return {
        products: action.append ? [...state.products, ...action.products] : action.products,
        nextOffset: action.nextOffset,
        total: action.total,
        loading: false,
        error: null,
        initialLoading: false,
      };
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.error, initialLoading: false };
    case "RESET":
      return { products: [], nextOffset: 0, total: 0, loading: false, error: null, initialLoading: true };
    default:
      return state;
  }
}

const initialState: State = {
  products: [],
  nextOffset: 0,
  total: 0,
  loading: false,
  error: null,
  initialLoading: true,
};

interface ProductsGridProps {
  queryParams: ProductsQueryParams;
}

export function ProductsGrid({ queryParams }: ProductsGridProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { currency } = useCurrency();

  const fetchProducts = useCallback(
    async (append: boolean) => {
      dispatch({ type: "FETCH_START" });
      const offset = append ? state.nextOffset ?? 0 : 0;
      const result = await getProducts({ ...queryParams, currencyCode: currency, offset, limit: 20 });
      if (result.error) {
        dispatch({ type: "FETCH_ERROR", error: result.error });
      } else if (result.data) {
        dispatch({
          type: "FETCH_SUCCESS",
          products: result.data.products,
          nextOffset: result.data.nextOffset,
          total: result.data.total,
          append,
        });
      } else {
        dispatch({ type: "FETCH_ERROR", error: "No data returned" });
      }
    },
    [queryParams, state.nextOffset, currency],
  );

  useEffect(() => {
    dispatch({ type: "RESET" });
    fetchProducts(false);
  }, [queryParams.cityCode, queryParams.collectionId, queryParams.categoryId, queryParams.subCategoryId, currency]);

  if (state.initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-sm text-red-500">{state.error}</p>
        <Button variant="outline" size="sm" onClick={() => fetchProducts(false)}>
          Retry
        </Button>
      </div>
    );
  }

  if (state.products.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm">Try adjusting your filters or selecting a different city.</p>
      </div>
    );
  }

  const hasMore = state.nextOffset !== null;

  return (
    <div>
      <p className="mb-4 text-sm text-muted-foreground">
        {state.total} product{state.total !== 1 ? "s" : ""} found
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {state.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <Button
            variant="outline"
            size="lg"
            onClick={() => fetchProducts(true)}
            disabled={state.loading}
            className="min-w-40"
          >
            {state.loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {state.loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  );
}
