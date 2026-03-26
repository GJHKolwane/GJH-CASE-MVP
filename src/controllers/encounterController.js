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
CREATE ENCOUNTER (🔥 FIXED IDENTITY LOGIC)
================================================
*/

export const createEncounterHandler = async (req, res) => {
  try {
    const {
      patientId, // ✅ NEW PRIMARY PATH
      identifier,
      fullName,
      birthDate,
      gender,
      type,
      notes
    } = req.body;

    let patient;
    let identityLevel;

    /*
    =================================================
    ✅ PRIORITY 1: USE EXISTING PATIENT
    =================================================
    */
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

    /*
    =================================================
    ⚠️ FALLBACK: RESOLVE IF NO patientId
    =================================================
    */
    else {
      console.log("🟡 FALLBACK: Resolving patient identity...");

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

    const newEncounter = {
      id: uuidv4(),
      resourceType: "Encounter",
      status: "in-progress",

      // ✅ CORRECT PATIENT LINK
      subject: {
        reference: `Patient/${patient.id}`,
        identifier: patient.identifier || []
      },

      // ✅ PRESERVE TRUE IDENTITY
      identityLevel,

      type: type || "outpatient",
      notes: notes || "",

      state: "created",
      createdAt: new Date().toISOString(),

      // 🔥 initialize structure (important for your system)
      vitals: null,
      symptoms: [],
      labs: {
        orders: [],
        results: []
      },
      timeline: []
    };

    encounters.push(newEncounter);
    writeJSON(encountersFile, encounters);

    return res.status(201).json({
      message: "Encounter created successfully (identity preserved)",
      encounter: newEncounter,
      patient
    });

  } catch (error) {
    console.error("🔥 CREATE ENCOUNTER ERROR:", error);

    return res.status(500).json({ error: "Failed to create encounter" });
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

    if (!encounter) return res.status(404).json({ error: "Encounter not found" });

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

    if (!encounter) return res.status(404).json({ error: "Encounter not found" });

    encounter.vitals = vitals;
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

    if (!encounter) return res.status(404).json({ error: "Encounter not found" });

    encounter.symptoms = notes ? [notes] : [];
    writeJSON(encountersFile, encounters);

    return res.json({ message: "Symptoms added", encounter });

  } catch {
    return res.status(500).json({ error: "Failed to add symptoms" });
  }
};
