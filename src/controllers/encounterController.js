import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const dataDir = path.resolve("data");
const patientsFile = path.join(dataDir, "patients.json");
const encountersFile = path.join(dataDir, "encounters.json");

// Utility: read JSON
const readJSON = (file) => {
  if (!fs.existsSync(file)) return [];
  return JSON.parse(fs.readFileSync(file, "utf-8"));
};

// Utility: write JSON
const writeJSON = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// 🔥 NEW: Resolve patient using identifier OR patientId
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

// ✅ CREATE ENCOUNTER HANDLER
export const createEncounterHandler = (req, res) => {
  try {
    const { patientId, identifier, type, notes } = req.body;

    // 🔒 Validation: at least one must exist
    if (!patientId && !identifier) {
      return res.status(400).json({
        error: "patientId or identifier required",
      });
    }

    const patients = readJSON(patientsFile);

    // 🔥 Resolve patient
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
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
