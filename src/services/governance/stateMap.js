// 🔐 Allowed transitions ONLY — no logic here

export const STATE_FLOW = {
  created: ["intake"],

  intake: ["vitals"],

  vitals: ["symptoms"],

  symptoms: ["validate"],

  validate: ["nurse"],

  nurse: ["handover_pending"],

  handover_pending: ["claim"],

  claim: ["doctor"],

  doctor: ["doctor-work"],

  "doctor-work": ["closed"],

  closed: []
};
