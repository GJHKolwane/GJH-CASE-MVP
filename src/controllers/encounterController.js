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

export const createEncounter = (req, res) => {
  try {
    const { patientId } = req.body;

    if (!patientId) {
      return res.status(400).json({
        error: "patientId is required"
      });
    }

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
GET ENCOUNTER
================================================
*/

export const fetchEncounter = (req, res) => {
  try {
    const { id } = req.params;

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === id);

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    return res.json({ encounter });

  } catch (err) {
    console.error("FETCH ENCOUNTER ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to fetch encounter"
    });
  }
};

/*
================================================
UPDATE ENCOUNTER STAGE
================================================
*/

export const updateEncounterStage = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const encounters = readJSON(encountersFile);
    const index = encounters.findIndex(e => e.id === id);

    if (index === -1) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    let encounter = {
      ...encounters[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // 🔥 INTELLIGENCE LOOP
    encounter = await processCaseState(encounter);

    encounters[index] = encounter;
    writeJSON(encountersFile, encounters);

    return res.json({
      message: "Encounter updated",
      encounter
    });

  } catch (err) {
    console.error("UPDATE ENCOUNTER ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to update encounter"
    });
  }
};

/*
================================================
ADD CLINICAL NOTES
================================================
*/

export const addNotes = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const encounters = readJSON(encountersFile);
    const index = encounters.findIndex(e => e.id === id);

    if (index === -1) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    let encounter = encounters[index];

    encounter.notesHistory = encounter.notesHistory || [];

    encounter.notesHistory.push({
      note,
      createdAt: new Date().toISOString()
    });

    // 🔥 INTELLIGENCE LOOP
    encounter = await processCaseState(encounter);

    encounters[index] = encounter;
    writeJSON(encountersFile, encounters);

    return res.json({
      message: "Notes added",
      encounter
    });

  } catch (err) {
    console.error("ADD NOTES ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to add notes"
    });
  }
};

/*
================================================
ATTACH LAB SUMMARY
================================================
*/

export const attachLabSummary = async (req, res) => {
  try {
    const { id } = req.params;
    const { summary } = req.body;

    const encounters = readJSON(encountersFile);
    const index = encounters.findIndex(e => e.id === id);

    if (index === -1) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    let encounter = encounters[index];

    encounter.labs = encounter.labs || {
      orders: [],
      results: []
    };

    encounter.labs.summary = summary;
    encounter.updatedAt = new Date().toISOString();

    // 🔥 INTELLIGENCE LOOP
    encounter = await processCaseState(encounter);

    encounters[index] = encounter;
    writeJSON(encountersFile, encounters);

    return res.json({
      message: "Lab summary attached",
      encounter
    });

  } catch (err) {
    console.error("LAB SUMMARY ERROR:", err.message);

    return res.status(500).json({
      error: "Failed to attach lab summary"
    });
  }
};
