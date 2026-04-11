/*
================================================
CLINICAL SAFETY ENGINE (UPDATED MVP)
================================================
*/

export function evaluateClinicalState(data) {
  const vitals = data.vitals || {};

  // ✅ FIXED INPUT
  const symptoms = Array.isArray(data.symptoms)
    ? data.symptoms
    : [];

  const bp = vitals.bp || "";
  const temp = parseFloat(vitals.temp) || 0;

  let severity = "low";
  let autoDecision = null;
  let triggers = [];

  // ✅ Normalize symptoms (robust matching)
  const normalizedSymptoms = symptoms.map(s =>
    s.toLowerCase()
  );

  const hasAny = (keywords) =>
    normalizedSymptoms.some(s =>
      keywords.some(k => s.includes(k))
    );

  /*
  ================================================
  CARDIAC EMERGENCY
  ================================================
  */
  if (
    hasAny(["chest pain"]) &&
    hasAny(["shortness of breath", "difficulty breathing", "breathless"])
  ) {
    severity = "critical";
    triggers.push("cardiac_emergency");
  }

  /*
  ================================================
  NEURO EMERGENCY
  ================================================
  */
  if (hasAny(["unconscious", "seizure", "not responding"])) {
    severity = "critical";
    triggers.push("neuro_emergency");
  }

  /*
  ================================================
  RESPIRATORY DISTRESS
  ================================================
  */
  if (hasAny(["shortness of breath", "difficulty breathing", "breathless"])) {
    if (severity !== "critical") severity = "high";
    triggers.push("respiratory_distress");
  }

  /*
  ================================================
  SEPSIS (TEMP)
  ================================================
  */
  if (temp >= 39) {
    if (severity !== "critical") severity = "high";
    triggers.push("possible_sepsis");
  }

  /*
  ================================================
  HYPERTENSIVE CRISIS (RANGE)
  ================================================
  */
  if (bp.includes("/")) {
    const [sys, dia] = bp.split("/").map(Number);

    if (sys >= 180 || dia >= 120) {
      if (severity !== "critical") severity = "high";
      triggers.push("hypertensive_crisis");
    }
  }

  /*
  ================================================
  TRAUMA / BLEEDING
  ================================================
  */
  if (hasAny(["bleeding", "severe bleeding", "injury", "trauma"])) {
    if (severity !== "critical") severity = "high";
    triggers.push("trauma_bleeding");
  }

  /*
  ================================================
  PREGNANCY RISK FLAG (SUPPORTING)
  ================================================
  */
  if (hasAny(["pregnant"])) {
    triggers.push("pregnancy_flag");
  }

  /*
  ================================================
  ESCALATION DECISION
  ================================================
  */
  if (severity === "high" || severity === "critical") {
    autoDecision = {
      type: "doctor_escalation",
      reason: triggers,
      priority: severity
    };
  }

  return {
    severity,
    autoDecision,
    triggers
  };
}
