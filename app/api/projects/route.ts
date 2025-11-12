// app/api/projects/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getProjects } from "@/lib/projectsDB";

export async function GET(req: NextRequest) {
  try {
    const projects = getProjects();
    return NextResponse.json(projects);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}
