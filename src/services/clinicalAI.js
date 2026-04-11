import { evaluateClinicalState } from "./clinicalRulesEngine.js";

/*
================================================
CLINICAL AI LAYER (NON-DUPLICATING)
================================================

ROLE:
- Calls rules engine (source of truth)
- Adds AI metadata (future-ready)
- DOES NOT override decisions
================================================
*/

export async function runClinicalAI({ vitals = {}, symptoms = [] }) {

  console.log("🧠 AI Layer → delegating to Rules Engine");

  // 🧠 SINGLE SOURCE OF TRUTH
  const rules = evaluateClinicalState({
    vitals,
    symptoms,
  });

  // 🔄 NORMALIZE OUTPUT TO NEW SYSTEM FORMAT
  const severityMap = {
    low: "LOW",
    high: "HIGH",
    critical: "HIGH", // critical → HIGH for frontend consistency
  };

  const finalSeverity = severityMap[rules.severity] || "LOW";

  return {
    encounter_data: {
      finalSeverity,
    },
    rules: {
      triggers: rules.triggers,
      autoDecision: rules.autoDecision,
    },
    ai: {
      source: "rules_engine",
      confidence: "HIGH",
    },
  };
}
