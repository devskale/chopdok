// app/api/ausschreibungen/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getAusschreibungen } from '@/lib/projectsDb';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get('projectId');

  try {
    const ausschreibungen = getAusschreibungen(projectId as string);
    return NextResponse.json(ausschreibungen);
  } catch (error) {
    console.error("Error fetching ausschreibungen:", error);
    return NextResponse.json({ error: 'Failed to fetch ausschreibungen' }, { status: 500 });
  }
}