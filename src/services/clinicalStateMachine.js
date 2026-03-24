/*
================================================
CLINICAL STATE MACHINE
================================================
Controls allowed encounter workflow transitions

ENHANCED WITH:
- Auto AI triage triggering
- Escalation logic
- Case state updates
- AI + DOCTOR COLLABORATIVE SOAN FLOW
- FULL PRESCRIPTION → PHARMACY FLOW
*/

import axios from "axios";
import { updateCaseStatus } from "@gjh/shared/governance/caseState";

/*
================================================
STATE TRANSITIONS (FULL GOVERNANCE FLOW)
================================================
*/

const transitions = {
  created: ["nurse_assessment"],

  nurse_assessment: ["ai_triage_completed"],

  ai_triage_completed: ["soan_generated"],

  soan_generated: ["doctor_escalated"],

  doctor_escalated: ["doctor_consultation"],

  /*
  =================================================
  🔥 AI + DOCTOR SOAN FLOW (NEW)
  =================================================
  */

  // Doctor starts consultation → AI draft
  doctor_consultation: ["draft_soan_generated"],

  // AI draft ready → waiting for doctor input
  draft_soan_generated: ["awaiting_doctor_review"],

  // Doctor reviewed → final SOAN completed
  awaiting_doctor_review: ["final_soan_completed"],

  // Final SOAN → proceed to treatment
  final_soan_completed: ["treatment_decision"],

  /*
  =================================================
  TREATMENT → PHARMACY FLOW
  =================================================
  */

  treatment_decision: ["prescription_issued"],

  prescription_issued: ["pharmacy_processing"],

  pharmacy_processing: ["completed"],
};

/*
================================================
VALIDATE TRANSITION
================================================
*/

export function canTransition(currentState, nextState) {
  const allowed = transitions[currentState] || [];
  return allowed.includes(nextState);
}

/*
================================================
AUTO TRIAGE CHECK
================================================
*/

function shouldTriggerTriage(patientCase) {
  return (
    patientCase?.vitals &&
    patientCase?.symptoms &&
    !patientCase?.triage
  );
}

/*
================================================
TRIGGER AI TRIAGE
================================================
*/

async function triggerTriage(patientCase) {
  try {
    const response = await axios.post(
      "http://localhost:5050/triage/nurse",
      { case: patientCase }
    );

    return response.data;

  } catch (error) {

    console.error("AI TRIAGE ERROR:", error.message);

    // ✅ SAFE FALLBACK
    return {
      assessment: "AI unavailable",
      severity: "MEDIUM",
      confidence: 0.5,
      recommendations: ["Manual review required"],
    };
  }
}

/*
================================================
ESCALATION TRIGGER
================================================
*/

async function triggerEscalation(patientCase) {
  try {
    await axios.post(
      "http://localhost:8081/escalate",
      { case: patientCase }
    );
  } catch (error) {
    console.error("ESCALATION ERROR:", error.message);
  }
}

/*
================================================
MAIN STATE ENGINE
================================================
*/

export async function processCaseState(patientCase) {

  let updatedCase = { ...patientCase };

  /*
  --------------------------------------------
  AUTO TRIAGE
  --------------------------------------------
  */

  if (shouldTriggerTriage(updatedCase)) {

    console.log("⚡ Auto-triggering AI triage...");

    const triage = await triggerTriage(updatedCase);

    updatedCase.triage = triage;

    updatedCase = updateCaseStatus(updatedCase, "TRIAGED");

    console.log("✅ Case TRIAGED:", triage.severity);
  }

  /*
  --------------------------------------------
  ESCALATION LOGIC
  --------------------------------------------
  */

  if (
    updatedCase?.triage?.severity === "HIGH" ||
    updatedCase?.triage?.severity === "CRITICAL"
  ) {

    console.log("🚨 Escalation triggered!");

    updatedCase = updateCaseStatus(updatedCase, "ESCALATED");

    await triggerEscalation(updatedCase);
  }

  return updatedCase;
}
