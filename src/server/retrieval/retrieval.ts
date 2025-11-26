import fs from 'fs';
import path from 'path';

// --- 1. TYPES ---

export interface MemoryChunk {
  id: number | string;
  text: string;
  embedding: number[];
  heading?: string;
  chapter?: string;
  section?: string;
}

export interface ScoredChunk extends MemoryChunk {
  similarity: number;      // 0.0 to 1.0 (Raw vector match)
  recencyScore: number;    // 0.0 to 1.0 (Time decay factor)
  finalScore: number;      // The blended score used for sorting
  lastAccessed: number;    // Turn number
}

export interface RetrievalOptions {
  alpha: number;           // Weight for Semantic Similarity (e.g., 0.8)
  decayFactor: number;     // How fast memory decays (Lambda). Higher = Faster forget.
  currentTurn: number;     // Current global turn counter
}

// --- 2. STATE & LOADING ---

// Singleton to hold data in memory so we don't read disk every time
let globalMemoryBank: MemoryChunk[] | null = null;

// Simulating a session database for "Last Accessed" state
const accessHistory = new Map<number | string, number>();

export const loadMemoryBank = (): MemoryChunk[] => {
  if (globalMemoryBank) return globalMemoryBank;

  try {
    // ⚠️ FIXED PATH: Pointing to 'data/chunks_with_embeddings.json' based on setup
    const filePath = path.join(process.cwd(),'chunks_embeddings.json');
    const fileContents = fs.readFileSync(filePath, 'utf-8');
    globalMemoryBank = JSON.parse(fileContents) as MemoryChunk[];
    console.log(`🧠 [System] Memory Bank Loaded: ${globalMemoryBank.length} chunks.`);
    return globalMemoryBank;
  } catch (error) {
    console.error("❌ Failed to load memory bank. Check data/chunks_with_embeddings.json", error);
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

const calculateActivation = (age: number, decayLambda: number): number => {
  return Math.pow(1 + age, -decayLambda);
};

// --- 4. CORE RETRIEVAL FUNCTION ---

export const retrieve = (
  queryVector: number[],
  options: RetrievalOptions
): ScoredChunk[] => {
  const memoryBank = loadMemoryBank();
  
  const scoredChunks = memoryBank.map((chunk) => {
    const similarity = cosineSimilarity(queryVector, chunk.embedding);
    
    // --- 🚫 DECAY LOGIC TEMPORARILY DISABLED ---
    /*
    // Default to "50 turns old" if never seen, so it doesn't decay to zero immediately but isn't fresh
    const lastSeen = accessHistory.get(chunk.id) || 0;
    const age = accessHistory.has(chunk.id) 
      ? Math.max(0, options.currentTurn - lastSeen) 
      : 50; 
    
    const recencyScore = calculateActivation(age, options.decayFactor);
    const finalScore = (options.alpha * similarity) + ((1 - options.alpha) * recencyScore);
    */

    // 🟢 PURE SIMILARITY MODE
    const recencyScore = 1.0; // Dummy value
    const finalScore = similarity; // Pure vector match (100% Semantic)
    const lastSeen = 0;

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
  accessHistory.set(chunkId, currentTurn);
  console.log(`🔄 Reinforced Memory #${chunkId} at Turn ${currentTurn}`);
};