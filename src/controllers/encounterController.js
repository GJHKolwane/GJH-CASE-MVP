import fs from "fs";
import path from "path";
import crypto from "crypto";
import { processCaseState } from "../services/clinicalStateMachine.js";

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
    const { patientId } = req.body;

    const encounters = readJSON(encountersFile);

    const newEncounter = {
      id: crypto.randomUUID(),
      patientId,
      status: "created",
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
    console.error("CREATE ENCOUNTER ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to create encounter"
    });
  }
};

/*
================================================
SET ENCOUNTER STAGE
================================================
*/

export const setEncounterStageHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const encounters = readJSON(encountersFile);
    const index = encounters.findIndex(e => e.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    let encounter = {
      ...encounters[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    encounter = await processCaseState(encounter);

    encounters[index] = encounter;
    writeJSON(encountersFile, encounters);

    return res.json({
      message: "Encounter updated",
      encounter
    });

  } catch (err) {
    console.error("STAGE UPDATE ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to update encounter stage"
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

    encounter.vitals = vitals;

    encounter.timeline = encounter.timeline || [];
    encounter.timeline.push({
      event: "Vitals recorded",
      data: vitals,
      timestamp: new Date().toISOString()
    });

    encounter = await processCaseState(encounter);

    encounters[index] = encounter;
    writeJSON(encountersFile, encounters);

    return res.json({
      message: "Vitals added",
      encounter
    });

  } catch (err) {
    console.error("VITALS ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to add vitals"
    });
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

    encounter.symptoms = symptoms;

    encounter.timeline = encounter.timeline || [];
    encounter.timeline.push({
      event: "Symptoms recorded",
      data: symptoms,
      timestamp: new Date().toISOString()
    });

    encounter = await processCaseState(encounter);

    encounters[index] = encounter;
    writeJSON(encountersFile, encounters);

    return res.json({
      message: "Symptoms added",
      encounter
    });

  } catch (err) {
    console.error("SYMPTOMS ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to add symptoms"
    });
  }
};

/*
================================================
ADD NOTES
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

    encounter.notesHistory = encounter.notesHistory || [];

    encounter.notesHistory.push({
      note,
      createdAt: new Date().toISOString()
    });

    encounter = await processCaseState(encounter);

    encounters[index] = encounter;
    writeJSON(encountersFile, encounters);

    return res.json({
      message: "Notes added",
      encounter
    });

  } catch (err) {
    console.error("NOTES ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to add notes"
    });
  }
};

/*
================================================
ADD TRIAGE (MANUAL / OVERRIDE)
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

    encounter.triage = triage;

    encounter.timeline = encounter.timeline || [];
    encounter.timeline.push({
      event: "Triage added",
      data: triage,
      timestamp: new Date().toISOString()
    });

    encounter = await processCaseState(encounter);

    encounters[index] = encounter;
    writeJSON(encountersFile, encounters);

    return res.json({
      message: "Triage added",
      encounter
    });

  } catch (err) {
    console.error("TRIAGE ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to add triage"
    });
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

    encounter.treatmentDecision = decision;

    encounter.timeline = encounter.timeline || [];
    encounter.timeline.push({
      event: "Treatment decision recorded",
      data: decision,
      timestamp: new Date().toISOString()
    });

    encounter = await processCaseState(encounter);

    encounters[index] = encounter;
    writeJSON(encountersFile, encounters);

    return res.json({
      message: "Treatment decision recorded",
      encounter
    });

  } catch (err) {
    console.error("TREATMENT ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to record treatment decision"
    });
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
    console.error("TIMELINE ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to fetch timeline"
    });
  }
};
