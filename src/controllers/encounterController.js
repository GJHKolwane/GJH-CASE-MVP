// src/controllers/encounterController.js

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

import {
  evaluateEncounter
} from "../services/clinicalDecision.service.js";

import {
  callAIOrchestrator
} from "../services/aiOrchestrator.client.js";

/*
================================================
UTIL — TRACE LOGGER 🔥
================================================
*/
const trace = (stage, id) => {
  console.log(`🧭 [${stage.toUpperCase()}] id: ${id}`);
};

/*
================================================
🧠 SAFETY — ENSURE DECISION EXISTS BEFORE FSM
================================================
*/
const ensureDecision = async (data) => {
  const ed = data.encounter_data || {};

  if (!ed.finalSeverity) {
    console.log("⚠️ Missing decision → running safety decision engine");

    const decision = await evaluateEncounter({
      vitals: ed.vitals,
      symptoms: ed.symptoms,
      notes: ed?.triage?.notes
    });

    data.encounter_data.finalSeverity = decision.finalSeverity;
    data.encounter_data.rules = decision.rules;
    data.encounter_data.ai = decision.ai;

    data.timeline = [
      ...(data.timeline || []),
      {
        event: "🛡️ Safety decision engine executed",
        decision,
        timestamp: new Date().toISOString()
      }
    ];
  }

  return data;
};

/*
================================================
CREATE
================================================
*/
export const createEncounterHandler = async (req, res) => {
  try {
    const body = req.body || {};

    const normalized = {
      patient_data: {
        name:
          body.patient_data?.name ||
          body.patientName ||
          body.name ||
          "Unknown Patient"
      },
      national_id:
        body.national_id ||
        body.nationalId ||
        null,
      status: "created",
      current_state: "created",
      encounter_data: {}
    };

    const encounter = await createEncounterDB(normalized);

    trace("create", encounter.id);

    res.json(encounter);

  } catch (err) {
    console.error("CREATE ENCOUNTER ERROR:", err);
    res.status(500).json({ error: "Failed to create encounter" });
  }
};

