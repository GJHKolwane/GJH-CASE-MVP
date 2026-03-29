/*
================================================
CLINICAL SAFETY ENGINE (PRODUCTION MVP)
================================================

PURPOSE:
- Analyze vitals + symptoms
- Detect life-threatening conditions
- Assign severity
- Trigger auto escalation when needed

DESIGN:
- Pure function (NO DB calls)
- Deterministic + explainable
- Extensible for future AI layer
================================================
*/

export function evaluateClinicalState(data) {
  const vitals = data.vitals || {};
  const symptoms = data.symptoms?.symptoms || [];

  const bp = vitals.bp || "";
  const temp = vitals.temp || 0;

  let severity = "low";
  let autoDecision = null;
  let triggers = [];

  // Normalize symptoms
  const normalizedSymptoms = symptoms.map(s => s.toLowerCase());

  const has = (symptom) => normalizedSymptoms.includes(symptom);

  /*
  ================================================
  CARDIAC EMERGENCY (Heart Attack)
  ================================================
  */
  if (has("chest pain") && has("shortness of breath")) {
    severity = "critical";
    triggers.push("cardiac_emergency");
  }

  /*
  ================================================
  SEPSIS (MVP RULE)
  ================================================
  */
  if (temp >= 39) {
    if (severity !== "critical") severity = "high";
    triggers.push("possible_sepsis");
  }

  /*
  ================================================
  NEURO EMERGENCY
  ================================================
  */
  if (has("unconscious") || has("seizure")) {
    severity = "critical";
    triggers.push("neuro_emergency");
  }

  /*
  ================================================
  RESPIRATORY DISTRESS
  ================================================
  */
  if (has("shortness of breath")) {
    if (severity !== "critical") severity = "high";
    triggers.push("respiratory_distress");
  }

  /*
  ================================================
  HYPERTENSIVE CRISIS
  ================================================
  */
  if (bp === "180/120") {
    if (severity !== "critical") severity = "high";
    triggers.push("hypertensive_crisis");
  }

  /*
  ================================================
  SAFETY ESCALATION DECISION
  ================================================
  */
  if (severity === "high" || severity === "critical") {
    autoDecision = {
      type: "doctor_escalation",
      reason: triggers,
      priority: severity
    };
  }

  /*
  ================================================
  FINAL OUTPUT
  ================================================
  */
  return {
    severity,
    autoDecision,
    triggers
  };
}
