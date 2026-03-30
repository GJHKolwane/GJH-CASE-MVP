import { callAIOrchestrator } from "../adapters/aiClient.js";
import { applyDecisionRules } from "../engines/decision.engine.js";
import { logDecision } from "./audit.service.js";

export async function processCase(caseData) {
  const aiResponse = await callAIOrchestrator({
    symptoms: caseData.symptoms,
    vitals: caseData.vitals,
    patientId: caseData.patientId,
  });

  const decision = applyDecisionRules(caseData, aiResponse);

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
