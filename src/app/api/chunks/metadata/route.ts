import { NextRequest, NextResponse } from 'next/server';

// Backend server URL (runs on separate port)
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    // Proxy request to backend server
    const response = await fetch(`${BACKEND_URL}/api/chunks/metadata`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Backend server error' }));
      return NextResponse.json(
        { error: errorData.error || 'Failed to load chunks metadata' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('API Error:', error);
    
    // Check if backend is not running
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
        error: 'Failed to load chunks metadata',
        message: error.message || error.cause?.message || 'Unknown error'
      },
      { status: 500 }
    );
  }
}

