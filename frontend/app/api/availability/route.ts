import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const date = searchParams.get("date");

  if (!id || !date) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const response = await fetch(
    `${env.API_URL}/api/v1/experiences/${id}/availability?date=${encodeURIComponent(date)}`,
    { cache: "no-store" },
  );

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
