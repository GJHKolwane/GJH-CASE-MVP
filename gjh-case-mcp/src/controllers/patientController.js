import {
  createPatient,
  getPatients,
  getPatientById,
  searchPatients
} from "../models/patientModel.js";


/*
CREATE PATIENT
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

    if (!identifier || !fullName) {
      return res.status(400).json({
        error: "identifier and fullName are required"
      });
    }

    const patient = await createPatient({
      identifier,
      fullName,
      gender,
      birthDate,
      telecom,
      address,
      system
    });

    res.json(patient);

  } catch (error) {

    console.error("createPatientHandler error:", error);

    res.status(500).json({
      error: "Failed to create patient"
    });

  }

};


/*
GET ALL PATIENTS
*/

export const getPatientsHandler = async (req, res) => {

  try {

    const patients = await getPatients();

    res.json(patients);

  } catch (error) {

    res.status(500).json({
      error: "Failed to retrieve patients"
    });

  }

};


/*
GET SINGLE PATIENT
*/

export const getPatientHandler = async (req, res) => {

  try {

    const patient = await getPatientById(req.params.id);

    if (!patient) {
      return res.status(404).json({
        error: "Patient not found"
      });
    }

    res.json(patient);

  } catch (error) {

    res.status(500).json({
      error: "Failed to retrieve patient"
    });

  }

};


/*
SEARCH PATIENTS
*/

export const searchPatientsHandler = async (req, res) => {

  try {

    const { identifier, name } = req.query;

    const patients = await searchPatients({
      identifier,
      name
    });

    res.json(patients);

  } catch (error) {

    res.status(500).json({
      error: "Search failed"
    });

  }

};
