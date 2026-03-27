import fs from "fs";
import path from "path";
import crypto from "crypto";

import {
  processCaseState,
  enforceTransition,
  actionMap
} from "../services/clinicalStateMachine.js";

const dataDir = path.resolve("data");
const encountersFile = path.join(dataDir, "encounters.json");

const readJSON = (file) => {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
};

const writeJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

/*
================================================
CREATE ENCOUNTER
================================================
*/

export const createEncounterHandler = (req, res) => {
  try {
    const { patientId, subject } = req.body;

    const finalSubject = subject || (
      patientId ? { reference: `Patient/${patientId}` } : null
    );

    if (!finalSubject?.reference) {
      return res.status(400).json({
        error: "Either patientId or subject.reference is required"
      });
    }

    const encounters = readJSON(encountersFile);

    const newEncounter = {
      id: crypto.randomUUID(),
      resourceType: "Encounter",
      subject: finalSubject,
      status: "created", // 🔥 IMPORTANT FIX
      createdAt: new Date().toISOString(),
      timeline: []
    };

    encounters.push(newEncounter);
    writeJSON(encountersFile, encounters);

    return res.status(201).json({
      message: "Encounter created successfully",
      encounter: newEncounter
    });

  } catch (err) {
    console.error("CREATE ENCOUNTER ERROR:", err);

    return res.status(500).json({
      error: "Failed to create encounter"
    });
  }
};

/*
================================================
ADD VITALS
================================================
*/

export const addVitalsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const vitals = req.body;

    const encounters = readJSON(encountersFile);
    const index = encounters.findIndex(e => e.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    let encounter = encounters[index];

    const nextState = actionMap.vitals;
    const check = enforceTransition(encounter.status, nextState);

    if (!check.allowed) {
      return res.status(400).json({ error: check.error });
    }

    encounter.vitals = vitals;
    encounter.status = nextState;

    encounter.timeline.push({
      event: "Vitals recorded",
      data: vitals,
      timestamp: new Date().toISOString()
    });

    encounter = await processCaseState(encounter);

    encounters[index] = encounter;
    writeJSON(encountersFile, encounters);

    return res.json({ message: "Vitals added", encounter });

  } catch (err) {
    console.error("VITALS ERROR:", err);
    return res.status(500).json({ error: "Failed to add vitals" });
  }
};

/*
================================================
ADD SYMPTOMS
================================================
*/

export const addSymptomsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const symptoms = req.body;

    const encounters = readJSON(encountersFile);
    const index = encounters.findIndex(e => e.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    let encounter = encounters[index];

    const nextState = actionMap.symptoms;
    const check = enforceTransition(encounter.status, nextState);

    if (!check.allowed) {
      return res.status(400).json({ error: check.error });
    }

    encounter.symptoms = symptoms;
    encounter.status = nextState;

    encounter.timeline.push({
      event: "Symptoms recorded",
      data: symptoms,
      timestamp: new Date().toISOString()
    });

    encounter = await processCaseState(encounter);

    encounters[index] = encounter;
    writeJSON(encountersFile, encounters);

    return res.json({ message: "Symptoms added", encounter });

  } catch (err) {
    console.error("SYMPTOMS ERROR:", err);
    return res.status(500).json({ error: "Failed to add symptoms" });
  }
};

/*
================================================
ADD TRIAGE
================================================
*/

export const addTriageHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const triage = req.body;

    const encounters = readJSON(encountersFile);
    const index = encounters.findIndex(e => e.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    let encounter = encounters[index];

    const nextState = actionMap.triage;
    const check = enforceTransition(encounter.status, nextState);

    if (!check.allowed) {
      return res.status(400).json({ error: check.error });
    }

    encounter.triage = triage;
    encounter.status = nextState;

    encounter.timeline.push({
      event: "Triage completed",
      data: triage,
      timestamp: new Date().toISOString()
    });

    encounter = await processCaseState(encounter);

    encounters[index] = encounter;
    writeJSON(encountersFile, encounters);

    return res.json({ message: "Triage added", encounter });

  } catch (err) {
    console.error("TRIAGE ERROR:", err);
    return res.status(500).json({ error: "Failed to add triage" });
  }
};

/*
================================================
ADD NOTES (DOCTOR)
================================================
*/

export const addNotesHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const encounters = readJSON(encountersFile);
    const index = encounters.findIndex(e => e.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    let encounter = encounters[index];

    const nextState = actionMap.notes;
    const check = enforceTransition(encounter.status, nextState);

    if (!check.allowed) {
      return res.status(400).json({ error: check.error });
    }

    encounter.notesHistory = encounter.notesHistory || [];

    encounter.notesHistory.push({
      note,
      createdAt: new Date().toISOString()
    });

    encounter.status = nextState;

    encounter = await processCaseState(encounter);

    encounters[index] = encounter;
    writeJSON(encountersFile, encounters);

    return res.json({ message: "Notes added", encounter });

  } catch (err) {
    console.error("NOTES ERROR:", err);
    return res.status(500).json({ error: "Failed to add notes" });
  }
};

/*
================================================
TREATMENT DECISION
================================================
*/

export const addTreatmentDecisionHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const decision = req.body;

    const encounters = readJSON(encountersFile);
    const index = encounters.findIndex(e => e.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    let encounter = encounters[index];

    const nextState = actionMap.treatment;
    const check = enforceTransition(encounter.status, nextState);

    if (!check.allowed) {
      return res.status(400).json({ error: check.error });
    }

    encounter.treatmentDecision = decision;
    encounter.status = nextState;

    encounter.timeline.push({
      event: "Treatment decision recorded",
      data: decision,
      timestamp: new Date().toISOString()
    });

    encounter = await processCaseState(encounter);

    encounters[index] = encounter;
    writeJSON(encountersFile, encounters);

    return res.json({ message: "Treatment recorded", encounter });

  } catch (err) {
    console.error("TREATMENT ERROR:", err);
    return res.status(500).json({ error: "Failed to record treatment" });
  }
};

/*
================================================
GET TIMELINE
================================================
*/

export const getEncounterTimelineHandler = (req, res) => {
  try {
    const { id } = req.params;

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === id);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    return res.json({
      timeline: encounter.timeline || []
    });

  } catch (err) {
    console.error("TIMELINE ERROR:", err);
    return res.status(500).json({
      error: "Failed to fetch timeline"
    });
  }
};
