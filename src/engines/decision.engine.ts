export function applyDecisionRules(caseData, ai) {
  if (caseData.vitals?.heartRate > 130) {
    return {
      action: "EMERGENCY_ESCALATION",
      reason: "Tachycardia threshold exceeded",
      source: "MCP_HARD_RULE",
    };
  }

  if (ai.riskLevel === "high" && ai.confidence > 0.7) {
    return {
      action: "PRIORITY_REVIEW",
      reason: ai.explanation,
      source: "AI_ASSISTED",
    };
  }

  return {
    action: "STANDARD_QUEUE",
    reason: "No critical indicators",
    source: "MCP_DEFAULT",
  };
}
