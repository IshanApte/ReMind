Vestige Memory Agent - Proof of Concept

This project demonstrates a dynamic memory retrieval system with semantic search and time-based decay.

1. Prerequisites

Node.js (v18+ recommended)

npm

2. Installation

Initialize the project and install the required TypeScript execution tool:

# Install project dependencies
npm install

# Install tsx to run TypeScript scripts directly
npm install -D tsx


3. File Structure

Ensure your project files are organized exactly like this to avoid import errors:

/project-root
  ├── .gitignore
  ├── package.json
  ├── data/
  │   └── chunks_with_embeddings.json  (The precomputed vectors)
  ├── lib/
  │   └── retrieval.ts                 (The core logic library)
  └── scripts/
      └── test-logic.ts                (The test runner)


4. Running the Test

Execute the test script from the root of your project directory:

npx tsx scripts/test-logic.ts


5. Troubleshooting

Error: Cannot find module 'retrieval':

Make sure inside scripts/test-logic.ts, you import from ../lib/retrieval (relative path).

Error: No data found:

Ensure you are running the command from the root folder, not inside src/ or scripts/.