// src/services/clinicalStateMachine.js

import { buildRouting } from "./routing.service.js";

export function processCaseState(data = {}, action, payload = {}) {

  let currentState = data.status || data.current_state || "created";
  const now = new Date().toISOString();

  let normalizedPayload = {};

  // ========================================
  // 🔹 NORMALIZATION
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

  if (action === "doctor_notes") {
    normalizedPayload = {
      doctorNotes: payload.notes || payload.doctorNotes || ""
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
  // 🔹 SEVERITY (KEEP FOR AI CONTEXT)
  // ========================================

  if (payload.finalSeverity) {
    newData.encounter_data.finalSeverity = payload.finalSeverity;
  }

  const finalSeverity =
    payload.finalSeverity ||
    newData.encounter_data?.finalSeverity ||
    null;

  // ========================================
  // 🔹 ROUTING ATTACHER (SAFE)
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

  // 🚫 Nurse REMOVED — handled by nurse engine

  // ========================================
  // 👨‍⚕️ DOCTOR FLOW (TEMPORARY — WILL ALIGN NEXT)
  // ========================================

  if (action === "doctor") {
    newData.timeline.push({ event: "👨‍⚕️ Doctor access", timestamp: now });

    return attachRouting({
      ...newData,
      status: "doctor_consultation",
      current_state: "doctor_consultation"
    });
  }

  if (action === "doctor_notes") {
    newData.timeline.push({ event: "📝 Doctor notes added", timestamp: now });

    return attachRouting({
      ...newData,
      status: "doctor_notes_added",
      current_state: "doctor_notes_added"
    });
  }

  // ========================================
  // 🔹 FINAL DECISION (DOCTOR)
  // ========================================

  if (currentState === "doctor_consultation") {

    if (action === "treat") {
      newData.timeline.push({ event: "💊 Treatment applied", timestamp: now });

      return attachRouting({
        ...newData,
        status: "treatment_applied",
        current_state: "treatment_applied"
      });
    }

    if (action === "followup") {
      newData.timeline.push({ event: "📅 Follow-up scheduled", timestamp: now });

      return attachRouting({
        ...newData,
        status: "completed",
        current_state: "completed"
      });
    }

    if (action === "escalate") {
      newData.timeline.push({ event: "🚨 Further escalation", timestamp: now });

      return attachRouting({
        ...newData,
        status: "doctor_escalation",
        current_state: "doctor_escalation"
      });
    }
  }

  // ========================================
  // 🔹 NORMAL FLOW (CLEAN)
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
