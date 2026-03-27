/*
================================================
CLINICAL STATE MACHINE (ENFORCED)
================================================
Strict workflow control for encounter lifecycle
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
CHECK TRANSITION
================================================
*/

export function canTransition(currentState, nextState) {
  return transitions[currentState]?.includes(nextState);
}

/*
================================================
ENFORCEMENT FUNCTION
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
ACTION → STATE MAP
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
