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

// 🔥 UPDATED: Supports BOTH legacy + FHIR input
router.post("/", (req, res, next) => {
  const { patientId, subject } = req.body;

  if (!patientId && !subject?.reference) {
    return res.status(400).json({
      error: "Either patientId or subject.reference is required — resolve patient first"
    });
  }

  next();
}, createEncounterHandler);

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
