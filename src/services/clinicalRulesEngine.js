/*

CLINICAL SAFETY ENGINE (PRODUCTION-STABLE MVP)

PURPOSE:

- Analyze vitals + symptoms together
- Ensure NO false "missing data"
- Deterministic + explainable
- Robust against inconsistent payload structures
  ================================================
  */

export function evaluateClinicalState(data = {}) {
/*

🔧 NORMALIZE INPUT (CRITICAL FIX)

*/

// Handle nested vitals (future + backward safe)
const vitalsSource =
data.vitals?.vitals || // nested
data.vitals || // direct
{};

// =========================
// 🔥 NORMALIZED VITALS (FIXED)
// =========================
const heartRate =
vitalsSource.heart_rate ||   // ✅ backend standard
vitalsSource.heartRate ||   // fallback
vitalsSource.hr ||
null;

const temperature =
parseFloat(
vitalsSource.temperature ||
vitalsSource.temp ||
0
) || 0;

const bloodPressure =
vitalsSource.blood_pressure || // ✅ backend standard
vitalsSource.bloodPressure ||
vitalsSource.bp ||
"";

const oxygenSaturation =
vitalsSource.spo2 ||              // ✅ backend standard
vitalsSource.oxygenSaturation ||
null;

// =========================
// 🔹 SYMPTOMS NORMALIZATION
// =========================
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

/*

🧠 INITIAL STATE

*/

let severity = "low";
let autoDecision = null;
let triggers = [];

/*

🚨 CARDIAC EMERGENCY

*/
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

/*

🧠 NEURO EMERGENCY

*/
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

/*

🫁 RESPIRATORY DISTRESS

*/
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

/*

🌡️ SEPSIS (TEMP BASED)

*/
if (temperature >= 39) {
if (severity !== "critical") severity = "high";
triggers.push("possible_sepsis");
}

/*

❤️ HYPERTENSIVE CRISIS

*/
if (bloodPressure && bloodPressure.includes("/")) {
const [sys, dia] = bloodPressure
.split("/")
.map(Number);

if (sys >= 180 || dia >= 120) {
  if (severity !== "critical") severity = "high";
  triggers.push("hypertensive_crisis");
}

}

/*

🩸 TRAUMA / BLEEDING

*/
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

/*

🤰 PREGNANCY FLAG

*/
if (hasAny(["pregnant"])) {
triggers.push("pregnancy_flag");
}

/*

🧠 DATA COMPLETENESS CHECK (FIXED)

*/

const missingData = [];

if (!heartRate) missingData.push("heart rate");
if (!temperature) missingData.push("temperature");
if (!bloodPressure) missingData.push("blood pressure");

// IMPORTANT:
// Missing data should NOT reduce severity
// Only informs clinician awareness

/*

🚑 ESCALATION DECISION

*/

if (severity === "high" || severity === "critical") {
autoDecision = {
type: "doctor_escalation",
reason: triggers,
priority: severity
};
}

/*

✅ FINAL OUTPUT

*/

return {
severity,
autoDecision,
triggers,
missingData,
extractedVitals: {
heartRate,
temperature,
bloodPressure,
oxygenSaturation
}
};
}
