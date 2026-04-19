// src/services/clinicalRulesEngine.js

export function evaluateClinicalState(data = {}) {

  // ========================================
  // 🔹 INTAKE NORMALIZATION (NEW)
  // ========================================

  const intake = data.intake || {};

  const age = parseInt(intake?.patient?.age) || null;
  const pregnant = intake?.medical?.pregnant === true;
  const immunocompromised =
    intake?.medical?.immunocompromised === true;

  const chronicConditions =
    intake?.medical?.conditions || [];

  // ========================================
  // 🔹 VITALS NORMALIZATION
  // ========================================

  const vitalsSource =
    data.vitals?.vitals ||
    data.vitals ||
    {};

  const heartRate =
    vitalsSource.heart_rate ||
    vitalsSource.heartRate ||
    vitalsSource.hr ||
    null;

  const temperature =
    parseFloat(
      vitalsSource.temperature ||
      vitalsSource.temp ||
      0
    ) || 0;

  const bloodPressure =
    vitalsSource.blood_pressure ||
    vitalsSource.bloodPressure ||
    vitalsSource.bp ||
    "";

  const oxygenSaturation =
    vitalsSource.spo2 ||
    vitalsSource.oxygenSaturation ||
    null;

  // ========================================
  // 🔹 SYMPTOMS
  // ========================================

  const symptoms = Array.isArray(data.symptoms)
    ? data.symptoms
    : [];

  const normalizedSymptoms = symptoms.map(s =>
    String(s).toLowerCase()
  );

  const hasAny = (keywords) =>
    normalizedSymptoms.some(s =>
      keywords.some(k => s.includes(k))
    );

  // ========================================
  // 🧠 BASE STATE
  // ========================================

  let severity = "low";
  let autoDecision = null;
  let triggers = [];

  // ========================================
  // 🚨 CORE RULES (UNCHANGED)
  // ========================================

  if (
    hasAny(["chest pain"]) &&
    hasAny([
      "shortness of breath",
      "difficulty breathing",
      "breathless"
    ])
  ) {
    severity = "critical";
    triggers.push("cardiac_emergency");
  }

  if (
    hasAny([
      "unconscious",
      "seizure",
      "not responding"
    ])
  ) {
    severity = "critical";
    triggers.push("neuro_emergency");
  }

  if (
    hasAny([
      "shortness of breath",
      "difficulty breathing",
      "breathless"
    ])
  ) {
    if (severity !== "critical") severity = "high";
    triggers.push("respiratory_distress");
  }

  if (temperature >= 39) {
    if (severity !== "critical") severity = "high";
    triggers.push("possible_sepsis");
  }

  if (bloodPressure && bloodPressure.includes("/")) {
    const [sys, dia] = bloodPressure
      .split("/")
      .map(Number);

    if (sys >= 180 || dia >= 120) {
      if (severity !== "critical") severity = "high";
      triggers.push("hypertensive_crisis");
    }
  }

  if (
    hasAny([
      "bleeding",
      "severe bleeding",
      "injury",
      "trauma"
    ])
  ) {
    if (severity !== "critical") severity = "high";
    triggers.push("trauma_bleeding");
  }

  // ========================================
  // ⚠️ RISK MODIFIERS (NEW — CRITICAL LAYER)
  // ========================================

  const riskFlags = [];

  // 👶 AGE RISK
  if (age !== null) {
    if (age < 5 || age > 65) {
      riskFlags.push("age_risk");

      if (severity === "medium") severity = "high";
      else if (severity === "high") severity = "critical";
    }
  }

  // 🤰 PREGNANCY
  if (pregnant) {
    riskFlags.push("pregnancy");

    if (severity === "medium") severity = "high";
  }

  // 🧬 IMMUNOCOMPROMISED
  if (immunocompromised) {
    riskFlags.push("immunocompromised");

    if (severity === "medium") severity = "high";
    else if (severity === "high") severity = "critical";
  }

  // 🫀 CHRONIC CONDITIONS
  if (chronicConditions.length > 0) {
    riskFlags.push("chronic_conditions");
  }

  // ========================================
  // 🧠 DATA COMPLETENESS
  // ========================================

  const missingData = [];

  if (!heartRate) missingData.push("heart rate");
  if (!temperature) missingData.push("temperature");
  if (!bloodPressure) missingData.push("blood pressure");

  // ========================================
  // 🚑 ESCALATION
  // ========================================

  if (severity === "high" || severity === "critical") {
    autoDecision = {
      type: "doctor_escalation",
      reason: [...triggers, ...riskFlags],
      priority: severity
    };
  }

  // ========================================
  // ✅ OUTPUT
  // ========================================

  return {
    severity,
    autoDecision,
    triggers,
    riskFlags,
    missingData,
    extractedVitals: {
      heartRate,
      temperature,
      bloodPressure,
      oxygenSaturation
    }
  };
}
