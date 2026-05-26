import { NextResponse } from "next/server";
import { getSingleExperiencePayload } from "@/lib/experience/singleExperience";

export async function GET() {
  try {
    const payload = await getSingleExperiencePayload();
    return NextResponse.json({ data: payload }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch single experience payload",
      },
      { status: 500 },
    );
  }
}
