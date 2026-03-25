import {
  getPatients,
  getPatientById,
  searchPatients
} from "../models/patientModel.js";

import {
  resolvePatientIdentity
} from "../services/patient.service.js";

/*
================================================
RESOLVE PATIENT (🔥 NEW CORE FLOW)
================================================
*/

export const resolvePatientHandler = async (req, res) => {

  try {
    const input = req.body;

    const result = await resolvePatientIdentity(input);

    return res.status(200).json({
      success: true,
      patient: result.patient,
      identityLevel: result.identityLevel
    });

  } catch (error) {

    console.error("resolvePatientHandler error:", error);

    return res.status(500).json({
      error: "Identity resolution failed"
    });
  }
};

/*
================================================
GET ALL PATIENTS
================================================
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
================================================
GET SINGLE PATIENT
================================================
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
================================================
SEARCH PATIENTS
================================================
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
