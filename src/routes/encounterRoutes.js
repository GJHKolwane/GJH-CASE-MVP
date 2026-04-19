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
  doctorClaimHandler,              // ✅ NEW
  getEncounterHandler,
  getEncounterTimelineHandler
} from "../controllers/encounterController.js";

// ⚠️ TEMP — legacy (remove later if unused)
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
NURSE ENGINE (NEW SYSTEM)
================================================
*/
router.post("/:id/nurse", nurseAssessmentHandler);

/*
⚠️ LEGACY — REMOVE AFTER FRONTEND MIGRATION
*/
router.post("/:id/nurse-decision", nurseDecisionHandler);

router.post("/:id/validate", validateEncounterHandler);

/*
================================================
DOCTOR FLOW (HANDOVER + ACTIVE WORK)
================================================
*/

// 🔥 HANDOVER CLAIM (NEW — CRITICAL)
router.post("/:id/claim", doctorClaimHandler);

// ⚠️ LEGACY DOCTOR FLOW (WILL BE REPLACED NEXT)
router.post("/:id/doctor", doctorConsultationHandler);
router.post("/:id/doctor_notes", doctorNotesHandler);
router.post("/:id/doctor_decision", doctorDecisionHandler);

export default router;
