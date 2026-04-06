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
GET ALL ENCOUNTERS (QUEUE) 🔥 FIX ADDED
================================================
*/
router.get("/", async (req, res) => {
  try {
    const result = await global.db.query(
      "SELECT * FROM encounters ORDER BY created_at DESC"
    );

    res.json(result.rows);
  } catch (err) {
    console.error("GET ALL ENCOUNTERS ERROR:", err);
    res.status(500).json({ message: "Failed to fetch encounters" });
  }
});

/*
================================================
GET SINGLE + TIMELINE
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
