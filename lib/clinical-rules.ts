export type Condition =
  | { op: "all"; conditions: Condition[] }
  | { op: "any"; conditions: Condition[] }
  | { op: "not"; condition: Condition }
  | { op: "some"; path: string; where: Condition }
  | { op: "exists"; path: string }
  | { op: "eq" | "neq" | "contains" | "gte" | "lte"; path: string; value: unknown }
  | { op: "in"; path: string; values: unknown[] };

export type ClinicalRule = {
  id: string; version: string; status: "draft" | "active";
  title: string; message: string; effect: "information" | "review" | "urgent-review";
  when: Condition; requiredFacts: string[];
  source: { title: string; url: string; section?: string; reviewedAt: string };
  approvedBy: string; approvedAt: string;
};

export type RuleFinding = {
  ruleId: string; ruleVersion: string; effect: ClinicalRule["effect"];
  title: string; message: string; source: ClinicalRule["source"];
  clinicianMustReview: true;
};

export type RuleEvaluation = {
  evaluatedAt: string; ruleSetVersion: string; findings: RuleFinding[];
  missingContext: Array<{ ruleId: string; fields: string[] }>;
  unavailableRules: Array<{ ruleId: string; reason: string }>;
  coverage: "no-active-rules" | "partial" | "rules-evaluated";
};

function resolvePath(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((value, key) => {
    if (value === null || value === undefined || typeof value !== "object") return undefined;
    return (value as Record<string, unknown>)[key];
  }, root);
}
function isPresent(value: unknown): boolean { return value !== undefined && value !== null && value !== ""; }
function equal(a: unknown, b: unknown): boolean {
  if (typeof a === "string" && typeof b === "string") return a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase();
  return a === b;
}

export function matchesCondition(facts: Record<string, unknown>, condition: Condition): boolean {
  switch (condition.op) {
    case "all": return condition.conditions.length > 0 && condition.conditions.every((item) => matchesCondition(facts, item));
    case "any": return condition.conditions.some((item) => matchesCondition(facts, item));
    case "not": return !matchesCondition(facts, condition.condition);
    case "some": {
      const values = resolvePath(facts, condition.path);
      return Array.isArray(values) && values.some((item) => matchesCondition({ ...facts, $item: item }, condition.where));
    }
    case "exists": return isPresent(resolvePath(facts, condition.path));
    case "eq": return equal(resolvePath(facts, condition.path), condition.value);
    case "neq": return !equal(resolvePath(facts, condition.path), condition.value);
    case "in": return condition.values.some((candidate) => equal(resolvePath(facts, condition.path), candidate));
    case "contains": {
      const value = resolvePath(facts, condition.path);
      if (typeof value === "string" && typeof condition.value === "string") return value.toLocaleLowerCase().includes(condition.value.toLocaleLowerCase());
      return Array.isArray(value) && value.some((item) => equal(item, condition.value));
    }
    case "gte": {
      const value = Number(resolvePath(facts, condition.path)); const threshold = Number(condition.value);
      return Number.isFinite(value) && Number.isFinite(threshold) && value >= threshold;
    }
    case "lte": {
      const value = Number(resolvePath(facts, condition.path)); const threshold = Number(condition.value);
      return Number.isFinite(value) && Number.isFinite(threshold) && value <= threshold;
    }
  }
}
function publishabilityIssue(rule: ClinicalRule): string | null {
  if (rule.status !== "active") return "Правило не активировано.";
  if (!rule.approvedBy.trim() || !rule.approvedAt.trim()) return "Нет записи о врачебном утверждении.";
  if (!rule.source.title.trim() || !rule.source.url.trim() || !rule.source.reviewedAt.trim()) return "Нет проверяемого источника или даты его проверки.";
  return null;
}

/** Evaluates explicit approved rules only. No match does not mean treatment is safe. */
export function evaluateClinicalRules(facts: Record<string, unknown>, rules: ClinicalRule[], ruleSetVersion: string, evaluatedAt = new Date().toISOString()): RuleEvaluation {
  const findings: RuleFinding[] = [];
  const missingContext: RuleEvaluation["missingContext"] = [];
  const unavailableRules: RuleEvaluation["unavailableRules"] = [];
  let activeCount = 0;
  for (const rule of rules) {
    if (rule.status !== "active") continue;
    activeCount += 1;
    const issue = publishabilityIssue(rule);
    if (issue) { unavailableRules.push({ ruleId: rule.id, reason: issue }); continue; }
    const missing = rule.requiredFacts.filter((path) => !isPresent(resolvePath(facts, path)));
    if (missing.length) { missingContext.push({ ruleId: rule.id, fields: missing }); continue; }
    if (matchesCondition(facts, rule.when)) findings.push({
      ruleId: rule.id, ruleVersion: rule.version, effect: rule.effect,
      title: rule.title, message: rule.message, source: rule.source, clinicianMustReview: true,
    });
  }
  return {
    evaluatedAt, ruleSetVersion, findings, missingContext, unavailableRules,
    coverage: activeCount === 0 ? "no-active-rules" : missingContext.length || unavailableRules.length ? "partial" : "rules-evaluated",
  };
}
