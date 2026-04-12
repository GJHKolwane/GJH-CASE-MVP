import { evaluateEncounter } from "./clinicalDecision.service.js";
import { logDecision } from "./audit.service.js";

export async function processCase(caseData) {

  /*
  ========================================
  🧠 UNIFIED CLINICAL DECISION (SOURCE OF TRUTH)
  ========================================
  */
  const result = await evaluateEncounter({
    vitals: caseData.vitals,
    symptoms: caseData.symptoms,
    notes: caseData.notes
  });

  const { rules, finalSeverity, ai } = result;

  /*
  ========================================
  🚦 ROUTING LOGIC (DRIVEN BY SEVERITY)
  ========================================
  */
  let routing = {
    queue: "NORMAL",
    priority: "NORMAL"
  };

  let escalation = {
    status: false
  };

  if (finalSeverity === "CRITICAL") {
    routing = {
      queue: "EMERGENCY",
      priority: "STAT"
    };

    escalation = {
      status: true,
      type: "doctor_escalation",
      reason: rules?.triggers || []
    };
  } else if (finalSeverity === "HIGH") {
    routing = {
      queue: "URGENT",
      priority: "HIGH"
    };
  } else if (finalSeverity === "MEDIUM") {
    routing = {
      queue: "STANDARD",
      priority: "MEDIUM"
    };
  }

  /*
  ========================================
  🧾 AUDIT TRAIL (MEDICAL COMPLIANCE)
  ========================================
  */
  await logDecision({
    caseId: caseData.caseId,
    ai,
    rules,
    finalSeverity,
    routing,
    escalation,
    timestamp: new Date()
  });

  /*
  ========================================
  📦 FINAL RESPONSE (SYSTEM ALIGNED)
  ========================================
  */
  return {
    ...result,
    routing,
    escalation
  };
    }
