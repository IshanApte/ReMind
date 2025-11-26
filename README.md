## ReMind
A web app that mimics human-like memory for AI. It stores text in semantic chunks, applies temporal decay, and reinforces frequently accessed information, enabling more human-like recall behavior.

### Project structure

- **`data/`**
  - `Biology_Textbook.txt`: cleaned source textbook used for chunking.
  - `chunks_embeddings.json`: generated chunks with metadata and (optionally) embeddings.
- **`src/app/`**
  - `index.tsx`: frontend entry point (Next.js-style app).
  - `api/query.ts`: backend API route for querying the memory system.
- **`src/server/retrieval/`**
  - `chunk_textbook.py`: offline script to create chunks and embeddings from the textbook.
  - `embeddings.ts`: helpers for normalization, cosine similarity, etc.
  - `decay.ts`: temporal decay and reinforcement scoring.
  - `retrieval.ts`: combines semantic similarity + decay scores to rank chunks.
- **`src/server/langchain/`**
  - `chain.ts`: LangChain pipeline (LLM, prompt, and retrieved docs).

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

### 3. Next steps (app server)

The TypeScript files under `src/app` and `src/server` are the backbone for:

- Loading `data/chunks_embeddings.json`.
- Computing semantic similarity (`embeddings.ts`) and temporal decay (`decay.ts`).
- Ranking and returning results via `src/app/api/query.ts`.
- Passing retrieved docs to an LLM pipeline in `src/server/langchain/chain.ts`.

Once those pieces are implemented, you can:

1. Run the front-end dev server (e.g., via Next.js).
2. Hit the `/api/query` endpoint with a question.
3. Inspect how retrieved memories and decay scores change over time.
