import express from "express";
import { doctorSOANProxyHandler } from "../controllers/doctorSoanProxyController.js";

const router = express.Router();

/*
=========================================
AI DRAFT SOAN (via orchestrator)
=========================================
*/

router.post("/:id/doctor/soan", doctorSOANProxyHandler);

export default router;
