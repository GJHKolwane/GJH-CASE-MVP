// src/services/clinicalStateMachine.js

import { createEscalation } from "./escalation.service.js";
import { assignDoctor } from "./doctor.service.js";
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

  if (action === "nurse") {
    normalizedPayload = {
      triage: { ...payload }
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
  // 🔹 SEVERITY
  // ========================================

  if (payload.finalSeverity) {
    newData.encounter_data.finalSeverity = payload.finalSeverity;
  }

  const severity =
    payload.finalSeverity ||
    newData.encounter_data?.finalSeverity ||
    null;

  const rules = payload.rules || {};
  const triggers = rules.triggers || [];
  const autoDecision = rules.autoDecision;

  // ========================================
  // 🔹 STATE GUARD
  // ========================================

  const enforce = (requiredState) => {
    if (currentState !== requiredState) {
      throw new Error(`❌ Invalid step. Required: ${requiredState}, Current: ${currentState}`);
    }
  };

  if (action === "intake") enforce("created");
  if (action === "vitals") enforce("intake_completed");
  if (action === "symptoms") enforce("vitals_recorded");
  if (action === "nurse") enforce("symptoms_recorded");

  // ========================================
  // 🔹 ESCALATION ENGINE
  // ========================================

  let escalation = { status: false };

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

  // ========================================
  // 🔹 DOCTOR AUTO ASSIGNMENT
  // ========================================

  if (newData.escalation?.status && !newData.doctor) {
    const doctor = assignDoctor({
      escalation: newData.escalation,
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

  // ========================================
  // 🔹 ESCALATION TIMELINE
  // ========================================

  if (
    newData.escalation?.status &&
    (!prevEscalation.status || prevEscalation.level !== newData.escalation.level)
  ) {
    newData.timeline.push({
      event: `🚨 Auto escalation (${newData.escalation.level || "critical"})`,
      reason: newData.escalation.reason,
      triggers,
      timestamp: now
    });
  }

  // ========================================
  // 🔹 ROUTING ATTACHER
  // ========================================

  const attachRouting = (obj) => {
    const finalSeverity = obj.encounter_data?.finalSeverity;
    if (finalSeverity) {
      obj.routing = buildRouting(finalSeverity);
    }
    return obj;
  };

  // ========================================
  // 🔥 ESCALATION OVERRIDE
  // ========================================

  const forceEscalation = autoDecision === "ESCALATE";

  if (
    canEscalate &&
    (forceEscalation || newData.escalation?.status) &&
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

    return attachRouting({
      ...newData,
      status: "doctor_escalation",
      current_state: "doctor_escalation"
    });
  }

  // ========================================
  // 👨‍⚕️ DOCTOR FLOW
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

  // 🔥 FINAL DECISION (FIXED ALIGNMENT)
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
  // 🔹 NORMAL FLOW
  // ========================================

  switch (currentState) {

    case "created":
      if (action === "intake") {
        newData.timeline.push({ event: "🧾 Intake completed", timestamp: now });
        return attachRouting({ ...newData, status: "intake_completed", current_state: "intake_completed" });
      }
      break;

    case "intake_completed":
      if (action === "vitals") {
        newData.timeline.push({ event: "💓 Vitals recorded", timestamp: now });
        return attachRouting({ ...newData, status: "vitals_recorded", current_state: "vitals_recorded" });
      }
      break;

    case "vitals_recorded":
      if (action === "symptoms") {
        newData.timeline.push({ event: "🤒 Symptoms recorded", timestamp: now });
        return attachRouting({ ...newData, status: "symptoms_recorded", current_state: "symptoms_recorded" });
      }
      break;

    case "symptoms_recorded":
      if (action === "nurse") {
        newData.timeline.push({ event: "👩‍⚕️ Nurse assessment completed", timestamp: now });
        return attachRouting({ ...newData, status: "awaiting_clinician_validation", current_state: "awaiting_clinician_validation" });
      }
      break;

    case "awaiting_clinician_validation":
      if (action === "validate") {
        newData.timeline.push({ event: "✅ Validation completed", timestamp: now });
        return attachRouting({ ...newData, status: "validated", current_state: "validated" });
      }
      break;
  }

  throw new Error(`Invalid transition: ${currentState} → ${action}`);
    }
