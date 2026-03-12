import { v4 as uuidv4 } from "uuid";
import { readEncounters, writeEncounters } from "../database/db.js";

/*
================================================
CREATE ENCOUNTER
================================================
*/

export const createEncounter = async (data) => {

  const encounters = await readEncounters();

  const encounter = {

    resourceType: "Encounter",
    id: uuidv4(),

    status: "in-progress",

    subject: {
      reference: "Patient/" + data.patientId
    },

    vitals: {
      temperature: "",
      bloodPressure: "",
      heartRate: "",
      respiratoryRate: "",
      oxygenSaturation: ""
    },

    symptoms: [],

    notes: "",

    /*
    =================================================
    DOCTOR NOTES (NEW)
    =================================================
    */

    doctorNotes: [],

    /*
    =================================================
    SOAN STRUCTURE
    =================================================
    */

    soan: {
      subjective: "",
      objective: "",
      assessment: "",
      nextSteps: ""
    },

    /*
    =================================================
    AI TRIAGE
    =================================================
    */

    triage: {
      riskLevel: "",
      aiRecommendation: ""
    },

    /*
    =================================================
    ESCALATION
    =================================================
    */

    escalation: {
      required: false,
      doctorId: null
    },

    /*
    =================================================
    TREATMENT DECISION (NEW)
    =================================================
    */

    treatmentDecision: {
      decision: "",
      recordedAt: null
    },

    /*
    =================================================
    PRESCRIPTIONS
    =================================================
    */

    prescription: [],

    createdAt: new Date()

  };

  encounters.push(encounter);

  await writeEncounters(encounters);

  return encounter;

};

/*
================================================
GET ALL ENCOUNTERS
================================================
*/

export const getEncounters = async () => {

  return await readEncounters();

};

/*
================================================
GET ENCOUNTER BY ID
================================================
*/

export const getEncounterById = async (id) => {

  const encounters = await readEncounters();

  return encounters.find(e => e.id === id);

};

/*
================================================
UPDATE ENCOUNTER
================================================
*/

export const updateEncounter = async (id, updates) => {

  const encounters = await readEncounters();

  const index = encounters.findIndex(e => e.id === id);

  if (index === -1) return null;

  encounters[index] = {
    ...encounters[index],
    ...updates
  };

  await writeEncounters(encounters);

  return encounters[index];

};
