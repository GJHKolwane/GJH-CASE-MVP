import crypto from "crypto";

import {
  createEncounterDB,
  getEncounterDB,
  updateEncounterDB
} from "../services/dbService.js";

import {
  processCaseState
} from "../services/clinicalStateMachine.js";

/*
================================================
CREATE
================================================
*/
export const createEncounterHandler = async (req, res) => {
  try {
    const { national_id } = req.body || {};

    const patientId = crypto.randomUUID();

    const encounter = await createEncounterDB(
      patientId,
      national_id || null
    );

    res.json(encounter);

  } catch (err) {
    console.error(err);
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
    const record = await getEncounterDB(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const updatedData = await processCaseState(
      record.encounter_data,
      "intake",
      { intake: req.body }
    );

    const updated = await updateEncounterDB(
      req.params.id,
      updatedData,
      updatedData.status
    );

    res.json(updated);

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
    const record = await getEncounterDB(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const updatedData = await processCaseState(
      record.encounter_data,
      "vitals",
      { vitals: req.body }
    );

    const updated = await updateEncounterDB(
      req.params.id,
      updatedData,
      updatedData.status
    );

    res.json(updated);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
SYMPTOMS
================================================
*/
export const addSymptomsHandler = async (req, res) => {
  try {
    const record = await getEncounterDB(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const updatedData = await processCaseState(
      record.encounter_data,
      "symptoms",
      { symptoms: req.body }
    );

    const updated = await updateEncounterDB(
      req.params.id,
      updatedData,
      updatedData.status
    );

    res.json(updated);

  } catch (err) {
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
    const record = await getEncounterDB(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const updatedData = await processCaseState(
      record.encounter_data,
      "nurse",
      { nurseNotes: req.body }
    );

    const updated = await updateEncounterDB(
      req.params.id,
      updatedData,
      updatedData.status
    );

    res.json(updated);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
VALIDATION → NOW MOVES STATE
================================================
*/
export const validateEncounterHandler = async (req, res) => {
  try {
    const record = await getEncounterDB(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const updatedData = await processCaseState(
      record.encounter_data,
      "validate",
      {
        validation: {
          clinician: req.body.clinician,
          notes: req.body.notes,
          timestamp: new Date().toISOString()
        }
      }
    );

    const updated = await updateEncounterDB(
      req.params.id,
      updatedData,
      updatedData.status
    );

    res.json(updated);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
🔥 DECISION (INTELLIGENT BRANCHING)
================================================
*/
export const decisionHandler = async (req, res) => {
  try {
    const { type } = req.body;

    const record = await getEncounterDB(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });

    let action;

    if (type === "doctor_escalation") {
      action = "escalate";
    } else if (type === "followup") {
      action = "followup";
    } else {
      action = "treat"; // default = continue
    }

    const updatedData = await processCaseState(
      record.encounter_data,
      action,
      {
        decision: {
          type,
          timestamp: new Date().toISOString()
        }
      }
    );

    const updated = await updateEncounterDB(
      req.params.id,
      updatedData,
      updatedData.status
    );

    res.json(updated);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
DOCTOR
================================================
*/
export const doctorConsultationHandler = async (req, res) => {
  try {
    const record = await getEncounterDB(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const updatedData = await processCaseState(
      record.encounter_data,
      "doctor",
      {
        doctor: {
          clinician: req.body.clinician,
          startedAt: new Date().toISOString()
        }
      }
    );

    const updated = await updateEncounterDB(
      req.params.id,
      updatedData,
      updatedData.status
    );

    res.json(updated);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const doctorNotesHandler = async (req, res) => {
  try {
    const record = await getEncounterDB(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const updatedData = await processCaseState(
      record.encounter_data,
      "doctor_notes",
      {
        doctorNotes: {
          notes: req.body.notes,
          diagnosis: req.body.diagnosis,
          timestamp: new Date().toISOString()
        }
      }
    );

    const updated = await updateEncounterDB(
      req.params.id,
      updatedData,
      updatedData.status
    );

    res.json(updated);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

export const doctorDecisionHandler = async (req, res) => {
  try {
    const record = await getEncounterDB(req.params.id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const updatedData = await processCaseState(
      record.encounter_data,
      "doctor_decision",
      {
        doctorDecision: {
          type: req.body.type,
          reason: req.body.reason,
          timestamp: new Date().toISOString()
        }
      }
    );

    const updated = await updateEncounterDB(
      req.params.id,
      updatedData,
      updatedData.status
    );

    res.json(updated);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
GET + TIMELINE
================================================
*/
export const getEncounterHandler = async (req, res) => {
  const record = await getEncounterDB(req.params.id);
  if (!record) return res.status(404).json({ error: "Not found" });
  res.json(record);
};

export const getEncounterTimelineHandler = async (req, res) => {
  const record = await getEncounterDB(req.params.id);
  if (!record) return res.status(404).json({ error: "Not found" });

  res.json({
    encounterId: record.id,
    state: record.status,
    timeline: record.encounter_data.timeline || []
  });
};
