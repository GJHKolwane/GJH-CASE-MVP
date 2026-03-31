// ✅ PURE JAVASCRIPT VERSION (NO TYPES)

// -----------------------------
// HARD RULES
// -----------------------------
function checkHardRules(input) {
const { spo2, heartRate } = input;

if (spo2 !== undefined && spo2 < 90) {
return {
level: "CRITICAL",
reason: "SpO2 below 90%",
source: "MCP",
};
}

if (spo2 !== undefined && spo2 < 94) {
return {
level: "HIGH",
reason: "SpO2 below 94%",
source: "MCP",
};
}

if (heartRate !== undefined && heartRate > 140) {
return {
level: "CRITICAL",
reason: "Extreme tachycardia",
source: "MCP",
};
}

return null;
}

// -----------------------------
// SEPSIS DETECTION
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
source: "MCP",
};
}

return null;
}

// -----------------------------
// BASE RISK SCORING
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
// AI INFLUENCE (LIMITED)
// -----------------------------
function applyAIInfluence(base, ai) {
if (!ai) return base;

if (base === "LOW" && ai === "HIGH") return "MEDIUM";
if (base === "MEDIUM" && ai === "HIGH") return "HIGH";

return base;
}

// -----------------------------
// MAIN ENGINE
// -----------------------------
export function evaluateRisk(input) {
const hardRule = checkHardRules(input);
if (hardRule) return hardRule;

const sepsis = checkSepsis(input);
if (sepsis) return sepsis;

const base = calculateBaseRisk(input);
const finalLevel = applyAIInfluence(base, input.aiSuggestion);

return {
level: finalLevel,
reason: "Multi-factor assessment",
source: input.aiSuggestion ? "HYBRID" : "MCP",
};
    }
