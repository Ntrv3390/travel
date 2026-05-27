import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { searchParams } = new URL(req.url)
  const months = searchParams.get("months") ?? "2"
  const currency = searchParams.get("currency") ?? "USD"

  const res = await fetch(
    `${env.API_URL}/api/v1/experiences/${encodeURIComponent(params.id)}/calendar?months=${months}&currencyCode=${currency}`,
    { cache: "no-store" },
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
