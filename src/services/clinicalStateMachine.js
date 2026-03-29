import axios from "axios";
import { evaluateTriage } from "./triageEngine.js";

/*
================================================
GJHEALTH STATE MACHINE (STRICT CLINICAL FLOW)
================================================
*/

const transitions = {
  created: ["intake_completed"],

  intake_completed: ["vitals_recorded"],

  vitals_recorded: ["symptoms_recorded"],

  symptoms_recorded: ["nurse_assessment_completed"],

  // 🔥 AUTO FLOW
  nurse_assessment_completed: ["awaiting_clinician_validation"],

  /*
  ========================================================
  🔥 CLINICIAN DECISION POINT (DIRECT BRANCHING)
  ========================================================
  */
  awaiting_clinician_validation: [
    "treatment_applied",
    "followup_scheduled",
    "doctor_escalation"
  ],

  /*
  ========================================================
  🩺 TREATMENT FLOW
  ========================================================
  */
  treatment_applied: ["followup_scheduled", "completed"],

  followup_scheduled: ["completed"],

  /*
  ========================================================
  👨‍⚕️ DOCTOR ENGINE
  ========================================================
  */
  doctor_escalation: ["doctor_consultation"],

  doctor_consultation: ["doctor_notes_added"],

  doctor_notes_added: ["doctor_decision"],

  doctor_decision: [
    "prescription_issued",
    "lab_ordered",
    "treatment_applied",
    "discharged",
    "admitted"
  ],

  /*
  ========================================================
  🔬 LAB FLOW
  ========================================================
  */
  lab_ordered: ["lab_result_received"],

  lab_result_received: ["doctor_reassessment"],

  doctor_reassessment: ["final_notes_completed"],

  final_notes_completed: ["completed"],

  prescription_issued: ["completed"],

  completed: []
};

/*
================================================
ACTION MAP
================================================
*/

export const actionMap = {
  intake: "intake_completed",
  vitals: "vitals_recorded",
  symptoms: "symptoms_recorded",
  nurse: "nurse_assessment_completed",

  // 🔥 HUMAN VALIDATION
  validate: "awaiting_clinician_validation",

  /*
  ========================================================
  🔥 DECISION ACTIONS (DIRECT)
  ========================================================
  */
  treat: "treatment_applied",
  followup: "followup_scheduled",
  escalate: "doctor_escalation",

  /*
  ========================================================
  👨‍⚕️ DOCTOR ENGINE
  ========================================================
  */
  doctor: "doctor_consultation",
  doctor_notes: "doctor_notes_added",
  doctor_decision: "doctor_decision",

  /*
  ========================================================
  🔁 OUTCOMES
  ========================================================
  */
  prescription: "prescription_issued",
  lab_order: "lab_ordered",
  treatment: "treatment_applied",
  discharge: "discharged",
  admit: "admitted",

  /*
  ========================================================
  🔬 LAB FLOW
  ========================================================
  */
  lab_result: "lab_result_received",
  reassess: "doctor_reassessment",
  final: "final_notes_completed"
};

/*
================================================
VALIDATION
================================================
*/

export function canTransition(current, next) {
  return transitions[current]?.includes(next);
}

export function enforceTransition(current, next) {
  const allowed = canTransition(current, next);

  if (!allowed) {
    console.error(`❌ INVALID: ${current} → ${next}`);
    return {
      allowed: false,
      error: `Invalid transition: ${current} → ${next}`
    };
  }

  return { allowed: true };
}

/*
================================================
AI TRIAGE SERVICE
================================================
*/

async function triggerTriage(caseData) {
  try {
    const res = await axios.post(
      "http://localhost:8087/triage/nurse",
      { case: caseData }
    );
    return res.data;
  } catch (err) {
    console.warn("⚠️ AI TRIAGE FALLBACK USED");
    return {
      severity: "medium",
      recommendation: "Further evaluation required"
    };
  }
}

/*
================================================
MAIN ENGINE
================================================
*/

export async function processCaseState(encounter, action, payload = {}) {
  let updated = { ...encounter };

  if (!updated.status) {
    updated.status = "created";
  }

  if (!updated.timeline) {
    updated.timeline = [];
  }

  const nextState = actionMap[action];

  if (!nextState) {
    throw new Error(`Unknown action: ${action}`);
  }

  /*
  ========================================================
  🚨 DOCTOR ACCESS CONTROL
  ========================================================
  */

  if (action === "doctor" && updated.status !== "doctor_escalation") {
    throw new Error("Doctor access denied — case not escalated");
  }

  /*
  ========================================================
  🔍 TRANSITION VALIDATION
  ========================================================
  */

  const check = enforceTransition(updated.status, nextState);

  if (!check.allowed) {
    throw new Error(check.error);
  }

  /*
  ========================================================
  🧠 AUTO AI TRIAGE (AFTER NURSE)
  ========================================================
  */

  if (updated.status === "nurse_assessment_completed") {
    console.log("🧠 AI TRIAGE + SOAN PIPELINE STARTED");

    const triage = evaluateTriage({
      vitals: updated.vitals,
      symptoms: updated.symptoms
    });

    updated.triage = triage;

    updated.soan = {
      subjective: updated.symptoms || {},
      objective: updated.vitals || {},
      assessment: triage,
      plan: "Doctor review required"
    };

    updated.timeline.push({
      event: "AI triage + SOAN generated",
      timestamp: new Date().toISOString()
    });

    updated.status = "awaiting_clinician_validation";

    console.log("✅ AI COMPLETE → awaiting_clinician_validation");

    return updated;
  }

  /*
  ========================================================
  🧾 APPLY PAYLOAD DATA
  ========================================================
  */

  updated = {
    ...updated,
    ...payload
  };

  /*
  ========================================================
  📊 TIMELINE EVENTS
  ========================================================
  */

  const eventMap = {
    intake: "Patient intake completed",
    vitals: "Vitals recorded",
    symptoms: "Symptoms recorded",
    nurse: "Nurse assessment completed",
    validate: "Clinician validation completed",

    treat: "Treatment applied",
    followup: "Follow-up scheduled",
    escalate: "Case escalated to doctor",

    doctor: "Doctor consultation started",
    doctor_notes: "Doctor notes added",
    doctor_decision: "Doctor decision made",

    prescription: "Prescription issued",
    lab_order: "Lab ordered",
    lab_result: "Lab result received",
    reassess: "Doctor reassessment",
    final: "Final notes completed"
  };

  if (eventMap[action]) {
    updated.timeline.push({
      event: eventMap[action],
      timestamp: new Date().toISOString()
    });
  }

  /*
  ========================================================
  🔄 STATE TRANSITION
  ========================================================
  */

  updated.status = nextState;

  return updated;
                                       }
