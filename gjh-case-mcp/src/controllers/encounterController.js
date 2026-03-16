import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

const ENCOUNTERS_FILE = "data/encounters.json";
const PATIENTS_FILE = "data/patients.json";

/*
==============================================
HELPERS
==============================================
*/

function readJSON(file) {

  if (!fs.existsSync(file)) {
    return [];
  }

  const raw = fs.readFileSync(file);

  return JSON.parse(raw);

}

function writeJSON(file, data) {

  fs.writeFileSync(file, JSON.stringify(data, null, 2));

}

function ensureEventFolder(encounterId) {

  const dir = path.join("data", "events", encounterId);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dir;

}

/*
==============================================
EVENT APPEND WITH HASH
==============================================
*/

function appendEvent(encounterId, file, payload) {

  const dir = ensureEventFolder(encounterId);

  const filePath = path.join(dir, file);

  let events = [];

  if (fs.existsSync(filePath)) {
    events = JSON.parse(fs.readFileSync(filePath));
  }

  const previousHash =
    events.length > 0 ? events[events.length - 1].hash : "GENESIS";

  const event = {
    eventId: uuidv4(),
    actor: payload.actor || "system",
    data: payload,
    timestamp: new Date().toISOString(),
    previousHash
  };

  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify(event))
    .digest("hex");

  event.hash = hash;

  events.push(event);

  fs.writeFileSync(filePath, JSON.stringify(events, null, 2));

}

/*
==============================================
CREATE ENCOUNTER
==============================================
*/

export async function createEncounterHandler(req, res) {

  try {

    const { patientId, reasonCode } = req.body;

    if (!patientId) {
      return res.status(400).json({ error: "patientId required" });
    }

    const patients = readJSON(PATIENTS_FILE);

    const patient = patients.find(p => p.id === patientId);

    if (!patient) {
      return res.status(404).json({ error: "Patient does not exist" });
    }

    const encounters = readJSON(ENCOUNTERS_FILE);

    const encounter = {
      resourceType: "Encounter",
      id: uuidv4(),
      patientId,
      status: "in-progress",
      stage: "intake",
      reasonCode: reasonCode || [],
      createdAt: new Date().toISOString()
    };

    encounters.push(encounter);

    writeJSON(ENCOUNTERS_FILE, encounters);

    ensureEventFolder(encounter.id);

    res.json(encounter);

  } catch (err) {

    console.error("Create encounter error:", err);

    res.status(500).json({ error: "Failed to create encounter" });

  }

}

/*
==============================================
SET STAGE
==============================================
*/

export async function setEncounterStageHandler(req, res) {

  try {

    const encounterId = req.params.id;

    const { stage } = req.body;

    const encounters = readJSON(ENCOUNTERS_FILE);

    const encounter = encounters.find(e => e.id === encounterId);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    encounter.stage = stage;

    writeJSON(ENCOUNTERS_FILE, encounters);

    res.json(encounter);

  } catch (err) {

    res.status(500).json({ error: "Failed to update stage" });

  }

}

/*
==============================================
VITALS
==============================================
*/

export async function addVitalsHandler(req, res) {

  try {

    appendEvent(req.params.id, "vitals.json", req.body);

    res.json({ status: "vitals recorded" });

  } catch (err) {

    res.status(500).json({ error: "Vitals failed" });

  }

}

/*
==============================================
SYMPTOMS
==============================================
*/

export async function addSymptomsHandler(req, res) {

  try {

    appendEvent(req.params.id, "symptoms.json", req.body);

    res.json({ status: "symptoms recorded" });

  } catch (err) {

    res.status(500).json({ error: "Symptoms failed" });

  }

}

/*
==============================================
NURSE NOTES
==============================================
*/

export async function addNotesHandler(req, res) {

  try {

    appendEvent(req.params.id, "notes.json", req.body);

    res.json({ status: "notes recorded" });

  } catch (err) {

    res.status(500).json({ error: "Notes failed" });

  }

}

/*
==============================================
DOCTOR NOTES
==============================================
*/

export async function addDoctorNotesHandler(req, res) {

  try {

    appendEvent(req.params.id, "doctor-notes.json", req.body);

    res.json({ status: "doctor notes recorded" });

  } catch (err) {

    res.status(500).json({ error: "Doctor notes failed" });

  }

}

/*
==============================================
AI TRIAGE
==============================================
*/

export async function addTriageHandler(req, res) {

  try {

    appendEvent(req.params.id, "triage.json", req.body);

    res.json({ status: "triage recorded" });

  } catch (err) {

    res.status(500).json({ error: "Triage failed" });

  }

}

/*
==============================================
TREATMENT DECISION
==============================================
*/

export async function addTreatmentDecisionHandler(req, res) {

  try {

    appendEvent(req.params.id, "prescriptions.json", req.body);

    res.json({ status: "treatment decision recorded" });

  } catch (err) {

    res.status(500).json({ error: "Treatment decision failed" });

  }

}

/*
==============================================
TIMELINE
==============================================
*/

export async function getEncounterTimelineHandler(req, res) {

  try {

    const encounterId = req.params.id;

    const encounters = readJSON(ENCOUNTERS_FILE);

    const encounter = encounters.find(e => e.id === encounterId);

    if (!encounter) {
      return res.status(404).json({ error: "Encounter not found" });
    }

    const patients = readJSON(PATIENTS_FILE);

    const patient = patients.find(p => p.id === encounter.patientId);

    const dir = ensureEventFolder(encounterId);

    function load(file) {

      const filePath = path.join(dir, file);

      if (!fs.existsSync(filePath)) {
        return [];
      }

      return JSON.parse(fs.readFileSync(filePath));

    }

    res.json({

      patient,
      encounter,

      timeline: {

        vitals: load("vitals.json"),
        symptoms: load("symptoms.json"),
        notes: load("notes.json"),
        doctorNotes: load("doctor-notes.json"),
        triage: load("triage.json"),
        prescriptions: load("prescriptions.json")

      }

    });

  } catch (err) {

    res.status(500).json({ error: "Timeline failed" });

  }

                   }
