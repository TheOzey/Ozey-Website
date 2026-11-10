/**
 * Rule-version resolution, mirrored from origin/main:
 *   GroupRules.compare (lib/core/finance/group_rules.dart):
 *     effectiveFrom → revision → updatedAt → updatedByUid, ascending.
 * The version governing a period is the last one, in that order, whose
 * effectiveFrom is ≤ the period.
 */
import type { ShgRuleVersion } from "../types/index.ts";

export interface RuleVersionForOrdering extends ShgRuleVersion {
  updatedByUid: string;
}

export function compareRuleVersions(a: RuleVersionForOrdering, b: RuleVersionForOrdering): number {
  if (a.effectiveFrom !== b.effectiveFrom) return a.effectiveFrom < b.effectiveFrom ? -1 : 1;
  if (a.revision !== b.revision) return a.revision - b.revision;
  const at = a.updatedAt?.getTime() ?? 0;
  const bt = b.updatedAt?.getTime() ?? 0;
  if (at !== bt) return at - bt;
  return a.updatedByUid < b.updatedByUid ? -1 : a.updatedByUid > b.updatedByUid ? 1 : 0;
}

/** `sorted` must be ascending by compareRuleVersions. */
export function ruleVersionFor(sorted: readonly ShgRuleVersion[], period: string): ShgRuleVersion | null {
  let current: ShgRuleVersion | null = null;
  for (const version of sorted) {
    if (version.effectiveFrom <= period) current = version;
    else break;
  }
  return current;
}
