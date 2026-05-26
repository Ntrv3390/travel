import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const variantId = req.nextUrl.searchParams.get("variantId");
  const headoutId = req.nextUrl.searchParams.get("headoutId");
  const days = req.nextUrl.searchParams.get("days") ?? "42";
  const startDate = req.nextUrl.searchParams.get("startDate") ?? "";

  if (!variantId && !headoutId) {
    return NextResponse.json({ error: "variantId or headoutId is required" }, { status: 400 });
  }

  try {
    const upstream = new URL(`${env.API_URL}/api/v1/booking-flow/calendar`);
    if (variantId) {
      upstream.searchParams.set("variantId", variantId);
    }
    if (headoutId) {
      upstream.searchParams.set("headoutId", headoutId);
    }
    if (startDate) {
      upstream.searchParams.set("startDate", startDate);
    }
    upstream.searchParams.set("days", days);

    const response = await fetch(upstream.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const payload = await response.json().catch(() => ({}));
    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch calendar availability",
      },
      { status: 500 },
    );
  }
}
