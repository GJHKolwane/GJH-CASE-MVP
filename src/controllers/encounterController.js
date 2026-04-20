// src/controllers/encounterController.js

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
UTIL — TRACE LOGGER
================================================
*/
const trace = (stage, id) => {
  console.log(`🧭 [${stage.toUpperCase()}] id: ${id}`);
};

/*
================================================
SANITIZER
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

const cleanBeforeSave = (data) => {
  if (data.encounter_data) {
    delete data.encounter_data.routing;
    delete data.encounter_data.escalation;
  }
  return data;
};

/*
================================================
DECISION GUARD (SINGLE SOURCE 🔥)
================================================
*/
const ensureDecision = async (record) => {
  const ed = record.encounter_data || {};

  if (!ed.decision) {
    const decision = await evaluateEncounter(ed);

    ed.decision = decision;
    ed.finalSeverity = decision.finalSeverity;
    ed.rules = decision.rules;

    record.timeline = [
      ...(record.timeline || []),
      {
        event: "🛡️ Decision engine fallback",
        timestamp: new Date().toISOString()
      }
    ];
  }

  return record;
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
        name: body.patient_data?.name || body.name || "Unknown Patient"
      },
      national_id: body.national_id || null,
      status: "created",
      current_state: "created",
      encounter_data: {}
    };

    const encounter = await createEncounterDB(normalized);

    trace("create", encounter.id);

    res.json({
      status: encounter.status,
      encounter: sanitizeResponse(encounter)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Create failed" });
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

    let record = await getEncounterDB(id);

    record = await processCaseState(record, "intake", {
      intake: req.body.intake
    });

    const updated = await updateEncounterDB(
      id,
      cleanBeforeSave(record),
      record.status
    );

    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
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
    const { heartRate, temperature, bloodPressure, oxygenSaturation } = req.body;

    trace("vitals", id);

    let record = await getEncounterDB(id);

    record.encounter_data = record.encounter_data || {};

    record.encounter_data.vitals = {
      heart_rate: Number(heartRate) || null,
      temperature: Number(temperature) || null,
      blood_pressure: bloodPressure || null,
      spo2: Number(oxygenSaturation) || null
    };

    record.status = "vitals_recorded";

    const updated = await updateEncounterDB(id, record, record.status);

    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
SYMPTOMS + AI + DECISION
================================================
*/
export const addSymptomsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { symptoms } = req.body;

    trace("symptoms", id);

    let record = await getEncounterDB(id);
    record.encounter_data = record.encounter_data || {};

    const normalized =
      typeof symptoms === "string"
        ? symptoms.split(",").map(s => s.trim())
        : symptoms || [];

    record.encounter_data.symptoms = normalized;

    // AI (assistive only)
    try {
      const ai = await callAIOrchestrator({
        inputText: normalized.join(", "),
        vitals: record.encounter_data.vitals || {},
        symptoms: normalized
      });

      record.encounter_data.ai = ai;
    } catch {
      record.encounter_data.ai = null;
    }

    // Decision (PRIMARY)
    const decision = await evaluateEncounter(record.encounter_data);

    record.encounter_data.decision = decision;
    record.encounter_data.finalSeverity = decision.finalSeverity;

    record.status = "symptoms_recorded";

    const updated = await updateEncounterDB(id, record, record.status);

    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated),
      decision
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/*
================================================
NURSE (VALIDATE / COMPLETE / ESCALATE)
================================================
*/
export const nurseAssessmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    trace("nurse", id);

    let record = await getEncounterDB(id);
    record = await ensureDecision(record);

    record.encounter_data.nurseSession =
      record.encounter_data.nurseSession || {
        status: "active",
        data: {}
      };

    const session = record.encounter_data.nurseSession;

    switch (stage) {
      case "validation":
        session.data.validation = req.body;
        record.status = "nurse_validated";
        break;

      case "completion":
        session.status = "completed";
        record.status = "completed";
        break;

      case "escalation":
        session.status = "handover";
        record.status = "handover_pending";
        break;

      default:
        throw new Error("Invalid stage");
    }

    const updated = await updateEncounterDB(id, record, record.status);

    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
DOCTOR CLAIM (🔥 MISSING PIECE FIXED)
================================================
*/
export const doctorClaimHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("doctor_claim", id);

    let record = await getEncounterDB(id);

    if (record.status !== "handover_pending") {
      throw new Error("Case not ready for doctor");
    }

    record.encounter_data.doctorSession = {
      status: "active",
      data: {}
    };

    record.status = "doctor_active";
    record.current_owner = "doctor";

    const updated = await updateEncounterDB(id, record, record.status);

    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
DOCTOR WORK (SOAN + FINAL DECISION)
================================================
*/
export const doctorWorkHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    trace("doctor", id);

    let record = await getEncounterDB(id);
    record = await ensureDecision(record);

    const session = record.encounter_data.doctorSession;

    if (!session || record.status !== "doctor_active") {
      throw new Error("Doctor must claim case first");
    }

    switch (stage) {
      case "notes":
        session.data.soan = req.body;
        break;

      case "decision":
        session.status = "completed";
        record.status = "completed";
        record.current_owner = null;
        break;

      default:
        throw new Error("Invalid stage");
    }

    const updated = await updateEncounterDB(id, record, record.status);

    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
