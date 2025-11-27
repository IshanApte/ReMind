## 📋 Prerequisites

* **Node.js** (v18+ recommended)
* **Google AI Studio API Key** (Get one [here](https://aistudio.google.com/app/apikey))

## 🚀 Setup Instructions

### 1. Install Dependencies
If you haven't installed the project packages yet, run:

```bash
npm install @langchain/google-genai @langchain/core @xenova/transformers dotenv tsx
```

2. Configure Environment

Create a .env file in the root of your project (if it doesn't exist) and add your Google API key:
Code snippet

GOOGLE_API_KEY=your_actual_api_key_here

3. Verify Data Availability

Ensure you have the memory bank ready. The RAG engine relies on this file existing:

    Path: data/chunks_embeddings.json

(If this file is missing, run your ingestion script first to generate the memory chunks).

🧪 How to Run the Test

We use tsx (TypeScript Execute) to run the test file directly without compiling.

Run the RAG Pipeline Test

This script simulates a user asking a question (e.g., "How does the heart pump blood?"). It will:

    Embed the question locally (using transformers.js).

    Retrieve the most relevant memories based on Similarity + Decay.

    Generate an answer using Gemini 1.5 Flash.

Command:
Bash

npx tsx src/server/langchain/test.ts