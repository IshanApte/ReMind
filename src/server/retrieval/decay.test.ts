import { calculateActivation } from './decay';

describe('calculateActivation (exponential decay with half-life + floor)', () => {
  const halfLife = 10;
  const lambdaFloor = 0.1;

  it('returns ~1 when deltaT = 0', () => {
    const t = calculateActivation(0, halfLife, lambdaFloor);
    expect(t).toBeCloseTo(1, 5);
  });

  it('is around halfway (plus floor) at deltaT = H', () => {
    const t = calculateActivation(halfLife, halfLife, lambdaFloor);
    // (1 - λ) * 0.5 + λ
    const expected = (1 - lambdaFloor) * 0.5 + lambdaFloor;
    expect(t).toBeCloseTo(expected, 5);
  });

  it('approaches the floor for very large deltaT', () => {
    const t = calculateActivation(1000, halfLife, lambdaFloor);
    expect(t).toBeGreaterThanOrEqual(lambdaFloor);
    // Should be very close to the floor.
    expect(t).toBeLessThan(lambdaFloor + 0.01);
  });

  it('clamps negative deltaT to 0', () => {
    const tNeg = calculateActivation(-5, halfLife, lambdaFloor);
    const tZero = calculateActivation(0, halfLife, lambdaFloor);
    expect(tNeg).toBeCloseTo(tZero, 5);
  });

  it('falls back to the floor when halfLife <= 0', () => {
    const t = calculateActivation(10, 0, lambdaFloor);
    expect(t).toBeCloseTo(lambdaFloor, 5);
  });
}
);


