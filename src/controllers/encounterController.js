import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const dataDir = path.resolve("data");
const patientsFile = path.join(dataDir, "patients.json");
const encountersFile = path.join(dataDir, "encounters.json");

// ===============================
// UTILITIES
// ===============================

const readJSON = (file) => {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
};

const writeJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

const resolvePatient = (patients, { patientId, identifier }) => {
  if (patientId) {
    return patients.find((p) => p.id === patientId);
  }

  if (identifier) {
    return patients.find((p) =>
      p.identifier?.some((id) => id.value === identifier)
    );
  }

  return null;
};

// ===============================
// CREATE ENCOUNTER
// ===============================

export const createEncounterHandler = (req, res) => {
  try {
    const { patientId, identifier, type, notes } = req.body;

    if (!patientId && !identifier) {
      return res.status(400).json({
        error: "patientId or identifier required",
      });
    }

    const patients = readJSON(patientsFile);
    const patient = resolvePatient(patients, { patientId, identifier });

    if (!patient) {
      return res.status(404).json({
        error: "Patient does not exist",
      });
    }

    const encounters = readJSON(encountersFile);

    const newEncounter = {
      id: uuidv4(),
      resourceType: "Encounter",
      status: "in-progress",
      subject: {
        reference: `Patient/${patient.id}`,
        identifier: patient.identifier || [],
      },
      type: type || "outpatient",
      notes: notes || "",
      state: "created",
      createdAt: new Date().toISOString(),
    };

    encounters.push(newEncounter);
    writeJSON(encountersFile, encounters);

    return res.status(201).json({
      message: "Encounter created successfully",
      encounter: newEncounter,
    });

  } catch (error) {
    console.error("Create Encounter Error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

// ===============================
// SET STAGE
// ===============================

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

  } catch (err) {
    return res.status(500).json({ error: "Failed to set stage" });
  }
};

// ===============================
// VITALS
// ===============================

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

    writeJSON(encountersFile, encounters);

    return res.json({ message: "Vitals added", encounter });

  } catch (err) {
    return res.status(500).json({ error: "Failed to add vitals" });
  }
};

// ===============================
// SYMPTOMS
// ===============================

export const addSymptomsHandler = (req, res) => {
  try {
    const { id } = req.params;
    const { symptoms } = req.body;

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === id);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    encounter.symptoms = symptoms || [];

    writeJSON(encountersFile, encounters);

    return res.json({ message: "Symptoms added", encounter });

  } catch (err) {
    return res.status(500).json({ error: "Failed to add symptoms" });
  }
};

// ===============================
// NOTES
// ===============================

export const addNotesHandler = (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === id);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    if (!encounter.notesHistory) {
      encounter.notesHistory = [];
    }

    encounter.notesHistory.push({
      note: notes,
      createdAt: new Date().toISOString(),
    });

    writeJSON(encountersFile, encounters);

    return res.json({ message: "Notes added", encounter });

  } catch (err) {
    return res.status(500).json({ error: "Failed to add notes" });
  }
};

// ===============================
// TRIAGE
// ===============================

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

    writeJSON(encountersFile, encounters);

    return res.json({ message: "Triage added", encounter });

  } catch (err) {
    return res.status(500).json({ error: "Failed to add triage" });
  }
};

// ===============================
// TREATMENT DECISION
// ===============================

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

    writeJSON(encountersFile, encounters);

    return res.json({ message: "Treatment decision recorded", encounter });

  } catch (err) {
    return res.status(500).json({ error: "Failed to add treatment decision" });
  }
};

// ===============================
// TIMELINE
// ===============================

export const getEncounterTimelineHandler = (req, res) => {
  try {
    const { id } = req.params;

    const encounters = readJSON(encountersFile);
    const encounter = encounters.find(e => e.id === id);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    return res.json({
      timeline: encounter.timeline || [],
    });

  } catch (err) {
    return res.status(500).json({ error: "Failed to fetch timeline" });
  }
};
