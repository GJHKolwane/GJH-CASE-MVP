// src/controllers/encounterController.js

import { v4 as uuidv4 } from "uuid";
import { query } from "../config/db.js";
import { resolveVisibility } from "../services/care/careMode.service.js";

import {
  createEncounterDB,
  getEncounterDB,
  updateEncounterDB
} from "../services/dbService.js";

import { assertValidTransition } from "../services/governance/stateContract.js";
import { appendStateHistory } from "../services/governance/stateHistory.js";

import { evaluateEncounter } from "../services/clinicalDecision.service.js";
import { callAIOrchestrator } from "../services/aiOrchestrator.client.js";

import { normalizeIntake } from "../../../gjh-contracts/normalizers/normalizeIntake.js";
import { normalizeVitals } from "../../../gjh-contracts/normalizers/normalizeVitals.js";
import { standardizeDecision } from "../../../gjh-contracts/normalizers/standardizeDecision.js";

import { IntakeSchema } from "../../../gjh-contracts/validators/intake.validator.js";
import { VitalsSchema } from "../../../gjh-contracts/validators/vitals.validator.js";
import { DecisionSchema } from "../../../gjh-contracts/validators/decision.validator.js";


/*
================================================
🔥 GLOBAL STRUCTURE GUARD (CORE FIX)
================================================
*/
const ensureEncounterStructure = (record = {}) => {
  record.encounter_data = record.encounter_data || {};

  const ed = record.encounter_data;

  return {
    ...record,
    encounter_data: {
      ...ed,
      history: Array.isArray(ed.history) ? ed.history : [],
      ai: ed.ai || {},
      decision: ed.decision || {},
      validation: ed.validation || {},
      nurseSession: ed.nurseSession || {},
      doctorSession: ed.doctorSession || {}
    },
    timeline: Array.isArray(record.timeline) ? record.timeline : []
  };
};

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
DECISION GUARD
================================================
*/
const ensureDecision = async (record) => {
  const ed = record.encounter_data || {};

  if (!ed.decision) {
    const decision = await evaluateEncounter(ed);

    ed.decision = decision;
    ed.finalSeverity = decision.finalSeverity;
    ed.rules = decision.rules;

    record.timeline.push({
      event: "🛡️ Decision engine fallback",
      timestamp: new Date().toISOString()
    });
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

    const patientId = uuidv4();

    const name =
      body.name || body.patient_data?.name || "Unknown Patient";

    const nationalId =
      body.national_id || body.patient_data?.national_id || null;

    await query(
      `INSERT INTO patients (id, name, national_id)
       VALUES ($1, $2, $3)`,
      [patientId, name, nationalId]
    );

    const normalized = {
      patient_id: patientId,
      name,
      national_id: nationalId,
      care_mode: body.care_mode || "facility",
      status: "created",
      timeline: [
        {
          event: "🆕 Encounter created",
          timestamp: now
        }
      ]
    };

    const encounter = await createEncounterDB(normalized);

    trace("create", encounter.id);

    res.json({
      status: encounter.status,
      encounter: sanitizeResponse(encounter)
    });

  } catch (err) {
    console.error("🔥 CREATE ERROR:", err);
    res.status(500).json({ error: err.message });
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

    const result = await query(
      `
      SELECT e.*, p.name, p.national_id
      FROM encounters e
      JOIN patients p ON e.patient_id = p.id
      WHERE e.id = $1
      `,
      [id]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Not found" });
    }

    const record = ensureEncounterStructure(result.rows[0]);

    res.json({
      status: record.status,
      encounter: {
        ...record,
        patient: {
          id: record.patient_id,
          name: record.name,
          national_id: record.national_id
        }
      }
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/*
================================================
INTAKE (🔥 FIXED)
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

    // 🔒 Ensure structure
    record = ensureEncounterStructure(record);

    // 🔐 Governance
    assertValidTransition(record.status, "intake");

    // 🧾 History
    const updatedEncounterData = appendStateHistory(
      record,
      record.status,
      "intake",
      "system"
    );

    // ===============================
    // 🔥 CONTRACT PIPELINE START
    // ===============================

    const rawIntake = req.body.intake || {};

    // Normalize
    const intake = normalizeIntake(rawIntake);

    // Validate (FAIL FAST if invalid)
    IntakeSchema.parse(intake);

    // ===============================
    // 🔥 CONTRACT PIPELINE END
    // ===============================

    // 💾 Save ONLY canonical structure
    record.encounter_data = {
      ...record.encounter_data,
      history: updatedEncounterData.history,
      intake
    };

    // 🔄 State update
    record.status = "intake";

    // 🕒 Timeline
    record.timeline.push({
      event: "📝 Intake captured",
      timestamp: new Date().toISOString()
    });

    // 💾 Persist
    const updated = await updateEncounterDB(
      id,
      cleanBeforeSave(record),
      record.status
    );

    // 📤 Response
    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    console.error("🔥 INTAKE ERROR:", err);
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

    // 🔒 Ensure structure
    record = ensureEncounterStructure(record);

    // 🔐 Governance
    assertValidTransition(record.status, "vitals_recorded");

    // 🧾 History
    const updatedEncounterData = appendStateHistory(
      record,
      record.status,
      "vitals_recorded",
      "system"
    );

    // ===============================
    // 🔥 CONTRACT PIPELINE START
    // ===============================

    const rawVitals = req.body.vitals || {};

    // Normalize
    const vitals = normalizeVitals(rawVitals);

    // Validate (FAIL FAST if invalid)
    VitalsSchema.parse(vitals);

    // ===============================
    // 🔥 CONTRACT PIPELINE END
    // ===============================

    // 💾 Save ONLY canonical structure
    record.encounter_data = {
      ...record.encounter_data,
      history: updatedEncounterData.history,
      vitals
    };

    // 🔄 State update
    record.status = "vitals_recorded";

    // 🕒 Timeline
    record.timeline.push({
      event: "🩺 Vitals recorded",
      timestamp: new Date().toISOString()
    });

    // 💾 Persist
    const updated = await updateEncounterDB(
      id,
      cleanBeforeSave(record),
      record.status
    );

    // 📤 Response
    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated)
    });

  } catch (err) {
    console.error("🔥 VITALS ERROR:", err);
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

    // 🔥 STRUCTURE GUARD
    record = ensureEncounterStructure(record);
    record.encounter_data = record.encounter_data || {};

    // 🔐 GOVERNANCE
    assertValidTransition(record.status, "symptoms_recorded");

    // 🧾 HISTORY
    const updatedEncounterData = appendStateHistory(
      record,
      record.status,
      "symptoms_recorded",
      "system"
    );

    // 🧠 NORMALIZE SYMPTOMS INPUT
    const symptoms =
      typeof req.body.symptoms === "string"
        ? req.body.symptoms.split(",").map((s) => s.trim()).filter(Boolean)
        : Array.isArray(req.body.symptoms)
        ? req.body.symptoms
        : [];

    const ed = record.encounter_data || {};

    /*
    ========================================
    🔥 NORMALIZE INTAKE (CRITICAL FIX)
    ========================================
    */
    const normalizedIntake = {
      patient: {
        age: ed.intake?.patient?.age ?? ed.intake?.age ?? null,
        sex: ed.intake?.patient?.sex ?? ed.intake?.sex ?? null
      },
      medical: {
        conditions:
          ed.intake?.medical?.conditions ??
          ed.intake?.chronicConditions ??
          [],
        allergies: ed.intake?.medical?.allergies ?? [],
        medications: ed.intake?.medical?.medications ?? []
      },
      context: {
        pregnant:
          ed.intake?.context?.pregnant ??
          ed.intake?.pregnant ??
          false,
        immunocompromised:
          ed.intake?.context?.immunocompromised ??
          ed.intake?.immunocompromised ??
          false
      }
    };

    /*
    ========================================
    🔥 NORMALIZE VITALS (CRITICAL FIX)
    ========================================
    */
    const normalizedVitals = {
      heartRate:
        ed.vitals?.heartRate ??
        ed.vitals?.heart_rate ??
        null,

      temperature:
        ed.vitals?.temperature ?? null,

      bloodPressure:
        ed.vitals?.bloodPressure ??
        ed.vitals?.blood_pressure ??
        null,

      oxygenSaturation:
        ed.vitals?.oxygenSaturation ??
        ed.vitals?.spo2 ??
        null
    };

    /*
    ========================================
    🤖 AI CALL (SAFE)
    ========================================
    */
    let ai = null;

    try {
      ai = await callAIOrchestrator({
        inputText: symptoms.join(", "),
        vitals: normalizedVitals,
        symptoms
      });
    } catch (err) {
      console.warn("⚠️ AI failed, continuing without AI:", err.message);
      ai = null;
    }

    /*
    ========================================
    🧠 DECISION ENGINE (FIXED INPUT)
    ========================================
    */
    const decisionInput = {
      intake: normalizedIntake,
      vitals: normalizedVitals,
      symptoms,
      ai
    };

    const decision = await evaluateEncounter(decisionInput);

    /*
    ========================================
    💾 SAFE MERGE (NO DATA LOSS)
    ========================================
    */
    record.encounter_data = {
      ...record.encounter_data,     // 🔥 KEEP EVERYTHING
      ...updatedEncounterData,
      symptoms,
      ai,
      decision,
      finalSeverity:
  decision?.finalSeverity ||
  decision?.severity ||
  decision?.riskLevel ||
  "UNKNOWN"
    };

    /*
    ========================================
    🔄 STATE UPDATE
    ========================================
    */
    record.status = "symptoms_recorded";

    /*
    ========================================
    🕒 TIMELINE
    ========================================
    */
    record.timeline.push({
      event: "🧠 Symptoms processed + decision generated",
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

    /*
    ========================================
    ✅ RESPONSE
    ========================================
    */
    res.json({
      status: updated.status,
      encounter: sanitizeResponse(updated),
      decision
    });

  } catch (err) {
    console.error("🔥 SYMPTOMS HANDLER ERROR:", err);
    res.status(500).json({ error: err.message });
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

        // 🧠 OWNERSHIP → NURSE
        record.encounter_data.ownership = {
          owner: "nurse",
          doctorId: null,
          claimedAt: null
        };

        break;

      /*
      ----------------------------------------
      COMPLETION (NO DOCTOR)
      ----------------------------------------
      */
      case "completion":
        nextState = "completed";

        assertValidTransition(record.status, nextState);

        session.status = "completed";

        // 🧠 OWNERSHIP → NURSE
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

        // 🧠 CARE MODE (SOURCE OF TRUTH)
        const careMode =
          record.encounter_data?.care_mode || "facility";

        // 🧠 RESOLVE VISIBILITY BASED ON CARE MODE
        const visibility = resolveVisibility(careMode);

        // 🧠 APPLY VISIBILITY
        record.encounter_data.visibility = visibility;

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
      ownership: record.encounter_data.ownership,
      visibility: record.encounter_data.visibility, // 🔥 PRESERVED
      care_mode: record.encounter_data.care_mode || "facility" // 🔥 ENSURE PERSISTENCE
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
