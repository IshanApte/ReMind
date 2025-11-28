import * as fs from 'fs';
import * as path from 'path';
import { calculateActivation } from './decay';

// --- 1. TYPES ---

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
  similarity: number;      // 0.0 to 1.0 (Raw vector match)
  recencyScore: number;    // 0.0 to 1.0 (Time decay factor)
  finalScore: number;      // The blended score used for sorting
  lastAccessed: number;    // Turn number
}

export interface RetrievalOptions {
  alpha: number;           // Weight for Semantic Similarity (e.g., 0.6 in the full score)
  beta?: number;           // Weight for time-decay score t_i (e.g., 0.25). If omitted/0 => pure similarity.
  halfLife?: number;       // H: half-life in turns (how many turns until decay halves).
  lambdaFloor?: number;    // λ: minimum decay score floor (e.g., 0.1). Optional.
  currentTurn: number;     // Current global turn counter (in turns, not wall-clock time)
}

// --- 2. STATE & LOADING ---

// Singleton to hold data in memory so we don't read disk every time
let globalMemoryBank: MemoryChunk[] | null = null;

// Simulating a session database for "Last Accessed" state
const accessHistory = new Map<number | string, number>();

// Testing helpers (no-op in production usage, but allow us to inject state in Jest)
export const __setMemoryBankForTesting = (bank: MemoryChunk[] | null) => {
  globalMemoryBank = bank;
};

export const __resetAccessHistoryForTesting = () => {
  accessHistory.clear();
};

export const loadMemoryBank = (): MemoryChunk[] => {
  if (globalMemoryBank) return globalMemoryBank;

  try {
    // ⚠️ FIXED PATH: Pointing to 'data/chunks_embeddings.json' where the precomputed chunks live
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

// --- 3. MATH HELPERS ---

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

// --- 4. CORE RETRIEVAL FUNCTION ---

export const retrieve = (
  queryVector: number[],
  options: RetrievalOptions
): ScoredChunk[] => {
  const memoryBank = loadMemoryBank();
  const {
    alpha,
    beta = 0,            // default: no decay contribution
    halfLife,
    lambdaFloor,
    currentTurn
  } = options;
  
  const scoredChunks = memoryBank.map((chunk) => {
    const similarity = cosineSimilarity(queryVector, chunk.embedding);

    // --- Time-based decay score t_i ---
    // If beta is 0 or halfLife is not provided, we effectively run in pure similarity mode.
    let recencyScore = 1.0;
    let lastSeen = currentTurn;

    if (beta > 0 && typeof halfLife === 'number') {
      const storedLastSeen = accessHistory.get(chunk.id);

      if (typeof storedLastSeen === 'number') {
        lastSeen = storedLastSeen;
      } else {
        // Unseen chunks start as if they were just accessed now.
        lastSeen = currentTurn;
      }

      const age = Math.max(0, currentTurn - lastSeen);
      recencyScore = calculateActivation(age, halfLife, lambdaFloor);
    }

    // --- Final blended score s_i = alpha * r_i + beta * t_i ---
    // If beta is 0, this simplifies to pure similarity.
    const finalScore = alpha * similarity + beta * recencyScore;

    return {
      ...chunk,
      similarity,
      recencyScore,
      finalScore,
      lastAccessed: lastSeen
    } as ScoredChunk;
  });

  // Sort by Final Score (Highest first)
  scoredChunks.sort((a, b) => b.finalScore - a.finalScore);
  
  return scoredChunks;
};

export const reinforceMemory = (chunkId: number | string, currentTurn: number) => {
  /**
   * Retrieval reinforcement:
   * Call this whenever a chunk is actually used in an answer so that
   * future decay scores treat it as freshly accessed at `currentTurn`.
   */
  accessHistory.set(chunkId, currentTurn);
  console.log(`🔄 Reinforced Memory #${chunkId} at Turn ${currentTurn}`);
};

/**
 * Convenience helper to reinforce multiple chunks at the same turn.
 */
export const reinforceMany = (chunkIds: Array<number | string>, currentTurn: number) => {
  chunkIds.forEach((id) => accessHistory.set(id, currentTurn));
  if (chunkIds.length > 0) {
    console.log(`🔄 Reinforced ${chunkIds.length} memories at Turn ${currentTurn}`);
  }
};