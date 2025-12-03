import { retrieve, loadMemoryBank, reinforceMany } from './retrieval';

// Hugging Face Inference API endpoint for embeddings (using new router endpoint)
const HUGGINGFACE_EMBEDDING_URL = 'https://router.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';

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

async function runLiveTest() {
  console.log(`\n🔵 System Initializing...`);
  
  // Ensure data is loaded
  const bank = loadMemoryBank();
  if (!bank || bank.length === 0) {
    console.error("❌ Memory bank is empty.");
    return;
  }

  const questions = [
    "What is the heart's main function?",
    "Describe the structure of the heart.",
    "How does blood flow through the heart chambers?",
    "What do the valves in the heart do?",
  ];

  let currentTurn = 1;

  for (const userQuery of questions) {
    console.log(`\n@zsh (turn ${currentTurn})`);
    console.log(`🗣️  User: "${userQuery}"`);
    console.log(`... Generating vector for query ...`);

    try {
      // A. CONVERT TEXT TO VECTOR
      const queryVector = await getEmbedding(userQuery);

      // B. PERFORM RETRIEVAL
      const results = retrieve(queryVector, {
        alpha: 0.6,        // 60% Semantic similarity
        beta: 0.4,         // 40% time-based decay score t_i
        halfLife: 10,      // H: 10 turns until decay halves
        lambdaFloor: 0.1,  // λ: floor so old but relevant chunks never fully vanish
        currentTurn,
      });

      // C. DISPLAY RESULTS
      console.log(`\n🏆 Top 10 Memories for turn ${currentTurn}:`);
      const topResults = results.slice(0, 10);
      topResults.forEach((r, i) => {
        console.log(
          `\n   #${i + 1} [Final: ${r.finalScore.toFixed(4)} | sim: ${r.similarity.toFixed(
            4
          )} | decay: ${r.recencyScore.toFixed(4)}]`
        );
        console.log(`   📂 Heading: ${r.heading || 'N/A'}`);
        console.log(`   📄 Text: "${r.text.substring(0, 100)}..."`);
      });

      // Simulate retrieval reinforcement: mark top results as recently accessed this turn.
      reinforceMany(
        topResults.map((r) => r.id),
        currentTurn
      );
    } catch (err) {
      console.error("❌ Error generating embedding:", err);
    }

    currentTurn += 1;
  }
}

// --- RUN THE MULTI-TURN TEST ---
runLiveTest();