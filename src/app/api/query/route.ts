import { NextRequest, NextResponse } from 'next/server';

// Backend server URL (runs on separate port)
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

    // Proxy request to backend server
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
        { error: errorData.error || 'Failed to process query' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Error:', error);
    
    // Check if backend is not running (error can be nested in cause for fetch errors)
    const errorCode = error.code || error.cause?.code || error.cause?.errors?.[0]?.code;
    if (errorCode === 'ECONNREFUSED') {
      return NextResponse.json(
        {
          error: 'Backend server is not running',
          message: 'Please start the backend server with: npm run dev:backend or npm run dev:all'
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Failed to process query',
        message: error.message || error.cause?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

