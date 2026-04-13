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
INTAKE (🔥 FIXED)
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

    const updated = await updateEncounterDB(
      id,
      cleaned,
      cleaned.status
    );

    const response = sanitizeResponse(updated);

    return res.json({
      status: response.status,
      encounter: response
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

    trace("vitals", id);

    const record = await getEncounterDB(id);

    const updatedData = await processCaseState(record, "vitals", req.body);

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

    return res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    console.error("VITALS ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
SYMPTOMS (🔥 DEMO CORE)
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

    const updatedData = await processCaseState(
      record,
      "symptoms",
      { symptoms, rules, ai, finalSeverity }
    );

    const cleaned = cleanBeforeSave(updatedData);

    const updated = await updateEncounterDB(id, cleaned, cleaned.status);

    return res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated),
      ai,
      rules
    });

  } catch (err) {
    console.error("SYMPTOMS ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
NURSE (HYBRID CONTROL)
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
DOCTOR ASSIGNMENT (🔥 NEW)
================================================
*/
export const assignDoctorHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("doctor_assign", id);

    const record = await getEncounterDB(id);

    const updated = {
      ...record,
      doctor_assigned: true,
      doctor_id: "DOC-" + crypto.randomUUID().slice(0, 6)
    };

    const saved = await updateEncounterDB(id, updated, updated.status);

    return res.json({
      status: saved.status,
      encounter: sanitizeResponse(saved)
    });

  } catch (err) {
    console.error("DOCTOR ASSIGN ERROR:", err);
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

    return res.json(sanitizeResponse(record));

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

    return res.json({
      timeline: record.timeline || []
    });

  } catch (err) {
    res.status(500).json({ error: "Timeline fetch failed" });
  }
};
