## ReMind
A web app that mimics human-like memory for AI. It stores text in semantic chunks, applies temporal decay, and reinforces frequently accessed information, enabling more human-like recall behavior.

### Project structure

- **`data/`**
  - `Biology_Textbook.txt`: cleaned source textbook used for chunking.
  - `chunks_embeddings.json`: generated chunks with metadata and embeddings.
  - `chunks_metadata.json`: metadata for chunks (line numbers, etc.).
- **`src/app/`**
  - `page.tsx`: frontend entry point (Next.js app).
  - `api/query/route.ts`: Next.js API route that proxies to backend server.
  - `api/chunks/metadata/route.ts`: API route for chunk metadata.
  - `components/BookHeatmap.tsx`: visualization component for chunk access patterns.
- **`src/server/`**
  - `index.ts`: Express backend server that handles RAG queries.
- **`src/server/retrieval/`**
  - `chunk_textbook.py`: offline script to create chunks and embeddings from the textbook.
  - `embeddings.ts`: helpers for normalization, cosine similarity, etc.
  - `decay.ts`: temporal decay and reinforcement scoring.
  - `retrieval.ts`: combines semantic similarity + decay scores to rank chunks.
- **`src/server/langchain/`**
  - `model.ts`: Gemini LLM client configuration.
  - `rag.ts`: RAG pipeline that retrieves chunks, generates answers, and calculates confidence scores.

---

### 1. Setup (Python for preprocessing)

- **Requirements**
  - Python 3.8+
  - (Optional, for embeddings) `sentence-transformers`

From the project root (`/Users/ishanapte/Documents/ReMind`):

```bash
python3 -m venv .venv
source .venv/bin/activate

pip install --upgrade pip
pip install sentence-transformers
```

### 2. Generate chunks and embeddings

`chunk_textbook.py` lives under `src/server/retrieval/` and reads `data/Biology_Textbook.txt`, producing `data/chunks_embeddings.json`.

- **With embeddings (default):**

```bash
cd /Users/ishanapte/Documents/ReMind

python src/server/retrieval/chunk_textbook.py \
  --input data/Biology_Textbook.txt \
  --output data/chunks_embeddings.json
```

- **Without embeddings (faster, no extra install):**

```bash
cd /Users/ishanapte/Documents/ReMind

python src/server/retrieval/chunk_textbook.py \
  --input data/Biology_Textbook.txt \
  --output data/chunks_embeddings.json \
  --no-embeddings
```

- **Key options:**
  - `--min-words`: minimum words per chunk before merging (default: 150)
  - `--max-words`: maximum words per chunk before splitting (default: 700)
  - `--model`: SentenceTransformer model (default: `all-MiniLM-L6-v2`)
  - `--batch-size`: batch size for encoding embeddings (default: 64)

Example with custom sizes:

```bash
python src/server/retrieval/chunk_textbook.py \
  --input data/Biology_Textbook.txt \
  --output data/chunks_embeddings_custom.json \
  --min-words 200 \
  --max-words 800
```

---

### 3. RAG Pipeline & Chunk Selection

The RAG system (`src/server/langchain/rag.ts`) implements a hybrid chunk selection strategy:

**Hybrid Selection Method:**
- Retrieves chunks using a blended score combining:
  - **Semantic Similarity** (60% weight): How well the chunk matches the query
  - **Temporal Decay** (40% weight): How recently the chunk was accessed
- **Selection Strategy:**
  - Uses chunks with `finalScore > 0.7` if 5 or more meet this threshold
  - Otherwise, uses the top 5 chunks by final score
  - This ensures quality when high-scoring chunks are available, while guaranteeing minimum coverage

**Features:**
- Confidence scoring that measures groundedness (anti-hallucination)
- Memory reinforcement: frequently accessed chunks get boosted in future retrievals
- Adaptive chunk count based on query relevance

### 4. Running the Application

**Backend Server:**
```bash
npm run dev:backend
# or
npm run dev:all  # Runs both frontend and backend
```

**Frontend (Next.js):**
```bash
npm run dev
```

The backend runs on `http://localhost:3001` and the frontend on `http://localhost:3000`.

### 5. API Endpoints

- **`POST /api/query`**: Query the RAG system with a question
  - Request: `{ "query": "your question here" }`
  - Response: `{ "answer": "...", "confidence": 85, "sources": [...], "turn": 1 }`

- **`GET /api/chunks/metadata`**: Get metadata about all chunks
  - Response: `{ "chunks": [...], "totalChunks": 150, "totalLines": 5000 }`

- **`GET /health`**: Health check endpoint
