import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const backendURL = `${env.API_URL}/api/v1/experiences?${url.searchParams.toString()}`;

  const response = await fetch(backendURL, { cache: "no-store" });
  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
