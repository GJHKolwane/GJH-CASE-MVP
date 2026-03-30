import { callAIOrchestrator } from "../adapters/aiClient.js";
import { applyDecisionRules } from "../engines/decision.engine.js";
import { logDecision } from "./audit.service.js";

export async function processCase(caseData) {
  // 1. Call AI
  const aiResponse = await callAIOrchestrator({
    symptoms: caseData.symptoms,
    vitals: caseData.vitals,
    patientId: caseData.patientId,
  });

  // 2. MCP DECISION ENGINE
  const decision = applyDecisionRules(caseData, aiResponse);

  // 3. AUDIT LOG
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
