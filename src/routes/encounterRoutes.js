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
  doctorWorkHandler,
  doctorClaimHandler,
  getEncounterHandler,
  getEncounterTimelineHandler,
  getSOANViewHandler            // ✅ NEW
} from "../controllers/encounterController.js";

// ⚠️ TEMP — legacy (remove after frontend fully migrates)
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
🧠 SOAN VIEW (UNIFIED CLINICAL DISPLAY 🔥)
================================================
*/
router.get("/:id/soan", getSOANViewHandler);

/*
================================================
CORE FLOW (FSM CONTROLLED)
================================================
*/
router.post("/:id/intake", intakeHandler);
router.post("/:id/vitals", addVitalsHandler);
router.post("/:id/symptoms", addSymptomsHandler);

/*
================================================
NURSE ENGINE (STAGE-BASED — PRIMARY)
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
DOCTOR FLOW (HANDOVER + STAGE ENGINE)
================================================
*/

// 🔥 STEP 1: CLAIM (MANDATORY BEFORE ANY DOCTOR ACTION)
router.post("/:id/claim", doctorClaimHandler);

// 🔥 STEP 2: OPEN CASE (OPTIONAL — audit/logging)
router.post("/:id/doctor", doctorConsultationHandler);

// 🔥 STEP 3: DOCTOR WORK (NOTES + DECISION — NEW ENGINE)
router.post("/:id/doctor-work", doctorWorkHandler);

export default router;
