import { NextResponse } from 'next/server';
import { getSummary } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Extract the `path` parameter from the query string
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json({ error: 'Path query parameter is required' }, { status: 400 });
    }

    // Fetch summary from the database
    const summary = await getSummary(path);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Error retrieving summary:', error);
    return NextResponse.json({ error: 'Failed to get summary' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { path } = await request.json();

    // Fetch summary from the database
    const summary = await getSummary(path);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Error retrieving summary:', error);
    return NextResponse.json({ error: 'Failed to get summary' }, { status: 500 });
  }
}