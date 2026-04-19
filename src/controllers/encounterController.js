// src/controllers/encounterController.js

import pool from "../config/db.js";

import {
  createEncounterDB,
  getEncounterDB,
  updateEncounterDB
} from "../services/dbService.js";

import { processCaseState } from "../services/clinicalStateMachine.js";

import { evaluateEncounter } from "../services/clinicalDecision.service.js";

import { callAIOrchestrator } from "../services/aiOrchestrator.client.js";

/*
================================================
UTIL — TRACE LOGGER 🔥
================================================
*/
const trace = (stage, id) => {
  console.log(`🧭 [${stage.toUpperCase()}] id: ${id}`);
};

/*
================================================
🧼 RESPONSE SANITIZER
================================================
*/
const sanitizeResponse = (data) => {
  const clean = { ...data };

  if (clean.encounter_data) {
    delete clean.encounter_data.routing;
    delete clean.encounter_data.escalation;
  }

  return clean;
};

/*
================================================
🧼 PRE-DB CLEANER
================================================
*/
const cleanBeforeSave = (data) => {
  if (data.encounter_data) {
    delete data.encounter_data.routing;
    delete data.encounter_data.escalation;
  }
  return data;
};

/*
================================================
🧠 SAFETY DECISION GUARD
================================================
*/
const ensureDecision = async (data) => {
  const ed = data.encounter_data || {};

  // ✅ Only fallback if AI missing
  if (!ed.finalSeverity && !ed.ai) {
    const decision = await evaluateEncounter({
      vitals: ed.vitals,
      symptoms: ed.symptoms,
      notes: ed?.triage?.notes
    });

    data.encounter_data.finalSeverity = decision.finalSeverity;
    data.rules = decision.rules;

    data.timeline = [
      ...(data.timeline || []),
      {
        event: "🛡️ Fallback decision engine executed",
        timestamp: new Date().toISOString()
      }
    ];
  }

  return data;
};

/*
================================================
CREATE
================================================
*/
export const createEncounterHandler = async (req, res) => {
  try {
    const body = req.body || {};

    const normalized = {
      patient_data: {
        name:
          body.patient_data?.name ||
          body.patientName ||
          body.name ||
          "Unknown Patient"
      },
      national_id:
        body.national_id ||
        body.nationalId ||
        null,
      status: "created",
      current_state: "created",
      encounter_data: {}
    };

    const encounter = await createEncounterDB(normalized);

    trace("create", encounter.id);

    return res.json({
      status: encounter.status,
      encounter: sanitizeResponse(encounter)
    });

  } catch (err) {
    console.error("CREATE ERROR:", err);
    res.status(500).json({ error: "Failed to create encounter" });
  }
};

/*
================================================
INTAKE
================================================
*/
export const intakeHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("intake", id);

    const record = await getEncounterDB(id);

    const updatedData = await processCaseState(
      record,
      "intake",
      { intake: req.body.intake }
    );

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

    return res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    console.error("INTAKE ERROR:", err);
    return res.status(400).json({ error: err.message });
  }
};

/*
================================================
VITALS
================================================
*/
export const addVitalsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { heartRate, temperature, bloodPressure, oxygenSaturation } = req.body;

    trace("vitals", id);

    const record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    const encounterData = record.encounter_data || {};

    const normalizedVitals = {
      heart_rate: heartRate ? Number(heartRate) : null,
      temperature: temperature ? Number(temperature) : null,
      blood_pressure: formatBloodPressure(bloodPressure),
      spo2: oxygenSaturation ? Number(oxygenSaturation) : null,
    };

    console.log("🩺 NORMALIZED VITALS:", normalizedVitals);

    encounterData.vitals = normalizedVitals;

    const updated = await updateEncounterDB(
      id,
      encounterData,
      "vitals_recorded"
    );

    return res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated),
    });

  } catch (err) {
    console.error("❌ VITALS ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

const formatBloodPressure = (bp) => {
  if (!bp) return null;
  if (typeof bp === "string" && bp.includes("/")) return bp;

  const systolic = Number(bp);
  if (!isNaN(systolic)) {
    return `${systolic}/80`; // ✅ FIXED TEMPLATE STRING
  }

  return null;
};

/*
================================================
SYMPTOMS (🔥 AI BRAIN)
================================================
*/
export const addSymptomsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { symptoms } = req.body;

    trace("symptoms", id);

    const record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    const encounterData = record.encounter_data || {};

    let normalizedSymptoms = [];

    if (Array.isArray(symptoms)) {
      normalizedSymptoms = symptoms;
    } else if (typeof symptoms === "string") {
      normalizedSymptoms = symptoms
        .split(",")
        .map(s => s.trim())
        .filter(Boolean);
    }

    console.log("🧾 NORMALIZED SYMPTOMS:", normalizedSymptoms);

    encounterData.symptoms = normalizedSymptoms;

    console.log("🧠 AI ORCHESTRATOR RUNNING");

    const aiResult = await callAIOrchestrator({
      inputText: normalizedSymptoms.join(", "),
      vitals: encounterData.vitals || {},
      symptoms: normalizedSymptoms,
      encounterId: id,
    });

    console.log("🧠 AI RESULT:", aiResult);

    let newStatus = "symptoms_recorded";

    if (aiResult?.suggestedAction === "ESCALATE") {
      newStatus = "doctor_escalation";
      console.log("🚨 ESCALATION TRIGGERED BY AI");
    }

    encounterData.ai = aiResult;

    const updated = await updateEncounterDB(
      id,
      encounterData,
      newStatus
    );

    return res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated),
      ai: aiResult
    });

  } catch (err) {
    console.error("❌ SYMPTOMS ERROR:", err);
    return res.status(500).json({
      error: "Failed to process symptoms"
    });
  }
};

