/*
================================================
CLINICAL STATE MACHINE (ENFORCED + INTELLIGENCE)
================================================
*/

import axios from "axios";
import { updateCaseStatus } from "@gjh/shared/governance/caseState";

/*
================================================
STATE TRANSITIONS (UPDATED STRICT FLOW)
================================================
*/

const transitions = {
  created: ["vitals_recorded"],

  vitals_recorded: ["symptoms_recorded"],

  symptoms_recorded: ["ai_triage_completed"],

  ai_triage_completed: ["doctor_consultation"],

  doctor_consultation: ["treatment_decision"],

  treatment_decision: ["lab_ordered", "completed"],

  lab_ordered: ["lab_result_received"],

  lab_result_received: ["doctor_consultation", "completed"],

  completed: []
};

/*
================================================
ACTION MAP (NEW)
================================================
*/

export const actionMap = {
  vitals: "vitals_recorded",
  symptoms: "symptoms_recorded",
  triage: "ai_triage_completed",
  notes: "doctor_consultation",
  treatment: "treatment_decision",
  lab_order: "lab_ordered",
  lab_result: "lab_result_received"
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
ENFORCEMENT FUNCTION (CRITICAL)
================================================
*/

export function enforceTransition(currentState, nextState) {
  const allowed = canTransition(currentState, nextState);

  if (!allowed) {
    console.error(`❌ INVALID TRANSITION: ${currentState} → ${nextState}`);

    return {
      allowed: false,
      error: `Invalid transition: ${currentState} → ${nextState}`
    };
  }

  return { allowed: true };
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
TRIGGER AI TRIAGE (FIXED PORT)
================================================
*/

async function triggerTriage(patientCase) {
  try {
    const response = await axios.post(
      "http://localhost:8087/triage/nurse",
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
ESCALATION TRIGGER (SAFE)
================================================
*/

async function triggerEscalation(patientCase) {
  try {
    await axios.post(
      "http://localhost:8081/escalate",
      { case: patientCase }
    );
  } catch (error) {
    console.warn("⚠️ Escalation fallback activated", error.message);
  }
}

/*
================================================
SIGNATURE VALIDATION
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
LAB IMPACT ANALYSIS
================================================
*/

function analyzeLabImpact(patientCase) {
  const results = patientCase?.labs?.results || [];

  if (!results.length) return null;

  const validResults = results.filter(hasLabTechSignature);

  if (!validResults.length) {
    console.warn("⚠️ Lab results missing signature");
    return null;
  }

  const abnormal = validResults.find(
    r => r.interpretation === "high" || r.interpretation === "low"
  );

  if (abnormal) {
    return {
      requiresDoctor: true,
      severity: "HIGH",
      reason: "Abnormal lab result detected"
    };
  }

  return { requiresDoctor: false };
}

/*
================================================
MAIN STATE ENGINE (NOW ENFORCED)
================================================
*/

export async function processCaseState(patientCase) {

  let updatedCase = { ...patientCase };

  /*
  --------------------------------------------
  🔒 STATE ENFORCEMENT CORE
  --------------------------------------------
  */

  if (!updatedCase.status) {
    updatedCase.status = "created";
  }

  /*
  --------------------------------------------
  AUTO TRIAGE
  --------------------------------------------
  */

  if (shouldTriggerTriage(updatedCase)) {

    const check = enforceTransition(
      updatedCase.status,
      actionMap.triage
    );

    if (check.allowed) {
      console.log("⚡ Auto-triggering AI triage...");

      const triage = await triggerTriage(updatedCase);

      updatedCase.triage = triage;
      updatedCase.status = actionMap.triage;
    }
  }

  /*
  --------------------------------------------
  LAB IMPACT
  --------------------------------------------
  */

  const labImpact = analyzeLabImpact(updatedCase);

  if (labImpact?.requiresDoctor) {

    const check = enforceTransition(
      updatedCase.status,
      "doctor_consultation"
    );

    if (check.allowed) {
      console.log("🧪 Lab-triggered escalation");

      updatedCase.status = "doctor_consultation";

      await triggerEscalation(updatedCase);
    }
  }

  /*
  --------------------------------------------
  TRIAGE ESCALATION
  --------------------------------------------
  */

  if (
    updatedCase?.triage?.severity === "HIGH" ||
    updatedCase?.triage?.severity === "CRITICAL"
  ) {

    console.log("🚨 Escalation triggered from triage!");

    await triggerEscalation(updatedCase);
  }

  return updatedCase;
}
