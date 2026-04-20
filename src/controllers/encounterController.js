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
UTIL
================================================
*/
const trace = (stage, id) => {
  console.log(`🧭 [${stage.toUpperCase()}] id: ${id}`);
};

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
DECISION GUARD (AI ≠ AUTHORITY)
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
      encounter_data: {},
      timeline: []
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
GET
================================================
*/
export const getEncounterHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json({
      encounter: sanitizeResponse(record)
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
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

    const record = await getEncounterDB(id);

    res.json({
      timeline: record.timeline || []
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
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

    record.timeline.push({
      event: "📝 Intake captured",
      timestamp: new Date().toISOString()
    });

    const updated = await updateEncounterDB(id, cleanBeforeSave(record), record.status);

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

    trace("vitals", id);

    let record = await getEncounterDB(id);

    record.encounter_data = record.encounter_data || {};

    record.encounter_data.vitals = {
      heart_rate: Number(req.body.heartRate) || null,
      temperature: Number(req.body.temperature) || null,
      blood_pressure: req.body.bloodPressure || null,
      spo2: Number(req.body.oxygenSaturation) || null
    };

    record.status = "vitals_recorded";

    record.timeline.push({
      event: "🩺 Vitals recorded",
      timestamp: new Date().toISOString()
    });

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

    trace("symptoms", id);

    let record = await getEncounterDB(id);
    record.encounter_data = record.encounter_data || {};

    const symptoms =
      typeof req.body.symptoms === "string"
        ? req.body.symptoms.split(",").map(s => s.trim())
        : req.body.symptoms || [];

    record.encounter_data.symptoms = symptoms;

    // AI (assistive only)
    try {
      const ai = await callAIOrchestrator({
        inputText: symptoms.join(", "),
        vitals: record.encounter_data.vitals || {},
        symptoms
      });
      record.encounter_data.ai = ai;
    } catch {
      record.encounter_data.ai = null;
    }

    // Decision (PRIMARY LOGIC)
    const decision = await evaluateEncounter(record.encounter_data);

    record.encounter_data.decision = decision;
    record.encounter_data.finalSeverity = decision.finalSeverity;

    record.status = "symptoms_recorded";

    record.timeline.push({
      event: "🧠 Symptoms processed + decision generated",
      timestamp: new Date().toISOString()
    });

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
VALIDATE (HUMAN-IN-LOOP 🔥)
================================================
*/
export const validateEncounterHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("validate", id);

    let record = await getEncounterDB(id);
    record = await ensureDecision(record);

    record.encounter_data.validation = {
      notes: req.body?.notes || null,
      timestamp: new Date()
    };

    record.status = "validated";

    record.timeline.push({
      event: "✅ Human validation completed",
      timestamp: new Date().toISOString()
    });

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
NURSE ENGINE
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

    record.timeline.push({
      event: `👩‍⚕️ Nurse stage: ${stage}`,
      timestamp: new Date().toISOString()
    });

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
DOCTOR CLAIM
================================================
*/
export const doctorClaimHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("doctor_claim", id);

    let record = await getEncounterDB(id);

    if (record.status !== "handover_pending") {
      throw new Error("Not ready for doctor");
    }

    record.encounter_data.doctorSession = {
      status: "active",
      data: {}
    };

    record.status = "doctor_active";
    record.current_owner = "doctor";

    record.timeline.push({
      event: "👨‍⚕️ Doctor claimed case",
      timestamp: new Date().toISOString()
    });

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
DOCTOR CONSULTATION (AUDIT)
================================================
*/
export const doctorConsultationHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("doctor_open", id);

    let record = await getEncounterDB(id);

    if (record.status !== "doctor_active") {
      throw new Error("Doctor must claim first");
    }

    record.timeline.push({
      event: "👨‍⚕️ Doctor opened case",
      timestamp: new Date().toISOString()
    });

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
DOCTOR WORK (SOAN + FINAL)
================================================
*/
export const doctorWorkHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    trace("doctor_work", id);

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

    record.timeline.push({
      event: `👨‍⚕️ Doctor stage: ${stage}`,
      timestamp: new Date().toISOString()
    });

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
🧠 BUILD SOAN VIEW (UNIFIED CLINICAL CARD)
================================================
*/
const buildSOANView = (record) => {
  const ed = record.encounter_data || {};

  const ai = ed.ai || {};
  const decision = ed.decision || {};
  const nurse = ed.nurseSession?.data || {};
  const doctor = ed.doctorSession?.data || {};

  return {
    patient: record.patient_data,

    triage: {
      severity: decision.triage?.severity || ed.finalSeverity || "UNKNOWN",
      escalation: decision.triage?.escalation || false
    },

    SOAN: {
      S: {
        symptoms: ed.symptoms || [],
        intakeNotes: ed.intake || {},
        aiSummary: ai?.summary || ai?.analysis || null
      },

      O: {
        vitals: ed.vitals || {},
        aiFindings: ai?.clinicalFindings || null
      },

      A: {
        aiAssessment: ai?.riskAssessment || null,
        nurseValidation: nurse?.validation || nurse?.nurseDecision || null,
        finalSeverity: ed.finalSeverity || null
      },

      N: {
        doctorNotes: doctor?.soan || null,
        treatment: doctor?.treatment || null,
        followUp: doctor?.followUpRequired || null,
        appointment: ed.appointment || null
      }
    }
  };
};
