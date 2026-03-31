export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface RiskInput {
  heartRate?: number;
  temperature?: number;
  spo2?: number;
  symptoms?: string[];
  aiSuggestion?: RiskLevel;
}

export interface RiskOutput {
  level: RiskLevel;
  reason: string;
  source: "MCP" | "AI" | "HYBRID";
}

function checkHardRules(input: RiskInput): RiskOutput | null {
  const { spo2, heartRate, temperature } = input;

  // 🚨 Oxygen critical
  if (spo2 !== undefined && spo2 < 90) {
    return {
      level: "CRITICAL",
      reason: "SpO2 below 90%",
      source: "MCP",
    };
  }

  // ⚠️ Oxygen warning
  if (spo2 !== undefined && spo2 < 94) {
    return {
      level: "HIGH",
      reason: "SpO2 below 94%",
      source: "MCP",
    };
  }

  // 🚨 Extreme heart rate
  if (heartRate !== undefined && heartRate > 140) {
    return {
      level: "CRITICAL",
      reason: "Extreme tachycardia",
      source: "MCP",
    };
  }

  return null;
}

function checkSepsis(input: RiskInput): RiskOutput | null {
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
      source: "MCP",
    };
  }

  return null;
}

function calculateBaseRisk(input: RiskInput): RiskLevel {
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
function applyAIInfluence(
  base: RiskLevel,
  ai?: RiskLevel
): RiskLevel {
  if (!ai) return base;

  // AI influence limited
  if (base === "LOW" && ai === "HIGH") return "MEDIUM";
  if (base === "MEDIUM" && ai === "HIGH") return "HIGH";

  return base;
}

export function evaluateRisk(input: RiskInput): RiskOutput {
  // 1️⃣ HARD RULES FIRST
  const hardRule = checkHardRules(input);
  if (hardRule) return hardRule;

  // 2️⃣ SYNDROME CHECK
  const sepsis = checkSepsis(input);
  if (sepsis) return sepsis;

  // 3️⃣ BASE SCORING
  const base = calculateBaseRisk(input);

  // 4️⃣ AI INFLUENCE
  const finalLevel = applyAIInfluence(base, input.aiSuggestion);

  return {
    level: finalLevel,
    reason: "Multi-factor assessment",
    source: input.aiSuggestion ? "HYBRID" : "MCP",
  };
}
