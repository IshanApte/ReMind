# Backend Server Setup

The ReMind application now uses a separate backend server to handle the RAG system, avoiding Next.js bundling issues with native Node.js modules.

## Architecture

- **Frontend**: Next.js app (port 3000)
- **Backend**: Express server (port 3001) - handles RAG queries with `@xenova/transformers`

## Installation

1. Install the new dependencies:
```bash
npm install
```

This will install:
- `express` - Backend server framework
- `cors` - Cross-origin resource sharing
- `concurrently` - Run frontend and backend together
- Type definitions for Express and CORS

## Running the Application

### Option 1: Run Both Servers Together (Recommended)
```bash
npm run dev:all
```

This starts both the backend (port 3001) and frontend (port 3000) simultaneously.

### Option 2: Run Servers Separately

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## Environment Variables

Make sure your `.env` file contains:
```
GOOGLE_API_KEY=your_api_key_here
BACKEND_URL=http://localhost:3001  # Optional, defaults to localhost:3001
BACKEND_PORT=3001  # Optional, defaults to 3001
```

## Testing

1. Start the backend server: `npm run dev:backend`
2. Check health endpoint: `curl http://localhost:3001/health`
3. Start the frontend: `npm run dev`
4. Open `http://localhost:3000` in your browser

## Troubleshooting

- **"Backend server is not running"**: Make sure the backend server is started on port 3001
- **Port conflicts**: Change `BACKEND_PORT` in `.env` if port 3001 is in use
- **CORS errors**: The backend includes CORS middleware, but check if ports match

