import { evaluateClinicalState } from "./clinicalRulesEngine.js";
import { runClinicalAI } from "./clinicalAI.js";

export async function evaluateEncounter({ vitals, symptoms, notes }) {

  // =========================
  // 🔥 NORMALIZE INPUT (CRITICAL FIX)
  // =========================
  const normalizedVitals = vitals?.vitals || vitals;

  // =========================
  // 🛡️ RULES ENGINE (PRIMARY SAFETY)
  // =========================
  const rules = evaluateClinicalState({
    vitals: normalizedVitals,
    symptoms
  });

  // =========================
  // 🧠 AI ENGINE (ASSISTIVE)
  // =========================
  const ai = await runClinicalAI({
    vitals: normalizedVitals,
    symptoms,
    notes
  });

  // =========================
  // 🔥 FUSION LOGIC (NO DOWNGRADE)
  // =========================
  let finalSeverity = "LOW";

  const normalize = (level) => level?.toUpperCase();

  const ruleSeverity = normalize(rules?.severity);
  const aiSeverity = normalize(ai?.riskLevel);

  if (ruleSeverity === "CRITICAL") {
    finalSeverity = "CRITICAL";
  } else if (ruleSeverity === "HIGH" || aiSeverity === "HIGH") {
    finalSeverity = "HIGH";
  } else if (ruleSeverity === "MEDIUM" || aiSeverity === "MEDIUM") {
    finalSeverity = "MEDIUM";
  } else {
    finalSeverity = "LOW";
  }

  // =========================
  // 📦 RETURN UNIFIED DECISION
  // =========================
  return {
    ai,
    rules,
    finalSeverity,
    triage: {
      severity: finalSeverity
    }
  };
}
