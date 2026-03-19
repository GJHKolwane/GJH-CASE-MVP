/*
================================================
CLINICAL STATE MACHINE
================================================
Controls allowed encounter workflow transitions
NOW ENHANCED WITH:
- Auto AI triage triggering
- Escalation logic
- Case state updates
*/

import axios from "axios";
import { updateCaseStatus } from "@gjh/shared/governance/caseState";

/*
================================================
STATE TRANSITIONS
================================================
*/

const transitions = {
  created: ["nurse_assessment"],

  nurse_assessment: ["ai_triage_completed"],

  ai_triage_completed: ["soan_generated"],

  soan_generated: ["doctor_escalated"],

  doctor_escalated: ["doctor_consultation"],

  doctor_consultation: ["treatment_decision"],

  treatment_decision: ["prescription_issued"],

  prescription_issued: ["completed"],
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
      "http://localhost:5050/triage/nurse", // 🔁 adjust if needed
      { case: patientCase }
    );

    return response.data;
  } catch (error) {
    console.error("AI TRIAGE ERROR:", error.message);

    // fallback safety
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
      "http://localhost:8081/escalate", // 🔁 adjust port if needed
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
