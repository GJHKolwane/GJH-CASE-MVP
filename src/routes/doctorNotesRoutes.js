import express from "express";
import { createDoctorNotesHandler } from "../controllers/doctorNotesController.js";

const router = express.Router();

/*
================================================
POST /encounters/:id/doctor-notes
================================================
Stores doctor consultation + clinical reasoning
*/

router.post("/:id/doctor-notes", createDoctorNotesHandler);

export default router;
