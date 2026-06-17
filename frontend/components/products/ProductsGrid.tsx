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

function makeInitialState(products: Product[], nextOffset: number | null): State {
  if (products.length > 0) {
    return {
      products,
      nextOffset,
      total: products.length,
      loading: false,
      error: null,
      initialLoading: false,
      done: nextOffset === null,
    };
  }
  return { products: [], nextOffset: 0, total: 0, loading: false, error: null, initialLoading: true, done: false };
}

const ITEM_LIMIT = 24;
const ITEMS_BEFORE_END = 8;

interface ProductsGridProps {
  queryParams: ProductsQueryParams;
  initialProducts?: Product[];
  initialNextOffset?: number | null;
}

export function ProductsGrid({ queryParams, initialProducts = [], initialNextOffset = null }: ProductsGridProps) {
  const [state, dispatch] = useReducer(
    reducer,
    { initialProducts, initialNextOffset },
    ({ initialProducts, initialNextOffset }) => makeInitialState(initialProducts, initialNextOffset),
  );

  const { currency } = useCurrency();

  // Keep currency in a ref so fetchProducts (used for infinite scroll) always
  // reads the latest value without needing it as a dependency.
  const currencyRef = useRef(currency);
  currencyRef.current = currency;

  const fetchTick = useRef(0);
  const offsetRef = useRef<number>(initialNextOffset ?? 0);
  const isFetching = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  // Stable fetch — only recreated when queryParams fields change, not on currency change.
  // Uses currencyRef so infinite-scroll pages always get the current currency.
  const fetchProducts = useCallback(
    async (append: boolean, overrideOffset?: number) => {
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
      const result = await getProducts(
        { ...queryParams, currencyCode: currencyRef.current, offset, limit: ITEM_LIMIT },
        { signal },
      );

      if (signal?.aborted || tick !== fetchTick.current) { isFetching.current = false; return; }

      if (result.error) {
        if (result.error !== "AbortError") dispatch({ type: "FETCH_ERROR", error: result.error });
      } else if (result.data) {
        const nextOffset = result.data.nextOffset ?? null;
        if (append) offsetRef.current = nextOffset ?? 0;
        dispatch({ type: "FETCH_SUCCESS", products: result.data.products, nextOffset, total: result.data.total, append });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryParams.cityCode, queryParams.collectionId, queryParams.categoryId, queryParams.subCategoryId],
  );

  // ── Initial load (only when no server data was passed) ──────────────────────
  const didInitialFetch = useRef(initialProducts.length > 0);
  useEffect(() => {
    if (didInitialFetch.current) return;
    didInitialFetch.current = true;
    offsetRef.current = 0;
    fetchProducts(false);
    return () => { abortRef.current?.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-fetch when filter/query params change ────────────────────────────────
  const isFirstQueryRender = useRef(true);
  useEffect(() => {
    if (isFirstQueryRender.current) { isFirstQueryRender.current = false; return; }
    offsetRef.current = 0;
    fetchTick.current = 0;
    dispatch({ type: "RESET" });
    fetchProducts(false);
    return () => { abortRef.current?.abort(); };
  }, [queryParams.cityCode, queryParams.collectionId, queryParams.categoryId, queryParams.subCategoryId, fetchProducts]);

  // ── Silent price update when currency changes ───────────────────────────────
  // Keeps the existing product cards visible; swaps prices in the background.
  // This ensures card prices match the product detail page (same currency, same TTL).
  const isFirstCurrencyRender = useRef(true);
  useEffect(() => {
    if (isFirstCurrencyRender.current) { isFirstCurrencyRender.current = false; return; }
    if (state.products.length === 0) { fetchProducts(false); return; }

    const controller = new AbortController();
    getProducts(
      { ...queryParams, currencyCode: currency, offset: 0, limit: ITEM_LIMIT },
      { signal: controller.signal },
    ).then((result) => {
      if (controller.signal.aborted || !result.data?.products) return;
      const nextOffset = result.data.nextOffset ?? null;
      dispatch({ type: "FETCH_SUCCESS", products: result.data.products, nextOffset, total: result.data.total, append: false });
      offsetRef.current = nextOffset ?? 0;
    });
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency]);

  // ── Infinite scroll ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (state.initialLoading || state.loading || state.nextOffset === null || state.done || state.error) return;
    if (state.products.length === 0) return;
    const triggerIndex = Math.max(0, state.products.length - ITEMS_BEFORE_END);
    const triggerEl = document.getElementById(`product-card-${state.products[triggerIndex]?.id}`);
    if (!triggerEl) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && state.nextOffset !== null && !isFetching.current) {
          fetchProducts(true);
        }
      },
      { rootMargin: "600px" },
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
        {state.products.map((product, index) => (
          <div key={product.id} id={`product-card-${product.id}`}>
            <ProductCard product={product} priority={index < 4} />
          </div>
        ))}
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
