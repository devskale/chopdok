import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { insertOrUpdateSummary } from '@/lib/db';
import { writeFile } from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

export const runtime = 'nodejs'; // or 'edge' depending on your needs

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const modelProvider = formData.get('modelProvider') as string;
    const modelOption = formData.get('modelOption') as string;
    const promptTemplate = formData.get('promptTemplate') as string;

    if (!file || !modelProvider || !modelOption || !promptTemplate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Save the file temporarily
    const buffer = Buffer.from(await file.arrayBuffer());
    const tempFilePath = path.join('/tmp', file.name);
    await writeFile(tempFilePath, buffer);

    let summary: string;

    if (modelProvider === 'Ollama') {
      // For Ollama, we'll use the local API
      const ollamaUrl = process.env.NEXT_PUBLIC_OLLAMA_URL || "http://localhost:11434";
      const fileContent = buffer.toString('utf-8');
      const ollamaResponse = await fetch(`${ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelOption,
          prompt: `${promptTemplate}\n\n${fileContent}`,
        }),
      });

      if (!ollamaResponse.ok) {
        throw new Error('Failed to summarize with Ollama');
      }

      const reader = ollamaResponse.body?.getReader();
      summary = '';
      
      while (true) {
        const { done, value } = await reader?.read();
        if (done) break;
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.trim() !== '') {
            try {
              const parsed = JSON.parse(line);
              summary += parsed.response;
            } catch (e) {
              console.error('Error parsing JSON:', e);
            }
          }
        }
      }
    } else {
      // For other providers, we'll use the Python script
      const { stdout } = await execAsync(`python scripts/summarize.py "${tempFilePath}" "${modelProvider}" "${modelOption}" "${promptTemplate}"`);
      summary = stdout.trim();
    }

    // Store summary in database
    await insertOrUpdateSummary(file.name, summary);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    console.error('Error summarizing document:', error);
    return NextResponse.json({ error: 'Failed to summarize document' }, { status: 500 });
  }
}