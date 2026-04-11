import { evaluateClinicalState } from "./clinicalRulesEngine.js";
import { runClinicalAI } from "./clinicalAI.js";

export async function evaluateEncounter({ vitals, symptoms, notes }) {

  // 🛡️ RULES ENGINE (SAFETY FIRST)
  const rules = evaluateClinicalState({
    vitals,
    symptoms
  });

  // 🧠 AI ENGINE
  const ai = await runClinicalAI({
    vitals,
    symptoms,
    notes
  });

  // =========================
  // 🔥 FUSION LOGIC
  // =========================

  let finalSeverity = "LOW";

  const normalize = (level) => level?.toUpperCase();

  const ruleSeverity = normalize(rules.severity);
  const aiSeverity = normalize(ai.riskLevel);

  // 🚨 RULE: NEVER DOWNGRADE SAFETY
  if (ruleSeverity === "CRITICAL" || aiSeverity === "HIGH") {
    finalSeverity = "HIGH";
  } else if (ruleSeverity === "HIGH" || aiSeverity === "MEDIUM") {
    finalSeverity = "MEDIUM";
  } else {
    finalSeverity = "LOW";
  }

  return {
    ai,
    rules,
    finalSeverity,
    triage: {
      severity: finalSeverity
    }
  };
}
