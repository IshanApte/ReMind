import { retrieve } from '../retrieval/retrieval'; // Your existing engine
import { model } from './model'; // The Gemini client
import { pipeline } from '@xenova/transformers';

// Singleton for the embedding model
let extractor: any = null;

async function getEmbedding(text: string): Promise<number[]> {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

/**
 * Calculates a "Trust Score" (0-100) without making extra API calls.
 * It combines:
 * 1. Keyword Overlap (Did the AI mention the specific nouns you asked about?)
 * 2. Context Quality (Did our retrieval engine find good data?)
 */
function calculateLocalConfidence(query: string, answer: string, topChunkScore: number): number {
  // A. Keyword Check: Did the answer actually use the words from the question?
  // We filter out common stop words to find the "meat" of the question.
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'how', 'what', 'why', 'who', 'does', 'do', 'can', 'explain', 'describe']);
  
  // Extract words longer than 3 chars that aren't stop words
  const queryKeywords = query.toLowerCase().match(/\b\w+\b/g)?.filter(w => !stopWords.has(w) && w.length > 3) || [];
  
  const answerText = answer.toLowerCase();
  let hitCount = 0;
  
  if (queryKeywords.length > 0) {
    queryKeywords.forEach(kw => {
      if (answerText.includes(kw)) hitCount++;
    });
  }
  
  // Calculate Keyword Ratio (0.0 to 1.0)
  // If query was "mitral valve function" and answer has "mitral" and "valve", score is high.
  // Default to 0.8 if no keywords found (e.g., "Hello") to give benefit of doubt.
  const keywordScore = queryKeywords.length > 0 ? (hitCount / queryKeywords.length) : 0.8;

  // B. Context Score Normalization
  // Our cosine scores usually float between 0.3 (bad) and 0.8 (good).
  // We normalize this range to 0.0 - 1.0 so it plays nice with the math.
  // Formula: (Score - Min) / (Max - Min) -> roughly (Score - 0.3) / 0.5
  const normalizedContextScore = Math.min(Math.max((topChunkScore - 0.3) / 0.5, 0), 1);

  // C. Final Formula
  // 60% based on Keywords (Did the LLM stay on topic?)
  // 40% based on Retrieval (Did we have good data?)
  const confidence = (keywordScore * 0.6) + (normalizedContextScore * 0.4);

  return Math.round(confidence * 100);
}

export const askVestige = async (userQuery: string, currentTurn: number) => {
  try {
    console.log(`\n🤔 Thinking about: "${userQuery}"...`);

    // 1. EMBED (The "Eyes")
    // Convert user text to vector
    const queryVector = await getEmbedding(userQuery);

    // 2. RETRIEVE (The "Memory")
    // Get top 3 chunks using your blended score (Similarity + Decay)
    const memories = retrieve(queryVector, {
      alpha: 0.6,      // 60% Semantic Match
      beta: 0.4,       // 40% Recency Bias
      halfLife: 10,    // Decay speed
      lambdaFloor: 0.1,
      currentTurn: currentTurn
    });

    // Take the top 3 most relevant chunks
    const topContext = memories.slice(0, 3).map(m => m.text).join("\n---\n");
    
    console.log(`📚 Found ${memories.length} memories. Using top 3.`);

    // 3. GENERATE (The "Voice")
    // Construct the RAG Prompt
    const prompt = `
    You are Project VESTIGE, an AI with human-like memory dynamics.
    
    CONTEXT (Retrieved from long-term memory):
    "${topContext}"
    
    USER QUESTION:
    "${userQuery}"
    
    INSTRUCTIONS:
    Answer the question using ONLY the context provided above. 
    If the context discusses the topic, explain it clearly.
    If the context is irrelevant to the question, admit you don't recall that information.
    `;

    // Send to Gemini
    // We add a safety try/catch here specifically for the model invocation
    let result;
    try {
      result = await model.invoke(prompt);
    } catch (llmError) {
      console.error("⚠️ Gemini API Refused to Answer:", llmError);
      return { 
        answer: "I retrieved the memory, but I'm having trouble verbalizing it right now. (Safety Block Triggered)", 
        sources: memories.slice(0, 3),
        confidence: 0 
      };
    }
    
    const answerText = result.content as string;

    // 4. CALCULATE CONFIDENCE (The "Judge")
    // Use the #1 chunk's score as the baseline for "Input Quality"
    const topScore = memories.length > 0 ? memories[0].finalScore : 0;
    const confidenceScore = calculateLocalConfidence(userQuery, answerText, topScore);

    return {
      answer: answerText,
      sources: memories.slice(0, 3), // Return sources so UI can show them
      confidence: confidenceScore // <--- The new metric
    };

  } catch (error) {
    console.error("❌ RAG Pipeline Failed:", error);
    return { answer: "My memory pathways are currently blocked.", sources: [], confidence: 0 };
  }
};