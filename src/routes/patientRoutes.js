import express from "express";
const router = express.Router();
const router = express.Router();

import {
  resolvePatientHandler,
  getPatientsHandler,
  getPatientHandler,
  searchPatientsHandler
} from "../controllers/patientController.js";

const router = express.Router();

/*
=========================================
PATIENT ROUTES (NEW ARCHITECTURE)
=========================================
*/

/*
🔥 CORE ENTRY POINT (REPLACES CREATE)
*/
router.post("/resolve", resolvePatientHandler);

/*
READ OPERATIONS (UNCHANGED)
*/
router.get("/", getPatientsHandler);

router.get("/search", searchPatientsHandler);

router.get("/:id", getPatientHandler);

export default router;
