import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function POST(req: NextRequest) {
  const sessionId = req.headers.get("X-Session-ID") ?? ""
  const body = await req.json()
  const res = await fetch(`${env.API_URL}/api/v1/cart/checkout`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
