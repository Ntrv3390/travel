import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const backendURL = new URL(`${env.API_URL}/api/v1/search`)

  // Forward all supported query params to the backend.
  for (const key of ["q", "currencyCode", "offset", "limit"]) {
    const val = url.searchParams.get(key)
    if (val !== null && val !== "") backendURL.searchParams.set(key, val)
  }

  const res = await fetch(backendURL.toString(), { cache: "no-store" })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
