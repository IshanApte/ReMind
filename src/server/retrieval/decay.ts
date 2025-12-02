// Time-based decay functions for memory activation

/**
 * Exponential decay with configurable half-life and minimum floor.
 * Formula: t = (1 - λ) * exp(-ln(2) * deltaT / H) + λ
 */
export const calculateActivation = (
  deltaT: number,
  halfLife: number,
  lambdaFloor: number = 0.1
): number => {
  if (halfLife <= 0) {
    // Invalid half-life, return floor value
    return lambdaFloor;
  }

  const clampedDelta = Math.max(0, deltaT);
  const decay = Math.exp(-Math.log(2) * (clampedDelta / halfLife));
  return (1 - lambdaFloor) * decay + lambdaFloor;
};


