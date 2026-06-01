import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const query = url.searchParams.get("q") ?? ""
  const currencyCode = url.searchParams.get("currencyCode") ?? ""
  const backendURL = new URL(`${env.API_URL}/api/v1/search`)
  backendURL.searchParams.set("q", query)
  if (currencyCode) {
    backendURL.searchParams.set("currencyCode", currencyCode)
  }
  const res = await fetch(backendURL.toString(), { cache: "no-store" })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
