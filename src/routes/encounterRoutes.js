import express from "express";

import {
  createEncounterHandler,
  intakeHandler,
  addVitalsHandler,
  addSymptomsHandler,
  nurseAssessmentHandler,
  validateEncounterHandler,
  decisionHandler,
  getEncounterHandler,
  getEncounterTimelineHandler
} from "../controllers/encounterController.js";

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

// 6️⃣ Decision
router.post("/:id/decision", decisionHandler);

export default router;
