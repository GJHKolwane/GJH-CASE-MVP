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
  // 🔹 NORMALIZATION
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
  // 🧠 AI ENGINE
  // ========================================

  const ai = await runClinicalAI({
    vitals: normalizedVitals,
    symptoms: normalizedSymptoms,
    notes: normalizedNotes,
    intake
  });

  // ========================================
  // 🔹 AI NORMALIZATION (FIXED)
  // ========================================

  const normalizeRule = (level) => level?.toUpperCase();

  const normalizeAI = (level) => {
    if (!level) return null;
    const l = level.toLowerCase();

    if (l.includes("critical")) return "CRITICAL";
    if (l.includes("high")) return "HIGH";
    if (l.includes("medium")) return "MEDIUM";
    return "LOW";
  };

  const ruleSeverity = normalizeRule(rules?.severity);
  const aiSeverity = normalizeAI(ai?.riskLevel);

  // ========================================
  // 🔥 FUSION LOGIC (SAFE)
  // ========================================

  let finalSeverity = "LOW";

  if (ruleSeverity === "CRITICAL") {
    finalSeverity = "CRITICAL";
  } else if (ruleSeverity === "HIGH" || aiSeverity === "HIGH") {
    finalSeverity = "HIGH";
  } else if (ruleSeverity === "MEDIUM" || aiSeverity === "MEDIUM") {
    finalSeverity = "MEDIUM";
  }

  // ========================================
  // ⚠️ DISAGREEMENT TRACKING
  // ========================================

  const disagreement =
    ruleSeverity !== aiSeverity
      ? {
          rule: ruleSeverity,
          ai: aiSeverity
        }
      : null;

  // ========================================
  // 🚨 ESCALATION
  // ========================================

  const escalation =
    finalSeverity === "HIGH" || finalSeverity === "CRITICAL";

  // ========================================
  // 📦 RETURN
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
