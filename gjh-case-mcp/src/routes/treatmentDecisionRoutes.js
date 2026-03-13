import express from "express";
import { recordTreatmentDecision } from "../controllers/treatmentDecisionController.js";

const router = express.Router();

/*
=========================================
POST /encounters/:id/treatment-decision
=========================================
*/

router.post("/:id/treatment-decision", recordTreatmentDecision);

export default router;
