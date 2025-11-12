// app/api/summarize/route.ts
import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { insertOrUpdateSummary } from '@/lib/db';

const execAsync = promisify(exec);

export async function POST(request: Request) {
  const { path } = await request.json();

  try {
    // Execute Python script
    const { stdout } = await execAsync(`python scripts/summarize.py "${path}"`);
    const summary = stdout.trim();

    // Store summary in database
    insertOrUpdateSummary(path, summary);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Error summarizing document:', error);
    return NextResponse.json({ error: 'Failed to summarize document' }, { status: 500 });
  }
}