import { heuristicExtract } from '../analyzer/heuristics';

test('heuristic finds loops', () => {
  const code = `for i in range(10):\n  for j in range(5):\n    pass`;
  const f = heuristicExtract(code, 'python');
  expect(f.loopCount).toBe(2);
  expect(f.nestedLoopDepth).toBeGreaterThanOrEqual(2);
});

test('heuristic excludes comment-only regions from hotspots (Python)', () => {
  const code = `# This is a comment
for i in range(10):
  # Another comment
  # Yet another comment
  pass`;
  const f = heuristicExtract(code, 'python');
  expect(f.loopCount).toBe(1);
  // Hotspot should be created but should ideally skip pure comment lines
  expect(f.hotspotsSeeds.length).toBeGreaterThan(0);
  // The hotspot should span actual code, not just comments
  const hotspot = f.hotspotsSeeds[0];
  expect(hotspot).toBeDefined();
  expect(hotspot.start.line).toBe(1); // The for loop line
});

test('heuristic excludes comment-only regions from hotspots (JavaScript)', () => {
  const code = `// This is a comment
for (let i = 0; i < 10; i++) {
  // Another comment
  /* Block comment */
  console.log(i);
}`;
  const f = heuristicExtract(code, 'javascript');
  expect(f.loopCount).toBe(1);
  expect(f.hotspotsSeeds.length).toBeGreaterThan(0);
  const hotspot = f.hotspotsSeeds[0];
  expect(hotspot).toBeDefined();
  expect(hotspot.start.line).toBe(1); // The for loop line
});

test('heuristic does not create hotspots for pure comment sections', () => {
  const code = `# Comment 1
# Comment 2
# Comment 3`;
  const f = heuristicExtract(code, 'python');
  expect(f.loopCount).toBe(0);
  expect(f.hotspotsSeeds.length).toBe(0);
});
