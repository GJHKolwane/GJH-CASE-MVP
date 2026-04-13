// src/controllers/encounterController.js

import crypto from "crypto";

import {
  createEncounterDB,
  getEncounterDB,
  updateEncounterDB
} from "../services/dbService.js";

import {
  processCaseState
} from "../services/clinicalStateMachine.js";

import {
  evaluateEncounter
} from "../services/clinicalDecision.service.js";

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
🧼 RESPONSE SANITIZER (CRITICAL)
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

  if (!ed.finalSeverity) {
    const decision = await evaluateEncounter({
      vitals: ed.vitals,
      symptoms: ed.symptoms,
      notes: ed?.triage?.notes
    });

    data.encounter_data.finalSeverity = decision.finalSeverity;
    data.encounter_data.ai = decision.ai;
    data.rules = decision.rules;

    data.timeline = [
      ...(data.timeline || []),
      {
        event: "🛡️ Safety decision engine executed",
        decision,
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

    res.json(sanitizeResponse(encounter));

  } catch (err) {
    console.error("CREATE ENCOUNTER ERROR:", err);
    res.status(500).json({ error: "Failed to create encounter" });
  }
};

/*
================================================
INTAKE
================================================
*/
export const intakeHandler = async (req, res) => {

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

    // 🔥 FIX STARTS HERE
    const response = sanitizeResponse(updated);

    return res.json({
      status: response.status,   // ✅ CRITICAL
      encounter: response        // ✅ FULL DATA
    });

  } catch (err) {
    console.error("INTAKE ERROR:", err);
    res.status(400).json({ error: err.message });
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

    trace("vitals", id);

    const record = await getEncounterDB(id);

    const updatedData = await processCaseState(record, "vitals", req.body);

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

    res.json(sanitizeResponse(updated));

  } catch (err) {
    console.error("VITALS ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
SYMPTOMS (NO ROUTING HERE ❌)
================================================
*/
export const addSymptomsHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("symptoms", id);

    const record = await getEncounterDB(id);

    const symptoms = Array.isArray(req.body?.symptoms)
      ? req.body.symptoms
      : [];

    const rawVitals = record?.encounter_data?.vitals || {};
    const normalizedVitals = rawVitals?.vitals || rawVitals;

    const notes = record?.encounter_data?.notes || "";

    const result = await evaluateEncounter({
      vitals: normalizedVitals,
      symptoms,
      notes
    });

    const { rules, ai, finalSeverity } = result;

    const enrichedPayload = {
      symptoms,
      rules,
      ai,
      finalSeverity
    };

    const updatedData = await processCaseState(
      record,
      "symptoms",
      enrichedPayload
    );

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

    res.json(sanitizeResponse(updated));

  } catch (err) {
    console.error("SYMPTOMS ERROR:", err);
    res.status(400).json({ error: err.message });
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

    const ed = updatedData.encounter_data;

    const decision = await evaluateEncounter({
      vitals: ed.vitals,
      symptoms: ed.symptoms,
      triage: ed.triage,
      notes: req.body.notes
    });

    updatedData.encounter_data.finalSeverity = decision.finalSeverity;
    updatedData.encounter_data.ai = decision.ai;
    updatedData.rules = decision.rules;

    updatedData.timeline = [
      ...(updatedData.timeline || []),
      {
        event: "🧠 Clinical decision engine executed",
        decision,
        timestamp: new Date().toISOString()
      }
    ];

    updatedData = await ensureDecision(updatedData);

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

    res.json({
      success: true,
      decision,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    console.error("NURSE ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
VALIDATION
================================================
*/
export const validateEncounterHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("validate", id);

    let record = await getEncounterDB(id);

    record = await ensureDecision(record);

    const updatedData = await processCaseState(record, "validate", req.body);

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

    res.json(sanitizeResponse(updated));

  } catch (err) {
    console.error("VALIDATION ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
DECISION
================================================
*/
export const decisionHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    trace("decision", id);

    let record = await getEncounterDB(id);

    record = await ensureDecision(record);

    let action;

    if (type === "doctor_escalation") action = "escalate";
    else if (type === "followup_scheduled") action = "followup";
    else action = "treat";

    const updatedData = await processCaseState(record, action, req.body);

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

    res.json(sanitizeResponse(updated));

  } catch (err) {
    console.error("DECISION ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
DOCTOR CONSULTATION
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

    res.json(sanitizeResponse(updated));

  } catch (err) {
    console.error("DOCTOR CONSULT ERROR:", err);
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

    trace("doctor_notes", id);

    let record = await getEncounterDB(id);

    record = await ensureDecision(record);

    const updatedData = await processCaseState(
      record,
      "doctor_notes",
      req.body
    );

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

    res.json(sanitizeResponse(updated));

  } catch (err) {
    console.error("DOCTOR NOTES ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
DOCTOR DECISION
================================================
*/
export const doctorDecisionHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("doctor_decision", id);

    let record = await getEncounterDB(id);

    record = await ensureDecision(record);

    const updatedData = await processCaseState(
      record,
      "doctor_decision",
      req.body
    );

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

    res.json(sanitizeResponse(updated));

  } catch (err) {
    console.error("DOCTOR DECISION ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
GET
================================================
*/
export const getEncounterHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("get", id);

    const record = await getEncounterDB(id);

    res.json(sanitizeResponse(record));

  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
};

/*
================================================
TIMELINE
================================================
*/
export const getEncounterTimelineHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("timeline", id);

    const record = await getEncounterDB(id);

    res.json({
      timeline: record.timeline || []
    });

  } catch (err) {
    res.status(500).json({ error: "Timeline fetch failed" });
  }
};
