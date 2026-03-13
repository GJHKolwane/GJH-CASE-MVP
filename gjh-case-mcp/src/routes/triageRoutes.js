import express from "express";
import { recordTriage } from "../controllers/triageController.js";

const router = express.Router();

/*
POST /encounters/:id/triage
Stores AI triage decision in encounter timeline
*/

router.post("/:id/triage", recordTriage);

export default router;
