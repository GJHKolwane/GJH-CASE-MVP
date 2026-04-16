import express from "express";
import pool from "../config/db.js";

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

// ✅ 🔥 NEW IMPORT (ES MODULE STYLE)
import nurseDecisionHandler from "../controllers/nurseDecisionHandler.js";

const router = express.Router();

/*
================================================
HEALTH CHECK
================================================
*/
router.get("/health", (req, res) => {
  res.json({ status: "encounter routes OK" });
});

/*
================================================
GET ALL ENCOUNTERS
================================================
*/
router.get("/", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM encounters ORDER BY id DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET ALL ENCOUNTERS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch encounters" });
  }
});

/*
================================================
ENTRY
================================================
*/
router.post("/", createEncounterHandler);

/*
================================================
GET SINGLE
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

// ⚠️ OLD FLOW (keep for now, but will phase out)
router.post("/:id/nurse", nurseAssessmentHandler);
router.post("/:id/validate", validateEncounterHandler);
router.post("/:id/decision", decisionHandler);

// ✅ 🔥 NEW FLOW (CORRECT ROUTE)
router.post("/:id/nurse-decision", nurseDecisionHandler);

/*
================================================
DOCTOR ENGINE
================================================
*/
router.post("/:id/doctor", doctorConsultationHandler);
router.post("/:id/doctor_notes", doctorNotesHandler);
router.post("/:id/doctor_decision", doctorDecisionHandler);

export default router;
