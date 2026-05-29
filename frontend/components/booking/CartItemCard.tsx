"use client"

import Image from "next/image"
import Link from "next/link"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { PriceDisplay } from "@/components/common/PriceDisplay"
import { useCart } from "@/hooks/useCart"
import type { CartItem } from "@/types/booking"


export function CartItemCard({ item }: { item: CartItem }) {
  const { removeItem } = useCart()

  return (
    <Card>
      <CardContent className="flex items-start gap-4 p-4">
        <div className="relative h-20 w-20 flex-none overflow-hidden rounded-lg">
          {item.imageUrl ? (
            <Image
              src={item.imageUrl}
              alt={item.title || "Experience"}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-muted text-muted-foreground text-xs">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            href={item.experienceId ? `/products?cityCode=${item.experienceId}` : "#"}
            className="font-semibold hover:text-brand-600 transition-colors line-clamp-1"
          >
            {item.title || "Experience"}
          </Link>
          <p className="text-sm text-muted-foreground">
            {item.date}{item.startDateTime ? ` · ${item.startDateTime.split("T")[1]?.slice(0, 5)}` : ""}
          </p>
          <p className="text-sm text-muted-foreground">
            {item.adults > 0 && `${item.adults} adult${item.adults > 1 ? "s" : ""}`}
            {item.children > 0 && `, ${item.children} child${item.children > 1 ? "ren" : ""}`}
          </p>
          <p className="mt-1 font-semibold">
            <PriceDisplay amount={item.priceAmount} currency={item.currency} />
          </p>
        </div>
        <div className="flex-none">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-red-600"
            onClick={() => removeItem(item.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
