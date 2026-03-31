export function applyDecisionRules(caseData, ai) {
  const heartRate = caseData.vitals?.heartRate;
  const severity = caseData.triage?.severity?.toUpperCase();
  const aiRisk = ai?.riskLevel?.toUpperCase();
  const aiConfidence = ai?.confidence || 0;

  /*
  ========================================
  🚨 HARD CLINICAL RULES (TOP PRIORITY)
  ========================================
  */
  if (heartRate > 130) {
    return {
      action: "EMERGENCY_ESCALATION",
      reason: "Tachycardia threshold exceeded",
      source: "MCP_HARD_RULE",
    };
  }

  /*
  ========================================
  🚨 TRIAGE SEVERITY (SYSTEM SAFETY LAYER)
  ========================================
  */
  if (severity === "CRITICAL") {
    return {
      action: "EMERGENCY_ESCALATION",
      reason: "Critical severity detected",
      source: "MCP_TRIAGE",
    };
  }

  if (severity === "HIGH") {
    return {
      action: "ESCALATE",
      reason: "High severity detected",
      source: "MCP_TRIAGE",
    };
  }

  /*
  ========================================
  🤖 AI ASSIST (SECONDARY)
  ========================================
  */
  if (aiRisk === "HIGH" && aiConfidence > 0.7) {
    return {
      action: "PRIORITY_REVIEW",
      reason: Array.isArray(ai.explanation)
        ? ai.explanation.join("; ")
        : ai.explanation,
      source: "AI_ASSISTED",
    };
  }

  /*
  ========================================
  🟢 DEFAULT
  ========================================
  */
  return {
    action: "STANDARD_QUEUE",
    reason: "No critical indicators",
    source: "MCP_DEFAULT",
  };
}
