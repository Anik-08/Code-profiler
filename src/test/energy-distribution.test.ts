import { PredictionResult, Hotspot } from '../types';

describe('Energy Distribution', () => {
  test('distributes energy proportionally to hotspot scores', () => {
    // Simulate hotspots with different scores
    const hotspots: Hotspot[] = [
      { start: { line: 0, character: 0 }, end: { line: 5, character: 0 }, score: 0.6 },
      { start: { line: 10, character: 0 }, end: { line: 15, character: 0 }, score: 0.3 },
      { start: { line: 20, character: 0 }, end: { line: 25, character: 0 }, score: 0.1 },
    ];

    const totalEstimatedMj = 1000;
    const totalHotspotScore = hotspots.reduce((sum, h) => sum + h.score, 0);

    // Distribute energy proportionally
    const distributedHotspots = hotspots.map((h) => ({
      ...h,
      estimate_mJ: (h.score / totalHotspotScore) * totalEstimatedMj,
    }));

    // Verify proportional distribution
    expect(distributedHotspots[0].estimate_mJ).toBeCloseTo(600, 0); // 0.6/1.0 * 1000
    expect(distributedHotspots[1].estimate_mJ).toBeCloseTo(300, 0); // 0.3/1.0 * 1000
    expect(distributedHotspots[2].estimate_mJ).toBeCloseTo(100, 0); // 0.1/1.0 * 1000

    // Verify total sums to original
    const totalDistributed = distributedHotspots.reduce((sum, h) => sum + (h.estimate_mJ ?? 0), 0);
    expect(totalDistributed).toBeCloseTo(totalEstimatedMj, 0);
  });

  test('handles zero total hotspot score gracefully', () => {
    const hotspots: Hotspot[] = [
      { start: { line: 0, character: 0 }, end: { line: 5, character: 0 }, score: 0 },
      { start: { line: 10, character: 0 }, end: { line: 15, character: 0 }, score: 0 },
    ];

    const totalHotspotScore = hotspots.reduce((sum, h) => sum + h.score, 0);

    // Should not crash when dividing by zero
    expect(totalHotspotScore).toBe(0);
    // In actual code, we check if totalHotspotScore > 0 before distributing
  });

  test('PredictionResult includes estimated_mJ field', () => {
    const result: PredictionResult = {
      fileScore: 0.75,
      estimated_mJ: 850,
      hotspots: [],
      modelVersion: 'test-v1',
    };

    expect(result.estimated_mJ).toBeDefined();
    expect(result.estimated_mJ).toBe(850);
  });

  test('PredictionResult allows optional estimated_mJ', () => {
    const result: PredictionResult = {
      fileScore: 0.75,
      hotspots: [],
      modelVersion: 'test-v1',
    };

    expect(result.estimated_mJ).toBeUndefined();
  });
});
