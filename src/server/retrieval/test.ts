import { pipeline } from '@xenova/transformers';
import { retrieve, loadMemoryBank } from './retrieval';

// Global extractor to prevent reloading the model on every request
let extractor: any = null;

async function getEmbedding(text: string): Promise<number[]> {
  // 1. Load the model if not already loaded
  if (!extractor) {
    console.log("🤖 Loading Embedding Model (Xenova/all-MiniLM-L6-v2)...");
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }

  // 2. Generate Embedding
  // 'mean_pooling': true ensures we get a single vector for the sentence, not one per word
  const output = await extractor(text, { pooling: 'mean', normalize: true });
  
  // 3. Convert Tensor to plain Array
  return Array.from(output.data);
}

async function runLiveTest(userQuery: string) {
  console.log(`\n🔵 System Initializing...`);
  
  // Ensure data is loaded
  const bank = loadMemoryBank();
  if (!bank || bank.length === 0) {
    console.error("❌ Memory bank is empty.");
    return;
  }

  console.log(`\n🗣️  User asks: "${userQuery}"`);
  console.log(`... Generating vector for query ...`);

  try {
    // A. CONVERT TEXT TO VECTOR
    const queryVector = await getEmbedding(userQuery);

    // B. PERFORM RETRIEVAL
    const results = retrieve(queryVector, {
      alpha: 0.8,       // 80% Semantic match
      decayFactor: 0.5, 
      currentTurn: 1
    });

    // C. DISPLAY RESULTS
    console.log(`\n🏆 Top 3 Memories for "${userQuery}":`);
    results.slice(0, 3).forEach((r, i) => {
      console.log(`\n   #${i + 1} [Score: ${r.finalScore.toFixed(4)}]`);
      console.log(`   📂 Heading: ${r.heading || 'N/A'}`);
      console.log(`   📄 Text: "${r.text.substring(0, 100)}..."`);
    });

  } catch (err) {
    console.error("❌ Error generating embedding:", err);
  }
}

// --- RUN THE TEST ---
// You can change this string to test different biology topics!
const sampleQuery = "How does the heart pump blood to the body?";
runLiveTest(sampleQuery);