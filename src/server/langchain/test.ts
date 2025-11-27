import { askVestige } from './rag';

async function runRAGTest() {
  // Turn 10 ensures some "fake decay" has happened if we were persisting state
  const turn = 10; 
  const query = "How does the heart pump blood?";

  console.log("🔵 Starting RAG Pipeline Test...");
  
  const response = await askVestige(query, turn);

  console.log("\n🤖 VESTIGE SAYS:");
  console.log(response.answer);
  
  console.log("\n📖 BASED ON MEMORIES:");
  response.sources.forEach((s, i) => {
    console.log(`  [${i+1}] Score: ${s.finalScore.toFixed(3)} | "${s.text.substring(0, 50)}..."`);
  });
}

runRAGTest();