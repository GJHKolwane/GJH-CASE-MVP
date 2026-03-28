import axios from "axios";

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

  nurse_assessment_completed: ["ai_triage_completed"],

  ai_triage_completed: ["soan_generated"],

  // 🔥 HUMAN IN THE LOOP (FIXED)
  soan_generated: ["awaiting_clinician_validation"],

  awaiting_clinician_validation: [
    "decision_pending",
    "doctor_escalation"
  ],

  decision_pending: [
    "treatment_applied",
    "doctor_escalation"
  ],

  treatment_applied: ["followup_scheduled"],

  followup_scheduled: ["completed"],

  doctor_escalation: ["doctor_consultation"],

  doctor_consultation: ["doctor_notes_added"],

  doctor_notes_added: ["doctor_decision"],

  doctor_decision: [
    "prescription_issued",
    "lab_ordered"
  ],

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
  triage: "ai_triage_completed",
  soan: "soan_generated",

  // 🔥 NEW STEP
  validate: "awaiting_clinician_validation",

  decision: "decision_pending",
  treat: "treatment_applied",
  followup: "followup_scheduled",
  escalate: "doctor_escalation",
  doctor_notes: "doctor_notes_added",
  doctor_decision: "doctor_decision",
  prescription: "prescription_issued",
  lab_order: "lab_ordered",
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
AI TRIAGE (AUTO)
================================================
*/

async function triggerTriage(caseData) {
  try {
    const res = await axios.post(
      "http://localhost:8087/triage/nurse",
      { case: caseData }
    );
    return res.data;
  } catch {
    return { severity: "MEDIUM", note: "fallback" };
  }
}

/*
================================================
MAIN ENGINE
================================================
*/

export async function processCaseState(encounter) {
  let updated = { ...encounter };

  if (!updated.status) {
    updated.status = "created";
  }

  /*
  AUTO TRIAGE
  */

  if (
    updated.vitals &&
    updated.symptoms &&
    !updated.triage &&
    updated.status === "nurse_assessment_completed"
  ) {
    const check = enforceTransition(
      updated.status,
      actionMap.triage
    );

    if (check.allowed) {
      const triage = await triggerTriage(updated);

      updated.triage = triage;
      updated.status = actionMap.triage;
    }
  }

  /*
  AUTO SOAN (NOW WAITS FOR HUMAN)
  */

  if (updated.triage && updated.status === "ai_triage_completed") {
    updated.soan = {
      subjective: updated.symptoms,
      objective: updated.vitals,
      assessment: updated.triage,
      plan: "Awaiting clinician validation"
    };

    updated.status = actionMap.soan;
  }

  return updated;
}
