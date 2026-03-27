import express from "express";


import {
  createEncounterHandler,
  intakeHandler,
  addVitalsHandler,
  addSymptomsHandler,
  nurseAssessmentHandler,
  decisionHandler,
  getEncounterTimelineHandler
} from "../controllers/encounterController.js";

const router = express.Router();

/*
=====================================
ENCOUNTER ENTRY
=====================================
*/

router.post("/", createEncounterHandler);

/*
=====================================
CLINICAL WORKFLOW (STRICT ORDER)
=====================================
*/

// 1️⃣ Patient Intake
router.post("/:id/intake", intakeHandler);

// 2️⃣ Vitals
router.post("/:id/vitals", addVitalsHandler);

// 3️⃣ Symptoms
router.post("/:id/symptoms", addSymptomsHandler);

// 4️⃣ Nurse Assessment (AI will trigger automatically)
router.post("/:id/nurse", nurseAssessmentHandler);

// 5️⃣ Decision Engine (LOW / MEDIUM / ESCALATE)
router.post("/:id/decision", decisionHandler);

/*
=====================================
TIMELINE
=====================================
*/

router.get("/:id/timeline", getEncounterTimelineHandler);

export default router;
