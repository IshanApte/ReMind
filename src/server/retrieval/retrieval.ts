import * as fs from 'fs';
import * as path from 'path';
import { calculateActivation } from './decay';

// Types

export interface MemoryChunk {
  id: number | string;
  text: string;
  embedding: number[];
  heading?: string;
  chapter?: string;
  section?: string;
  start_line?: number;
  end_line?: number;
}

export interface ScoredChunk extends MemoryChunk {
  similarity: number;      // Raw vector similarity (0-1)
  recencyScore: number;    // Time decay factor (0-1)
  finalScore: number;      // Blended score for sorting
  lastAccessed: number;    // Last access turn
}

export interface RetrievalOptions {
  alpha: number;           // Semantic similarity weight
  beta?: number;           // Time decay weight (0 = pure similarity)
  halfLife?: number;       // Decay half-life in turns
  lambdaFloor?: number;    // Minimum decay score floor
  currentTurn: number;     // Current turn counter
}

// State & loading

// In-memory cache to avoid repeated disk reads
let globalMemoryBank: MemoryChunk[] | null = null;

// Track last access times for chunks
const accessHistory = new Map<number | string, number>();

// Testing helpers for injecting mock state
export const __setMemoryBankForTesting = (bank: MemoryChunk[] | null) => {
  globalMemoryBank = bank;
};

export const __resetAccessHistoryForTesting = () => {
  accessHistory.clear();
};

export const loadMemoryBank = (): MemoryChunk[] => {
  if (globalMemoryBank) return globalMemoryBank;

  try {
    // Load precomputed chunks from data directory
    const filePath = path.join(process.cwd(), 'data', 'chunks_embeddings.json');
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    globalMemoryBank = JSON.parse(fileContents) as MemoryChunk[];
    console.log(`🧠 [System] Memory Bank Loaded: ${globalMemoryBank.length} chunks.`);
    return globalMemoryBank;
  } catch (error) {
    console.error("❌ Failed to load memory bank. Check data/chunks_embeddings.json", error);
    return [];
  }
};

// Math helpers

const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  
  let dot = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dot += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

// Core retrieval function

export const retrieve = (
  queryVector: number[],
  options: RetrievalOptions
): ScoredChunk[] => {
  const memoryBank = loadMemoryBank();
  const {
    alpha,
    beta = 0,            // default: no decay
    halfLife,
    lambdaFloor,
    currentTurn
  } = options;
  
  const scoredChunks = memoryBank.map((chunk) => {
    const similarity = cosineSimilarity(queryVector, chunk.embedding);

    // Calculate time-based decay score
    let recencyScore = 1.0;
    let lastSeen = currentTurn;

    if (beta > 0 && typeof halfLife === 'number') {
      const storedLastSeen = accessHistory.get(chunk.id);

      if (typeof storedLastSeen === 'number') {
        lastSeen = storedLastSeen;
      } else {
        // New chunks default to current turn
        lastSeen = currentTurn;
      }

      const age = Math.max(0, currentTurn - lastSeen);
      recencyScore = calculateActivation(age, halfLife, lambdaFloor);
    }

    // Calculate final blended score
    const finalScore = alpha * similarity + beta * recencyScore;

    return {
      ...chunk,
      similarity,
      recencyScore,
      finalScore,
      lastAccessed: lastSeen
    } as ScoredChunk;
  });

  // Sort by final score (descending)
  scoredChunks.sort((a, b) => b.finalScore - a.finalScore);
  
  return scoredChunks;
};

export const reinforceMemory = (chunkId: number | string, currentTurn: number) => {
  // Mark chunk as accessed to refresh its decay score
  accessHistory.set(chunkId, currentTurn);
  console.log(`🔄 Reinforced Memory #${chunkId} at Turn ${currentTurn}`);
};

// Reinforce multiple chunks at once
export const reinforceMany = (chunkIds: Array<number | string>, currentTurn: number) => {
  chunkIds.forEach((id) => accessHistory.set(id, currentTurn));
  if (chunkIds.length > 0) {
    console.log(`🔄 Reinforced ${chunkIds.length} memories at Turn ${currentTurn}`);
  }
};