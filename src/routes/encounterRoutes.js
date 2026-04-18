import express from "express";
import pool from "../config/db.js";

import {
  createEncounterHandler,
  intakeHandler,
  addVitalsHandler,
  addSymptomsHandler,
  nurseAssessmentHandler,
  validateEncounterHandler,
  doctorConsultationHandler,
  doctorNotesHandler,
  doctorDecisionHandler,
  getEncounterHandler,
  getEncounterTimelineHandler
} from "../controllers/encounterController.js";

import nurseDecisionHandler from "../controllers/nurseDecisionHandler.js";

const router = express.Router();

/*
================================================
ENTRY
================================================
*/
router.post("/", createEncounterHandler);

/*
================================================
FETCH
================================================
*/
router.get("/", async (req, res) => {
  const result = await pool.query("SELECT * FROM encounters ORDER BY id DESC");
  res.json(result.rows);
});

router.get("/:id", getEncounterHandler);
router.get("/:id/timeline", getEncounterTimelineHandler);

/*
================================================
CORE FLOW
================================================
*/
router.post("/:id/intake", intakeHandler);
router.post("/:id/vitals", addVitalsHandler);
router.post("/:id/symptoms", addSymptomsHandler);

/*
================================================
NURSE + VALIDATION
================================================
*/
router.post("/:id/nurse", nurseAssessmentHandler);
router.post("/:id/nurse-decision", nurseDecisionHandler);
router.post("/:id/validate", validateEncounterHandler); // ✅ BACK

/*
================================================
DOCTOR FLOW (FULL RESTORED)
================================================
*/
router.post("/:id/doctor", doctorConsultationHandler);
router.post("/:id/doctor_notes", doctorNotesHandler);
router.post("/:id/doctor_decision", doctorDecisionHandler);

export default router;
