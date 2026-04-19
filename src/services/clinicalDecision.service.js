// src/services/clinicalDecision.service.js

import { evaluateClinicalState } from "./clinicalRulesEngine.js";
import { runClinicalAI } from "./clinicalAI.js";

export async function evaluateEncounter(encounterData = {}) {

  const {
    intake = {},
    vitals = {},
    symptoms = [],
    notes = ""
  } = encounterData;

  // ========================================
  // 🔹 NORMALIZATION (STRICT)
  // ========================================

  const normalizedVitals = vitals?.vitals || vitals || {};
  const normalizedSymptoms = Array.isArray(symptoms) ? symptoms : [];
  const normalizedNotes = notes || "";

  // ========================================
  // 🛡️ RULES ENGINE (PRIMARY SAFETY)
  // ========================================

  const rules = evaluateClinicalState({
    vitals: normalizedVitals,
    symptoms: normalizedSymptoms,
    intake
  });

  // ========================================
  // 🧠 AI ENGINE (CONTEXT-AWARE)
  // ========================================

  const ai = await runClinicalAI({
    vitals: normalizedVitals,
    symptoms: normalizedSymptoms,
    notes: normalizedNotes,
    intake
  });

  // ========================================
  // 🔥 FUSION LOGIC (SAFE + TRACEABLE)
  // ========================================

  const normalize = (level) => level?.toUpperCase();

  const ruleSeverity = normalize(rules?.severity);
  const aiSeverity = normalize(ai?.riskLevel);

  let finalSeverity = "LOW";

  if (ruleSeverity === "CRITICAL") {
    finalSeverity = "CRITICAL";
  } else if (ruleSeverity === "HIGH" || aiSeverity === "HIGH") {
    finalSeverity = "HIGH";
  } else if (ruleSeverity === "MEDIUM" || aiSeverity === "MEDIUM") {
    finalSeverity = "MEDIUM";
  }

  // ========================================
  // ⚠️ DISAGREEMENT TRACKING (IMPORTANT)
  // ========================================

  const disagreement =
    ruleSeverity !== aiSeverity
      ? {
          rule: ruleSeverity,
          ai: aiSeverity
        }
      : null;

  // ========================================
  // 🚨 ESCALATION LOGIC (FOR NURSE ENGINE)
  // ========================================

  const escalation =
    finalSeverity === "HIGH" || finalSeverity === "CRITICAL";

  // ========================================
  // 📦 RETURN (ALIGNED WITH NURSE ENGINE)
  // ========================================

  return {
    ai,
    rules,
    finalSeverity,

    triage: {
      severity: finalSeverity,
      escalation
    },

    meta: {
      disagreement
    }
  };
}
