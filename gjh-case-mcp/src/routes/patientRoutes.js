import express from "express";
import {
createPatientHandler,
getPatientsHandler,
getPatientHandler
} from "../controllers/patientController.js";

const router = express.Router();

router.post("/", createPatientHandler);

router.get("/", getPatientsHandler);

router.get("/:id", getPatientHandler);

export default router;