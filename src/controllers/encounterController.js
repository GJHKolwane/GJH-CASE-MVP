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
  evaluateRisk,
  shouldEscalate
} from "../engine/risk.engine.js";

import {
  callAIOrchestrator
} from "../services/aiOrchestrator.client.js";

/*
================================================
CREATE
================================================
*/
export const createEncounterHandler = async (req, res) => {
  try {
    const { national_id } = req.body || {};

    const encounterId = crypto.randomUUID();
    const patientId = crypto.randomUUID();

    const payload = {
      id: encounterId,
      patient_id: patientId,
      national_id: national_id || null,
      status: "CREATED",
      encounter_data: {
        timeline: [
          {
            event: "🆕 Encounter created",
            timestamp: new Date().toISOString()
          }
        ]
      }
    };

    await createEncounterDB(payload);

    res.json({ id: encounterId, success: true });

  } catch (err) {
    console.error("❌ CREATE ERROR:", err);
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

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    let updatedData = await processCaseState(
      record.encounter_data,
      "intake",
      { intake: req.body }
    );

    updatedData.encounter_data = updatedData.encounter_data || {};
    updatedData.timeline = updatedData.timeline || [];

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
VITALS (CORE ENGINE)
================================================
*/
export const addVitalsHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    let updatedData = await processCaseState(
      record.encounter_data,
      "vitals",
      { vitals: req.body }
    );

    updatedData.encounter_data = updatedData.encounter_data || {};
    updatedData.timeline = updatedData.timeline || [];

    const result = evaluateRisk({
      ...(updatedData.encounter_data.vitals || {}),
      symptoms: updatedData.encounter_data.symptoms || []
    });

    const escalate = shouldEscalate(result.level);

    updatedData.encounter_data.triage = {
      severity: result.level,
      reason: result.reason
    };

    updatedData.escalation = {
      status: escalate,
      reason: escalate ? result.reason : null
    };

    if (escalate) {
      updatedData.status = "doctor_escalation";

      updatedData.decision = {
        type: "doctor_escalation",
        timestamp: new Date().toISOString()
      };

      updatedData.timeline.push({
        event: "🚨 Auto escalation (vitals)",
        reason: result.reason,
        timestamp: new Date().toISOString()
      });
    }

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);
    res.json(updated);

  } catch (err) {
    console.error("❌ VITALS ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
SYMPTOMS (CORE ENGINE)
================================================
*/
export const addSymptomsHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const symptomsInput = Array.isArray(req.body.symptoms)
      ? req.body.symptoms
      : [];

    let updatedData = await processCaseState(
      record.encounter_data,
      "symptoms",
      { symptoms: symptomsInput }
    );

    updatedData.encounter_data = updatedData.encounter_data || {};
    updatedData.timeline = updatedData.timeline || [];

    const result = evaluateRisk({
      ...(updatedData.encounter_data.vitals || {}),
      symptoms: updatedData.encounter_data.symptoms || []
    });

    const escalate = shouldEscalate(result.level);

    updatedData.encounter_data.triage = {
      severity: result.level,
      reason: result.reason
    };

    updatedData.escalation = {
      status: escalate,
      reason: escalate ? result.reason : null
    };

    if (escalate) {
      updatedData.status = "doctor_escalation";

      updatedData.timeline.push({
        event: "🚨 Auto escalation (symptoms)",
        reason: result.reason,
        timestamp: new Date().toISOString()
      });
    }

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);
    res.json(updated);

  } catch (err) {
    console.error("❌ SYMPTOMS ERROR:", err);
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
    const record = await getEncounterDB(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });

    let updatedData = await processCaseState(
      record.encounter_data,
      "doctor",
      {}
    );

    updatedData.timeline.push({
      event: "👨‍⚕️ Doctor consultation started",
      timestamp: new Date().toISOString()
    });

    const updated = await updateEncounterDB(req.params.id, updatedData, updatedData.status);
    res.json(updated);

  } catch (err) {
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
    const record = await getEncounterDB(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });

    let updatedData = await processCaseState(
      record.encounter_data,
      "doctor_notes",
      {
        doctorNotes: {
          notes: req.body.notes,
          clinician: req.body.clinician,
          timestamp: new Date().toISOString()
        }
      }
    );

    updatedData.timeline.push({
      event: "📝 Doctor notes added",
      timestamp: new Date().toISOString()
    });

    const updated = await updateEncounterDB(req.params.id, updatedData, updatedData.status);
    res.json(updated);

  } catch (err) {
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
    const record = await getEncounterDB(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });

    let updatedData = await processCaseState(
      record.encounter_data,
      "doctor_decision",
      {
        doctorDecision: {
          outcome: req.body.outcome,
          notes: req.body.notes,
          timestamp: new Date().toISOString()
        }
      }
    );

    updatedData.timeline.push({
      event: "📋 Doctor decision made",
      outcome: req.body.outcome,
      timestamp: new Date().toISOString()
    });

    const updated = await updateEncounterDB(req.params.id, updatedData, updatedData.status);
    res.json(updated);

  } catch (err) {
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
    const record = await getEncounterDB(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });

    res.json(record);

  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
};
