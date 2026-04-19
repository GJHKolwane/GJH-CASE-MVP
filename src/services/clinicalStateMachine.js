// src/services/clinicalStateMachine.js

import { buildRouting } from "./routing.service.js";

export function processCaseState(data = {}, action, payload = {}) {

  let currentState = data.status || data.current_state || "created";
  const now = new Date().toISOString();

  let normalizedPayload = {};

  // ========================================
  // 🔹 NORMALIZATION (PRE-CLINICAL ONLY)
  // ========================================

  if (action === "intake") {
    normalizedPayload = {
      intake: {
        patient: payload?.patient || payload?.intake?.patient || {},
        medical: payload?.medical || payload?.intake?.medical || {},
        context: payload?.context || payload?.intake?.context || {}
      }
    };
  }

  if (action === "vitals") {
    normalizedPayload = {
      vitals: { ...payload }
    };
  }

  if (action === "symptoms") {
    normalizedPayload = {
      symptoms: payload.symptoms || [],
      rules: payload.rules || {},
      ai: payload.ai || {}
    };
  }

  // ========================================
  // 🔹 BASE DATA
  // ========================================

  let newData = {
    ...data,
    encounter_data: {
      ...(data.encounter_data || {}),
      ...normalizedPayload
    },
    timeline: [...(data.timeline || [])]
  };

  // ========================================
  // 🔹 SAFETY CLEAN
  // ========================================

  delete newData.encounter_data?.routing;
  delete newData.encounter_data?.escalation;

  // ========================================
  // 🔹 SEVERITY (AI CONTEXT ONLY)
  // ========================================

  if (payload.finalSeverity) {
    newData.encounter_data.finalSeverity = payload.finalSeverity;
  }

  const finalSeverity =
    payload.finalSeverity ||
    newData.encounter_data?.finalSeverity ||
    null;

  // ========================================
  // 🔹 ROUTING ATTACHER
  // ========================================

  const attachRouting = (obj) => {
    if (finalSeverity) {
      obj.routing = buildRouting(finalSeverity);
    }
    return obj;
  };

  // ========================================
  // 🔹 STATE GUARDS
  // ========================================

  const enforce = (requiredState) => {
    if (currentState !== requiredState) {
      throw new Error(`❌ Invalid step. Required: ${requiredState}, Current: ${currentState}`);
    }
  };

  if (action === "intake") enforce("created");
  if (action === "vitals") enforce("intake_completed");
  if (action === "symptoms") enforce("vitals_recorded");

  // ========================================
  // 🔹 FSM FLOW (ENDS AT SYMPTOMS)
  // ========================================

  switch (currentState) {

    case "created":
      if (action === "intake") {
        newData.timeline.push({ event: "🧾 Intake completed", timestamp: now });
        return attachRouting({
          ...newData,
          status: "intake_completed",
          current_state: "intake_completed"
        });
      }
      break;

    case "intake_completed":
      if (action === "vitals") {
        newData.timeline.push({ event: "💓 Vitals recorded", timestamp: now });
        return attachRouting({
          ...newData,
          status: "vitals_recorded",
          current_state: "vitals_recorded"
        });
      }
      break;

    case "vitals_recorded":
      if (action === "symptoms") {
        newData.timeline.push({ event: "🤒 Symptoms recorded", timestamp: now });
        return attachRouting({
          ...newData,
          status: "symptoms_recorded",
          current_state: "symptoms_recorded"
        });
      }
      break;
  }

  throw new Error(`Invalid transition: ${currentState} → ${action}`);
}
