import crypto from "crypto";

import {
  createEncounterDB,
  getEncounterDB,
  updateEncounterDB
} from "../services/dbService.js";

import {
  processCaseState
} from "../services/clinicalStateMachine.js";

// ❌ REMOVE OLD ENGINE
// import { evaluateClinicalState } from "../services/clinicalRulesEngine.js";

// ✅ NEW ENGINE
import {
  evaluateRisk,
  shouldEscalate
} from "../engine/risk.engine.js";

// 🔥 AI ORCHESTRATOR
import {
  callAIOrchestrator
} from "../services/aiOrchestrator.client.js";

/*
================================================
CREATE
================================================
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

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const updatedData = await processCaseState(
      record.encounter_data,
      "intake",
      { intake: req.body }
    );

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
VITALS → 🔥 RISK ENGINE
================================================
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

    // 🔥 RUN ENGINE
    const result = evaluateRisk({
      ...updatedData.vitals,
      symptoms: updatedData.symptoms || []
    });

    updatedData.triage = {
      ...(updatedData.triage || {}),
      severity: result.level,
      reason: result.reason
    };

    // 🔥 ESCALATION
    if (shouldEscalate(result.level)) {
      updatedData.decision = {
        type: "doctor_escalation",
        timestamp: new Date().toISOString()
      };

      updatedData.timeline.push({
        event: "🚨 Auto escalation (risk engine - vitals)",
        reason: result.reason,
        timestamp: new Date().toISOString()
      });

      updatedData.status = "doctor_escalation";
    }

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
SYMPTOMS → 🔥 RE-EVALUATE
================================================
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

    const result = evaluateRisk({
      ...updatedData.vitals,
      symptoms: updatedData.symptoms
    });

    updatedData.triage = {
      ...(updatedData.triage || {}),
      severity: result.level,
      reason: result.reason
    };

    if (shouldEscalate(result.level)) {
      updatedData.decision = {
        type: "doctor_escalation",
        timestamp: new Date().toISOString()
      };

      updatedData.timeline.push({
        event: "🚨 Auto escalation (risk engine - symptoms)",
        reason:
