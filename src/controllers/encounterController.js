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
  evaluateClinicalState
} from "../services/clinicalRulesEngine.js";

import {
  evaluateEncounter
} from "../services/clinicalDecision.service.js";

import {
  callAIOrchestrator
} from "../services/aiOrchestrator.client.js";

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

    res.json(encounter);

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
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("intake", id);

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const { intake } = req.body;

    if (!intake) {
      return res.status(400).json({
        error: "Missing structured intake data"
      });
    }

    const updatedData = await processCaseState(
      record,
      "intake",
      { intake }
    );

    const updated = await updateEncounterDB(
      id,
      updatedData,
      updatedData.status
    );

    res.json(updated);

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
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("vitals", id);

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const updatedData = await processCaseState(
      record,
      "vitals",
      req.body
    );

    const updated = await updateEncounterDB(
      id,
      updatedData,
      updatedData.status
    );

    res.json(updated);

  } catch (err) {
    console.error("VITALS ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
SYMPTOMS (EARLY TRIAGE WITH RULES)
================================================
*/
export const addSymptomsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("symptoms", id);

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const symptoms = Array.isArray(req.body?.symptoms)
      ? req.body.symptoms
      : [];

    const vitals = record?.encounter_data?.vitals || {};

    // 🛡️ RULES ENGINE FIRST (EARLY DETECTION)
    const rules = evaluateClinicalState({
      vitals,
      symptoms
    });

    let severity = rules.severity.toUpperCase();

    const enrichedPayload = {
      ...req.body,
      symptoms,
      rules,

      triage: {
        severity,
        source: "rules-early"
      },

      finalSeverity: severity
    };

    console.log("🛡️ RULES (Symptoms Stage):", rules);
    console.log("🔥 Early Severity:", severity);

    const updatedData = await processCaseState(
      record,
      "symptoms",
      enrichedPayload
    );

    const updated = await updateEncounterDB(
      id,
      updatedData,
      updatedData.status
    );

    res.json(updated);

  } catch (err) {
    console.error("SYMPTOMS ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
NURSE (FULL CLINICAL DECISION ENGINE)
================================================
*/
export const nurseAssessmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("nurse", id);

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    let updatedData = await processCaseState(
      record,
      "nurse",
      req.body
    );

    const ed = updatedData.encounter_data;

    // 🔥 FULL ENGINE (RULES + AI + FUSION)
    const decision = await evaluateEncounter({
      vitals: ed.vitals,
      symptoms: ed.symptoms,
      notes: req.body.notes
    });

    const now = new Date().toISOString();

    updatedData.encounter_data.rules = decision.rules;
    updatedData.encounter_data.ai = decision.ai;
    updatedData.encounter_data.finalSeverity = decision.finalSeverity;

    updatedData.encounter_data.triage = {
      severity: decision.finalSeverity
    };

    updatedData.timeline = [
      ...(updatedData.timeline || []),
      {
        event: "🧠 Clinical decision engine executed",
        decision,
        timestamp: now
      }
    ];

    const updated = await updateEncounterDB(
      id,
      updatedData,
      updatedData.status
    );

    res.json({
      success: true,
      decision,
      encounter: updated
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

    const record = await getEncounterDB(id);

    const updatedData = await processCaseState(
      record,
      "validate",
      req.body
    );

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

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

    const record = await getEncounterDB(id);

    let action;

    if (type === "doctor_escalation") action = "escalate";
    else if (type === "followup_scheduled") action = "followup";
    else action = "treat";

    const updatedData = await processCaseState(
      record,
      action,
      req.body
    );

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

  } catch (err) {
    console.error("DECISION ERROR:", err);
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

    res.json(record);

  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
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

    const record = await getEncounterDB(id);

    const updatedData = await processCaseState(
      record,
      "doctor",
      {}
    );

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

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

    const record = await getEncounterDB(id);

    const updatedData = await processCaseState(
      record,
      "doctor_notes",
      req.body
    );

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

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

    const record = await getEncounterDB(id);

    const updatedData = await processCaseState(
      record,
      "doctor_decision",
      req.body
    );

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

  } catch (err) {
    console.error("DOCTOR DECISION ERROR:", err);
    res.status(400).json({ error: err.message });
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
