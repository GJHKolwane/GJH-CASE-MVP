import crypto from "crypto";

import {
createEncounterDB,
getEncounterDB,
updateEncounterDB
} from "../services/dbService.js";

import {
processCaseState
} from "../services/clinicalStateMachine.js";

import {
evaluateClinicalState
} from "../services/clinicalRulesEngine.js";

/*

CREATE (SYSTEM OWNS patient_id)

*/
export const createEncounterHandler = async (req, res) => {
try {
const { national_id } = req.body || {};

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

const updatedData = await processCaseState(
  record.encounter_data,
  "intake",
  { intake: req.body }
);

const updated = await updateEncounterDB(
  id,
  updatedData,
  updatedData.status
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(400).json({ error: err.message });
}
};

/*

VITALS + CLINICAL SAFETY

*/
export const addVitalsHandler = async (req, res) => {
try {
const { id } = req.params;

const record = await getEncounterDB(id);
if (!record) return res.status(404).json({ error: "Not found" });

let updatedData = await processCaseState(
  record.encounter_data,
  "vitals",
  { vitals: req.body }
);

// ================================
// CLINICAL SAFETY ENGINE
// ================================
const { severity, autoDecision, triggers } = evaluateClinicalState(updatedData);

updatedData.triage = {
  ...(updatedData.triage || {}),
  severity
};

// AUTO ESCALATION
if (autoDecision) {
  updatedData.decision = {
    type: autoDecision.type,
    timestamp: new Date().toISOString()
  };

  updatedData.timeline.push({
    event: "🚨 Auto escalation triggered (vitals)",
    reason: triggers,
    timestamp: new Date().toISOString()
  });

  updatedData.status = "doctor_escalation";
}

const updated = await updateEncounterDB(
  id,
  updatedData,
  updatedData.status
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(400).json({ error: err.message });
}
};

/*

SYMPTOMS + CLINICAL SAFETY

*/
export const addSymptomsHandler = async (req, res) => {
try {
const { id } = req.params;

const record = await getEncounterDB(id);
if (!record) return res.status(404).json({ error: "Not found" });

let updatedData = await processCaseState(
  record.encounter_data,
  "symptoms",
  { symptoms: req.body }
);

// ================================
// CLINICAL SAFETY ENGINE
// ================================
const { severity, autoDecision, triggers } = evaluateClinicalState(updatedData);

updatedData.triage = {
  ...(updatedData.triage || {}),
  severity
};

// AUTO ESCALATION
if (autoDecision) {
  updatedData.decision = {
    type: autoDecision.type,
    timestamp: new Date().toISOString()
  };

  updatedData.timeline.push({
    event: "🚨 Auto escalation triggered (symptoms)",
    reason: triggers,
    timestamp: new Date().toISOString()
  });

  updatedData.status = "doctor_escalation";
}

const updated = await updateEncounterDB(
  id,
  updatedData,
  updatedData.status
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(400).json({ error: err.message });
}
};

/*

NURSE (AI TRIGGERS HERE)

*/
export const nurseAssessmentHandler = async (req, res) => {
try {
const { id } = req.params;

const record = await getEncounterDB(id);
if (!record) return res.status(404).json({ error: "Not found" });

const updatedData = await processCaseState(
  record.encounter_data,
  "nurse",
  { nurseNotes: req.body }
);

const updated = await updateEncounterDB(
  id,
  updatedData,
  updatedData.status
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(400).json({ error: err.message });
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

const updatedData = await processCaseState(
  record.encounter_data,
  "validate",
  {
    validation: {
      clinician: req.body.clinician,
      notes: req.body.notes,
      timestamp: new Date().toISOString()
    }
  }
);

const updated = await updateEncounterDB(
  id,
  updatedData,
  updatedData.status
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(400).json({ error: err.message });
}
};

/*

DECISION (ENFORCED)

*/
export const decisionHandler = async (req, res) => {
try {
const { id } = req.params;
const { type, followUp } = req.body;

const record = await getEncounterDB(id);
if (!record) return res.status(404).json({ error: "Not found" });

if (!type) {
  return res.status(400).json({ error: "Decision type is required" });
}

if (type === "treatment_applied") {
  if (!followUp || !followUp.required) {
    return res.status(400).json({
      error: "Follow-up is required when treatment is applied"
    });
  }
}

let action;

if (type === "doctor_escalation") {
  action = "escalate";
} else if (type === "followup_scheduled") {
  action = "followup";
} else {
  action = "treat";
}

const updatedData = await processCaseState(
  record.encounter_data,
  action,
  {
    decision: {
      type,
      timestamp: new Date().toISOString()
    },

    ...(followUp && {
      followUp: {
        ...followUp,
        createdAt: new Date().toISOString()
      }
    })
  }
);

const updated = await updateEncounterDB(
  id,
  updatedData,
  updatedData.status
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(400).json({ error: err.message });
}
};

/*

DOCTOR FLOW

*/
export const doctorConsultationHandler = async (req, res) => {
try {
const { id } = req.params;
const { clinician } = req.body;

const record = await getEncounterDB(id);
if (!record) return res.status(404).json({ error: "Not found" });

const updatedData = await processCaseState(
  record.encounter_data,
  "doctor",
  {
    doctor: {
      clinician,
      startedAt: new Date().toISOString()
    }
  }
);

const updated = await updateEncounterDB(
  id,
  updatedData,
  updatedData.status
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(400).json({ error: err.message });
}
};

export const doctorNotesHandler = async (req, res) => {
try {
const { id } = req.params;
const { notes, diagnosis } = req.body;

const record = await getEncounterDB(id);
if (!record) return res.status(404).json({ error: "Not found" });

const updatedData = await processCaseState(
  record.encounter_data,
  "doctor_notes",
  {
    doctorNotes: {
      notes,
      diagnosis,
      timestamp: new Date().toISOString()
    }
  }
);

const updated = await updateEncounterDB(
  id,
  updatedData,
  updatedData.status
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(400).json({ error: err.message });
}
};

export const doctorDecisionHandler = async (req, res) => {
try {
const { id } = req.params;
const { type, reason } = req.body;

const record = await getEncounterDB(id);
if (!record) return res.status(404).json({ error: "Not found" });

const updatedData = await processCaseState(
  record.encounter_data,
  "doctor_decision",
  {
    doctorDecision: {
      type,
      reason,
      timestamp: new Date().toISOString()
    }
  }
);

const updated = await updateEncounterDB(
  id,
  updatedData,
  updatedData.status
);

res.json(updated);

} catch (err) {
console.error(err);
res.status(400).json({ error: err.message });
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
