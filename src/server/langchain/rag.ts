import { retrieve } from '../retrieval/retrieval'; // Your existing engine
import { model } from './model'; // The Gemini client we just made
import { pipeline } from '@xenova/transformers';

// Singleton for the embedding model (same pattern as retrieval test)
let extractor: any = null;

async function getEmbedding(text: string): Promise<number[]> {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
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
    const result = await model.invoke(prompt);
    
    return {
      answer: result.content,
      sources: memories.slice(0, 3) // Return sources so UI can show them
    };

  } catch (error) {
    console.error("❌ RAG Pipeline Failed:", error);
    return { answer: "My memory pathways are currently blocked.", sources: [] };
  }
};