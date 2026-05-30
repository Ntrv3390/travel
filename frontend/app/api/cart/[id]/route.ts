import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = req.headers.get("X-Session-ID") ?? ""
  const body = await req.json()
  const res = await fetch(`${env.API_URL}/api/v1/cart/items/${encodeURIComponent(params.id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", "X-Session-ID": sessionId },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const sessionId = req.headers.get("X-Session-ID") ?? ""
  const res = await fetch(`${env.API_URL}/api/v1/cart/items/${encodeURIComponent(params.id)}`, {
    method: "DELETE",
    headers: { "X-Session-ID": sessionId },
    cache: "no-store",
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
