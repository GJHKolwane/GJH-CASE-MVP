import {
  createPatient,
  getPatients,
  getPatientById,
  searchPatients
} from "../models/patientModel.js";

/*
CREATE PATIENT
Expected body:

{
  identifier: "123456",
  fullName: "Jane Doe",
  age: 87
}
*/

export const createPatientHandler = async (req, res) => {
  try {
    const { identifier, fullName, age } = req.body;

    if (!identifier || !fullName) {
      return res.status(400).json({
        error: "identifier and fullName are required"
      });
    }

    const patient = await createPatient({
      identifier,
      fullName,
      age
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

    console.error("getPatientsHandler error:", error);

    res.status(500).json({
      error: "Failed to retrieve patients"
    });
  }
};


/*
GET SINGLE PATIENT BY IDENTIFIER
*/

export const getPatientHandler = async (req, res) => {
  try {

    const identifier = req.params.id;

    const patient = await getPatientById(identifier);

    if (!patient) {
      return res.status(404).json({
        error: "Patient not found"
      });
    }

    res.json(patient);

  } catch (error) {

    console.error("getPatientHandler error:", error);

    res.status(500).json({
      error: "Failed to retrieve patient"
    });
  }
};


/*
SEARCH PATIENTS

Query examples:

/patients/search?identifier=123456
/patients/search?name=jane
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

    console.error("searchPatientsHandler error:", error);

    res.status(500).json({
      error: "Patient search failed"
    });
  }
};
