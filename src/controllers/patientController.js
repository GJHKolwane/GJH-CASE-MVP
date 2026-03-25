import {
createPatient,
getPatients,
getPatientById,
searchPatients
} from "../models/patientModel.js";

/*

RESOLVE / CREATE PATIENT (🔥 FINAL LOGIC)

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

/*
=========================================
VALIDATION
=========================================
*/

if (!identifier) {
  return res.status(400).json({
    error: "identifier is required"
  });
}

/*
=========================================
STEP 1 — CHECK EXISTING PATIENT
=========================================
*/

const existingPatients = await searchPatients({
  identifier
});

if (existingPatients && existingPatients.length > 0) {

  console.log("✅ Existing patient found:", identifier);

  return res.status(200).json(existingPatients[0]);
}

/*
=========================================
STEP 2 — CREATE NEW PATIENT
=========================================
*/

if (!fullName) {
  return res.status(400).json({
    error: "fullName required for new patient"
  });
}

const patient = await createPatient({

  resourceType: "Patient",

  identifier: [
    {
      system: system || "GJH",
      value: identifier
    }
  ],

  name: fullName,

  gender: gender || "unknown",

  birthDate: birthDate || null,

  telecom: telecom || [],

  address: address || [],

  createdAt: new Date().toISOString()

});

console.log("🆕 New patient created:", identifier);

return res.status(201).json(patient);

} catch (error) {

console.error("createPatientHandler error:", error);

return res.status(500).json({
  error: "Failed to resolve/create patient"
});

}

};

/*

GET ALL PATIENTS

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

return res.json(patient);

} catch (error) {

console.error("getPatientHandler error:", error);

return res.status(500).json({
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

return res.json(patients);

} catch (error) {

console.error("searchPatientsHandler error:", error);

return res.status(500).json({
  error: "Search failed"
});

}

};
