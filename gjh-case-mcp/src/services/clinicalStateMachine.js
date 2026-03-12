/*
================================================
CLINICAL STATE MACHINE
================================================
Controls allowed encounter workflow transitions
*/

const transitions = {

  created: ["nurse_assessment"],

  nurse_assessment: ["ai_triage_completed"],

  ai_triage_completed: ["soan_generated"],

  soan_generated: ["doctor_escalated"],

  doctor_escalated: ["doctor_consultation"],

  doctor_consultation: ["treatment_decision"],

  treatment_decision: ["prescription_issued"],

  prescription_issued: ["completed"]

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
