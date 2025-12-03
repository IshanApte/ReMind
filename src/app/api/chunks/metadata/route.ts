// This API route loads chunks metadata directly from the file system
import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

// Cache metadata in memory (resets on cold start)
let chunksMetadata: any[] | null = null;

const loadChunksMetadata = () => {
  if (chunksMetadata) return chunksMetadata;
  
  try {
    const metadataPath = path.join(process.cwd(), 'data', 'chunks_metadata.json');
    if (fs.existsSync(metadataPath)) {
      const fileContents = fs.readFileSync(metadataPath, 'utf-8');
      chunksMetadata = JSON.parse(fileContents);
      return chunksMetadata;
    }
    
    // Fallback: extract metadata from full chunks file
    const chunksPath = path.join(process.cwd(), 'data', 'chunks_embeddings.json');
    if (fs.existsSync(chunksPath)) {
      const fileContents = fs.readFileSync(chunksPath, 'utf-8');
      const chunks = JSON.parse(fileContents);
      chunksMetadata = chunks.map((c: any) => ({
        id: c.id,
        start_line: c.start_line,
        end_line: c.end_line
      }));
      return chunksMetadata;
    }
  } catch (error) {
    console.error('Failed to load chunks metadata:', error);
  }
  
  return [];
};

export async function GET(request: NextRequest) {
  try {
    const metadata = loadChunksMetadata();
    
    // Calculate total lines (handle null/empty case)
    const totalLines = metadata && metadata.length > 0 
      ? Math.max(...metadata.map((c: any) => c.end_line || 0))
      : 0;
    
    return NextResponse.json({
      chunks: metadata || [],
      totalChunks: metadata?.length || 0,
      totalLines
    });
  } catch (error: any) {
    console.error('Error loading chunks metadata:', error);
    return NextResponse.json(
      { error: 'Failed to load chunks metadata' },
      { status: 500 }
    );
  }
}
