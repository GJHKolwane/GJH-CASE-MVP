import express from "express";
import { createTreatmentDecisionHandler } from "../controllers/treatmentDecisionController.js";

const router = express.Router();

/*
=========================================
POST /encounters/:id/treatment-decision
=========================================
*/

router.post("/:id/treatment-decision", createTreatmentDecisionHandler);

export default router;
