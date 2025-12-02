# ReMind

A web application that implements human-like memory dynamics for AI systems. ReMind stores text in semantic chunks, applies temporal decay, and reinforces frequently accessed information, enabling more natural and context-aware recall behavior.

## Overview

ReMind is a **Beyond RAG** system that goes beyond traditional retrieval-augmented generation by:

- **Dynamic Memory**: Tracks what you've explored and adapts to topic flow
- **Temporal Decay**: Recently accessed information is prioritized, mimicking human memory
- **Memory Reinforcement**: Frequently accessed chunks get boosted in future retrievals
- **Confidence Scoring**: Measures answer groundedness to reduce hallucination risk
- **Visual Feedback**: Interactive heatmap shows which parts of the book are being accessed

## Prerequisites

Before you begin, ensure you have:

1. **Node.js** (v18+ recommended)
   ```bash
   node --version
   ```

2. **Python** (3.8+ for preprocessing)
   ```bash
   python3 --version
   ```

3. **npm** or **yarn** package manager
   ```bash
   npm --version
   ```

4. **Google AI Studio API Key**
   - Get one at [Google AI Studio](https://aistudio.google.com/app/apikey)

## Installation

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd ReMind
npm install
```

### 2. Set Up Python Environment (for preprocessing)

```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

pip install --upgrade pip
pip install sentence-transformers  # Optional, for embeddings
```

### 3. Environment Variables

Create a `.env` file in the project root:

```bash
# Required: Google AI API Key for LLM responses
GOOGLE_API_KEY=your_google_api_key_here

# Optional: Backend server configuration
BACKEND_URL=http://localhost:3001
BACKEND_PORT=3001
```

**Important**: Replace `your_google_api_key_here` with your actual Google AI Studio API key.

### 4. Generate Chunks and Embeddings

The application requires preprocessed chunks from your source text. Run the chunking script:

**With embeddings (recommended):**
```bash
python src/server/retrieval/chunk_textbook.py \
  --input data/Biology_Textbook.txt \
  --output data/chunks_embeddings.json
```

**Without embeddings (faster, for testing):**
```bash
python src/server/retrieval/chunk_textbook.py \
  --input data/Biology_Textbook.txt \
  --output data/chunks_embeddings.json \
  --no-embeddings
```

**Chunking Options:**
- `--min-words`: Minimum words per chunk before merging (default: 150)
- `--max-words`: Maximum words per chunk before splitting (default: 700)
- `--model`: SentenceTransformer model (default: `all-MiniLM-L6-v2`)
- `--batch-size`: Batch size for encoding embeddings (default: 64)

**Example with custom sizes:**
```bash
python src/server/retrieval/chunk_textbook.py \
  --input data/Biology_Textbook.txt \
  --output data/chunks_embeddings_custom.json \
  --min-words 200 \
  --max-words 800
```

## Running the Application

### Option 1: Run Everything Together (Recommended)

This starts both the backend server (port 3001) and frontend (port 3000) simultaneously:

```bash
npm run dev:all
```

Then open your browser to: `http://localhost:3000`

### Option 2: Run Servers Separately

**Terminal 1 - Backend Server:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

The backend runs on `http://localhost:3001` and the frontend on `http://localhost:3000`.

## Features

### Frontend Features

- **Interactive Chat Interface**: Ask questions about the textbook and get AI-powered responses
- **Onboarding Screen**: Guided tour that appears on every new session
- **Book Usage Heatmap**: Visual representation of which parts of the book are being accessed
- **Source Chunks View**: View retrieved chunks with similarity scores, final scores, and recency (decay) scores
- **Confidence Scoring**: Each answer includes a confidence score (0-100) indicating groundedness
- **Message Selection**: Click on messages to view their source chunks and metadata

### Backend Features

- **Hybrid Retrieval**: Combines semantic similarity (60%) with temporal decay (40%)
- **Adaptive Chunk Selection**: Uses high-scoring chunks when available, falls back to top 5
- **Memory Reinforcement**: Frequently accessed chunks get boosted in future retrievals
- **Confidence Calculation**: Multi-factor scoring (groundedness, keyword overlap, context quality)

## Project Structure

```
ReMind/
├── data/
│   ├── Biology_Textbook.txt          # Source textbook
│   ├── chunks_embeddings.json         # Generated chunks with embeddings
│   └── chunks_metadata.json           # Chunk position metadata (auto-generated)
│
├── src/
│   ├── app/                           # Next.js frontend application
│   │   ├── api/
│   │   │   ├── chunks/metadata/
│   │   │   │   └── route.ts          # API route for chunk metadata
│   │   │   └── query/
│   │   │       └── route.ts          # API route for querying (proxies to backend)
│   │   ├── components/
│   │   │   ├── BookHeatmap.tsx        # Book usage heatmap visualization
│   │   │   └── Onboarding.tsx         # Onboarding modal component
│   │   ├── page.tsx                   # Main chat interface page
│   │   ├── layout.tsx                 # Root layout component
│   │   └── globals.css                # Global styles
│   │
│   └── server/                        # Express backend server
│       ├── index.ts                   # Backend server entry point
│       ├── langchain/
│       │   ├── model.ts               # Gemini LLM client configuration
│       │   └── rag.ts                 # RAG pipeline with confidence scoring
│       └── retrieval/
│           ├── chunk_textbook.py      # Offline script to create chunks
│           ├── embeddings.ts          # Embedding helpers (normalization, cosine similarity)
│           ├── decay.ts               # Temporal decay and reinforcement scoring
│           └── retrieval.ts          # Hybrid retrieval (semantic + decay)
│
├── .env                               # Environment variables (create this)
├── package.json                       # Node.js dependencies
├── pyproject.toml                     # Python dependencies
└── README.md                          # This file
```

## RAG Pipeline & Chunk Selection

The RAG system (`src/server/langchain/rag.ts`) implements a hybrid chunk selection strategy:

**Hybrid Selection Method:**
- Retrieves chunks using a blended score combining:
  - **Semantic Similarity** (60% weight): How well the chunk matches the query
  - **Temporal Decay** (40% weight): How recently the chunk was accessed
- **Selection Strategy:**
  - Uses chunks with `finalScore > 0.7` if 5 or more meet this threshold
  - Otherwise, uses the top 5 chunks by final score
  - Ensures quality when high-scoring chunks are available, while guaranteeing minimum coverage

**Confidence Scoring:**
- **Groundedness** (50%): How well the answer aligns with source material
- **Keyword Overlap** (30%): Presence of query keywords in sources
- **Context Quality** (20%): Relevance and completeness of retrieved chunks

## API Endpoints

### Frontend API Routes (Next.js)

- **`POST /api/query`**: Query the RAG system with a question
  - Request: `{ "query": "your question here" }`
  - Response: 
    ```json
    {
      "answer": "...",
      "confidence": 85,
      "sources": [...],
      "turn": 1
    }
    ```

- **`GET /api/chunks/metadata`**: Get metadata about all chunks
  - Response: 
    ```json
    {
      "chunks": [...],
      "totalChunks": 150,
      "totalLines": 5000
    }
    ```

### Backend API Routes (Express)

- **`POST /api/query`**: Direct backend query endpoint
  - Same request/response format as frontend route

- **`GET /health`**: Health check endpoint
  - Response: `{ "status": "ok" }`

## Available Scripts

From the project root:

- `npm run dev` - Start Next.js development server (frontend only)
- `npm run dev:backend` - Start Express backend server
- `npm run dev:all` - Start both servers concurrently
- `npm run build` - Build the Next.js app for production
- `npm run start` - Start the production Next.js server
- `npm run start:backend` - Start the production backend server
- `npm test` - Run tests

## Troubleshooting

### Backend Server Not Running

**Error**: "Backend server is not running"

**Solution**: 
1. Check if the backend server is running: `curl http://localhost:3001/health`
2. Start the backend: `npm run dev:backend`
3. Or run both servers: `npm run dev:all`

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
2. If missing, run the chunking script (see Installation section)
3. The metadata file (`chunks_metadata.json`) is auto-generated when the backend starts

### Port Conflicts

**Error**: Port 3000 or 3001 is already in use

**Solution**:
1. Find the process: `lsof -i :3000` (or `:3001`)
2. Kill the process or change ports in your `.env` file

## Documentation

- **[Backend Setup Guide](./BACKEND_SETUP.md)**: Detailed backend server setup and architecture
- **[Frontend App Guide](./src/app/README.md)**: Frontend-specific setup and features

## Developers

- [Ishan Apte](https://ishan.info/)
- [Prathamesh More](https://www.prathamesh-more.com/)

## License

[Add your license information here]
