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
  evaluateRisk,
  shouldEscalate
} from "../engine/risk.engine.js";

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
        null
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
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("intake", id);

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const { intake } = req.body;

    if (!intake) {
      return res.status(400).json({
        error: "Missing structured intake data"
      });
    }

    let updatedData = await processCaseState(
      record.encounter_data || {},
      "intake",
      { intake } // ✅ FIXED (NO DOUBLE WRAP)
    );

    updatedData.status = "intake_completed";

    // 🔥 OPTIONAL (but powerful): timeline visibility
    updatedData.timeline = [
      ...(updatedData.timeline || []),
      {
        event: "🧠 Clinical intake captured",
        intakeSummary: {
          age: intake?.patient?.age,
          sex: intake?.patient?.sex,
          flags: {
            pregnant: intake?.context?.pregnant,
            immunocompromised: intake?.context?.immunocompromised
          }
        },
        timestamp: new Date().toISOString()
      }
    ];

    console.log("➡️ intake result:", updatedData.status);

    const updated = await updateEncounterDB(
      id,
      updatedData,
      updatedData.status
    );

    res.json(updated);

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
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("vitals", id);

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    let updatedData = await processCaseState(
      record.encounter_data || {},
      "vitals",
      { vitals: req.body }
    );

    updatedData.status = "vitals_completed";

    const now = new Date().toISOString();

    const result = evaluateRisk({
      ...(updatedData?.vitals || {}),
      symptoms: updatedData?.symptoms || []
    });

    updatedData.triage = {
      ...(updatedData.triage || {}),
      severity: result.level,
      reason: result.reason
    };

    if (shouldEscalate(result.level)) {
      updatedData.decision = {
        type: "doctor_escalation",
        timestamp: now
      };

      updatedData.timeline = [
        ...(updatedData.timeline || []),
        {
          event: "🚨 Auto escalation (vitals)",
          reason: result.reason,
          timestamp: now
        }
      ];

      updatedData.status = "doctor_escalation";
    }

    console.log("➡️ vitals result:", updatedData.status);

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

  } catch (err) {
    console.error("VITALS ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
SYMPTOMS
================================================
*/
export const addSymptomsHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("symptoms", id);

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    let updatedData = await processCaseState(
      record.encounter_data || {},
      "symptoms",
      { symptoms: req.body }
    );

    updatedData.status = "symptoms_completed";

    const now = new Date().toISOString();

    const result = evaluateRisk({
      ...(updatedData?.vitals || {}),
      symptoms: updatedData?.symptoms || []
    });

    updatedData.triage = {
      ...(updatedData.triage || {}),
      severity: result.level,
      reason: result.reason
    };

    if (shouldEscalate(result.level)) {
      updatedData.decision = {
        type: "doctor_escalation",
        timestamp: now
      };

      updatedData.timeline = [
        ...(updatedData.timeline || []),
        {
          event: "🚨 Auto escalation (symptoms)",
          reason: result.reason,
          timestamp: now
        }
      ];

      updatedData.status = "doctor_escalation";
    }

    console.log("➡️ symptoms result:", updatedData.status);

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json(updated);

  } catch (err) {
    console.error("SYMPTOMS ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
NURSE (AI HYBRID)
================================================
*/
export const nurseAssessmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("nurse", id);

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    let updatedData = await processCaseState(
      record.encounter_data || {},
      "nurse",
      { nurseNotes: req.body }
    );

    const now = new Date().toISOString();

    const ai = await callAIOrchestrator({
      inputText: req.body?.notes || "",
      symptoms: updatedData?.symptoms || [],
      vitals: updatedData?.vitals || {},
      encounterId: id
    });

    const aiRisk = ai?.riskLevel?.toUpperCase();
    const aiConfidence = ai?.confidence || 0;

    const mcpSeverity = updatedData?.triage?.severity || "LOW";

    let finalSeverity = mcpSeverity;

    if (aiRisk === "HIGH" && aiConfidence > 0.7) {
      if (mcpSeverity === "LOW") finalSeverity = "MEDIUM";
      else if (mcpSeverity === "MEDIUM") finalSeverity = "HIGH";
    }

    const escalated = shouldEscalate(finalSeverity);

    updatedData.finalSeverity = finalSeverity;
    updatedData.escalated = escalated;

    updatedData.timeline = [
      ...(updatedData.timeline || []),
      {
        event: "🤖 AI nurse assist + hybrid decision",
        ai,
        finalSeverity,
        timestamp: now
      }
    ];

    const updated = await updateEncounterDB(id, updatedData, updatedData.status);

    res.json({
      success: true,
      ai,
      finalSeverity,
      escalated,
      encounter: updated
    });

  } catch (err) {
    console.error("NURSE ERROR:", err);
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
VALIDATION
================================================
*/
export const validateEncounterHandler = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("validate", id);

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const updatedData = await processCaseState(
      record.encounter_data || {},
      "validate",
      {
        validation: {
          clinician: req.body.clinician,
          notes: req.body.notes,
          timestamp: new Date().toISOString()
        }
      }
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
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("decision", id);

    const { type } = req.body;

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    let action;

    if (type === "doctor_escalation") action = "escalate";
    else if (type === "followup_scheduled") action = "followup";
    else action = "treat";

    let updatedData = await processCaseState(
      record.encounter_data || {},
      action,
      {
        decision: {
          type,
          timestamp: new Date().toISOString()
        }
      }
    );

    updatedData.timeline = [
      ...(updatedData.timeline || []),
      {
        event: "📋 Decision applied",
        type,
        timestamp: new Date().toISOString()
      }
    ];

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
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("get", id);

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

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
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("doctor_consult", id);

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const updatedData = await processCaseState(
      record.encounter_data || {},
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
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("doctor_notes", id);

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const updatedData = await processCaseState(
      record.encounter_data || {},
      "doctor_notes",
      {
        doctorNotes: {
          notes: req.body.notes,
          clinician: req.body.clinician,
          timestamp: new Date().toISOString()
        }
      }
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
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("doctor_decision", id);

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    const updatedData = await processCaseState(
      record.encounter_data || {},
      "doctor_decision",
      {
        doctorDecision: {
          outcome: req.body.outcome,
          notes: req.body.notes,
          timestamp: new Date().toISOString()
        }
      }
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
    if (!id) return res.status(400).json({ error: "Missing encounter ID" });

    trace("timeline", id);

    const record = await getEncounterDB(id);
    if (!record) return res.status(404).json({ error: "Not found" });

    res.json({
      timeline: record.encounter_data?.timeline || []
    });

  } catch (err) {
    res.status(500).json({ error: "Timeline fetch failed" });
  }
};
```
