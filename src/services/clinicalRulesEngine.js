// src/services/clinicalRulesEngine.js

export function evaluateClinicalState(data = {}) {

  console.log("\n🧠 ===============================");
  console.log("🧠 RULE ENGINE START");
  console.log("🧠 Incoming Data:", JSON.stringify(data, null, 2));

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

  console.log("📋 Intake Parsed:", {
    age,
    pregnant,
    immunocompromised,
    chronicConditions
  });

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

  console.log("🩺 Vitals Parsed:", {
    heartRate,
    temperature,
    bloodPressure,
    oxygenSaturation
  });

  // ========================================
  // 🔹 SYMPTOMS NORMALIZATION
  // ========================================

  const symptoms = Array.isArray(data.symptoms)
    ? data.symptoms
    : [];

  const normalizedSymptoms = symptoms.map(s =>
    String(s).toLowerCase().trim()
  );

  console.log("🧾 Symptoms Raw:", symptoms);
  console.log("🧾 Symptoms Normalized:", normalizedSymptoms);

  const hasAny = (keywords) => {
    const result = normalizedSymptoms.some(s =>
      keywords.some(k => s.includes(k))
    );

    if (result) {
      console.log("⚡ MATCH FOUND:", keywords);
    }

    return result;
  };

  // ========================================
  // 🚨 LIFE-CRITICAL OVERRIDE
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
    console.log("🚨 LIFE-CRITICAL OVERRIDE TRIGGERED");

    const result = {
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

    console.log("🚨 FINAL OUTPUT (OVERRIDE):", result);
    console.log("🧠 ===============================\n");

    return result;
  }

  // ========================================
  // 🧠 BASE STATE
  // ========================================

  let severity = "low";
  let autoDecision = null;
  let triggers = [];

  // ========================================
  // 🚨 CORE RULES
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
    console.log("🔥 Triggered: cardiac_emergency");
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
    console.log("🔥 Triggered: neuro_emergency");
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
    console.log("🔥 Triggered: respiratory_distress");
  }

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
    console.log("🔥 Triggered: penetrating_trauma");
  }

  // ========================================
  // 🔬 VITALS RULES
  // ========================================

  if (heartRate && heartRate > 130) {
    severity = "critical";
    triggers.push("tachycardia_critical");
    console.log("🔥 Triggered: tachycardia_critical");
  }

  if (oxygenSaturation && oxygenSaturation < 90) {
    severity = "critical";
    triggers.push("hypoxia");
    console.log("🔥 Triggered: hypoxia");
  }

  if (temperature >= 40) {
    severity = "critical";
    triggers.push("hyperpyrexia");
    console.log("🔥 Triggered: hyperpyrexia");
  } else if (temperature >= 39) {
    if (severity !== "critical") severity = "high";
    triggers.push("possible_sepsis");
    console.log("🔥 Triggered: possible_sepsis");
  }

  if (bloodPressure && bloodPressure.includes("/")) {
    const [sys, dia] = bloodPressure.split("/").map(Number);

    if (sys >= 180 || dia >= 120) {
      if (severity !== "critical") severity = "high";
      triggers.push("hypertensive_crisis");
      console.log("🔥 Triggered: hypertensive_crisis");
    }
  }

  // ========================================
  // ⚠️ RISK MODIFIERS
  // ========================================

  const riskFlags = [];

  if (age !== null && (age < 5 || age > 65)) {
    riskFlags.push("age_risk");
    console.log("⚠️ Risk: age_risk");

    if (severity === "medium") severity = "high";
    else if (severity === "high") severity = "critical";
  }

  if (pregnant) {
    riskFlags.push("pregnancy");
    console.log("⚠️ Risk: pregnancy");

    if (severity === "low") severity = "medium";
    else if (severity === "medium") severity = "high";
    else if (severity === "high") severity = "critical";
  }

  if (immunocompromised) {
    riskFlags.push("immunocompromised");
    console.log("⚠️ Risk: immunocompromised");

    if (severity === "medium") severity = "high";
    else if (severity === "high") severity = "critical";
  }

  if (chronicConditions.length > 0) {
    riskFlags.push("chronic_conditions");
    console.log("⚠️ Risk: chronic_conditions");
  }

  // ========================================
  // 🧠 DATA COMPLETENESS
  // ========================================

  const missingData = [];

  if (!heartRate) missingData.push("heart rate");
  if (!temperature) missingData.push("temperature");
  if (!bloodPressure) missingData.push("blood pressure");

  console.log("📉 Missing Data:", missingData);

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
  // ✅ FINAL OUTPUT
  // ========================================

  const result = {
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

  console.log("🚨 FINAL RULE ENGINE OUTPUT:", result);
  console.log("🧠 ===============================\n");

  return result;
    }
