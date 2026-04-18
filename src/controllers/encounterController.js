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

    trace("nurse", id);

    let record = await getEncounterDB(id);

    let updatedData = await processCaseState(record, "nurse", req.body);

    updatedData = await ensureDecision(updatedData);

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

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
DOCTOR FLOW
================================================
*/
export const doctorConsultationHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("doctor_consult", id);

    let record = await getEncounterDB(id);

    record = await ensureDecision(record);

    const updatedData = await processCaseState(record, "doctor", {});

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

    return res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    console.error("DOCTOR CONSULT ERROR:", err);
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
