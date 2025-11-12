// app/api/angebote/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAngebote } from "@/lib/projectsDB";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");

  try {
    const angebote = getAngebote(projectId as string);
    return NextResponse.json(angebote);
  } catch (error) {
    console.error("Error fetching angebote:", error);
    return NextResponse.json(
      { error: "Failed to fetch angebote" },
      { status: 500 }
    );
  }
}
