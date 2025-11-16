import { applyRuleToText } from './applyRewrite';
import * as Diff from 'diff';

export function buildPatchPreview(ruleId: string, original: string) {
  const { updated } = applyRuleToText(ruleId, original);
  const diff = Diff.createTwoFilesPatch('before', 'after', original, updated);
  return diff;
}
