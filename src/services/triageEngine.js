/*
================================================
GJHEALTH TRIAGE ENGINE (RULE-BASED MVP)
================================================
*/

export function evaluateTriage({ vitals = {}, symptoms = {} }) {
  let severity = "low";
  let flags = [];

  const heartRate = vitals.heartRate;
  const systolicBP = vitals.bloodPressure?.systolic;
  const oxygen = vitals.oxygenSaturation;
  const temperature = vitals.temperature;

  /*
  ================================================
  🚨 LIFE-CRITICAL CONDITIONS
  ================================================
  */

  if (
    oxygen && oxygen < 90 ||
    heartRate && heartRate > 140 ||
    systolicBP && systolicBP < 80
  ) {
    severity = "critical";
    flags.push("life_threatening_vitals");
  }

  /*
  ================================================
  ⚠️ HIGH RISK CONDITIONS
  ================================================
  */

  else if (
    temperature && temperature > 39 ||
    heartRate && heartRate > 120 ||
    symptoms.chestPain ||
    symptoms.shortnessOfBreath
  ) {
    severity = "high";
    flags.push("high_risk_condition");
  }

  /*
  ================================================
  🟡 MODERATE CONDITIONS
  ================================================
  */

  else if (
    temperature && temperature > 37.5 ||
    symptoms.fatigue ||
    symptoms.cough
  ) {
    severity = "medium";
    flags.push("moderate_condition");
  }

  /*
  ================================================
  🟢 LOW RISK
  ================================================
  */

  else {
    severity = "low";
    flags.push("stable");
  }

  /*
  ================================================
  RECOMMENDATION ENGINE
  ================================================
  */

  let recommendation = "Routine check";

  if (severity === "critical") {
    recommendation = "Immediate emergency intervention required";
  } else if (severity === "high") {
    recommendation = "Urgent doctor attention required";
  } else if (severity === "medium") {
    recommendation = "Doctor review recommended";
  }

  return {
    severity,
    flags,
    recommendation
  };
    }
