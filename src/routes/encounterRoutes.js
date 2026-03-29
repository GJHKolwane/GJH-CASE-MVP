import express from "express";

import {
  createEncounterHandler,
  intakeHandler,
  addVitalsHandler,
  addSymptomsHandler,
  nurseAssessmentHandler,
  validateEncounterHandler,
  decisionHandler,
  doctorConsultationHandler,
  doctorNotesHandler,
  doctorDecisionHandler,
  getEncounterHandler,
  getEncounterTimelineHandler
} from "../controllers/encounterController.js";

console.log("✅ encounterRoutes loaded");

const router = express.Router();

/*
================================================
ENCOUNTER ENTRY
================================================
*/

// Create encounter
router.post("/", createEncounterHandler);

/*
================================================
GET
================================================
*/

// Get full encounter
router.get("/:id", getEncounterHandler);

// Timeline
router.get("/:id/timeline", getEncounterTimelineHandler);

/*
================================================
CLINICAL WORKFLOW (STRICT FSM ORDER)
================================================
*/

// 1️⃣ Intake
router.post("/:id/intake", intakeHandler);

// 2️⃣ Vitals
router.post("/:id/vitals", addVitalsHandler);

// 3️⃣ Symptoms
router.post("/:id/symptoms", addSymptomsHandler);

// 4️⃣ Nurse
router.post("/:id/nurse", nurseAssessmentHandler);

// 5️⃣ 🔥 VALIDATION (MANDATORY BEFORE DECISION)
router.post("/:id/validate", validateEncounterHandler);

// 6️⃣ Decision (may escalate to doctor)
router.post("/:id/decision", decisionHandler);

/*
================================================
👨‍⚕️ DOCTOR ENGINE (POST-ESCALATION)
================================================
*/

// Doctor takes over case
router.post("/:id/doctor", doctorConsultationHandler);

// Doctor adds notes
router.post("/:id/doctor_notes", doctorNotesHandler);

// Doctor makes final decision
router.post("/:id/doctor_decision", doctorDecisionHandler);

export default router;
