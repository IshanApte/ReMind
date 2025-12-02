import {
  retrieve,
  reinforceMany,
  __setMemoryBankForTesting,
  __resetAccessHistoryForTesting,
  type MemoryChunk,
  type RetrievalOptions,
} from './retrieval';

// Minimal test data for deterministic results
const fakeBank: MemoryChunk[] = [
  { id: 1, text: 'heart pumps blood', embedding: [1, 0] },
  { id: 2, text: 'neuron fires', embedding: [0, 1] },
];

const queryVec = [1, 0]; // closest to chunk 1

const baseOpts: RetrievalOptions = {
  alpha: 0.6,
  beta: 0.4,
  halfLife: 2,
  lambdaFloor: 0.1,
  currentTurn: 1,
};

beforeEach(() => {
  __setMemoryBankForTesting(fakeBank);
  __resetAccessHistoryForTesting();
});

describe('retrieve basic behavior', () => {
  it('falls back to pure similarity when beta = 0', () => {
    const results = retrieve(queryVec, { ...baseOpts, beta: 0 });
    // Should rank by similarity only
    expect(results[0].finalScore).toBeGreaterThanOrEqual(results[1].finalScore);
    // Decay score is still computed as 1.0 in this mode.
    results.forEach(r => expect(r.recencyScore).toBeCloseTo(1, 5));
  });

  it('starts with decay ~1 for all chunks on the first turn when beta > 0', () => {
    const results = retrieve(queryVec, baseOpts);
    results.forEach(r => {
      expect(r.recencyScore).toBeCloseTo(1, 5);
    });
  });
});

describe('sequential queries and decay', () => {
  it('shows older reinforced chunks with lower decay than fresh unseen ones', () => {
    // Turn 1: retrieve and reinforce only the top result.
    let results = retrieve(queryVec, { ...baseOpts, currentTurn: 1 });
    const topId = results[0].id;
    reinforceMany([topId], 1);

    // Turn 5: retrieve again without reinforcing the second chunk.
    results = retrieve(queryVec, { ...baseOpts, currentTurn: 5 });
    const chunk1 = results.find(r => r.id === topId)!;      // reinforced at turn 1
    const chunk2 = results.find(r => r.id !== topId)!;      // never reinforced

    // Reinforced chunk should have lower decay score
    expect(chunk1.recencyScore).toBeLessThan(1);
    expect(chunk2.recencyScore).toBeGreaterThanOrEqual(chunk1.recencyScore);
  });

  it('shows fresh chunks can outrank older reinforced ones', () => {
    // Adjust similarities: chunk 1 lower, chunk 2 higher
    fakeBank[0].embedding = [0.9, 0.1];
    fakeBank[1].embedding = [1, 0];

    // Reinforce chunk 1 for multiple turns
    for (let turn = 1; turn <= 3; turn++) {
      const res = retrieve(queryVec, { ...baseOpts, currentTurn: turn });
      const chunk1 = res.find(r => r.id === 1)!;
      reinforceMany([chunk1.id], turn);
    }

    // Later turn: chunk 2 has never been reinforced, chunk 1 has.
    const laterTurn = 10;
    const results = retrieve(queryVec, { ...baseOpts, currentTurn: laterTurn });
    const c1 = results.find(r => r.id === 1)!;
    const c2 = results.find(r => r.id === 2)!;

    // Fresh chunk can have higher final score
    expect(c2.finalScore).toBeGreaterThanOrEqual(c1.finalScore);
  });
}
);


