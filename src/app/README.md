# ReMind App Setup Guide

This directory contains the Next.js frontend application for ReMind - an AI system with human-like memory dynamics.

## Overview

The ReMind app consists of:
- **Frontend**: Next.js React application (port 3000)
- **Backend API Routes**: Next.js API routes that proxy to the backend server
- **Components**: React components including the BookHeatmap visualization

## Prerequisites

Before setting up the app, ensure you have:

1. **Node.js** (v18+ recommended)
   ```bash
   node --version
   ```

2. **npm** or **yarn** package manager
   ```bash
   npm --version
   ```

3. **Google AI Studio API Key**
   - Get one at [Google AI Studio](https://aistudio.google.com/app/apikey)

4. **Data Files** (must exist in the project root):
   - `data/chunks_embeddings.json` - Generated chunks with embeddings
   - `data/chunks_metadata.json` - Chunk position metadata (auto-generated)

## Installation

### 1. Install Dependencies

From the project root directory:

```bash
npm install
```

This installs all required dependencies including:
- Next.js framework
- React and React DOM
- Express (for backend server)
- LangChain and Google GenAI
- Transformers.js
- Tailwind CSS
- And other dependencies

### 2. Environment Variables

Create a `.env` file in the project root (if it doesn't exist):

```bash
# Required: Google AI API Key for LLM responses
GOOGLE_API_KEY=your_google_api_key_here

# Optional: Backend server configuration
BACKEND_URL=http://localhost:3001
BACKEND_PORT=3001
```

**Important**: Replace `your_google_api_key_here` with your actual Google AI Studio API key.

### 3. Verify Data Files

Ensure the following files exist in the `data/` directory:

- `chunks_embeddings.json` - Contains chunked textbook data with embeddings
- `chunks_metadata.json` - Contains chunk position metadata (auto-generated)

If these files don't exist, you need to:
1. Generate chunks from the textbook (see main README.md)
2. The metadata file is automatically created when the backend server starts

## Running the Application

### Option 1: Run Everything Together (Recommended)

This starts both the backend server (port 3001) and frontend (port 3000) simultaneously:

```bash
npm run dev:all
```

Then open your browser to: `http://localhost:3000`

### Option 2: Run Servers Separately

**Terminal 1 - Start Backend Server:**
```bash
npm run dev:backend
```

You should see:
```
🚀 ReMind Backend Server running on http://localhost:3001
```

**Terminal 2 - Start Frontend Server:**
```bash
npm run dev
```

You should see:
```
  ▲ Next.js 14.x.x
  - Local:        http://localhost:3000
```

Then open `http://localhost:3000` in your browser.

## Project Structure

```
src/app/
├── api/
│   ├── chunks/
│   │   └── metadata/
│   │       └── route.ts          # API route for chunk metadata
│   └── query/
│       └── route.ts              # API route for querying (proxies to backend)
├── components/
│   └── BookHeatmap.tsx           # Book usage heatmap visualization
├── globals.css                   # Global styles
├── layout.tsx                    # Root layout component
└── page.tsx                      # Main chat interface page
```

## Key Features

### Chat Interface
- Ask questions about the biology textbook
- View AI responses with source citations
- Click on messages to view retrieved source chunks

### Book Usage Heatmap
- Visual representation of which parts of the book are being accessed
- Color-coded intensity showing chunk usage frequency
- Updates in real-time as you ask questions

### Source Chunks View
- View retrieved chunks with metadata
- See similarity scores, final scores, and recency scores
- Organized by chapters and sections

## Available Scripts

From the project root:

- `npm run dev` - Start Next.js development server (frontend only)
- `npm run dev:backend` - Start Express backend server
- `npm run dev:all` - Start both servers concurrently
- `npm run build` - Build the Next.js app for production
- `npm run start` - Start the production Next.js server
- `npm run start:backend` - Start the production backend server

## Troubleshooting

### Backend Server Not Running

**Error**: "Backend server is not running"

**Solution**: 
1. Check if the backend server is running on port 3001:
   ```bash
   curl http://localhost:3001/health
   ```
2. Start the backend server:
   ```bash
   npm run dev:backend
   ```
3. Or run both servers together:
   ```bash
   npm run dev:all
   ```

### Port Already in Use

**Error**: Port 3000 or 3001 is already in use

**Solution**:
1. Find the process using the port:
   ```bash
   lsof -i :3000  # or :3001
   ```
2. Kill the process or change the port in your `.env` file

### Missing API Key

**Error**: LLM responses fail or return errors

**Solution**:
1. Verify your `.env` file exists in the project root
2. Check that `GOOGLE_API_KEY` is set correctly
3. Restart the backend server after adding/changing the API key

### Missing Data Files

**Error**: "Failed to load memory bank" or chunks not loading

**Solution**:
1. Ensure `data/chunks_embeddings.json` exists
2. If missing, run the chunking script (see main README.md)
3. The metadata file (`chunks_metadata.json`) is auto-generated, but if missing, the backend will try to create it

### CORS Errors

**Error**: CORS policy blocking requests

**Solution**:
1. Ensure the backend server includes CORS middleware (it should by default)
2. Verify `BACKEND_URL` in `.env` matches where the backend is actually running
3. Check that both servers are running on the expected ports

## Development Notes

- The frontend uses **Next.js 14** with the App Router
- Styling is done with **Tailwind CSS**
- The app uses React Server Components where possible
- API routes proxy requests to the Express backend server
- The BookHeatmap component uses client-side rendering (`'use client'`)

## Next Steps

1. Start the application: `npm run dev:all`
2. Open `http://localhost:3000`
3. Ask questions about the biology textbook
4. Watch the heatmap update as you interact with the system!

For more information about the overall project structure, see the main [README.md](../../README.md) in the project root.

