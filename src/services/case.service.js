import { callAIOrchestrator } from "./aiOrchestrator.client.js";
import { evaluateRisk } from "../engine/risk.engine.js";
import { logDecision } from "./audit.service.js";

export async function processCase(caseData) {
  /*
  ========================================
  🧠 PREP INPUT FOR AI
  ========================================
  */
  const inputText = `
  Patient presents with:
  Symptoms: ${JSON.stringify(caseData.symptoms || [])}
  Vitals: ${JSON.stringify(caseData.vitals || {})}
  `;

  /*
  ========================================
  🤖 CALL AI ORCHESTRATOR
  ========================================
  */
  const aiResponse = await callAIOrchestrator({
    inputText,
    symptoms: caseData.symptoms,
    vitals: caseData.vitals,
    encounterId: caseData.caseId, // 🔥 important mapping
  });

  /*
  ========================================
  🧠 MCP RISK ENGINE (FINAL AUTHORITY)
  ========================================
  */
  const risk = evaluateRisk({
    heartRate: caseData.vitals?.heartRate,
    temperature: caseData.vitals?.temperature,
    spo2: caseData.vitals?.spo2,
    symptoms: caseData.symptoms,
    aiSuggestion: aiResponse?.riskLevel, // AI is advisory only
  });

  /*
  ========================================
  🎯 FINAL GOVERNED DECISION
  ========================================
  */
  const decision = {
    decision: risk.level === "CRITICAL" ? "ESCALATE" : "MONITOR",
    level: risk.level,
    reason: risk.reason,
    source: risk.source, // 🔥 shows if AI or rules influenced it
  };

  /*
  ========================================
  🧾 AUDIT TRAIL (CRITICAL FOR MEDICAL SYSTEMS)
  ========================================
  */
  await logDecision({
    caseId: caseData.caseId,
    ai: aiResponse,
    decision,
    timestamp: new Date(),
  });

  /*
  ========================================
  📦 FINAL RESPONSE
  ========================================
  */
  return {
    ai: aiResponse,
    decision,
  };
}
