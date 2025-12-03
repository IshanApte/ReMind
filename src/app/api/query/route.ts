// This API route processes queries directly using the RAG system
import { NextRequest, NextResponse } from 'next/server';
import { askVestige } from '@/server/langchain/rag';
import { reinforceMany } from '@/server/retrieval/retrieval';

// Track conversation turns (in-memory, resets on cold start)
// For production, consider using Vercel KV for persistence
let currentTurn = 1;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    console.log(`\n📥 Query: "${query}" (Turn ${currentTurn})`);

    // Call the RAG system directly
    const result = await askVestige(query, currentTurn);

    // Reinforce the memories that were used
    if (result.sources && result.sources.length > 0) {
      reinforceMany(
        result.sources.map((s: any) => s.id),
        currentTurn
      );
    }

    // Build response with truncated sources
    const response = {
      answer: result.answer,
      confidence: result.confidence,
      sources: result.sources.map((s: any) => ({
        id: s.id,
        text: s.text.substring(0, 200) + (s.text.length > 200 ? '...' : ''),
        heading: s.heading,
        chapter: s.chapter,
        section: s.section,
        similarity: s.similarity,
        finalScore: s.finalScore,
        recencyScore: s.recencyScore,
        start_line: s.start_line,
        end_line: s.end_line
      })),
      turn: currentTurn
    };

    // Increment turn counter
    currentTurn += 1;

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('❌ API Error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process query',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
