import express from "express";
import { doctorSOANHandler } from "../handlers/doctor.handler.js";

const router = express.Router();

/*
=========================================
AI DRAFT SOAN
POST /encounters/:id/doctor/soan
=========================================
*/

router.post("/:id/doctor/soan", doctorSOANHandler);

export default router;
