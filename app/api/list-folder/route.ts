// app/api/list-folder/route.ts
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getFirstSeen, getSummary } from '@/lib/db';

const ROOT_FOLDER = process.env.ROOT_FOLDER || './folders';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const folderPath = searchParams.get('path') || '';

  try {
    const fullPath = path.join(ROOT_FOLDER, folderPath);
    const items = await fs.readdir(fullPath, { withFileTypes: true });
    
    const contents = await Promise.all(items.map(async (item) => {
      const itemPath = path.join(fullPath, item.name);
      const firstSeen = item.isDirectory() ? getFirstSeen(itemPath) : null;
      const hasSummary = !item.isDirectory() && getSummary(itemPath) !== null;
      
      return {
        name: item.name,
        isDirectory: item.isDirectory(),
        firstSeen,
        hasSummary,
        hasProposedName: false // Implement this when you add proposed name functionality
      };
    }));

    return NextResponse.json(contents);
  } catch (error) {
    console.error(`Error listing folder ${folderPath}:`, error);
    return NextResponse.json({ error: 'Failed to list folder contents' }, { status: 500 });
  }
}