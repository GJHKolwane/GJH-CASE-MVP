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

const router = express.Router();

/*
================================================
ENTRY
================================================
*/
router.post("/", createEncounterHandler);

/*
================================================
GET
================================================
*/
router.get("/:id", getEncounterHandler);
router.get("/:id/timeline", getEncounterTimelineHandler);

/*
================================================
WORKFLOW
================================================
*/
router.post("/:id/intake", intakeHandler);
router.post("/:id/vitals", addVitalsHandler);
router.post("/:id/symptoms", addSymptomsHandler);
router.post("/:id/nurse", nurseAssessmentHandler);
router.post("/:id/validate", validateEncounterHandler);
router.post("/:id/decision", decisionHandler);

/*
================================================
DOCTOR ENGINE
================================================
*/
router.post("/:id/doctor", doctorConsultationHandler);
router.post("/:id/doctor_notes", doctorNotesHandler);
router.post("/:id/doctor_decision", doctorDecisionHandler);

export default router;
