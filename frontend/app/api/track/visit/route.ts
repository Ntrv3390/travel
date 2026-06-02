import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const realIP =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const backendURL = process.env.API_URL || "http://api-gateway:8080";
    const res = await fetch(`${backendURL}/api/v1/track/visit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Real-IP": realIP,
        "X-Forwarded-For": realIP,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ status: "ok" });
  }
}
