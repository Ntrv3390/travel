"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MaxWidthWrapper } from "@/components/ui/MaxWidthWrapper";
import { ProductDetail } from "@/components/products/ProductDetail";
import { getProductById } from "@/lib/api";
import { useCurrency } from "@/hooks/useCurrency";
import type { Product } from "@/types/product";

export function ProductDetailClient() {
  const params = useParams();
  const slug = params?.slug as string;
  const id = slug?.split("-").pop() ?? "";
  const { currency } = useCurrency();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    const result = await getProductById(id, { currencyCode: currency });
    if (result.error) {
      setError(result.error);
    } else if (result.data) {
      setProduct(result.data);
    } else {
      setError("Product not found");
    }
    setLoading(false);
  }, [id, currency]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  if (loading) {
    return (
      <main className="min-h-screen overflow-hidden">
        <MaxWidthWrapper className="py-4 sm:py-6 lg:py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-6 w-32 rounded-full bg-muted sm:w-40" />
            {/* Hero skeleton */}
            <div className="grid gap-6 overflow-hidden lg:grid-cols-[minmax(0,1.8fr)_minmax(360px,0.9fr)]">
              <div className="min-w-0">
                <div className="h-[260px] rounded-2xl bg-muted lg:h-[420px]" />
              </div>
              <div className="space-y-3">
                <div className="h-5 w-3/4 rounded-lg bg-muted" />
                <div className="h-3.5 w-1/2 rounded bg-muted" />
                <div className="h-3.5 w-2/3 rounded bg-muted" />
                <div className="mt-4 h-20 rounded-2xl bg-muted" />
              </div>
            </div>
            {/* Thumbnail skeleton */}
            <div className="hidden gap-3 lg:grid lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-muted" />
              ))}
            </div>
            {/* Content skeleton */}
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 rounded-2xl bg-muted" />
              ))}
            </div>
          </div>
        </MaxWidthWrapper>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen overflow-hidden">
        <MaxWidthWrapper className="py-4 sm:py-6 lg:py-8">
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="glass-strong rounded-2xl p-6 text-center sm:p-8">
              <p className="text-base font-medium text-red-500 sm:text-lg">
                {error}
              </p>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Product ID: {id}
              </p>
              <div className="mt-4 flex gap-3 sm:mt-6">
                <Button
                  variant="outline"
                  onClick={fetchProduct}
                  disabled={loading}
                  className="rounded-xl"
                >
                  <Loader2
                    className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`}
                  />
                  Retry
                </Button>
                <Button
                  variant="ghost"
                  asChild
                  className="rounded-xl"
                >
                  <Link
                    href="/products"
                    className="inline-flex items-center gap-2 whitespace-nowrap"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0" />
                    <span>Back to Products</span>
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </MaxWidthWrapper>
      </main>
    );
  }

  if (!product) return null;

  return (
    <main className="min-h-screen">
      <MaxWidthWrapper className="pt-2 pb-32 sm:pt-3 sm:pb-32 lg:pt-5 lg:pb-12">
        <div className="mb-5 lg:mb-6">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="w-fit rounded-xl text-muted-foreground hover:text-foreground"
          >
            <Link
              href="/products"
              className="inline-flex items-center gap-2 whitespace-nowrap"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              <span>Back</span>
            </Link>
          </Button>
        </div>
        <ProductDetail product={product} />
      </MaxWidthWrapper>
    </main>
  );
}
