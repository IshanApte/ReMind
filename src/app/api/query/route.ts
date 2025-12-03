import { NextRequest, NextResponse } from 'next/server';
// Import logic directly instead of fetching from localhost:3001
// We use relative paths to ensure it works even if path aliases (@/) aren't perfect
import { askVestige } from '../../../server/langchain/rag';
import { reinforceMany } from '../../../server/retrieval/retrieval';

// NOTE: In a serverless environment (Vercel), this variable will reset
// frequently. For a portfolio demo, this is acceptable. For production,
// you would store 'currentTurn' in a database (Postgres/Redis) associated with a sessionId.
let currentTurn = 1;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query } = body;

    if (!query) {
      return NextResponse.json({ 
        error: 'Query is required',
        portfolio: 'Input validation enabled'
      }, { status: 400 });
    }

    console.log(`\n📥 [Serverless RAG] Query: "${query}" (Turn ${currentTurn})`);

    // 1. Call the RAG system directly (No HTTP fetch needed)
    const result = await askVestige(query, currentTurn);

    // 2. Reinforce memories
    if (result.sources && result.sources.length > 0) {
      // We don't await this to keep response fast (fire and forget)
      reinforceMany(
        result.sources.map((s: any) => s.id),
        currentTurn
      );
    }

    // 3. Construct the response matching the format your frontend expects
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
      turn: currentTurn,
      portfolio: {
        note: 'This demonstrates Serverless RAG with temporal memory decay',
        features: ['Semantic chunking', 'Vector embeddings', 'Confidence scoring', 'Anti-hallucination measures']
      }
    };

    // Increment turn (locally)
    currentTurn++;

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ API Route Error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process query',
        message: 'The serverless function encountered an error.',
        details: error.message 
      },
      { status: 500 }
    );
  }
}