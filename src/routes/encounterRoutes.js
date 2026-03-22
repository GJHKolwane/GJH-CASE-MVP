import express from "express";

import {
  createEncounterHandler,
  setEncounterStageHandler,
  addVitalsHandler,
  addSymptomsHandler,
  addNotesHandler,
  addTriageHandler,
  addTreatmentDecisionHandler,
  getEncounterTimelineHandler
} from "../controllers/encounterController.js";

const router = express.Router();

/*
=====================================
ENCOUNTERS
=====================================
*/

router.post("/", createEncounterHandler);

router.post("/:id/stage", setEncounterStageHandler);

/*
=====================================
EVENTS
=====================================
*/

router.post("/:id/vitals", addVitalsHandler);

router.post("/:id/symptoms", addSymptomsHandler);

router.post("/:id/notes", addNotesHandler);

// ❌ REMOVED: doctor-notes (moved to doctorNotesRoutes.js)

router.post("/:id/triage", addTriageHandler);

router.post("/:id/treatment-decision", addTreatmentDecisionHandler);

/*
=====================================
TIMELINE
=====================================
*/

router.get("/:id/timeline", getEncounterTimelineHandler);

export default router;
