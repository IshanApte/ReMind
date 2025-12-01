import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs';
import * as path from 'path';
import { askVestige } from './langchain/rag';
import { reinforceMany } from './retrieval/retrieval';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Rate limiting configurations for LinkedIn portfolio demo
const portfolioQueryLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 15, // 15 queries per 5 minutes (3 per minute average)
  message: {
    error: '🤖 Demo rate limit reached',
    message: 'This is a portfolio demo with API cost protection. Please wait 5 minutes to continue exploring.',
    tip: 'Try asking about: cell biology, genetics, photosynthesis, or cellular respiration',
    retryAfter: '5 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Skip rate limiting for localhost during development
  skip: (req) => {
    const ip = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
    return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  }
});

// General API protection for metadata and health endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes  
  max: 200, // Generous for UI interactions (heatmap, metadata, etc.)
  message: {
    error: 'Rate limit exceeded',
    message: 'Please wait a few minutes before continuing.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false
});

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

// Health check endpoint with light rate limiting
app.get('/health', generalLimiter, (req: Request, res: Response) => {
  res.json({ 
    status: 'ok', 
    message: 'ReMind backend server is running',
    portfolio: 'LinkedIn demo with professional rate limiting'
  });
});

// Chunks metadata endpoint with rate limiting
app.get('/api/chunks/metadata', generalLimiter, (req: Request, res: Response) => {
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

// Query endpoint with portfolio-friendly rate limiting
app.post('/api/query', portfolioQueryLimiter, async (req: Request, res: Response) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ 
        error: 'Query is required',
        example: '{ "query": "What is photosynthesis?" }',
        portfolio: 'This demonstrates input validation in production APIs'
      });
    }

    console.log(`\n📥 [Portfolio Demo] Query: "${query}" (Turn ${currentTurn})`);

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
      confidence: result.confidence,
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
      turn: currentTurn,
      portfolio: {
        note: 'This demonstrates RAG with temporal memory decay',
        features: ['Semantic chunking', 'Vector embeddings', 'Confidence scoring', 'Anti-hallucination measures']
      }
    };

    // Increment turn for next query
    currentTurn += 1;

    console.log(`✅ [Portfolio] Query processed successfully (Turn ${currentTurn - 1})`);
    res.json(response);
  } catch (error: any) {
    console.error('❌ Backend Error:', error);
    res.status(500).json({
      error: 'Failed to process query',
      message: 'Portfolio demo encountered an issue. This would be logged and monitored in production.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      portfolio: 'This demonstrates professional error handling and logging practices'
    });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 ReMind Backend Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health\n`);
});