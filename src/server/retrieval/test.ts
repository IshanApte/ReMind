import { pipeline } from '@xenova/transformers';
import { retrieve, loadMemoryBank, reinforceMany } from './retrieval';

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