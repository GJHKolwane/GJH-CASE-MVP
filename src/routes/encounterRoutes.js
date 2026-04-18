import express from "express";
import pool from "../config/db.js";

import {
  createEncounterHandler,
  intakeHandler,
  addVitalsHandler,
  addSymptomsHandler,
  nurseAssessmentHandler,
  doctorConsultationHandler,
  getEncounterHandler,
  getEncounterTimelineHandler
} from "../controllers/encounterController.js";

// ✅ NEW NURSE DECISION FLOW
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
CORE WORKFLOW (AI-FIRST)
================================================
*/
router.post("/:id/intake", intakeHandler);
router.post("/:id/vitals", addVitalsHandler);
router.post("/:id/symptoms", addSymptomsHandler);

/*
================================================
NURSE FLOW
================================================
*/
// legacy (keep temporarily for compatibility)
router.post("/:id/nurse", nurseAssessmentHandler);

// ✅ PRIMARY FLOW (USE THIS)
router.post("/:id/nurse-decision", nurseDecisionHandler);

/*
================================================
DOCTOR FLOW
================================================
*/
router.post("/:id/doctor", doctorConsultationHandler);

/*
================================================
❌ REMOVED (CAUSE OF CRASHES)
================================================
- validateEncounterHandler
- decisionHandler
- doctorNotesHandler
- doctorDecisionHandler

👉 These were not in controller anymore
👉 Reintroduce ONLY if rebuilt properly
*/

export default router;
