// This API route proxies queries to the backend server
// The backend server handles the RAG system with native Node.js modules (@xenova/transformers)
import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

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

    // Proxy the request to the backend server
    const response = await fetch(`${BACKEND_URL}/api/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Backend server error' }));
      return NextResponse.json(
        {
          error: 'Failed to process query',
          message: errorData.error || errorData.message || 'Backend server error'
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('❌ API Error:', error);
    
    // Check if backend server is reachable
    if (error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      return NextResponse.json(
        {
          error: 'Backend server is not running',
          message: 'Please ensure the backend server is running on port 3001'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Failed to process query',
        message: error.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}