/*
================================================
INTAKE
================================================
*/
export const intakeHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("intake", id);

    const record = await getEncounterDB(id);

    const updatedData = await processCaseState(
      record,
      "intake",
      { intake: req.body.intake }
    );

    const updated = await updateEncounterDB(
      id,
      updatedData,
      updatedData.status
    );

    /*
    ========================================
    🔥 CRITICAL: RESPONSE NORMALIZATION
    ========================================
    */

    return res.json({
      encounter: {
        id: updated.id,
        state: (updated.status || "").toUpperCase() // 🔥 normalize
      },
      encounter_data: updated.encounter_data || {}
    });

  } catch (err) {
    console.error("INTAKE ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};
/*
================================================
VITALS
================================================
*/
export const addVitalsHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("vitals", id);

    const record = await getEncounterDB(id);

    const updatedData = await processCaseState(
      record,
      "vitals",
      req.body
    );

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

  } catch (err) {
    console.error("VITALS ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
SYMPTOMS (AI CHECKPOINT 1 — EARLY)
================================================
*/

import { evaluateEncounter } from "../services/clinicalDecision.service.js";

export const addSymptomsHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("symptoms", id);

    const record = await getEncounterDB(id);

    const symptoms = Array.isArray(req.body?.symptoms)
      ? req.body.symptoms
      : [];

    // 🔥 NORMALIZE VITALS (CRITICAL FIX)
    const rawVitals = record?.encounter_data?.vitals || {};
    const normalizedVitals = rawVitals?.vitals || rawVitals;

    const notes = record?.encounter_data?.notes || "";

    /*
    ========================================
    🧠 UNIFIED CLINICAL DECISION (SOURCE OF TRUTH)
    ========================================
    */
    const result = await evaluateEncounter({
      vitals: normalizedVitals,
      symptoms,
      notes
    });

    const { rules, ai, finalSeverity } = result;

    /*
    ========================================
    🚑 ROUTING + ESCALATION (CRITICAL FIX)
    ========================================
    */
    let routing = {
      queue: "NORMAL",
      priority: "NORMAL"
    };

    let escalation = {
      status: false
    };

    if (finalSeverity === "CRITICAL") {
      routing = {
        queue: "EMERGENCY",
        priority: "STAT"
      };

      escalation = {
        status: true,
        type: "doctor_escalation",
        reason: rules?.triggers || []
      };
    } else if (finalSeverity === "HIGH") {
      routing = {
        queue: "URGENT",
        priority: "HIGH"
      };
    } else if (finalSeverity === "MEDIUM") {
      routing = {
        queue: "STANDARD",
        priority: "MEDIUM"
      };
    }

    /*
    ========================================
    📦 PAYLOAD FOR FSM
    ========================================
    */
    const enrichedPayload = {
      symptoms,
      rules,
      ai,
      finalSeverity,
      routing,
      escalation
    };

    const updatedData = await processCaseState(
      record,
      "symptoms",
      enrichedPayload
    );

    const updated = await updateEncounterDB(
      id,
      updatedData,
      updatedData.status
    );

    res.json(updated);

  } catch (err) {
    console.error("SYMPTOMS ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
NURSE (AI CHECKPOINT 2 — FULL DECISION)
================================================
*/
export const nurseAssessmentHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("nurse", id);

    const record = await getEncounterDB(id);

    let updatedData = await processCaseState(
      record,
      "nurse",
      req.body
    );

    const ed = updatedData.encounter_data;

    // 🔥 FULL DECISION ENGINE (RULES + AI + FUSION)
    const decision = await evaluateEncounter({
      vitals: ed.vitals,
      symptoms: ed.symptoms,
      triage: ed.triage,
      notes: req.body.notes
    });

    const now = new Date().toISOString();

    updatedData.encounter_data.finalSeverity = decision.finalSeverity;
    updatedData.rules = decision.rules; // ✅ FSM expects this at root
    updatedData.encounter_data.ai = decision.ai;

    updatedData.timeline = [
      ...(updatedData.timeline || []),
      {
        event: "🧠 Clinical decision engine executed",
        decision,
        timestamp: now
      }
    ];

    // 🛡️ FINAL GUARD BEFORE RETURN (FSM already ran once)
    updatedData = await ensureDecision(updatedData);

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json({
      success: true,
      decision,
      encounter: updated
    });

  } catch (err) {
    console.error("NURSE ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
VALIDATION (GUARDED)
================================================
*/
export const validateEncounterHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("validate", id);

    let record = await getEncounterDB(id);

    record = await ensureDecision(record); // 🔥 CRITICAL

    const updatedData = await processCaseState(
      record,
      "validate",
      req.body
    );

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

  } catch (err) {
    console.error("VALIDATION ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
DECISION
================================================
*/
export const decisionHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.body;

    trace("decision", id);

    let record = await getEncounterDB(id);

    record = await ensureDecision(record); // 🔥 CRITICAL

    let action;

    if (type === "doctor_escalation") action = "escalate";
    else if (type === "followup_scheduled") action = "followup";
    else action = "treat";

    const updatedData = await processCaseState(
      record,
      action,
      req.body
    );

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

  } catch (err) {
    console.error("DECISION ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
GET
================================================
*/
export const getEncounterHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("get", id);

    const record = await getEncounterDB(id);

    res.json(record);

  } catch (err) {
    res.status(500).json({ error: "Fetch failed" });
  }
};

/*
================================================
DOCTOR CONSULTATION
================================================
*/
export const doctorConsultationHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("doctor_consult", id);

    let record = await getEncounterDB(id);

    record = await ensureDecision(record); // 🔥 CRITICAL

    const updatedData = await processCaseState(
      record,
      "doctor",
      {}
    );

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

  } catch (err) {
    console.error("DOCTOR CONSULT ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
DOCTOR NOTES
================================================
*/
export const doctorNotesHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("doctor_notes", id);

    let record = await getEncounterDB(id);

    record = await ensureDecision(record);

    const updatedData = await processCaseState(
      record,
      "doctor_notes",
      req.body
    );

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

  } catch (err) {
    console.error("DOCTOR NOTES ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
DOCTOR DECISION
================================================
*/
export const doctorDecisionHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("doctor_decision", id);

    let record = await getEncounterDB(id);

    record = await ensureDecision(record);

    const updatedData = await processCaseState(
      record,
      "doctor_decision",
      req.body
    );

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

  } catch (err) {
    console.error("DOCTOR DECISION ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
TIMELINE
================================================
*/
export const getEncounterTimelineHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("timeline", id);

    const record = await getEncounterDB(id);

    res.json({
      timeline: record.timeline || []
    });

  } catch (err) {
    res.status(500).json({ error: "Timeline fetch failed" });
  }
};
