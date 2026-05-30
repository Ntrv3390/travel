"use client";

import { useState } from "react";
import { ProductsFilters } from "@/components/products/ProductsFilters";
import { ProductsGrid } from "@/components/products/ProductsGrid";

export default function ProductsPage() {
  const [cityCode, setCityCode] = useState("");
  const [activeCityCode, setActiveCityCode] = useState("");

  const handleSearch = () => {
    if (cityCode.trim()) setActiveCityCode(cityCode.trim());
  };

  return (
    <main className="container py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
      </div>

      <ProductsFilters
        cityCode={cityCode}
        onCityCodeChange={setCityCode}
        onSearch={handleSearch}
      />

      {activeCityCode ? (
        <ProductsGrid queryParams={{ cityCode: activeCityCode }} />
      ) : (
        <div className="flex flex-col items-center gap-2 py-20 text-muted-foreground">
          <p className="text-lg font-medium">Enter a city code to browse products</p>
          <p className="text-sm">Try NEW_YORK, DUBAI, LONDON, PARIS, or TOKYO</p>
        </div>
      )}
    </main>
  );
}
