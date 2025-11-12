import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const ROOT_FOLDER = process.env.ROOT_FOLDER || '../vDaten/active';
const EXTERNAL_DATA_PATH = path.resolve(process.cwd(), ROOT_FOLDER);

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get('path');

  if (!filePath) {
    console.log('Invalid file path requested');
    return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
  }

  // Construct the full path using the external data directory
  const fullPath = path.join(EXTERNAL_DATA_PATH, filePath);

  // Debug logging
  console.log('Image request details:');
  console.log('Requested path:', filePath);
  console.log('Full resolved path:', fullPath);

  // Ensure the resolved path is within the allowed directory
  if (!fullPath.startsWith(EXTERNAL_DATA_PATH)) {
    console.log('Access denied: Path is outside of allowed directory');
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    // Check if file exists before attempting to read
    await fs.access(fullPath);
    console.log('File exists:', fullPath);

    const fileContent = await fs.readFile(fullPath);
    const contentType = path.extname(fullPath).toLowerCase() === '.webp' ? 'image/webp' : 
                        path.extname(fullPath).toLowerCase() === '.png' ? 'image/png' :
                        'image/jpeg';
    
    console.log('Successfully read file:', fullPath);
    console.log('Content-Type:', contentType);

    return new NextResponse(fileContent, {
      headers: { 'Content-Type': contentType }
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.error('File not found:', fullPath);
    } else {
      console.error('Error reading file:', fullPath, error);
    }
    return NextResponse.json({ 
      error: 'File not found or unable to read',
      details: error instanceof Error ? error.message : String(error),
      requestedPath: filePath,
      fullPath: fullPath
    }, { status: 404 });
  }
}