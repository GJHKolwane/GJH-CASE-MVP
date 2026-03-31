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
  🚨 CLINICAL OVERRIDE MODE (CRITICAL LOGIC)
  ========================================
  */
  const severity = newData.triage?.severity?.toUpperCase();

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
        newData.timeline.push({ event: "Escalated to doctor", timestamp: now });
        return { ...newData, status: "doctor_escalation" };
      }
      break;

    case "doctor_escalation":
      if (action === "doctor") {
        return { ...newData, status: "doctor_consultation" };
      }
      break;

    case "doctor_consultation":
      if (action === "doctor_notes") {
        return { ...newData, status: "doctor_notes_added" };
      }
      break;

    case "doctor_notes_added":
      if (action === "doctor_decision") {
        return { ...newData, status: "completed" };
      }
      break;
  }

  // 🔥 FIXED ERROR MESSAGE
  throw new Error(`Invalid transition: ${currentState} → ${action}`);
                               }
