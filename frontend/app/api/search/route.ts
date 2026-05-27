import { NextRequest, NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const backendURL = `${env.API_URL}/api/v1/experiences/search?${url.searchParams.toString()}`
  const res = await fetch(backendURL, { cache: "no-store" })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
