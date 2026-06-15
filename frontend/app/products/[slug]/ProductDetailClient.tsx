"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { MaxWidthWrapper } from "@/components/ui/MaxWidthWrapper";
import { ProductDetail } from "@/components/products/ProductDetail";
import { getProductById } from "@/lib/api";
import { useCurrency } from "@/hooks/useCurrency";
import { useTrackRecentlyViewed } from "@/hooks/useRecentlyViewed";
import type { Product } from "@/types/product";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProductDetailClientProps {
  initialProduct: Product;
}

export function ProductDetailClient({ initialProduct }: ProductDetailClientProps) {
  const params = useParams();
  const slug = params?.slug as string;
  const id = slug?.split("-").pop() ?? "";
  const { currency } = useCurrency();
  const [product, setProduct] = useState<Product>(initialProduct);
  const { track } = useTrackRecentlyViewed();
  const isFirstCurrencyRender = useRef(true);

  // Track product view once on mount
  useEffect(() => {
    const p = initialProduct;
    track({
      headoutId: p.id,
      title: p.name || p.title || "",
      imageUrl: p.media?.[0]?.url || p.imageUrl || "",
      price: p.listingPrice?.minimumPrice?.finalPrice || p.fromPrice || 0,
      currency: p.listingPrice?.currencyCode || p.currency?.code || "USD",
      rating: p.reviewsSummary?.averageRating || 0,
      reviewCount: p.reviewsSummary?.ratingsCount || 0,
      city: p.city?.name || p.cityName || "",
      category: p.primaryCategory?.name || "",
      slug: (p.title || p.name || "").toLowerCase().replace(/\s+/g, "-"),
      duration: "",
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silent re-fetch when currency changes to update prices
  useEffect(() => {
    if (isFirstCurrencyRender.current) {
      isFirstCurrencyRender.current = false;
      return;
    }
    if (!id) return;
    getProductById(id, { currencyCode: currency }).then((result) => {
      if (result.data) setProduct(result.data);
    });
  }, [currency, id]);

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
