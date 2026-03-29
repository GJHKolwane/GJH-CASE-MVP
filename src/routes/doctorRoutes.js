import express from "express";

import {
  doctorConsultationHandler,
  doctorNotesHandler,
  doctorDecisionHandler,
  finalNotesHandler
} from "../controllers/doctorController.js";

const router = express.Router();

/*
================================================
DOCTOR CONSULTATION
================================================
*/
router.post("/:id/consultation", doctorConsultationHandler);

/*
================================================
DOCTOR NOTES
================================================
*/
router.post("/:id/notes", doctorNotesHandler);

/*
================================================
DOCTOR DECISION
================================================
*/
router.post("/:id/decision", doctorDecisionHandler);

/*
================================================
FINAL NOTES
================================================
*/
router.post("/:id/final", finalNotesHandler);

export default router;
