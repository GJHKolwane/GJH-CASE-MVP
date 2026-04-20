// src/controllers/encounterController.js

import {
  createEncounterDB,
  getEncounterDB,
  updateEncounterDB
} from "../services/dbService.js";
import { assertValidTransition } from "../services/governance/stateContract.js";
import { appendStateHistory } from "../services/governance/stateHistory.js";


import { evaluateEncounter } from "../services/clinicalDecision.service.js";
import { callAIOrchestrator } from "../services/aiOrchestrator.client.js";

/*
================================================
UTIL
================================================
*/
const trace = (stage, id) => {
  console.log(`🧭 [${stage.toUpperCase()}] id: ${id}`);
};

const sanitizeResponse = (data) => {
  const clean = { ...data };
  if (clean.encounter_data) {
    delete clean.encounter_data.routing;
    delete clean.encounter_data.escalation;
  }
  return clean;
};

const cleanBeforeSave = (data) => {
  if (data.encounter_data) {
    delete data.encounter_data.routing;
    delete data.encounter_data.escalation;
  }
  return data;
};

/*
================================================
DECISION GUARD (AI ≠ AUTHORITY)
================================================
*/
const ensureDecision = async (record) => {
  const ed = record.encounter_data || {};

  if (!ed.decision) {
    const decision = await evaluateEncounter(ed);

    ed.decision = decision;
    ed.finalSeverity = decision.finalSeverity;
    ed.rules = decision.rules;

    record.timeline = [
      ...(record.timeline || []),
      {
        event: "🛡️ Decision engine fallback",
        timestamp: new Date().toISOString()
      }
    ];
  }

  return record;
};

/*
================================================
CREATE
================================================
*/

