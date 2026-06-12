import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const res = await fetch(`${env.API_URL}/api/v1/bookings/${encodeURIComponent(params.id)}`, {
    cache: "no-store",
  });
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