/*
================================================
NURSE
================================================
*/

export const nurseAssessmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    trace("nurse", id);

    let record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    // 🔒 Ensure encounter_data exists
    record.encounter_data = record.encounter_data || {};

    // 🔒 INIT nurse session if missing (temporary inline approach)
    if (!record.encounter_data.nurseSession) {
      record.encounter_data.nurseSession = {
        status: "active",
        startedAt: new Date(),
        data: {}
      };
    }

    const nurseSession = record.encounter_data.nurseSession;

    // ====================================================
    // 🧠 STAGE SWITCH
    // ====================================================
    switch (stage) {

      /*
      ================================================
      1. VALIDATION (AI → Nurse Decision)
      ================================================
      */
      case "validation": {
        const { action, notes, escalation } = req.body;

        nurseSession.data.nurseDecision = {
          action,
          notes,
          escalation,
          timestamp: new Date()
        };

        record.status = "nurse_validated";
        break;
      }

      /*
      ================================================
      2. COMPLETION (NO ESCALATION PATH)
      ================================================
      */
      case "completion": {
        const {
          treatment,
          followUpRequired,
          appointmentDate,
          closeCase
        } = req.body;

        if (!nurseSession.data?.nurseDecision) {
          throw new Error("Validation must happen first");
        }

        if (nurseSession.data.nurseDecision.escalation === true) {
          throw new Error("Cannot complete — escalation already chosen");
        }

        // 🔐 VALIDATION
        if (!treatment) throw new Error("Treatment required");

        if (followUpRequired && !appointmentDate) {
          throw new Error("Appointment date required");
        }

        if (!followUpRequired && !closeCase) {
          throw new Error("Case must be closed if no follow-up");
        }

        // 🧾 SAVE
        nurseSession.data.nurseDecision = {
          ...nurseSession.data.nurseDecision,
          treatment,
          followUpRequired,
          appointmentDate,
          timestamp: new Date()
        };

        // 📅 APPOINTMENT
        if (followUpRequired) {
          record.encounter_data.appointment = {
            date: appointmentDate,
            status: "scheduled",
            createdAt: new Date()
          };
        }

        // ✅ COMPLETE

================================================
NURSE ENGINE (FINAL — STAGE BASED + HANDOVER SAFE)
================================================
*/
export const nurseAssessmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    trace("nurse", id);

    let record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    // 🔒 Ensure encounter_data exists
    record.encounter_data = record.encounter_data || {};

    // 🔒 INIT nurse session (single active session model)
    if (!record.encounter_data.nurseSession) {
      record.encounter_data.nurseSession = {
        status: "active",
        startedAt: new Date(),
        completedAt: null,
        data: {}
      };
    }

    const nurseSession = record.encounter_data.nurseSession;

    // 🚫 Prevent operations on completed session
    if (nurseSession.status === "completed") {
      throw new Error("Nurse session already completed");
    }

    // ====================================================
    // 🧠 STAGE SWITCH
    // ====================================================
    switch (stage) {

      /*
      ================================================
      1. VALIDATION (AI → Nurse Decision)
      ================================================
      */
      case "validation": {
        const { action, notes, escalation } = req.body;

        if (typeof escalation !== "boolean") {
          throw new Error("Escalation must be true/false");
        }

        nurseSession.data.nurseDecision = {
          action,
          notes,
          escalation,
          timestamp: new Date()
        };

        record.status = "nurse_validated";
        record.current_owner = "nurse";

        record.timeline = [
          ...(record.timeline || []),
          {
            event: escalation
              ? "⚠️ Nurse marked for escalation"
              : "✅ Nurse validated case (no escalation)",
            timestamp: new Date().toISOString()
          }
        ];

        break;
      }

      /*
      ================================================
      2. COMPLETION (NO ESCALATION PATH)
      ================================================
      */
      case "completion": {
        const {
          treatment,
          followUpRequired,
          appointmentDate,
          closeCase
        } = req.body;

        if (!nurseSession.data?.nurseDecision) {
          throw new Error("Validation must happen first");
        }

        if (nurseSession.data.nurseDecision.escalation === true) {
          throw new Error("Cannot complete — escalation already chosen");
        }

        // 🔐 VALIDATION RULES
        if (!treatment) throw new Error("Treatment required");

        if (followUpRequired === true && !appointmentDate) {
          throw new Error("Appointment date required");
        }

        if (followUpRequired === false && closeCase !== true) {
          throw new Error("Case must be closed if no follow-up");
        }

        // 🧾 SAVE FINAL NURSE DECISION
        nurseSession.data.nurseDecision = {
          ...nurseSession.data.nurseDecision,
          treatment,
          followUpRequired,
          appointmentDate,
          timestamp: new Date()
        };

        // 📅 APPOINTMENT HANDLING
        if (followUpRequired) {
          record.encounter_data.appointment = {
            date: appointmentDate,
            status: "scheduled",
            createdAt: new Date()
          };
        }

        // ✅ COMPLETE SESSION
        nurseSession.status = "completed";
        nurseSession.completedAt = new Date();

        record.status = "completed";
        record.current_owner = null;

        record.timeline = [
          ...(record.timeline || []),
          {
            event: followUpRequired
              ? "📅 Nurse completed + follow-up scheduled"
              : "✅ Nurse completed + case closed",
            timestamp: new Date().toISOString()
          }
        ];

        break;
      }

      /*
      ================================================
      3. ESCALATION → HANDOVER (WITH SLA)
      ================================================
      */
      case "escalation": {
        const { notes } = req.body;

        if (!nurseSession.data?.nurseDecision) {
          throw new Error("Validation must happen first");
        }

        if (nurseSession.data.nurseDecision.escalation !== true) {
          throw new Error("Escalation must be set to true in validation");
        }

        const SLA_MINUTES = 5;

        // 🧾 UPDATE DECISION
        nurseSession.data.nurseDecision = {
          ...nurseSession.data.nurseDecision,
          notes,
          escalation: true,
          timestamp: new Date()
        };

        // 🔥 HANDOVER STATE (NO WHITE WALL)
        record.status = "handover_pending";
        record.current_owner = "system";

        record.handoverStartedAt = new Date();
        record.slaDeadline = new Date(Date.now() + SLA_MINUTES * 60000);

        nurseSession.status = "handover_pending";

        record.timeline = [
          ...(record.timeline || []),
          {
            event: "🚨 Nurse escalated → awaiting doctor (handover started)",
            timestamp: new Date().toISOString()
          }
        ];

        break;
      }

      default:
        throw new Error("Invalid stage");
    }

    // ====================================================
    // 🧼 CLEAN + SAVE
    // ====================================================
    const cleaned = cleanBeforeSave(record);

    const updated = await updateEncounterDB(id, cleaned, record.status);

    return res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    console.error("NURSE ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};
/*
================================================
DOCTOR CLAIM (HANDOVER SAFE — NO WHITE WALL)
================================================
*/
export const doctorClaimHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("doctor_claim", id);

    let record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    // 🔒 ONLY ALLOW CLAIM FROM HANDOVER STATES
    if (
      record.status !== "handover_pending" &&
      record.status !== "critical_alert"
    ) {
      throw new Error("Case not available for claim");
    }

    record.encounter_data = record.encounter_data || {};

    const nurseSession = record.encounter_data.nurseSession;

    if (!nurseSession || nurseSession.status !== "handover_pending") {
      throw new Error("Invalid nurse session state");
    }

    // ====================================================
    // 👨‍⚕️ ASSIGN DOCTOR
    // ====================================================
    const doctorId = req.user?.id || "doctor_1"; // temp fallback

    record.doctor = {
      id: doctorId,
      assignedAt: new Date()
    };

    // ====================================================
    // 🔄 TRANSITION STATE
    // ====================================================
    record.status = "doctor_active";
    record.current_owner = "doctor";

    // ====================================================
    // ✅ CLOSE NURSE SESSION (SAFE POINT)
    // ====================================================
    nurseSession.status = "completed";
    nurseSession.completedAt = new Date();

    // ====================================================
    // 🆕 CREATE DOCTOR SESSION
    // ====================================================
    record.encounter_data.doctorSession = {
      status: "active",
      startedAt: new Date(),
      completedAt: null,
      data: {}
    };

    // ====================================================
    // 🧾 TIMELINE (AUDIT TRAIL)
    // ====================================================
    record.timeline = [
      ...(record.timeline || []),
      {
        event: "👨‍⚕️ Doctor claimed case (handover completed)",
        doctorId,
        timestamp: new Date().toISOString()
      }
    ];

    // ====================================================
    // 🧼 CLEAN SLA FLAGS (OPTIONAL BUT GOOD)
    // ====================================================
    record.slaBreached = false;

    // ====================================================
    // 💾 SAVE
    // ====================================================
    const cleaned = cleanBeforeSave(record);

    const updated = await updateEncounterDB(id, cleaned, record.status);

    return res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    console.error("DOCTOR CLAIM ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};
        
/*

/*
================================================
DOCTOR ENGINE (SESSION-BASED — HANDOVER ALIGNED)
================================================
*/
export const doctorConsultationHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("doctor", id);

    let record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    record.encounter_data = record.encounter_data || {};

    // ====================================================
    // 🔒 ONLY ALLOW ACCESS AFTER CLAIM
    // ====================================================
    if (record.status !== "doctor_active") {
      throw new Error("Doctor must claim case before consultation");
    }

    // ====================================================
    // 🧠 ENSURE DOCTOR SESSION EXISTS
    // ====================================================
    if (!record.encounter_data.doctorSession) {
      throw new Error("Doctor session not initialized");
    }

    const doctorSession = record.encounter_data.doctorSession;

    if (doctorSession.status === "completed") {
      throw new Error("Doctor session already completed");
    }

    // ====================================================
    // 🧾 OPTIONAL SAFETY DECISION (KEEP AI FALLBACK)
    // ====================================================
    record = await ensureDecision(record);

    // ====================================================
    // 🔄 MARK ACTIVE INTERACTION
    // ====================================================
    record.timeline = [
      ...(record.timeline || []),
      {
        event: "👨‍⚕️ Doctor opened case",
        timestamp: new Date().toISOString()
      }
    ];

    // ====================================================
    // 💾 SAVE (NO STATE CHANGE YET)
    // ====================================================
    const cleaned = cleanBeforeSave(record);

    const updated = await updateEncounterDB(id, cleaned, record.status);

    return res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    console.error("DOCTOR ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
GET + TIMELINE
================================================
*/
export const getEncounterHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("get", id);

    const record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    return res.json({
      status: record.status,
      encounter: sanitizeResponse(record)
    });

  } catch (err) {
    console.error("GET ERROR:", err);
    return res.status(500).json({ error: "Fetch failed" });
  }
};

export const getEncounterTimelineHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("timeline", id);

    const record = await getEncounterDB(id);

    return res.json({
      status: record.status,
      encounter: sanitizeResponse(record),
      timeline: record.timeline || []
    });

  } catch (err) {
    console.error("TIMELINE ERROR:", err);
    return res.status(500).json({ error: "Timeline fetch failed" });
  }
};

/*
================================================
VALIDATE (CLINICAL GOVERNANCE)
================================================
*/
export const validateEncounterHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("validate", id);

    let record = await getEncounterDB(id);

    record = await ensureDecision(record);

    const updatedData = await processCaseState(record, "validate", {});

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

    return res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    console.error("VALIDATE ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
DOCTOR NOTES
================================================
*/
export const doctorNotesHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    trace("doctor_notes", id);

    let record = await getEncounterDB(id);

    const updatedData = await processCaseState(
      record,
      "doctor_notes",
      { notes }
    );

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

    return res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    console.error("DOCTOR NOTES ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
DOCTOR DECISION (FINAL AUTHORITY)
================================================
*/
export const doctorDecisionHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body;

    trace("doctor_decision", id);

    let record = await getEncounterDB(id);

    record = await ensureDecision(record);

    let action;

    if (decision === "escalate") action = "escalate";
    else if (decision === "followup") action = "followup";
    else action = "treat";

    const updatedData = await processCaseState(
      record,
      action,
      {}
    );

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

    return res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    console.error("DOCTOR DECISION ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};
