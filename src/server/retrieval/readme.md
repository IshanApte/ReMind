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


3. Current File Structure (simplified)

This repo currently uses a simpler layout:

/project-root
  ├── package.json
  ├── data/
  │   └── chunks_embeddings.json       (The precomputed vectors)
  └── src/server/retrieval/
      ├── retrieval.ts                 (Core retrieval + decay logic)
      ├── decay.ts                     (Exponential decay helper)
      ├── test.ts                      (Manual multi-turn test runner)
      ├── decay.test.ts                (Jest unit tests for decay)
      └── retrieval.test.ts            (Jest unit tests for retrieval)


4. Running the manual multi-turn test (`test.ts`)

Use this script when you want to *see* what the agent is doing for real biology questions.
It simulates a short conversation over multiple turns and prints the top 10 memories, including
final score, semantic similarity, and decay score.

From the project root:

  npx tsx src/server/retrieval/test.ts

The script will:

- Load the memory bank from `data/chunks_embeddings.json`.
- Loop over several hard-coded questions (e.g. “What is the heart's main function?”).
- Maintain a `currentTurn` counter and call `retrieve` with:
  - `alpha` (semantic weight),
  - `beta` (decay weight),
  - `halfLife`,
  - `lambdaFloor`,
  - `currentTurn`.
- Log output blocks like:

  @zsh (turn 2)
  🗣️  User: "Describe the structure of the heart."
  🏆 Top 10 Memories for turn 2:
    #1 [Final: ... | sim: ... | decay: ...]

- Call `reinforceMany` on the top memories each turn so decay reflects “retrieval reinforcement”.


5. Jest test setup (for fast, deterministic checks)

For quick regression tests that do not depend on the large textbook file or the embedding model,
we use Jest + ts-jest:

- `jest.config.cjs` configures Jest with the `ts-jest` preset and a Node environment.
- `npm test` runs all `*.test.ts` files under `src/server/retrieval/`.

The main suites are:

- `decay.test.ts`
  - Directly tests `calculateActivation` for:
    - Δt = 0 (score ≈ 1),
    - Δt = H (half-life behavior),
    - large Δt (score approaches λ),
    - negative Δt (clamped to 0),
    - invalid `halfLife <= 0` (falls back to λ).

- `retrieval.test.ts`
  - Uses a small fake memory bank and testing helpers:
    - `__setMemoryBankForTesting` to inject chunks,
    - `__resetAccessHistoryForTesting` to clear state between tests.
  - Exercises:
    - Pure similarity mode when `beta = 0`.
    - Initial decay ≈ 1 at the first turn when `beta > 0`.
    - Multi-turn behavior with `reinforceMany` and increasing `currentTurn`,
      so you can see how decay and `finalScore` evolve independent of the real data file.

Run all Jest tests from the project root:

  npm test


6. Decay scoring (turn-based)

This project uses an exponential decay score with retrieval reinforcement to model recency:

- Δt: time (in turns) since a chunk was last accessed or created.
- H (halfLife): how many turns until the decay score halves.
- λ (lambdaFloor): minimum score floor so old but important chunks never go to 0.

Formula:

- t_i = (1 - λ) * exp(-ln(2) * Δt_i / H) + λ

Combination with semantic similarity:

- r_i: semantic similarity (0–1, cosine over embeddings).
- t_i: decay score from above.
- s_i = α r_i + β t_i

Typical starting weights:

- α = 0.6 (semantic)
- β = 0.4 (decay)
- H = 10 turns
- λ = 0.1

On each retrieval, call `reinforceMemory` or `reinforceMany` for the chunks you actually use so their decay score “recharges”.