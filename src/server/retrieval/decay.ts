// Utilities for time-based decay / activation of memories.

/**
 * Exponential decay score with a configurable half-life and floor.
 *
 * Let:
 * - deltaT: time since the chunk was last accessed (in turns for this system).
 * - halfLife: H, how many turns until the score halves.
 * - lambdaFloor: λ, the minimum score floor so old but important chunks never go to 0.
 *
 * Formula:
 *   t = (1 - λ) * exp(-ln(2) * deltaT / H) + λ
 */
export const calculateActivation = (
  deltaT: number,
  halfLife: number,
  lambdaFloor: number = 0.1
): number => {
  if (halfLife <= 0) {
    // Degenerate case: no meaningful half-life, fall back to floor.
    return lambdaFloor;
  }

  const clampedDelta = Math.max(0, deltaT);
  const decay = Math.exp(-Math.log(2) * (clampedDelta / halfLife));
  return (1 - lambdaFloor) * decay + lambdaFloor;
};


