// src/services/clinicalStateMachine.js

import { createEscalation } from "./escalation.service.js";
import { assignDoctor } from "./doctor.service.js";
import { buildRouting } from "./routing.service.js";

export function processCaseState(data = {}, action, payload = {}) {

  let currentState = data.status || data.current_state || "created";
  const now = new Date().toISOString();

  /*
  ========================================
  🧱 PAYLOAD NORMALIZATION
  ========================================
  */

  let normalizedPayload = {};

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
      symptoms: { ...payload }
    };
  }

  if (action === "nurse") {
    normalizedPayload = {
      triage: { ...payload }
    };
  }

  /*
  ========================================
  📦 MERGE STATE
  ========================================
  */

  let newData = {
    ...data,
    encounter_data: {
      ...(data.encounter_data || {}),
      ...normalizedPayload
    },
    timeline: [...(data.timeline || [])]
  };

  /*
  ========================================
  🚨 HARD STATE GATES
  ========================================
  */

  const enforce = (requiredState) => {
    if (currentState !== requiredState) {
      throw new Error(
        `❌ Invalid step. Required: ${requiredState}, Current: ${currentState}`
      );
    }
  };

  if (action === "intake") enforce("created");
  if (action === "vitals") enforce("intake_completed");
  if (action === "symptoms") enforce("vitals_recorded");
  if (action === "nurse") enforce("symptoms_recorded");

  /*
  ========================================
  🧠 DECISION ENGINE OUTPUT (STRICT)
  ========================================
  */

  const severity = newData.encounter_data?.finalSeverity || null;
  const rules = newData.rules || {};
  const triggers = rules.triggers || [];
  const autoDecision = rules.autoDecision;

  /*
  ========================================
  🚨 SAFE ESCALATION GUARD
  ========================================
  */

  let escalation = {
    status: false
  };

  // ✅ ONLY allow escalation AFTER symptoms stage
  const canEscalate =
    ["symptoms_recorded", "awaiting_clinician_validation", "validated"].includes(currentState);

  if (severity && canEscalate) {
    escalation = createEscalation({
      finalSeverity: severity,
      triggers,
      vitals: newData.encounter_data?.vitals,
      symptoms: newData.encounter_data?.symptoms
    });
  }

  const prevEscalation = data.escalation || {};
  newData.escalation = escalation;

  /*
  ========================================
  📦 ROUTING ENGINE
  ========================================
  */

  newData.routing = buildRouting(newData);

  /*
  ========================================
  🧾 TIMELINE — ESCALATION
  ========================================
  */

  if (
    escalation.status &&
    (!prevEscalation.status || prevEscalation.level !== escalation.level)
  ) {
    newData.timeline.push({
      event: `🚨 Auto escalation (${escalation.level})`,
      reason: escalation.reason,
      triggers,
      timestamp: now
    });
  }

  /*
  ========================================
  👨‍⚕️ DOCTOR AUTO ASSIGNMENT
  ========================================
  */

  if (escalation.status && !newData.doctor) {
    const doctor = assignDoctor({
      escalation,
      caseId: newData.id || "unknown"
    });

    if (doctor) {
      newData.doctor = doctor;

      newData.timeline.push({
        event: `👨‍⚕️ Doctor assigned (${doctor.name})`,
        timestamp: now
      });
    }
  }

  /*
  ========================================
  🚨 CLINICAL OVERRIDE MODE
  ========================================
  */

  const forceEscalation = autoDecision === "ESCALATE";

  if (
    canEscalate &&
    (forceEscalation || escalation?.status) &&
    currentState !== "doctor_escalation" &&
    currentState !== "doctor_consultation" &&
    action !== "doctor"
  ) {
    newData.timeline.push({
      event: forceEscalation
        ? "⚠️ Rule-based forced escalation"
        : "🚨 Escalation triggered",
      triggers,
      timestamp: now
    });

    return {
      ...newData,
      status: "doctor_escalation",
      current_state: "doctor_escalation"
    };
  }

  /*
  ========================================
  👨‍⚕️ DOCTOR FLOW
  ========================================
  */

  if (action === "doctor") {
    newData.timeline.push({
      event: "👨‍⚕️ Doctor access",
      timestamp: now
    });

    return {
      ...newData,
      status: "doctor_consultation",
      current_state: "doctor_consultation"
    };
  }

  if (action === "doctor_notes") {
    return {
      ...newData,
      status: "doctor_notes_added",
      current_state: "doctor_notes_added"
    };
  }

  if (action === "doctor_decision") {
    return {
      ...newData,
      status: "completed",
      current_state: "completed"
    };
  }

  /*
  ========================================
  🧠 NORMAL FSM FLOW
  ========================================
  */

  switch (currentState) {

    case "created":
      if (action === "intake") {
        newData.timeline.push({ event: "🧾 Intake completed", timestamp: now });
        return { ...newData, status: "intake_completed", current_state: "intake_completed" };
      }
      break;

    case "intake_completed":
      if (action === "vitals") {
        newData.timeline.push({ event: "💓 Vitals recorded", timestamp: now });
        return { ...newData, status: "vitals_recorded", current_state: "vitals_recorded" };
      }
      break;

    case "vitals_recorded":
      if (action === "symptoms") {
        newData.timeline.push({ event: "🤒 Symptoms recorded", timestamp: now });
        return { ...newData, status: "symptoms_recorded", current_state: "symptoms_recorded" };
      }
      break;

    case "symptoms_recorded":
      if (action === "nurse") {
        newData.timeline.push({ event: "👩‍⚕️ Nurse assessment completed", timestamp: now });
        return { ...newData, status: "awaiting_clinician_validation", current_state: "awaiting_clinician_validation" };
      }
      break;

    case "awaiting_clinician_validation":
      if (action === "validate") {
        newData.timeline.push({ event: "✅ Validation completed", timestamp: now });
        return { ...newData, status: "validated", current_state: "validated" };
      }
      break;

    case "validated":
      if (action === "treat") {
        newData.timeline.push({ event: "💊 Treatment applied", timestamp: now });
        return { ...newData, status: "treatment_applied", current_state: "treatment_applied" };
      }

      if (action === "followup") {
        newData.timeline.push({ event: "📅 Follow-up scheduled", timestamp: now });
        return { ...newData, status: "followup_scheduled", current_state: "followup_scheduled" };
      }

      if (action === "escalate") {
        newData.timeline.push({
          event: "🚨 Escalated to doctor",
          reason: escalation?.reason,
          triggers,
          timestamp: now
        });

        return {
          ...newData,
          status: "doctor_escalation",
          current_state: "doctor_escalation"
        };
      }
      break;

    case "doctor_escalation":
      if (action === "doctor") {
        newData.timeline.push({ event: "👨‍⚕️ Doctor picked case", timestamp: now });
        return { ...newData, status: "doctor_consultation", current_state: "doctor_consultation" };
      }
      break;

    case "doctor_consultation":
      if (action === "doctor_notes") {
        newData.timeline.push({ event: "📝 Doctor notes added", timestamp: now });
        return { ...newData, status: "doctor_notes_added", current_state: "doctor_notes_added" };
      }
      break;

    case "doctor_notes_added":
      if (action === "doctor_decision") {
        newData.timeline.push({ event: "🏁 Doctor decision completed", timestamp: now });
        return { ...newData, status: "completed", current_state: "completed" };
      }
      break;
  }

  throw new Error(`Invalid transition: ${currentState} → ${action}`);
}
