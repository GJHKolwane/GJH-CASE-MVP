import express from "express";

import {
  createEncounterHandler,
  intakeHandler,
  addVitalsHandler,
  addSymptomsHandler,
  nurseAssessmentHandler,
  validateEncounterHandler,
  decisionHandler,
  getEncounterTimelineHandler
} from "../controllers/encounterController.js";

const router = express.Router();

/*
ENTRY
*/
router.post("/", createEncounterHandler);

/*
FLOW
*/
router.post("/:id/intake", intakeHandler);
router.post("/:id/vitals", addVitalsHandler);
router.post("/:id/symptoms", addSymptomsHandler);
router.post("/:id/nurse", nurseAssessmentHandler);

// 🔥 NEW STEP
router.post("/:id/validate", validateEncounterHandler);

// ✅ AFTER VALIDATION
router.post("/:id/decision", decisionHandler);

/*
TIMELINE
*/
router.get("/:id/timeline", getEncounterTimelineHandler);

export default router;