export const createEncounterHandler = async (req, res) => {
  try {
    const body = req.body || {};
    const now = new Date().toISOString();

    // ========================================
    // 🧠 STEP 1: CREATE PATIENT (SOURCE OF TRUTH)
    // ========================================
    const patientId = uuidv4();

    await query(
      `INSERT INTO patients (id, name, national_id)
       VALUES ($1, $2, $3)`,
      [
        patientId,
        body.patient_data?.name || body.name || "Unknown Patient",
        body.national_id || null
      ]
    );

    // ========================================
    // 🧠 STEP 2: NORMALIZE ENCOUNTER
    // ========================================
    const normalized = {
      patient_id: patientId, // 🔥 CRITICAL

      status: "created",
      current_state: "created",

      encounter_data: {
        intake: null,
        vitals: null,
        symptoms: null,

        ai: {},
        decision: {},
        validation: {},

        nurseSession: {},
        doctorSession: {},

        appointment: null,

        ownership: {
          owner: "system",
          doctorId: null,
          claimedAt: null
        },

        history: [
          {
            from: null,
            to: "created",
            actor: "system",
            timestamp: now
          }
        ]
      },

      timeline: [
        {
          event: "🆕 Encounter created",
          timestamp: now
        }
      ]
    };

    // ========================================
    // 💾 STEP 3: CREATE ENCOUNTER
    // ========================================
    const encounter = await createEncounterDB(normalized);

    trace("create", encounter.id);

    res.json({
      status: encounter.status,
      encounter: sanitizeResponse(encounter)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Create failed" });
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

    const record = await getEncounterDB(id);

    res.json({
      timeline: record.timeline || []
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
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

    let record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Not found" });
    }

    record.encounter_data = record.encounter_data || {};

    // 🔐 GOVERNANCE (created → intake)
    assertValidTransition(record.status, "intake");

    // 🧾 HISTORY (AUDIT)
    const updatedEncounterData = appendStateHistory(
      record,
      record.status,
      "intake",
      "system"
    );

    // 🧠 BUSINESS LOGIC (simple + explicit)
    record.encounter_data = {
      ...updatedEncounterData,
      intake: req.body.intake || {}
    };

    // 🔄 STATE UPDATE
    record.status = "intake";

    // 🕒 TIMELINE (human-readable)
    record.timeline.push({
      event: "📝 Intake captured",
      timestamp: new Date().toISOString()
    });

    const updated = await updateEncounterDB(
      id,
      cleanBeforeSave(record),
      record.status
    );

    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
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

    let record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Not found" });
    }

    record.encounter_data = record.encounter_data || {};

    // 🔐 GOVERNANCE (intake → vitals_recorded)
    assertValidTransition(record.status, "vitals_recorded");

    // 🧾 HISTORY (AUDIT)
    const updatedEncounterData = appendStateHistory(
      record,
      record.status,
      "vitals_recorded",
      "system"
    );

    // 🧠 BUSINESS LOGIC
    record.encounter_data = {
      ...updatedEncounterData,
      vitals: {
        heart_rate: Number(req.body.heartRate) || null,
        temperature: Number(req.body.temperature) || null,
        blood_pressure: req.body.bloodPressure || null,
        spo2: Number(req.body.oxygenSaturation) || null
      }
    };

    // 🔄 STATE UPDATE
    record.status = "vitals_recorded";

    // 🕒 TIMELINE
    record.timeline.push({
      event: "🩺 Vitals recorded",
      timestamp: new Date().toISOString()
    });

    const updated = await updateEncounterDB(
      id,
      cleanBeforeSave(record),
      record.status
    );

    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
/*
================================================
SYMPTOMS + AI + DECISION
================================================
*/
export const addSymptomsHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("symptoms", id);

    let record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Not found" });
    }

    record.encounter_data = record.encounter_data || {};

    // 🔐 GOVERNANCE (vitals_recorded → symptoms_recorded)
    assertValidTransition(record.status, "symptoms_recorded");

    // 🧾 HISTORY (AUDIT)
    const updatedEncounterData = appendStateHistory(
      record,
      record.status,
      "symptoms_recorded",
      "system"
    );

    // 🧠 NORMALIZE INPUT
    const symptoms =
      typeof req.body.symptoms === "string"
        ? req.body.symptoms.split(",").map(s => s.trim())
        : req.body.symptoms || [];

    // 🤖 AI (assistive only)
    let ai = null;
    try {
      ai = await callAIOrchestrator({
        inputText: symptoms.join(", "),
        vitals: record.encounter_data.vitals || {},
        symptoms
      });
    } catch {
      ai = null;
    }

    // 🧠 DECISION (PRIMARY AUTHORITY)
    const decision = await evaluateEncounter({
      ...record.encounter_data,
      symptoms,
      ai
    });

    // 💾 SAFE MERGE (NO DATA LOSS)
    record.encounter_data = {
      ...updatedEncounterData,
      symptoms,
      ai,
      decision,
      finalSeverity: decision.finalSeverity
    };

    // 🔄 STATE UPDATE
    record.status = "symptoms_recorded";

    // 🕒 TIMELINE
    record.timeline.push({
      event: "🧠 Symptoms processed + decision generated",
      timestamp: new Date().toISOString()
    });

    const updated = await updateEncounterDB(
      id,
      cleanBeforeSave(record),
      record.status
    );

    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated),
      decision
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/*
================================================
VALIDATE (HUMAN-IN-LOOP 🔥)
================================================
*/
export const validateEncounterHandler = async (req, res) => {
  try {
    const { id } = req.params;

    trace("validate", id);

    let record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Not found" });
    }

    // 🧠 Ensure decision exists (safety net)
    record = await ensureDecision(record);

    record.encounter_data = record.encounter_data || {};

    // 🔐 GOVERNANCE (symptoms_recorded → validated)
    assertValidTransition(record.status, "validated");

    // 🧾 HISTORY (AUDIT)
    const updatedEncounterData = appendStateHistory(
      record,
      record.status,
      "validated",
      "nurse" // human checkpoint
    );

    // 💾 SAFE MERGE
    record.encounter_data = {
      ...updatedEncounterData,
      validation: {
        notes: req.body?.notes || null,
        timestamp: new Date()
      }
    };

    // 🔄 STATE UPDATE
    record.status = "validated";

    // 🕒 TIMELINE
    record.timeline.push({
      event: "✅ Human validation completed",
      timestamp: new Date().toISOString()
    });

    const updated = await updateEncounterDB(
      id,
      cleanBeforeSave(record),
      record.status
    );

    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
NURSE ENGINE (GOVERNED + OWNERSHIP-AWARE)
================================================
*/

export const nurseAssessmentHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    trace("nurse", id);

    let record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Not found" });
    }

    // 🧠 Ensure decision exists
    record = await ensureDecision(record);

    record.encounter_data = record.encounter_data || {};

    // 🧾 Ensure nurse session exists
    record.encounter_data.nurseSession =
      record.encounter_data.nurseSession || {
        status: "active",
        data: {}
      };

    const session = record.encounter_data.nurseSession;

    let nextState = null;

    /*
    ========================================
    STAGE HANDLING
    ========================================
    */
    switch (stage) {
      /*
      ----------------------------------------
      VALIDATION
      ----------------------------------------
      */
      case "validation":
        nextState = "nurse_validated";

        assertValidTransition(record.status, nextState);

        session.data.validation = req.body;

        // 🧠 OWNERSHIP → NURSE (actively responsible)
        record.encounter_data.ownership = {
          owner: "nurse",
          doctorId: null,
          claimedAt: null
        };

        break;

      /*
      ----------------------------------------
      COMPLETION (NO DOCTOR NEEDED)
      ----------------------------------------
      */
      case "completion":
        nextState = "completed";

        assertValidTransition(record.status, nextState);

        session.status = "completed";

        // 🧠 OWNERSHIP → NURSE (case closed under nurse)
        record.encounter_data.ownership = {
          owner: "nurse",
          doctorId: null,
          claimedAt: null
        };

        break;

      /*
      ----------------------------------------
      ESCALATION → DOCTOR
      ----------------------------------------
      */
      case "escalation":
        nextState = "handover_pending";

        assertValidTransition(record.status, nextState);

        session.status = "handover";

        // 🧠 OWNERSHIP → SYSTEM (IN TRANSIT)
        record.encounter_data.ownership = {
          owner: "system",
          doctorId: null,
          claimedAt: null
        };

        break;

      default:
        throw new Error("Invalid stage");
    }

    /*
    ========================================
    🧾 HISTORY (AUDIT)
    ========================================
    */
    const updatedEncounterData = appendStateHistory(
      record,
      record.status,
      nextState,
      "nurse"
    );

    /*
    ========================================
    💾 SAFE MERGE (CRITICAL)
    ========================================
    */
    record.encounter_data = {
      ...updatedEncounterData,
      nurseSession: session,
      ownership: record.encounter_data.ownership
    };

    /*
    ========================================
    🔄 STATE UPDATE
    ========================================
    */
    record.status = nextState;

    /*
    ========================================
    🕒 TIMELINE
    ========================================
    */
    record.timeline = record.timeline || [];

    record.timeline.push({
      event: `👩‍⚕️ Nurse stage: ${stage}`,
      timestamp: new Date().toISOString()
    });

    /*
    ========================================
    💾 SAVE
    ========================================
    */
    const updated = await updateEncounterDB(
      id,
      cleanBeforeSave(record),
      record.status
    );

    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
DOCTOR CONSULTATION (AUDIT)
================================================
*/

export const doctorConsultationHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { doctorId } = req.body;

    trace("doctor_start", id);

    if (!doctorId) {
      throw new Error("Doctor ID is required to take ownership");
    }

    let record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Not found" });
    }

    // 🔥 TRANSITION: handover_pending → doctor_active
    const nextState = "doctor_active";

    assertValidTransition(record.status, nextState);

    record.encounter_data = record.encounter_data || {};

    // 🧠 OWNERSHIP ASSIGNMENT (LEGAL CONTROL)
    record.encounter_data.ownership = {
      owner: "doctor",
      doctorId,
      claimedAt: new Date().toISOString()
    };

    // 🧾 INIT DOCTOR SESSION (if not exists)
    record.encounter_data.doctorSession =
      record.encounter_data.doctorSession || {
        status: "active",
        data: {}
      };

    // 🧾 HISTORY (AUDIT)
    const updatedEncounterData = appendStateHistory(
      record,
      record.status,
      nextState,
      "doctor"
    );

    // 💾 SAFE MERGE
    record.encounter_data = {
      ...updatedEncounterData,
      ownership: record.encounter_data.ownership,
      doctorSession: record.encounter_data.doctorSession
    };

    // 🔄 STATE UPDATE
    record.status = nextState;

    // 🕒 TIMELINE
    record.timeline.push({
      event: `👨‍⚕️ Doctor ${doctorId} claimed case`,
      timestamp: new Date().toISOString()
    });

    const updated = await updateEncounterDB(
      id,
      cleanBeforeSave(record),
      record.status
    );

    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
DOCTOR WORK (SOAN + FINAL)
================================================
*/
export const doctorWorkHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { stage } = req.body;

    trace("doctor_work", id);

    let record = await getEncounterDB(id);

    if (!record) {
      return res.status(404).json({ error: "Not found" });
    }

    // 🧠 Ensure decision exists (safety net)
    record = await ensureDecision(record);

    record.encounter_data = record.encounter_data || {};

    const session = record.encounter_data.doctorSession;

    if (!session || record.status !== "doctor_active") {
      throw new Error("Doctor must claim case first");
    }

    let nextState = record.status; // default = no change

    switch (stage) {
      case "notes":
        session.data.soan = req.body;
        break;

      case "decision":
        nextState = "completed";

        // 🔐 GOVERNANCE (doctor_active → completed)
        assertValidTransition(record.status, nextState);

        session.status = "completed";
        record.current_owner = null;
        break;

      default:
        throw new Error("Invalid stage");
    }

    // 🧾 HISTORY (AUDIT)
    const updatedEncounterData = appendStateHistory(
      record,
      record.status,
      nextState,
      "doctor"
    );

    // 💾 SAFE MERGE
    record.encounter_data = {
      ...updatedEncounterData,
      doctorSession: session
    };

    // 🔄 STATE UPDATE (only if changed)
    record.status = nextState;

    // 🕒 TIMELINE
    record.timeline.push({
      event: `👨‍⚕️ Doctor stage: ${stage}`,
      timestamp: new Date().toISOString()
    });

    const updated = await updateEncounterDB(
      id,
      cleanBeforeSave(record),
      record.status
    );

    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

/*
================================================
🧠 BUILD SOAN VIEW (UNIFIED CLINICAL CARD)
================================================
*/

const buildSOANView = (record) => {
  const ed = record.encounter_data || {};

  const ai = ed.ai || {};
  const decision = ed.decision || {};
  const nurse = ed.nurseSession?.data || {};
  const doctor = ed.doctorSession?.data || {};

  return {
    patient: record.patient_data,

    triage: {
      severity: decision.triage?.severity || ed.finalSeverity || "UNKNOWN",
      escalation: decision.triage?.escalation || false
    },

    SOAN: {
      S: {
        symptoms: ed.symptoms || [],
        intakeNotes: ed.intake || {},
        aiSummary: ai.summary || null   // 🔒 standardize
      },

      O: {
        vitals: ed.vitals || {},
        aiFindings: ai.clinicalFindings || null
      },

      A: {
        aiAssessment: ai.riskAssessment || null,
        nurseValidation: nurse.validation || null, // 🔒 single contract
        finalSeverity: ed.finalSeverity || null
      },

      N: {
        doctorNotes: doctor.soan || null,
        treatment: doctor.treatment || null,
        followUp: doctor.followUpRequired || null,
        appointment: ed.appointment || null
      }
    },

    // 🧾 OPTIONAL BUT POWERFUL (AUDIT SNAPSHOT)
    meta: {
      status: record.status,
      lastUpdated: record.updated_at || null
    }
  };
};
