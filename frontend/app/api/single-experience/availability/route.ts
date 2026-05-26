import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const variantId = req.nextUrl.searchParams.get("variantId");
  const date = req.nextUrl.searchParams.get("date");

  if (!variantId || !date) {
    return NextResponse.json({ error: "variantId and date are required" }, { status: 400 });
  }

  try {
    const startDateTime = `${date}T00:00:00`;
    const endDateTime = `${date}T23:59:59`;

    const upstream = new URL(`${env.API_URL}/api/v1/headout/v1/inventory/list-by/variant`);
    upstream.searchParams.set("variantId", variantId);
    upstream.searchParams.set("startDateTime", startDateTime);
    upstream.searchParams.set("endDateTime", endDateTime);

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
        error: error instanceof Error ? error.message : "Failed to fetch availability",
      },
      { status: 500 },
    );
  }
}
