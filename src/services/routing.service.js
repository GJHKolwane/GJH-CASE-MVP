// src/services/routing.service.js

/*
================================================
🚦 ROUTING ENGINE (FINAL — PURE + SAFE)
================================================
*/

/**
 * Determine queue from severity ONLY
 */
export function determineQueue(severity = "LOW") {

  switch (severity) {

    case "CRITICAL":
      return "EMERGENCY";

    case "HIGH":
      return "URGENT";

    case "MEDIUM":
      return "STANDARD";

    case "LOW":
    default:
      return "NORMAL";
  }
}


/**
 * Build routing (PURE FUNCTION)
 */
export function buildRouting(severity = "LOW") {

  const queue = determineQueue(severity);

  let priority = "NORMAL";

  switch (severity) {

    case "CRITICAL":
      priority = "STAT";
      break;

    case "HIGH":
      priority = "HIGH";
      break;

    case "MEDIUM":
      priority = "MEDIUM";
      break;

    case "LOW":
    default:
      priority = "NORMAL";
  }

  return {
    queue,
    priority,
    routedAt: new Date().toISOString()
  };
}


/**
 * Grouping (for dashboards)
 */
export function groupCasesByQueue(cases = []) {

  const EMERGENCY = [];
  const URGENT = [];
  const STANDARD = [];
  const NORMAL = [];

  for (const c of cases) {

    const severity =
      c?.encounter_data?.finalSeverity ||
      c?.finalSeverity ||
      "LOW";

    const queue = determineQueue(severity);

    if (queue === "EMERGENCY") EMERGENCY.push(c);
    else if (queue === "URGENT") URGENT.push(c);
    else if (queue === "STANDARD") STANDARD.push(c);
    else NORMAL.push(c);
  }

  return {
    EMERGENCY,
    URGENT,
    STANDARD,
    NORMAL
  };
}
