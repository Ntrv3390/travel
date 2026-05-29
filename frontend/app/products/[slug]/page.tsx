"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductDetail } from "@/components/products/ProductDetail";
import { getProductById } from "@/lib/api";
import { useCurrency } from "@/hooks/useCurrency";
import type { Product } from "@/types/product";

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const id = slug?.split("-").pop() ?? "";
  const { currency } = useCurrency();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = async () => {
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
  };

  useEffect(() => {
    fetchProduct();
  }, [id, currency]);

  if (loading) {
    return (
      <main className="container py-8">
        <div className="mx-auto max-w-5xl">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded bg-muted" />
            <div className="grid gap-6 md:grid-cols-2">
              <div className="aspect-[4/3] rounded-xl bg-muted" />
              <div className="space-y-4">
                <div className="h-8 w-3/4 rounded bg-muted" />
                <div className="h-4 w-1/2 rounded bg-muted" />
                <div className="h-20 w-full rounded-lg bg-muted" />
                <div className="h-10 w-1/3 rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="container py-8">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-4 py-20">
            <p className="text-lg font-medium text-red-500">{error}</p>
            <p className="text-sm text-muted-foreground">Product ID: {id}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={fetchProduct} disabled={loading}>
                <Loader2 className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Retry
              </Button>
              <Button variant="ghost" asChild>
                <Link href="/products">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Products
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!product) return null;

  return (
    <main className="container py-8">
      <div className="mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/products">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Products
          </Link>
        </Button>
      </div>
      <ProductDetail product={product} />
    </main>
  );
}
