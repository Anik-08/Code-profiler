import { scoreFeatures } from '../model/scoreHeuristic';

test('score scaling', () => {
  const fv = {
    languageId: 'python',
    tokenCount: 500,
    loopCount: 5,
    nestedLoopDepth: 3,
    stringConcatOps: 4,
    listScanOps: 6,
    functionCount: 4,
    avgFunctionLength: 40,
    hotspotsSeeds: [{ start: { line: 0, character: 0 }, end: { line: 5, character: 0 } }],
    version: '0.1',
  };
  const res = scoreFeatures(fv);
  expect(res.fileScore).toBeGreaterThan(0);
  expect(res.hotspots.length).toBe(1);
});
