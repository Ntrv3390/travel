import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function DELETE(req: NextRequest, { params }: { params: { itemId: string } }) {
  const sessionId = req.headers.get("X-Session-ID") ?? ""
  const res = await fetch(`${env.API_URL}/api/v1/cart/items/${encodeURIComponent(params.itemId)}`, {
    method: "DELETE",
    headers: { "X-Session-ID": sessionId },
    cache: "no-store",
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
