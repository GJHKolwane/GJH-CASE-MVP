import { resolvePatientIdentity } from "../services/patient.service.js";

export const createEncounterHandler = async (req, res) => {
  try {
    const {
      identifier,
      fullName,
      birthDate,
      gender,
      type,
      notes
    } = req.body;

    /*
    =========================================
    STEP 1 — RESOLVE PATIENT (🔥 CORE FIX)
    =========================================
    */

    const { patient, identityLevel } = await resolvePatientIdentity({
      identifier,
      fullName,
      birthDate,
      gender
    });

    /*
    =========================================
    STEP 2 — CREATE ENCOUNTER
    =========================================
    */

    const encounters = readJSON(encountersFile);

    const newEncounter = {
      id: uuidv4(),
      resourceType: "Encounter",
      status: "in-progress",

      subject: {
        reference: `Patient/${patient.id}`,
        identifier: patient.identifier || null
      },

      identityLevel, // 🔥 IMPORTANT TRACEABILITY

      type: type || "outpatient",
      notes: notes || "",

      state: "created",
      createdAt: new Date().toISOString()
    };

    encounters.push(newEncounter);
    writeJSON(encountersFile, encounters);

    return res.status(201).json({
      message: "Encounter created successfully",
      encounter: newEncounter,
      patient
    });

  } catch (error) {
    console.error("Create Encounter Error:", error);

    return res.status(500).json({
      error: "Failed to create encounter"
    });
  }
};
