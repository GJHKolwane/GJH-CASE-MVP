import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { resolvePatientIdentity } from "../services/patient.service.js";

const dataDir = path.resolve("data");
const encountersFile = path.join(dataDir, "encounters.json");
const patientsFile = path.join(dataDir, "patients.json");

/*
================================================
UTILS
================================================
*/

const readJSON = (file) => {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
};

const writeJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

/*
================================================
CREATE ENCOUNTER (🔥 IDENTITY FIXED)
================================================
*/

export const createEncounterHandler = async (req, res) => {
  try {
    const {
      patientId,
      identifier,
      fullName,
      birthDate,
      gender,
      type,
      notes
    } = req.body;

    let patient;
    let identityLevel;

    // ✅ USE EXISTING PATIENT
    if (patientId) {
      const patients = readJSON(patientsFile);
      const existingPatient = patients.find(p => p.id === patientId);

      if (!existingPatient) {
        return res.status(404).json({
          error: "Patient not found — resolve patient first"
        });
      }

      patient = existingPatient;
      identityLevel = patient.meta?.identityLevel || "unknown";

      console.log("🟢 USING EXISTING PATIENT:", patient.id);
    }

    // ⚠️ FALLBACK (only if needed)
    else {
      console.log("🟡 FALLBACK: Resolving patient...");

      const result = await resolvePatientIdentity({
        identifier,
        fullName,
        birthDate,
        gender
      });

      patient = result.patient;
      identityLevel = result.identityLevel;
    }

    const encounters = readJSON(encountersFile);

    const timestamp = new Date().toISOString();

    const newEncounter = {
      id: uuidv4(),
      resourceType: "Encounter",
      status: "in-progress",

      subject: {
        reference: `Patient/${patient.id}`,
        identifier: patient.identifier || []
      },

      identityLevel,

      type: type || "outpatient",
      notes: notes || "",

      state: "created",
      createdAt: timestamp,

      // 🔥 SYSTEM STRUCTURE
      vitals: null,
      symptoms: [],
      notesHistory: [],
      triage: null,
      treatmentDecision: null,

      labs: {
        orders: [],
        results: []
      },

      timeline: []
    };

    encounters.push(newEncounter);
    writeJSON(encountersFile, encounters);

    return res.status(201).json({
      message: "Encounter created successfully",
      encounter: newEncounter,
      patient
    });

  } catch (error) {
    console.error("🔥 CREATE ENCOUNTER ERROR:", error);

    return res.status(500).json({
      error: "Failed to create encounter"
    });
  }
};

/*
================================================
SET STAGE
================================================
*/

export const setEncounterStageHandler = (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === id);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    encounter.state = stage;

    writeJSON(encountersFile, encounters);

    return res.json({ message: "Stage updated", encounter });

  } catch {
    return res.status(500).json({ error: "Failed to set stage" });
  }
};

/*
================================================
VITALS
================================================
*/

export const addVitalsHandler = (req, res) => {
  try {
    const { id } = req.params;
    const vitals = req.body;

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === id);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    encounter.vitals = vitals;

    encounter.timeline.push({
      event: "Vitals recorded",
      data: vitals,
      timestamp: new Date().toISOString()
    });

    writeJSON(encountersFile, encounters);

    return res.json({ message: "Vitals added", encounter });

  } catch {
    return res.status(500).json({ error: "Failed to add vitals" });
  }
};

/*
================================================
SYMPTOMS
================================================
*/

export const addSymptomsHandler = (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === id);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    encounter.symptoms = notes ? [notes] : [];

    encounter.timeline.push({
      event: "Symptoms recorded",
      data: notes,
      timestamp: new Date().toISOString()
    });

    writeJSON(encountersFile, encounters);

    return res.json({ message: "Symptoms added", encounter });

  } catch {
    return res.status(500).json({ error: "Failed to add symptoms" });
  }
};

/*
================================================
NURSE NOTES (RESTORED)
================================================
*/

export const addNotesHandler = (req, res) => {
  try {
    const { id } = req.params;
    const { notes, nurseId } = req.body;

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === id);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    const timestamp = new Date().toISOString();

    const entry = {
      note: notes,
      nurseId: nurseId || "unknown",
      createdAt: timestamp
    };

    encounter.notesHistory.push(entry);

    encounter.timeline.push({
      event: "Nurse notes added",
      data: entry,
      timestamp
    });

    writeJSON(encountersFile, encounters);

    return res.json({ message: "Notes added", encounter });

  } catch {
    return res.status(500).json({ error: "Failed to add notes" });
  }
};

/*
================================================
TRIAGE
================================================
*/

export const addTriageHandler = (req, res) => {
  try {
    const { id } = req.params;
    const triage = req.body;

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === id);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    encounter.triage = triage;

    encounter.timeline.push({
      event: "Triage recorded",
      data: triage,
      timestamp: new Date().toISOString()
    });

    writeJSON(encountersFile, encounters);

    return res.json({ message: "Triage added", encounter });

  } catch {
    return res.status(500).json({ error: "Failed to add triage" });
  }
};

/*
================================================
TREATMENT DECISION
================================================
*/

export const addTreatmentDecisionHandler = (req, res) => {
  try {
    const { id } = req.params;
    const decision = req.body;

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === id);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    encounter.treatmentDecision = decision;

    encounter.timeline.push({
      event: "Treatment decision recorded",
      data: decision,
      timestamp: new Date().toISOString()
    });

    writeJSON(encountersFile, encounters);

    return res.json({ message: "Treatment decision recorded", encounter });

  } catch {
    return res.status(500).json({ error: "Failed to add treatment decision" });
  }
};

/*
================================================
TIMELINE
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

    return res.json({ timeline: encounter.timeline || [] });

  } catch {
    return res.status(500).json({ error: "Failed to fetch timeline" });
  }
};
