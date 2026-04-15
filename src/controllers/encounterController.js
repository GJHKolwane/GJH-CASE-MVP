// src/controllers/encounterController.js

import crypto from "crypto";
import pool from "../config/db.js";

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
SYMPTOMS
================================================
*/

import { evaluateClinicalState } from "../services/clinicalRulesEngine.js";

export const addSymptomsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { symptoms } = req.body;

    console.log("🧾 [SYMPTOMS] id:", id);

    // =========================
    // 1. FETCH ENCOUNTER
    // =========================
    const result = await pool.query(
      "SELECT * FROM encounters WHERE id = $1",
      [id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    const encounter = result.rows[0];
    const encounterData = encounter.encounter_data || {};

    // =========================
    // 2. SAVE SYMPTOMS
    // =========================
    const normalizedSymptoms = Array.isArray(symptoms)
      ? symptoms
      : [];

    encounterData.symptoms = normalizedSymptoms;

    // =========================
    // 🔥 3. HYBRID AI ENGINE
    // =========================
    console.log("🧠 HYBRID AI ENGINE RUNNING");

    const clinicalInput = {
      vitals: encounterData.vitals || {},
      symptoms: normalizedSymptoms,
      intake: encounterData.intake || {},
      patient: encounterData.patient || {}
    };

    const aiResult = evaluateClinicalState(clinicalInput);

    console.log("🧠 AI RESULT:", aiResult);

    // =========================
    // 🔥 4. STATE DECISION
    // =========================
    let newStatus = "symptoms_recorded";

    if (aiResult?.autoDecision?.type === "doctor_escalation") {
      newStatus = "doctor_escalation";
      console.log("🚨 AUTO ESCALATION TRIGGERED");
    }

    // =========================
    // 5. STORE AI OUTPUT
    // =========================
    encounterData.ai = aiResult;

    // =========================
    // 6. UPDATE DB
    // =========================
    await pool.query(
      `
      UPDATE encounters
      SET encounter_data = $1,
          status = $2,
          updated_at = NOW()
      WHERE id = $3
      `,
      [encounterData, newStatus, id]
    );

    // =========================
    // 7. RESPONSE
    // =========================
    return res.json({
      status: newStatus,
      encounter_data: encounterData,
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
VALIDATE
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
SYSTEM DECISION
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

    return res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    console.error("DECISION ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
DOCTOR CONSULT
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
DOCTOR NOTES
================================================
*/
export const doctorNotesHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    trace("doctor_notes", id);

    let record = await getEncounterDB(id);

    const updated = {
      ...record,
      encounter_data: {
        ...record.encounter_data,
        doctorNotes: notes
      }
    };

    const saved = await updateEncounterDB(id, updated, updated.status);

    return res.json({
      status: saved.status,
      encounter: sanitizeResponse(saved)
    });

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
    const { decision, notes } = req.body;

    trace("doctor-decision", id);

    let record = await getEncounterDB(id);

    record = await ensureDecision(record);

    let action;

    if (decision === "escalate") action = "escalate";
    else if (decision === "followup") action = "followup";
    else action = "treat";

    const updatedData = await processCaseState(
      record,
      action,
      { doctorNotes: notes }
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

/*

/*
================================================
GET SINGLE ENCOUNTER (FINAL - PRODUCTION SAFE)
================================================
*/
export const getEncounterHandler = async (req, res) => {
  try {
    const { id } = req.params;

    // 🔍 TRACE
    trace("get", id);

    // 🔍 FETCH FROM DB
    const record = await getEncounterDB(id);

    // 🚨 SAFETY CHECK (extra guard)
    if (!record) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    // ✅ SUCCESS RESPONSE
    return res.json({
      status: record.status,
      encounter: sanitizeResponse(record)
    });

  } catch (err) {
    console.error("GET ERROR:", err);

    // 🎯 CONTROLLED ERRORS
    if (err.message === "Invalid UUID provided to getEncounterDB") {
      return res.status(400).json({
        error: "Invalid encounter ID"
      });
    }

    if (err.message === "Encounter not found") {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    // 💥 FALLBACK
    return res.status(500).json({
      error: "Fetch failed"
    });
  }
};

/*
================================================
TIMELINE (🔥 FIXED)
================================================
*/
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
