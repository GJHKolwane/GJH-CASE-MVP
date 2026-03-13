import express from "express";
import { createTriageHandler } from "../controllers/triageController.js";

const router = express.Router();

/*
POST /encounters/:id/triage
Stores AI triage decision in encounter timeline
*/

router.post("/:id/triage", createTriageHandler);

export default router;
