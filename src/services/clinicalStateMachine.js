import { createEscalation } from "./escalation.service.js";
import { assignDoctor } from "./doctor.service.js";
import { buildRouting } from "./routing.service.js";

export function processCaseState(data = {}, action, payload = {}) {

  let currentState = data.status || "created";

  // Merge incoming payload safely
  let newData = {
    ...data,
    ...payload,
    timeline: [...(data.timeline || [])]
  };

  const now = new Date().toISOString();

  /*
  ========================================
  🚨 AUTO ESCALATION INJECTION
  (idempotent — no duplicate timeline spam)
  ========================================
  */

  const finalSeverity =
    newData.finalSeverity ||
    newData.triage?.severity ||
    "LOW";

  const prevEscalation = data.escalation || {};

  const escalation = createEscalation({
    finalSeverity,
    vitals: newData.vitals,
    symptoms: newData.symptoms
  });

  newData.escalation = escalation;
  newData.routing = buildRouting(newData);
  

  // Log ONLY when escalation is newly triggered or level changes
  if (
    escalation.status &&
    (!prevEscalation.status || prevEscalation.level !== escalation.level)
  ) {
    newData.timeline.push({
      event: `🚨 Auto-escalation triggered (${escalation.level})`,
      reason: escalation.reason,
      timestamp: now
    });
  }

  /*
  ========================================
  👨‍⚕️ DOCTOR AUTO ASSIGNMENT (idempotent)
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
  📦 ROUTING ENGINE (idempotent)
  ========================================
  */

  const prevQueue = data.routing?.queue;
  const routing = buildRouting(newData);

  newData.routing = routing;

  if (prevQueue !== routing.queue) {
    newData.timeline.push({
      event: `📦 Routed to ${routing.queue}`,
      timestamp: now
    });
  }

  /*
  ========================================
  🚨 CLINICAL OVERRIDE MODE
  ========================================
  */

  const severity = newData.escalation?.level;

  // 🔥 AUTO-ROUTING INTO ESCALATION STATE (safe)
  if (
    newData.escalation?.status &&
    currentState !== "doctor_escalation" &&
    currentState !== "doctor_consultation" &&
    action !== "doctor"
  ) {
    return {
      ...newData,
      status: "doctor_escalation"
    };
  }

  if (severity === "HIGH" || severity === "CRITICAL") {

    if (action === "doctor") {
      newData.timeline.push({
        event: "👨‍⚕️ Doctor access (override mode)",
        timestamp: now
      });

      return {
        ...newData,
        status: "doctor_consultation"
      };
    }

    if (action === "doctor_notes") {
      return {
        ...newData,
        status: "doctor_notes_added"
      };
    }

    if (action === "doctor_decision") {
      return {
        ...newData,
        status: "completed"
      };
    }

    if (action === "escalate") {
      newData.timeline.push({
        event: "🚨 Escalated (override mode)",
        reason: newData.escalation?.reason,
        timestamp: now
      });

      return {
        ...newData,
        status: "doctor_escalation"
      };
    }
  }

  /*
  ========================================
  NORMAL FSM FLOW
  ========================================
  */

  switch (currentState) {

    case "created":
      if (action === "intake") {
        newData.timeline.push({ event: "Intake completed", timestamp: now });
        return { ...newData, status: "intake_completed" };
      }
      break;

    case "intake_completed":
      if (action === "vitals") {
        newData.timeline.push({ event: "Vitals recorded", timestamp: now });
        return { ...newData, status: "vitals_recorded" };
      }
      break;

    case "vitals_recorded":
      if (action === "symptoms") {
        newData.timeline.push({ event: "Symptoms recorded", timestamp: now });
        return { ...newData, status: "symptoms_recorded" };
      }
      break;

    case "symptoms_recorded":
      if (action === "nurse") {
        newData.timeline.push({ event: "Nurse assessment completed", timestamp: now });
        return { ...newData, status: "awaiting_clinician_validation" };
      }
      break;

    case "awaiting_clinician_validation":
      if (action === "validate") {
        newData.timeline.push({ event: "Validation completed", timestamp: now });
        return { ...newData, status: "validated" };
      }
      break;

    case "validated":
      if (action === "treat") {
        newData.timeline.push({ event: "Treatment applied", timestamp: now });
        return { ...newData, status: "treatment_applied" };
      }

      if (action === "followup") {
        newData.timeline.push({ event: "Follow-up scheduled", timestamp: now });
        return { ...newData, status: "followup_scheduled" };
      }

      if (action === "escalate") {
        newData.timeline.push({
          event: "Escalated to doctor",
          reason: newData.escalation?.reason,
          timestamp: now
        });
        return { ...newData, status: "doctor_escalation" };
      }
      break;

    case "doctor_escalation":
      if (action === "doctor") {
        newData.timeline.push({
          event: "👨‍⚕️ Doctor picked case",
          timestamp: now
        });
        return { ...newData, status: "doctor_consultation" };
      }
      break;

    case "doctor_consultation":
      if (action === "doctor_notes") {
        newData.timeline.push({
          event: "Doctor notes added",
          timestamp: now
        });
        return { ...newData, status: "doctor_notes_added" };
      }
      break;

    case "doctor_notes_added":
      if (action === "doctor_decision") {
        newData.timeline.push({
          event: "Doctor decision completed",
          timestamp: now
        });
        return { ...newData, status: "completed" };
      }
      break;
  }

  // 🔥 FINAL SAFETY
  throw new Error(`Invalid transition: ${currentState} → ${action}`);
}
