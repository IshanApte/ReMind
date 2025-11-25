# ReMind
A web app that mimics human-like memory for AI. Stores text in semantic chunks and scores relevance plus temporal decay. Old info fades, retrieval reinforces memory. Includes interactive visualizations and fast search. Ideal for experimenting with temporal memory and explainable AI.

## Chunking the Biology Textbook

This repo includes a script, `chunk_textbook.py`, which takes a cleaned textbook `.txt` file, splits it into semantic, size-constrained chunks, and writes the result as a JSON file. It can optionally compute sentence-transformer embeddings for each chunk.

### Prerequisites

- Python 3.8+
- (Optional, for embeddings) `sentence-transformers` Python package

You can install dependencies in a virtual environment (recommended):

```bash
cd /Users/ishanapte/Documents/ReMind

python3 -m venv .venv
source .venv/bin/activate

pip install sentence-transformers
```

### Basic usage (with embeddings)

Assuming you have a cleaned biology textbook at `Biology_Textbook.txt` in this directory:

```bash
cd /Users/ishanapte/Documents/ReMind

python3 chunk_textbook.py \
  --input /Users/ishanapte/Documents/ReMind/Biology_Textbook.txt \
  --output /Users/ishanapte/Documents/ReMind/Biology_Textbook_chunks.json
```

This will:

- Read `Biology_Textbook.txt`
- Split it into semantic chunks with size constraints
- Compute embeddings using the default `all-MiniLM-L6-v2` SentenceTransformer model
- Write all chunks (with metadata and embeddings) to `Biology_Textbook_chunks.json`

### Usage without embeddings (faster, no extra install)

If you only want raw chunks and do not want to install `sentence-transformers`, pass `--no-embeddings`:

```bash
cd /Users/ishanapte/Documents/ReMind

python3 chunk_textbook.py \
  --input /Users/ishanapte/Documents/ReMind/Biology_Textbook.txt \
  --output /Users/ishanapte/Documents/ReMind/Biology_Textbook_chunks.json \
  --no-embeddings
```

### Advanced options

`chunk_textbook.py` exposes additional arguments:

- `--min-words`: minimum words per chunk before merging with neighbors (default: 150)
- `--max-words`: maximum words per chunk before splitting (default: 700)
- `--model`: SentenceTransformer model name (default: `all-MiniLM-L6-v2`)
- `--batch-size`: batch size for encoding embeddings (default: 64)

Example with custom chunk sizes:

```bash
python3 chunk_textbook.py \
  --input /Users/ishanapte/Documents/ReMind/Biology_Textbook.txt \
  --output /Users/ishanapte/Documents/ReMind/Biology_Textbook_chunks_custom.json \
  --min-words 200 \
  --max-words 800
```
