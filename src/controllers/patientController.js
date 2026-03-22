import {
  createPatient,
  getPatients,
  getPatientById,
  searchPatients
} from "../models/patientModel.js";


/*
=========================================
CREATE PATIENT
=========================================
*/

export const createPatientHandler = async (req, res) => {

  try {

    const {
      identifier,
      fullName,
      gender,
      birthDate,
      telecom,
      address,
      system
    } = req.body;

    // ✅ VALIDATION
    if (!identifier || !fullName) {
      return res.status(400).json({
        error: "identifier and fullName are required"
      });
    }

    /*
    =========================================
    CORRECT FHIR-LIKE STRUCTURE (FLAT VALUE)
    =========================================
    */

    const patient = await createPatient({

      resourceType: "Patient",

      identifier: [
        {
          system: system || "GJH",
          value: identifier   // 🔥 STRING ONLY (NO ARRAY)
        }
      ],

      name: fullName,

      gender: gender || "unknown",

      birthDate: birthDate || null,

      telecom: telecom || [],

      address: address || [],

      createdAt: new Date().toISOString()

    });

    return res.status(201).json(patient);

  } catch (error) {

    console.error("createPatientHandler error:", error);

    return res.status(500).json({
      error: "Failed to create patient"
    });

  }

};


/*
=========================================
GET ALL PATIENTS
=========================================
*/

export const getPatientsHandler = async (req, res) => {

  try {

    const patients = await getPatients();

    return res.json(patients);

  } catch (error) {

    console.error("getPatientsHandler error:", error);

    return res.status(500).json({
      error: "Failed to retrieve patients"
    });

  }

};


/*
=========================================
GET SINGLE PATIENT
=========================================
*/

export const getPatientHandler = async (req, res) => {

  try {

    const patient = await getPatientById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        error: "Patient not found"
      });
    }

    return res.json(patient);

  } catch (error) {

    console.error("getPatientHandler error:", error);

    return res.status(500).json({
      error: "Failed to retrieve patient"
    });

  }

};


/*
=========================================
SEARCH PATIENTS
=========================================
*/

export const searchPatientsHandler = async (req, res) => {

  try {

    const { identifier, name } = req.query;

    const patients = await searchPatients({
      identifier,
      name
    });

    return res.json(patients);

  } catch (error) {

    console.error("searchPatientsHandler error:", error);

    return res.status(500).json({
      error: "Search failed"
    });

  }

};
