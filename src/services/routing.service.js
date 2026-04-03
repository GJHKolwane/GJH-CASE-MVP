// src/services/routing.service.js

/**
 * Determines which queue a case belongs to
 */
export function determineQueue(caseData = {}) {

  const severity =
    caseData?.finalSeverity ||
    caseData?.triage?.severity ||
    "LOW";

  const isEscalated = caseData?.escalation?.status;

  /*
  ========================================
  🚨 CRITICAL ALWAYS WINS
  ========================================
  */
  if (severity === "CRITICAL") {
    return "CRITICAL_QUEUE";
  }

  /*
  ========================================
  ⚠️ HIGH OR ESCALATED
  ========================================
  */
  if (severity === "HIGH" || isEscalated) {
    return "HIGH_PRIORITY";
  }

  /*
  ========================================
  🟡 NORMAL FLOW
  ========================================
  */
  return "NORMAL";
}


/**
 * Builds routing object
 */
export function buildRouting(caseData = {}) {

  const queue = determineQueue(caseData);

  let priority = "NORMAL";

  /*
  ========================================
  PRIORITY MAPPING
  ========================================
  */
  if (queue === "CRITICAL_QUEUE") {
    priority = "URGENT";
  } else if (queue === "HIGH_PRIORITY") {
    priority = "HIGH";
  }

  return {
    queue,
    priority,
    routedAt: new Date().toISOString()
  };
}


/**
 * Groups cases into queues (for dashboard)
 */
export function groupCasesByQueue(cases = []) {

  const CRITICAL_QUEUE = [];
  const HIGH_PRIORITY = [];
  const NORMAL = [];

  for (const c of cases) {

    const severity =
      c?.finalSeverity ||
      c?.triage?.severity ||
      "LOW";

    const isEscalated = c?.escalation?.status;

    /*
    ========================================
    GROUPING LOGIC
    ========================================
    */
    if (severity === "CRITICAL") {
      CRITICAL_QUEUE.push(c);
    } else if (severity === "HIGH" || isEscalated) {
      HIGH_PRIORITY.push(c);
    } else {
      NORMAL.push(c);
    }
  }

  return {
    CRITICAL_QUEUE,
    HIGH_PRIORITY,
    NORMAL
  };
}
