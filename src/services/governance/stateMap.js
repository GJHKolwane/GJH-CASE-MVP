export const STATE_FLOW = {
  created: ["intake"],

  intake: ["vitals_recorded"],

  vitals_recorded: ["symptoms_recorded"],

  symptoms_recorded: ["validated"],

  validated: ["nurse_validated"],

  nurse_validated: ["handover_pending", "completed"],

  handover_pending: ["doctor_active"],

  doctor_active: ["completed"],

  completed: []
};
