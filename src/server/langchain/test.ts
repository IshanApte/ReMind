import { askVestige } from './rag';

async function runRAGTests() {
  console.log("🔵 Starting RAG Pipeline Multi-Question Test...");

  const questions = [
    "What is the heart's main function?",
    "Describe the structure of the heart.",
    "How does blood flow through the heart chambers?",
    "What do the valves in the heart do?",
  ];

  // Start at a later turn so that decay math is interesting if state were persisted
  let currentTurn = 10;

  for (const query of questions) {
    console.log(`\n@vestige (turn ${currentTurn})`);
    console.log(`🗣️  User: "${query}"`);

    const response = await askVestige(query, currentTurn);

    console.log("\n🤖 VESTIGE SAYS:");
    console.log(response.answer);

    console.log("\n📖 BASED ON MEMORIES:");
    response.sources.forEach((s, i) => {
      console.log(`  [${i + 1}] Score: ${s.finalScore.toFixed(3)} | "${s.text.substring(0, 50)}..."`);
    });

    currentTurn += 1;
  }
}

runRAGTests();