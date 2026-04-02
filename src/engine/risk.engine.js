// ========================================
// 🧠 GJHEALTH CLINICAL RISK ENGINE (FINAL)
// ========================================


// -----------------------------
// 🚨 HARD RULES (TOP PRIORITY)
// -----------------------------
function checkHardRules(input) {
  const { spo2, heartRate } = input;

  if (spo2 !== undefined && spo2 < 90) {
    return {
      level: "CRITICAL",
      reason: "SpO2 below 90%",
      source: "MCP_HARD_RULE",
    };
  }

  if (spo2 !== undefined && spo2 < 94) {
    return {
      level: "HIGH",
      reason: "SpO2 below 94%",
      source: "MCP_HARD_RULE",
    };
  }

  if (heartRate !== undefined && heartRate > 140) {
    return {
      level: "CRITICAL",
      reason: "Extreme tachycardia",
      source: "MCP_HARD_RULE",
    };
  }

  return null;
}


// -----------------------------
// 🧪 SEPSIS DETECTION
// -----------------------------
function checkSepsis(input) {
  const { heartRate, temperature } = input;

  if (
    temperature !== undefined &&
    heartRate !== undefined &&
    temperature > 38 &&
    heartRate > 100
  ) {
    return {
      level: "HIGH",
      reason: "Possible sepsis (fever + tachycardia)",
      source: "MCP_SEPSIS_RULE",
    };
  }

  return null;
}


// -----------------------------
// 📊 BASE RISK SCORING
// -----------------------------
function calculateBaseRisk(input) {
  let score = 0;

  if (input.heartRate && input.heartRate > 100) score += 2;
  if (input.temperature && input.temperature > 38) score += 2;
  if (input.spo2 && input.spo2 < 95) score += 3;

  if (input.symptoms?.includes("chest pain")) score += 3;
  if (input.symptoms?.includes("shortness of breath")) score += 3;

  if (score >= 6) return "HIGH";
  if (score >= 3) return "MEDIUM";
  return "LOW";
}


// -----------------------------
// 🤖 AI INFLUENCE (CONTROLLED)
// -----------------------------
function applyAIInfluence(base, aiRisk, confidence) {
  if (!aiRisk) return base;

  // Only trust AI if confidence is strong
  if (confidence < 0.7) return base;

  if (base === "LOW" && aiRisk === "HIGH") return "MEDIUM";
  if (base === "MEDIUM" && aiRisk === "HIGH") return "HIGH";

  return base;
}


// -----------------------------
// 🔥 FINAL ENGINE
// -----------------------------
export function evaluateRisk(input) {
  // 🔹 1. HARD RULES FIRST
  const hardRule = checkHardRules(input);
  if (hardRule) return hardRule;

  // 🔹 2. SEPSIS CHECK
  const sepsis = checkSepsis(input);
  if (sepsis) return sepsis;

  // 🔹 3. BASE SCORE
  const base = calculateBaseRisk(input);

  // 🔹 4. AI INFLUENCE
  const aiRisk = input.aiRisk?.toUpperCase();
  const aiConfidence = input.aiConfidence || 0;

  const finalLevel = applyAIInfluence(base, aiRisk, aiConfidence);

  return {
    level: finalLevel,
    reason: "Multi-factor clinical assessment",
    source: aiRisk ? "HYBRID_AI_MCP" : "MCP_BASE",
  };
}


// -----------------------------
// 🚨 ESCALATION DECISION
// -----------------------------
export function shouldEscalate(level) {
  return level === "HIGH" || level === "CRITICAL";
      }
