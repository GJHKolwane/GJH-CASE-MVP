import { callAIOrchestrator } from "../adapters/ai.router.js";
import { evaluateRisk } from "../engine/risk.engine.js";
import { logDecision } from "./audit.service.js";

export async function processCase(caseData) {
const aiResponse = await callAIOrchestrator({
symptoms: caseData.symptoms,
vitals: caseData.vitals,
patientId: caseData.patientId,
});

// 🧠 NEW: Risk Engine (MCP CONTROL)
const risk = evaluateRisk({
heartRate: caseData.vitals?.heartRate,
temperature: caseData.vitals?.temperature,
spo2: caseData.vitals?.spo2,
symptoms: caseData.symptoms,
aiSuggestion: aiResponse?.riskLevel, // must exist in AI response
});

// 🎯 FINAL DECISION (STANDARDIZED)
const decision = {
decision: risk.level === "CRITICAL" ? "ESCALATE" : "MONITOR",
level: risk.level,
reason: risk.reason,
source: risk.source,
};

// 🧾 AUDIT LOG (UNCHANGED)
await logDecision({
caseId: caseData.caseId,
ai: aiResponse,
decision,
timestamp: new Date(),
});

return {
ai: aiResponse,
decision,
};
}
