import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { askVestige } from './langchain/rag';
import { reinforceMany } from './retrieval/retrieval';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Track conversation turns across requests (in-memory)
let currentTurn = 1;

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'ReMind backend server is running' });
});

// Query endpoint
app.post('/api/query', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`\n📥 Received query: "${query}" (Turn ${currentTurn})`);

    // Call the RAG system
    const result = await askVestige(query, currentTurn);

    // Reinforce the memories that were used
    if (result.sources && result.sources.length > 0) {
      reinforceMany(
        result.sources.map((s: any) => s.id),
        currentTurn
      );
    }

    // Prepare response with sources
    const response = {
      answer: result.answer,
      sources: result.sources.map((s: any) => ({
        id: s.id,
        text: s.text.substring(0, 200) + (s.text.length > 200 ? '...' : ''),
        heading: s.heading,
        chapter: s.chapter,
        section: s.section,
        similarity: s.similarity,
        finalScore: s.finalScore,
        recencyScore: s.recencyScore
      })),
      turn: currentTurn
    };

    // Increment turn for next query
    currentTurn += 1;

    console.log(`✅ Query processed successfully (Turn ${currentTurn - 1})`);
    res.json(response);
  } catch (error: any) {
    console.error('❌ Backend Error:', error);
    res.status(500).json({
      error: 'Failed to process query',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 ReMind Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health\n`);
});

