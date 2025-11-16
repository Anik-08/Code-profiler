import { heuristicExtract } from '../analyzer/heuristics';

test('heuristic finds loops', () => {
  const code = `for i in range(10):\n  for j in range(5):\n    pass`;
  const f = heuristicExtract(code, 'python');
  expect(f.loopCount).toBe(2);
  expect(f.nestedLoopDepth).toBeGreaterThanOrEqual(2);
});
