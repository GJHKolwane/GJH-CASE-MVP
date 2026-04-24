// src/services/clinicalRulesEngine.js

export function evaluateClinicalState(data = {}) {

  // ========================================
  // 🔹 INTAKE NORMALIZATION
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
  // 🔹 SYMPTOMS NORMALIZATION
  // ========================================

  const symptoms = Array.isArray(data.symptoms)
    ? data.symptoms
    : [];

  const normalizedSymptoms = symptoms.map(s =>
    String(s).toLowerCase().trim()
  );

  const hasAny = (keywords) =>
    normalizedSymptoms.some(s =>
      keywords.some(k => s.includes(k))
    );

  // ========================================
  // 🚨 LIFE-CRITICAL OVERRIDE (TOP PRIORITY)
  // ========================================

  if (
    hasAny([
      "stab",
      "stab wound",
      "gunshot",
      "gsw",
      "not breathing",
      "unconscious",
      "not responding"
    ])
  ) {
    return {
      severity: "critical",
      autoDecision: {
        type: "doctor_escalation",
        reason: ["life_critical_event"],
        priority: "critical"
      },
      triggers: ["life_critical_override"],
      riskFlags: [],
      missingData: [],
      extractedVitals: {
        heartRate,
        temperature,
        bloodPressure,
        oxygenSaturation
      }
    };
  }

  // ========================================
  // 🧠 BASE STATE
  // ========================================

  let severity = "low";
  let autoDecision = null;
  let triggers = [];

  // ========================================
  // 🚨 CORE RULES (UPGRADED)
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

  // 🔥 TRAUMA — NOW CRITICAL
  if (
    hasAny([
      "bleeding",
      "severe bleeding",
      "injury",
      "trauma",
      "stab",
      "knife",
      "penetrating",
      "gunshot",
      "deep wound"
    ])
  ) {
    severity = "critical";
    triggers.push("penetrating_trauma");
  }

  // ========================================
  // 🔬 VITALS — CRITICAL THRESHOLDS
  // ========================================

  if (heartRate && heartRate > 130) {
    severity = "critical";
    triggers.push("tachycardia_critical");
  }

  if (oxygenSaturation && oxygenSaturation < 90) {
    severity = "critical";
    triggers.push("hypoxia");
  }

  if (temperature >= 40) {
    severity = "critical";
    triggers.push("hyperpyrexia");
  } else if (temperature >= 39) {
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

  // ========================================
  // ⚠️ RISK MODIFIERS (UPGRADED)
  // ========================================

  const riskFlags = [];

  if (age !== null) {
    if (age < 5 || age > 65) {
      riskFlags.push("age_risk");

      if (severity === "medium") severity = "high";
      else if (severity === "high") severity = "critical";
    }
  }

  // 🔥 PREGNANCY — TRUE MULTIPLIER
  if (pregnant) {
    riskFlags.push("pregnancy");

    if (severity === "low") severity = "medium";
    else if (severity === "medium") severity = "high";
    else if (severity === "high") severity = "critical";
  }

  if (immunocompromised) {
    riskFlags.push("immunocompromised");

    if (severity === "medium") severity = "high";
    else if (severity === "high") severity = "critical";
  }

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
