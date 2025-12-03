import { retrieve } from '../retrieval/retrieval';
import { model } from './model';

// Hugging Face Inference API endpoint for embeddings (explicitly using feature-extraction pipeline)
const HUGGINGFACE_EMBEDDING_URL = 'https://router.huggingface.co/hf-inference/models/sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction';

// Function to get the embedding of a text using Hugging Face Inference API
async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  
  if (!apiKey) {
    throw new Error('HUGGINGFACE_API_KEY is not set in environment variables');
  }

  try {
    const response = await fetch(HUGGINGFACE_EMBEDDING_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    });

    if (!response.ok) {
      // Handle model loading (503) - retry after waiting
      if (response.status === 503) {
        const retryAfter = response.headers.get('Retry-After');
        const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;
        console.log(`⏳ Model is loading, waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        
        // Retry once
        const retryResponse = await fetch(HUGGINGFACE_EMBEDDING_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ inputs: text }),
        });
        
        if (!retryResponse.ok) {
          const errorText = await retryResponse.text();
          throw new Error(`Hugging Face API error: ${retryResponse.status} ${retryResponse.statusText} - ${errorText}`);
        }
        
        const retryData = await retryResponse.json();
        return Array.isArray(retryData) ? retryData : retryData[0];
      }
      
      const errorText = await response.text();
      throw new Error(`Hugging Face API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    // API returns array of floats directly (384 dimensions)
    // Handle both single embedding and batch response formats
    if (Array.isArray(data)) {
      // If it's already an array, return it
      return Array.isArray(data[0]) ? data[0] : data;
    }
    // If it's an object with embedding, extract it
    return Array.isArray(data) ? data : data[0] || data;
  } catch (error) {
    console.error('Error getting embedding from Hugging Face:', error);
    throw error;
  }
}

/**
 * Calculates confidence score (0-100) based on answer quality.
 * Combines keyword overlap and context quality (removed embedding-based groundedness).
 */
function calculateLocalConfidence(
  query: string, 
  answer: string, 
  topChunkScore: number
): number {
  // Check if answer contains key terms from the query
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'how', 'what', 'why', 'who', 'does', 'do', 'can', 'explain', 'describe']);
  
  // Extract meaningful keywords from query
  const queryKeywords = query.toLowerCase().match(/\b\w+\b/g)?.filter(w => !stopWords.has(w) && w.length > 3) || [];
  
  const answerText = answer.toLowerCase();
  let hitCount = 0;
  
  if (queryKeywords.length > 0) {
    queryKeywords.forEach(kw => {
      if (answerText.includes(kw)) hitCount++;
    });
  }
  
  // Calculate keyword match ratio, default to 0.8 if no keywords
  const keywordScore = queryKeywords.length > 0 ? (hitCount / queryKeywords.length) : 0.8;

  // Normalize context score from [0.3, 0.8] to [0, 1] range
  const normalizedContextScore = Math.min(Math.max((topChunkScore - 0.3) / 0.5, 0), 1);

  // Weighted average: 50% keywords, 50% context quality
  const confidence = (keywordScore * 0.5) + (normalizedContextScore * 0.5);

  return Math.round(confidence * 100);
}

export const askVestige = async (userQuery: string, currentTurn: number) => {
  try {
    console.log(`\n🤔 Thinking about: "${userQuery}"...`);

    // 1. Convert query to embedding vector
    const queryVector = await getEmbedding(userQuery);

    // 2. Retrieve relevant chunks using similarity and recency
    const memories = retrieve(queryVector, {
      alpha: 0.6,      // Semantic similarity weight
      beta: 0.4,       // Recency weight
      halfLife: 10,
      lambdaFloor: 0.1,
      currentTurn: currentTurn
    });

    // Use high-quality chunks (>0.7) or top 5 minimum
    const scoreThreshold = 0.7;
    const minChunks = 5;

    // Get chunks above threshold
    const highScoreChunks = memories.filter(m => m.finalScore > scoreThreshold);

    // Get top 5 chunks
    const top5Chunks = memories.slice(0, minChunks);

    // Ensure quality or minimum coverage
    const selectedChunks = highScoreChunks.length >= minChunks 
      ? highScoreChunks 
      : top5Chunks;

    const topContext = selectedChunks.map(m => m.text).join("\n---\n");
    
    console.log(`📚 Found ${memories.length} memories. Using ${selectedChunks.length} chunks (${highScoreChunks.length} above ${scoreThreshold} threshold, ${top5Chunks.length} in top 5).`);

    // 3. Generate answer using retrieved context
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
    // Handle model API errors
    let result;
    try {
      result = await model.invoke(prompt);
    } catch (llmError) {
      console.error("⚠️ Gemini API Refused to Answer:", llmError);
      return { 
        answer: "I retrieved the memory, but I'm having trouble verbalizing it right now. (Safety Block Triggered)", 
        sources: selectedChunks,
        confidence: 0 
      };
    }
    
    const answerText = result.content as string;

    // 4. Calculate confidence score based on answer quality
    const topScore = memories.length > 0 ? memories[0].finalScore : 0;
    const confidenceScore = calculateLocalConfidence(
      userQuery, 
      answerText, 
      topScore
    );

    return {
      answer: answerText,
      sources: selectedChunks,
      confidence: confidenceScore
    };

  } catch (error) {
    console.error("❌ RAG Pipeline Failed:", error);
    return { answer: "My memory pathways are currently blocked.", sources: [], confidence: 0 };
  }
};