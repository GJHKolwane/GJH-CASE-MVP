import { callAIOrchestrator } from "../adapters/aiClient";
import { applyDecisionRules } from "../engines/decision.engine.js";
import { logDecision } from "./audit.service.js";

export async function processCase(caseData: any) {
  // 1. Call AI (NO DECISION HERE)
  const aiResponse = await callAIOrchestrator({
    symptoms: caseData.symptoms,
    vitals: caseData.vitals,
    patientId: caseData.patientId,
  });

  // 2. MCP DECISION ENGINE (YOU CONTROL THIS)
  const decision = applyDecisionRules(caseData, aiResponse);
  const decision = applyDecisionRules(caseData, aiResponse);
  

  // 3. AUDIT LOG (MANDATORY)
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
