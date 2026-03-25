import { v4 as uuidv4 } from "uuid";
import { readPatients, writePatients } from "../database/db.js";

/*
====================================================
CREATE PATIENT (FHIR + IDENTITY METADATA)
====================================================
*/

export const createPatient = async (data) => {

  const patients = await readPatients();

  const patient = {
    resourceType: "Patient",

    id: uuidv4(),

    /*
    =========================================
    FHIR IDENTIFIER
    =========================================
    */
    identifier: data.identifier || [],

    /*
    =========================================
    NAME (FHIR STRUCTURE)
    =========================================
    */
    name: [
      {
        text: data.name || data.fullName || null
      }
    ],

    gender: data.gender || null,

    birthDate: data.birthDate || null,

    telecom: data.telecom || [],

    address: data.address || [],

    /*
    =========================================
    🔥 IDENTITY METADATA (NEW)
    =========================================
    */
    meta: {
      identityLevel: data.identityLevel || null,
      createdAt: new Date().toISOString()
    }
  };

  patients.push(patient);

  await writePatients(patients);

  return patient;
};

/*
====================================================
GET ALL PATIENTS
====================================================
*/

export const getPatients = async () => {
  return await readPatients();
};

/*
====================================================
GET PATIENT BY ID
====================================================
*/

export const getPatientById = async (id) => {

  const patients = await readPatients();

  return patients.find(p => p.id === id);
};

/*
====================================================
SEARCH PATIENTS
====================================================
*/

export const searchPatients = async ({ identifier, name }) => {

  const patients = await readPatients();

  if (identifier) {
    return patients.filter(p =>
      p.identifier?.some(i => i.value === identifier)
    );
  }

  if (name) {
    const search = name.toLowerCase();

    return patients.filter(p =>
      p.name?.[0]?.text?.toLowerCase().includes(search)
    );
  }

  return [];
};
