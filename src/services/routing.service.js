// src/services/routing.service.js

/**
 * Determines which queue a case belongs to
 */
export function determineQueue(caseData = {}) {

  if (caseData?.escalation?.status) {
    return "HIGH_PRIORITY";
  }

  return "NORMAL";
}


/**
 * Builds routing object
 */
export function buildRouting(caseData = {}) {

  const queue = determineQueue(caseData);

  return {
    queue,
    priority: queue === "HIGH_PRIORITY" ? "HIGH" : "NORMAL",
    routedAt: new Date().toISOString()
  };
}


/**
 * Groups cases into queues (for dashboard)
 */
export function groupCasesByQueue(cases = []) {

  const HIGH_PRIORITY = [];
  const NORMAL = [];

  for (const c of cases) {
    if (c?.escalation?.status) {
      HIGH_PRIORITY.push(c);
    } else {
      NORMAL.push(c);
    }
  }

  return {
    HIGH_PRIORITY,
    NORMAL
  };
}
