import { NextResponse } from "next/server"
import { env } from "@/lib/env"

export async function GET() {
  const res = await fetch(`${env.API_URL}/api/v1/currencies`, {
    next: { revalidate: 86400 },
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
