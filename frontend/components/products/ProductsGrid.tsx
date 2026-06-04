"use client";

import { useCallback, useEffect, useReducer, useRef } from "react";
import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/products/ProductCard";
import { ProductCardSkeleton } from "@/components/products/ProductCardSkeleton";
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
  done: boolean;
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
    case "FETCH_SUCCESS": {
      const updatedProducts = action.append ? [...state.products, ...action.products] : action.products;
      return {
        products: updatedProducts,
        nextOffset: action.nextOffset,
        total: updatedProducts.length,
        loading: false,
        error: null,
        initialLoading: false,
        done: action.nextOffset === null,
      };
    }
    case "FETCH_ERROR":
      return { ...state, loading: false, error: action.error, initialLoading: false };
    case "RESET":
      return { products: [], nextOffset: 0, total: 0, loading: false, error: null, initialLoading: true, done: false };
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
  done: false,
};

interface ProductsGridProps {
  queryParams: ProductsQueryParams;
}

export function ProductsGrid({ queryParams }: ProductsGridProps) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { currency } = useCurrency();
  const fetchTick = useRef(0);
  const offsetRef = useRef<number>(0);
  const isFetching = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const ITEM_LIMIT = 40;
  const TRIGGER_INDEX = 25;

  const fetchProducts = useCallback(
    async (append: boolean, overrideOffset?: number) => {
      // If we're starting a new fresh fetch (e.g. currency changed), cancel any in-flight
      if (!append) {
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        isFetching.current = false;
      }

      if (isFetching.current) return;
      isFetching.current = true;
      const tick = ++fetchTick.current;
      dispatch({ type: "FETCH_START" });
      const offset = overrideOffset !== undefined ? overrideOffset : append ? offsetRef.current : 0;

      const signal = abortRef.current?.signal;
      const result = await getProducts({ ...queryParams, currencyCode: currency, offset, limit: ITEM_LIMIT }, { signal });

      // If aborted, do nothing
      if (signal?.aborted) {
        isFetching.current = false;
        return;
      }

      if (tick !== fetchTick.current) {
        isFetching.current = false;
        return;
      }

      if (result.error) {
        // AbortError from fetch inside getProducts isn't handled as error
        if (result.error !== "AbortError") dispatch({ type: "FETCH_ERROR", error: result.error });
      } else if (result.data) {
        const nextOffset = result.data.nextOffset ?? null;
        if (append) offsetRef.current = nextOffset ?? 0;
        dispatch({
          type: "FETCH_SUCCESS",
          products: result.data.products,
          nextOffset,
          total: result.data.total,
          append,
        });
        // Auto-skip cities that returned empty (upstream 503) but still have more cities
        if (result.data.products.length === 0 && nextOffset !== null) {
          isFetching.current = false;
          fetchProducts(true, nextOffset);
          return;
        }
      } else {
        dispatch({ type: "FETCH_ERROR", error: "No data returned" });
      }
      isFetching.current = false;
    },
    [queryParams, currency],
  );

  useEffect(() => {
    offsetRef.current = 0;
    fetchTick.current = 0;
    dispatch({ type: "RESET" });
    fetchProducts(false);
    return () => {
      abortRef.current?.abort();
    };
  }, [queryParams.cityCode, queryParams.collectionId, queryParams.categoryId, queryParams.subCategoryId, currency, fetchProducts]);

  useEffect(() => {
    if (state.initialLoading || state.loading || state.nextOffset === null || state.done || state.error) return;
    if (state.products.length < TRIGGER_INDEX) return;
    const triggerEl = document.getElementById(`product-card-${state.products[TRIGGER_INDEX - 1]?.id}`);
    if (!triggerEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && state.nextOffset !== null && !isFetching.current) {
          fetchProducts(true);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(triggerEl);
    return () => observer.disconnect();
  }, [state.initialLoading, state.loading, state.nextOffset, state.done, state.error, state.products.length, fetchProducts]);

  if (state.initialLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <ProductCardSkeleton key={index} />
        ))}
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

  if (state.products.length === 0 && state.done) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-muted-foreground">
        <PackageSearch className="h-12 w-12 opacity-40" />
        <p className="text-lg font-medium">No products found</p>
        <p className="text-sm">Check back soon for new experiences.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {state.products.map((product) => {
          console.log(product);
          return ((
            <div key={product.id} id={`product-card-${product.id}`}><ProductCard product={product} /></div>
          ))
        })}
      </div>

      {state.loading && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <ProductCardSkeleton key={`loading-${index}`} />
          ))}
        </div>
      )}

      {state.done && state.products.length > 0 && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          You&apos;ve seen all {state.total} products 🎉
        </p>
      )}
    </div>
  );
}
