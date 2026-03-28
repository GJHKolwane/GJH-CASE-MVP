import crypto from "crypto";

import {
  createEncounterData,
  getEncounterData,
  updateEncounterData
} from "../services/dataService.js";

import {
  processCaseState,
  enforceTransition,
  actionMap
} from "../services/clinicalStateMachine.js";

/*
================================================
CREATE (PATIENT ARRIVES)
================================================
*/

export const createEncounterHandler = async (req, res) => {
  try {
    const encounter = {
      id: crypto.randomUUID(),
      status: "created",
      timeline: [],
      createdAt: new Date().toISOString()
    };

    const saved = await createEncounterData(encounter);

    return res.json(saved);

  } catch (error) {
    console.error("CREATE ERROR:", error);
    return res.status(500).json({ error: "Failed to create encounter" });
  }
};

/*
================================================
1️⃣ PATIENT INTAKE
================================================
*/

export const intakeHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const e = await getEncounterData(id);
    if (!e) return res.status(404).json({ error: "Not found" });

    const next = actionMap.intake;
    const check = enforceTransition(e.status, next);
    if (!check.allowed) return res.status(400).json(check);

    e.intake = req.body;
    e.status = next;

    e.timeline.push({
      event: "Patient intake completed",
      timestamp: new Date().toISOString()
    });

    const updated = await processCaseState(e);

    await updateEncounterData(id, updated);

    return res.json(updated);

  } catch (error) {
    console.error("INTAKE ERROR:", error);
    return res.status(500).json({ error: "Failed intake" });
  }
};

/*
================================================
2️⃣ VITALS
================================================
*/

export const addVitalsHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const e = await getEncounterData(id);
    if (!e) return res.status(404).json({ error: "Not found" });

    const next = actionMap.vitals;
    const check = enforceTransition(e.status, next);
    if (!check.allowed) return res.status(400).json(check);

    e.vitals = req.body;
    e.status = next;

    e.timeline.push({
      event: "Vitals recorded",
      timestamp: new Date().toISOString()
    });

    const updated = await processCaseState(e);

    await updateEncounterData(id, updated);

    return res.json(updated);

  } catch (error) {
    console.error("VITALS ERROR:", error);
    return res.status(500).json({ error: "Failed vitals" });
  }
};

/*
================================================
3️⃣ SYMPTOMS
================================================
*/

export const addSymptomsHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const e = await getEncounterData(id);
    if (!e) return res.status(404).json({ error: "Not found" });

    const next = actionMap.symptoms;
    const check = enforceTransition(e.status, next);
    if (!check.allowed) return res.status(400).json(check);

    e.symptoms = req.body;
    e.status = next;

    e.timeline.push({
      event: "Symptoms recorded",
      timestamp: new Date().toISOString()
    });

    const updated = await processCaseState(e);

    await updateEncounterData(id, updated);

    return res.json(updated);

  } catch (error) {
    console.error("SYMPTOMS ERROR:", error);
    return res.status(500).json({ error: "Failed symptoms" });
  }
};

/*
================================================
4️⃣ NURSE ASSESSMENT
================================================
*/

export const nurseAssessmentHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const e = await getEncounterData(id);
    if (!e) return res.status(404).json({ error: "Not found" });

    const next = actionMap.nurse;
    const check = enforceTransition(e.status, next);
    if (!check.allowed) return res.status(400).json(check);

    e.nurseNotes = req.body;
    e.status = next;

    e.timeline.push({
      event: "Nurse assessment completed",
      timestamp: new Date().toISOString()
    });

    const updated = await processCaseState(e);

    await updateEncounterData(id, updated);

    return res.json(updated);

  } catch (error) {
    console.error("NURSE ERROR:", error);
    return res.status(500).json({ error: "Failed nurse step" });
  }
};

/*
================================================
5️⃣ VALIDATION (🔥 HUMAN IN LOOP)
================================================
*/

export const validateEncounterHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const e = await getEncounterData(id);
    if (!e) return res.status(404).json({ error: "Not found" });

    const next = actionMap.validate;
    const check = enforceTransition(e.status, next);
    if (!check.allowed) return res.status(400).json(check);

    e.validation = {
      clinician: req.body.clinician,
      notes: req.body.notes,
      timestamp: new Date().toISOString()
    };

    e.status = next;

    e.timeline.push({
      event: "Clinician validation completed",
      timestamp: new Date().toISOString()
    });

    await updateEncounterData(id, e);

    return res.json(e);

  } catch (error) {
    console.error("VALIDATION ERROR:", error);
    return res.status(500).json({ error: "Validation failed" });
  }
};

/*
================================================
6️⃣ DECISION
================================================
*/

export const decisionHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    const e = await getEncounterData(id);
    if (!e) return res.status(404).json({ error: "Not found" });

    const next = actionMap.decision;
    const check = enforceTransition(e.status, next);
    if (!check.allowed) return res.status(400).json(check);

    e.decision = type;
    e.status = next;

    e.timeline.push({
      event: `Decision made: ${type}`,
      timestamp: new Date().toISOString()
    });

    const updated = await processCaseState(e);

    await updateEncounterData(id, updated);

    return res.json(updated);

  } catch (error) {
    console.error("DECISION ERROR:", error);
    return res.status(500).json({ error: "Decision failed" });
  }
};

/*
================================================
GET ENCOUNTER
================================================
*/

export const getEncounterHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const encounter = await getEncounterData(id);

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    return res.json(encounter);

  } catch (error) {
    console.error("GET ERROR:", error);
    return res.status(500).json({
      error: "Failed to fetch encounter"
    });
  }
};

/*
================================================
GET TIMELINE
================================================
*/

export const getEncounterTimelineHandler = async (req, res) => {
  try {
    const { id } = req.params;

    const encounter = await getEncounterData(id);

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    return res.json({
      encounterId: id,
      state: encounter.status,
      timeline: encounter.timeline || []
    });

  } catch (error) {
    console.error("TIMELINE ERROR:", error);
    return res.status(500).json({
      error: "Failed to fetch timeline"
    });
  }
};
