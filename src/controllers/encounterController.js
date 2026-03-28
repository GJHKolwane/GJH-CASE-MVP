import crypto from "crypto";

import {
createEncounterDB,
getEncounterDB,
updateEncounterDB
} from "../services/dbService.js";

import {
processCaseState,
enforceTransition,
actionMap
} from "../services/clinicalStateMachine.js";

/*

CREATE (SYSTEM OWNS patient_id)

*/
export const createEncounterHandler = async (req, res) => {
try {
const { national_id } = req.body || {};

// 🔥 ALWAYS system generated
const patientId = crypto.randomUUID();

const encounter = await createEncounterDB(
  patientId,
  national_id || null
);

res.json(encounter);

} catch (err) {
console.error(err);
res.status(500).json({ error: "Failed to create encounter" });
}
};

/*

INTAKE

*/
export const intakeHandler = async (req, res) => {
try {
const { id } = req.params;

const record = await getEncounterDB(id);
if (!record) return res.status(404).json({ error: "Not found" });

let data = record.encounter_data;

const check = enforceTransition(record.status, actionMap.intake);
if (!check.allowed) return res.status(400).json(check);

data.intake = req.body;

data.timeline = data.timeline || [];
data.timeline.push({
  event: "Patient intake completed",
  timestamp: new Date().toISOString()
});

const updatedData = await processCaseState(data);

const updated = await updateEncounterDB(
  id,
  updatedData,
  actionMap.intake
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(500).json({ error: "Intake failed" });
}
};

/*

VITALS

*/
export const addVitalsHandler = async (req, res) => {
try {
const { id } = req.params;

const record = await getEncounterDB(id);
if (!record) return res.status(404).json({ error: "Not found" });

let data = record.encounter_data;

const check = enforceTransition(record.status, actionMap.vitals);
if (!check.allowed) return res.status(400).json(check);

data.vitals = req.body;

data.timeline.push({
  event: "Vitals recorded",
  timestamp: new Date().toISOString()
});

const updatedData = await processCaseState(data);

const updated = await updateEncounterDB(
  id,
  updatedData,
  actionMap.vitals
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(500).json({ error: "Vitals failed" });
}
};

/*

SYMPTOMS

*/
export const addSymptomsHandler = async (req, res) => {
try {
const { id } = req.params;

const record = await getEncounterDB(id);
if (!record) return res.status(404).json({ error: "Not found" });

let data = record.encounter_data;

const check = enforceTransition(record.status, actionMap.symptoms);
if (!check.allowed) return res.status(400).json(check);

data.symptoms = req.body;

data.timeline.push({
  event: "Symptoms recorded",
  timestamp: new Date().toISOString()
});

const updatedData = await processCaseState(data);

const updated = await updateEncounterDB(
  id,
  updatedData,
  actionMap.symptoms
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(500).json({ error: "Symptoms failed" });
}
};

/*

NURSE

*/
export const nurseAssessmentHandler = async (req, res) => {
try {
const { id } = req.params;

const record = await getEncounterDB(id);
if (!record) return res.status(404).json({ error: "Not found" });

let data = record.encounter_data;

const check = enforceTransition(record.status, actionMap.nurse);
if (!check.allowed) return res.status(400).json(check);

data.nurseNotes = req.body;

data.timeline.push({
  event: "Nurse assessment completed",
  timestamp: new Date().toISOString()
});

const updatedData = await processCaseState(data);

const updated = await updateEncounterDB(
  id,
  updatedData,
  actionMap.nurse
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(500).json({ error: "Nurse step failed" });
}
};

/*

VALIDATION

*/
export const validateEncounterHandler = async (req, res) => {
try {
const { id } = req.params;

const record = await getEncounterDB(id);
if (!record) return res.status(404).json({ error: "Not found" });

let data = record.encounter_data;

const check = enforceTransition(record.status, actionMap.validate);
if (!check.allowed) return res.status(400).json(check);

data.validation = {
  clinician: req.body.clinician,
  notes: req.body.notes,
  timestamp: new Date().toISOString()
};

data.timeline.push({
  event: "Clinician validation completed",
  timestamp: new Date().toISOString()
});

const updatedData = await processCaseState(data);

const updated = await updateEncounterDB(
  id,
  updatedData,
  actionMap.validate
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(500).json({ error: "Validation failed" });
}
};

/*

DECISION

*/
export const decisionHandler = async (req, res) => {
try {
const { id } = req.params;
const { type } = req.body;

const record = await getEncounterDB(id);
if (!record) return res.status(404).json({ error: "Not found" });

let data = record.encounter_data;

const check = enforceTransition(record.status, actionMap.decision);
if (!check.allowed) return res.status(400).json(check);

data.decision = type;

data.timeline.push({
  event: `Decision made: ${type}`,
  timestamp: new Date().toISOString()
});

const updatedData = await processCaseState(data);

const updated = await updateEncounterDB(
  id,
  updatedData,
  actionMap.decision
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(500).json({ error: "Decision failed" });
}
};

/*

TIMELINE

*/
export const getEncounterTimelineHandler = async (req, res) => {
try {
const record = await getEncounterDB(req.params.id);

if (!record) return res.status(404).json({ error: "Not found" });

const data = record.encounter_data;

res.json({
  encounterId: record.id,
  state: record.status,
  timeline: data.timeline || []
});

} catch (err) {
console.error(err);
res.status(500).json({ error: "Timeline fetch failed" });
}
};

/*

GET ENCOUNTER

*/
export const getEncounterHandler = async (req, res) => {
try {
const { id } = req.params;

const record = await getEncounterDB(id);

if (!record) {
  return res.status(404).json({ error: "Not found" });
}

res.json(record);

} catch (err) {
console.error(err);
res.status(500).json({ error: "Fetch failed" });
}
};
