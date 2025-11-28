import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
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

// Load chunks metadata
let chunksMetadata: any[] | null = null;
const loadChunksMetadata = () => {
  if (chunksMetadata) return chunksMetadata;
  
  try {
    const metadataPath = path.join(process.cwd(), 'data', 'chunks_metadata.json');
    if (fs.existsSync(metadataPath)) {
      const fileContents = fs.readFileSync(metadataPath, 'utf-8');
      chunksMetadata = JSON.parse(fileContents);
      return chunksMetadata;
    }
    
    // Fallback: load from full chunks file and extract metadata
    const chunksPath = path.join(process.cwd(), 'data', 'chunks_embeddings.json');
    if (fs.existsSync(chunksPath)) {
      const fileContents = fs.readFileSync(chunksPath, 'utf-8');
      const chunks = JSON.parse(fileContents);
      chunksMetadata = chunks.map((c: any) => ({
        id: c.id,
        start_line: c.start_line,
        end_line: c.end_line
      }));
      return chunksMetadata;
    }
  } catch (error) {
    console.error('Failed to load chunks metadata:', error);
  }
  
  return [];
};

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', message: 'ReMind backend server is running' });
});

// Chunks metadata endpoint
app.get('/api/chunks/metadata', (req: Request, res: Response) => {
  try {
    const metadata = loadChunksMetadata();
    
    // Calculate total lines
    const totalLines = metadata.length > 0 
      ? Math.max(...metadata.map((c: any) => c.end_line || 0))
      : 0;
    
    res.json({
      chunks: metadata,
      totalChunks: metadata.length,
      totalLines
    });
  } catch (error: any) {
    console.error('Error loading chunks metadata:', error);
    res.status(500).json({ error: 'Failed to load chunks metadata' });
  }
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
        recencyScore: s.recencyScore,
        start_line: s.start_line,
        end_line: s.end_line
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

