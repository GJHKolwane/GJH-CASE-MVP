// src/services/escalation.service.js

/**
 * Determines whether a case should be escalated
 */
export function shouldEscalate(finalSeverity) {
  return finalSeverity === "HIGH" || finalSeverity === "CRITICAL";
}


/**
 * Builds a clinically-auditable escalation object
 */
export function createEscalation({
  finalSeverity,
  vitals = {},
  symptoms = [],
  source = "risk-engine"
}) {
  if (!shouldEscalate(finalSeverity)) {
    return {
      status: false
    };
  }

  return {
    status: true,
    level: finalSeverity,
    reason: buildEscalationReason(vitals, symptoms),
    triggeredAt: new Date().toISOString(),
    triggeredBy: source
  };
}


/**
 * Generates human-readable clinical reason
 */
function buildEscalationReason(vitals, symptoms) {
  const reasons = [];

  // 🫁 Oxygen
  if (vitals?.spo2 && vitals.spo2 < 90) {
    reasons.push("SpO2 below 90%");
  }

  // ❤️ Heart Rate
  if (vitals?.heartRate && vitals.heartRate > 120) {
    reasons.push("Tachycardia");
  }

  // 🌡️ Temperature (Sepsis indicator)
  if (vitals?.temperature && (vitals.temperature < 35 || vitals.temperature > 39)) {
    reasons.push("Abnormal temperature (possible sepsis)");
  }

  // 🧠 Symptoms
  if (symptoms.includes("confusion")) {
    reasons.push("Altered mental status");
  }

  if (symptoms.includes("shortness_of_breath")) {
    reasons.push("Respiratory distress");
  }

  // fallback
  if (reasons.length === 0) {
    return "High clinical risk detected";
  }

  return reasons.join(" + ");
}
