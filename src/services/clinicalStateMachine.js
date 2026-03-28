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

  // 🔥 AUTO FLOW (NO MANUAL BREAK)
  nurse_assessment_completed: ["awaiting_clinician_validation"],

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

  // 🔥 HUMAN ENTRY POINT
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

export async function processCaseState(encounter) {
  let updated = { ...encounter };

  if (!updated.status) {
    updated.status = "created";
  }

  // Ensure timeline exists
  if (!updated.timeline) {
    updated.timeline = [];
  }

  /*
  ========================================================
  🔥 CORE INTELLIGENCE BLOCK (AUTO AFTER NURSE)
  ========================================================
  */

  if (updated.status === "nurse_assessment_completed") {

    console.log("🧠 AI TRIAGE + SOAN PIPELINE STARTED");

    const check = enforceTransition(
      updated.status,
      "awaiting_clinician_validation"
    );

    if (!check.allowed) return updated;

    // --- AI TRIAGE ---
    const triage = await triggerTriage(updated);

    updated.triage = triage;

    // --- SOAN GENERATION ---
    updated.soan = {
      subjective: updated.symptoms || {},
      objective: updated.vitals || {},
      assessment: triage,
      plan: "Doctor review required"
    };

    // --- STATUS MOVE (DIRECT, NO FRAGMENTS) ---
    updated.status = "awaiting_clinician_validation";

    // --- TIMELINE ---
    updated.timeline.push({
      event: "AI triage + SOAN generated",
      timestamp: new Date().toISOString()
    });

    console.log("✅ AI COMPLETE → awaiting_clinician_validation");
  }

  return updated;
}
