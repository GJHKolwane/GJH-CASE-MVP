import express from "express";
import { createDoctorNotesHandler } from "../controllers/doctorNotesController.js";

const router = express.Router();

/*
================================================
⚠️ DEPRECATED — LEGACY DOCTOR NOTES
================================================
POST /encounters/:id/doctor-notes

- Manual doctor input
- NOT part of AI-assisted workflow
- Will be removed after full migration
================================================
*/

router.post("/:id/doctor-notes", (req, res, next) => {
  console.warn("⚠️ Deprecated endpoint used: /doctor-notes");
  next();
}, createDoctorNotesHandler);

export default router;
