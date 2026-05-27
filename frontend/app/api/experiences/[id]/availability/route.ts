import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const variantId = searchParams.get("variantId")
  const date = searchParams.get("date")
  const currency = searchParams.get("currency") ?? "USD"

  if (!variantId || !date) {
    return NextResponse.json({ error: "Missing variantId or date" }, { status: 400 })
  }

  const res = await fetch(
    `${env.API_URL}/api/v1/experiences-availability/${encodeURIComponent(params.id)}?variantId=${encodeURIComponent(variantId)}&date=${encodeURIComponent(date)}&currencyCode=${currency}`,
    { cache: "no-store" },
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
