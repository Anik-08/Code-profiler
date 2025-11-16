import { rules } from '../suggestions/rules';

test('rules loaded', () => {
  expect(rules.length).toBeGreaterThan(0);
});
