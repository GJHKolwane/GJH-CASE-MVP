/*
================================================
CLINICAL RULES ENGINE
================================================
*/

export function evaluateClinicalState(data) {
  const vitals = data.vitals || {};
  const symptoms = data.symptoms?.symptoms || [];

  let severity = "low";
  let autoDecision = null;

  const bp = vitals.bp || "";
  const temp = vitals.temp || 0;

  /*
  ================================================
  RULE 1: CRITICAL VITALS
  ================================================
  */

  if (bp === "180/120" || temp >= 39) {
    severity = "high";
  }

  /*
  ================================================
  RULE 2: DANGEROUS SYMPTOMS
  ================================================
  */

  const criticalSymptoms = [
    "chest pain",
    "shortness of breath",
    "unconscious",
    "seizure"
  ];

  const hasCriticalSymptom = symptoms.some((s) =>
    criticalSymptoms.includes(s.toLowerCase())
  );

  if (hasCriticalSymptom) {
    severity = "high";
  }

  /*
  ================================================
  RULE 3: AUTO ESCALATION
  ================================================
  */

  if (severity === "high") {
    autoDecision = {
      type: "doctor_escalation",
      reason: "Clinical risk detected"
    };
  }

  return {
    severity,
    autoDecision
  };
}
