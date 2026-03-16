import fs from "fs";
import path from "path";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

/*
==================================================
DATA FILES
==================================================
*/

const ENCOUNTERS_FILE = "data/encounters.json";
const PATIENTS_FILE = "data/patients.json";

/*
==================================================
HELPERS
==================================================
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
==================================================
EVENT APPEND WITH HASH CHAIN
==================================================
*/

function appendEvent(encounterId, file, payload) {

  const eventsDir = ensureEventFolder(encounterId);

  const filePath = path.join(eventsDir, file);

  let events = [];

  if (fs.existsSync(filePath)) {
    const raw = fs.readFileSync(filePath);
    events = JSON.parse(raw);
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
==================================================
CREATE ENCOUNTER
==================================================
*/

export async function createEncounterHandler(req, res) {

  try {

    const { patientId, reasonCode } = req.body;

    if (!patientId) {
      return res.status(400).json({
        error: "patientId required"
      });
    }

    const patients = readJSON(PATIENTS_FILE);

    const patient = patients.find(p => p.id === patientId);

    if (!patient) {
      return res.status(404).json({
        error: "Patient does not exist"
      });
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

    res.status(500).json({
      error: "Failed to create encounter"
    });

  }

}

/*
==================================================
GET ALL ENCOUNTERS
==================================================
*/

export async function getEncountersHandler(req, res) {

  try {

    const encounters = readJSON(ENCOUNTERS_FILE);

    res.json(encounters);

  } catch (err) {

    console.error("Get encounters error:", err);

    res.status(500).json({
      error: "Failed to load encounters"
    });

  }

}

/*
==================================================
GET SINGLE ENCOUNTER
==================================================
*/

export async function getEncounterHandler(req, res) {

  try {

    const encounterId = req.params.id;

    const encounters = readJSON(ENCOUNTERS_FILE);

    const encounter = encounters.find(e => e.id === encounterId);

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    res.json(encounter);

  } catch (err) {

    console.error("Get encounter error:", err);

    res.status(500).json({
      error: "Failed to load encounter"
    });

  }

}

/*
==================================================
UPDATE ENCOUNTER
==================================================
*/

export async function updateEncounterHandler(req, res) {

  try {

    const encounterId = req.params.id;

    const encounters = readJSON(ENCOUNTERS_FILE);

    const encounter = encounters.find(e => e.id === encounterId);

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    Object.assign(encounter, req.body);

    writeJSON(ENCOUNTERS_FILE, encounters);

    res.json(encounter);

  } catch (err) {

    console.error("Update encounter error:", err);

    res.status(500).json({
      error: "Failed to update encounter"
    });

  }

}

/*
==================================================
EVENT INGESTION
==================================================
*/

export async function addVitalsHandler(req, res) {

  try {

    appendEvent(req.params.id, "vitals.json", req.body);

    res.json({ status: "vitals recorded" });

  } catch (err) {

    console.error("Vitals error:", err);

    res.status(500).json({
      error: "Failed to record vitals"
    });

  }

}

export async function addSymptomsHandler(req, res) {

  try {

    appendEvent(req.params.id, "symptoms.json", req.body);

    res.json({ status: "symptoms recorded" });

  } catch (err) {

    console.error("Symptoms error:", err);

    res.status(500).json({
      error: "Failed to record symptoms"
    });

  }

}

export async function addNotesHandler(req, res) {

  try {

    appendEvent(req.params.id, "notes.json", req.body);

    res.json({ status: "note recorded" });

  } catch (err) {

    console.error("Notes error:", err);

    res.status(500).json({
      error: "Failed to record notes"
    });

  }

}

export async function addTriageHandler(req, res) {

  try {

    appendEvent(req.params.id, "triage.json", req.body);

    res.json({ status: "triage recorded" });

  } catch (err) {

    console.error("Triage error:", err);

    res.status(500).json({
      error: "Failed to record triage"
    });

  }

}

/*
==================================================
GET ENCOUNTER TIMELINE
==================================================
*/

export async function getEncounterTimelineHandler(req, res) {

  try {

    const encounterId = req.params.id;

    const encounters = readJSON(ENCOUNTERS_FILE);

    const encounter = encounters.find(e => e.id === encounterId);

    if (!encounter) {
      return res.status(404).json({
        error: "Encounter not found"
      });
    }

    const patients = readJSON(PATIENTS_FILE);

    const patient = patients.find(p => p.id === encounter.patientId);

    const eventsDir = ensureEventFolder(encounterId);

    function loadEvent(file) {

      const filePath = path.join(eventsDir, file);

      if (!fs.existsSync(filePath)) {
        return [];
      }

      const raw = fs.readFileSync(filePath);

      return JSON.parse(raw);

    }

    const timeline = {

      vitals: loadEvent("vitals.json"),

      symptoms: loadEvent("symptoms.json"),

      notes: loadEvent("notes.json"),

      triage: loadEvent("triage.json"),

      soan: loadEvent("soan.json"),

      prescriptions: loadEvent("prescriptions.json")

    };

    res.json({

      patient,

      encounter,

      timeline

    });

  } catch (err) {

    console.error("Timeline error:", err);

    res.status(500).json({
      error: "Failed to build timeline"
    });

  }

      }
