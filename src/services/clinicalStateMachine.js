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
- 🧪 LAB INTELLIGENCE INTEGRATION
- 🔥 SIGNATURE GOVERNANCE ENFORCEMENT (NEW)
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
  🔥 AI + DOCTOR SOAN FLOW
  =================================================
  */

  doctor_consultation: ["draft_soan_generated"],

  draft_soan_generated: ["awaiting_doctor_review"],

  awaiting_doctor_review: ["final_soan_completed"],

  final_soan_completed: ["treatment_decision"],

  /*
  =================================================
  🧪 LAB LOOP (NEW GOVERNANCE AWARE)
  =================================================
  */

  treatment_decision: ["prescription_issued", "lab_ordered"],

  lab_ordered: ["lab_result_received"],

  lab_result_received: ["awaiting_doctor_review"],

  /*
  =================================================
  PHARMACY FLOW
  =================================================
  */

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
🔥 SIGNATURE VALIDATION HELPERS (NEW)
================================================
*/

function hasDoctorSignature(order) {
  return order?.requestedBy?.doctorId;
}

function hasLabTechSignature(result) {
  return result?.recordedBy?.labTechId;
}

/*
================================================
🧪 LAB IMPACT ANALYSIS (ENHANCED)
================================================
*/

function analyzeLabImpact(patientCase) {
  const results = patientCase?.labs?.results || [];

  if (!results.length) return null;

  // 🔥 FILTER ONLY VALID (SIGNED) RESULTS
  const validResults = results.filter(hasLabTechSignature);

  if (!validResults.length) {
    console.warn("⚠️ Lab results found but missing labTech signature");
    return null;
  }

  // Detect abnormal results
  const abnormal = validResults.find(
    r => r.interpretation === "high" || r.interpretation === "low"
  );

  if (abnormal) {
    return {
      requiresDoctor: true,
      severity: "HIGH",
      reason: "Abnormal lab result detected",
      abnormalResult: abnormal
    };
  }

  return {
    requiresDoctor: false
  };
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
  🧪 LAB GOVERNANCE CHECK (NEW)
  --------------------------------------------
  */

  const labOrders = updatedCase?.labs?.orders || [];

  const unsignedOrders = labOrders.filter(
    o => !hasDoctorSignature(o)
  );

  if (unsignedOrders.length) {
    console.warn("⚠️ Found lab orders without doctor signature — ignored");
  }

  /*
  --------------------------------------------
  🧪 LAB IMPACT LOGIC
  --------------------------------------------
  */

  const labImpact = analyzeLabImpact(updatedCase);

  if (labImpact?.requiresDoctor) {

    console.log("🧪 Lab-triggered escalation:", labImpact.reason);

    updatedCase = updateCaseStatus(updatedCase, "ESCALATED");

    await triggerEscalation(updatedCase);
  }

  /*
  --------------------------------------------
  ESCALATION (TRIAGE-BASED)
  --------------------------------------------
  */

  if (
    updatedCase?.triage?.severity === "HIGH" ||
    updatedCase?.triage?.severity === "CRITICAL"
  ) {

    console.log("🚨 Escalation triggered from triage!");

    updatedCase = updateCaseStatus(updatedCase, "ESCALATED");

    await triggerEscalation(updatedCase);
  }

  return updatedCase;
      }
