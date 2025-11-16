import { rules } from './rules';

export function applyRuleToText(
  ruleId: string,
  original: string,
): { updated: string; note?: string } {
  const rule = rules.find((r) => r.id === ruleId);
  if (!rule) return { updated: original, note: 'Rule not found' };
  try {
    const updated = rule.rewrite(original);
    return { updated, note: 'Applied rule ' + ruleId };
  } catch (e: any) {
    return { updated: original, note: 'Failed to apply rule: ' + e.message };
  }
}
