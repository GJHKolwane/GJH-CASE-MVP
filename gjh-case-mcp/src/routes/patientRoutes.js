import express from "express";

import {
  createPatientHandler,
  getPatientsHandler,
  getPatientHandler,
  searchPatientsHandler
} from "../controllers/patientController.js";

const router = express.Router();

/*
=========================================
PATIENT ROUTES
=========================================
*/

router.post("/", createPatientHandler);

router.get("/", getPatientsHandler);

router.get("/search", searchPatientsHandler);

router.get("/:id", getPatientHandler);

export default router;
